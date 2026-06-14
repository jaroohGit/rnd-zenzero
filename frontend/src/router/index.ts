import { createRouter, createWebHashHistory } from 'vue-router'
import OverviewPage      from '@/views/OverviewPage.vue'
import ManualControlPage from '@/views/ManualControlPage.vue'
import BlowerPage        from '@/views/BlowerPage.vue'
import ProcessParamPage  from '@/views/ProcessParamPage.vue'
import AutoModesPage     from '@/views/AutoModesPage.vue'
import TestPage          from '@/views/TestPage.vue'
import CameraPage        from '@/views/CameraPage.vue'

const routes = [
  { path: '/',        component: OverviewPage,      meta: { title: 'Overview' } },
  { path: '/camera',  component: CameraPage,        meta: { title: 'CCTV Monitor' } },
  { path: '/manual',  component: ManualControlPage, meta: { title: 'Manual Control' } },
  { path: '/blower',  component: BlowerPage,        meta: { title: 'Blower' } },
  { path: '/process', component: ProcessParamPage,  meta: { title: 'Parameter Set' } },
  { path: '/auto',    component: AutoModesPage,     meta: { title: 'Auto Modes' } },
  { path: '/test',    component: TestPage,          meta: { title: 'Test & Debug' } },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
