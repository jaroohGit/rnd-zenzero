<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useAuthorityStore } from '@/stores/authority'
import { useSensorsStore }   from '@/stores/sensors'
import { useProcessParamStore } from '@/stores/processParam'
import { useBlowerStore }    from '@/stores/blower'
import { mqttState, mqttLabel, mqttDebugLog, useMqtt } from '@/composables/useMqtt'
import PanelCard from '@/components/shared/PanelCard.vue'

const auth    = useAuthorityStore()
const sensors = useSensorsStore()
const pp      = useProcessParamStore()
const blower  = useBlowerStore()
const { manualConnect } = useMqtt()

// ─────────── Event Log ───────────
const log = ref<{ ts: string; msg: string; type: 'ok' | 'err' | 'warn' | 'info' | 'payload' }[]>([])
function addLog(msg: string, type: typeof log.value[0]['type'] = 'info') {
  log.value.unshift({ ts: new Date().toLocaleTimeString('th'), msg, type })
  if (log.value.length > 50) log.value.pop()
}
function clearLog() { log.value = [] }

// watch auth.lastCmdResult และแสดงใน log
watch(() => auth.lastCmdResult, (r) => {
  if (!r) return
  if      (r === 'ok')       addLog(`✅ CMD SENT → ${auth.lastCmdTopic}`, 'ok')
  else if (r === 'blocked')  addLog(`🔒 BLOCKED — กด REQUEST CONTROL ก่อน`, 'err')
  else if (r === 'no-mqtt')  addLog(`📡 MQTT ยังไม่เชื่อมต่อ`, 'warn')
})

// ─────────── MQTT Connection Debug ───────────
const manualUrl = ref('ws://localhost:5173/mqtt-1884')  // bridge → tcp:1884
function doManualConnect() {
  addLog(`🔌 Manual connect: ${manualUrl.value}`, 'info')
  manualConnect(manualUrl.value.trim())
}

// ─────────── Direct Publish (bypass auth) ───────────
const rawTopic   = ref('Demo/zenmac/cmd')
const rawPayload = ref('{"d":{"Lamp1":1},"src":"WEB","ts":0}')
function directPublish() {
  if (mqttState.value !== 'connected') { addLog('❌ MQTT ไม่ได้ต่อ', 'err'); return }
  try {
    const parsed = JSON.parse(rawPayload.value)
    if (parsed.ts === 0) parsed.ts = Date.now()
    // เรียก publish โดยตรงผ่าน auth._publish (ไม่ตรวจ iHaveControl)
    auth.sendCommand(parsed.d ?? parsed, rawTopic.value)
    addLog(`📡 RAW → ${rawTopic.value}`, 'ok')
    addLog(JSON.stringify(parsed), 'payload')
  } catch (e) {
    addLog(`❌ JSON error: ${e}`, 'err')
  }
}

// ─────────── Lamp Quick Test ───────────
const lampTest = reactive(Array.from({ length: 7 }, (_, i) => ({ n: i + 1, on: false })))
function toggleTestLamp(n: number) {
  const l = lampTest[n - 1]
  l.on = !l.on
  const ok = auth.sendCommand({ ['Lamp' + n]: l.on ? 1 : 0 })
  addLog(ok ? `💡 Lamp${n} → ${l.on ? 'ON' : 'OFF'}` : `🔒 Lamp${n} blocked`, ok ? 'ok' : 'err')
}
function allTestLamps(state: boolean) {
  const payload: Record<string, number> = {}
  lampTest.forEach(l => { l.on = state; payload['Lamp' + l.n] = state ? 1 : 0 })
  const ok = auth.sendCommand(payload)
  addLog(ok ? `💡 ALL → ${state ? 'ON' : 'OFF'}` : '🔒 ALL blocked', ok ? 'ok' : 'err')
}

// ─────────── Command Presets ───────────
const presets = [
  { label: 'All Lamps ON',     topic: 'Demo/zenmac/cmd',  payload: { Lamp1:1,Lamp2:1,Lamp3:1,Lamp4:1,Lamp5:1,Lamp6:1,Lamp7:1 } },
  { label: 'All Lamps OFF',    topic: 'Demo/zenmac/cmd',  payload: { Lamp1:0,Lamp2:0,Lamp3:0,Lamp4:0,Lamp5:0,Lamp6:0,Lamp7:0 } },
  { label: 'Lamp1 ON',         topic: 'Demo/zenmac/cmd',  payload: { Lamp1: 1 } },
  { label: 'Lamp1 OFF',        topic: 'Demo/zenmac/cmd',  payload: { Lamp1: 0 } },
  { label: 'TB01 START 60%',   topic: 'Demo/zenmac/blower/tb01/cmd', payload: { cmd:'start', blower_id:1, speed_pct:60 } },
  { label: 'TB01 STOP',        topic: 'Demo/zenmac/blower/tb01/cmd', payload: { cmd:'stop',  blower_id:1, speed_pct:0  } },
  { label: 'Ping',             topic: 'Demo/zenmac/cmd',  payload: { ping: 1 } },
]
const selPreset = ref(0)
function sendPreset() {
  const p = presets[selPreset.value]
  const ok = auth.sendCommand({ ...p.payload }, p.topic)
  addLog(ok ? `🚀 "${p.label}" → ${p.topic}` : `🔒 "${p.label}" blocked`, ok ? 'ok' : 'err')
}

// ─────────── Sensor Override ───────────
const ov = reactive({ enabled: false, temp1: 34.8, temp2: 34.9, tempAmb: 35.7, rh: 57.9 })
const ovFields = [
  { label: 'TEMP-1',   key: 'temp1'   as const, min: 0, max: 80, unit: '°C' },
  { label: 'TEMP-2',   key: 'temp2'   as const, min: 0, max: 80, unit: '°C' },
  { label: 'AMBIENT',  key: 'tempAmb' as const, min: 0, max: 80, unit: '°C' },
  { label: 'HUMIDITY', key: 'rh'      as const, min: 0, max: 100, unit: '%'  },
]
function applyOverride() {
  sensors.temp1   = ov.temp1
  sensors.temp2   = ov.temp2
  sensors.tempAmb = ov.tempAmb
  sensors.rh      = ov.rh
  pp.evaluate(ov.temp1, ov.temp2)
  addLog(`🌡️ Override: T1=${ov.temp1} T2=${ov.temp2} RH=${ov.rh}`, 'ok')
}

// ─────────── Register Set ───────────
const regs = reactive({ D300: 3333, D302: 3333, D304: 3333, D306: 3333 })
const regKeys = ['D300','D302','D304','D306'] as const
function sendRegisters() {
  sensors.d300 = regs.D300; sensors.d302 = regs.D302
  sensors.d304 = regs.D304; sensors.d306 = regs.D306
  const ok = auth.sendCommand({ ...regs })
  addLog(ok ? `📝 Registers sent: ${JSON.stringify(regs)}` : '🔒 Registers blocked', ok ? 'ok' : 'err')
}

// ─────────── Blower UI Force ───────────
function forceBlower(id: number, state: 'RUN' | 'STOP' | 'STBY') {
  const b = blower.blowers.find(x => x.id === id)!
  b.state = state
  if (state !== 'RUN') { b.kw = 0; b.cmm = 0 }
  addLog(`🌀 TB-0${id} UI → ${state} (local only)`, 'info')
}
</script>

<template>
  <div class="page-grid">

    <!-- ① System Status -->
    <PanelCard color="teal" title="System Status" icon="🖥️">
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-lbl">MQTT</div>
          <div class="big-val" :class="mqttState==='connected'?'ok':mqttState==='connecting'?'warn':'err'">
            {{ mqttState.toUpperCase() }}
          </div>
          <div class="sub-txt">{{ mqttLabel }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-lbl">CONTROL</div>
          <div class="big-val" :class="auth.iHaveControl?'ok':'warn'">{{ auth.authHolder }}</div>
          <div class="sub-txt">{{ auth.iHaveControl ? '✓ WEB has control' : '✗ Request control first' }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-lbl">MQTT READY</div>
          <div class="big-val" :class="auth.mqttReady?'ok':'err'">{{ auth.mqttReady ? 'YES' : 'NO' }}</div>
          <div class="sub-txt">publish fn {{ auth.mqttReady ? 'set' : 'null' }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-lbl">LIVE TEMP</div>
          <div style="font-size:15px;font-weight:700;font-family:var(--font-mono);color:#00e5ff;margin-top:4px;">
            {{ sensors.temp1.toFixed(1) }} / {{ sensors.temp2.toFixed(1) }}°C
          </div>
          <div class="sub-txt">Scan: {{ sensors.scanMs }} ms</div>
        </div>
        <div class="stat-item" style="grid-column:span 2;">
          <div class="stat-lbl">LAST CMD</div>
          <div style="margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <span class="result-badge" :class="auth.lastCmdResult">
              {{ auth.lastCmdResult || '—' }}
            </span>
            <span style="font-size:10px;color:#546e7a;font-family:var(--font-mono);word-break:break-all;">
              {{ auth.lastCmdTopic || '—' }}
            </span>
          </div>
          <div style="font-size:10px;color:#37474f;font-family:var(--font-mono);margin-top:3px;word-break:break-all;">
            {{ auth.lastCmdPayload ? auth.lastCmdPayload.slice(0,80)+'…' : '' }}
          </div>
        </div>
      </div>
    </PanelCard>

    <!-- ② MQTT Debug -->
    <PanelCard color="blue" title="MQTT Connection Debug" icon="🔌">
      <div class="row-between" style="margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="dot-lg" :class="mqttState"></span>
          <span class="big-val sm" :class="mqttState==='connected'?'ok':mqttState==='connecting'?'warn':'err'">
            {{ mqttState.toUpperCase() }}
          </span>
        </div>
      </div>
      <div class="field-lbl">MANUAL CONNECT URL</div>
      <input class="hmi-input" style="width:100%;margin-bottom:6px;" v-model="manualUrl" />
      <button class="btn btn-save" style="width:100%;margin-bottom:10px;" @click="doManualConnect">
        🔌 Connect
      </button>
      <div class="field-lbl" style="margin-bottom:4px;">BROKER LOG</div>
      <div class="log-box" style="max-height:160px;">
        <div v-if="!mqttDebugLog.length" class="log-empty">ยังไม่มี log</div>
        <div v-for="(l,i) in mqttDebugLog" :key="i" class="log-row"
          :class="l.includes('✅')?'ok':l.includes('✗')||l.includes('❌')?'err':l.includes('⏳')||l.includes('⏱')?'warn':'info'">
          {{ l }}
        </div>
      </div>
    </PanelCard>

    <!-- ③ Direct Raw Publish -->
    <PanelCard color="purple" title="Raw MQTT Publish" icon="📡">
      <div class="note-box" style="margin-bottom:10px;">
        ส่งตรงผ่าน MQTT — ต้องการ WEB control + MQTT connected
      </div>
      <div class="field-lbl">TOPIC</div>
      <select class="hmi-select" style="width:100%;margin-bottom:8px;" v-model="rawTopic">
        <option value="Demo/zenmac/cmd">Demo/zenmac/cmd</option>
        <option value="Demo/zenmac/mode">Demo/zenmac/mode</option>
        <option value="Demo/zenmac/authority">Demo/zenmac/authority</option>
        <option value="Demo/zenmac/blower/tb01/cmd">blower/tb01/cmd</option>
        <option value="Demo/zenmac/blower/tb02/cmd">blower/tb02/cmd</option>
      </select>
      <div class="field-lbl">PAYLOAD (JSON)</div>
      <textarea class="hmi-input" rows="5" style="width:100%;resize:vertical;font-size:11px;margin-bottom:8px;"
        v-model="rawPayload"></textarea>
      <button class="btn btn-save" style="width:100%;"
        :disabled="mqttState!=='connected' || !auth.iHaveControl"
        @click="directPublish">
        📡 PUBLISH
      </button>
      <div v-if="!auth.iHaveControl" class="note-box err-note" style="margin-top:6px;">
        🔒 กด REQUEST CONTROL ที่ Header ก่อน
      </div>
      <div v-else-if="mqttState!=='connected'" class="note-box warn-note" style="margin-top:6px;">
        📡 รอ MQTT connected
      </div>
    </PanelCard>

    <!-- ④ Lamp Quick Test -->
    <PanelCard color="green" title="Lamp Quick Test" icon="💡">
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button class="btn btn-save" style="flex:1;" @click="allTestLamps(true)">ALL ON</button>
        <button class="btn" style="flex:1;background:linear-gradient(135deg,#b71c1c,#ef9a9a);color:#fff;"
          @click="allTestLamps(false)">ALL OFF</button>
      </div>
      <div class="lamp-grid">
        <div v-for="l in lampTest" :key="l.n" class="lamp-btn" :class="{ on: l.on }"
             @click="toggleTestLamp(l.n)">
          <div class="bulb-sm" :class="{ on: l.on }"></div>
          <div class="lamp-lbl">L{{ l.n }}</div>
          <div class="lamp-state" :class="{ on: l.on }">{{ l.on ? 'ON' : 'OFF' }}</div>
        </div>
      </div>
    </PanelCard>

    <!-- ⑤ Command Presets -->
    <PanelCard color="teal" title="Command Presets" icon="🚀">
      <div class="field-lbl" style="margin-bottom:6px;">PRESET</div>
      <select class="hmi-select" style="width:100%;margin-bottom:8px;" v-model.number="selPreset">
        <option v-for="(p,i) in presets" :key="i" :value="i">{{ p.label }}</option>
      </select>
      <div class="field-lbl" style="margin-bottom:4px;">TOPIC</div>
      <div style="font-size:11px;font-family:var(--font-mono);color:#64ffda;padding:4px 8px;
                  background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:8px;word-break:break-all;">
        {{ presets[selPreset].topic }}
      </div>
      <div class="field-lbl" style="margin-bottom:4px;">PAYLOAD</div>
      <pre class="payload-pre" style="font-size:10px;max-height:80px;margin-bottom:8px;">{{ JSON.stringify(presets[selPreset].payload, null, 2) }}</pre>
      <button class="btn btn-save" style="width:100%;" @click="sendPreset">
        🚀 Send
      </button>
    </PanelCard>

    <!-- ⑥ Sensor Override -->
    <PanelCard color="orange" title="Sensor Override" icon="🌡️">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div class="tog-wrap" @click="ov.enabled = !ov.enabled">
          <div class="tog-track" :class="{ on: ov.enabled }"><div class="tog-thumb"></div></div>
          <span class="tog-label">{{ ov.enabled ? 'ON' : 'OFF' }}</span>
        </div>
        <span style="font-size:11px;color:#90a4ae;">Override live sensor values</span>
      </div>
      <div v-for="f in ovFields" :key="f.key" class="ov-row">
        <span class="ov-lbl">{{ f.label }}</span>
        <input type="range" :min="f.min" :max="f.max" step="0.1"
          :disabled="!ov.enabled"
          v-model.number="ov[f.key]"
          class="ov-slider" />
        <span class="ov-val">{{ ov[f.key].toFixed(1) }}{{ f.unit }}</span>
      </div>
      <button class="btn btn-save" style="width:100%;margin-top:10px;"
        :disabled="!ov.enabled" @click="applyOverride">
        ▶ Apply
      </button>
    </PanelCard>

    <!-- ⑦ Register Set -->
    <PanelCard color="purple" title="Register Set" icon="📝">
      <div class="reg-grid">
        <div v-for="k in regKeys" :key="k" class="reg-item">
          <div class="stat-lbl">{{ k }}</div>
          <input class="hmi-input" type="number" style="width:100%;"
            v-model.number="regs[k]" />
        </div>
      </div>
      <button class="btn btn-save" style="width:100%;margin-top:10px;" @click="sendRegisters">
        📤 Send to PLC
      </button>
    </PanelCard>

    <!-- ⑧ Blower UI Force -->
    <PanelCard color="orange" title="Blower UI Force" icon="🌀">
      <div v-for="b in blower.blowers" :key="b.id" style="margin-bottom:12px;">
        <div style="font-size:12px;font-weight:700;color:#90caf9;margin-bottom:6px;">
          {{ b.name }}
          <span class="result-badge" :class="b.state==='RUN'?'ok':b.state==='STBY'?'warn':''">
            {{ b.state }}
          </span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
          <button class="blo-btn run"  @click="forceBlower(b.id,'RUN')">RUN</button>
          <button class="blo-btn stby" @click="forceBlower(b.id,'STBY')">STBY</button>
          <button class="blo-btn stop" @click="forceBlower(b.id,'STOP')">STOP</button>
        </div>
      </div>
      <div class="note-box">UI-only, ไม่ส่ง MQTT — ใช้ Presets สำหรับส่งจริง</div>
    </PanelCard>

    <!-- ⑨ Event Log (full width) -->
    <PanelCard color="red" title="Event Log" icon="📋" style="grid-column:span 3;">
      <div class="row-between" style="margin-bottom:8px;">
        <span style="font-size:10px;color:#546e7a;">{{ log.length }} entries</span>
        <button class="btn btn-ghost" style="padding:3px 10px;font-size:10px;" @click="clearLog">
          🗑 Clear
        </button>
      </div>
      <div class="log-box" style="max-height:220px;">
        <div v-if="!log.length" class="log-empty">ยังไม่มี event</div>
        <div v-for="(e, i) in log" :key="i" class="log-row" :class="e.type">
          <span class="log-ts">{{ e.ts }}</span> {{ e.msg }}
        </div>
      </div>
    </PanelCard>

  </div>
</template>

<style scoped>
.page-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-content: start;
}
.row-between { display:flex; justify-content:space-between; align-items:center; }
.field-lbl { font-size:10px; font-weight:700; letter-spacing:1.5px; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; }

/* Status grid */
.stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.stat-item { background:var(--bg-item); border-radius:8px; padding:10px 12px; border:1px solid var(--border); }
.stat-lbl  { font-size:10px; font-weight:700; letter-spacing:1.5px; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; }
.big-val   { font-size:22px; font-weight:800; font-family:var(--font-mono); }
.big-val.sm { font-size:16px; }
.sub-txt   { font-size:10px; color:#546e7a; margin-top:2px; }
.ok   { color:#00e676; }
.warn { color:#ffa726; }
.err  { color:#ef5350; }

/* Result badge */
.result-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; letter-spacing:.5px; background:rgba(255,255,255,0.06); color:#546e7a; border:1px solid var(--border); }
.result-badge.ok       { background:rgba(0,230,118,0.12); color:#00e676; border-color:rgba(0,230,118,0.3); }
.result-badge.blocked  { background:rgba(239,83,80,0.12); color:#ef9a9a; border-color:rgba(239,83,80,0.3); }
.result-badge.no-mqtt  { background:rgba(255,167,38,0.12); color:#ffa726; border-color:rgba(255,167,38,0.3); }
.result-badge.RUN      { background:rgba(0,230,118,0.12); color:#00e676; border-color:rgba(0,230,118,0.3); }
.result-badge.STBY     { background:rgba(255,167,38,0.12); color:#ffa726; border-color:rgba(255,167,38,0.3); }

/* MQTT dot */
.dot-lg { width:12px; height:12px; border-radius:50%; background:#ef5350; flex-shrink:0; transition:background .4s; }
.dot-lg.connected  { background:#00e676; box-shadow:0 0 8px rgba(0,230,118,0.6); }
.dot-lg.connecting { background:#ffa726; animation:pulse 1s infinite; }

/* Notes */
.err-note  { background:rgba(239,83,80,0.08) !important; border-color:rgba(239,83,80,0.25) !important; color:#ef9a9a !important; }
.warn-note { background:rgba(255,167,38,0.08) !important; border-color:rgba(255,167,38,0.25) !important; color:#ffa726 !important; }

/* Lamp */
.lamp-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; }
.lamp-btn {
  background:var(--bg-item); border-radius:10px; padding:10px 4px;
  border:1.5px solid var(--border);
  display:flex; flex-direction:column; align-items:center; gap:5px;
  cursor:pointer; transition:all .2s;
}
.lamp-btn:hover    { border-color:rgba(0,229,255,0.3); }
.lamp-btn.on       { border-color:#f9a825; background:rgba(249,168,37,0.08); }
.bulb-sm           { width:30px; height:30px; border-radius:50%; background:radial-gradient(circle at 35% 30%,#37474f,#1a2530); border:2px solid rgba(255,255,255,0.1); transition:all .25s; }
.bulb-sm.on        { background:radial-gradient(circle at 35% 30%,#fff59d,#f9a825); border-color:#f9a825; box-shadow:0 0 14px rgba(249,168,37,0.7); }
.lamp-lbl          { font-size:10px; font-weight:700; color:#90a4ae; }
.lamp-state        { font-size:9px; font-weight:700; color:#546e7a; }
.lamp-state.on     { color:#f9a825; }

/* Override */
.ov-row    { display:flex; align-items:center; gap:10px; padding:5px 0; border-bottom:1px solid var(--border-sub); }
.ov-lbl    { font-size:10px; font-weight:700; color:var(--text-muted); width:66px; flex-shrink:0; }
.ov-slider { flex:1; height:4px; border-radius:2px; background:rgba(255,255,255,0.12); outline:none; cursor:pointer; accent-color:var(--accent); }
.ov-slider:disabled { opacity:.35; cursor:not-allowed; }
.ov-val    { font-size:12px; font-family:var(--font-mono); color:var(--accent); min-width:48px; text-align:right; }

/* Register */
.reg-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.reg-item { background:var(--bg-item); border-radius:8px; padding:8px 10px; border:1px solid var(--border); }

/* Blower */
.blo-btn { padding:8px 0; border-radius:7px; border:1px solid var(--border); background:rgba(255,255,255,0.04); color:#cfd8dc; font-size:11px; font-weight:700; cursor:pointer; transition:all .15s; }
.blo-btn:hover { filter:brightness(1.2); }
.blo-btn.run  { background:rgba(0,230,118,0.15); color:#00e676; border-color:#00e676; }
.blo-btn.stop { background:rgba(239,83,80,0.15); color:#ef9a9a; border-color:#ef5350; }
.blo-btn.stby { background:rgba(255,167,38,0.12); color:#ffa726; border-color:#ffa726; }

/* Log box */
.log-box   { background:rgba(0,0,0,0.4); border:1px solid rgba(0,229,255,0.1); border-radius:8px; padding:8px 10px; overflow-y:auto; font-family:var(--font-mono); font-size:11px; }
.log-empty { text-align:center; padding:16px; color:#37474f; }
.log-ts    { color:#37474f; margin-right:6px; }
.log-row   { padding:2px 0; border-bottom:1px solid rgba(255,255,255,0.03); color:#78909c; word-break:break-all; }
.log-row.ok      { color:#a5d6a7; }
.log-row.err     { color:#ef9a9a; }
.log-row.warn    { color:#ffa726; }
.log-row.payload { color:#80cbc4; padding-left:12px; }
</style>
