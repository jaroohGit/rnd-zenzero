<script setup lang="ts">
import { useAuthorityStore } from '@/stores/authority'
import { useBlowerStore } from '@/stores/blower'
import { useProhibit } from '@/composables/useProhibit'
import PanelCard from '@/components/shared/PanelCard.vue'

const auth   = useAuthorityStore()
const blower = useBlowerStore()
const { guardedAction } = useProhibit()

function stateClass(s: string) {
  return s === 'RUN' ? 'badge-run' : s === 'STBY' ? 'badge-stby' : 'badge-stop'
}
function autoBadgeClass(m: string) {
  return m === 'manual' ? '' : 'auto-active'
}

function bloCmd(id: number, cmd: string) {
  guardedAction('blo' + id + '-' + cmd, 'blower', () => {
    blower.bloCmd(id, cmd)
  })
}

function setBloAutoGuarded(id: number, e: Event) {
  const mode = (e.target as HTMLSelectElement).value as 'manual' | 'auto_orp' | 'auto_ph'
  guardedAction('blo' + id + '-mode', 'blower', () => {
    blower.setBloAuto(id, mode)
  })
}
</script>

<template>
  <div class="page-grid">
    <PanelCard
      color="green"
      style="grid-column:span 3;"
      :prohibited="!auth.iHaveControl"
      lock-sub="ต้องถือสิทธิ์ WEB จึงจะสั่ง Blower ได้"
    >
      <div class="panel-title"><span>🌀</span> Turbo Blower Control</div>

      <div class="blo-grid">
        <div v-for="b in blower.blowers" :key="b.id" class="blo-card">
          <!-- Card Header -->
          <div class="blo-head">
            <div>
              <div class="blo-name">{{ b.name }}</div>
              <div class="blo-tag">{{ b.tag }}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              <span class="badge" :class="stateClass(b.state)">{{ b.state }}</span>
              <span class="auto-badge" :class="autoBadgeClass(b.auto)">
                {{ b.auto === 'manual' ? 'MANUAL' : b.auto === 'auto_orp' ? 'AUTO-ORP' : 'AUTO-pH' }}
              </span>
            </div>
          </div>

          <!-- Metrics -->
          <div class="blo-metrics">
            <div class="blo-metric">
              <div class="blo-m-lbl">Power</div>
              <div class="blo-m-val">{{ b.kw.toFixed(1) }}</div>
              <div class="blo-m-unit">kW</div>
            </div>
            <div class="blo-metric">
              <div class="blo-m-lbl">Flow</div>
              <div class="blo-m-val">{{ b.cmm }}</div>
              <div class="blo-m-unit">CMM</div>
            </div>
            <div class="blo-metric">
              <div class="blo-m-lbl">Discharge T</div>
              <div class="blo-m-val">{{ b.dt }}</div>
              <div class="blo-m-unit">°C</div>
            </div>
          </div>

          <div class="blo-metrics" style="grid-template-columns:1fr 1fr;margin-bottom:10px;">
            <div class="blo-metric">
              <div class="blo-m-lbl">ORP (AT01)</div>
              <div class="blo-m-val" style="color:#80cbc4;">{{ b.sensorFault ? 'FAULT' : b.orp }}</div>
              <div class="blo-m-unit">mV</div>
            </div>
            <div class="blo-metric">
              <div class="blo-m-lbl">pH (AT01)</div>
              <div class="blo-m-val" style="color:#ce93d8;">{{ b.sensorFault ? 'FAULT' : b.ph.toFixed(2) }}</div>
              <div class="blo-m-unit">pH</div>
            </div>
          </div>

          <!-- Auto mode selector -->
          <div class="blo-auto-row">
            <span style="font-size:10px;color:#78909c;letter-spacing:1px;text-transform:uppercase;">Mode</span>
            <select
              class="hmi-select"
              style="flex:1;"
              :value="b.auto"
              @change="setBloAutoGuarded(b.id, $event)"
            >
              <option value="manual">Manual</option>
              <option value="auto_orp">Auto-ORP (BL-05)</option>
              <option value="auto_ph">Auto-pH (BL-06)</option>
            </select>
            <button
              class="fault-btn"
              :class="{ fault: b.sensorFault }"
              @click="blower.toggleFault(b.id)"
            >{{ b.sensorFault ? 'Sensor FAULT' : 'Sensor OK' }}</button>
          </div>

          <!-- Speed slider -->
          <div class="blo-sp-row">
            <span style="font-size:11px;color:#90a4ae;">
              Speed setpoint
              <span class="blo-safety">Safety: max {{ blower.SPEED_CAP }}%</span>
            </span>
            <span style="font-size:18px;font-weight:800;font-family:var(--font-mono);color:#00e5ff;">
              {{ b.speed }}%{{ b.auto !== 'manual' ? ' ⟳' : '' }}
            </span>
          </div>
          <input
            type="range" min="0" max="100" :value="b.speed"
            class="blo-slider"
            :style="{ opacity: b.auto !== 'manual' ? '0.5' : '1' }"
            @input="blower.onSlide(b.id, parseInt(($event.target as HTMLInputElement).value))"
          />
          <div class="blo-cap">
            <div class="blo-cap-fill" :style="{ width: b.speed + '%' }"></div>
            <div class="blo-cap-max"></div>
          </div>

          <!-- Control Buttons -->
          <div class="blo-btns">
            <button class="blo-btn start" @click="bloCmd(b.id, 'start')">START</button>
            <button class="blo-btn stby"  @click="bloCmd(b.id, 'standby')">STANDBY</button>
            <button class="blo-btn stop"  @click="bloCmd(b.id, 'stop')">STOP</button>
            <button class="blo-btn apply" @click="bloCmd(b.id, 'setpoint')">APPLY %</button>
          </div>
        </div>
      </div>
    </PanelCard>
  </div>
</template>

<style scoped>
.page-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.blo-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.blo-card  {
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--border);
  border-radius: 12px; padding: 14px;
}
.blo-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.blo-name { font-size: 15px; font-weight: 700; }
.blo-tag  { font-size: 10px; font-family: var(--font-mono); color: #546e7a; letter-spacing: 1px; }
.blo-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.blo-metric  { background: var(--bg-item); border-radius: 8px; padding: 8px; text-align: center; border: 1px solid var(--border); }
.blo-m-lbl { font-size: 9px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; }
.blo-m-val { font-size: 20px; font-weight: 700; font-family: var(--font-mono); color: #00e676; }
.blo-m-unit { font-size: 10px; color: #90a4ae; }
.blo-auto-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.blo-sp-row   { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.blo-safety   { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: rgba(239,83,80,0.18); color: #ef9a9a; border: 1px solid rgba(239,83,80,0.4); margin-left: 6px; }
.blo-slider {
  width: 100%; -webkit-appearance: none; height: 6px;
  border-radius: 3px; background: rgba(255,255,255,0.12);
  outline: none; margin: 8px 0; cursor: pointer;
}
.blo-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px;
  border-radius: 50%; background: var(--accent); cursor: pointer;
  box-shadow: 0 0 8px rgba(0,229,255,0.6);
}
.blo-cap { position: relative; height: 5px; background: rgba(0,0,0,0.4); border-radius: 3px; margin-bottom: 12px; overflow: hidden; }
.blo-cap-fill { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #00e676, #ffa726); border-radius: 3px; transition: width .2s; }
.blo-cap-max  { position: absolute; left: 95%; top: -2px; bottom: -2px; width: 2px; background: #ef5350; }
.blo-btns { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.blo-btn { padding: 9px 0; border-radius: 8px; border: 1px solid var(--border); background: rgba(255,255,255,0.04); color: #cfd8dc; font-size: 11px; font-weight: 700; cursor: pointer; transition: all .15s; }
.blo-btn:hover { filter: brightness(1.2); }
.blo-btn.start { background: rgba(0,230,118,0.15); color: #00e676; border-color: #00e676; }
.blo-btn.stop  { background: rgba(239,83,80,0.15); color: #ef9a9a; border-color: #ef5350; }
.blo-btn.stby  { background: rgba(255,167,38,0.12); color: #ffa726; border-color: #ffa726; }
.blo-btn.apply { background: linear-gradient(135deg,#1565c0,#00e5ff); color: #fff; border: none; }
.auto-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: rgba(120,144,156,0.2); color: #90a4ae; border: 1px solid var(--border); }
.auto-badge.auto-active { background: rgba(206,147,216,0.18); color: #ce93d8; border-color: #ce93d8; box-shadow: 0 0 8px rgba(206,147,216,0.3); }
.fault-btn { font-size: 10px; font-weight: 700; padding: 5px 10px; border-radius: 6px; cursor: pointer; background: rgba(0,230,118,0.12); color: #00e676; border: 1px solid rgba(0,230,118,0.3); }
.fault-btn.fault { background: rgba(239,83,80,0.18); color: #ef9a9a; border-color: #ef5350; }
</style>
