<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import SingleStation from './views/SingleStation.vue'
import DualStationView from './views/DualStationView.vue'
import UnifiedHeader from './components/UnifiedHeader.vue'

// 当前选中的站台
const currentStation = ref('Tran3001')

// 自动判断显示模式的逻辑
// Tran3002 或 Tran3003 → 双站台模式
// Tran3001 或 Tran3004 → 单站台模式
const displayMode = computed<'single' | 'dual'>(() => {
  if (currentStation.value === 'Tran3002' || currentStation.value === 'Tran3003') {
    return 'dual'
  }
  return 'single'
})

// 站台切换处理
const handleStationChange = async (station: string) => {
  console.log(`🔄 切换站台: ${currentStation.value} → ${station}`)
  currentStation.value = station

  // 保存到 Electron 配置
  if (window.api && window.api.config) {
    try {
      await window.api.config.set('station', station)
      console.log(`💾 已保存站台配置: ${station}`)
    } catch (error) {
      console.error('保存站台配置失败:', error)
    }
  }

  // 根据站台自动切换模式
  const newMode = displayMode.value
  console.log(`🎯 自动切换到${newMode === 'dual' ? '双站台' : '单站台'}模式`)
}

onMounted(async () => {
  // 从 Electron 配置加载上次的站台选择
  if (window.api && window.api.config) {
    try {
      const savedStation = await window.api.config.get('station')
      if (savedStation) {
        currentStation.value = savedStation
        console.log(`📂 加载上次站台配置: ${savedStation}`)
      }
    } catch (error) {
      console.error('加载站台配置失败:', error)
    }
  }

  if (displayMode.value === 'dual') {
    console.log('🎯 启动双站台显示模式 (Tran3002 + Tran3003)')
  } else {
    console.log(`🎯 启动单站台显示模式 (${currentStation.value})`)
  }
})
</script>

<template>
  <div class="app-container">
    <!-- 统一头部 -->
    <UnifiedHeader
      :mode="displayMode"
      :current-station="currentStation"
      @station-change="handleStationChange"
    />

    <!-- 主体内容 -->
    <DualStationView v-if="displayMode === 'dual'" />
    <SingleStation v-else :station-no="currentStation" />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
</style>
