<script setup lang="ts">
import { computed } from 'vue'
import { useAuthorityStore } from '@/stores/authority'
import { useProhibitStore } from '@/stores/prohibit'
import { mqttConnected } from '@/composables/useMqtt'

const auth    = useAuthorityStore()
const prohibit = useProhibitStore()

const tierColor = computed(() => {
  if (auth.authHolder === 'WEB')   return '#00e676'
  if (auth.authHolder === 'HMI')   return '#ffa726'
  return '#546e7a'
})

const blockCount = computed(() => prohibit.activeBlocks.length)

const lastOp = computed(() => prohibit.operationLog[0] ?? null)
</script>

<template>
  <div class="prohibit-bar">
    <div class="pb-chip" :style="{ borderColor: tierColor, color: tierColor }">
      <span class="pb-dot" :style="{ background: tierColor }"></span>
      {{ auth.authHolder }}
    </div>

    <div class="pb-chip" :class="mqttConnected ? 'pb-ok' : 'pb-off'">
      {{ mqttConnected ? 'MQTT OK' : 'MQTT OFF' }}
    </div>

    <div v-if="prohibit.currentMode" class="pb-chip pb-mode">
      MODE: {{ prohibit.currentMode }}
    </div>

    <div v-if="blockCount > 0" class="pb-chip pb-err">
      {{ blockCount }} BLOCK{{ blockCount > 1 ? 'S' : '' }}
    </div>

    <div v-if="lastOp" class="pb-last">
      Last: {{ lastOp.action }}
      <span v-if="lastOp.blocked" class="pb-blocked-tag">BLOCKED</span>
    </div>
  </div>
</template>

<style scoped>
.prohibit-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  background: rgba(0,0,0,0.3);
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.pb-chip {
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.15);
  color: #78909c;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 5px;
}
.pb-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pb-ok   { color: #00e676; border-color: rgba(0,230,118,0.4); }
.pb-off  { color: #546e7a; border-color: rgba(84,110,122,0.4); }
.pb-mode { color: #ce93d8; border-color: rgba(206,147,216,0.4); }
.pb-err  { color: #ef9a9a; border-color: rgba(239,83,80,0.4); }
.pb-last {
  margin-left: auto;
  color: #546e7a;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.pb-blocked-tag {
  color: #ef9a9a;
  background: rgba(239,83,80,0.15);
  border: 1px solid rgba(239,83,80,0.3);
  border-radius: 8px;
  padding: 1px 6px;
  font-size: 8px;
}
</style>
