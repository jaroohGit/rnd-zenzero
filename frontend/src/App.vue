<script setup lang="ts">
import { onMounted } from 'vue'
import { useMqtt } from '@/composables/useMqtt'
import { useSimulation } from '@/composables/useSimulation'
import AppHeader        from '@/components/layout/AppHeader.vue'
import AppSidebar       from '@/components/layout/AppSidebar.vue'
import AppFooter        from '@/components/layout/AppFooter.vue'
import ProhibitToast    from '@/components/shared/ProhibitToast.vue'
import ProhibitStatusBar from '@/components/shared/ProhibitStatusBar.vue'

const { init }  = useMqtt()
const { start } = useSimulation()

onMounted(() => {
  init()
  start()
})
</script>

<template>
  <div class="app-shell">
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
