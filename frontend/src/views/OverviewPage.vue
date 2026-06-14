<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSensorsStore }      from '@/stores/sensors'
import { useProcessParamStore } from '@/stores/processParam'
import { useAuthorityStore }    from '@/stores/authority'
import { mqttState, mqttLabel, BROKER_HOST, BROKER_PORT, GATEWAY_URL } from '@/composables/useMqtt'

const sensors = useSensorsStore()
const pp      = useProcessParamStore()
const auth    = useAuthorityStore()

// ── Clock ─────────────────────────────────────────────────────────────────
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval>
onMounted  (() => { clockTimer = setInterval(() => now.value = new Date(), 1000) })
onUnmounted(() => clearInterval(clockTimer))
const pad = (v: number) => String(v).padStart(2, '0')
const timeStr = () =>
  `${pad(now.value.getHours())}:${pad(now.value.getMinutes())}:${pad(now.value.getSeconds())}`
const dateStr = () =>
  `${now.value.getFullYear()}/${pad(now.value.getMonth()+1)}/${pad(now.value.getDate())}`
</script>

<template>
  <div class="ov-root">

    <!-- ── Top Status Bar ─────────────────────────────────────────────────── -->
    <div class="status-bar">

      <!-- MQTT -->
      <div class="sb-block mqtt" :class="mqttState">
        <span class="sb-dot"></span>
        <div class="sb-lines">
          <span class="sb-title">MQTT</span>
          <span class="sb-val">{{ mqttState === 'connected' ? 'LIVE' : mqttState === 'connecting' ? 'CONNECTING' : 'OFFLINE' }}</span>
        </div>
      </div>

      <!-- Broker info -->
      <div class="sb-block info">
        <i class="bx bx-server sb-icon"></i>
        <div class="sb-lines">
          <span class="sb-title">BROKER</span>
          <span class="sb-val mono">{{ BROKER_HOST }}:{{ BROKER_PORT }}</span>
        </div>
      </div>

      <!-- Gateway -->
      <div class="sb-block info">
        <i class="bx bx-transfer sb-icon"></i>
        <div class="sb-lines">
          <span class="sb-title">GATEWAY</span>
          <span class="sb-val mono" style="font-size:10px;">{{ GATEWAY_URL }}</span>
        </div>
      </div>

      <!-- Topic -->
      <div class="sb-block info">
        <i class="bx bx-broadcast sb-icon"></i>
        <div class="sb-lines">
          <span class="sb-title">TOPIC</span>
          <span class="sb-val mono">Demo/zenmac/QQ</span>
        </div>
      </div>

      <!-- Authority -->
      <div class="sb-block auth" :class="auth.authHolder.toLowerCase()">
        <i class="bx bx-shield sb-icon"></i>
        <div class="sb-lines">
          <span class="sb-title">AUTHORITY</span>
          <span class="sb-val">{{ auth.authHolder }}</span>
        </div>
      </div>

      <!-- Scan -->
      <div class="sb-block info">
        <i class="bx bx-pulse sb-icon"></i>
        <div class="sb-lines">
          <span class="sb-title">SCAN</span>
          <span class="sb-val mono">{{ sensors.scanMs }} ms</span>
        </div>
      </div>

      <!-- Clock -->
      <div class="sb-block clock">
        <div class="sb-lines" style="align-items:flex-end;">
          <span class="sb-val mono" style="font-size:22px;letter-spacing:2px;color:#80cbc4;">{{ timeStr() }}</span>
          <span class="sb-title" style="text-align:right;">{{ dateStr() }}</span>
        </div>
      </div>
    </div>

    <!-- ── Main Grid ──────────────────────────────────────────────────────── -->
    <div class="ov-grid">

      <!-- ① Temperature Sensors -->
      <div class="panel">
        <div class="panel-hdr">
          <i class="bx bx-thermometer ph-icon" style="color:#00e5ff;"></i>
          <span class="panel-title">Temperature</span>
          <span class="panel-sub">°C</span>
        </div>
        <div class="sensor-cards">
          <div class="sensor-card" v-for="({ val, label, tag }) in [
            { val: sensors.temp1,   label: 'TEMP-1',   tag: 'Temp1111111 ÷10' },
            { val: sensors.temp2,   label: 'TEMP-2',   tag: 'Temp2222 ÷10'    },
            { val: sensors.tempAmb, label: 'AMBIENT',  tag: 'TEMPCOM1 ÷10'    },
          ]" :key="label">
            <div class="sc-label">{{ label }}</div>
            <div class="sc-val cyan">{{ val.toFixed(1) }}<span class="sc-unit">°C</span></div>
            <div class="sc-tag">{{ tag }}</div>
          </div>
        </div>
      </div>

      <!-- ② Humidity -->
      <div class="panel">
        <div class="panel-hdr">
          <i class="bx bx-droplet ph-icon" style="color:#64ffda;"></i>
          <span class="panel-title">Humidity</span>
          <span class="panel-sub">%RH</span>
        </div>
        <div class="big-metric">
          <div class="bm-val teal">{{ sensors.rh.toFixed(1) }}</div>
          <div class="bm-unit">%</div>
        </div>
        <div class="bm-tag">RH2222 ÷10</div>
        <div class="rh-bar-wrap">
          <div class="rh-bar-fill" :style="{ width: Math.min(sensors.rh, 100) + '%' }"></div>
        </div>
      </div>

      <!-- ③ Registers -->
      <div class="panel">
        <div class="panel-hdr">
          <i class="bx bx-chip ph-icon" style="color:#ce93d8;"></i>
          <span class="panel-title">Registers</span>
          <span class="panel-sub">raw</span>
        </div>
        <div class="reg-grid">
          <div class="reg-card" v-for="({ key, val }) in [
            { key:'D300', val: sensors.d300 },
            { key:'D302', val: sensors.d302 },
            { key:'D304', val: sensors.d304 },
            { key:'D306', val: sensors.d306 },
          ]" :key="key">
            <div class="rc-key">{{ key }}</div>
            <div class="rc-val">{{ val }}</div>
          </div>
        </div>
      </div>

      <!-- ④ Lamp Actual State (read-only) -->
      <div class="panel" style="grid-column: span 2;">
        <div class="panel-hdr">
          <i class="bx bx-bulb ph-icon" style="color:#ffa726;"></i>
          <span class="panel-title">Lamp Actual State</span>
          <span class="panel-sub">PLC → Web (read-only)</span>
          <span class="lamp-scan">scan #{{ pp.scanCount }}</span>
        </div>
        <div class="lamp-grid">
          <div
            v-for="i in pp.LAMPS"
            :key="i"
            class="lamp-card"
            :class="{ on: pp.lampActualState[i-1] }"
          >
            <div class="lc-bulb" :class="{ on: pp.lampActualState[i-1] }"></div>
            <div class="lc-no">L{{ i }}</div>
            <div class="lc-state" :class="{ on: pp.lampActualState[i-1] }">
              {{ pp.lampActualState[i-1] ? 'ON' : 'OFF' }}
            </div>
          </div>
        </div>
        <div class="lamp-note">
          คลิก <b style="color:#00e5ff;">Manual</b> เพื่อสั่งงาน Lamp
        </div>
      </div>

      <!-- ⑤ System Info -->
      <div class="panel">
        <div class="panel-hdr">
          <i class="bx bx-info-circle ph-icon" style="color:#90a4ae;"></i>
          <span class="panel-title">System Info</span>
        </div>
        <div class="info-list">
          <div class="info-row">
            <span class="ir-lbl">Project</span>
            <span class="ir-val">ZenMAC R&amp;D · Demo</span>
          </div>
          <div class="info-row">
            <span class="ir-lbl">PLC Tags</span>
            <span class="ir-val mono">Demo/zenmac/QQ</span>
          </div>
          <div class="info-row">
            <span class="ir-lbl">Lamps</span>
            <span class="ir-val">{{ pp.LAMPS }} outputs (L1–L7)</span>
          </div>
          <div class="info-row">
            <span class="ir-lbl">Registers</span>
            <span class="ir-val">D300, D302, D304, D306</span>
          </div>
          <div class="info-row">
            <span class="ir-lbl">Temp Scale</span>
            <span class="ir-val mono">raw ÷ 10 = °C</span>
          </div>
          <div class="info-row">
            <span class="ir-lbl">Authority</span>
            <span class="ir-val" :class="auth.iHaveControl ? 'ok' : 'dim'">
              {{ auth.iHaveControl ? '🔓 WEB (You)' : '🔒 ' + auth.authHolder }}
            </span>
          </div>
          <div class="info-row">
            <span class="ir-lbl">MQTT State</span>
            <span class="ir-val" :class="mqttState === 'connected' ? 'ok' : 'warn'">
              {{ mqttLabel }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.ov-root {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Status Bar ──────────────────────────────────────────────────────────── */
.status-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: stretch;
}

.sb-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.sb-block.clock { margin-left: auto; }

.sb-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #546e7a; flex-shrink: 0;
  transition: background 0.3s;
}
.mqtt.connected .sb-dot    { background: #00e676; box-shadow: 0 0 8px rgba(0,230,118,0.7); animation: pulse 2s infinite; }
.mqtt.connecting .sb-dot   { background: #ffa726; animation: pulse 1s infinite; }
.mqtt.disconnected .sb-dot { background: #ef5350; }

.sb-icon { font-size: 18px; color: #546e7a; }
.sb-lines { display: flex; flex-direction: column; gap: 1px; }
.sb-title { font-size: 8px; font-weight: 700; letter-spacing: 1.5px; color: #37474f; text-transform: uppercase; }
.sb-val   { font-size: 12px; font-weight: 700; color: #90a4ae; }
.sb-val.mono { font-family: var(--font-mono); }

.sb-block.mqtt.connected .sb-val    { color: #00e676; }
.sb-block.mqtt.connecting .sb-val   { color: #ffa726; }
.sb-block.mqtt.disconnected .sb-val { color: #ef5350; }

.sb-block.auth.web   .sb-val { color: #00e676; }
.sb-block.auth.hmi   .sb-val { color: #ffa726; }
.sb-block.auth.local .sb-val { color: #78909c; }

/* ── Main Grid ───────────────────────────────────────────────────────────── */
.ov-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  align-content: start;
}

.panel {
  background: rgba(5, 15, 28, 0.7);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 16px;
}

.panel-hdr {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.ph-icon     { font-size: 18px; }
.panel-title { font-size: 13px; font-weight: 700; color: #b0bec5; letter-spacing: 0.5px; }
.panel-sub   { font-size: 10px; color: #37474f; margin-left: 4px; }
.lamp-scan   { margin-left: auto; font-size: 10px; color: #37474f; font-family: var(--font-mono); }

/* ── Sensor Cards ────────────────────────────────────────────────────────── */
.sensor-cards { display: flex; flex-direction: column; gap: 8px; }
.sensor-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.05);
}
.sc-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #78909c; width: 60px; flex-shrink: 0; }
.sc-val   { font-size: 22px; font-weight: 700; font-family: var(--font-mono); flex: 1; }
.sc-val.cyan { color: #00e5ff; text-shadow: 0 0 10px rgba(0,229,255,0.35); }
.sc-unit  { font-size: 13px; color: #90a4ae; margin-left: 2px; }
.sc-tag   { font-size: 9px; color: #37474f; font-family: var(--font-mono); text-align: right; }

/* ── Humidity Big Metric ─────────────────────────────────────────────────── */
.big-metric { display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px; }
.bm-val { font-size: 52px; font-weight: 700; font-family: var(--font-mono); line-height: 1; }
.bm-val.teal { color: #64ffda; text-shadow: 0 0 20px rgba(100,255,218,0.3); }
.bm-unit { font-size: 22px; color: #90a4ae; }
.bm-tag  { font-size: 10px; color: #37474f; font-family: var(--font-mono); margin-bottom: 12px; }
.rh-bar-wrap {
  height: 6px; border-radius: 3px;
  background: rgba(255,255,255,0.06); overflow: hidden;
}
.rh-bar-fill {
  height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, #26c6da, #64ffda);
  transition: width 0.4s;
}

/* ── Register Grid ───────────────────────────────────────────────────────── */
.reg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.reg-card {
  background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px 12px;
  border: 1px solid rgba(255,255,255,0.05);
}
.rc-key { font-size: 10px; font-weight: 700; color: #ce93d8; letter-spacing: 1px; margin-bottom: 4px; }
.rc-val { font-size: 26px; font-weight: 700; font-family: var(--font-mono); color: #b39ddb; }

/* ── Lamp Grid ───────────────────────────────────────────────────────────── */
.lamp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}
.lamp-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 12px 4px; border-radius: 12px;
  background: rgba(0,0,0,0.2);
  border: 1.5px solid rgba(255,255,255,0.06);
  transition: all 0.25s;
}
.lamp-card.on { border-color: #f9a825; background: rgba(249,168,37,0.1); }

.lc-bulb {
  width: 34px; height: 34px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #2d3e50, #141f2a);
  border: 2px solid rgba(255,255,255,0.07); transition: all 0.3s;
}
.lc-bulb.on {
  background: radial-gradient(circle at 35% 30%, #fff9c4, #f9a825);
  border-color: #f9a825;
  box-shadow: 0 0 16px rgba(249,168,37,0.8), 0 0 32px rgba(249,168,37,0.2);
}
.lc-no    { font-size: 10px; font-weight: 700; color: #78909c; }
.lc-state { font-size: 10px; font-weight: 700; color: #37474f; }
.lc-state.on { color: #f9a825; }

.lamp-note {
  font-size: 11px; color: #37474f; text-align: center;
  padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04);
}

/* ── Info List ───────────────────────────────────────────────────────────── */
.info-list { display: flex; flex-direction: column; gap: 6px; }
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 10px;
  background: rgba(0,0,0,0.15);
  border-radius: 6px;
  font-size: 11px;
}
.ir-lbl { color: #546e7a; font-weight: 600; letter-spacing: 0.5px; }
.ir-val { color: #90a4ae; text-align: right; }
.ir-val.mono { font-family: var(--font-mono); font-size: 10px; color: #64b5f6; }
.ir-val.ok   { color: #00e676; }
.ir-val.warn { color: #ffa726; }
.ir-val.dim  { color: #546e7a; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
</style>
