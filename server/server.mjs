import { createServer } from 'node:http'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const port = Number(process.env.PORT || 4000)
const dataDir = join(process.cwd(), 'server', 'data')
const dataFile = join(dataDir, 'civicasset.json')
mkdirSync(dataDir, { recursive: true })

const seed = {
  assets: [
    { id: 'GJ-PWD-BRG-0001', name: 'Sabarmati East Bridge', type: 'Bridge', department: 'Public Works', district: 'Ahmedabad', status: 'Operational', condition: 'Fair', risk: 'High', score: 86, updated: '2h ago', x: 28, y: 36, history: ['Asset registered and deployed', 'Inspection: condition changed to Fair', 'Risk model flagged high maintenance exposure'] },
    { id: 'GJ-EDU-SCH-0023', name: 'Naranpura Primary School', type: 'School', department: 'Education', district: 'Ahmedabad', status: 'Operational', condition: 'Good', risk: 'Low', score: 24, updated: 'Yesterday', x: 52, y: 25, history: ['Asset acquired', 'Annual inspection passed'] },
    { id: 'GJ-HEALTH-MED-0041', name: 'Mobile ICU Unit 04', type: 'Medical Equipment', department: 'Health', district: 'Gandhinagar', status: 'Under maintenance', condition: 'Poor', risk: 'Critical', score: 94, updated: '4h ago', x: 71, y: 47, history: ['Calibration overdue', 'Corrective maintenance opened'] },
    { id: 'GJ-RTO-VEH-0012', name: 'Emergency Response Van', type: 'Ambulance', department: 'Transport', district: 'Vadodara', status: 'Operational', condition: 'Good', risk: 'Medium', score: 52, updated: '3d ago', x: 62, y: 70, history: ['Vehicle assigned to Vadodara district'] },
    { id: 'GJ-ENERGY-STL-0102', name: 'Ashram Road Streetlight', type: 'Streetlight', department: 'Energy', district: 'Ahmedabad', status: 'Needs inspection', condition: 'Fair', risk: 'Medium', score: 61, updated: '5d ago', x: 39, y: 61, history: ['Citizen report received', 'Inspection due'] },
    { id: 'GJ-WATER-PIP-0088', name: 'North Zone Main Pipeline', type: 'Water Pipeline', department: 'Water Resources', district: 'Mehsana', status: 'Operational', condition: 'Good', risk: 'Low', score: 19, updated: '1w ago', x: 83, y: 29, history: ['Pressure inspection passed'] },
  ],
  workOrders: [
    { id: 'WO-24091', assetId: 'GJ-PWD-BRG-0001', issue: 'Structural inspection and corrosion treatment', priority: 'High', status: 'Open', assignee: 'Unassigned', created: 'Today' },
    { id: 'WO-24088', assetId: 'GJ-HEALTH-MED-0041', issue: 'Replace failed oxygen sensor', priority: 'Critical', status: 'In progress', assignee: 'Health Engineering', created: 'Yesterday' },
    { id: 'WO-24077', assetId: 'GJ-ENERGY-STL-0102', issue: 'Streetlight not working', priority: 'Medium', status: 'Verification', assignee: 'Energy Field Team', created: '3d ago' },
  ],
  reports: [{ id: 'CR-0088', assetId: 'GJ-ENERGY-STL-0102', issue: 'Streetlight is not working after 8 PM', status: 'Reported', created: 'Today' }],
  transfers: [{ id: 'TR-0012', assetId: 'GJ-RTO-VEH-0012', from: 'Transport', to: 'Health', location: 'Vadodara -> Ahmedabad', status: 'Pending', requested: 'Today' }],
  approvals: [{ id: 'AP-0041', type: 'Retirement evaluation', entityId: 'GJ-HEALTH-MED-0041', requester: 'Health Engineering', status: 'Pending', created: 'Today' }],
  audit: [],
}
let db = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : seed
const knownLocations = { 'GJ-PWD-BRG-0001': [23.0276, 72.5817, 'Sabarmati Riverfront East, Ahmedabad'], 'GJ-EDU-SCH-0023': [23.0588, 72.5534, 'Naranpura, Ahmedabad'], 'GJ-HEALTH-MED-0041': [23.2156, 72.6369, 'Civil Hospital Campus, Gandhinagar'], 'GJ-RTO-VEH-0012': [22.3072, 73.1812, 'Sayajiganj Transport Depot, Vadodara'], 'GJ-ENERGY-STL-0102': [23.0323, 72.5687, 'Ashram Road, Ahmedabad'], 'GJ-WATER-PIP-0088': [23.588, 72.3693, 'North Zone, Mehsana'] }
const districtLocations = { Ahmedabad: [23.0225, 72.5714, 'Ahmedabad, Gujarat'], Gandhinagar: [23.2156, 72.6369, 'Gandhinagar, Gujarat'], Vadodara: [22.3072, 73.1812, 'Vadodara, Gujarat'], Mehsana: [23.588, 72.3693, 'Mehsana, Gujarat'] }
db.assets.forEach((asset) => { const location = knownLocations[asset.id] || districtLocations[asset.district] || districtLocations.Ahmedabad; if (!asset.latitude) [asset.latitude, asset.longitude, asset.address] = location })
persist()
function persist() { writeFileSync(dataFile, JSON.stringify(db, null, 2)) }
function audit(action, entity, entityId, details = {}) { db.audit.unshift({ id: randomUUID(), action, entity, entityId, actor: 'demo.admin', timestamp: new Date().toISOString(), details }); persist() }
function send(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' }); response.end(JSON.stringify(body)) }
async function body(request) { let raw = ''; for await (const chunk of request) raw += chunk; return raw ? JSON.parse(raw) : {} }
function findAsset(id) { return db.assets.find((asset) => asset.id === id) }
const transitions = { Planned: ['Procurement'], Procurement: ['Acquired'], Acquired: ['In transit'], 'In transit': ['Deployed'], Deployed: ['Operational'], Operational: ['Under maintenance', 'Retirement evaluation'], 'Under maintenance': ['Operational'], 'Retirement evaluation': ['Retired'], Retired: ['Disposal pending'], 'Disposal pending': ['Disposed'] }

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {})
  const url = new URL(request.url, `http://${request.headers.host}`)
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return send(response, 200, { ok: true, service: 'civicasset-api', persistence: dataFile })
    if (request.method === 'GET' && url.pathname === '/api/bootstrap') return send(response, 200, { ...db, generatedAt: new Date().toISOString() })
    if (request.method === 'GET' && url.pathname === '/api/dashboard') {
      return send(response, 200, { total: db.assets.length, operational: db.assets.filter((asset) => asset.status === 'Operational').length, attention: db.assets.filter((asset) => ['High', 'Critical'].includes(asset.risk)).length, openWorkOrders: db.workOrders.length, critical: db.assets.filter((asset) => asset.risk === 'Critical').length })
    }
    if (request.method === 'GET' && url.pathname === '/api/assets') return send(response, 200, db.assets)
    if (request.method === 'GET' && url.pathname.startsWith('/api/assets/')) { const asset = findAsset(url.pathname.split('/')[3]); return asset ? send(response, 200, asset) : send(response, 404, { error: 'Asset not found' }) }
    if (request.method === 'POST' && url.pathname === '/api/assets') { const payload = await body(request); const asset = { ...payload, id: payload.id || `GJ-DEMO-${String(db.assets.length + 1).padStart(4, '0')}`, history: ['Asset created as planned record'], updated: 'Just now' }; db.assets.push(asset); audit('Asset created', 'asset', asset.id); return send(response, 201, asset) }
    if (request.method === 'POST' && url.pathname.match(/^\/api\/assets\/[^/]+\/inspection$/)) { const asset = findAsset(url.pathname.split('/')[3]); if (!asset) return send(response, 404, { error: 'Asset not found' }); const payload = await body(request); const score = Number(payload.score); asset.condition = payload.condition; asset.score = score; asset.risk = score < 25 ? 'Low' : score < 50 ? 'Medium' : score < 80 ? 'High' : 'Critical'; asset.updated = 'Just now'; asset.history.unshift(`Inspection recorded: ${asset.condition} condition, score ${score}`); audit('Inspection recorded', 'asset', asset.id, payload); return send(response, 200, asset) }
    if (request.method === 'POST' && url.pathname.match(/^\/api\/assets\/[^/]+\/transition$/)) { const asset = findAsset(url.pathname.split('/')[3]); const payload = await body(request); if (!asset) return send(response, 404, { error: 'Asset not found' }); if (!transitions[asset.status]?.includes(payload.status)) return send(response, 422, { error: `Invalid transition from ${asset.status} to ${payload.status}`, allowed: transitions[asset.status] || [] }); const previous = asset.status; asset.status = payload.status; asset.updated = 'Just now'; asset.history.unshift(`Lifecycle transition: ${previous} -> ${asset.status}`); audit('Lifecycle transition', 'asset', asset.id, { previous, next: asset.status }); return send(response, 200, asset) }
    if (request.method === 'GET' && url.pathname === '/api/work-orders') return send(response, 200, db.workOrders)
    if (request.method === 'POST' && url.pathname === '/api/work-orders') { const payload = await body(request); const order = { ...payload, id: `WO-${24000 + db.workOrders.length + 1}`, status: 'Open', created: 'Just now' }; db.workOrders.unshift(order); const asset = findAsset(order.assetId); if (asset) { asset.status = 'Under maintenance'; asset.history.unshift(`Work order ${order.id} created`) } audit('Work order created', 'work-order', order.id, payload); return send(response, 201, order) }
    if (request.method === 'PUT' && url.pathname.match(/^\/api\/work-orders\/[^/]+$/)) { const order = db.workOrders.find((item) => item.id === url.pathname.split('/')[3]); if (!order) return send(response, 404, { error: 'Work order not found' }); const payload = await body(request); Object.assign(order, payload); audit('Work order updated', 'work-order', order.id, payload); return send(response, 200, order) }
    if (request.method === 'GET' && url.pathname === '/api/citizen-reports') return send(response, 200, db.reports)
    if (request.method === 'POST' && url.pathname === '/api/citizen-reports') { const payload = await body(request); const report = { ...payload, id: `CR-${String(80 + db.reports.length).padStart(4, '0')}`, status: 'Reported', created: 'Just now' }; db.reports.unshift(report); audit('Citizen report submitted', 'citizen-report', report.id, payload); return send(response, 201, report) }
    if (request.method === 'GET' && url.pathname === '/api/audit') return send(response, 200, db.audit)
    if (request.method === 'POST' && url.pathname === '/api/sync') { const payload = await body(request); db = { ...db, ...payload }; persist(); audit('Data synchronized', 'system', 'civicasset'); return send(response, 200, { ok: true }) }
    return send(response, 404, { error: 'Route not found' })
  } catch (error) { console.error(error); return send(response, 500, { error: 'Unexpected server error' }) }
})
server.listen(port, () => console.log(`CivicAsset API listening on http://localhost:${port}`))
