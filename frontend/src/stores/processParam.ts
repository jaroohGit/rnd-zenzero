import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { PPRow } from '@/types'
import { useAuthorityStore } from './authority'

const LAMPS = 7
const TEMP_MIN = 20
const TEMP_MAX = 60

export const useProcessParamStore = defineStore('processParam', () => {
  const ppRows = reactive<PPRow[]>([
    { src: 'TEMP-1', cond: 'gte', sp1: 35.0, sp2: 40.0, hyst: 0.5, lamps: Array(7).fill(false).map((_,i)=>i===0), en: true, latched: false },
    { src: 'TEMP-2', cond: 'gte', sp1: 38.0, sp2: 43.0, hyst: 0.5, lamps: Array(7).fill(false).map((_,i)=>i===1||i===2), en: true, latched: false },
  ])

  const lampActualState = reactive<boolean[]>(Array(LAMPS).fill(false))
  const lampCmdState    = reactive<boolean[]>(Array(LAMPS).fill(false))
  const autoEnable      = ref(false)
  const lastPayload     = ref('// กด Save & Apply เพื่อดู payload')
  const rowStatus       = reactive<string[]>(ppRows.map(() => 'idle'))

  function condMet(r: PPRow, t: number): boolean {
    switch (r.cond) {
      case 'gte':   return t >= r.sp1
      case 'lte':   return t <= r.sp1
      case 'range': return t >= r.sp1 && t <= r.sp2
      case 'out':   return t < r.sp1 || t > r.sp2
      default: return false
    }
  }

  function condOff(r: PPRow, t: number): boolean {
    switch (r.cond) {
      case 'gte':   return t < r.sp1 - r.hyst
      case 'lte':   return t > r.sp1 + r.hyst
      case 'range': return t < r.sp1 - r.hyst || t > r.sp2 + r.hyst
      case 'out':   return t >= r.sp1 + r.hyst && t <= r.sp2 - r.hyst
      default: return true
    }
  }

  function isNear(r: PPRow, t: number): boolean {
    const n = 1.5
    switch (r.cond) {
      case 'gte':   return t >= r.sp1 - n && t < r.sp1
      case 'lte':   return t <= r.sp1 + n && t > r.sp1
      case 'range': return (t >= r.sp1 - n && t < r.sp1) || (t > r.sp2 && t <= r.sp2 + n)
      default: return false
    }
  }

  function barClass(idx: number): string {
    const r = ppRows[idx]
    return r.latched ? 'trig' : isNear(r, idx === 0 ? _t1 : _t2) ? 'warn' : ''
  }

  function barPct(t: number): number {
    return Math.min(100, Math.max(0, (t - TEMP_MIN) / (TEMP_MAX - TEMP_MIN) * 100))
  }

  let _t1 = 34.8
  let _t2 = 34.9

  function evaluate(t1: number, t2: number) {
    _t1 = t1; _t2 = t2
    const auth = useAuthorityStore()
    const cmdLamps = Array(LAMPS).fill(false)

    ppRows.forEach((r, idx) => {
      if (!r.en) { rowStatus[idx] = 'idle'; return }
      const t = r.src === 'TEMP-1' ? t1 : t2
      const met = condMet(r, t)
      const off = condOff(r, t)
      if (met && !r.latched) r.latched = true
      else if (off && r.latched) r.latched = false

      if (r.latched) {
        r.lamps.forEach((on, i) => { if (on) cmdLamps[i] = true })
        rowStatus[idx] = 'trig'
      } else {
        rowStatus[idx] = isNear(r, t) ? 'near' : 'idle'
      }
    })

    if (auth.iHaveControl) {
      const payload: Record<string, number> = {}
      let changed = false
      cmdLamps.forEach((s, i) => {
        if (s !== lampCmdState[i]) {
          lampCmdState[i] = s
          payload['Lamp' + (i + 1)] = s ? 1 : 0
          changed = true
        }
      })
      if (changed && autoEnable.value) auth.sendCommand(payload)
    }

    for (let i = 0; i < LAMPS; i++) lampCmdState[i] = cmdLamps[i]
  }

  function setActualLamps(states: boolean[]) {
    for (let i = 0; i < LAMPS; i++) lampActualState[i] = states[i] ?? false
  }

  function saveParams() {
    const auth = useAuthorityStore()
    if (!auth.iHaveControl) return false
    const payload = {
      Auto_Enable: autoEnable.value ? 1 : 0,
      PP: ppRows.map(r => ({
        src: r.src, cond: r.cond, sp1: r.sp1, sp2: r.sp2, hyst: r.hyst,
        lamps: r.lamps.map((on, j) => on ? j + 1 : 0).filter(Boolean), en: r.en ? 1 : 0
      }))
    }
    auth.sendCommand(payload)
    lastPayload.value = JSON.stringify({ d: payload, src: 'WEB', ts: Date.now() }, null, 2)
    return true
  }

  function resetLatch() {
    ppRows.forEach(r => r.latched = false)
  }

  return {
    ppRows, lampActualState, lampCmdState, autoEnable, lastPayload, rowStatus,
    condMet, condOff, isNear, barClass, barPct,
    evaluate, setActualLamps, saveParams, resetLatch, LAMPS
  }
})
