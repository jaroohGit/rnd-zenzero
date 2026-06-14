<script setup lang="ts">
import { useAuthorityStore } from '@/stores/authority'
import { useProcessParamStore } from '@/stores/processParam'
import { useSensorsStore } from '@/stores/sensors'
import PanelCard from '@/components/shared/PanelCard.vue'
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
  return s === 'trig' ? 'badge-trig' : s === 'near' ? 'badge-near' : 'badge-idle'
}
function statusLabel(s: string) {
  return s === 'trig' ? 'TRIGGERED' : s === 'near' ? 'NEAR SP' : 'IDLE'
}
</script>

<template>
  <div class="page-grid">
    <!-- Parameter Table -->
    <PanelCard
      color="blue"
      style="grid-column:span 3;"
      :prohibited="!auth.iHaveControl"
      lock-sub="ต้องถือสิทธิ์ควบคุม (WEB) จึงจะแก้ค่าได้"
    >
      <div class="table-header">
        <div class="panel-title" style="margin-bottom:0;">
          <span>⚙️</span> Process Threshold → Lamp Mapping
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <label style="font-size:11px;color:#90a4ae;display:flex;align-items:center;gap:6px;">
            <input type="checkbox" v-model="pp.autoEnable" style="width:16px;height:16px;accent-color:#00e676;cursor:pointer;" />
            Auto-Apply
          </label>
          <button class="btn btn-ghost" @click="pp.resetLatch()">↺ Reset Latch</button>
          <button class="btn btn-save" @click="pp.saveParams()">💾 Save &amp; Apply</button>
        </div>
      </div>

      <div class="table-wrap">
        <table class="pp-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Condition</th>
              <th>SP1 (°C)</th>
              <th>SP2 (°C)</th>
              <th>Hyst</th>
              <th>Lamp Mapping</th>
              <th>Enable</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in pp.ppRows" :key="idx">
              <td style="font-size:12px;font-weight:700;color:#00e5ff;letter-spacing:1px;">{{ row.src }}</td>
              <td>
                <select class="hmi-select" style="width:100%;" :value="row.cond" @change="onCondChange(idx, ($event.target as HTMLSelectElement).value)">
                  <option v-for="o in condOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </td>
              <td>
                <input class="hmi-input" type="number" style="width:72px;" :value="row.sp1.toFixed(1)" step="0.1"
                  @input="onSP1Change(idx, ($event.target as HTMLInputElement).value)" />
              </td>
              <td>
                <input v-if="row.cond === 'range' || row.cond === 'out'"
                  class="hmi-input" type="number" style="width:72px;" :value="row.sp2.toFixed(1)" step="0.1"
                  @input="onSP2Change(idx, ($event.target as HTMLInputElement).value)" />
                <span v-else style="font-size:11px;color:#37474f;">— (ไม่ใช้)</span>
              </td>
              <td>
                <input class="hmi-input" type="number" style="width:58px;" :value="row.hyst.toFixed(1)" step="0.1"
                  @input="onHystChange(idx, ($event.target as HTMLInputElement).value)" />
              </td>
              <td>
                <div style="display:flex;flex-wrap:wrap;gap:3px;min-width:160px;">
                  <span
                    v-for="(on, li) in row.lamps" :key="li"
                    class="lamp-pill" :class="{ on }"
                    @click="toggleLamp(idx, li)"
                  >L{{ li + 1 }}</span>
                </div>
              </td>
              <td>
                <div class="tog-wrap" @click="toggleEnable(idx)">
                  <div class="tog-track" :class="{ on: row.en }">
                    <div class="tog-thumb"></div>
                  </div>
                  <span class="tog-label">{{ row.en ? 'ON' : 'OFF' }}</span>
                </div>
              </td>
              <td>
                <span class="badge" :class="statusClass(pp.rowStatus[idx])">
                  <span class="bdot"></span>{{ statusLabel(pp.rowStatus[idx]) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="note-box">
        <b style="color:#00e5ff;">Condition:</b>
        ≥ SP1 = ติดเมื่อสูงกว่า &nbsp;·&nbsp; ≤ SP1 = ติดเมื่อต่ำกว่า &nbsp;·&nbsp;
        SP1–SP2 = ในช่วง &nbsp;·&nbsp; &lt;SP1 or &gt;SP2 = นอกช่วง &nbsp;·&nbsp;
        <b style="color:#ffa726;">Hysteresis:</b> กัน hunting เมื่ออุณหภูมิแกว่งแถว Setpoint
      </div>
    </PanelCard>

    <!-- Live Actual Status -->
    <PanelCard color="teal" title="Live / Actual Status" icon="📡" style="grid-column:span 2;">
      <div class="pp-actual-grid">
        <div v-for="(src, i) in ['TEMP-1', 'TEMP-2']" :key="src" class="pp-actual-card">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#78909c;margin-bottom:6px;">{{ src }}</div>
          <div style="font-size:28px;font-weight:700;font-family:var(--font-mono);color:#00e5ff;line-height:1;text-shadow:0 0 10px rgba(0,229,255,0.4);margin-bottom:8px;">
            {{ (i === 0 ? sensors.temp1 : sensors.temp2).toFixed(1) }}<span style="font-size:14px;color:#90a4ae;"> °C</span>
          </div>
          <div style="margin-bottom:8px;">
            <span class="badge" :class="statusClass(pp.rowStatus[i])">
              <span class="bdot"></span>{{ statusLabel(pp.rowStatus[i]) }}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            <div class="prog-outer">
              <div class="prog-inner"
                :class="pp.rowStatus[i] === 'trig' ? 'trig' : pp.rowStatus[i] === 'near' ? 'warn' : ''"
                :style="{ width: pp.barPct(i === 0 ? sensors.temp1 : sensors.temp2).toFixed(1) + '%' }"
              ></div>
            </div>
            <span style="font-size:12px;font-family:var(--font-mono);min-width:54px;text-align:right;color:#a5d6a7;">
              {{ (i === 0 ? sensors.temp1 : sensors.temp2).toFixed(1) }}°C
            </span>
          </div>
          <div style="font-size:10px;color:#78909c;">
            SP1: {{ pp.ppRows[i]?.sp1.toFixed(1) }}°C
            <span v-if="pp.ppRows[i]?.cond === 'range' || pp.ppRows[i]?.cond === 'out'">
              · SP2: {{ pp.ppRows[i]?.sp2.toFixed(1) }}°C
            </span>
            · Hyst: ±{{ pp.ppRows[i]?.hyst.toFixed(1) }}°C
          </div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;color:#80cbc4;letter-spacing:1px;margin-bottom:8px;">LAMP ACTUAL STATE</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <LampIndicator
          v-for="i in pp.LAMPS"
          :key="i"
          :index="i"
          :actual-on="pp.lampActualState[i-1]"
          :cmd-on="pp.lampCmdState[i-1]"
        />
      </div>
    </PanelCard>

    <!-- Payload Preview -->
    <PanelCard color="purple" title="MQTT Payload Preview" icon="📤">
      <pre class="payload-pre">{{ pp.lastPayload }}</pre>
    </PanelCard>
  </div>
</template>

<style scoped>
.page-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; align-content: start; }
.table-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
}
.table-wrap { overflow-x: auto; }
.pp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.pp-table th {
  padding: 8px 10px; font-size: 10px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: #78909c; text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.2); white-space: nowrap;
}
.pp-table td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
.pp-table tbody tr:hover { background: rgba(255,255,255,0.02); }
.lamp-pill {
  font-size: 10px; font-weight: 700; padding: 2px 7px;
  border-radius: 10px; cursor: pointer; user-select: none;
  border: 1px solid rgba(255,255,255,0.12); color: #546e7a;
  background: rgba(255,255,255,0.04); transition: all .12s;
}
.lamp-pill.on { background: rgba(255,167,38,0.2); color: #ffa726; border-color: #ffa726; }
.pp-actual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.pp-actual-card { background: var(--bg-item); border-radius: 10px; padding: 12px 14px; border: 1px solid var(--border); }
</style>
