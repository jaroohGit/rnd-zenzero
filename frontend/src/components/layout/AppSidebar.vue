<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const groups = [
  {
    label: 'MONITOR',
    items: [
      { path: '/dashboard', icon: 'bx-layer',        label: 'Summary'  },
      { path: '/camera',    icon: 'bx-camera',        label: 'CCTV'     },
    ],
  },
  {
    label: 'CONTROL',
    items: [
      { path: '/manual',    icon: 'bx-joystick-alt',  label: 'Manual'   },
      { path: '/blower',    icon: 'bx-wind',          label: 'Blower'   },
      { path: '/auto',      icon: 'bx-bot',           label: 'Auto'     },
    ],
  },
  {
    label: 'SETUP',
    items: [
      { path: '/process',   icon: 'bx-slider-alt',    label: 'Params'   },
    ],
  },
  {
    label: 'DEV',
    items: [
      { path: '/test',      icon: 'bx-terminal',      label: 'Test'     },
    ],
  },
]

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <aside class="sidebar">

    <!-- Brand mark -->
    <router-link to="/" class="sb-brand">
      <div class="sb-bars">
        <span class="sb-bar" v-for="(h,i) in [40,65,100,75,52]" :key="i"
          :style="{ height: h+'%', background: ['#c0392b','#e67e22','#d4a040','#27ae60','#1abc9c'][i] }">
        </span>
      </div>
      <div class="sb-brand-text">
        <span class="sb-name">ZenMAC</span>
        <span class="sb-ver">v1.1</span>
      </div>
    </router-link>

    <div class="sb-divider"></div>

    <!-- Navigation -->
    <nav class="sb-nav">
      <template v-for="group in groups" :key="group.label">
        <div class="sb-group-label">{{ group.label }}</div>
        <router-link
          v-for="item in group.items"
          :key="item.path"
          :to="item.path"
          class="sb-item"
          :class="{ active: isActive(item.path) }"
        >
          <i class="bx sb-icon" :class="item.icon"></i>
          <span class="sb-label">{{ item.label }}</span>
          <span v-if="isActive(item.path)" class="sb-active-bar"></span>
        </router-link>
      </template>
    </nav>

    <!-- Footer -->
    <div class="sb-footer">
      <router-link to="/" class="sb-home-btn">
        <i class="bx bx-home-alt-2"></i>
        <span>Landing</span>
      </router-link>
    </div>

  </aside>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ─── Sidebar shell ───────────────────────────────────────────────────── */
.sidebar {
  width: 230px;
  background: #080808;
  border-right: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}

/* ─── Brand ───────────────────────────────────────────────────────────── */
.sb-brand {
  display: flex; align-items: center; gap: 12px;
  padding: 22px 18px 16px;
  text-decoration: none;
  transition: opacity 0.15s;
}
.sb-brand:hover { opacity: 0.8; }

.sb-bars {
  display: flex; align-items: flex-end; gap: 4px;
  height: 24px; flex-shrink: 0;
}
.sb-bar { display: block; width: 4.5px; border-radius: 2px 2px 0 0; }

.sb-brand-text { display: flex; flex-direction: column; gap: 2px; }
.sb-name {
  font-size: 19px; font-weight: 800; letter-spacing: -0.3px;
  background: linear-gradient(135deg, #d4a040, #f0c060);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; line-height: 1;
}
.sb-ver {
  font-size: 11px; font-weight: 600; letter-spacing: 1px;
  color: #1e3040;
}

/* ─── Divider ─────────────────────────────────────────────────────────── */
.sb-divider {
  height: 1px; margin: 0 14px 8px;
  background: rgba(255,255,255,0.05);
}

/* ─── Navigation ──────────────────────────────────────────────────────── */
.sb-nav {
  flex: 1;
  display: flex; flex-direction: column;
  padding: 0 10px;
  gap: 2px;
}

.sb-group-label {
  font-size: 11px; font-weight: 700; letter-spacing: 2px;
  color: #1a2a38; text-transform: uppercase;
  padding: 18px 10px 6px;
}

.sb-item {
  position: relative;
  display: flex; align-items: center; gap: 13px;
  padding: 13px 14px;
  border-radius: 11px;
  text-decoration: none;
  color: #2d4050;
  font-size: 15px; font-weight: 600;
  transition: all 0.15s ease;
  overflow: hidden;
}
.sb-item:hover {
  background: rgba(255,255,255,0.04);
  color: #6a8090;
}
.sb-item.active {
  background: rgba(34,197,94,0.08);
  color: #d0dde8;
}
.sb-item.active:hover {
  background: rgba(34,197,94,0.12);
}

.sb-icon {
  font-size: 22px; flex-shrink: 0;
  color: inherit; transition: all 0.15s;
}
.sb-item.active .sb-icon {
  color: #22c55e;
  filter: drop-shadow(0 0 4px rgba(34,197,94,0.5));
}

.sb-label { flex: 1; letter-spacing: 0.1px; }

.sb-active-bar {
  position: absolute; left: 0; top: 20%; bottom: 20%;
  width: 3.5px; border-radius: 0 2px 2px 0;
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34,197,94,0.6);
}

/* ─── Footer ──────────────────────────────────────────────────────────── */
.sb-footer {
  padding: 12px 10px 18px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.sb-home-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px; border-radius: 11px;
  text-decoration: none;
  color: #2d4050;
  font-size: 15px; font-weight: 600;
  transition: all 0.15s;
  font-family: inherit;
}
.sb-home-btn i { font-size: 20px; }
.sb-home-btn:hover {
  background: rgba(212,160,64,0.08);
  color: #d4a040;
}
</style>
