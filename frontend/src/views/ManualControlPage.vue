<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useAuthorityStore } from '@/stores/authority'
import { useProcessParamStore } from '@/stores/processParam'
import { mqttConnected } from '@/composables/useMqtt'
import { useProhibit } from '@/composables/useProhibit'
import PanelCard from '@/components/shared/PanelCard.vue'

const auth = useAuthorityStore()
const pp   = useProcessParamStore()
const { guardedAction } = useProhibit()

const LAMPS = 7

// Local commanded state — ค่าที่ user สั่งล่าสุด
const lamps = reactive(Array.from({ length: LAMPS }, (_, i) => ({
  commanded: false as boolean | null,  // null = ยังไม่สั่ง (แสดงจาก PLC)
  pending: false,                       // รอ PLC ตอบกลับ
})))

// pendingTimer per lamp — ถ้า PLC ไม่ตอบใน 5 วิ ให้ reset commanded
const pendingTimers: ReturnType<typeof setTimeout>[] = Array(LAMPS).fill(null)

// ค่าที่แสดง = commanded ถ้ามี, ไม่อย่างนั้นใช้ actual จาก PLC
function displayOn(i: number): boolean {
  if (lamps[i].commanded !== null) return lamps[i].commanded as boolean
  return pp.lampActualState[i] ?? false
}

// เมื่อ MQTT ส่งค่าจริงกลับมา ถ้าตรงกับที่สั่ง → ยืนยัน pending
watch(
  () => [...pp.lampActualState],
  (actual) => {
    actual.forEach((actualOn, i) => {
      if (lamps[i].pending) {
        // PLC ส่งค่ากลับมา — clear pending หลัง 0.5 วิ (รอ UI update)
        setTimeout(() => {
          if (lamps[i].commanded !== null) {
            const ok = actualOn === lamps[i].commanded
            if (ok || true) {   // accept PLC response always
              lamps[i].commanded = null
              lamps[i].pending = false
              if (pendingTimers[i]) { clearTimeout(pendingTimers[i]); pendingTimers[i] = null as any }
            }
          }
        }, 500)
      }
    })
  }
)

// Toast
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2500)
}

function sendLampCmd(idx: number, state: boolean) {
  const lampNo = idx + 1
  guardedAction('lamp' + lampNo, 'manual', () => {
    lamps[idx].commanded = state
    lamps[idx].pending = true
    if (pendingTimers[idx]) clearTimeout(pendingTimers[idx])
    pendingTimers[idx] = setTimeout(() => { lamps[idx].pending = false }, 5000) as any
    auth.sendCommand({ ['Lamp' + lampNo]: state ? 1 : 0 })
    showToast('💡 Lamp' + lampNo + ' → ' + (state ? 'ON' : 'OFF') + ' (sent)')
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
      lamps[i].pending = true
      if (pendingTimers[i]) clearTimeout(pendingTimers[i])
      pendingTimers[i] = setTimeout(() => { lamps[i].pending = false }, 5000) as any
    }
    auth.sendCommand(payload)
    showToast('💡 ALL LAMPS → ' + (state ? 'ON' : 'OFF'))
  })
}

// sync initial state เมื่อ MQTT เชื่อมต่อครั้งแรก
onMounted(() => {
  // ถ้ามีข้อมูล actual แล้ว reset commanded
  lamps.forEach((l, i) => { l.commanded = null; l.pending = false })
})
</script>

<template>
  <div class="page-grid">

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>

    <PanelCard
      color="green"
      style="grid-column:span 3;"
      :prohibited="!auth.iHaveControl"
      :lock-sub="'สิทธิ์อยู่ที่ ' + auth.authHolder + ' — กด REQUEST CONTROL ที่ Header'"
    >
      <div class="panel-title" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <span>
          <span style="font-size:16px;">💡</span>
          Manual Lamp / Output Control ({{ LAMPS }} ดวง)
        </span>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <!-- MQTT + Control status -->
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;">
            <span class="status-dot" :class="mqttConnected ? 'ok' : 'off'"></span>
            <span :style="{ color: mqttConnected ? '#00e676' : '#546e7a' }">
              {{ mqttConnected ? 'MQTT ✓' : 'MQTT OFF' }}
            </span>
          </div>
          <button class="ctrl-btn on"  @click="allLamps(true)">ALL ON</button>
          <button class="ctrl-btn off" @click="allLamps(false)">ALL OFF</button>
        </div>
      </div>

      <div class="lamp-grid">
        <div
          v-for="(_, i) in lamps"
          :key="i"
          class="lamp-card"
          :class="{
            on: displayOn(i),
            pending: lamps[i].pending,
            commanded: lamps[i].commanded !== null,
          }"
          @click="toggleLamp(i)"
        >
          <div class="bulb" :class="{ on: displayOn(i) }"></div>
          <div class="lamp-name">Lamp-{{ i + 1 }}</div>
          <div class="lamp-state" :class="{ active: displayOn(i) }">
            {{ displayOn(i) ? 'ON' : 'OFF' }}
          </div>
          <!-- pending indicator -->
          <div v-if="lamps[i].pending" class="pending-dot"></div>
          <!-- actual vs commanded -->
          <div v-if="lamps[i].commanded !== null" class="source-tag">CMD</div>
          <div v-else-if="mqttConnected" class="source-tag plc">PLC</div>
        </div>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span class="leg-item">
          <span class="leg-dot cmd"></span> CMD = ค่าที่สั่งล่าสุด
        </span>
        <span class="leg-item">
          <span class="leg-dot plc"></span> PLC = ค่าจาก Broker
        </span>
        <span class="leg-item">
          <span class="pending-dot inline"></span> รอ PLC ยืนยัน
        </span>
        <span class="leg-item" style="margin-left:auto;font-size:10px;color:#37474f;">
          PLC actual: {{ pp.lampActualState.map((v,i) => v ? 'L'+(i+1) : '').filter(Boolean).join(', ') || 'all OFF' }}
        </span>
      </div>
    </PanelCard>

    <!-- Register Write Panel -->
    <PanelCard color="purple" title="Write Registers (Web→PLC)" icon="📝"
               :prohibited="!auth.iHaveControl"
               lock-sub="กด REQUEST CONTROL ก่อน">
      <WriteRegisters />
    </PanelCard>

    <!-- Live Read Panel -->
    <PanelCard color="teal" title="Read Registers (PLC→Web)" icon="📡">
      <ReadRegisters />
    </PanelCard>

    <!-- CMD Send history -->
    <PanelCard color="blue" title="Last Command" icon="📤">
      <div class="stat-item">
        <div class="stat-lbl">STATUS</div>
        <div class="big-val" :class="auth.lastCmdResult === 'ok' ? 'ok' : auth.lastCmdResult === 'blocked' ? 'err' : 'warn'">
          {{ auth.lastCmdResult?.toUpperCase() || '—' }}
        </div>
      </div>
      <div style="margin-top:10px;">
        <div class="stat-lbl" style="margin-bottom:4px;">TOPIC</div>
        <div style="font-size:11px;font-family:var(--font-mono);color:#64ffda;word-break:break-all;">
          {{ auth.lastCmdTopic || '—' }}
        </div>
      </div>
      <div style="margin-top:10px;">
        <div class="stat-lbl" style="margin-bottom:4px;">PAYLOAD</div>
        <div style="font-size:10px;font-family:var(--font-mono);color:#80cbc4;word-break:break-all;
                    background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;max-height:80px;overflow:auto;">
          {{ auth.lastCmdPayload || '—' }}
        </div>
      </div>
    </PanelCard>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref as _ref, reactive as _reactive } from 'vue'
import { useAuthorityStore as _useAuthorityStore } from '@/stores/authority'
import { useSensorsStore } from '@/stores/sensors'

// ── WriteRegisters sub-component ──
const WriteRegisters = defineComponent({
  setup() {
    const auth    = _useAuthorityStore()
    const sensors = useSensorsStore()
    const regs = _reactive({ D300: 0, D302: 0, D304: 0, D306: 0 })
    const result = _ref('')

    function init() {
      regs.D300 = sensors.d300; regs.D302 = sensors.d302
      regs.D304 = sensors.d304; regs.D306 = sensors.d306
    }
    init()

    function sendRegs() {
      const ok = auth.sendCommand({ ...regs })
      result.value = ok ? '✅ Sent' : '🔒 Blocked'
      setTimeout(() => { result.value = '' }, 2500)
    }
    return { regs, result, sendRegs }
  },
  template: `
    <div class="reg-grid">
      <div v-for="k in ['D300','D302','D304','D306']" :key="k" class="reg-item">
        <div class="stat-lbl">{{ k }}</div>
        <input class="hmi-input" type="number" style="width:100%;" v-model.number="regs[k]" />
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:10px;">
      <button class="btn btn-save" style="flex:1;" @click="sendRegs">📤 Write to PLC</button>
      <span v-if="result" style="font-size:12px;font-weight:700;color:#00e676;">{{ result }}</span>
    </div>
  `
})

// ── ReadRegisters sub-component ──
const ReadRegisters = defineComponent({
  setup() {
    const sensors = useSensorsStore()
    return { sensors }
  },
  template: `
    <div class="reg-grid">
      <div class="reg-item"><div class="stat-lbl">D300</div><div class="reg-val">{{ sensors.d300 }}</div></div>
      <div class="reg-item"><div class="stat-lbl">D302</div><div class="reg-val">{{ sensors.d302 }}</div></div>
      <div class="reg-item"><div class="stat-lbl">D304</div><div class="reg-val">{{ sensors.d304 }}</div></div>
      <div class="reg-item"><div class="stat-lbl">D306</div><div class="reg-val">{{ sensors.d306 }}</div></div>
    </div>
  `
})

export default { components: { WriteRegisters, ReadRegisters } }
</script>

<style scoped>
.page-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; position:relative; }

.toast {
  position:fixed; bottom:60px; left:50%; transform:translateX(-50%);
  background:rgba(10,24,38,0.96); border:1px solid rgba(0,229,255,0.35);
  color:#e0f0ff; padding:10px 24px; border-radius:24px;
  font-size:13px; font-weight:600; z-index:1000;
  box-shadow:0 4px 20px rgba(0,0,0,0.5); pointer-events:none;
}
.toast-enter-active,.toast-leave-active { transition:opacity .25s,transform .25s; }
.toast-enter-from,.toast-leave-to { opacity:0; transform:translateX(-50%) translateY(10px); }

.status-dot { width:9px; height:9px; border-radius:50%; display:inline-block; }
.status-dot.ok  { background:#00e676; box-shadow:0 0 6px rgba(0,230,118,0.6); }
.status-dot.off { background:#37474f; }

.lamp-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:12px; margin-top:8px; }

.lamp-card {
  background:rgba(0,0,0,0.3); border-radius:14px; padding:16px 6px;
  border:1.5px solid rgba(255,255,255,0.07);
  display:flex; flex-direction:column; align-items:center; gap:8px;
  cursor:pointer; transition:all .2s; position:relative;
}
.lamp-card:hover     { border-color:rgba(0,229,255,0.3); background:rgba(0,229,255,0.04); }
.lamp-card.on        { border-color:#f9a825; background:rgba(249,168,37,0.1); }
.lamp-card.pending   { border-color:#42a5f5 !important; }
.lamp-card.commanded { box-shadow: 0 0 8px rgba(0,229,255,0.2); }

.bulb {
  width:44px; height:44px; border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#37474f,#1a2530);
  border:2px solid rgba(255,255,255,0.1); transition:all .3s;
}
.bulb.on {
  background:radial-gradient(circle at 35% 30%,#fff9c4,#f9a825);
  border-color:#f9a825;
  box-shadow:0 0 20px rgba(249,168,37,0.8),0 0 40px rgba(249,168,37,0.3);
}
.lamp-name  { font-size:11px; font-weight:700; color:#90a4ae; }
.lamp-state { font-size:11px; font-weight:700; color:#546e7a; letter-spacing:1px; }
.lamp-state.active { color:#f9a825; }

.pending-dot {
  width:8px; height:8px; border-radius:50%; background:#42a5f5;
  position:absolute; top:6px; right:6px;
  box-shadow:0 0 6px rgba(66,165,245,0.7);
  animation:pulse 1s infinite;
}
.pending-dot.inline { position:static; display:inline-block; margin-right:4px; }

.source-tag {
  font-size:8px; font-weight:800; letter-spacing:1px;
  padding:1px 5px; border-radius:8px;
  background:rgba(0,229,255,0.15); color:#00e5ff; border:1px solid rgba(0,229,255,0.3);
}
.source-tag.plc { background:rgba(120,144,156,0.15); color:#78909c; border-color:rgba(120,144,156,0.3); }

.ctrl-btn { padding:7px 16px; border-radius:7px; border:none; font-size:11px; font-weight:700; cursor:pointer; }
.ctrl-btn.on  { background:linear-gradient(135deg,#2e7d32,#00e676); color:#fff; }
.ctrl-btn.off { background:linear-gradient(135deg,#b71c1c,#ef9a9a); color:#fff; }

.legend {
  display:flex; align-items:center; gap:16px; flex-wrap:wrap;
  margin-top:12px; padding-top:10px; border-top:1px solid var(--border);
  font-size:10px; color:#546e7a;
}
.leg-item { display:flex; align-items:center; gap:5px; }
.leg-dot  { width:10px; height:10px; border-radius:3px; }
.leg-dot.cmd { background:rgba(0,229,255,0.2); border:1px solid rgba(0,229,255,0.4); }
.leg-dot.plc { background:rgba(120,144,156,0.2); border:1px solid rgba(120,144,156,0.3); }

/* Register & stat items (shared with sub-components) */
.reg-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.reg-item { background:var(--bg-item); border-radius:8px; padding:8px 10px; border:1px solid var(--border); }
.reg-val  { font-size:22px; font-weight:700; font-family:var(--font-mono); color:#80cbc4; margin-top:4px; }
.stat-lbl { font-size:10px; font-weight:700; letter-spacing:1.5px; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; }
.stat-item { background:var(--bg-item); border-radius:8px; padding:10px 12px; border:1px solid var(--border); }
.big-val  { font-size:22px; font-weight:800; font-family:var(--font-mono); }
.ok  { color:#00e676; }
.err { color:#ef5350; }
.warn { color:#ffa726; }
</style>
