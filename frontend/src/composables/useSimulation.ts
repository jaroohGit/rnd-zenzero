import { mqttConnected } from '@/composables/useMqtt'
import { useSensorsStore } from '@/stores/sensors'
import { useBlowerStore }  from '@/stores/blower'
import { useProcessParamStore } from '@/stores/processParam'

function rand(base: number, range: number) {
  return parseFloat((base + (Math.random() - 0.5) * range).toFixed(1))
}
function randInt(base: number, range: number) {
  return Math.round(base + (Math.random() - 0.5) * range)
}

export function useSimulation() {
  function tick() {
    const t0      = performance.now()
    const sensors = useSensorsStore()
    const blower  = useBlowerStore()
    const pp      = useProcessParamStore()

    // ── Simulate sensor values เฉพาะตอน MQTT ยังไม่ได้ต่อ ──
    if (!mqttConnected.value) {
      sensors.temp1   = rand(34.8, 0.6)
      sensors.temp2   = rand(34.9, 0.6)
      sensors.tempAmb = rand(35.7, 0.6)
      sensors.rh      = rand(57.9, 1.0)
      sensors.d300 = randInt(3333, 10)
      sensors.d302 = randInt(3333, 10)
      sensors.d304 = randInt(3333, 10)
      sensors.d306 = randInt(3333, 10)
    }

    // ── Blower simulation และ PP evaluation รันเสมอ ──
    blower.simulateStep()
    pp.evaluate(sensors.temp1, sensors.temp2)

    sensors.scanMs = Math.round(performance.now() - t0 + Math.random() * 3)
  }

  function start() {
    tick()
    setInterval(tick, 2000)
  }

  return { start }
}
