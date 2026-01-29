<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import SingleStation from './views/SingleStation.vue'
import DualStationView from './views/DualStationView.vue'
import UnifiedHeader from './components/UnifiedHeader.vue'
import { useWMSStore } from './stores/wms'

const wmsStore = useWMSStore()

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

// 计算当前应该监控的站台列表
const monitoredStations = computed<string[]>(() => {
  if (displayMode.value === 'dual') {
    return ['Tran3002', 'Tran3003']
  } else {
    return [currentStation.value]
  }
})

// 计算当前容器信息（单站台模式）
const currentContainerCode = computed<string>(() => {
  if (displayMode.value === 'single') {
    const state = wmsStore.getStationState(currentStation.value)
    return state?.currentContainer || ''
  }
  return ''
})

// 计算容器列表（双站台模式）
const containersList = computed(() => {
  if (displayMode.value === 'dual') {
    return [
      {
        station: 'Tran3002',
        code: wmsStore.getStationState('Tran3002')?.currentContainer || ''
      },
      {
        station: 'Tran3003',
        code: wmsStore.getStationState('Tran3003')?.currentContainer || ''
      }
    ]
  }
  return []
})

// 站台切换处理
const handleStationChange = async (station: string) => {
  currentStation.value = station

  // 保存到 Electron 配置
  if (window.api && window.api.config) {
    try {
      await window.api.config.set('station', station)
    } catch (error) {
    }
  }
}

// 🎯 核心架构：全局监控管理器
// 监听 monitoredStations 变化，自动注册/取消监控
watch(monitoredStations, (newStations, oldStations = []) => {

  // 找出需要取消监控的站台（在旧列表但不在新列表）
  const toUnregister = oldStations.filter(s => !newStations.includes(s))
  toUnregister.forEach(station => {
    wmsStore.unregisterMonitoredStation(station)
  })

  // 找出需要注册监控的站台（在新列表但不在旧列表）
  const toRegister = newStations.filter(s => !oldStations.includes(s))
  toRegister.forEach(station => {
    wmsStore.registerMonitoredStation(station)
  })
}, { immediate: true }) // immediate: true 确保初始化时也执行

onMounted(async () => {
  // 初始化全局 SignalR 连接
  await wmsStore.initialize()

  // 从 Electron 配置加载上次的站台选择
  if (window.api && window.api.config) {
    try {
      const savedStation = await window.api.config.get('station')
      if (savedStation) {
        currentStation.value = savedStation
      }
    } catch (error) {
    }
  }

  if (displayMode.value === 'dual') {
  } else {
  }
})

// 🎯 新架构：应用关闭时清理全局资源
onBeforeUnmount(async () => {
  wmsStore.cleanup()
  await wmsStore.closeSignalR()
})
</script>

<template>
  <div class="app-container">
    <!-- 统一头部 -->
    <UnifiedHeader
      :mode="displayMode"
      :current-station="currentStation"
      :container-code="currentContainerCode"
      :containers="containersList"
      @station-change="handleStationChange"
    />

    <!-- 主体内容 -->
    <!-- ✅ 使用 v-if 确保只渲染当前显示的页面，避免多站台同时监控 -->
    <!-- SignalR 连接是全局单例，有 isSignalRInitialized 保护，不会重复初始化 -->
    <DualStationView v-if="displayMode === 'dual'" />
    <SingleStation v-if="displayMode === 'single'" :station-no="currentStation" />
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
