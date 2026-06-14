import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthorityStore } from './authority'
import { mqttConnected } from '@/composables/useMqtt'

export type BlockCode = 'AUTHORITY_BLOCK' | 'OFFLINE_BLOCK' | 'MODE_CONFLICT' | 'DUPLICATE_OP' | 'COOLDOWN_LOCK'

export interface CheckResult {
  allow: boolean
  code?: BlockCode
  reason?: string
}

export interface OpLog {
  action: string
  page: string
  ts: number
  blocked?: boolean
  code?: BlockCode
}

interface GuardOpts {
  modeRequired?: string
}

const DEDUP_MS = 5000

export const useProhibitStore = defineStore('prohibit', () => {
  const currentMode = ref<string | null>(null)
  const _cooldowns  = ref<Record<string, number>>({})
  const _lastOp     = ref<Record<string, number>>({})
  const operationLog = ref<OpLog[]>([])

  const activeBlocks = computed<BlockCode[]>(() => {
    const auth = useAuthorityStore()
    const blocks: BlockCode[] = []
    if (!auth.iHaveControl)    blocks.push('AUTHORITY_BLOCK')
    if (!mqttConnected.value)  blocks.push('OFFLINE_BLOCK')
    return blocks
  })

  function canOperate(action: string, page: string, opts?: GuardOpts): CheckResult {
    const auth = useAuthorityStore()

    if (!auth.iHaveControl) {
      return { allow: false, code: 'AUTHORITY_BLOCK', reason: 'สิทธิ์อยู่ที่ ' + auth.authHolder + ' — กด REQUEST CONTROL' }
    }

    if (!mqttConnected.value) {
      return { allow: false, code: 'OFFLINE_BLOCK', reason: 'MQTT ไม่ได้เชื่อมต่อ' }
    }

    if (opts?.modeRequired && currentMode.value && currentMode.value !== opts.modeRequired) {
      return { allow: false, code: 'MODE_CONFLICT', reason: 'โหมด ' + currentMode.value + ' active อยู่' }
    }

    const dupKey = action + '|' + page
    const lastTs = _lastOp.value[dupKey] ?? 0
    const elapsed = Date.now() - lastTs
    if (elapsed < DEDUP_MS) {
      return { allow: false, code: 'DUPLICATE_OP', reason: 'คำสั่งซ้ำ รอ ' + Math.ceil((DEDUP_MS - elapsed) / 1000) + 'วิ' }
    }

    const cdKey = action + '_' + page
    const cdExpiry = _cooldowns.value[cdKey] ?? 0
    if (Date.now() < cdExpiry) {
      return { allow: false, code: 'COOLDOWN_LOCK', reason: 'Cooldown อีก ' + Math.ceil((cdExpiry - Date.now()) / 1000) + 'วิ' }
    }

    return { allow: true }
  }

  function recordOp(action: string, page: string) {
    const key = action + '|' + page
    _lastOp.value[key] = Date.now()
    operationLog.value.unshift({ action, page, ts: Date.now() })
    if (operationLog.value.length > 50) operationLog.value.pop()
  }

  function recordBlock(action: string, page: string, code: BlockCode) {
    operationLog.value.unshift({ action, page, ts: Date.now(), blocked: true, code })
    if (operationLog.value.length > 50) operationLog.value.pop()
  }

  function setCooldown(key: string, ms: number) {
    _cooldowns.value[key] = Date.now() + ms
  }

  function setMode(mode: string) {
    currentMode.value = mode
  }

  function clearMode() {
    currentMode.value = null
  }

  function clearLog() {
    operationLog.value = []
  }

  return {
    currentMode, operationLog, activeBlocks,
    canOperate, recordOp, recordBlock,
    setCooldown, setMode, clearMode, clearLog,
  }
})
