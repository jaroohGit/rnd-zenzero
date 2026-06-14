export type AuthTier = 'LOCAL' | 'HMI' | 'WEB'
export type BlowerStateType = 'RUN' | 'STOP' | 'STBY'
export type AutoMode = 'manual' | 'auto_orp' | 'auto_ph'
export type PPCond = 'gte' | 'lte' | 'range' | 'out'

export interface Blower {
  id: number
  name: string
  tag: string
  topic: string
  speed: number
  state: BlowerStateType
  kw: number
  cmm: number
  dt: number
  auto: AutoMode
  orp: number
  ph: number
  sensorFault: boolean
}

export interface AutoCfg {
  orp_high: number
  orp_low: number
  ph_high: number
  ph_low: number
  spd_min: number
  spd_max: number
  orp_db: number
  ph_db: number
}

export interface PPRow {
  src: 'TEMP-1' | 'TEMP-2'
  cond: PPCond
  sp1: number
  sp2: number
  hyst: number
  lamps: boolean[]
  en: boolean
  latched: boolean
}
