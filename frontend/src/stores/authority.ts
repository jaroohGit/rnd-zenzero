import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthTier } from '@/types'

const TOPIC_CMD  = import.meta.env.VITE_TOPIC_CMD  ?? 'Demo/zenmac/cmd'
const TOPIC_AUTH = import.meta.env.VITE_TOPIC_AUTH ?? 'Demo/zenmac/authority'

export const useAuthorityStore = defineStore('authority', () => {
  const MY_TIER: AuthTier = 'WEB'
  const authHolder  = ref<AuthTier>('LOCAL')
  const lastCmdTopic   = ref('')
  const lastCmdPayload = ref('')
  const lastCmdResult  = ref<'ok' | 'blocked' | 'no-mqtt' | ''>('')

  const _publish = ref<((topic: string, msg: string) => void) | null>(null)

  const iHaveControl  = computed(() => authHolder.value === MY_TIER)
  const mqttReady     = computed(() => _publish.value !== null)

  function setPublish(fn: (topic: string, msg: string) => void) {
    _publish.value = fn
  }

  function _pub(topic: string, msg: string) {
    _publish.value?.(topic, msg)
  }

  function toggleControl() {
    if (iHaveControl.value) {
      _pub(TOPIC_AUTH, JSON.stringify({ tier: 'LOCAL', action: 'release', ts: Date.now() }))
      authHolder.value = 'LOCAL'
    } else {
      _pub(TOPIC_AUTH, JSON.stringify({ tier: MY_TIER, action: 'request', ts: Date.now() }))
      authHolder.value = MY_TIER
    }
  }

  function sendCommand(payload: object, topic = TOPIC_CMD): boolean {
    lastCmdTopic.value   = topic
    lastCmdPayload.value = JSON.stringify(payload)

    if (!iHaveControl.value) {
      lastCmdResult.value = 'blocked'
      return false
    }
    if (!_publish.value) {
      lastCmdResult.value = 'no-mqtt'
      return false
    }

    const msg = JSON.stringify({ d: payload, src: MY_TIER, ts: Date.now() })
    _pub(topic, msg)
    lastCmdResult.value = 'ok'
    return true
  }

  function setHolder(tier: AuthTier) {
    authHolder.value = tier
  }

  return {
    authHolder, iHaveControl, mqttReady,
    lastCmdTopic, lastCmdPayload, lastCmdResult,
    setPublish, toggleControl, sendCommand, setHolder,
  }
})
