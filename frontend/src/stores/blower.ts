import { defineStore } from 'pinia'
import { reactive } from 'vue'
import type { Blower, AutoCfg, BlowerStateType } from '@/types'
import { useAuthorityStore } from './authority'

const SPEED_CAP = 95

export const useBlowerStore = defineStore('blower', () => {
  const blowers = reactive<Blower[]>([
    { id: 1, name: 'Turbo Blower TB-01', tag: 'STA_KD_TB01_STS',
      topic: 'Demo/zenmac/blower/tb01/cmd',
      speed: 60, state: 'STOP', kw: 0, cmm: 0, dt: 25,
      auto: 'manual', orp: -40, ph: 6.9, sensorFault: false },
    { id: 2, name: 'Turbo Blower TB-02', tag: 'STA_KD_TB02_STS',
      topic: 'Demo/zenmac/blower/tb02/cmd',
      speed: 0, state: 'STOP', kw: 0, cmm: 0, dt: 25,
      auto: 'manual', orp: -40, ph: 6.9, sensorFault: false },
  ])

  const autoCfg = reactive<Record<number, AutoCfg>>({
    1: { orp_high: 150, orp_low: -150, ph_high: 7.5, ph_low: 6.5, spd_min: 30, spd_max: 85, orp_db: 10, ph_db: 0.1 },
    2: { orp_high: 150, orp_low: -150, ph_high: 7.5, ph_low: 6.5, spd_min: 30, spd_max: 85, orp_db: 10, ph_db: 0.1 },
  })

  const lastPayload = reactive<{ json: string }>({ json: '// ยังไม่มี command' })

  function bloCmd(id: number, cmd: string) {
    const auth = useAuthorityStore()
    if (!auth.iHaveControl) return
    const b = blowers.find(x => x.id === id)!
    const payload = { cmd, blower_id: id, speed_pct: cmd === 'stop' ? 0 : b.speed, source: 'web' }
    if (cmd === 'start')   { b.state = 'RUN' }
    else if (cmd === 'stop')   { b.state = 'STOP'; b.kw = 0; b.cmm = 0; b.dt = 25; if (b.auto !== 'manual') setBloAuto(id, 'manual', true) }
    else if (cmd === 'standby') { b.state = 'STBY' }
    if (cmd === 'setpoint' && b.auto !== 'manual') setBloAuto(id, 'manual', true)
    auth.sendCommand(payload, b.topic)
    lastPayload.json = JSON.stringify({ d: payload, src: 'WEB', ts: Date.now() }, null, 2)
  }

  function setBloAuto(id: number, mode: Blower['auto'], silent = false) {
    const auth = useAuthorityStore()
    const b = blowers.find(x => x.id === id)!
    b.auto = mode
    if (!silent && mode !== 'manual') {
      const c = autoCfg[id]
      const payload = mode === 'auto_orp'
        ? { mode: 'auto_orp', blower_id: id, orp_high: c.orp_high, orp_low: c.orp_low, spd_min: c.spd_min, spd_max: c.spd_max, deadband: c.orp_db }
        : { mode: 'auto_ph',  blower_id: id, ph_high:  c.ph_high,  ph_low:  c.ph_low,  spd_min: c.spd_min, spd_max: c.spd_max, deadband: c.ph_db }
      auth.sendCommand(payload, 'Demo/zenmac/mode')
      lastPayload.json = JSON.stringify({ d: payload, src: 'WEB', ts: Date.now() }, null, 2)
    }
  }

  function onSlide(id: number, val: number) {
    const b = blowers.find(x => x.id === id)!
    let v = Math.min(val, SPEED_CAP)
    if (b.auto !== 'manual') setBloAuto(id, 'manual', true)
    b.speed = v
  }

  function toggleFault(id: number) {
    const b = blowers.find(x => x.id === id)!
    b.sensorFault = !b.sensorFault
  }

  function autoControl(b: Blower) {
    if (b.auto === 'manual' || b.state !== 'RUN') return
    const c = autoCfg[b.id]
    if (b.sensorFault) { b.speed = c.spd_min; return }
    let target = 0
    if (b.auto === 'auto_orp') {
      const x = b.orp
      if (x < c.orp_low - c.orp_db) target = c.spd_max
      else if (x > c.orp_high + c.orp_db) target = c.spd_min
      else { const f = (x - c.orp_low) / (c.orp_high - c.orp_low); target = c.spd_max - (c.spd_max - c.spd_min) * Math.min(1, Math.max(0, f)) }
    } else {
      const x = b.ph
      if (x < c.ph_low - c.ph_db) target = c.spd_max
      else if (x > c.ph_high + c.ph_db) target = c.spd_min
      else { const f = (x - c.ph_low) / (c.ph_high - c.ph_low); target = c.spd_max - (c.spd_max - c.spd_min) * Math.min(1, Math.max(0, f)) }
    }
    if (target > SPEED_CAP) target = SPEED_CAP
    const diff = target - b.speed
    b.speed = Math.round(b.speed + Math.sign(diff) * Math.min(Math.abs(diff), 5))
  }

  function processStep(b: Blower) {
    if (b.state !== 'RUN') {
      b.orp += (-120 - b.orp) * 0.04 + (Math.random() - 0.5) * 3
      b.ph  += (6.4  - b.ph)  * 0.04 + (Math.random() - 0.5) * 0.03
    } else {
      const orpEq = -180 + b.speed * 3.6
      const phEq  = 6.2  + b.speed * 0.018
      b.orp += (orpEq - b.orp) * 0.10 + (Math.random() - 0.5) * 4
      b.ph  += (phEq  - b.ph)  * 0.10 + (Math.random() - 0.5) * 0.03
    }
    b.orp = Math.round(b.orp)
    b.ph  = +b.ph.toFixed(2)
  }

  function simulateStep() {
    blowers.forEach(b => {
      processStep(b)
      autoControl(b)
      if (b.state === 'RUN') {
        b.kw  = +(b.speed * 0.18 + (Math.random() - 0.5) * 0.3).toFixed(1)
        b.cmm = Math.round(b.speed * 1.2 + (Math.random() - 0.5) * 4)
        b.dt  = Math.round(25 + b.speed * 0.15 + (Math.random() - 0.5) * 1.5)
      }
    })
  }

  function updateFromMqtt(d: Record<string, unknown>) {
    blowers.forEach(b => {
      const sk = 'TB0' + b.id
      if (d[sk + '_state'] !== undefined) b.state = d[sk + '_state'] as BlowerStateType
      if (d[sk + '_kw']    !== undefined) b.kw    = +d[sk + '_kw']!
      if (d[sk + '_cmm']   !== undefined) b.cmm   = +d[sk + '_cmm']!
      if (d[sk + '_dt']    !== undefined) b.dt    = +d[sk + '_dt']!
      if (d[sk + '_orp']   !== undefined) b.orp   = Math.round(+d[sk + '_orp']!)
      if (d[sk + '_ph']    !== undefined) b.ph    = +d[sk + '_ph']!
    })
  }

  return { blowers, autoCfg, lastPayload, SPEED_CAP, bloCmd, setBloAuto, onSlide, toggleFault, simulateStep, updateFromMqtt }
})
