<script setup lang="ts">
import { useRouter } from 'vue-router'
import { mqttState } from '@/composables/useMqtt'

const router = useRouter()

const sections = [
  {
    id: 'manual',
    path: '/manual',
    icon: 'bx-joystick',
    color: '#00e676',
    colorDim: 'rgba(0,230,118,0.12)',
    colorBorder: 'rgba(0,230,118,0.25)',
    label: 'Manual',
    title: 'Manual Control',
    desc: 'สั่งงาน Lamp และ Output โดยตรง ควบคุมผ่าน MQTT ด้วย 3-tier Authority',
    tags: ['Lamp 1–7', 'Register Write', 'Authority'],
  },
  {
    id: 'process',
    path: '/process',
    icon: 'bx-slider-alt',
    color: '#00e5ff',
    colorDim: 'rgba(0,229,255,0.10)',
    colorBorder: 'rgba(0,229,255,0.22)',
    label: 'Parameter Setting',
    title: 'Parameter Setting',
    desc: 'ตั้งค่า Threshold อุณหภูมิ Setpoint และ Mapping เงื่อนไขสู่ Lamp Output',
    tags: ['Threshold', 'SP1 / SP2', 'Hysteresis'],
  },
  {
    id: 'auto',
    path: '/auto',
    icon: 'bx-bot',
    color: '#ffa726',
    colorDim: 'rgba(255,167,38,0.10)',
    colorBorder: 'rgba(255,167,38,0.25)',
    label: 'Auto Process',
    title: 'Auto Process',
    desc: 'โหมดอัตโนมัติ ORP 5-Band, Timer Schedule และ Energy Peak Control',
    tags: ['ORP Bands', 'Timer', 'Peak Sched'],
  },
  {
    id: 'ai',
    path: '/test',
    icon: 'bx-brain',
    color: '#ce93d8',
    colorDim: 'rgba(206,147,216,0.10)',
    colorBorder: 'rgba(206,147,216,0.25)',
    label: 'AI & Simulation',
    title: 'AI & Simulation',
    desc: 'จำลองระบบ Simulation, Override Sensor และ MQTT Diagnostic Tools',
    tags: ['Simulation', 'Override', 'MQTT Debug'],
  },
]
</script>

<template>
  <div class="landing">

    <!-- ── Background effects ─────────────────────────────────────────────── -->
    <div class="bg-glow g1"></div>
    <div class="bg-glow g2"></div>
    <div class="bg-grid"></div>

    <!-- ── Hero ──────────────────────────────────────────────────────────── -->
    <header class="hero">

      <!-- Logo mark -->
      <div class="logo-wrap">
        <div class="logo-icon">
          <div class="bars">
            <span class="bar" style="height:38%;background:#c0392b;"></span>
            <span class="bar" style="height:62%;background:#e67e22;"></span>
            <span class="bar" style="height:100%;background:#d4a040;"></span>
            <span class="bar" style="height:74%;background:#27ae60;"></span>
            <span class="bar" style="height:50%;background:#1abc9c;"></span>
          </div>
        </div>

        <div class="logo-text">
          <h1 class="brand-name">ZenMAC</h1>
          <p class="brand-sub">ZENZERO MONITOR ANALYSIS &amp; CONTROL</p>
        </div>
      </div>

      <!-- Company -->
      <div class="company-row">
        <div class="company-info">
          <span class="company-by">A PLATFORM BY</span>
          <span class="company-name">Zenzerobiogas Co., Ltd.</span>
          <span class="company-tag">Environmental Engineering &amp; Research</span>
        </div>
        <div class="ae2r-badge">AE²R</div>
      </div>

      <!-- Divider -->
      <div class="hero-divider"></div>

      <!-- Philosophy -->
      <div class="philosophy">
        <div class="phil-label">
          <span class="phil-line"></span>
          <span class="phil-tag">PHILOSOPHY</span>
        </div>
        <blockquote class="phil-quote">
          <span class="brand-inline">ZenMAC</span>
          "It's not about sensors or displays, but about using data from research and
          development and real-world system operation methods to improve system
          more efficiency and save energy."
        </blockquote>
      </div>

    </header>

    <!-- ── MQTT Status pill ───────────────────────────────────────────────── -->
    <div class="mqtt-pill" :class="mqttState">
      <span class="mp-dot"></span>
      <span class="mp-txt">MQTT {{ mqttState === 'connected' ? 'LIVE' : mqttState === 'connecting' ? 'CONNECTING…' : 'OFFLINE' }}</span>
    </div>

    <!-- ── Sections ───────────────────────────────────────────────────────── -->
    <section class="sections">
      <div
        v-for="s in sections"
        :key="s.id"
        class="sec-card"
        :style="{ '--c': s.color, '--c-dim': s.colorDim, '--c-brd': s.colorBorder }"
        @click="router.push(s.path)"
      >
        <!-- top accent bar -->
        <div class="sec-accent"></div>

        <!-- number -->
        <div class="sec-num">0{{ sections.indexOf(s) + 1 }}</div>

        <!-- icon -->
        <div class="sec-icon-wrap">
          <i class="bx sec-icon" :class="s.icon"></i>
        </div>

        <!-- label badge -->
        <div class="sec-label">{{ s.label }}</div>

        <!-- title -->
        <h3 class="sec-title">{{ s.title }}</h3>

        <!-- desc -->
        <p class="sec-desc">{{ s.desc }}</p>

        <!-- tags -->
        <div class="sec-tags">
          <span v-for="t in s.tags" :key="t" class="sec-tag">{{ t }}</span>
        </div>

        <!-- arrow -->
        <div class="sec-arrow">
          <i class="bx bx-right-arrow-alt"></i>
        </div>
      </div>
    </section>

    <!-- ── Dashboard link ────────────────────────────────────────────────── -->
    <div class="dash-row">
      <button class="dash-btn" @click="router.push('/dashboard')">
        <i class="bx bx-tachometer"></i>
        เข้าสู่ Dashboard (Live Monitoring)
        <i class="bx bx-right-arrow-alt"></i>
      </button>
    </div>

    <!-- ── Footer ────────────────────────────────────────────────────────── -->
    <footer class="lnd-footer">
      <span>© 2025 Zenzerobiogas Co., Ltd.</span>
      <span class="dot">·</span>
      <span>ZenMAC R&amp;D Platform</span>
      <span class="dot">·</span>
      <span style="font-family:monospace;font-size:10px;color:#263238;">v1.1-beta</span>
    </footer>

  </div>
</template>

<style scoped>
/* ── Root ───────────────────────────────────────────────────────────────── */
.landing {
  min-height: 100vh;
  background: #080e18;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px 32px;
  position: relative;
  overflow: hidden;
}

/* ── Background ─────────────────────────────────────────────────────────── */
.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 0;
}
.g1 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(212,160,64,0.07) 0%, transparent 70%);
  top: -200px; left: 50%; transform: translateX(-50%);
}
.g2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%);
  bottom: 0; right: -100px;
}
.bg-grid {
  position: absolute; inset: 0; z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* ── Hero ───────────────────────────────────────────────────────────────── */
.hero {
  width: 100%;
  max-width: 760px;
  position: relative;
  z-index: 1;
  margin-bottom: 12px;
}

/* Logo */
.logo-wrap {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
}
.logo-icon {
  width: 80px; height: 80px;
  background: linear-gradient(145deg, #0d1e35, #0a1626);
  border-radius: 20px;
  border: 1.5px solid rgba(212,160,64,0.25);
  display: flex; align-items: flex-end; justify-content: center;
  padding: 14px 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,160,64,0.1);
  flex-shrink: 0;
}
.bars {
  display: flex; align-items: flex-end;
  gap: 5px; height: 36px; width: 100%;
}
.bar {
  flex: 1; border-radius: 3px 3px 0 0;
  display: block;
}

.logo-text { display: flex; flex-direction: column; gap: 4px; }
.brand-name {
  font-size: 60px;
  font-weight: 900;
  letter-spacing: -1px;
  line-height: 1;
  background: linear-gradient(135deg, #e8a020 0%, #f0c060 50%, #d4a040 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.brand-sub {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 3.5px;
  color: #546e7a;
  text-transform: uppercase;
}

/* Company */
.company-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-top: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 28px;
}
.company-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.company-by   { font-size: 9px; font-weight: 700; letter-spacing: 2px; color: #37474f; }
.company-name { font-size: 18px; font-weight: 700; color: #c8d8e8; }
.company-tag  { font-size: 12px; color: #546e7a; }

.ae2r-badge {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #d4a040;
  padding: 12px 20px;
  border: 2px solid rgba(212,160,64,0.35);
  border-radius: 12px;
  background: rgba(212,160,64,0.06);
  font-family: 'JetBrains Mono', monospace;
}

/* Divider */
.hero-divider { display: none; }

/* Philosophy */
.philosophy { margin-bottom: 4px; }
.phil-label {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 12px;
}
.phil-line {
  display: block; width: 28px; height: 2px;
  background: linear-gradient(90deg, #27ae60, #1abc9c);
}
.phil-tag {
  font-size: 9px; font-weight: 700; letter-spacing: 2.5px;
  color: #546e7a; text-transform: uppercase;
}

.phil-quote {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.65;
  color: #90a4ae;
  border: none;
  padding: 0;
}
.brand-inline {
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #e8a020, #f0c060);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-right: 6px;
}

/* ── MQTT pill ───────────────────────────────────────────────────────────── */
.mqtt-pill {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 7px;
  padding: 6px 14px; border-radius: 20px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.07);
  margin-bottom: 36px;
  align-self: flex-start;
}
.mp-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #546e7a; flex-shrink: 0;
}
.mqtt-pill.connected .mp-dot    { background: #00e676; box-shadow: 0 0 6px rgba(0,230,118,0.7); animation: pulse 2s infinite; }
.mqtt-pill.connecting .mp-dot   { background: #ffa726; animation: pulse 1s infinite; }
.mqtt-pill.disconnected .mp-dot { background: #ef5350; }
.mp-txt { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #546e7a; }
.mqtt-pill.connected .mp-txt    { color: #00e676; }
.mqtt-pill.connecting .mp-txt   { color: #ffa726; }

/* ── Sections Grid ───────────────────────────────────────────────────────── */
.sections {
  position: relative; z-index: 1;
  width: 100%;
  max-width: 920px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.sec-card {
  position: relative;
  background: rgba(8, 16, 28, 0.85);
  border: 1px solid var(--c-brd);
  border-radius: 16px;
  padding: 22px 18px 18px;
  cursor: pointer;
  transition: all 0.22s ease;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  backdrop-filter: blur(4px);
}
.sec-card:hover {
  transform: translateY(-4px);
  border-color: var(--c);
  background: var(--c-dim);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--c-brd);
}

.sec-accent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--c);
  opacity: 0.7;
  border-radius: 16px 16px 0 0;
}
.sec-card:hover .sec-accent { opacity: 1; }

.sec-num {
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  color: rgba(255,255,255,0.12);
  font-family: monospace;
}

.sec-icon-wrap {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: var(--c-dim);
  border: 1px solid var(--c-brd);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.sec-card:hover .sec-icon-wrap {
  background: rgba(0,0,0,0.2);
  box-shadow: 0 0 16px var(--c-brd);
}
.sec-icon {
  font-size: 22px;
  color: var(--c);
}

.sec-label {
  font-size: 9px; font-weight: 700; letter-spacing: 2px;
  color: var(--c);
  text-transform: uppercase;
}

.sec-title {
  font-size: 15px; font-weight: 700; color: #cfd8dc;
  line-height: 1.2;
}

.sec-desc {
  font-size: 11px; color: #546e7a; line-height: 1.6;
  flex: 1;
}

.sec-tags {
  display: flex; flex-wrap: wrap; gap: 5px;
}
.sec-tag {
  font-size: 9px; font-weight: 600; letter-spacing: 0.5px;
  padding: 2px 8px; border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: #546e7a;
}

.sec-arrow {
  display: flex; justify-content: flex-end;
  font-size: 20px; color: rgba(255,255,255,0.1);
  transition: all 0.2s;
}
.sec-card:hover .sec-arrow { color: var(--c); transform: translateX(4px); }

/* ── Dashboard Button ────────────────────────────────────────────────────── */
.dash-row {
  position: relative; z-index: 1;
  margin-bottom: 32px;
}
.dash-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 28px;
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  color: #78909c;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.dash-btn:hover {
  background: rgba(0,229,255,0.06);
  border-color: rgba(0,229,255,0.25);
  color: #00e5ff;
}
.dash-btn i { font-size: 18px; }

/* ── Footer ─────────────────────────────────────────────────────────────── */
.lnd-footer {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 10px;
  font-size: 11px; color: #263238;
  margin-top: auto;
}
.dot { color: #1e3a52; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
</style>
