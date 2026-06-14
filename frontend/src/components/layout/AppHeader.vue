<script setup lang="ts">
import { useAuthorityStore } from '@/stores/authority'
import { mqttState } from '@/composables/useMqtt'

const auth = useAuthorityStore()
</script>

<template>
  <header class="app-header">

    <!-- LEFT: Brand -->
    <div class="hdr-brand">
      <div class="hdr-logo-mark">
        <div class="nl-bars">
          <span class="nl-b b1"></span>
          <span class="nl-b b2"></span>
          <span class="nl-b b3"></span>
          <span class="nl-b b4"></span>
        </div>
        <span class="nl-name">ZenMAC</span>
      </div>
      <div class="hdr-divider"></div>
      <div class="hdr-titles">
        <div class="hdr-sub">R&amp;D · COMMISSIONING DEMO</div>
      </div>
      <div class="hdr-badge">BETA</div>
    </div>

    <!-- RIGHT: Controls -->
    <div class="hdr-right">

      <!-- MQTT pill -->
      <div class="mqtt-pill" :class="mqttState">
        <span class="mqtt-dot"></span>
        <span class="mqtt-txt">
          {{ mqttState === 'connected' ? 'MQTT LIVE' : mqttState === 'connecting' ? 'CONNECTING' : 'OFFLINE' }}
        </span>
      </div>

      <!-- 3-Tier authority -->
      <div class="authbar">
        <div class="auth-label">AUTHORITY</div>
        <div class="auth-tiers">
          <div class="auth-tier" :class="{ active: auth.authHolder === 'LOCAL' }">
            <span class="tier-dot"></span>LOCAL
          </div>
          <div class="auth-sep">·</div>
          <div class="auth-tier" :class="{ active: auth.authHolder === 'HMI' }">
            <span class="tier-dot"></span>HMI
          </div>
          <div class="auth-sep">·</div>
          <div class="auth-tier" :class="{ active: auth.authHolder === 'WEB' }">
            <span class="tier-dot"></span>WEB
          </div>
        </div>
        <button class="req-btn" :class="{ release: auth.iHaveControl }" @click="auth.toggleControl()">
          <i class="bx" :class="auth.iHaveControl ? 'bx-lock-open-alt' : 'bx-lock-alt'"></i>
          {{ auth.iHaveControl ? 'RELEASE' : 'REQUEST' }}
        </button>
      </div>

      <!-- Command status -->
      <Transition name="fade">
        <div v-if="auth.lastCmdResult" class="cmd-status" :class="auth.lastCmdResult">
          <i class="bx"
            :class="auth.lastCmdResult === 'ok' ? 'bx-check-circle' :
                    auth.lastCmdResult === 'blocked' ? 'bx-lock' : 'bx-wifi-off'"></i>
          <span>{{
            auth.lastCmdResult === 'ok'      ? 'SENT' :
            auth.lastCmdResult === 'blocked' ? 'BLOCKED' : 'NO MQTT'
          }}</span>
        </div>
      </Transition>

    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: #071424;
  border-bottom: 1px solid rgba(0,229,255,0.18);
  padding: 0 20px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  box-shadow: 0 1px 0 rgba(0,229,255,0.08), 0 4px 24px rgba(0,0,0,0.4);
}

/* ── Brand ── */
.hdr-brand    { display: flex; align-items: center; gap: 12px; }
.hdr-logo-mark{ display: flex; align-items: center; gap: 9px; }

/* Bars (identical to landing page) */
.nl-bars  { display: flex; align-items: flex-end; gap: 3px; height: 18px; }
.nl-b     { display: block; width: 4px; border-radius: 2px 2px 0 0; background: #d4a040; }
.b1 { height: 40%; } .b2 { height: 70%; } .b3 { height: 100%; } .b4 { height: 60%; }
.nl-name  {
  font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 800;
  letter-spacing: .06em;
  background: linear-gradient(135deg, #e8a020, #f0c060);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.hdr-titles { display: flex; flex-direction: column; gap: 1px; }
.hdr-sub {
  font-size: 9px; font-weight: 600; letter-spacing: 2px;
  color: #546e7a; text-transform: uppercase;
}
.hdr-divider {
  width: 1px; height: 28px; background: rgba(255,255,255,0.1);
}
.hdr-badge {
  padding: 2px 8px; border-radius: 6px;
  background: rgba(0,229,255,0.1);
  border: 1px solid rgba(0,229,255,0.25);
  font-size: 9px; font-weight: 800; letter-spacing: 1.5px;
  color: #00e5ff;
}

/* ── Right side ── */
.hdr-right { display: flex; align-items: center; gap: 10px; }

/* MQTT pill */
.mqtt-pill {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 12px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.2);
}
.mqtt-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #37474f; transition: background 0.4s;
}
.mqtt-txt { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #546e7a; }
.mqtt-pill.connected .mqtt-dot { background: #00e676; box-shadow: 0 0 6px rgba(0,230,118,0.7); animation: pulse 2s infinite; }
.mqtt-pill.connected .mqtt-txt { color: #00e676; }
.mqtt-pill.connecting .mqtt-dot { background: #ffa726; animation: pulse 1s infinite; }
.mqtt-pill.connecting .mqtt-txt { color: #ffa726; }

/* Auth bar */
.authbar {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px; border-radius: 10px;
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.08);
}
.auth-label {
  font-size: 8px; font-weight: 700; letter-spacing: 1.5px;
  color: #37474f; text-transform: uppercase;
}
.auth-tiers { display: flex; align-items: center; gap: 4px; }
.auth-sep   { color: #263238; font-size: 12px; }
.auth-tier {
  display: flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
  color: #37474f; transition: color 0.25s;
}
.tier-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #263238; transition: all 0.25s;
}
.auth-tier.active { color: #00e676; }
.auth-tier.active .tier-dot {
  background: #00e676;
  box-shadow: 0 0 6px rgba(0,230,118,0.8);
}

.req-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 14px; border-radius: 8px;
  background: linear-gradient(135deg, #0d3a6e, #1565c0);
  border: 1px solid rgba(0,229,255,0.2);
  color: #90caf9; font-size: 10px; font-weight: 700;
  letter-spacing: 0.5px; cursor: pointer;
  transition: all 0.2s;
}
.req-btn:hover { filter: brightness(1.15); color: #fff; }
.req-btn.release {
  background: linear-gradient(135deg, #5d1a00, #e65100);
  border-color: rgba(255,167,38,0.3);
  color: #ffcc80;
}
.req-btn i { font-size: 14px; }

/* Command status */
.cmd-status {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 8px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
}
.cmd-status.ok      { background: rgba(0,230,118,0.1); color: #00e676; border: 1px solid rgba(0,230,118,0.3); }
.cmd-status.blocked { background: rgba(239,83,80,0.1); color: #ef9a9a; border: 1px solid rgba(239,83,80,0.3); }
.cmd-status.no-mqtt { background: rgba(255,167,38,0.1); color: #ffa726; border: 1px solid rgba(255,167,38,0.3); }
.cmd-status i { font-size: 14px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes pulse {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
</style>
