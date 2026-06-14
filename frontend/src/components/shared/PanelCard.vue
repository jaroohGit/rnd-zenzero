<script setup lang="ts">
defineProps<{
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red'
  title?: string
  icon?: string
  prohibited?: boolean
  lockSub?: string
}>()
</script>

<template>
  <div class="panel" :class="[color, { prohibited }]">
    <div v-if="prohibited" class="prohibit-banner">
      <div style="font-size:30px;">🔒</div>
      <div style="font-size:13px;font-weight:700;color:#ffab91;letter-spacing:1px;">CONTROL LOCKED</div>
      <div style="font-size:11px;color:#90a4ae;">{{ lockSub ?? 'ต้องถือสิทธิ์ WEB จึงจะควบคุมได้' }}</div>
    </div>
    <div class="lock-body">
      <div v-if="title" class="panel-title">
        <span v-if="icon">{{ icon }}</span>
        <span>{{ title }}</span>
        <slot name="title-extra" />
      </div>
      <slot />
    </div>
  </div>
</template>
