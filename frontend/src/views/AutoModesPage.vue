<script setup lang="ts">
import { reactive, ref, computed, watch, onUnmounted } from 'vue'
import { useAuthorityStore } from '@/stores/authority'
import { useSensorsStore } from '@/stores/sensors'
import { mqttConnected } from '@/composables/useMqtt'
import { useProhibit } from '@/composables/useProhibit'
import PanelCard from '@/components/shared/PanelCard.vue'

const auth    = useAuthorityStore()
const sensors = useSensorsStore()
const { guardedAction } = useProhibit()

const lastAutoPayload = ref('// เลือกโหมดแล้วกด Apply เพื่อดู payload')

// ── 5-Band Airflow-ORP ────────────────────────────────────────────────────
//  ORP INPUT   Tag: Temp1  → sensors.temp1  (PLC raw ÷10 = mV)
//  CMM ACTUAL  Tag: D300   → sensors.d300   (blower CMM feedback, no scaling)
//  CMM OUTPUT  Tag: D300   → sendCommand { D300: cmm } via Demo/zenmac/cmd
//  BAND LAMP   Tag: Lamp1…5 → sendCommand { Lamp1..5: 0/1 }  (HH=Lamp1, H=Lamp2, ZERO=Lamp3, L=Lamp4, LL=Lamp5)

// Band thresholds ใช้หน่วย °C (Temp1) ตาม lookup table:
//  Temp1: 40→72CMM, 50→65CMM, 60→60CMM, 70→50CMM, 80→45CMM, 90→35CMM
const bands = reactive([
  { id: 'HH',   orpLow: 80,  orpHigh: 999, cmm: 35 },  // Temp1 ≥ 80°C → CMM min
  { id: 'H',    orpLow: 65,  orpHigh: 80,  cmm: 45 },
  { id: 'ZERO', orpLow: 50,  orpHigh: 65,  cmm: 60 },
  { id: 'L',    orpLow: 40,  orpHigh: 50,  cmm: 65 },
  { id: 'LL',   orpLow: -99, orpHigh: 40,  cmm: 72 },  // Temp1 < 40°C → CMM max
])

const orpEnabled = ref(false)

// Tag: Temp1 (sensors store does raw÷10) → used as ORP proxy (°C)
const orp1      = computed(() => sensors.temp1)
// Tag: D300 (no scaling) → TB-01 blower CMM actual
const cmmActual = computed(() => sensors.d300)

const activeBand = computed(() =>
  bands.find(b => orp1.value >= b.orpLow && orp1.value < b.orpHigh) ?? null
)

function isActive(b: (typeof bands)[number]) { return activeBand.value?.id === b.id }

function bandRangeLabel(b: (typeof bands)[number]) {
  if (b.id === 'HH') return `(>${b.orpLow})`
  if (b.id === 'LL') return `(<${b.orpHigh})`
  return `(${b.orpLow} to ${b.orpHigh})`
}

// Control loop — every 2s while enabled
let _ctrl: ReturnType<typeof setInterval> | null = null
watch(orpEnabled, en => {
  if (en)       { _ctrl = setInterval(runStep, 2000) }
  else if (_ctrl) { clearInterval(_ctrl); _ctrl = null }
})
onUnmounted(() => { if (_ctrl) clearInterval(_ctrl) })

function runStep() {
  if (!orpEnabled.value || !auth.iHaveControl || !mqttConnected.value) return
  const band = activeBand.value
  if (!band) return
  auth.sendCommand({ D300: band.cmm })
  const lamps: Record<string, number> = {}
  bands.forEach((b, i) => { lamps['Lamp' + (i + 1)] = b.id === band.id ? 1 : 0 })
  auth.sendCommand(lamps)
  lastAutoPayload.value = JSON.stringify(
    { d: { D300: band.cmm, ...lamps }, band: band.id, orp_mv: orp1.value, src: 'WEB', ts: Date.now() },
    null, 2
  )
}

function saveOrpBands() {
  guardedAction('orp-save', 'auto-modes', () => {
    const payload = {
      mode: 'orp_bands', blower_id: 1,
      bands: bands.map(b => ({ id: b.id, orpLow: b.orpLow, orpHigh: b.orpHigh, cmm: b.cmm }))
    }
    auth.sendCommand(payload, 'Demo/zenmac/mode')
    lastAutoPayload.value = JSON.stringify({ d: payload, src: 'WEB', ts: Date.now() }, null, 2)
  })
}

// ── Timer ─────────────────────────────────────────────────────────────────
const timer = reactive({ enabled: false, start: '06:00', stop: '18:00', recur: 'daily' })
function applyTimer() {
  guardedAction('timer', 'auto-modes', () => {
    const payload = { mode: 'timer', enable: timer.enabled ? 1 : 0, start: timer.start, stop: timer.stop, recurring: timer.recur }
    auth.sendCommand(payload, 'Demo/zenmac/mode')
    lastAutoPayload.value = JSON.stringify({ d: payload, src: 'WEB', ts: Date.now() }, null, 2)
  })
}

// ── Energy / Peak ─────────────────────────────────────────────────────────
const energy = reactive({ enabled: false, pkStart: '09:00', pkEnd: '22:00', spdOn: 50, spdOff: 85, kwhLimit: 500 })
function applyEnergy() {
  guardedAction('energy', 'auto-modes', () => {
    const payload = { mode: 'peak', enable: energy.enabled ? 1 : 0, onpeak_start: energy.pkStart, onpeak_end: energy.pkEnd, speed_onpeak: energy.spdOn, speed_offpeak: energy.spdOff, kwh_limit_daily: energy.kwhLimit }
    auth.sendCommand(payload, 'Demo/zenmac/mode')
    lastAutoPayload.value = JSON.stringify({ d: payload, src: 'WEB', ts: Date.now() }, null, 2)
  })
}
</script>

<template>
  <div class="page-grid">

    <!-- ════════════════════════════════════════════════════════════════════
         AIRFLOW-ORP MODE  (full width, 3 cols)
         ════════════════════════════════════════════════════════════════════ -->
    <PanelCard color="orange" style="grid-column:span 3;">

      <!-- ── Header ──────────────────────────────────────────────────────── -->
      <div class="ap-header">
        <span class="ap-title">AIRFLOW-ORP MODE</span>
        <span class="ap-badge">BL-1</span>
        <span class="ap-sub">TB-01 · 5-Band ORP → Air Flow Control</span>
        <div class="ap-onoff" :class="{ active: orpEnabled }" @click="orpEnabled = !orpEnabled">
          {{ orpEnabled ? '● ON' : '○ OFF' }}
        </div>
      </div>

      <!-- ── ORP Reading ─────────────────────────────────────────────────── -->
      <div class="ap-orp-row" :class="'orpb-' + (activeBand?.id ?? 'none')">
        <span class="ap-orp-icon">〜</span>
        <span class="ap-orp-label">
          Temp1 → ORP Proxy
          <span class="tag-badge">Tag: Temp1</span>
        </span>
        <span class="ap-orp-val" :class="'orpv-' + (activeBand?.id ?? 'none')">
          [ {{ orp1 }} ] °C
        </span>
        <span class="ap-band-chip" :class="'bc-' + (activeBand?.id ?? 'none')">
          {{ activeBand?.id ?? '—' }}
        </span>
      </div>

      <!-- ── Band Table ──────────────────────────────────────────────────── -->
      <div class="ap-table-wrap">
        <table class="ap-table">
          <thead>
            <tr>
              <th>ZONE</th>
              <th>Temp1 LOW (°C)</th>
              <th>Temp1 HIGH (°C)</th>
              <th>
                TURBO FLOW SET (CMM)
                <div class="th-tag">→ out: D300</div>
              </th>
              <th>
                REAL-TIME (CMM)
                <div class="th-tag">← in: D300&nbsp;<span class="tag-badge sm">Tag: D300</span></div>
              </th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(band, idx) in bands" :key="band.id"
                :class="['ap-row', { 'ap-row-active': isActive(band) }]">
              <td>
                <span class="zone-chip" :class="'zc-' + band.id">{{ band.id }}</span>
              </td>
              <td>
                <input class="band-in" type="number" v-model.number="band.orpLow" />
              </td>
              <td>
                <input class="band-in" type="number" v-model.number="band.orpHigh" />
              </td>
              <td>
                <input class="band-in cmm-in" type="number" step="0.1" v-model.number="band.cmm" />
              </td>
              <td>
                <span class="cmm-rt" :class="{ 'cmm-live': isActive(band) }">
                  <template v-if="isActive(band)">
                    <span class="dot-g">●</span> {{ cmmActual }}
                  </template>
                  <template v-else>—</template>
                </span>
              </td>
              <td>
                <span class="st-chip" :class="isActive(band) ? 'st-active' : 'st-idle'">
                  {{ isActive(band) ? '● ACTIVE' : 'IDLE' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Band Bar (LL → HH left to right) ─────────────────────────────── -->
      <div class="ap-band-bar">
        <div v-for="band in [...bands].reverse()" :key="band.id"
             class="bbar-seg" :class="['bbar-' + band.id, { 'bbar-on': isActive(band) }]">
          <span class="bbar-id">{{ band.id }}</span>
          <span class="bbar-rng">{{ bandRangeLabel(band) }}</span>
        </div>
      </div>

      <!-- ── Footer ─────────────────────────────────────────────────────── -->
      <div class="ap-footer">
        <div class="tog-wrap" @click="orpEnabled = !orpEnabled">
          <div class="tog-track" :class="{ on: orpEnabled }">
            <div class="tog-thumb"></div>
          </div>
          <span class="ap-tog-lbl" :class="{ active: orpEnabled }">
            AIRFLOW-ORP MODE {{ orpEnabled ? 'ACTIVE' : 'INACTIVE' }}
          </span>
        </div>
        <button class="btn btn-save" @click="saveOrpBands">💾 SAVE BL-1</button>
      </div>
    </PanelCard>

    <!-- Timer -->
    <PanelCard color="teal" title="Timer Schedule (Daily)" icon="⏱️">
      <template #title-extra>
        <span style="margin-left:auto;font-size:9px;color:#546e7a;">PA-03</span>
      </template>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div class="tog-wrap" @click="timer.enabled = !timer.enabled">
          <div class="tog-track" :class="{ on: timer.enabled }"><div class="tog-thumb"></div></div>
          <span class="tog-label">{{ timer.enabled ? 'ON' : 'OFF' }}</span>
        </div>
        <span style="font-size:11px;color:#90a4ae;">Enable Timer</span>
      </div>
      <div class="mode-field"><label>Start Time</label><input class="hmi-input" type="time" v-model="timer.start" /></div>
      <div class="mode-field"><label>Stop Time</label><input class="hmi-input" type="time" v-model="timer.stop" /></div>
      <div class="mode-field">
        <label>Recurring</label>
        <select class="hmi-select" v-model="timer.recur">
          <option value="daily">Daily</option>
          <option value="weekday">Weekday</option>
        </select>
      </div>
      <button class="btn btn-save" style="width:100%;margin-top:12px;" @click="applyTimer">💾 Apply Timer</button>
      <div class="note-box">PLC RTC compare · E-Stop override เสมอ · RTC drift &gt;5min → WARN</div>
    </PanelCard>

    <!-- Energy / Peak -->
    <PanelCard color="red" title="Energy / Peak Schedule" icon="⚡">
      <template #title-extra>
        <span style="margin-left:auto;font-size:9px;color:#546e7a;">EN-02</span>
      </template>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div class="tog-wrap" @click="energy.enabled = !energy.enabled">
          <div class="tog-track" :class="{ on: energy.enabled }"><div class="tog-thumb"></div></div>
          <span class="tog-label">{{ energy.enabled ? 'ON' : 'OFF' }}</span>
        </div>
        <span style="font-size:11px;color:#90a4ae;">Enable Peak Control</span>
      </div>
      <div class="mode-field"><label>On-Peak Start</label><input class="hmi-input" type="time" v-model="energy.pkStart" /></div>
      <div class="mode-field"><label>On-Peak End</label><input class="hmi-input" type="time" v-model="energy.pkEnd" /></div>
      <div class="mode-field"><label>Speed On-Peak (%)</label><input class="hmi-input" type="number" v-model.number="energy.spdOn" /></div>
      <div class="mode-field"><label>Speed Off-Peak (%)</label><input class="hmi-input" type="number" v-model.number="energy.spdOff" /></div>
      <div class="mode-field"><label>kWh Limit / day</label><input class="hmi-input" type="number" v-model.number="energy.kwhLimit" /></div>
      <button class="btn btn-save" style="width:100%;margin-top:12px;" @click="applyEnergy">💾 Apply Energy</button>
      <div class="note-box">Priority: E-Stop &gt; Manual &gt; Auto-ORP &gt; Peak · kWh ≥80% → WARN</div>
    </PanelCard>

    <!-- Empty slot -->
    <div></div>

    <!-- Payload Preview -->
    <PanelCard color="purple" title="Auto-Mode MQTT Payload Preview" icon="📤" style="grid-column:span 3;">
      <pre class="payload-pre">{{ lastAutoPayload }}</pre>
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

/* ── Airflow-ORP Panel ─────────────────────────────────────────────────── */

/* Header */
.ap-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.ap-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #ffb300;
}
.ap-badge {
  background: rgba(255, 179, 0, 0.15);
  border: 1px solid #ffb300;
  color: #ffb300;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: 1px;
}
.ap-sub {
  font-size: 11px;
  color: #78909c;
  flex: 1;
}
.ap-onoff {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid #37474f;
  color: #546e7a;
  cursor: pointer;
  transition: all .2s;
  user-select: none;
}
.ap-onoff.active {
  border-color: #00e676;
  color: #00e676;
  background: rgba(0, 230, 118, 0.08);
}

/* ORP Reading row */
.ap-orp-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  border-left: 3px solid #37474f;
  background: rgba(0,0,0,.25);
  margin-bottom: 14px;
  transition: border-color .3s;
}
.orpb-LL { border-color: #9c27b0; }
.orpb-L  { border-color: #66bb6a; }
.orpb-ZERO { border-color: #26a69a; }
.orpb-H  { border-color: #ef6c00; }
.orpb-HH { border-color: #e53935; }

.ap-orp-icon { font-size: 14px; color: #78909c; }
.ap-orp-label {
  font-size: 11px;
  font-weight: 700;
  color: #90a4ae;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ap-orp-val {
  font-size: 18px;
  font-weight: 800;
  font-family: var(--font-mono, monospace);
  color: #e0f0ff;
  flex: 1;
}
.orpv-LL { color: #ce93d8; }
.orpv-L  { color: #a5d6a7; }
.orpv-ZERO { color: #80cbc4; }
.orpv-H  { color: #ffcc80; }
.orpv-HH { color: #ef9a9a; }

/* Band active chip (top-right of ORP row) */
.ap-band-chip {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1.5px solid #37474f;
  color: #546e7a;
}
.bc-HH { background: rgba(229,57,53,.18);  border-color: #e53935; color: #ef9a9a; }
.bc-H  { background: rgba(239,108,0,.15);  border-color: #ef6c00; color: #ffcc80; }
.bc-ZERO { background: rgba(38,166,154,.15); border-color: #26a69a; color: #80cbc4; }
.bc-L  { background: rgba(102,187,106,.15); border-color: #66bb6a; color: #a5d6a7; }
.bc-LL { background: rgba(156,39,176,.18);  border-color: #9c27b0; color: #ce93d8; }

/* Tag annotation badges */
.tag-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .5px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(0,229,255,.12);
  border: 1px solid rgba(0,229,255,.3);
  color: #00e5ff;
  font-family: var(--font-mono, monospace);
}
.tag-badge.sm { font-size: 8px; padding: 1px 4px; }

/* Band Table */
.ap-table-wrap { overflow-x: auto; margin-bottom: 12px; }
.ap-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.ap-table thead th {
  padding: 8px 12px;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #546e7a;
  border-bottom: 1px solid rgba(255,255,255,.07);
  white-space: nowrap;
}
.th-tag {
  font-size: 9px;
  font-weight: 600;
  color: #00e5ff;
  opacity: .7;
  margin-top: 2px;
  font-family: var(--font-mono, monospace);
}
.ap-table tbody td {
  padding: 8px 12px;
  text-align: center;
  border-bottom: 1px solid rgba(255,255,255,.04);
  vertical-align: middle;
}
.ap-row-active td { background: rgba(255,255,255,.04); }
.ap-row-active { box-shadow: inset 3px 0 0 rgba(0,230,118,.5); }

/* Zone chips */
.zone-chip {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  padding: 4px 12px;
  border-radius: 6px;
  min-width: 52px;
  text-align: center;
}
.zc-HH   { background: rgba(229,57,53,.25);  color: #ef5350; border: 1px solid #c62828; }
.zc-H    { background: rgba(239,108,0,.22);  color: #ff8a65; border: 1px solid #bf360c; }
.zc-ZERO { background: rgba(38,166,154,.2);  color: #4db6ac; border: 1px solid #00695c; }
.zc-L    { background: rgba(102,187,106,.2); color: #81c784; border: 1px solid #2e7d32; }
.zc-LL   { background: rgba(156,39,176,.25); color: #ba68c8; border: 1px solid #4a148c; }

/* Inputs */
.band-in {
  width: 80px;
  padding: 5px 8px;
  background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 6px;
  color: #e0f0ff;
  font-size: 13px;
  font-family: var(--font-mono, monospace);
  text-align: center;
  outline: none;
  transition: border-color .2s;
}
.band-in:focus { border-color: rgba(0,229,255,.5); }
.cmm-in { color: #00e5ff; font-weight: 700; }

/* Real-time CMM */
.cmm-rt {
  font-size: 13px;
  font-family: var(--font-mono, monospace);
  color: #37474f;
}
.cmm-live {
  color: #00e676;
  font-weight: 700;
}
.dot-g { color: #00e676; margin-right: 2px; }

/* Status chips */
.st-chip {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .8px;
  padding: 3px 10px;
  border-radius: 20px;
}
.st-idle   { background: rgba(255,255,255,.05); color: #546e7a; border: 1px solid #37474f; }
.st-active { background: rgba(0,230,118,.15);   color: #00e676; border: 1px solid rgba(0,230,118,.4); }

/* Band Bar (LL → HH) */
.ap-band-bar {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 14px;
  min-height: 52px;
}
.bbar-seg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 4px;
  opacity: .55;
  transition: opacity .3s;
}
.bbar-on { opacity: 1; }
.bbar-LL   { background: linear-gradient(135deg, #4a148c, #7b1fa2); }
.bbar-L    { background: linear-gradient(135deg, #1b5e20, #388e3c); }
.bbar-ZERO { background: linear-gradient(135deg, #004d40, #00695c); }
.bbar-H    { background: linear-gradient(135deg, #bf360c, #e64a19); }
.bbar-HH   { background: linear-gradient(135deg, #b71c1c, #e53935); }
.bbar-id  { font-size: 13px; font-weight: 800; color: #fff; letter-spacing: 1px; }
.bbar-rng { font-size: 9px; color: rgba(255,255,255,.65); font-family: var(--font-mono, monospace); }

/* Footer */
.ap-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.07);
}
.ap-tog-lbl {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #546e7a;
  transition: color .2s;
}
.ap-tog-lbl.active { color: #00e676; }
</style>
