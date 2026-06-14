<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import Hls from 'hls.js'

// ── Camera slot definition ────────────────────────────────────────────────
interface CamSlot {
  id: number
  label: string
  url: string
  type: 'hls' | 'mjpeg' | 'snapshot' | 'off'
  status: 'idle' | 'loading' | 'live' | 'error'
  errorMsg: string
}

const MAX_CAMS = 4

const cams = reactive<CamSlot[]>([
  { id: 1, label: 'Camera 1', url: '', type: 'mjpeg',    status: 'idle', errorMsg: '' },
  { id: 2, label: 'Camera 2', url: '', type: 'mjpeg',    status: 'idle', errorMsg: '' },
  { id: 3, label: 'Camera 3', url: '', type: 'snapshot', status: 'idle', errorMsg: '' },
  { id: 4, label: 'Camera 4', url: '', type: 'hls',      status: 'idle', errorMsg: '' },
])

const configOpen  = ref(false)
const activeConfig = ref(0)
const hlsInstances: Record<number, Hls> = {}
const snapshotTimers: Record<number, ReturnType<typeof setInterval>> = {}
const snapUrls = reactive<Record<number, string>>({})

// ── Layout ────────────────────────────────────────────────────────────────
const layouts = ['1×1', '2×1', '2×2'] as const
const layout  = ref<typeof layouts[number]>('2×2')

function activeCams() {
  const count = layout.value === '1×1' ? 1 : layout.value === '2×1' ? 2 : 4
  return cams.slice(0, count)
}

// ── Load / unload camera ──────────────────────────────────────────────────
function loadCam(cam: CamSlot) {
  stopCam(cam)
  if (!cam.url.trim()) { cam.status = 'idle'; return }
  cam.status = 'loading'
  cam.errorMsg = ''

  nextTick(() => {
    if (cam.type === 'hls') {
      const el = document.getElementById(`vid-${cam.id}`) as HTMLVideoElement | null
      if (!el) return
      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true })
        hlsInstances[cam.id] = hls
        hls.loadSource(cam.url)
        hls.attachMedia(el)
        hls.on(Hls.Events.MANIFEST_PARSED, () => { el.play(); cam.status = 'live' })
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) { cam.status = 'error'; cam.errorMsg = 'HLS stream error' }
        })
      } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = cam.url
        el.play()
        cam.status = 'live'
      } else {
        cam.status = 'error'; cam.errorMsg = 'HLS not supported in this browser'
      }
    } else if (cam.type === 'mjpeg') {
      cam.status = 'live'
    } else if (cam.type === 'snapshot') {
      const tick = () => { snapUrls[cam.id] = `${cam.url}?_t=${Date.now()}` }
      tick()
      snapshotTimers[cam.id] = setInterval(tick, 1500)
      cam.status = 'live'
    }
  })
}

function stopCam(cam: CamSlot) {
  if (hlsInstances[cam.id]) {
    hlsInstances[cam.id].destroy()
    delete hlsInstances[cam.id]
  }
  if (snapshotTimers[cam.id]) {
    clearInterval(snapshotTimers[cam.id])
    delete snapshotTimers[cam.id]
  }
  snapUrls[cam.id] = ''
}

function onImgError(cam: CamSlot) {
  cam.status = 'error'
  cam.errorMsg = 'Cannot reach stream URL'
}
function onImgLoad(cam: CamSlot) {
  cam.status = 'live'
}

onMounted(() => {
  cams.forEach(c => { if (c.url) loadCam(c) })
})
onUnmounted(() => {
  cams.forEach(stopCam)
})

// ── Config panel ──────────────────────────────────────────────────────────
function openConfig(idx: number) { activeConfig.value = idx; configOpen.value = true }
function applyConfig() { loadCam(cams[activeConfig.value]); configOpen.value = false }

// ── Fullscreen ────────────────────────────────────────────────────────────
const fullscreenId = ref<number | null>(null)
function toggleFull(id: number) {
  fullscreenId.value = fullscreenId.value === id ? null : id
}
</script>

<template>
  <div class="cam-page">

    <!-- Toolbar -->
    <div class="cam-toolbar">
      <div class="tb-title">
        <i class="bx bx-camera"></i>
        CCTV Monitor
      </div>

      <div class="tb-layouts">
        <button
          v-for="l in layouts" :key="l"
          class="layout-btn" :class="{ active: layout === l }"
          @click="layout = l"
        >{{ l }}</button>
      </div>

      <div class="tb-right">
        <div class="tb-note">
          <i class="bx bx-info-circle"></i>
          ต้องการ <a class="tb-link" href="https://github.com/bluenviron/mediamtx/releases" target="_blank">MediaMTX</a>
          สำหรับ RTSP
        </div>
      </div>
    </div>

    <!-- Camera grid -->
    <div class="cam-grid" :class="`grid-${layout.replace('×','-')}`">

      <div
        v-for="cam in activeCams()"
        :key="cam.id"
        class="cam-slot"
        :class="{
          live: cam.status === 'live',
          error: cam.status === 'error',
          fullscreen: fullscreenId === cam.id
        }"
      >
        <!-- Video output -->
        <div class="cam-video-area">

          <!-- HLS -->
          <video
            v-if="cam.type === 'hls' && cam.url"
            :id="`vid-${cam.id}`"
            class="cam-video"
            muted autoplay playsinline
          ></video>

          <!-- MJPEG -->
          <img
            v-else-if="cam.type === 'mjpeg' && cam.url"
            class="cam-video"
            :src="cam.url"
            @error="onImgError(cam)"
            @load="onImgLoad(cam)"
          />

          <!-- Snapshot polling -->
          <img
            v-else-if="cam.type === 'snapshot' && snapUrls[cam.id]"
            class="cam-video"
            :src="snapUrls[cam.id]"
            @error="onImgError(cam)"
            @load="onImgLoad(cam)"
          />

          <!-- Placeholder / idle -->
          <div v-else class="cam-placeholder">
            <i class="bx bx-camera-off"></i>
            <span>{{ cam.url ? 'กำลังโหลด...' : 'ยังไม่ได้ตั้งค่า URL' }}</span>
            <button class="cfg-btn-sm" @click="openConfig(cam.id - 1)">
              <i class="bx bx-cog"></i> ตั้งค่า
            </button>
          </div>

          <!-- Error overlay -->
          <div v-if="cam.status === 'error'" class="cam-error-overlay">
            <i class="bx bx-error"></i>
            <span>{{ cam.errorMsg }}</span>
            <button class="retry-btn" @click="loadCam(cam)">Retry</button>
          </div>

          <!-- Status badge -->
          <div class="cam-badge" :class="cam.status">
            <span class="badge-dot"></span>
            {{ cam.status === 'live' ? 'LIVE' : cam.status === 'loading' ? 'LOADING' : cam.status === 'error' ? 'ERROR' : 'IDLE' }}
          </div>

          <!-- Label -->
          <div class="cam-label">{{ cam.label }}</div>

          <!-- Controls overlay -->
          <div class="cam-controls">
            <button class="ctrl-btn" @click="openConfig(cam.id - 1)" title="ตั้งค่า">
              <i class="bx bx-cog"></i>
            </button>
            <button class="ctrl-btn" @click="loadCam(cam)" title="Reload">
              <i class="bx bx-refresh"></i>
            </button>
            <button class="ctrl-btn" @click="toggleFull(cam.id)" title="เต็มจอ">
              <i class="bx" :class="fullscreenId === cam.id ? 'bx-exit-fullscreen' : 'bx-fullscreen'"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Setup guide panel -->
    <div class="setup-guide">
      <div class="sg-header">
        <i class="bx bx-book-open"></i>
        วิธีเชื่อมต่อ O-KAM CCTV
      </div>
      <div class="sg-steps">
        <div class="sg-step">
          <div class="step-num">1</div>
          <div class="step-body">
            <div class="step-title">หา IP ของกล้อง</div>
            <div class="step-desc">เปิด O-KAM App → Device Info → IP Address<br>หรือดูจาก Router DHCP table</div>
          </div>
        </div>
        <div class="sg-step">
          <div class="step-num">2</div>
          <div class="step-body">
            <div class="step-title">ติดตั้ง MediaMTX (สำหรับ RTSP)</div>
            <div class="step-desc">
              Download: <code>mediamtx.exe</code> จาก GitHub<br>
              แก้ <code>mediamtx.yml</code> → เพิ่ม paths:
            </div>
            <div class="step-code">
paths:<br>
&nbsp;&nbsp;cam1:<br>
&nbsp;&nbsp;&nbsp;&nbsp;source: rtsp://admin:PASSWORD@CAMERA_IP:554/stream
            </div>
          </div>
        </div>
        <div class="sg-step">
          <div class="step-num">3</div>
          <div class="step-body">
            <div class="step-title">รัน MediaMTX</div>
            <div class="step-code">mediamtx.exe</div>
            <div class="step-desc">HLS URL จะได้ที่: <code>http://localhost:8888/cam1/index.m3u8</code></div>
          </div>
        </div>
        <div class="sg-step">
          <div class="step-num">4</div>
          <div class="step-body">
            <div class="step-title">ใส่ URL ในกล้อง slot</div>
            <div class="step-desc">
              กดปุ่ม ⚙ บน camera slot → เลือก type HLS → ใส่ URL<br>
              หรือถ้ากล้องมี MJPEG: <code>http://CAMERA_IP/video.cgi</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Config modal -->
    <Transition name="modal">
      <div v-if="configOpen" class="modal-backdrop" @click.self="configOpen = false">
        <div class="config-modal">
          <div class="cm-header">
            <span><i class="bx bx-cog"></i> ตั้งค่า {{ cams[activeConfig].label }}</span>
            <button class="cm-close" @click="configOpen = false"><i class="bx bx-x"></i></button>
          </div>

          <div class="cm-body">
            <div class="cm-field">
              <label>ชื่อกล้อง</label>
              <input class="hmi-input" v-model="cams[activeConfig].label" placeholder="Camera 1" />
            </div>

            <div class="cm-field">
              <label>ประเภท stream</label>
              <div class="type-tabs">
                <button
                  v-for="t in ['hls','mjpeg','snapshot']" :key="t"
                  class="type-tab"
                  :class="{ active: cams[activeConfig].type === t }"
                  @click="cams[activeConfig].type = t as any"
                >{{ t.toUpperCase() }}</button>
              </div>
              <div class="type-hint">
                <span v-if="cams[activeConfig].type === 'hls'">สำหรับ RTSP ผ่าน MediaMTX → HLS URL: <code>http://localhost:8888/cam1/index.m3u8</code></span>
                <span v-else-if="cams[activeConfig].type === 'mjpeg'">MJPEG HTTP stream จากกล้องโดยตรง: <code>http://CAMERA_IP/video.cgi</code></span>
                <span v-else>Snapshot JPEG ที่ refresh ทุก 1.5s: <code>http://CAMERA_IP/snapshot.jpg</code></span>
              </div>
            </div>

            <div class="cm-field">
              <label>Stream URL</label>
              <input
                class="hmi-input url-input"
                v-model="cams[activeConfig].url"
                :placeholder="cams[activeConfig].type === 'hls'
                  ? 'http://localhost:8888/cam1/index.m3u8'
                  : cams[activeConfig].type === 'mjpeg'
                  ? 'http://192.168.1.100/video.cgi'
                  : 'http://192.168.1.100/snapshot.jpg'"
              />
            </div>
          </div>

          <div class="cm-footer">
            <button class="cm-cancel" @click="configOpen = false">ยกเลิก</button>
            <button class="cm-apply" @click="applyConfig">
              <i class="bx bx-check"></i> Apply
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.cam-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

/* ── Toolbar ── */
.cam-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 14px;
  background: rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  flex-shrink: 0;
}
.tb-title {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
  color: #00e5ff; text-transform: uppercase;
}
.tb-title i { font-size: 16px; }
.tb-layouts { display: flex; gap: 4px; }
.layout-btn {
  padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);
  background: transparent; color: #546e7a;
  font-size: 11px; font-weight: 700; cursor: pointer; transition: all .18s;
}
.layout-btn.active { background: rgba(0,229,255,0.12); border-color: rgba(0,229,255,0.35); color: #00e5ff; }
.tb-right { margin-left: auto; }
.tb-note  { font-size: 10px; color: #37474f; display: flex; align-items: center; gap: 5px; }
.tb-note i { font-size: 13px; }
.tb-link  { color: #00e5ff; text-decoration: none; }
.tb-link:hover { text-decoration: underline; }

/* ── Grid ── */
.cam-grid {
  display: grid;
  gap: 10px;
  flex: 1;
  min-height: 0;
}
.grid-1-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
.grid-2-1 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; }
.grid-2-2 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

/* ── Camera slot ── */
.cam-slot {
  background: #071424;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  transition: border-color .2s;
  min-height: 160px;
}
.cam-slot.live  { border-color: rgba(0,229,255,0.2); }
.cam-slot.error { border-color: rgba(239,83,80,0.3); }
.cam-slot.fullscreen {
  position: fixed;
  inset: 0;
  z-index: 200;
  border-radius: 0;
  border: none;
}

.cam-video-area {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}

.cam-video {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}

/* Placeholder */
.cam-placeholder {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; padding: 20px;
  color: #263238; width: 100%;
}
.cam-placeholder i    { font-size: 36px; opacity: 0.5; }
.cam-placeholder span { font-size: 11px; color: #37474f; }
.cfg-btn-sm {
  padding: 5px 14px; border-radius: 6px;
  background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.2);
  color: #00e5ff; font-size: 11px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 5px;
}

/* Error overlay */
.cam-error-overlay {
  position: absolute; inset: 0;
  background: rgba(7,20,36,0.85);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
  color: #ef9a9a;
}
.cam-error-overlay i { font-size: 28px; }
.cam-error-overlay span { font-size: 11px; }
.retry-btn {
  padding: 4px 14px; border-radius: 6px;
  background: rgba(239,83,80,0.15); border: 1px solid rgba(239,83,80,0.35);
  color: #ef9a9a; font-size: 10px; font-weight: 700;
  cursor: pointer; margin-top: 4px;
}

/* Badge */
.cam-badge {
  position: absolute; top: 8px; left: 8px;
  display: flex; align-items: center; gap: 5px;
  padding: 3px 8px; border-radius: 6px;
  font-size: 9px; font-weight: 800; letter-spacing: 1px;
  background: rgba(7,20,36,0.75); backdrop-filter: blur(4px);
}
.cam-badge.live    { color: #00e676; }
.cam-badge.loading { color: #ffa726; }
.cam-badge.error   { color: #ef9a9a; }
.cam-badge.idle    { color: #37474f; }
.badge-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
}
.cam-badge.live .badge-dot { animation: blink 1.5s infinite; }

/* Label */
.cam-label {
  position: absolute; bottom: 8px; left: 8px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
  color: rgba(255,255,255,0.6);
  background: rgba(7,20,36,0.7); backdrop-filter: blur(4px);
  padding: 2px 8px; border-radius: 5px;
}

/* Controls overlay */
.cam-controls {
  position: absolute; top: 8px; right: 8px;
  display: flex; gap: 4px;
  opacity: 0; transition: opacity .2s;
}
.cam-slot:hover .cam-controls { opacity: 1; }
.ctrl-btn {
  width: 28px; height: 28px; border-radius: 7px;
  background: rgba(7,20,36,0.8); border: 1px solid rgba(255,255,255,0.1);
  color: #90a4ae; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 14px; transition: all .15s;
}
.ctrl-btn:hover { background: rgba(0,229,255,0.15); color: #00e5ff; border-color: rgba(0,229,255,0.3); }

/* ── Setup guide ── */
.setup-guide {
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 14px 18px;
  flex-shrink: 0;
}
.sg-header {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
  color: #546e7a; text-transform: uppercase; margin-bottom: 12px;
}
.sg-header i { font-size: 15px; }
.sg-steps  { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
.sg-step   { display: flex; gap: 10px; }
.step-num  {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  background: rgba(0,229,255,0.1); border: 1px solid rgba(0,229,255,0.25);
  color: #00e5ff; font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.step-body   { flex: 1; }
.step-title  { font-size: 11px; font-weight: 700; color: #90a4ae; margin-bottom: 3px; }
.step-desc   { font-size: 10px; color: #37474f; line-height: 1.5; }
.step-code   {
  font-family: var(--font-mono); font-size: 9px; color: #64ffda;
  background: rgba(0,0,0,0.35); border: 1px solid rgba(100,255,218,0.12);
  border-radius: 5px; padding: 5px 7px; margin-top: 5px; white-space: pre;
}
code { font-family: var(--font-mono); font-size: 9px; color: #80cbc4; }

/* ── Config modal ── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(7,20,36,0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.config-modal {
  background: #0d2137; border: 1px solid rgba(0,229,255,0.2);
  border-radius: 14px; width: 440px; max-width: 95vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
.cm-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.07);
  font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #00e5ff;
}
.cm-close {
  background: none; border: none; color: #546e7a; font-size: 20px;
  cursor: pointer; line-height: 1; padding: 2px;
}
.cm-close:hover { color: #ef9a9a; }

.cm-body  { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.cm-field { display: flex; flex-direction: column; gap: 6px; }
.cm-field label { font-size: 10px; font-weight: 700; color: #546e7a; letter-spacing: 1px; text-transform: uppercase; }

.type-tabs { display: flex; gap: 6px; }
.type-tab  {
  flex: 1; padding: 6px; border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.25); color: #546e7a;
  font-size: 10px; font-weight: 700; cursor: pointer; transition: all .18s;
}
.type-tab.active { background: rgba(0,229,255,0.12); border-color: rgba(0,229,255,0.35); color: #00e5ff; }
.type-hint { font-size: 10px; color: #37474f; line-height: 1.5; }

.url-input { width: 100%; font-size: 11px; padding: 7px 10px; }

.cm-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 18px; border-top: 1px solid rgba(255,255,255,0.07);
}
.cm-cancel {
  padding: 7px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
  background: transparent; color: #546e7a; font-size: 11px; font-weight: 700; cursor: pointer;
}
.cm-apply {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 18px; border-radius: 8px; border: none;
  background: linear-gradient(135deg, #0d3a6e, #1565c0);
  color: #90caf9; font-size: 11px; font-weight: 700; cursor: pointer;
  transition: filter .2s;
}
.cm-apply:hover { filter: brightness(1.15); color: #fff; }
.cm-apply i { font-size: 15px; }

/* ── Transitions ── */
.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
</style>
