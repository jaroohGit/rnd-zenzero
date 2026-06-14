<script setup lang="ts">
import { useSensorsStore } from '@/stores/sensors'
import { useAuthorityStore } from '@/stores/authority'
import { mqttState, mqttLabel, mqttConnected } from '@/composables/useMqtt'

const sensors = useSensorsStore()
const auth    = useAuthorityStore()
</script>

<template>
  <footer class="app-footer">
    <div class="footer-left">
      <div class="footer-chip">
        <i class="bx bx-chip"></i>
        PLC Modbus RTU
      </div>
      <div class="footer-chip">
        <span class="chip-dot"
          :class="auth.iHaveControl ? 'green' : auth.authHolder === 'HMI' ? 'orange' : 'dim'"></span>
        Control: <b>{{ auth.authHolder }}</b>
      </div>
      <div class="footer-chip">
        <i class="bx bx-time-five"></i>
        Scan: <span class="mono">{{ sensors.scanMs }} ms</span>
      </div>
    </div>
    <div class="footer-right">
      <div class="footer-chip" :class="mqttConnected ? 'live' : ''">
        <span class="chip-dot" :class="mqttState"></span>
        {{ mqttLabel }}
      </div>
      <div class="footer-chip dim-text">
        ZenMAC R&amp;D · Demo HMI v1.0
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: #071424;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 0 20px;
  height: 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.footer-left, .footer-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 6px;
  font-size: 10px; font-weight: 600;
  color: #37474f;
  border: 1px solid transparent;
  letter-spacing: 0.3px;
}
.footer-chip i { font-size: 12px; }
.footer-chip.live { color: #00e676; }
.footer-chip.dim-text { color: #1e3a52; }

.chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #263238;
}
.chip-dot.green     { background: #00e676; }
.chip-dot.orange    { background: #ffa726; }
.chip-dot.dim       { background: #37474f; }
.chip-dot.connected { background: #00e676; }
.chip-dot.connecting{ background: #ffa726; }

.mono { font-family: 'Courier New', monospace; color: #546e7a; }
</style>
