import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mqtt from 'mqtt'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT ?? 3000
const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883'

// ── MQTT ──────────────────────────────────────────────────────────────────────
const mqttClient = mqtt.connect(MQTT_URL)

mqttClient.on('connect', () => {
  console.log(`[MQTT] Connected: ${MQTT_URL}`)
  mqttClient.subscribe('#')
})

mqttClient.on('message', (topic, payload) => {
  io.emit('mqtt', { topic, payload: payload.toString() })
})

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err.message)
})

// ── Socket.IO ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`)

  socket.on('publish', ({ topic, payload }: { topic: string; payload: string }) => {
    mqttClient.publish(topic, payload)
  })

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`)
  })
})

// ── REST ──────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', mqtt: mqttClient.connected })
})

httpServer.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`)
})
