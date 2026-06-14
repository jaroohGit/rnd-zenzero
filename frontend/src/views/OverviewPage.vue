<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useSensorsStore }      from '@/stores/sensors'
import { useProcessParamStore } from '@/stores/processParam'
import { useAuthorityStore }    from '@/stores/authority'
import { mqttConnected, mqttLabel } from '@/composables/useMqtt'
import PanelCard from '@/components/shared/PanelCard.vue'

const sensors = useSensorsStore()
const pp      = useProcessParamStore()
const auth    = useAuthorityStore()

// ── Clock ─────────────────────────────────────────────────────────────────
const now   = ref(new Date())
let clockTimer: ReturnType<typeof setInterval>
onMounted  (() => { clockTimer = setInterval(() => now.value = new Date(), 1000) })
onUnmounted(() => clearInterval(clockTimer))
const pad = (v: number) => String(v).padStart(2, '0')
const dateStr = () => `${now.value.getFullYear()}/${pad(now.value.getMonth()+1)}/${pad(now.value.getDate())}`
const timeStr = () => `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}:${pad(now.value.getSeconds())}`

// ── Lamp quick-toggle (optimistic) ────────────────────────────────────────
const LAMPS = 7
const lampCmd = reactive<boolean[]>(Array(LAMPS).fill(false))
const lampPending = reactive<boolean[]>(Array(LAMPS).fill(false))

// sync initial state จาก PLC actual
watch(() => [...pp.lampActualState], (actual) => {
  actual.forEach((on, i) => {
    if (lampPending[i]) return   // รอ pending อยู่ — ไม่ override
    lampCmd[i] = on
  })
}, { immediate: true })

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2500)
}

function toggleLamp(idx: number) {
  if (!auth.iHaveControl) { showToast('🔒 กด REQUEST CONTROL ก่อน'); return }
  const state = !lampCmd[idx]
  lampCmd[idx] = state
  lampPending[idx] = true
  const ok = auth.sendCommand({ ['Lamp' + (idx + 1)]: state ? 1 : 0 })
  showToast(ok ? `💡 Lamp${idx+1} → ${state ? 'ON' : 'OFF'}` : '❌ Send failed')
  setTimeout(() => { lampPending[idx] = false }, 5000)
}

// ── Register write ────────────────────────────────────────────────────────
const writeRegs = reactive({ D300: 0, D302: 0, D304: 0, D306: 0 })
// sync from read values initially
watch(() => sensors.d300, v => { writeRegs.D300 = v }, { immediate: true })
watch(() => sensors.d302, v => { writeRegs.D302 = v }, { immediate: true })
watch(() => sensors.d304, v => { writeRegs.D304 = v }, { immediate: true })
watch(() => sensors.d306, v => { writeRegs.D306 = v }, { immediate: true })

function sendRegisters() {
  if (!auth.iHaveControl) { showToast('🔒 กด REQUEST CONTROL ก่อน'); return }
  const ok = auth.sendCommand({ ...writeRegs })
  showToast(ok ? '📤 Registers sent to PLC' : '❌ Send failed')
}
</script>

<template>
  <div class="page-grid">

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>

    <!-- ① MQTT Status bar -->
    <div class="mqtt-bar" :class="mqttConnected ? 'connected' : 'disconnected'" style="grid-column:span 3;">
      <span class="mqtt-dot" :class="mqttConnected ? 'on' : 'off'"></span>
      <span class="mqtt-info">
        <b>{{ mqttConnected ? 'CONNECTED' : 'DISCONNECTED' }}</b> — {{ mqttLabel }}
      </span>
      <span class="mqtt-topic">Topic: Demo/zenmac/QQ</span>
      <span class="mqtt-time">{{ timeStr() }}</span>
    </div>

    <!-- ② Sensor Data — RECEIVE (MQTT → Web) -->
    <PanelCard color="blue" title="Sensor Data — MQTT → Web" icon="📡">
      <div class="field-list">
        <div class="field-row">
          <div class="field-meta">
            <span class="field-key">Temp1111111</span>
            <span class="field-op">÷ 10</span>
          </div>
          <div class="field-label">T1 (TEMP-1)</div>
          <div class="field-val cyan">{{ sensors.temp1.toFixed(1) }}<span class="unit">°C</span></div>
        </div>
        <div class="field-row">
          <div class="field-meta">
            <span class="field-key">Temp2222</span>
            <span class="field-op">÷ 10</span>
          </div>
          <div class="field-label">T2 (TEMP-2)</div>
          <div class="field-val cyan">{{ sensors.temp2.toFixed(1) }}<span class="unit">°C</span></div>
        </div>
        <div class="field-row">
          <div class="field-meta">
            <span class="field-key">TEMPCOM1</span>
            <span class="field-op">÷ 10</span>
          </div>
          <div class="field-label">Amb (Ambient)</div>
          <div class="field-val cyan">{{ sensors.tempAmb.toFixed(1) }}<span class="unit">°C</span></div>
        </div>
        <div class="field-row">
          <div class="field-meta">
            <span class="field-key">RH2222</span>
            <span class="field-op">÷ 10</span>
          </div>
          <div class="field-label">RH (Humidity)</div>
          <div class="field-val teal">{{ sensors.rh.toFixed(1) }}<span class="unit">%</span></div>
        </div>
        <div class="field-row">
          <div class="field-meta">
            <span class="field-key">D300</span>
            <span class="field-op">raw</span>
          </div>
          <div class="field-label">Register D300</div>
          <div class="field-val purple">{{ sensors.d300 }}</div>
        </div>
        <div class="field-row">
          <div class="field-meta">
            <span class="field-key">Lamp7</span>
            <span class="field-op">bool</span>
          </div>
          <div class="field-label">L7 (Lamp 7)</div>
          <div class="field-val" :class="pp.lampActualState[6] ? 'orange' : 'dim'">
            {{ pp.lampActualState[6] ? 'ON' : 'OFF' }}
          </div>
        </div>
      </div>
    </PanelCard>

    <!-- ③ Register Read (all 4) -->
    <PanelCard color="teal" title="Registers — PLC → Web" icon="📥">
      <div class="reg-grid">
        <div class="reg-item" v-for="({ val, key, label }) in [
          { key:'D300', val:sensors.d300, label:'Register D300' },
          { key:'D302', val:sensors.d302, label:'Register D302' },
          { key:'D304', val:sensors.d304, label:'Register D304' },
          { key:'D306', val:sensors.d306, label:'Register D306' },
        ]" :key="key">
          <div class="reg-key">{{ key }}</div>
          <div class="reg-val">{{ val }}</div>
          <div class="reg-label">{{ label }}</div>
        </div>
      </div>
    </PanelCard>

    <!-- ④ Date & Time -->
    <PanelCard color="orange" title="Date &amp; Time" icon="🕐">
      <div style="text-align:center;padding:10px 0;">
        <div style="font-size:20px;font-weight:700;color:#ffa726;font-family:var(--font-mono);letter-spacing:2px;">
          {{ dateStr() }}
        </div>
        <div style="font-size:34px;font-weight:700;color:#ffcc80;font-family:var(--font-mono);letter-spacing:4px;margin-top:8px;">
          {{ timeStr() }}
        </div>
      </div>
      <div class="scan-row">
        <span>Scan time:</span>
        <span class="scan-val">{{ sensors.scanMs }} ms</span>
      </div>
    </PanelCard>

    <!-- ⑤ Lamp Control — SEND (Web → PLC) -->
    <PanelCard
      color="green"
      title="Lamp Control — Web → PLC"
      icon="💡"
      style="grid-column:span 2;"
      :prohibited="!auth.iHaveControl"
      :lock-sub="'สิทธิ์: ' + auth.authHolder + ' — กด REQUEST CONTROL'"
    >
      <div class="lamp-row">
        <div
          v-for="i in LAMPS"
          :key="i"
          class="lamp-btn"
          :class="{ on: lampCmd[i-1], pending: lampPending[i-1] }"
          @click="toggleLamp(i-1)"
        >
          <div class="bulb" :class="{ on: lampCmd[i-1] }"></div>
          <span class="lamp-no">L{{ i }}</span>
          <span class="lamp-st" :class="{ active: lampCmd[i-1] }">
            {{ lampCmd[i-1] ? 'ON' : 'OFF' }}
          </span>
          <span v-if="lampPending[i-1]" class="pend-dot"></span>
          <!-- show actual PLC state below -->
          <span class="plc-st" :title="'PLC actual'">
            PLC:{{ pp.lampActualState[i-1] ? '●' : '○' }}
          </span>
        </div>
      </div>
      <div class="lamp-legend">
        <span>💡 = Commanded &nbsp; PLC:● = Actual ON &nbsp; PLC:○ = Actual OFF</span>
        <span class="pend-dot inline"></span><span> = Pending PLC confirm</span>
      </div>
    </PanelCard>

    <!-- ⑥ Register Write — SEND (Web → PLC) -->
    <PanelCard
      color="purple"
      title="Register Write — Web → PLC"
      icon="📤"
      :prohibited="!auth.iHaveControl"
      :lock-sub="'สิทธิ์: ' + auth.authHolder + ' — กด REQUEST CONTROL'"
    >
      <div class="wr-grid">
        <div class="wr-item" v-for="k in ['D300','D302','D304','D306']" :key="k">
          <div class="wr-key">{{ k }}</div>
          <input
            class="hmi-input"
            type="number"
            style="width:100%;"
            v-model.number="writeRegs[k as keyof typeof writeRegs]"
          />
          <div class="wr-read">PLC: {{ sensors[k === 'D300' ? 'd300' : k === 'D302' ? 'd302' : k === 'D304' ? 'd304' : 'd306'] }}</div>
        </div>
      </div>
      <button class="send-btn" style="margin-top:12px;width:100%;" @click="sendRegisters">
        📤 Write Registers to PLC
      </button>
    </PanelCard>

  </div>
</template>

<style scoped>
.page-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-content: start;
  position: relative;
}

/* Toast */
.toast {
  position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
  background: rgba(10,24,38,0.96); border: 1px solid rgba(0,229,255,0.35);
  color: #e0f0ff; padding: 10px 24px; border-radius: 24px;
  font-size: 13px; font-weight: 600; z-index: 1000; pointer-events: none;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
.toast-enter-active, .toast-leave-active { transition: opacity .25s, transform .25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* MQTT status bar */
.mqtt-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 16px; border-radius: 10px;
  font-size: 12px; flex-wrap: wrap;
}
.mqtt-bar.connected    { background: rgba(0,230,118,0.08); border: 1px solid rgba(0,230,118,0.3); color: #a5d6a7; }
.mqtt-bar.disconnected { background: rgba(239,83,80,0.08); border: 1px solid rgba(239,83,80,0.25); color: #ef9a9a; }
.mqtt-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.mqtt-dot.on  { background: #00e676; box-shadow: 0 0 8px rgba(0,230,118,0.7); animation: pulse 1.5s infinite; }
.mqtt-dot.off { background: #ef5350; }
.mqtt-info  { font-weight: 600; }
.mqtt-topic { font-family: var(--font-mono); font-size: 11px; opacity: 0.7; }
.mqtt-time  { margin-left: auto; font-family: var(--font-mono); opacity: 0.5; }

/* Field list (receive panel) */
.field-list { display: flex; flex-direction: column; gap: 6px; }
.field-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; background: var(--bg-item);
  border-radius: 8px; border: 1px solid var(--border);
}
.field-meta  { display: flex; flex-direction: column; align-items: flex-start; width: 90px; flex-shrink: 0; }
.field-key   { font-size: 9px; font-family: var(--font-mono); color: #546e7a; letter-spacing: 0.5px; }
.field-op    { font-size: 9px; color: #37474f; margin-top: 1px; }
.field-label { flex: 1; font-size: 11px; color: var(--text-muted); }
.field-val   { font-size: 22px; font-weight: 700; font-family: var(--font-mono); min-width: 80px; text-align: right; }
.field-val.cyan   { color: #00e5ff; text-shadow: 0 0 10px rgba(0,229,255,0.4); }
.field-val.teal   { color: #64ffda; text-shadow: 0 0 10px rgba(100,255,218,0.4); }
.field-val.purple { color: #ce93d8; }
.field-val.orange { color: #f9a825; text-shadow: 0 0 10px rgba(249,168,37,0.5); }
.field-val.dim    { color: #546e7a; }
.unit { font-size: 13px; color: #90a4ae; margin-left: 3px; }

/* Register read */
.reg-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.reg-item  { background: var(--bg-item); border-radius: 8px; padding: 8px 12px; border: 1px solid var(--border); }
.reg-key   { font-size: 11px; font-weight: 700; color: #64ffda; letter-spacing: 1px; margin-bottom: 2px; }
.reg-val   { font-size: 24px; font-weight: 700; font-family: var(--font-mono); color: #80cbc4; }
.reg-label { font-size: 9px; color: #37474f; margin-top: 2px; }

/* Scan time */
.scan-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11px; color: #37474f; }
.scan-val { font-family: var(--font-mono); color: #546e7a; }

/* Lamp control */
.lamp-row   { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
.lamp-btn {
  background: var(--bg-item); border-radius: 12px; padding: 12px 4px;
  border: 1.5px solid var(--border);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer; transition: all .2s; position: relative;
}
.lamp-btn:hover { border-color: rgba(0,229,255,0.35); }
.lamp-btn.on    { border-color: #f9a825; background: rgba(249,168,37,0.1); }
.lamp-btn.pending { border-color: #42a5f5 !important; }
.bulb {
  width: 36px; height: 36px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #37474f, #1a2530);
  border: 2px solid rgba(255,255,255,0.08); transition: all .3s;
}
.bulb.on {
  background: radial-gradient(circle at 35% 30%, #fff9c4, #f9a825);
  border-color: #f9a825;
  box-shadow: 0 0 16px rgba(249,168,37,0.8), 0 0 32px rgba(249,168,37,0.25);
}
.lamp-no { font-size: 10px; font-weight: 700; color: #90a4ae; }
.lamp-st { font-size: 10px; font-weight: 700; color: #546e7a; }
.lamp-st.active { color: #f9a825; }
.plc-st { font-size: 8px; color: #37474f; letter-spacing: 0.5px; }
.pend-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #42a5f5;
  position: absolute; top: 5px; right: 5px;
  box-shadow: 0 0 5px rgba(66,165,245,0.7); animation: pulse 1s infinite;
}
.pend-dot.inline { position: static; display: inline-block; vertical-align: middle; margin-right: 3px; }
.lamp-legend { margin-top: 10px; font-size: 10px; color: #546e7a; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Register write */
.wr-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wr-item  { background: var(--bg-item); border-radius: 8px; padding: 8px 10px; border: 1px solid var(--border); }
.wr-key   { font-size: 11px; font-weight: 700; color: #ce93d8; margin-bottom: 4px; }
.wr-read  { font-size: 9px; color: #37474f; margin-top: 3px; font-family: var(--font-mono); }
.send-btn {
  padding: 10px; border-radius: 8px; border: none;
  background: linear-gradient(135deg, #6a1b9a, #ce93d8);
  color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
  transition: all .2s;
}
.send-btn:hover { filter: brightness(1.1); }
</style>
