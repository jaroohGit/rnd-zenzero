<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { BlockCode } from '@/stores/prohibit'

interface ToastEntry {
  id: number
  code: BlockCode
  reason: string
  action: string
  page: string
}

const COLORS: Record<BlockCode, string> = {
  AUTHORITY_BLOCK: '#ff4040',
  OFFLINE_BLOCK:   '#8aa2b8',
  MODE_CONFLICT:   '#ffb800',
  DUPLICATE_OP:    '#a855f7',
  COOLDOWN_LOCK:   '#00d4ff',
}

const ICONS: Record<BlockCode, string> = {
  AUTHORITY_BLOCK: '🔒',
  OFFLINE_BLOCK:   '📡',
  MODE_CONFLICT:   '⚠️',
  DUPLICATE_OP:    '⏳',
  COOLDOWN_LOCK:   '❄️',
}

let seq = 0
const toasts = ref<ToastEntry[]>([])

function onBlock(e: Event) {
  const { code, reason, action, page } = (e as CustomEvent).detail
  const entry: ToastEntry = { id: seq++, code, reason, action, page }
  toasts.value.push(entry)
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== entry.id)
  }, 3000)
}

onMounted(() => window.addEventListener('prohibit-block', onBlock))
onUnmounted(() => window.removeEventListener('prohibit-block', onBlock))
</script>

<template>
  <Teleport to="body">
    <div class="pt-stack">
      <TransitionGroup name="pt">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pt-toast"
          :style="{ '--tc': COLORS[t.code] }"
        >
          <span class="pt-icon">{{ ICONS[t.code] }}</span>
          <div class="pt-body">
            <div class="pt-code">{{ t.code }}</div>
            <div class="pt-reason">{{ t.reason }}</div>
            <div class="pt-ctx">{{ t.page }} · {{ t.action }}</div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.pt-stack {
  position: fixed;
  bottom: 70px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
}
.pt-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(10,24,38,0.97);
  border: 1px solid var(--tc);
  border-left: 4px solid var(--tc);
  border-radius: 10px;
  padding: 10px 14px;
  min-width: 280px;
  max-width: 360px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.6);
  color: #e0f0ff;
}
.pt-icon   { font-size: 18px; line-height: 1; padding-top: 2px; }
.pt-body   { flex: 1; }
.pt-code   { font-size: 10px; font-weight: 800; letter-spacing: 2px; color: var(--tc); text-transform: uppercase; margin-bottom: 2px; }
.pt-reason { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
.pt-ctx    { font-size: 10px; color: #546e7a; }

.pt-enter-active, .pt-leave-active { transition: opacity .25s, transform .25s; }
.pt-enter-from, .pt-leave-to       { opacity: 0; transform: translateX(20px); }
</style>
