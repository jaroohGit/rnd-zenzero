import 'dotenv/config'
import express      from 'express'
import cors         from 'cors'
import net          from 'net'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer }               from 'http'

// ── Config ────────────────────────────────────────────────────────────────────
const PORT      = Number(process.env.PORT       ?? 3000)
const WS_PORT   = Number(process.env.WS_PORT    ?? 9001)
const MQTT_HOST =        process.env.MQTT_HOST  ?? 'mqtt.zenzerobiogas.com'
const MQTT_PORT = Number(process.env.MQTT_PORT  ?? 1884)

// ── Express REST API (port 3000) ───────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    bridge:  `ws://localhost:${WS_PORT}`,
    broker:  `${MQTT_HOST}:${MQTT_PORT}`,
    clients: wss?.clients.size ?? 0,
  })
})

const httpServer = createServer(app)
httpServer.listen(PORT, () => {
  console.log(`[API]    http://localhost:${PORT}`)
})

// ── MQTT-over-WebSocket Bridge (port 9001) ────────────────────────────────────
// frontend (mqtt.js) → WS → here → TCP → broker
// broker → TCP → here → WS → frontend
const wss = new WebSocketServer({ port: WS_PORT })

wss.on('listening', () => {
  console.log(`[Bridge] ws://localhost:${WS_PORT}  →  ${MQTT_HOST}:${MQTT_PORT}`)
})

wss.on('connection', (ws: WebSocket) => {
  console.log(`[Bridge] client connected  (total: ${wss.clients.size})`)

  const tcp = net.createConnection({ host: MQTT_HOST, port: MQTT_PORT })

  // WS → TCP  (frontend sends MQTT packet → forward to broker)
  ws.on('message', (data: Buffer) => {
    if (tcp.writable) tcp.write(data)
  })

  // TCP → WS  (broker replies → forward to frontend)
  tcp.on('data', (data: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data)
  })

  // Teardown
  const close = (reason: string) => {
    console.log(`[Bridge] closed — ${reason}  (remaining: ${wss.clients.size - 1})`)
    try { tcp.destroy() }   catch { /* */ }
    try { ws.close() }      catch { /* */ }
  }

  ws.on('close',  ()            => close('ws closed'))
  tcp.on('close', ()            => close('tcp closed'))
  ws.on('error',  (e: Error)    => close(`ws error: ${e.message}`))
  tcp.on('error', (e: Error)    => close(`tcp error: ${e.message}`))
})
