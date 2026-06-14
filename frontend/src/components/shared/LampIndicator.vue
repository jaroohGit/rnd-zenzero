<script setup lang="ts">
defineProps<{
  index: number
  actualOn?: boolean
  cmdOn?: boolean
}>()
</script>

<template>
  <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
    <div class="lamp-ind" :class="{ 'actual-on': actualOn, 'cmd-on': cmdOn && !actualOn }">
      <span style="font-size:11px;">💡</span>
      <span style="font-size:8px;color:#546e7a;">L{{ index }}</span>
    </div>
  </div>
</template>
