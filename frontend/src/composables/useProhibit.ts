import { useProhibitStore } from '@/stores/prohibit'
import type { BlockCode } from '@/stores/prohibit'

export interface GuardedOpts {
  cooldownMs?: number
  setMode?: string
  clearMode?: boolean
  modeRequired?: string
}

export function useProhibit() {
  const store = useProhibitStore()

  function guardedAction(action: string, page: string, fn: () => void, opts?: GuardedOpts): boolean {
    const result = store.canOperate(action, page, { modeRequired: opts?.modeRequired })

    if (!result.allow) {
      store.recordBlock(action, page, result.code as BlockCode)
      window.dispatchEvent(new CustomEvent('prohibit-block', {
        detail: { code: result.code, reason: result.reason, action, page }
      }))
      return false
    }

    store.recordOp(action, page)
    if (opts?.cooldownMs) store.setCooldown(action + '_' + page, opts.cooldownMs)
    if (opts?.setMode)    store.setMode(opts.setMode)
    if (opts?.clearMode)  store.clearMode()

    fn()
    return true
  }

  return { guardedAction, store }
}
