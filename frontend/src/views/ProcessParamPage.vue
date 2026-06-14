<script setup lang="ts">
import { useAuthorityStore } from '@/stores/authority'
import { useProcessParamStore } from '@/stores/processParam'
import { useSensorsStore } from '@/stores/sensors'
import LampIndicator from '@/components/shared/LampIndicator.vue'
import type { PPCond } from '@/types'

const auth    = useAuthorityStore()
const pp      = useProcessParamStore()
const sensors = useSensorsStore()

const condOptions: { value: PPCond; label: string }[] = [
  { value: 'gte',   label: '≥ SP1' },
  { value: 'lte',   label: '≤ SP1' },
  { value: 'range', label: 'SP1 – SP2' },
  { value: 'out',   label: '< SP1 or > SP2' },
]

function onCondChange(idx: number, val: string) {
  pp.ppRows[idx].cond = val as PPCond
  pp.evaluate(sensors.temp1, sensors.temp2)
}
function onSP1Change(idx: number, val: string) {
  pp.ppRows[idx].sp1 = parseFloat(val) || 0
  pp.evaluate(sensors.temp1, sensors.temp2)
}
function onSP2Change(idx: number, val: string) {
  pp.ppRows[idx].sp2 = parseFloat(val) || 0
  pp.evaluate(sensors.temp1, sensors.temp2)
}
function onHystChange(idx: number, val: string) {
  pp.ppRows[idx].hyst = parseFloat(val) || 0
}
function toggleLamp(rowIdx: number, lampIdx: number) {
  pp.ppRows[rowIdx].lamps[lampIdx] = !pp.ppRows[rowIdx].lamps[lampIdx]
  pp.evaluate(sensors.temp1, sensors.temp2)
}
function toggleEnable(idx: number) {
  pp.ppRows[idx].en = !pp.ppRows[idx].en
  pp.evaluate(sensors.temp1, sensors.temp2)
}
function statusClass(s: string) {
  return s === 'trig' ? 'st-trig' : s === 'near' ? 'st-near' : 'st-idle'
}
function statusLabel(s: string) {
  return s === 'trig' ? 'TRIGGERED' : s === 'near' ? 'NEAR SP' : 'IDLE'
}
function barPctClass(i: number) {
  const s = pp.rowStatus[i]
  return s === 'trig' ? 'bar-trig' : s === 'near' ? 'bar-near' : 'bar-ok'
}
</script>

<template>
  <div class="pp">

    <!-- ══════════════════════════════════════════════════════════════════════
         GROUP 1 — PROCESS THRESHOLD → LAMP MAPPING
    ═══════════════════════════════════════════════════════════════════════ -->
    <section class="pp-section">

      <!-- Header -->
      <div class="sec-hd">
        <div class="sec-hd-left">
          <div class="sec-eyebrow">
            <span class="ey-line"></span>
            <span class="ey-txt">GROUP 01</span>
          </div>
          <h2 class="sec-title">
            <i class="bx bx-slider-alt"></i>
            Process Threshold → Lamp Mapping
          </h2>
          <p class="sec-sub">Temperature setpoint · Condition · Lamp assignment</p>
        </div>
        <div class="sec-hd-right">
          <label class="auto-label">
            <input type="checkbox" v-model="pp.autoEnable" class="auto-check" />
            Auto-Apply
          </label>
          <button class="hd-btn ghost" @click="pp.resetLatch()">
            <i class="bx bx-revision"></i> Reset Latch
          </button>
          <button class="hd-btn save" @click="pp.saveParams()">
            <i class="bx bx-save"></i> Save &amp; Apply
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap" :class="{ locked: !auth.iHaveControl }">

        <div v-if="!auth.iHaveControl" class="lock-bar">
          <i class="bx bx-lock-alt"></i>
          ต้องถือสิทธิ์ควบคุม (WEB) จึงจะแก้ค่าได้ — กด REQUEST CONTROL ที่ Header
        </div>

        <table class="pp-table">
          <thead>
            <tr>
              <th>SOURCE</th>
              <th>CONDITION</th>
              <th>SP1 (°C)</th>
              <th>SP2 (°C)</th>
              <th>HYST</th>
              <th>LAMP MAPPING</th>
              <th>ENABLE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in pp.ppRows" :key="idx" class="pp-row">

              <!-- Source -->
              <td class="td-src">{{ row.src }}</td>

              <!-- Condition -->
              <td>
                <select class="pp-select"
                  :value="row.cond"
                  @change="onCondChange(idx, ($event.target as HTMLSelectElement).value)">
                  <option v-for="o in condOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </td>

              <!-- SP1 -->
              <td>
                <input class="pp-input" type="number" step="0.1"
                  :value="row.sp1.toFixed(1)"
                  @input="onSP1Change(idx, ($event.target as HTMLInputElement).value)" />
              </td>

              <!-- SP2 -->
              <td>
                <input v-if="row.cond === 'range' || row.cond === 'out'"
                  class="pp-input" type="number" step="0.1"
                  :value="row.sp2.toFixed(1)"
                  @input="onSP2Change(idx, ($event.target as HTMLInputElement).value)" />
                <span v-else class="td-na">— ไม่ใช้</span>
              </td>

              <!-- Hyst -->
              <td>
                <input class="pp-input narrow" type="number" step="0.1"
                  :value="row.hyst.toFixed(1)"
                  @input="onHystChange(idx, ($event.target as HTMLInputElement).value)" />
              </td>

              <!-- Lamp mapping -->
              <td>
                <div class="lamp-pills">
                  <span
                    v-for="(on, li) in row.lamps" :key="li"
                    class="lpill" :class="{ on }"
                    @click="toggleLamp(idx, li)"
                  >L{{ li + 1 }}</span>
                </div>
              </td>

              <!-- Enable toggle -->
              <td>
                <div class="tog-wrap" @click="toggleEnable(idx)">
                  <div class="tog-track" :class="{ on: row.en }">
                    <div class="tog-thumb"></div>
                  </div>
                  <span class="tog-lbl">{{ row.en ? 'ON' : 'OFF' }}</span>
                </div>
              </td>

              <!-- Status -->
              <td>
                <span class="st-badge" :class="statusClass(pp.rowStatus[idx])">
                  <span class="st-dot"></span>
                  {{ statusLabel(pp.rowStatus[idx]) }}
                </span>
              </td>

            </tr>
          </tbody>
        </table>
      </div>

      <!-- Note -->
      <div class="note-row">
        <span class="note-key">Condition:</span>
        ≥ SP1 = ติดเมื่อสูงกว่า &nbsp;·&nbsp; ≤ SP1 = ติดเมื่อต่ำกว่า &nbsp;·&nbsp;
        SP1–SP2 = ในช่วง &nbsp;·&nbsp; &lt;SP1 or &gt;SP2 = นอกช่วง
        &nbsp;&nbsp;
        <span class="note-key warn">Hysteresis:</span>
        กัน hunting เมื่ออุณหภูมิแกว่งแถว Setpoint
      </div>

    </section>

    <!-- ══ Bottom row ════════════════════════════════════════════════════ -->
    <div class="bottom-row">

      <!-- GROUP 2 — Live Status -->
      <section class="pp-section live-section">

        <div class="sec-hd" style="margin-bottom:4px;">
          <div class="sec-hd-left">
            <div class="sec-eyebrow">
              <span class="ey-line" style="background:#38bdf8;"></span>
              <span class="ey-txt">GROUP 02</span>
            </div>
            <h2 class="sec-title">
              <i class="bx bx-broadcast" style="color:#38bdf8;"></i>
              Live / Actual Status
            </h2>
          </div>
        </div>

        <!-- Temp cards -->
        <div class="temp-grid">
          <div v-for="(src, i) in ['TEMP-1', 'TEMP-2']" :key="src" class="temp-card">
            <div class="tc-src">{{ src }}</div>
            <div class="tc-val">
              {{ (i === 0 ? sensors.temp1 : sensors.temp2).toFixed(1) }}
              <span class="tc-unit">°C</span>
            </div>
            <span class="st-badge" :class="statusClass(pp.rowStatus[i])" style="margin-bottom:10px;">
              <span class="st-dot"></span>{{ statusLabel(pp.rowStatus[i]) }}
            </span>
            <div class="tc-bar-row">
              <div class="tc-bar-outer">
                <div class="tc-bar-inner" :class="barPctClass(i)"
                  :style="{ width: pp.barPct(i === 0 ? sensors.temp1 : sensors.temp2).toFixed(1) + '%' }">
                </div>
              </div>
              <span class="tc-bar-val">{{ (i === 0 ? sensors.temp1 : sensors.temp2).toFixed(1) }}°C</span>
            </div>
            <div class="tc-sp">
              SP1: {{ pp.ppRows[i]?.sp1.toFixed(1) }}°C
              <template v-if="pp.ppRows[i]?.cond === 'range' || pp.ppRows[i]?.cond === 'out'">
                · SP2: {{ pp.ppRows[i]?.sp2.toFixed(1) }}°C
              </template>
              · Hyst: ±{{ pp.ppRows[i]?.hyst.toFixed(1) }}°C
            </div>
          </div>
        </div>

        <!-- Lamp actual state -->
        <div class="lamp-state-block">
          <div class="lsb-label">
            <span class="ey-line" style="background:#4ade80; width:16px;"></span>
            LAMP ACTUAL STATE
          </div>
          <div class="lamp-indicators">
            <LampIndicator
              v-for="i in pp.LAMPS" :key="i"
              :index="i"
              :actual-on="pp.lampActualState[i-1]"
              :cmd-on="pp.lampCmdState[i-1]"
            />
          </div>
        </div>

      </section>

      <!-- MQTT Payload Preview -->
      <section class="pp-section payload-section">
        <div class="sec-eyebrow" style="margin-bottom:12px;">
          <span class="ey-line" style="background:#c084fc;"></span>
          <span class="ey-txt">MQTT PAYLOAD PREVIEW</span>
        </div>
        <pre class="payload-pre">{{ pp.lastPayload || '// กด Save &amp; Apply เพื่อดู payload' }}</pre>
      </section>

    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ─── Page ────────────────────────────────────────────────────────────── */
.pp {
  display: flex; flex-direction: column; gap: 16px;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  min-height: 100%;
}

/* ─── Section shell ───────────────────────────────────────────────────── */
.pp-section {
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 22px 26px;
  display: flex; flex-direction: column; gap: 18px;
}

/* ─── Section header ──────────────────────────────────────────────────── */
.sec-hd { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px; }
.sec-hd-left  { display: flex; flex-direction: column; gap: 5px; }
.sec-hd-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.sec-eyebrow { display: flex; align-items: center; gap: 8px; }
.ey-line {
  display: block; width: 22px; height: 2px; border-radius: 2px;
  background: #22c55e; flex-shrink: 0;
}
.ey-txt {
  font-size: 9px; font-weight: 700; letter-spacing: 3px;
  color: #1e3040; text-transform: uppercase;
}

.sec-title {
  font-size: 18px; font-weight: 800; color: #d0dde8;
  display: flex; align-items: center; gap: 9px; letter-spacing: -0.3px;
}
.sec-title i { font-size: 20px; color: #22c55e; }
.sec-sub { font-size: 11px; color: #253545; font-weight: 500; }

/* Header buttons */
.auto-label {
  display: flex; align-items: center; gap: 7px;
  font-size: 11.5px; font-weight: 600; color: #3a5060; cursor: pointer;
}
.auto-check { width: 15px; height: 15px; accent-color: #22c55e; cursor: pointer; }

.hd-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 8px;
  font-size: 12px; font-weight: 700; font-family: inherit;
  cursor: pointer; transition: all 0.15s; border: 1px solid;
}
.hd-btn i { font-size: 14px; }
.hd-btn.ghost {
  background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.09); color: #4a6070;
}
.hd-btn.ghost:hover { background: rgba(255,255,255,0.08); color: #8aa0b0; }
.hd-btn.save {
  background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.35); color: #22c55e;
}
.hd-btn.save:hover { background: rgba(34,197,94,0.2); border-color: rgba(34,197,94,0.6); }

/* ─── Lock bar ────────────────────────────────────────────────────────── */
.lock-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px; border-radius: 8px;
  background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2);
  font-size: 11px; font-weight: 600; color: #ef4444;
}
.lock-bar i { font-size: 14px; }
.table-wrap.locked { opacity: 0.75; }

/* ─── Table ───────────────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; display: flex; flex-direction: column; gap: 10px; }

.pp-table { width: 100%; border-collapse: collapse; font-size: 12px; }

.pp-table th {
  padding: 11px 12px;
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #4a6070; text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: #0a0a0a; white-space: nowrap;
}
.pp-table th:first-child { border-radius: 8px 0 0 0; }
.pp-table th:last-child  { border-radius: 0 8px 0 0; }

.pp-row td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  vertical-align: middle;
}
.pp-row:last-child td { border-bottom: none; }
.pp-row:hover td { background: rgba(255,255,255,0.02); }

.td-src {
  font-size: 12px; font-weight: 800; color: #38bdf8;
  letter-spacing: 1px; white-space: nowrap;
}
.td-na { font-size: 11px; color: #1e3040; }

/* Inputs in table */
.pp-select {
  background: #111; border: 1px solid rgba(255,255,255,0.09);
  border-radius: 7px; color: #c8d8e8;
  font-size: 11.5px; font-family: inherit; font-weight: 500;
  padding: 6px 10px; width: 100%; cursor: pointer;
  transition: border-color 0.15s;
}
.pp-select:focus { outline: none; border-color: rgba(56,189,248,0.4); }

.pp-input {
  background: #111; border: 1px solid rgba(255,255,255,0.09);
  border-radius: 7px; color: #c8d8e8;
  font-size: 12px; font-family: monospace; font-weight: 700;
  padding: 6px 10px; width: 76px; text-align: center;
  transition: border-color 0.15s;
}
.pp-input.narrow { width: 60px; }
.pp-input:focus { outline: none; border-color: rgba(56,189,248,0.4); }

/* Lamp pills */
.lamp-pills { display: flex; flex-wrap: wrap; gap: 4px; min-width: 160px; }
.lpill {
  font-size: 10px; font-weight: 700; padding: 3px 8px;
  border-radius: 20px; cursor: pointer; user-select: none;
  border: 1px solid rgba(255,255,255,0.09);
  color: #2d4050; background: rgba(255,255,255,0.04);
  transition: all 0.12s;
}
.lpill.on { background: rgba(245,158,11,0.15); color: #f59e0b; border-color: rgba(245,158,11,0.45); }
.lpill:hover { border-color: rgba(255,255,255,0.2); color: #6a8090; }
.lpill.on:hover { background: rgba(245,158,11,0.25); }

/* Toggle */
.tog-wrap { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.tog-track {
  width: 36px; height: 20px; border-radius: 10px;
  background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1);
  position: relative; transition: all 0.2s;
}
.tog-track.on { background: rgba(34,197,94,0.3); border-color: rgba(34,197,94,0.5); }
.tog-thumb {
  width: 14px; height: 14px; border-radius: 50%;
  background: #3a5060; position: absolute; top: 2px; left: 2px;
  transition: all 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
}
.tog-track.on .tog-thumb { background: #22c55e; left: 18px; box-shadow: 0 0 6px rgba(34,197,94,0.6); }
.tog-lbl { font-size: 10px; font-weight: 700; color: #2d4050; letter-spacing: 1px; }
.tog-track.on + .tog-lbl { color: #22c55e; }

/* Status badge */
.st-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 20px;
  font-size: 9px; font-weight: 800; letter-spacing: 1.5px;
  white-space: nowrap;
  border: 1px solid;
}
.st-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.st-trig { background: rgba(239,68,68,0.1);  border-color: rgba(239,68,68,0.35);  color: #f87171; }
.st-trig .st-dot { box-shadow: 0 0 5px rgba(239,68,68,0.8); animation: blink 1s infinite; }
.st-near { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.35); color: #fbbf24; }
.st-idle { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: #2d4050; }

/* Note row */
.note-row {
  font-size: 10.5px; color: #253545; line-height: 1.7;
  padding: 10px 14px; border-radius: 8px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);
}
.note-key      { font-weight: 700; color: #38bdf8; }
.note-key.warn { color: #f59e0b; }

/* ─── Bottom row ──────────────────────────────────────────────────────── */
.bottom-row { display: flex; gap: 16px; align-items: flex-start; }
.live-section    { flex: 1; }
.payload-section { width: 300px; flex-shrink: 0; }

/* ─── Temp cards ──────────────────────────────────────────────────────── */
.temp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.temp-card {
  background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
  padding: 16px 18px; display: flex; flex-direction: column; gap: 6px;
}
.tc-src { font-size: 9px; font-weight: 700; letter-spacing: 2px; color: #1e3040; text-transform: uppercase; }
.tc-val {
  font-size: 36px; font-weight: 800; font-family: monospace;
  color: #38bdf8; line-height: 1; letter-spacing: -1px;
}
.tc-unit { font-size: 16px; color: #2d4050; font-weight: 500; }

.tc-bar-row { display: flex; align-items: center; gap: 10px; }
.tc-bar-outer {
  flex: 1; height: 6px; border-radius: 3px;
  background: rgba(255,255,255,0.06);
}
.tc-bar-inner {
  height: 100%; border-radius: 3px; transition: width 0.5s ease;
  background: #22c55e;
}
.tc-bar-inner.bar-trig { background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5); }
.tc-bar-inner.bar-near { background: #f59e0b; }
.tc-bar-inner.bar-ok   { background: #22c55e; }
.tc-bar-val { font-size: 11px; font-family: monospace; color: #3a5060; min-width: 48px; text-align: right; }

.tc-sp { font-size: 10px; color: #1e3040; }

/* Lamp state block */
.lamp-state-block { display: flex; flex-direction: column; gap: 10px; }
.lsb-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 9px; font-weight: 700; letter-spacing: 3px; color: #1e3040; text-transform: uppercase;
}
.lamp-indicators { display: flex; gap: 8px; flex-wrap: wrap; }

/* ─── Payload ─────────────────────────────────────────────────────────── */
.payload-pre {
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px; padding: 14px;
  font-size: 11px; font-family: monospace; color: #38bdf8;
  white-space: pre-wrap; word-break: break-all;
  line-height: 1.7; min-height: 140px; margin: 0;
  flex: 1;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
</style>
