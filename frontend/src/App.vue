<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMqtt } from '@/composables/useMqtt'
import { useSimulation } from '@/composables/useSimulation'
import AppHeader        from '@/components/layout/AppHeader.vue'
import AppSidebar       from '@/components/layout/AppSidebar.vue'
import AppFooter        from '@/components/layout/AppFooter.vue'
import ProhibitToast    from '@/components/shared/ProhibitToast.vue'
import ProhibitStatusBar from '@/components/shared/ProhibitStatusBar.vue'

const route  = useRoute()
const { init }  = useMqtt()
const { start } = useSimulation()

const isLanding = computed(() => route.meta?.layout === 'landing')

onMounted(() => {
  init()
  start()
})
</script>

<template>
  <!-- Landing page — full screen, no shell -->
  <router-view v-if="isLanding" />

  <!-- HMI shell — header + sidebar + content -->
  <div v-else class="app-shell">
    <AppHeader />
    <div class="app-body">
      <AppSidebar />
      <main class="main-content">
        <router-view />
      </main>
    </div>
    <ProhibitStatusBar />
    <AppFooter />
    <ProhibitToast />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
}
</style>
