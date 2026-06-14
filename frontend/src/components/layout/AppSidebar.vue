<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const groups = [
  {
    label: 'MONITOR',
    items: [
      { path: '/',        icon: 'bx-tachometer',    label: 'Overview' },
      { path: '/camera',  icon: 'bx-camera',        label: 'CCTV' },
    ],
  },
  {
    label: 'CONTROL',
    items: [
      { path: '/manual',  icon: 'bx-joystick',      label: 'Manual' },
      { path: '/blower',  icon: 'bx-wind',          label: 'Blower' },
      { path: '/auto',    icon: 'bx-bot',           label: 'Auto' },
    ],
  },
  {
    label: 'SETUP',
    items: [
      { path: '/process', icon: 'bx-slider-alt',    label: 'Params' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/test',    icon: 'bx-bug-alt',       label: 'Debug' },
    ],
  },
]

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">

      <!-- Home → back to ZenMAC landing -->
      <a href="/" class="nav-item nav-home" title="Back to ZenMAC">
        <i class="bx bx-home-alt-2 nav-icon"></i>
        <span class="nav-label">Home</span>
      </a>

      <div class="nav-rule"></div>

      <template v-for="group in groups" :key="group.label">
        <div class="nav-group-label">{{ group.label }}</div>
        <router-link
          v-for="item in group.items"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <i class="bx nav-icon" :class="item.icon"></i>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </template>
    </nav>

    <!-- Bottom: version tag -->
    <div class="sidebar-footer">
      <div class="ver-tag">v1.0</div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 110px;
  background: #071424;
  border-right: 1px solid rgba(0,229,255,0.1);
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

/* Home button */
.nav-home {
  border-color: rgba(212,160,64,0.2) !important;
  color: #a07030 !important;
}
.nav-home:hover {
  background: rgba(212,160,64,0.1) !important;
  border-color: rgba(212,160,64,0.45) !important;
  color: #e8a020 !important;
}

.nav-rule {
  height: 1px;
  background: rgba(255,255,255,0.05);
  margin: 4px 4px 2px;
}

/* Group labels */
.nav-group-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #263238;
  text-transform: uppercase;
  padding: 12px 8px 4px;
  margin-top: 2px;
}
.nav-group-label:first-child {
  padding-top: 4px;
}

/* Nav items */
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: #546e7a;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}

.nav-item:hover {
  background: rgba(0,229,255,0.07);
  border-color: rgba(0,229,255,0.2);
  color: #90caf9;
}

.nav-item.active {
  background: rgba(21,101,192,0.35);
  border-color: rgba(0,229,255,0.35);
  color: #00e5ff;
  box-shadow: 0 0 12px rgba(0,229,255,0.1), inset 0 0 8px rgba(0,229,255,0.05);
}

.nav-icon {
  font-size: 20px;
  transition: transform 0.18s;
}
.nav-item:hover .nav-icon  { transform: scale(1.1); }
.nav-item.active .nav-icon { filter: drop-shadow(0 0 4px rgba(0,229,255,0.6)); }

.nav-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* Footer */
.sidebar-footer {
  padding: 8px;
  display: flex;
  justify-content: center;
}
.ver-tag {
  font-size: 9px;
  color: #1e3a52;
  font-weight: 600;
  letter-spacing: 1px;
}
</style>
