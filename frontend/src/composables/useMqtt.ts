/**
 * MQTT Composable — Frontend
 *
 * Connects directly to the production MQTT WebSocket endpoint.
 * In production we proxy `/mqtt-1884` on the same host to the broker's
 * `/mqtt` WebSocket listener so the app behaves like the original /rnd page.
 */

import { ref } from 'vue'
import * as _mqttMod from 'mqtt'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mqttLib: any = (_mqttMod as any).default ?? _mqttMod

import { useAuthorityStore }    from '@/stores/authority'
import { useSensorsStore }      from '@/stores/sensors'
import { useBlowerStore }       from '@/stores/blower'
import { useProcessParamStore } from '@/stores/processParam'

// ── Broker info (read from .env) ─────────────────────────────────────────
export const BROKER_HOST = import.meta.env.VITE_MQTT_HOST ?? 'mqtt.zenzerobiogas.com'
export const BROKER_PORT = Number(import.meta.env.VITE_MQTT_PORT ?? 1884)

const _proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'
const _host  = typeof window !== 'undefined' ? window.location.host : 'localhost'
const _hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const _isLocalHost = ['localhost', '127.0.0.1'].includes(_hostname)
export const MQTT_WS_URL: string =
  import.meta.env.VITE_MQTT_WS_URL ?? (_isLocalHost
    ? 'wss://mqtt.zenzerobiogas.com/mqtt'
    : `${_proto}://${_host}/mqtt-1884`)

// ── MQTT Topics (read from .env) ──────────────────────────────────────────
export const TOPIC_STATUS = import.meta.env.VITE_TOPIC_STATUS ?? 'Demo/zenmac/QQ'
export const TOPIC_CMD    = import.meta.env.VITE_TOPIC_CMD    ?? 'Demo/zenmac/cmd'
export const TOPIC_AUTH   = import.meta.env.VITE_TOPIC_AUTH   ?? 'Demo/zenmac/authority'

// ── Reactive state (module-level singleton) ───────────────────────────────
export const mqttConnected = ref(false)
export const mqttState     = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
export const mqttLabel     = ref('MQTT Connecting…')
export const mqttDebugLog  = ref<string[]>([])

let _initialized = false
let _connected   = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null

// ── Logger ────────────────────────────────────────────────────────────────
function log(msg: string) {
  const ts = new Date().toLocaleTimeString('th')
  mqttDebugLog.value.unshift(`[${ts}]  ${msg}`)
  if (mqttDebugLog.value.length > 50) mqttDebugLog.value.pop()
}

// ── Message handler ───────────────────────────────────────────────────────
function handleMessage(topic: string, payload: Buffer) {
  let data: { d?: Record<string, unknown>; holder?: string; src?: string }
  try { data = JSON.parse(payload.toString()) } catch { return }

  // Skip our own command messages (commands have src:'WEB') to avoid self-echo
  if (data.src) return

  // Authority topic
  if (topic === TOPIC_AUTH) {
    if (data.holder && ['LOCAL', 'HMI', 'WEB'].includes(data.holder)) {
      useAuthorityStore().setHolder(data.holder as 'LOCAL' | 'HMI' | 'WEB')
      log(`🔑 Authority → ${data.holder}`)
    }
    return
  }

  // Status topic — update stores
  const d: Record<string, unknown> = data.d ?? (data as Record<string, unknown>)
  log(`📩 ${TOPIC_STATUS}: ${payload.toString().slice(0, 60)}`)

  useSensorsStore().updateFromMqtt(d)
  useBlowerStore().updateFromMqtt(d)

  // Lamp actual state
  const pp = useProcessParamStore()
  const actualArr = Array(pp.LAMPS).fill(false) as boolean[]
  for (let n = 1; n <= pp.LAMPS; n++) {
    const key = 'Lamp' + n
    if (d[key] !== undefined) {
      actualArr[n - 1] = !!(Array.isArray(d[key]) ? (d[key] as unknown[])[0] : d[key])
    }
  }
  pp.setActualLamps(actualArr)
}

// ── Connect ───────────────────────────────────────────────────────────────
function connect() {
  mqttState.value = 'connecting'
  mqttLabel.value = `Connecting to ${BROKER_HOST}:${BROKER_PORT}…`
  log(`⏳ Connecting via websocket: ${MQTT_WS_URL}`)

  try {
    const client = mqttLib.connect(MQTT_WS_URL, {
      clientId:        `hmi_dc_${Math.random().toString(16).slice(2, 8)}`,
      keepalive:       30,
      reconnectPeriod: 0,         // manual reconnect on close
      connectTimeout:  10000,
      protocolVersion: 4,
    })

    _client = client

    client.on('connect', () => {
      _connected = true
      mqttConnected.value = true
      mqttState.value = 'connected'
      mqttLabel.value = `✓ ${BROKER_HOST}:${BROKER_PORT}`
      log(`✅ Connected — broker: ${BROKER_HOST}:${BROKER_PORT}`)

      // Register publish function with authority store
      useAuthorityStore().setPublish((topic: string, msg: string) => {
        try   { client.publish(topic, msg) }
        catch { log('❌ Publish error') }
      })

      // Subscribe to PLC data and authority topics
      client.subscribe([TOPIC_STATUS, TOPIC_AUTH], (err: Error | null) => {
        if (err) log(`⚠ Subscribe error: ${err.message}`)
        else     log(`📡 Subscribed: ${TOPIC_STATUS}, ${TOPIC_AUTH}`)
      })
    })

    client.on('error', (err: Error) => {
      log(`✗ ${err.message}`)
      try { client.end(true) } catch { /* */ }
      if (!_connected) scheduleReconnect(5000)
    })

    client.on('close', () => {
      if (_connected) {
        _connected = false
        _client    = null
        mqttConnected.value = false
        mqttState.value = 'disconnected'
        mqttLabel.value = `Disconnected — retrying in 10s`
        log('🔌 Disconnected — retry in 10s')
        scheduleReconnect(10000)
      }
    })

    client.on('message', handleMessage)

  } catch (err) {
    log(`❌ connect() threw: ${err}`)
    scheduleReconnect(5000)
  }
}

function scheduleReconnect(ms: number) {
  log(`⏱ Reconnecting in ${ms / 1000}s…`)
  mqttState.value = 'connecting'
  setTimeout(() => {
    if (!_connected) connect()
  }, ms)
}

// ── Public composable (singleton-safe) ───────────────────────────────────
export function useMqtt() {

  function init() {
    if (_initialized) return
    _initialized = true
    log(`🚀 MQTT init — broker: ${BROKER_HOST}:${BROKER_PORT} via ${MQTT_WS_URL}`)
    connect()
  }

  /** Publish directly — bypasses all authority checks (for TestPage diagnostics) */
  function rawPublish(topic: string, payload: string): boolean {
    if (!_client || !_connected) { log('❌ rawPublish: not connected'); return false }
    try {
      _client.publish(topic, payload)
      log(`📤 RAW → ${topic}: ${payload.slice(0, 60)}`)
      return true
    } catch (e) {
      log(`❌ rawPublish error: ${e}`)
      return false
    }
  }

  /** Manual connect to any WebSocket URL (for Test page debugging) */
  function manualConnect(url: string) {
    if (_client) {
      try { _client.end(true) } catch { /* */ }
      _client    = null
      _connected = false
    }
    log(`🔧 Manual connect: ${url}`)
    mqttState.value = 'connecting'

    try {
      const client = mqttLib.connect(url, {
        clientId:        `hmi_manual_${Math.random().toString(16).slice(2, 8)}`,
        keepalive:       30,
        reconnectPeriod: 0,
        connectTimeout:  8000,
        protocolVersion: 4,
      })
      _client = client
      client.on('connect', () => {
        _connected = true
        mqttConnected.value = true
        mqttState.value = 'connected'
        mqttLabel.value = `✓ Manual: ${url}`
        log(`✅ Manual connected: ${url}`)
        useAuthorityStore().setPublish((t: string, m: string) => {
          try { client.publish(t, m) } catch { log('❌ Publish error') }
        })
        client.subscribe([TOPIC_STATUS, TOPIC_AUTH], () => {})
      })
      client.on('error',   (err: Error) => { log(`✗ ${err.message}`); try { client.end(true) } catch { /* */ } })
      client.on('close',   ()           => { if (_connected) { _connected = false; mqttConnected.value = false; mqttState.value = 'disconnected' } })
      client.on('message', handleMessage)
    } catch (err) {
      log(`❌ manualConnect threw: ${err}`)
    }
  }

  return { init, manualConnect, rawPublish }
}
