import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSensorsStore = defineStore('sensors', () => {
  const temp1   = ref(34.8)
  const temp2   = ref(34.9)
  const tempAmb = ref(35.7)
  const rh      = ref(57.9)
  const d300    = ref(3333)
  const d302    = ref(3333)
  const d304    = ref(3333)
  const d306    = ref(3333)
  const scanMs  = ref(0)

  function rawVal(d: Record<string, unknown>, key: string): number | null {
    if (d[key] === undefined) return null
    const v = Array.isArray(d[key]) ? (d[key] as unknown[])[0] : d[key]
    return parseFloat(String(v))
  }

  function updateFromMqtt(d: Record<string, unknown>) {
    // ── Temp1 — รองรับทั้ง field จาก broker จริง และ field ทั่วไป ──
    const t1 = rawVal(d, 'Temp1111111') ?? rawVal(d, 'Temp1') ?? rawVal(d, 'temp1')
    if (t1 !== null) temp1.value = parseFloat((t1 / 10).toFixed(1))

    const t2 = rawVal(d, 'Temp2222') ?? rawVal(d, 'Temp2') ?? rawVal(d, 'temp2')
    if (t2 !== null) temp2.value = parseFloat((t2 / 10).toFixed(1))

    const ta = rawVal(d, 'TEMPCOM1') ?? rawVal(d, 'TempAmb') ?? rawVal(d, 'tempAmb')
    if (ta !== null) tempAmb.value = parseFloat((ta / 10).toFixed(1))

    const rhv = rawVal(d, 'RH2222') ?? rawVal(d, 'RH') ?? rawVal(d, 'rh')
    if (rhv !== null) rh.value = parseFloat((rhv / 10).toFixed(1))

    // ── Registers — ค่าตรง ไม่ต้อง ÷10 ──
    const regs = ['D300', 'D302', 'D304', 'D306'] as const
    const stores = [d300, d302, d304, d306]
    regs.forEach((k, i) => {
      const v = rawVal(d, k)
      if (v !== null) stores[i].value = Math.round(v)
    })
  }

  return { temp1, temp2, tempAmb, rh, d300, d302, d304, d306, scanMs, updateFromMqtt }
})
