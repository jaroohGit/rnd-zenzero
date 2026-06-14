<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSensorsStore }      from '@/stores/sensors'
import { useProcessParamStore } from '@/stores/processParam'
import { useAuthorityStore }    from '@/stores/authority'
import {
  mqttState, mqttLabel,
  BROKER_HOST, BROKER_PORT, GATEWAY_URL,
  TOPIC_STATUS, TOPIC_AUTH,
} from '@/composables/useMqtt'

const sensors = useSensorsStore()
const pp      = useProcessParamStore()
const auth    = useAuthorityStore()

// Clock
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval>
onMounted  (() => { clockTimer = setInterval(() => now.value = new Date(), 1000) })
onUnmounted(() => clearInterval(clockTimer))
const pad  = (v: number) => String(v).padStart(2, '0')
const timeStr = computed(() =>
  `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}:${pad(now.value.getSeconds())}`)
const dateStr = computed(() =>
  `${now.value.getFullYear()}/${pad(now.value.getMonth()+1)}/${pad(now.value.getDate())}`)

// Tag table rows
const tagRows = computed(() => [
  { name: 'Temperature 1', field: 'Temp1111111', scale: '÷ 10', unit: '°C',   live: sensors.temp1.toFixed(1),   color: '#38bdf8' },
  { name: 'Temperature 2', field: 'Temp2222',    scale: '÷ 10', unit: '°C',   live: sensors.temp2.toFixed(1),   color: '#38bdf8' },
  { name: 'Ambient Temp',  field: 'TEMPCOM1',    scale: '÷ 10', unit: '°C',   live: sensors.tempAmb.toFixed(1), color: '#38bdf8' },
  { name: 'Humidity',      field: 'RH2222',       scale: '÷ 10', unit: '%RH',  live: sensors.rh.toFixed(1),      color: '#4ade80' },
  { name: 'Register D300', field: 'D300',          scale: 'raw',  unit: '—',    live: String(sensors.d300),       color: '#c084fc' },
  { name: 'Register D302', field: 'D302',          scale: 'raw',  unit: '—',    live: String(sensors.d302),       color: '#c084fc' },
  { name: 'Register D304', field: 'D304',          scale: 'raw',  unit: '—',    live: String(sensors.d304),       color: '#c084fc' },
  { name: 'Register D306', field: 'D306',          scale: 'raw',  unit: '—',    live: String(sensors.d306),       color: '#c084fc' },
])

// Process status helper
function stClass(s: string) { return s === 'trig' ? 'trig' : s === 'near' ? 'near' : 'idle' }
function stLabel(s: string) { return s === 'trig' ? 'TRIGGERED' : s === 'near' ? 'NEAR SP' : 'IDLE' }
</script>

<template>
  <div class="ss">

    <!-- ══ PAGE HEADER ═══════════════════════════════════════════════════ -->
    <div class="page-hd">
      <div class="ph-left">
        <div class="ph-eyebrow">
          <span class="ey-line"></span>
          <span class="ey-txt">ZENMAC R&amp;D · DEMO</span>
        </div>
        <h1 class="ph-title">
          <i class="bx bx-layer"></i>
          Solution &amp; Summary
        </h1>
        <p class="ph-sub">ภาพรวมระบบ · MQTT Connection · PLC Tags · Realtime Panel Values</p>
      </div>
      <div class="ph-right">
        <div class="ph-clock">
          <span class="clk-time">{{ timeStr }}</span>
          <span class="clk-date">{{ dateStr }}</span>
        </div>
        <div class="mqtt-badge" :class="mqttState">
          <span class="mb-dot"></span>
          {{ mqttState === 'connected' ? 'MQTT LIVE' : mqttState === 'connecting' ? 'CONNECTING' : 'OFFLINE' }}
        </div>
      </div>
    </div>

    <!-- ══ CONNECTION BAR ════════════════════════════════════════════════ -->
    <div class="conn-bar">
      <div class="cb-item" :class="mqttState">
        <i class="bx bx-wifi cb-icon"></i>
        <div class="cb-lines">
          <span class="cb-key">MQTT</span>
          <span class="cb-val">{{ mqttLabel }}</span>
        </div>
      </div>
      <div class="cb-sep"></div>
      <div class="cb-item">
        <i class="bx bx-server cb-icon"></i>
        <div class="cb-lines">
          <span class="cb-key">BROKER (TCP)</span>
          <span class="cb-val mono">{{ BROKER_HOST }}:{{ BROKER_PORT }}</span>
        </div>
      </div>
      <div class="cb-sep"></div>
      <div class="cb-item">
        <i class="bx bx-transfer-alt cb-icon"></i>
        <div class="cb-lines">
          <span class="cb-key">GATEWAY (WS)</span>
          <span class="cb-val mono">{{ GATEWAY_URL }}</span>
        </div>
      </div>
      <div class="cb-sep"></div>
      <div class="cb-item">
        <i class="bx bx-broadcast cb-icon"></i>
        <div class="cb-lines">
          <span class="cb-key">STATUS TOPIC</span>
          <span class="cb-val mono">{{ TOPIC_STATUS }}</span>
        </div>
      </div>
      <div class="cb-sep"></div>
      <div class="cb-item">
        <i class="bx bx-shield cb-icon" :style="{ color: auth.iHaveControl ? '#22c55e' : '#f59e0b' }"></i>
        <div class="cb-lines">
          <span class="cb-key">AUTHORITY</span>
          <span class="cb-val" :class="auth.iHaveControl ? 'green' : 'amber'">{{ auth.authHolder }}</span>
        </div>
      </div>
      <div class="cb-sep"></div>
      <div class="cb-item">
        <i class="bx bx-pulse cb-icon"></i>
        <div class="cb-lines">
          <span class="cb-key">SCAN TIME</span>
          <span class="cb-val mono">{{ sensors.scanMs }} ms</span>
        </div>
      </div>
    </div>

    <!-- ══ MAIN CONTENT ══════════════════════════════════════════════════ -->
    <div class="main-grid">

      <!-- ── LEFT: Realtime Panel ───────────────────────────────────────── -->
      <div class="col-left">

        <!-- Sensor values -->
        <section class="ss-section">
          <div class="sec-eyebrow">
            <span class="ey-line" style="background:#38bdf8;"></span>
            <span class="ey-txt">TEMPERATURE &amp; HUMIDITY</span>
          </div>
          <div class="sensor-row">
            <div class="sensor-card" v-for="s in [
              { label:'TEMP-1',  val: sensors.temp1,   unit:'°C',  tag:'Temp1111111', color:'#38bdf8' },
              { label:'TEMP-2',  val: sensors.temp2,   unit:'°C',  tag:'Temp2222',    color:'#38bdf8' },
              { label:'AMBIENT', val: sensors.tempAmb, unit:'°C',  tag:'TEMPCOM1',    color:'#7dd3fc' },
              { label:'HUMIDITY',val: sensors.rh,      unit:'%RH', tag:'RH2222',      color:'#4ade80' },
            ]" :key="s.label">
              <div class="sc-label">{{ s.label }}</div>
              <div class="sc-val" :style="{ color: s.color }">
                {{ s.val.toFixed(1) }}<span class="sc-unit">{{ s.unit }}</span>
              </div>
              <div class="sc-tag">{{ s.tag }} ÷10</div>
              <div class="sc-bar-outer">
                <div class="sc-bar-inner" :style="{ width: Math.min(s.val, 100)+'%', background: s.color }"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Registers -->
        <section class="ss-section">
          <div class="sec-eyebrow">
            <span class="ey-line" style="background:#c084fc;"></span>
            <span class="ey-txt">PLC REGISTERS (RAW)</span>
          </div>
          <div class="reg-row">
            <div class="reg-card" v-for="r in [
              { k:'D300', v: sensors.d300 },
              { k:'D302', v: sensors.d302 },
              { k:'D304', v: sensors.d304 },
              { k:'D306', v: sensors.d306 },
            ]" :key="r.k">
              <span class="rk-key">{{ r.k }}</span>
              <span class="rk-val">{{ r.v }}</span>
              <span class="rk-unit">raw</span>
            </div>
          </div>
        </section>

        <!-- Lamp actual state -->
        <section class="ss-section">
          <div class="sec-eyebrow" style="margin-bottom:14px;">
            <span class="ey-line" style="background:#f59e0b;"></span>
            <span class="ey-txt">OUTPUT LAMPS — PLC ACTUAL STATE</span>
            <span class="scan-badge">scan #{{ pp.scanCount }}</span>
          </div>
          <div class="lamp-row">
            <div
              v-for="i in pp.LAMPS" :key="i"
              class="lamp-card"
              :class="{ on: pp.lampActualState[i-1] }"
            >
              <div class="lc-bulb" :class="{ on: pp.lampActualState[i-1] }">
                <i class="bx bx-bulb"></i>
              </div>
              <span class="lc-name">L{{ i }}</span>
              <span class="lc-state" :class="{ on: pp.lampActualState[i-1] }">
                {{ pp.lampActualState[i-1] ? 'ON' : 'OFF' }}
              </span>
              <span class="lc-tag">Lamp{{ i }}</span>
            </div>
          </div>
        </section>

        <!-- Process status -->
        <section class="ss-section">
          <div class="sec-eyebrow" style="margin-bottom:14px;">
            <span class="ey-line" style="background:#22c55e;"></span>
            <span class="ey-txt">PROCESS STATUS</span>
          </div>
          <div class="proc-row">
            <div class="proc-card" v-for="(src, i) in ['TEMP-1', 'TEMP-2']" :key="src">
              <div class="pc-src">{{ src }}</div>
              <div class="pc-val" :style="{ color: i === 0 ? '#38bdf8' : '#7dd3fc' }">
                {{ (i === 0 ? sensors.temp1 : sensors.temp2).toFixed(1) }}°C
              </div>
              <div class="pc-cond" v-if="pp.ppRows[i]">
                SP1: {{ pp.ppRows[i].sp1.toFixed(1) }}°C · Hyst: ±{{ pp.ppRows[i].hyst.toFixed(1) }}°C
              </div>
              <span class="proc-badge" :class="stClass(pp.rowStatus[i])">
                <span class="pb-dot"></span>{{ stLabel(pp.rowStatus[i]) }}
              </span>
            </div>
          </div>
        </section>

      </div>

      <!-- ── RIGHT: System Reference ────────────────────────────────────── -->
      <div class="col-right">

        <!-- Tag reference table -->
        <section class="ss-section">
          <div class="sec-eyebrow" style="margin-bottom:14px;">
            <span class="ey-line"></span>
            <span class="ey-txt">PLC TAG REFERENCE</span>
          </div>
          <table class="tag-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>FIELD (JSON)</th>
                <th>SCALE</th>
                <th>UNIT</th>
                <th>LIVE</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tagRows" :key="t.field">
                <td class="tt-name">{{ t.name }}</td>
                <td class="tt-field mono" :style="{ color: t.color }">{{ t.field }}</td>
                <td class="tt-scale mono">{{ t.scale }}</td>
                <td class="tt-unit">{{ t.unit }}</td>
                <td class="tt-live mono" :style="{ color: t.color }">{{ t.live }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- MQTT config reference -->
        <section class="ss-section">
          <div class="sec-eyebrow" style="margin-bottom:14px;">
            <span class="ey-line" style="background:#38bdf8;"></span>
            <span class="ey-txt">MQTT CONFIGURATION</span>
          </div>
          <div class="mqtt-rows">
            <div class="mr-row" v-for="r in [
              { key:'Status / CMD Topic', val: TOPIC_STATUS, color:'#4ade80' },
              { key:'Auth Topic',         val: TOPIC_AUTH,   color:'#f59e0b' },
              { key:'Broker TCP',         val: BROKER_HOST + `:` + BROKER_PORT, color:'#38bdf8' },
              { key:'Broker WS',          val: BROKER_HOST + `:8083/mqtt`,      color:'#38bdf8' },
              { key:'Gateway (prod)',     val: GATEWAY_URL,  color:'#7dd3fc' },
              { key:'Protocol',           val: 'MQTT v3.1.1 over WebSocket', color:'#94a3b8' },
              { key:'QoS',               val: '0 (at most once)',            color:'#94a3b8' },
            ]" :key="r.key">
              <span class="mr-key">{{ r.key }}</span>
              <span class="mr-val mono" :style="{ color: r.color }">{{ r.val }}</span>
            </div>
          </div>
        </section>

        <!-- Lamp tag map -->
        <section class="ss-section">
          <div class="sec-eyebrow" style="margin-bottom:14px;">
            <span class="ey-line" style="background:#f59e0b;"></span>
            <span class="ey-txt">LAMP TAG MAP (CMD JSON)</span>
          </div>
          <div class="lamp-tag-grid">
            <div class="ltg-item" v-for="i in pp.LAMPS" :key="i"
              :class="{ on: pp.lampActualState[i-1] }">
              <span class="ltg-field mono">Lamp{{ i }}</span>
              <span class="ltg-val" :class="{ on: pp.lampActualState[i-1] }">
                {{ pp.lampActualState[i-1] ? '1' : '0' }}
              </span>
              <span class="ltg-lbl">{{ pp.lampActualState[i-1] ? 'ON' : 'OFF' }}</span>
            </div>
          </div>
        </section>

      </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ─── Root ────────────────────────────────────────────────────────────── */
.ss {
  display: flex; flex-direction: column; gap: 14px;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  min-height: 100%;
}

/* ─── Shared section shell ────────────────────────────────────────────── */
.ss-section {
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex; flex-direction: column; gap: 0;
}

.sec-eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.ey-line { display: block; width: 20px; height: 2px; border-radius: 2px; background: #22c55e; flex-shrink: 0; }
.ey-txt  { font-size: 9px; font-weight: 700; letter-spacing: 3px; color: #1e3040; text-transform: uppercase; }
.scan-badge {
  margin-left: auto; font-size: 9px; font-family: monospace;
  color: #1e3040; letter-spacing: 1px;
}

/* ─── Page header ─────────────────────────────────────────────────────── */
.page-hd {
  display: flex; justify-content: space-between; align-items: flex-end;
  flex-wrap: wrap; gap: 12px;
}
.ph-left { display: flex; flex-direction: column; gap: 5px; }
.ph-eyebrow { display: flex; align-items: center; gap: 8px; }
.ph-title {
  font-size: 24px; font-weight: 900; color: #d0dde8;
  display: flex; align-items: center; gap: 10px; letter-spacing: -0.5px;
}
.ph-title i { font-size: 26px; color: #22c55e; }
.ph-sub { font-size: 11px; color: #253545; }

.ph-right { display: flex; align-items: center; gap: 14px; }
.ph-clock { text-align: right; }
.clk-time {
  display: block; font-size: 28px; font-weight: 800; font-family: monospace;
  color: #2d4050; letter-spacing: 2px; line-height: 1;
}
.clk-date { font-size: 10px; color: #1e3040; letter-spacing: 1px; }

.mqtt-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 20px;
  font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  color: #2d4050;
}
.mb-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.mqtt-badge.connected  { border-color: rgba(34,197,94,0.35); color: #22c55e; }
.mqtt-badge.connecting { border-color: rgba(251,146,60,0.35); color: #fb923c; }
.mqtt-badge.connected  .mb-dot { box-shadow: 0 0 7px rgba(34,197,94,0.9); animation: blink 2s infinite; }

/* ─── Connection bar ──────────────────────────────────────────────────── */
.conn-bar {
  display: flex; align-items: stretch;
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 0 24px;
  gap: 0; flex-wrap: wrap;
}
.cb-item {
  display: flex; align-items: center; gap: 12px;
  padding: 18px 24px;
  border-right: 1px solid rgba(255,255,255,0.05);
}
.cb-item:first-child { padding-left: 0; }
.cb-item:last-child  { padding-right: 0; border-right: none; }
.cb-sep { display: none; }

.cb-icon { font-size: 22px; color: #253545; flex-shrink: 0; }
.cb-item.connected  .cb-icon { color: #22c55e; }
.cb-item.connecting .cb-icon { color: #fb923c; }

.cb-lines { display: flex; flex-direction: column; gap: 4px; }
.cb-key {
  font-size: 9px; font-weight: 700; letter-spacing: 2.5px;
  color: #253545; text-transform: uppercase;
}
.cb-val {
  font-size: 15px; font-weight: 700; color: #4a6575;
}
.cb-val.mono  { font-family: monospace; font-size: 13px; }
.cb-val.green { color: #22c55e; }
.cb-val.amber { color: #f59e0b; }
.cb-item.connected  .cb-val { color: #22c55e; }
.cb-item.connecting .cb-val { color: #fb923c; }

/* ─── Main grid ───────────────────────────────────────────────────────── */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 14px;
  align-items: start;
}
.col-left  { display: flex; flex-direction: column; gap: 12px; }
.col-right { display: flex; flex-direction: column; gap: 12px; }

/* ─── Sensor row ──────────────────────────────────────────────────────── */
.sensor-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.sensor-card {
  background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
  padding: 12px 14px 10px; display: flex; flex-direction: column; gap: 5px;
}
.sc-label { font-size: 9px; font-weight: 700; letter-spacing: 2px; color: #1e3040; text-transform: uppercase; }
.sc-val   { font-size: 26px; font-weight: 800; font-family: monospace; letter-spacing: -1px; line-height: 1; }
.sc-unit  { font-size: 14px; color: #2d4050; margin-left: 3px; font-weight: 500; }
.sc-tag   { font-size: 9px; color: #1e3040; font-family: monospace; }
.sc-bar-outer { height: 3px; border-radius: 2px; background: rgba(255,255,255,0.06); margin-top: 4px; }
.sc-bar-inner { height: 100%; border-radius: 2px; transition: width 0.5s; opacity: 0.5; }

/* ─── Register row ────────────────────────────────────────────────────── */
.reg-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.reg-card {
  background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
  padding: 12px; display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
}
.rk-key  { font-size: 9px; font-weight: 700; letter-spacing: 2px; color: #c084fc; text-transform: uppercase; }
.rk-val  { font-size: 24px; font-weight: 800; font-family: monospace; color: #d0dde8; letter-spacing: -1px; }
.rk-unit { font-size: 9px; color: #1e3040; }

/* ─── Lamp row ────────────────────────────────────────────────────────── */
.lamp-row {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px;
}
.lamp-card {
  background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
  padding: 14px 8px 12px; display: flex; flex-direction: column;
  align-items: center; gap: 6px; transition: all 0.2s;
}
.lamp-card.on { background: rgba(245,158,11,0.07); border-color: rgba(245,158,11,0.35); }

.lc-bulb {
  width: 40px; height: 40px; border-radius: 50%;
  background: #1a1a1a; border: 2px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: #1e3040; transition: all 0.25s;
}
.lc-bulb.on {
  background: radial-gradient(circle at 40% 35%, #fef3c7, #f59e0b);
  border-color: #f59e0b; color: #78350f;
  box-shadow: 0 0 18px rgba(245,158,11,0.6);
}
.lc-name  { font-size: 11px; font-weight: 700; color: #2d4050; }
.lc-state { font-size: 9px; font-weight: 800; letter-spacing: 1.5px; color: #1e3040; }
.lc-state.on { color: #f59e0b; }
.lc-tag   { font-size: 8px; color: #1a2a30; font-family: monospace; }

/* ─── Process row ─────────────────────────────────────────────────────── */
.proc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.proc-card {
  background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;
  padding: 16px; display: flex; flex-direction: column; gap: 6px;
}
.pc-src  { font-size: 9px; font-weight: 700; letter-spacing: 2px; color: #1e3040; }
.pc-val  { font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: -1px; }
.pc-cond { font-size: 10px; color: #1e3040; }
.proc-badge {
  display: inline-flex; align-items: center; gap: 5px; width: fit-content;
  padding: 4px 10px; border-radius: 20px;
  font-size: 9px; font-weight: 800; letter-spacing: 1.5px; border: 1px solid;
}
.pb-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.proc-badge.trig { background: rgba(239,68,68,0.1);  border-color: rgba(239,68,68,0.35);  color: #f87171; }
.proc-badge.trig .pb-dot { box-shadow: 0 0 5px rgba(239,68,68,0.8); animation: blink 1s infinite; }
.proc-badge.near { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.35); color: #fbbf24; }
.proc-badge.idle { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.07); color: #2d4050; }

/* ─── Tag table ───────────────────────────────────────────────────────── */
.tag-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.tag-table th {
  padding: 7px 8px; text-align: left;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: #2d4050;
  text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.07);
  background: #0a0a0a; white-space: nowrap;
}
.tag-table td {
  padding: 7px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  vertical-align: middle;
}
.tag-table tr:last-child td { border-bottom: none; }
.tag-table tr:hover td { background: rgba(255,255,255,0.02); }
.tt-name  { font-size: 11px; color: #3a5060; font-weight: 600; white-space: nowrap; }
.tt-field { font-size: 11px; font-weight: 700; white-space: nowrap; }
.tt-scale { font-size: 10px; color: #3a5060; white-space: nowrap; }
.tt-unit  { font-size: 10px; color: #2d4050; }
.tt-live  { font-size: 13px; font-weight: 800; }
.mono     { font-family: monospace; }

/* ─── MQTT rows ───────────────────────────────────────────────────────── */
.mqtt-rows { display: flex; flex-direction: column; gap: 0; }
.mr-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 2px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.mr-row:last-child { border-bottom: none; }
.mr-key { font-size: 10px; font-weight: 600; color: #2d4050; flex-shrink: 0; }
.mr-val { font-size: 10px; font-weight: 700; text-align: right; word-break: break-all; max-width: 200px; }

/* ─── Lamp tag grid ───────────────────────────────────────────────────── */
.lamp-tag-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;
}
.ltg-item {
  background: #111; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px;
  padding: 10px 6px; display: flex; flex-direction: column; align-items: center; gap: 4px;
  transition: all 0.2s;
}
.ltg-item.on { background: rgba(245,158,11,0.07); border-color: rgba(245,158,11,0.3); }
.ltg-field { font-size: 9px; font-family: monospace; color: #1e3040; }
.ltg-val   { font-size: 18px; font-weight: 800; font-family: monospace; color: #2d4050; }
.ltg-val.on { color: #f59e0b; }
.ltg-lbl   { font-size: 8px; font-weight: 700; letter-spacing: 1px; color: #1e3040; }
.ltg-lbl.on { color: #f59e0b; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
</style>
