<script setup lang="ts">
import { useRouter } from 'vue-router'
import { mqttState } from '@/composables/useMqtt'

const router = useRouter()

const navModules = [
  { path: '/manual',  icon: 'bx-joystick-alt', label: 'Manual Control' },
  { path: '/process', icon: 'bx-slider-alt',   label: 'Parameter' },
  { path: '/auto',    icon: 'bx-shape-circle', label: 'Auto Process' },
  { path: '/test',    icon: 'bx-chip',         label: 'AI & Sim' },
]

const bars = [
  { h: 40,  c: '#c0392b' },
  { h: 65,  c: '#e67e22' },
  { h: 100, c: '#d4a040' },
  { h: 75,  c: '#27ae60' },
  { h: 52,  c: '#1abc9c' },
]

const industries = [
  { num: '01', label: 'Natural Rubber', tags: ['RSS Grade', 'STR', 'Wastewater'],  icon: 'bxs-leaf',        accent: '#22c55e' },
  { num: '02', label: 'Glove',          tags: ['Latex Dip', 'Chemical WW', 'QC'],  icon: 'bx-shield-alt-2', accent: '#38bdf8' },
  { num: '03', label: 'Tannery',        tags: ['Hide Process', 'Chromium', 'Odor'],icon: 'bxs-package',     accent: '#c084fc' },
  { num: '04', label: 'Biogas',         tags: ['Anaerobic', 'Energy', 'Slurry'],   icon: 'bx-gas-pump',     accent: '#4ade80' },
  { num: '05', label: 'Food Industry',  tags: ['Processing', 'BOD/COD', 'HACCP'],  icon: 'bx-restaurant',   accent: '#fb923c' },
  { num: '06', label: 'Agriculture',    tags: ['Farm', 'Irrigation', 'Nutrient'],  icon: 'bxs-plant',       accent: '#86efac' },
  { num: '07', label: 'Ethanol',        tags: ['Distillery', 'Vinasse', 'Fuel'],   icon: 'bx-flask',        accent: '#f472b6' },
]
</script>

<template>
  <div class="page">

    <!-- ══ Top navigation bar ════════════════════════════════════════════ -->
    <header class="topbar">
      <div class="tb-brand">
        <div class="mini-icon">
          <span v-for="b in bars" :key="b.c" class="mi-bar"
            :style="{ height: b.h+'%', background: b.c }"></span>
        </div>
        <span class="tb-name">ZenMAC</span>
      </div>

      <nav class="tb-modules">
        <button v-for="m in navModules" :key="m.path"
          class="tb-mod-btn" @click="router.push(m.path)">
          <i class="bx" :class="m.icon"></i>
          {{ m.label }}
        </button>
      </nav>

      <div class="tb-actions">
        <div class="mqtt-pill" :class="mqttState">
          <span class="mp-dot"></span>
          {{ mqttState === 'connected' ? 'LIVE' : mqttState === 'connecting' ? 'WAIT' : 'OFF' }}
        </div>
        <button class="tb-dashboard" @click="router.push('/dashboard')">
          Dashboard <i class="bx bx-right-arrow-alt"></i>
        </button>
      </div>
    </header>

    <!-- ══ Main two-column content ════════════════════════════════════════ -->
    <main class="content">

      <!-- ── LEFT COLUMN ──────────────────────────────────────────────── -->
      <div class="left-col">

        <!-- Brand -->
        <div class="brand-block">
          <div class="brand-icon">
            <div class="icon-bars">
              <span v-for="b in bars" :key="b.c" class="ib-bar"
                :style="{ height: b.h+'%', background: b.c }"></span>
            </div>
          </div>
          <div>
            <h1 class="brand-name">ZenMAC</h1>
            <p class="brand-tagline">ZENZERO MONITOR ANALYSIS &amp; CONTROL</p>
          </div>
        </div>

        <div class="left-divider"></div>

        <!-- Company -->
        <div class="company-block">
          <div>
            <span class="cmp-label">A PLATFORM BY</span>
            <p class="cmp-name">Zenzerobiogas Co., Ltd.</p>
            <p class="cmp-sub">Environmental Engineering &amp; Research</p>
          </div>
          <div class="ae2r-badge">AE<sup>2</sup>R</div>
        </div>

        <div class="left-divider"></div>

        <!-- R&D Section -->
        <div class="rnd-block">
          <div class="rnd-top">
            <span class="rnd-badge">
              <i class="bx bx-code-alt"></i>
              R&amp;D
            </span>
            <span class="rnd-status">
              <span class="rnd-dot"></span>
              DEV MODE
            </span>
          </div>
          <h2 class="rnd-title">Research &amp; Development</h2>
          <p class="rnd-desc">
            พื้นที่สำหรับทดสอบและพัฒนาระบบควบคุม — ทดลอง logic, ตรวจสอบ MQTT
            และจำลองการทำงานก่อน deploy จริง
          </p>
          <div class="rnd-tags">
            <span class="rnd-tag"><i class="bx bx-test-tube"></i>Simulation</span>
            <span class="rnd-tag"><i class="bx bx-git-branch"></i>Prototype</span>
            <span class="rnd-tag"><i class="bx bx-wifi"></i>MQTT Debug</span>
            <span class="rnd-tag"><i class="bx bx-analyse"></i>Analysis</span>
          </div>
        </div>

      </div>

      <!-- ── Vertical divider ──────────────────────────────────────────── -->
      <div class="col-divider"></div>

      <!-- ── RIGHT COLUMN ─────────────────────────────────────────────── -->
      <div class="right-col">

        <!-- Philosophy -->
        <section class="rhs-section">
          <div class="rhs-header">
            <span class="rhs-line"></span>
            <span class="rhs-label">PHILOSOPHY</span>
          </div>
          <p class="rhs-quote">
            <strong class="q-brand">ZenMAC</strong>
            &ldquo;It&rsquo;s not about sensors or displays, but about using
            data from research and development and real-world system operation
            methods to improve system more efficiency and save energy.&rdquo;
          </p>
        </section>

        <!-- Designed For -->
        <section class="rhs-section">
          <div class="rhs-header">
            <span class="rhs-line"></span>
            <span class="rhs-label">DESIGNED FOR</span>
          </div>

          <div class="industry-grid">
            <div v-for="ind in industries" :key="ind.label"
              class="ind-card"
              :style="{ '--ia': ind.accent }">
              <i class="bx ind-icon" :class="ind.icon"></i>
              <div class="ind-info">
                <span class="ind-label">{{ ind.label }}</span>
                <span class="ind-sub">{{ ind.tags.join(' · ') }}</span>
              </div>
              <span class="ind-num">{{ ind.num }}</span>
            </div>
          </div>
        </section>

        <!-- CTA -->
        <router-link to="/dashboard" class="rnd-enter-btn">
          <div class="rnd-btn-left">
            <span class="rnd-btn-eyebrow">READY TO EXPLORE</span>
            <span class="rnd-btn-label">Launch Demo</span>
          </div>
          <div class="rnd-btn-icon-wrap">
            <i class="bx bx-rocket"></i>
          </div>
        </router-link>

      </div>

    </main>

    <!-- ══ Footer ════════════════════════════════════════════════════════ -->
    <footer class="foot">
      <span>© 2025 Zenzerobiogas Co., Ltd.</span>
      <span class="foot-dot">·</span>
      <span>Environmental Engineering &amp; Research</span>
      <span class="foot-dot">·</span>
      <span class="foot-ver">v1.1-beta</span>
    </footer>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ─── Root ────────────────────────────────────────────────────────────── */
* { box-sizing: border-box; margin: 0; padding: 0; }

.page {
  height: 100vh;
  background: #000;
  color: #e2e8f0;
  font-family: 'Inter', 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Top bar ─────────────────────────────────────────────────────────── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 48px;
  height: 58px; flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  background: #050505;
}

.tb-brand { display: flex; align-items: center; gap: 10px; }
.mini-icon { display: flex; align-items: flex-end; gap: 3px; height: 20px; }
.mi-bar    { display: block; width: 3.5px; border-radius: 2px 2px 0 0; }
.tb-name {
  font-size: 17px; font-weight: 800; letter-spacing: -0.5px;
  background: linear-gradient(135deg, #d4a040, #f0c060);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.tb-modules { display: flex; align-items: center; gap: 2px; }
.tb-mod-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 14px; border-radius: 7px;
  background: transparent; border: 1px solid transparent;
  color: #3f4f60; font-size: 12.5px; font-weight: 500; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.tb-mod-btn i { font-size: 14px; }
.tb-mod-btn:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.09);
  color: #8899aa;
}

.tb-actions { display: flex; align-items: center; gap: 10px; }

.mqtt-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 20px;
  font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
  color: #2d3f52;
}
.mp-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.mqtt-pill.connected  { border-color: rgba(34,197,94,0.4); color: #22c55e; }
.mqtt-pill.connecting { border-color: rgba(251,146,60,0.4); color: #fb923c; }
.mqtt-pill.connected  .mp-dot { box-shadow: 0 0 6px rgba(34,197,94,0.8); animation: blink 2s infinite; }
.mqtt-pill.connecting .mp-dot { animation: blink 0.9s infinite; }

.tb-dashboard {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 18px; border-radius: 8px;
  background: rgba(212,160,64,0.1); border: 1px solid rgba(212,160,64,0.35);
  color: #d4a040; font-size: 12.5px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.tb-dashboard i { font-size: 16px; }
.tb-dashboard:hover { background: rgba(212,160,64,0.18); border-color: rgba(212,160,64,0.55); color: #f0c060; }

/* ─── Main content ────────────────────────────────────────────────────── */
.content {
  flex: 1; display: flex; min-height: 0;
}

/* ─── Left column ─────────────────────────────────────────────────────── */
.left-col {
  width: 50%; flex-shrink: 0;
  display: flex; flex-direction: column; justify-content: center;
  padding: 0 72px 0 96px;
  gap: 40px;
}

.brand-block {
  display: flex; align-items: center; gap: 32px;
}
.brand-icon {
  width: 148px; height: 148px;
  background: #0e0e0e;
  border-radius: 32px;
  border: 1px solid rgba(255,255,255,0.09);
  box-shadow: 0 16px 48px rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.icon-bars {
  display: flex; align-items: flex-end; gap: 9px;
  height: 82px; padding-bottom: 5px;
}
.ib-bar { display: block; width: 14px; border-radius: 4px 4px 0 0; }

.brand-name {
  font-size: 112px; font-weight: 900;
  letter-spacing: -5px; line-height: 1;
  background: linear-gradient(160deg, #d4900a 0%, #f5c842 45%, #c8820a 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.brand-tagline {
  font-size: 11px; font-weight: 700; letter-spacing: 3.5px;
  color: #2d3f52; text-transform: uppercase; margin-top: 10px;
}

.left-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.09) 40%, rgba(255,255,255,0.09) 60%, transparent);
}

.company-block {
  display: flex; align-items: center; justify-content: space-between;
}
.cmp-label {
  display: block; font-size: 9px; font-weight: 700;
  letter-spacing: 2.5px; color: #1e3040; text-transform: uppercase; margin-bottom: 7px;
}
.cmp-name { font-size: 21px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px; }
.cmp-sub  { font-size: 13.5px; color: #3f5060; }

.ae2r-badge {
  padding: 13px 22px; border-radius: 11px;
  background: #0a0a0a; border: 1px solid rgba(255,255,255,0.13);
  font-size: 20px; font-weight: 800; color: #d4a040; letter-spacing: 1px; flex-shrink: 0;
}
.ae2r-badge sup { font-size: 12px; vertical-align: super; }

/* R&D Block */
.rnd-block {
  display: flex; flex-direction: column; gap: 17px;
}

.rnd-top {
  display: flex; align-items: center; gap: 12px;
}

.rnd-badge {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 17px; border-radius: 8px;
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.25);
  font-size: 15px; font-weight: 800; letter-spacing: 1.5px;
  color: #22c55e; text-transform: uppercase;
}
.rnd-badge i { font-size: 18px; }

.rnd-status {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 15px; border-radius: 8px;
  background: rgba(251,146,60,0.06);
  border: 1px solid rgba(251,146,60,0.18);
  font-size: 13px; font-weight: 700; letter-spacing: 2px;
  color: #fb923c;
}
.rnd-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #fb923c;
  box-shadow: 0 0 8px rgba(251,146,60,0.8);
  animation: blink 1.8s infinite;
}

.rnd-title {
  font-size: 40px; font-weight: 800;
  letter-spacing: -0.5px; line-height: 1.1;
  background: linear-gradient(
    110deg,
    #5a8aa4 0%,
    #c8e0f0 12%,
    #ffffff 25%,
    #e8f4ff 38%,
    #ffffff 50%,
    #d0e8f8 62%,
    #ffffff 75%,
    #9ab8cc 88%,
    #dbeeff 100%
  );
  background-size: 300% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: rndShimmer 6s linear infinite, rndGlow 3.5s ease-in-out infinite;
}

.rnd-desc {
  font-size: 17px; color: #344050; line-height: 1.7;
}

.rnd-tags {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.rnd-tag {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 17px; border-radius: 24px;
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.08);
  font-size: 14px; font-weight: 600; color: #3a4f60;
  transition: all 0.15s;
}
.rnd-tag i { font-size: 17px; }
.rnd-tag:hover {
  border-color: rgba(34,197,94,0.25);
  color: #22c55e;
  background: rgba(34,197,94,0.05);
}


/* ─── Vertical divider ────────────────────────────────────────────────── */
.col-divider {
  width: 1px; flex-shrink: 0;
  background: linear-gradient(180deg,
    transparent 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.1) 80%, transparent 100%);
}

/* ─── Right column ────────────────────────────────────────────────────── */
.right-col {
  flex: 1; display: flex; flex-direction: column; justify-content: center;
  padding: 0 72px 0 64px;
  gap: 28px;
}

.rhs-section { display: flex; flex-direction: column; gap: 16px; }

.rhs-header { display: flex; align-items: center; gap: 12px; }
.rhs-line {
  display: block; width: 28px; height: 2px;
  background: #22c55e; border-radius: 2px; flex-shrink: 0;
}
.rhs-label {
  font-size: 9px; font-weight: 700; letter-spacing: 3.5px;
  color: #2a3f4f; text-transform: uppercase;
}

.rhs-quote {
  font-size: 21px; font-weight: 400; line-height: 1.75; color: #8fa8b8;
}
.q-brand { font-weight: 800; color: #d4a040; -webkit-text-fill-color: #d4a040; }

/* ─── Industry grid ───────────────────────────────────────────────────── */
.industry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.ind-card {
  position: relative;
  display: flex; flex-direction: row; align-items: center;
  gap: 12px; padding: 14px 14px 14px 16px;
  background: #111;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  cursor: default;
  transition: all 0.18s ease;
  overflow: hidden;
}
.ind-card:hover {
  background: #181818;
  border-color: color-mix(in srgb, var(--ia) 30%, transparent);
  box-shadow: 0 6px 24px rgba(0,0,0,0.5);
}

.ind-icon {
  font-size: 28px;
  color: var(--ia);
  flex-shrink: 0;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--ia) 40%, transparent));
  transition: filter 0.18s;
}
.ind-card:hover .ind-icon {
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--ia) 70%, transparent));
}

.ind-info  { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.ind-label {
  font-size: 13px; font-weight: 700;
  color: #d0dde8; letter-spacing: -0.2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ind-sub   {
  font-size: 10px; font-weight: 400; color: #2d4050;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ind-card:hover .ind-sub { color: #3d5060; }

.ind-num {
  font-size: 10px; font-weight: 700; font-family: monospace;
  color: rgba(255,255,255,0.08); letter-spacing: 0.5px;
  flex-shrink: 0; align-self: flex-start; padding-top: 1px;
}

/* ─── Footer ──────────────────────────────────────────────────────────── */
.foot {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; height: 38px; flex-shrink: 0;
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 11px; color: #1a2a38;
}
.foot-dot { color: #111; }
.foot-ver { font-family: monospace; letter-spacing: 1px; }

/* ─── Launch Demo button ───────────────────────────────────────────────── */
.rnd-enter-btn {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-radius: 16px;
  background: linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(0,0,0,0) 100%);
  border: 1px solid rgba(34,197,94,0.25);
  text-decoration: none;
  position: relative; overflow: hidden;
  transition: all 0.3s ease;
  font-family: 'Inter', sans-serif;
  animation: btnPulse 3.5s ease-in-out infinite;
  margin-top: 4px;
}
.rnd-enter-btn::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.03));
  opacity: 0; transition: opacity 0.3s;
}
.rnd-enter-btn:hover::before { opacity: 1; }
.rnd-enter-btn:hover {
  border-color: rgba(34,197,94,0.55);
  box-shadow: 0 0 32px rgba(34,197,94,0.18), 0 8px 32px rgba(0,0,0,0.5);
  transform: translateY(-2px);
}

.rnd-btn-left {
  display: flex; flex-direction: column; gap: 4px; position: relative;
}
.rnd-btn-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
  color: #1a3528; text-transform: uppercase;
}
.rnd-btn-label {
  font-size: 22px; font-weight: 800; letter-spacing: -0.3px;
  color: #22c55e;
  transition: color 0.2s;
}
.rnd-enter-btn:hover .rnd-btn-label { color: #4ade80; }

.rnd-btn-icon-wrap {
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.25);
  display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
  transition: all 0.3s;
}
.rnd-btn-icon-wrap i {
  font-size: 24px; color: #22c55e; transition: transform 0.3s;
}
.rnd-enter-btn:hover .rnd-btn-icon-wrap {
  background: rgba(34,197,94,0.18);
  border-color: rgba(34,197,94,0.5);
  box-shadow: 0 0 16px rgba(34,197,94,0.3);
}
.rnd-enter-btn:hover .rnd-btn-icon-wrap i {
  transform: rotate(-20deg) scale(1.15);
}

@keyframes btnPulse {
  0%, 100% { box-shadow: 0 0 0px  rgba(34,197,94,0),    0 0 0px  rgba(34,197,94,0); }
  50%       { box-shadow: 0 0 20px rgba(34,197,94,0.15), 0 0 40px rgba(34,197,94,0.06); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

@keyframes rndShimmer {
  0%   { background-position: 0% center; }
  100% { background-position: -300% center; }
}

@keyframes rndGlow {
  0%, 100% { filter: brightness(1)    drop-shadow(0 0 0px  rgba(180,215,245,0)); }
  50%       { filter: brightness(1.18) drop-shadow(0 0 18px rgba(160,200,240,0.3)); }
}
</style>
