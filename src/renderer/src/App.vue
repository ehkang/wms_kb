<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Dashboard from './views/Dashboard.vue'
import DualStationView from './views/DualStationView.vue'

const displayMode = ref('dual')

onMounted(() => {
  // 从URL参数获取显示模式
  const urlParams = new URLSearchParams(window.location.search)
  const mode = urlParams.get('mode')
  
  if (mode === 'single') {
    displayMode.value = 'single'
    console.log('启动单站台显示模式')
  } else {
    displayMode.value = 'dual'
    console.log('启动双站台显示模式')
  }
})
</script>

<template>
  <Dashboard v-if="displayMode === 'single'" />
  <DualStationView v-else-if="displayMode === 'dual'" />
</template>
