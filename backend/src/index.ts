import 'dotenv/config'
import express      from 'express'
import cors         from 'cors'
import net          from 'net'
import mqtt         from 'mqtt'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer }               from 'http'

// ── Config ────────────────────────────────────────────────────────────────────
const PORT         = Number(process.env.PORT         ?? 3000)
const WS_PORT      = Number(process.env.WS_PORT      ?? 9001)
const MQTT_HOST    =        process.env.MQTT_HOST    ?? 'mqtt.zenzerobiogas.com'
const MQTT_PORT    = Number(process.env.MQTT_PORT    ?? 1884)
const TOPIC_STATUS =        process.env.TOPIC_STATUS ?? 'Demo/zenmac/QQ'
const TOPIC_CMD    =        process.env.TOPIC_CMD    ?? 'Demo/zenmac/cmd'
const TOPIC_AUTH   =        process.env.TOPIC_AUTH   ?? 'Demo/zenmac/authority'

const MQTT_URL = `mqtt://${MQTT_HOST}:${MQTT_PORT}`

// ── MQTT Client (server-side subscriber) ─────────────────────────────────────
let latestStatus: Record<string, unknown> = {}
let latestAuth   = ''
let mqttConnected = false

const mqttClient = mqtt.connect(MQTT_URL, {
  clientId:        `rnd_backend_${Math.random().toString(16).slice(2, 8)}`,
  keepalive:       30,
  reconnectPeriod: 5000,
})

mqttClient.on('connect', () => {
  mqttConnected = true
  console.log(`[MQTT]   Connected: ${MQTT_URL}`)
  mqttClient.subscribe([TOPIC_STATUS, TOPIC_AUTH], (err) => {
    if (err) console.error('[MQTT]   Subscribe error:', err.message)
    else     console.log(`[MQTT]   Subscribed: ${TOPIC_STATUS}, ${TOPIC_AUTH}`)
  })
})

mqttClient.on('message', (topic, payload) => {
  try {
    const data = JSON.parse(payload.toString())
    if (topic === TOPIC_STATUS) {
      latestStatus = data
      console.log(`[MQTT]   ${topic}: ${payload.toString().slice(0, 80)}`)
    }
    if (topic === TOPIC_AUTH) {
      latestAuth = data?.holder ?? ''
      console.log(`[MQTT]   ${topic}: holder=${latestAuth}`)
    }
  } catch {
    console.warn(`[MQTT]   Parse error on topic: ${topic}`)
  }
})

mqttClient.on('error',      (e) => console.error('[MQTT]   Error:', e.message))
mqttClient.on('reconnect',  ()  => console.log('[MQTT]   Reconnecting…'))
mqttClient.on('disconnect', ()  => { mqttConnected = false })

// ── Express REST API (port 3000) ──────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())

// Health + connection status
app.get('/health', (_req, res) => {
  res.json({
    status:       'ok',
    mqttConnected,
    bridge:       `ws://localhost:${WS_PORT}`,
    broker:       `${MQTT_HOST}:${MQTT_PORT}`,
    bridgeClients: wss?.clients.size ?? 0,
    topics:       { status: TOPIC_STATUS, cmd: TOPIC_CMD, auth: TOPIC_AUTH },
  })
})

// Latest MQTT data received server-side
app.get('/api/latest', (_req, res) => {
  res.json({ status: latestStatus, auth: latestAuth })
})

// Publish to any topic
app.post('/api/publish', (req, res) => {
  const { topic, payload } = req.body as { topic?: string; payload?: unknown }
  if (!topic || payload === undefined) {
    res.status(400).json({ error: 'topic and payload required' })
    return
  }
  const msg = typeof payload === 'string' ? payload : JSON.stringify(payload)
  mqttClient.publish(topic, msg, (err) => {
    if (err) res.status(500).json({ error: err.message })
    else {
      console.log(`[MQTT]   Published → ${topic}: ${msg.slice(0, 80)}`)
      res.json({ ok: true, topic, payload })
    }
  })
})

// Publish shortcut — CMD topic
app.post('/api/cmd', (req, res) => {
  const msg = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  mqttClient.publish(TOPIC_CMD, msg, (err) => {
    if (err) res.status(500).json({ error: err.message })
    else {
      console.log(`[MQTT]   CMD → ${TOPIC_CMD}: ${msg.slice(0, 80)}`)
      res.json({ ok: true, topic: TOPIC_CMD, payload: req.body })
    }
  })
})

const httpServer = createServer(app)
httpServer.listen(PORT, () => {
  console.log(`[API]    http://localhost:${PORT}`)
  console.log(`[Topics] status=${TOPIC_STATUS}  cmd=${TOPIC_CMD}  auth=${TOPIC_AUTH}`)
})

// ── MQTT-over-WebSocket Bridge (port 9001) ────────────────────────────────────
// frontend (mqtt.js) → WS → raw bytes → TCP → broker
const wss = new WebSocketServer({ port: WS_PORT })

wss.on('listening', () => {
  console.log(`[Bridge] ws://localhost:${WS_PORT}  →  ${MQTT_HOST}:${MQTT_PORT}`)
})

wss.on('connection', (ws: WebSocket) => {
  console.log(`[Bridge] client connected  (total: ${wss.clients.size})`)

  const tcp = net.createConnection({ host: MQTT_HOST, port: MQTT_PORT })

  ws.on('message', (data: Buffer) => {
    if (tcp.writable) tcp.write(data)
  })

  tcp.on('data', (data: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data)
  })

  const close = (reason: string) => {
    console.log(`[Bridge] closed — ${reason}  (remaining: ${wss.clients.size - 1})`)
    try { tcp.destroy() }  catch { /* */ }
    try { ws.close() }     catch { /* */ }
  }

  ws.on('close',  ()         => close('ws closed'))
  tcp.on('close', ()         => close('tcp closed'))
  ws.on('error',  (e: Error) => close(`ws error: ${e.message}`))
  tcp.on('error', (e: Error) => close(`tcp error: ${e.message}`))
})
