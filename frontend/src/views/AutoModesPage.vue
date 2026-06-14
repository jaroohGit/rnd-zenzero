<script setup lang="ts">
import { reactive, ref, computed, watch, onUnmounted } from 'vue'
import { useAuthorityStore } from '@/stores/authority'
import { useSensorsStore } from '@/stores/sensors'
import { mqttConnected } from '@/composables/useMqtt'
import { useProhibit } from '@/composables/useProhibit'

const auth    = useAuthorityStore()
const sensors = useSensorsStore()
const { guardedAction } = useProhibit()

const lastAutoPayload = ref('// เลือกโหมดแล้วกด Apply เพื่อดู payload')

// ── 5-Band Airflow-ORP ────────────────────────────────────────────────────
const bands = reactive([
  { id: 'HH',   orpLow: 80,  orpHigh: 999, cmm: 35 },
  { id: 'H',    orpLow: 65,  orpHigh: 80,  cmm: 45 },
  { id: 'ZERO', orpLow: 50,  orpHigh: 65,  cmm: 60 },
  { id: 'L',    orpLow: 40,  orpHigh: 50,  cmm: 65 },
  { id: 'LL',   orpLow: -99, orpHigh: 40,  cmm: 72 },
])

const orpEnabled = ref(false)

const orp1      = computed(() => sensors.temp1)
const cmmActual = computed(() => sensors.d300)

const activeBand = computed(() =>
  bands.find(b => orp1.value >= b.orpLow && orp1.value < b.orpHigh) ?? null
)

function isActive(b: (typeof bands)[number]) { return activeBand.value?.id === b.id }

function bandRangeLabel(b: (typeof bands)[number]) {
  if (b.id === 'HH') return `>${b.orpLow}`
  if (b.id === 'LL') return `<${b.orpHigh}`
  return `${b.orpLow}–${b.orpHigh}`
}

let _ctrl: ReturnType<typeof setInterval> | null = null
watch(orpEnabled, en => {
  if (en)        { _ctrl = setInterval(runStep, 2000) }
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

// ── Timer ──────────────────────────────────────────────────────────────────
const timer = reactive({ enabled: false, start: '06:00', stop: '18:00', recur: 'daily' })
function applyTimer() {
  guardedAction('timer', 'auto-modes', () => {
    const payload = { mode: 'timer', enable: timer.enabled ? 1 : 0, start: timer.start, stop: timer.stop, recurring: timer.recur }
    auth.sendCommand(payload, 'Demo/zenmac/mode')
    lastAutoPayload.value = JSON.stringify({ d: payload, src: 'WEB', ts: Date.now() }, null, 2)
  })
}

// ── Energy / Peak ──────────────────────────────────────────────────────────
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
  <div class="auto-page">

    <!-- ══════════════════════════════════════════════════════════════
         GROUP 01 — AIRFLOW-ORP MODE
         ══════════════════════════════════════════════════════════════ -->
    <section class="am-section">

      <!-- Section header -->
      <div class="am-sec-header">
        <div class="am-header-left">
          <span class="am-group-lbl">GROUP 01</span>
          <div class="am-title-row">
            <span class="am-sec-title">AIRFLOW-ORP MODE</span>
            <span class="am-badge">BL-1</span>
            <span class="am-sec-sub">TB-01 · 5-Band ORP → Air Flow Control</span>
          </div>
        </div>
        <button class="am-enable-btn" :class="{ active: orpEnabled }" @click="orpEnabled = !orpEnabled">
          <span class="am-enable-dot"></span>
          {{ orpEnabled ? 'ACTIVE' : 'INACTIVE' }}
        </button>
      </div>

      <!-- ORP reading bar -->
      <div class="orp-row" :class="'orpb-' + (activeBand?.id ?? 'none')">
        <i class="bx bx-pulse orp-icon"></i>
        <div class="orp-info">
          <span class="orp-label">Temp1 → ORP Proxy</span>
          <span class="tag-pill">Tag: Temp1</span>
        </div>
        <span class="orp-val" :class="'orpv-' + (activeBand?.id ?? 'none')">
          {{ orp1 }}<span class="orp-unit">°C</span>
        </span>
        <span class="band-chip" :class="'bc-' + (activeBand?.id ?? 'none')">
          {{ activeBand?.id ?? '—' }}
        </span>
      </div>

      <!-- Band table -->
      <div class="am-table-wrap">
        <table class="am-table">
          <thead>
            <tr>
              <th>ZONE</th>
              <th>LOW (°C)</th>
              <th>HIGH (°C)</th>
              <th>
                FLOW SET (CMM)
                <div class="th-sub">→ out: D300</div>
              </th>
              <th>
                REALTIME (CMM)
                <div class="th-sub">← in: <span class="tag-pill sm">D300</span></div>
              </th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="band in bands" :key="band.id" :class="{ 'row-active': isActive(band) }">
              <td><span class="zone-chip" :class="'zc-' + band.id">{{ band.id }}</span></td>
              <td><input class="band-in" type="number" v-model.number="band.orpLow" /></td>
              <td><input class="band-in" type="number" v-model.number="band.orpHigh" /></td>
              <td><input class="band-in cmm-in" type="number" step="0.1" v-model.number="band.cmm" /></td>
              <td>
                <span class="cmm-rt" :class="{ 'cmm-live': isActive(band) }">
                  <template v-if="isActive(band)"><span class="dot-live">●</span> {{ cmmActual }}</template>
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

      <!-- Band visual bar (LL → HH left to right) -->
      <div class="band-bar">
        <div v-for="band in [...bands].reverse()" :key="band.id"
             class="bbar-seg" :class="['bbar-' + band.id, { 'bbar-on': isActive(band) }]">
          <span class="bbar-id">{{ band.id }}</span>
          <span class="bbar-rng">{{ bandRangeLabel(band) }}</span>
        </div>
      </div>

      <!-- Footer controls -->
      <div class="am-sec-footer">
        <div class="am-tog-wrap" @click="orpEnabled = !orpEnabled">
          <div class="am-tog-track" :class="{ on: orpEnabled }">
            <div class="am-tog-thumb"></div>
          </div>
          <span class="am-tog-lbl" :class="{ active: orpEnabled }">
            AIRFLOW-ORP {{ orpEnabled ? 'ENABLED' : 'DISABLED' }}
          </span>
        </div>
        <button class="am-action-btn" @click="saveOrpBands">
          <i class="bx bx-save"></i> SAVE BL-1
        </button>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════
         GROUP 02 — Timer · Energy · Payload
         ══════════════════════════════════════════════════════════════ -->
    <div class="am-row-3">

      <!-- Timer Schedule -->
      <section class="am-section">
        <div class="am-group-lbl">GROUP 02</div>
        <div class="am-title-row" style="margin-bottom:16px;">
          <i class="bx bx-time-five am-sec-icon"></i>
          <span class="am-sec-title">Timer Schedule</span>
          <span class="am-badge">PA-03</span>
        </div>

        <div class="am-tog-wrap" style="margin-bottom:14px;" @click="timer.enabled = !timer.enabled">
          <div class="am-tog-track" :class="{ on: timer.enabled }">
            <div class="am-tog-thumb"></div>
          </div>
          <span class="am-tog-lbl" :class="{ active: timer.enabled }">
            {{ timer.enabled ? 'Timer ON' : 'Timer OFF' }}
          </span>
        </div>

        <div class="am-field"><label>Start Time</label><input class="am-input" type="time" v-model="timer.start" /></div>
        <div class="am-field"><label>Stop Time</label><input class="am-input" type="time" v-model="timer.stop" /></div>
        <div class="am-field">
          <label>Recurring</label>
          <select class="am-input" v-model="timer.recur">
            <option value="daily">Daily</option>
            <option value="weekday">Weekday</option>
          </select>
        </div>

        <button class="am-apply-btn" @click="applyTimer">
          <i class="bx bx-check-circle"></i> Apply Timer
        </button>
        <div class="am-note">PLC RTC compare · E-Stop override เสมอ · RTC drift &gt;5min → WARN</div>
      </section>

      <!-- Energy / Peak -->
      <section class="am-section">
        <div class="am-group-lbl" style="visibility:hidden;">GROUP 02</div>
        <div class="am-title-row" style="margin-bottom:16px;">
          <i class="bx bx-bolt-circle am-sec-icon" style="color:#f59e0b;"></i>
          <span class="am-sec-title">Energy / Peak</span>
          <span class="am-badge" style="border-color:rgba(245,158,11,0.3);color:#f59e0b;background:rgba(245,158,11,0.08);">EN-02</span>
        </div>

        <div class="am-tog-wrap" style="margin-bottom:14px;" @click="energy.enabled = !energy.enabled">
          <div class="am-tog-track" :class="{ on: energy.enabled }">
            <div class="am-tog-thumb"></div>
          </div>
          <span class="am-tog-lbl" :class="{ active: energy.enabled }">
            {{ energy.enabled ? 'Peak Control ON' : 'Peak Control OFF' }}
          </span>
        </div>

        <div class="am-field"><label>On-Peak Start</label><input class="am-input" type="time" v-model="energy.pkStart" /></div>
        <div class="am-field"><label>On-Peak End</label><input class="am-input" type="time" v-model="energy.pkEnd" /></div>
        <div class="am-field"><label>Speed On-Peak (%)</label><input class="am-input" type="number" v-model.number="energy.spdOn" /></div>
        <div class="am-field"><label>Speed Off-Peak (%)</label><input class="am-input" type="number" v-model.number="energy.spdOff" /></div>
        <div class="am-field"><label>kWh Limit / day</label><input class="am-input" type="number" v-model.number="energy.kwhLimit" /></div>

        <button class="am-apply-btn" @click="applyEnergy">
          <i class="bx bx-check-circle"></i> Apply Energy
        </button>
        <div class="am-note">Priority: E-Stop &gt; Manual &gt; Auto-ORP &gt; Peak · kWh ≥80% → WARN</div>
      </section>

      <!-- MQTT Payload Preview -->
      <section class="am-section payload-sec">
        <div class="am-group-lbl">MQTT</div>
        <div class="am-title-row" style="margin-bottom:14px;">
          <i class="bx bx-broadcast am-sec-icon" style="color:#22c55e;"></i>
          <span class="am-sec-title">Payload Preview</span>
        </div>
        <pre class="am-payload">{{ lastAutoPayload }}</pre>
      </section>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ─── Page wrapper ─────────────────────────────────────────────────────── */
.auto-page {
  background: #0a0a0a;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}

/* ─── Section card ─────────────────────────────────────────────────────── */
.am-section {
  background: #111;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 28px 30px;
}

/* ─── Group label / eyebrow ────────────────────────────────────────────── */
.am-group-lbl {
  font-size: 13px; font-weight: 700; letter-spacing: 2.5px;
  color: #1a2a38; text-transform: uppercase;
  margin-bottom: 8px; display: block;
}

/* ─── Section header ───────────────────────────────────────────────────── */
.am-sec-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 14px;
  margin-bottom: 20px;
}
.am-header-left { display: flex; flex-direction: column; gap: 6px; }

.am-title-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.am-sec-title {
  font-size: 20px; font-weight: 800; letter-spacing: 1.5px;
  color: #d0dde8; text-transform: uppercase;
}
.am-sec-sub { font-size: 15px; color: #2d4050; flex: 1; }
.am-sec-icon { font-size: 22px; color: #d4a040; }

.am-badge {
  font-size: 13px; font-weight: 800; letter-spacing: 1px;
  padding: 4px 12px; border-radius: 12px;
  background: rgba(212,160,64,0.08);
  border: 1px solid rgba(212,160,64,0.25);
  color: #d4a040;
}

/* Enable toggle button */
.am-enable-btn {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 22px; border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.08);
  background: transparent;
  color: #1e3040; font-size: 14px; font-weight: 700;
  letter-spacing: 1px; cursor: pointer;
  transition: all 0.2s; font-family: inherit;
  flex-shrink: 0;
}
.am-enable-btn.active {
  border-color: rgba(34,197,94,0.4);
  color: #22c55e;
  background: rgba(34,197,94,0.07);
}
.am-enable-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: currentColor; flex-shrink: 0;
}

/* ─── ORP reading row ──────────────────────────────────────────────────── */
.orp-row {
  display: flex; align-items: center; gap: 18px;
  padding: 18px 22px; border-radius: 12px;
  background: rgba(0,0,0,0.3);
  border-left: 4px solid #1e3040;
  margin-bottom: 20px;
  transition: border-color 0.3s;
}
.orpb-LL   { border-left-color: #9c27b0; }
.orpb-L    { border-left-color: #66bb6a; }
.orpb-ZERO { border-left-color: #26a69a; }
.orpb-H    { border-left-color: #ef6c00; }
.orpb-HH   { border-left-color: #e53935; }

.orp-icon { font-size: 28px; color: #1e3040; flex-shrink: 0; }
.orp-info { display: flex; flex-direction: column; gap: 5px; }
.orp-label {
  font-size: 15px; font-weight: 700; letter-spacing: 0.5px;
  color: #2d4050;
}
.orp-val {
  font-size: 40px; font-weight: 800;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  color: #d0dde8; flex: 1;
  transition: color 0.3s; line-height: 1;
}
.orp-unit { font-size: 20px; font-weight: 400; color: #2d4050; margin-left: 4px; }

.orpv-LL   { color: #ce93d8; }
.orpv-L    { color: #a5d6a7; }
.orpv-ZERO { color: #80cbc4; }
.orpv-H    { color: #ffcc80; }
.orpv-HH   { color: #ef9a9a; }

/* ─── Tag pill ─────────────────────────────────────────────────────────── */
.tag-pill {
  display: inline-block; font-size: 12px; font-weight: 700;
  letter-spacing: 0.5px; padding: 3px 9px; border-radius: 5px;
  background: rgba(34,197,94,0.07);
  border: 1px solid rgba(34,197,94,0.2);
  color: #22c55e;
  font-family: 'JetBrains Mono', monospace;
}
.tag-pill.sm { font-size: 11px; padding: 2px 6px; }

/* ─── Band chip (current band indicator) ──────────────────────────────── */
.band-chip {
  font-size: 16px; font-weight: 800; letter-spacing: 1px;
  padding: 7px 20px; border-radius: 24px;
  border: 1.5px solid rgba(255,255,255,0.08);
  color: #1e3040; transition: all 0.3s;
}
.bc-HH   { background: rgba(229,57,53,.15);  border-color: #e53935; color: #ef9a9a; }
.bc-H    { background: rgba(239,108,0,.12);  border-color: #ef6c00; color: #ffcc80; }
.bc-ZERO { background: rgba(38,166,154,.12); border-color: #26a69a; color: #80cbc4; }
.bc-L    { background: rgba(102,187,106,.12);border-color: #66bb6a; color: #a5d6a7; }
.bc-LL   { background: rgba(156,39,176,.15); border-color: #9c27b0; color: #ce93d8; }

/* ─── Band table ───────────────────────────────────────────────────────── */
.am-table-wrap { overflow-x: auto; margin-bottom: 16px; }
.am-table {
  width: 100%; border-collapse: collapse;
  min-width: 680px;
}
.am-table thead th {
  padding: 12px 18px; text-align: center;
  font-size: 13px; font-weight: 700; letter-spacing: 1.5px;
  color: #1e3040; text-transform: uppercase;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  white-space: nowrap;
}
.th-sub {
  font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
  color: #22c55e; opacity: 0.65;
  margin-top: 4px; font-family: monospace;
}
.am-table tbody td {
  padding: 13px 18px; text-align: center;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  vertical-align: middle;
}
.am-table .row-active td { background: rgba(34,197,94,0.04); }
.am-table .row-active    { box-shadow: inset 4px 0 0 rgba(34,197,94,0.35); }

/* Zone chips */
.zone-chip {
  display: inline-block; font-size: 15px; font-weight: 800;
  letter-spacing: 1px; padding: 6px 16px; border-radius: 8px;
  min-width: 72px; text-align: center;
}
.zc-HH   { background: rgba(229,57,53,.22);  color: #ef5350; border: 1px solid #c62828; }
.zc-H    { background: rgba(239,108,0,.18);  color: #ff8a65; border: 1px solid #bf360c; }
.zc-ZERO { background: rgba(38,166,154,.16); color: #4db6ac; border: 1px solid #00695c; }
.zc-L    { background: rgba(102,187,106,.16);color: #81c784; border: 1px solid #2e7d32; }
.zc-LL   { background: rgba(156,39,176,.22); color: #ba68c8; border: 1px solid #4a148c; }

/* Band inputs */
.band-in {
  width: 110px; padding: 8px 10px;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  color: #b0c0cc; font-size: 18px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  text-align: center; outline: none;
  transition: border-color 0.2s;
}
.band-in:focus { border-color: rgba(34,197,94,0.4); }
.band-in.cmm-in { color: #22c55e; font-weight: 700; }

/* Realtime CMM */
.cmm-rt   { font-size: 18px; font-family: 'Courier New', monospace; color: #1e3040; }
.cmm-live { color: #22c55e; font-weight: 700; }
.dot-live { color: #22c55e; margin-right: 3px; }

/* Status chips */
.st-chip {
  display: inline-block; font-size: 13px; font-weight: 700;
  letter-spacing: 0.8px; padding: 5px 14px; border-radius: 20px;
}
.st-idle   { background: rgba(255,255,255,0.04); color: #1e3040; border: 1px solid rgba(255,255,255,0.07); }
.st-active { background: rgba(34,197,94,0.12);   color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }

/* ─── Band visual bar ──────────────────────────────────────────────────── */
.band-bar {
  display: flex; border-radius: 12px; overflow: hidden;
  height: 72px; margin-bottom: 20px;
  border: 1px solid rgba(255,255,255,0.05);
}
.bbar-seg {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px;
  padding: 8px 4px; opacity: 0.45; transition: opacity 0.3s;
}
.bbar-on { opacity: 1; }
.bbar-LL   { background: linear-gradient(135deg, #3a0066, #6a1b9a); }
.bbar-L    { background: linear-gradient(135deg, #1b4020, #2e7d32); }
.bbar-ZERO { background: linear-gradient(135deg, #003d35, #00695c); }
.bbar-H    { background: linear-gradient(135deg, #8f2600, #d84315); }
.bbar-HH   { background: linear-gradient(135deg, #8f0f0f, #c62828); }
.bbar-id  { font-size: 19px; font-weight: 800; color: #fff; letter-spacing: 1px; }
.bbar-rng { font-size: 12px; color: rgba(255,255,255,0.65); font-family: monospace; }

/* ─── Section footer ───────────────────────────────────────────────────── */
.am-sec-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

/* Toggle */
.am-tog-wrap { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
.am-tog-track {
  width: 52px; height: 28px; border-radius: 14px;
  background: #0d1a22; border: 1px solid rgba(255,255,255,0.08);
  position: relative; transition: background 0.2s; flex-shrink: 0;
}
.am-tog-track.on { background: rgba(34,197,94,0.25); border-color: rgba(34,197,94,0.4); }
.am-tog-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 22px; height: 22px; border-radius: 50%;
  background: #1e3040; transition: left 0.18s, background 0.18s;
}
.am-tog-track.on .am-tog-thumb { left: 27px; background: #22c55e; }
.am-tog-lbl { font-size: 14px; font-weight: 700; letter-spacing: 0.8px; color: #1e3040; transition: color 0.2s; }
.am-tog-lbl.active { color: #22c55e; }

/* Save button */
.am-action-btn {
  display: flex; align-items: center; gap: 9px;
  padding: 12px 28px; border-radius: 12px;
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.25);
  color: #22c55e; font-size: 14px; font-weight: 700;
  letter-spacing: 0.8px; cursor: pointer;
  font-family: inherit; transition: all 0.2s;
}
.am-action-btn:hover { background: rgba(34,197,94,0.15); }
.am-action-btn i { font-size: 18px; }

/* ─── Bottom 3-col row ─────────────────────────────────────────────────── */
.am-row-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  align-items: start;
}

/* Form field row */
.am-field {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; padding: 11px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.am-field label { font-size: 15px; font-weight: 600; color: #2d4050; }
.am-input {
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 9px;
  color: #b0c0cc; font-size: 16px;
  padding: 8px 12px; outline: none;
  font-family: inherit; min-width: 130px;
  transition: border-color 0.2s;
}
.am-input:focus { border-color: rgba(34,197,94,0.35); }

/* Apply button */
.am-apply-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; margin-top: 16px; padding: 13px;
  border-radius: 12px;
  background: rgba(34,197,94,0.07);
  border: 1px solid rgba(34,197,94,0.2);
  color: #22c55e; font-size: 14px; font-weight: 700;
  letter-spacing: 0.8px; cursor: pointer;
  font-family: inherit; transition: all 0.2s;
}
.am-apply-btn:hover { background: rgba(34,197,94,0.14); }
.am-apply-btn i { font-size: 17px; }

/* Note box */
.am-note {
  font-size: 13px; color: #1a2a38; line-height: 1.6;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 8px; padding: 10px 14px; margin-top: 12px;
}

/* Payload section */
.payload-sec { display: flex; flex-direction: column; }
.am-payload {
  flex: 1;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 14px; color: #22c55e;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(34,197,94,0.1);
  border-radius: 10px; padding: 16px;
  white-space: pre-wrap;
  overflow: auto; min-height: 180px;
  line-height: 1.6;
}
</style>
