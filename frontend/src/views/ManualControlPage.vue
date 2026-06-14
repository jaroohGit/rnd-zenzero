<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useAuthorityStore } from '@/stores/authority'
import { useProcessParamStore } from '@/stores/processParam'
import { useSensorsStore } from '@/stores/sensors'
import { mqttConnected } from '@/composables/useMqtt'
import { useProhibit } from '@/composables/useProhibit'

const auth    = useAuthorityStore()
const pp      = useProcessParamStore()
const sensors = useSensorsStore()
const { guardedAction } = useProhibit()

const LAMPS = 7

const lamps = reactive(Array.from({ length: LAMPS }, () => ({
  commanded: null as boolean | null,
  pending: false,
})))
const pendingTimers: ReturnType<typeof setTimeout>[] = Array(LAMPS).fill(null)

function displayOn(i: number): boolean {
  if (lamps[i].commanded !== null) return lamps[i].commanded as boolean
  return pp.lampActualState[i] ?? false
}

watch(
  () => pp.scanCount,
  () => {
    lamps.forEach((lamp, i) => {
      if (!lamp.pending) return
      if (pp.lampActualState[i] === lamp.commanded) {
        lamp.commanded = null
        lamp.pending   = false
        if (pendingTimers[i]) { clearTimeout(pendingTimers[i]); pendingTimers[i] = null as any }
      }
    })
  }
)

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2500)
}

function sendLampCmd(idx: number, state: boolean) {
  guardedAction('lamp' + (idx + 1), 'manual', () => {
    lamps[idx].commanded = state
    lamps[idx].pending = true
    if (pendingTimers[idx]) clearTimeout(pendingTimers[idx])
    pendingTimers[idx] = setTimeout(() => {
      lamps[idx].pending = false
      lamps[idx].commanded = null
    }, 5000) as any
    auth.sendCommand({ ['Lamp' + (idx + 1)]: state ? 1 : 0 })
    showToast('Lamp-' + (idx + 1) + ' → ' + (state ? 'ON' : 'OFF'))
  })
}

function toggleLamp(idx: number) {
  sendLampCmd(idx, !displayOn(idx))
}

function allLamps(state: boolean) {
  guardedAction('all-lamps', 'manual', () => {
    const payload: Record<string, number> = {}
    for (let i = 0; i < LAMPS; i++) {
      payload['Lamp' + (i + 1)] = state ? 1 : 0
      lamps[i].commanded = state
      lamps[i].pending   = true
      if (pendingTimers[i]) clearTimeout(pendingTimers[i])
      pendingTimers[i] = setTimeout(() => { lamps[i].pending = false; lamps[i].commanded = null }, 5000) as any
    }
    auth.sendCommand(payload)
    showToast('ALL LAMPS → ' + (state ? 'ON' : 'OFF'))
  })
}

onMounted(() => {
  lamps.forEach(l => { l.commanded = null; l.pending = false })
})

// Register write
const regs = reactive({ D300: 0, D302: 0, D304: 0, D306: 0 })
const regResult = ref('')

const regKeys = ['D300', 'D302', 'D304', 'D306'] as const
const regPlcMap = {
  D300: () => sensors.d300,
  D302: () => sensors.d302,
  D304: () => sensors.d304,
  D306: () => sensors.d306,
}

function syncRegs() {
  regs.D300 = sensors.d300; regs.D302 = sensors.d302
  regs.D304 = sensors.d304; regs.D306 = sensors.d306
}
onMounted(syncRegs)

function sendRegs() {
  guardedAction('write-regs', 'manual', () => {
    const ok = auth.sendCommand({ ...regs })
    regResult.value = ok ? 'SENT' : 'BLOCKED'
    setTimeout(() => { regResult.value = '' }, 2500)
    showToast('Write Registers → PLC')
  })
}

function step(key: keyof typeof regs, delta: number) {
  regs[key] = Math.max(0, regs[key] + delta)
}
</script>

<template>
  <div class="mc">

    <!-- ── Toast ──────────────────────────────────────────────────────────── -->
    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>

    <!-- ══════════════════════════════════════════════════════════════════════
         GROUP 1 — LAMP OUTPUT CONTROL
    ═══════════════════════════════════════════════════════════════════════ -->
    <section class="mc-section">

      <!-- Section header -->
      <div class="sec-hd">
        <div class="sec-hd-left">
          <div class="sec-eyebrow">
            <span class="ey-line"></span>
            <span class="ey-txt">GROUP 01</span>
          </div>
          <h2 class="sec-title">
            <i class="bx bx-bulb"></i>
            Lamp Output Control
          </h2>
          <p class="sec-sub">{{ LAMPS }} ดวง · PLC Modbus RTU · คลิกเพื่อสั่ง ON / OFF</p>
        </div>
        <div class="sec-hd-right">
          <div class="mqtt-badge" :class="mqttConnected ? 'live' : 'off'">
            <span class="mb-dot"></span>
            {{ mqttConnected ? 'MQTT LIVE' : 'MQTT OFF' }}
          </div>
          <button class="act-btn on" @click="allLamps(true)">
            <i class="bx bx-sun"></i> ALL ON
          </button>
          <button class="act-btn off" @click="allLamps(false)">
            <i class="bx bx-moon"></i> ALL OFF
          </button>
        </div>
      </div>

      <!-- Lamp row -->
      <div class="lamp-row">
        <div
          v-for="(_, i) in lamps" :key="i"
          class="lamp-card"
          :class="{ on: displayOn(i), pending: lamps[i].pending }"
          @click="toggleLamp(i)"
        >
          <!-- Number -->
          <span class="lc-num">{{ String(i + 1).padStart(2, '0') }}</span>

          <!-- Bulb icon -->
          <div class="lc-bulb" :class="{ on: displayOn(i), pending: lamps[i].pending }">
            <i class="bx bx-bulb"></i>
            <div v-if="lamps[i].pending" class="lc-ring"></div>
          </div>

          <!-- Name -->
          <div class="lc-name">Lamp-{{ i + 1 }}</div>

          <!-- State badge -->
          <div class="lc-state" :class="{ on: displayOn(i) }">
            {{ displayOn(i) ? 'ON' : 'OFF' }}
          </div>

          <!-- Source tag -->
          <div v-if="lamps[i].commanded !== null" class="lc-src cmd">CMD</div>
          <div v-else-if="mqttConnected" class="lc-src plc">PLC</div>
        </div>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span class="leg"><span class="leg-dot cmd"></span>CMD = ค่าที่สั่งล่าสุด</span>
        <span class="leg"><span class="leg-dot plc"></span>PLC = ค่าจาก Broker</span>
        <span class="leg">
          <span class="leg-pulse"></span>รอ PLC ยืนยัน
        </span>
        <span class="leg" style="margin-left:auto;color:#1e3040;font-size:10px;">
          PLC actual: {{ pp.lampActualState.map((v,i) => v ? 'L'+(i+1) : '').filter(Boolean).join(', ') || 'all OFF' }}
        </span>
      </div>

    </section>

    <!-- ══════════════════════════════════════════════════════════════════════
         GROUP 2 — REGISTER WRITE
    ═══════════════════════════════════════════════════════════════════════ -->
    <div class="bottom-row">

      <section class="mc-section reg-section">

        <!-- Section header -->
        <div class="sec-hd">
          <div class="sec-hd-left">
            <div class="sec-eyebrow">
              <span class="ey-line cyan"></span>
              <span class="ey-txt">GROUP 02</span>
            </div>
            <h2 class="sec-title">
              <i class="bx bx-transfer-alt"></i>
              Register Write
            </h2>
            <p class="sec-sub">Web → PLC · D300 / D302 / D304 / D306</p>
          </div>
          <div class="sec-hd-right">
            <button class="sync-btn" @click="syncRegs">
              <i class="bx bx-refresh"></i> Sync PLC
            </button>
            <button class="write-btn" @click="sendRegs" :disabled="!auth.iHaveControl || !mqttConnected">
              <i class="bx bx-upload"></i> WRITE TO PLC
            </button>
            <span v-if="regResult" class="wr-result" :class="regResult === 'SENT' ? 'ok' : 'err'">
              {{ regResult }}
            </span>
          </div>
        </div>

        <!-- Register cards -->
        <div class="reg-row">
          <div v-for="k in regKeys" :key="k" class="reg-card">
            <div class="rc-top">
              <span class="rc-key">{{ k }}</span>
              <span class="rc-plc">PLC: <b>{{ regPlcMap[k]() }}</b></span>
            </div>
            <input class="rc-input" type="number" v-model.number="regs[k]" />
            <div class="rc-steps">
              <button class="rc-step" @click="step(k, -10)">−10</button>
              <button class="rc-step" @click="step(k, -1)">−1</button>
              <button class="rc-step" @click="step(k, +1)">+1</button>
              <button class="rc-step" @click="step(k, +10)">+10</button>
            </div>
            <div class="rc-diff" v-if="regs[k] !== regPlcMap[k]()">
              <i class="bx bx-transfer"></i>
              Δ {{ regs[k] - regPlcMap[k]() > 0 ? '+' : '' }}{{ regs[k] - regPlcMap[k]() }}
            </div>
          </div>
        </div>

      </section>

      <!-- Last Command log -->
      <section class="mc-section cmd-section">
        <div class="sec-eyebrow" style="margin-bottom:12px;">
          <span class="ey-line" style="background:#38bdf8"></span>
          <span class="ey-txt">LAST COMMAND</span>
        </div>

        <div class="cmd-row">
          <span class="cmd-lbl">STATUS</span>
          <span class="cmd-val status" :class="auth.lastCmdResult">
            {{ auth.lastCmdResult?.toUpperCase() || '—' }}
          </span>
        </div>
        <div class="cmd-row">
          <span class="cmd-lbl">TOPIC</span>
          <span class="cmd-val mono">{{ auth.lastCmdTopic || '—' }}</span>
        </div>
        <div class="cmd-lbl" style="margin-top:10px;">PAYLOAD</div>
        <div class="cmd-payload">{{ auth.lastCmdPayload || '—' }}</div>
      </section>

    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ─── Page ────────────────────────────────────────────────────────────── */
.mc {
  display: flex; flex-direction: column; gap: 16px;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  min-height: 100%;
  position: relative;
}

/* ─── Toast ───────────────────────────────────────────────────────────── */
.toast {
  position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
  background: #0d0d0d; border: 1px solid rgba(34,197,94,0.35);
  color: #e2e8f0; padding: 10px 24px; border-radius: 24px;
  font-size: 12px; font-weight: 600; z-index: 1000;
  box-shadow: 0 4px 24px rgba(0,0,0,0.6); pointer-events: none;
}
.toast-enter-active, .toast-leave-active { transition: opacity .2s, transform .2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }

/* ─── Section shell ───────────────────────────────────────────────────── */
.mc-section {
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 24px 28px;
  display: flex; flex-direction: column; gap: 20px;
}

/* ─── Section header ──────────────────────────────────────────────────── */
.sec-hd {
  display: flex; justify-content: space-between; align-items: flex-end;
  flex-wrap: wrap; gap: 12px;
}
.sec-hd-left { display: flex; flex-direction: column; gap: 6px; }
.sec-hd-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.sec-eyebrow { display: flex; align-items: center; gap: 8px; }
.ey-line {
  display: block; width: 22px; height: 2px; border-radius: 2px;
  background: #22c55e; flex-shrink: 0;
}
.ey-line.cyan { background: #38bdf8; }
.ey-txt {
  font-size: 9px; font-weight: 700; letter-spacing: 3px;
  color: #1e3040; text-transform: uppercase;
}

.sec-title {
  font-size: 20px; font-weight: 800; color: #d0dde8;
  display: flex; align-items: center; gap: 9px; letter-spacing: -0.3px;
}
.sec-title i { font-size: 22px; color: #22c55e; }
.sec-sub { font-size: 11px; color: #253545; font-weight: 500; }

/* Header action buttons */
.mqtt-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 13px; border-radius: 20px;
  font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  color: #2d4050;
}
.mb-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.mqtt-badge.live { border-color: rgba(34,197,94,0.3); color: #22c55e; }
.mqtt-badge.live .mb-dot { box-shadow: 0 0 6px rgba(34,197,94,0.8); animation: blink 2s infinite; }

.act-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 18px; border-radius: 8px;
  font-size: 12px; font-weight: 700; font-family: inherit;
  cursor: pointer; border: 1px solid; transition: all 0.15s;
  letter-spacing: 0.3px;
}
.act-btn i { font-size: 15px; }
.act-btn.on {
  background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); color: #22c55e;
}
.act-btn.on:hover  { background: rgba(34,197,94,0.2); border-color: rgba(34,197,94,0.6); }
.act-btn.off {
  background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); color: #ef4444;
}
.act-btn.off:hover { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.5); }

/* ─── Lamp row ────────────────────────────────────────────────────────── */
.lamp-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
}

.lamp-card {
  position: relative;
  background: #111;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  padding: 20px 10px 16px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.lamp-card:hover {
  background: #181818;
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-2px);
}
.lamp-card.on {
  background: rgba(245,158,11,0.07);
  border-color: rgba(245,158,11,0.4);
  box-shadow: 0 0 24px rgba(245,158,11,0.1);
}
.lamp-card.on:hover {
  background: rgba(245,158,11,0.12);
  border-color: rgba(245,158,11,0.6);
}
.lamp-card.pending {
  border-color: rgba(56,189,248,0.4) !important;
}

.lc-num {
  font-size: 9px; font-weight: 700; font-family: monospace;
  color: rgba(255,255,255,0.08); letter-spacing: 1px;
  position: absolute; top: 10px; left: 12px;
}

.lc-bulb {
  width: 56px; height: 56px; border-radius: 50%;
  background: #1a1a1a;
  border: 2px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #2d4050;
  transition: all 0.25s; position: relative;
}
.lc-bulb.on {
  background: radial-gradient(circle at 40% 35%, #fef3c7, #f59e0b);
  border-color: #f59e0b;
  color: #78350f;
  box-shadow: 0 0 24px rgba(245,158,11,0.7), 0 0 48px rgba(245,158,11,0.25);
}
.lc-bulb.pending {
  border-color: #38bdf8 !important;
  box-shadow: 0 0 16px rgba(56,189,248,0.4) !important;
}
.lc-ring {
  position: absolute; inset: -6px; border-radius: 50%;
  border: 2px solid rgba(56,189,248,0.5);
  animation: ring-pulse 1s infinite;
}

.lc-name  { font-size: 12px; font-weight: 700; color: #4a5f70; letter-spacing: 0.3px; }
.lc-state {
  font-size: 10px; font-weight: 800; letter-spacing: 2px;
  padding: 3px 10px; border-radius: 20px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  color: #2d4050;
  transition: all 0.2s;
}
.lc-state.on {
  background: rgba(245,158,11,0.15);
  border-color: rgba(245,158,11,0.4);
  color: #f59e0b;
}

.lc-src {
  position: absolute; top: 9px; right: 9px;
  font-size: 8px; font-weight: 800; letter-spacing: 0.8px;
  padding: 2px 6px; border-radius: 6px;
}
.lc-src.cmd {
  background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8;
}
.lc-src.plc {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #2d4050;
}

/* ─── Legend ──────────────────────────────────────────────────────────── */
.legend {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.05);
  font-size: 10px; color: #2d4050;
}
.leg { display: flex; align-items: center; gap: 5px; }
.leg-dot { width: 10px; height: 10px; border-radius: 3px; }
.leg-dot.cmd { background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.35); }
.leg-dot.plc { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
.leg-pulse {
  width: 8px; height: 8px; border-radius: 50%;
  background: #38bdf8; animation: blink 1s infinite;
  box-shadow: 0 0 6px rgba(56,189,248,0.6);
}

/* ─── Bottom row (registers + cmd log) ───────────────────────────────── */
.bottom-row { display: flex; gap: 16px; align-items: flex-start; }
.reg-section { flex: 1; }
.cmd-section { width: 280px; flex-shrink: 0; }

/* ─── Register section ────────────────────────────────────────────────── */
.sec-title i.blue { color: #38bdf8; }

.sync-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 8px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
  color: #3a5060; font-size: 11px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.sync-btn:hover { background: rgba(255,255,255,0.08); color: #6a8090; }
.sync-btn i { font-size: 14px; }

.write-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 8px;
  background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3);
  color: #38bdf8; font-size: 12px; font-weight: 700; font-family: inherit;
  cursor: pointer; transition: all 0.15s; letter-spacing: 0.3px;
}
.write-btn:hover:not(:disabled) { background: rgba(56,189,248,0.18); border-color: rgba(56,189,248,0.55); }
.write-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.write-btn i { font-size: 15px; }

.wr-result {
  font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
  padding: 5px 12px; border-radius: 20px;
}
.wr-result.ok  { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; }
.wr-result.err { background: rgba(239,68,68,0.1);  border: 1px solid rgba(239,68,68,0.3);  color: #ef4444; }

.reg-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.reg-card {
  background: #111;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 14px 12px;
  display: flex; flex-direction: column; gap: 10px;
  transition: border-color 0.15s;
}
.reg-card:hover { border-color: rgba(56,189,248,0.2); }

.rc-top {
  display: flex; justify-content: space-between; align-items: flex-start;
}
.rc-key {
  font-size: 13px; font-weight: 800; letter-spacing: 1px;
  color: #d0dde8; font-family: monospace;
}
.rc-plc {
  font-size: 10px; color: #253545; text-align: right; line-height: 1.4;
}
.rc-plc b { color: #38bdf8; font-weight: 700; }

.rc-input {
  width: 100%;
  padding: 10px 8px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e2e8f0; font-size: 22px; font-weight: 800;
  font-family: monospace; text-align: center;
  transition: border-color 0.15s;
}
.rc-input:focus { outline: none; border-color: rgba(56,189,248,0.5); }
.rc-input::-webkit-outer-spin-button,
.rc-input::-webkit-inner-spin-button { -webkit-appearance: none; }

.rc-steps {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;
}
.rc-step {
  padding: 5px 0; border-radius: 7px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #4a6070; font-size: 11px; font-weight: 700; font-family: inherit;
  cursor: pointer; transition: all 0.12s; white-space: nowrap; text-align: center;
}
.rc-step:hover {
  background: rgba(56,189,248,0.1); border-color: rgba(56,189,248,0.3); color: #38bdf8;
}

.rc-diff {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; color: #f59e0b; font-weight: 600;
}
.rc-diff i { font-size: 12px; }

/* ─── CMD log ─────────────────────────────────────────────────────────── */
.cmd-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
}
.cmd-lbl {
  font-size: 9px; font-weight: 700; letter-spacing: 2px;
  color: #1e3040; text-transform: uppercase;
}
.cmd-val { font-size: 12px; font-weight: 700; color: #3a5060; }
.cmd-val.mono { font-family: monospace; font-size: 10px; word-break: break-all; text-align: right; max-width: 160px; }
.cmd-val.status.ok      { color: #22c55e; }
.cmd-val.status.blocked { color: #ef4444; }
.cmd-val.status.no-mqtt { color: #f59e0b; }

.cmd-payload {
  margin-top: 8px;
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;
  padding: 10px; font-size: 10px; font-family: monospace; color: #38bdf8;
  word-break: break-all; max-height: 120px; overflow-y: auto; line-height: 1.6;
}

/* ─── Animations ──────────────────────────────────────────────────────── */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
@keyframes ring-pulse {
  0%   { transform: scale(1);   opacity: 0.7; }
  100% { transform: scale(1.3); opacity: 0; }
}
</style>
