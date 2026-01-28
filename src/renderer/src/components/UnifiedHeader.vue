<template>
  <header class="unified-header">
    <!-- 左侧图标 -->
    <div class="header-left">
      <div class="header-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
      </div>
    </div>

    <!-- 居中标题 -->
    <h1 class="system-title">{{ displayTitle }}</h1>

    <!-- 右侧控件组 -->
    <div class="header-right">
      <!-- 站台切换器（始终显示） -->
      <div class="station-switcher">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="opacity: 0.8;">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span class="station-label">站台</span>
        <select v-model="selectedStation" @change="onStationChange" class="station-select">
          <option v-for="station in availableStations" :key="station" :value="station">
            {{ station }}
          </option>
        </select>
      </div>

      <!-- 连接状态 -->
      <div class="connection-status">
        <div class="status-dot" :class="getStatusClass(connectionStatus)"></div>
        <span class="status-text">{{ getStatusText(connectionStatus) }}</span>
      </div>

      <!-- 当前时间 -->
      <div class="current-time">
        <div class="time-display">{{ currentTime }}</div>
        <div class="date-display">{{ currentDate }}</div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useWMSStore } from '../stores/wms'

interface Props {
  mode: 'single' | 'dual'
  currentStation?: string
}

const props = withDefaults(defineProps<Props>(), {
  currentStation: 'Tran3001'
})

const emit = defineEmits<{
  (e: 'station-change', station: string): void
}>()

const wmsStore = useWMSStore()

// 站台切换（单站台模式）
const selectedStation = ref(props.currentStation)
const availableStations = ref(['Tran3001', 'Tran3002', 'Tran3003', 'Tran3004'])

watch(() => props.currentStation, (newStation) => {
  selectedStation.value = newStation
})

const onStationChange = () => {
  emit('station-change', selectedStation.value)
}

// 标题显示
const displayTitle = computed(() => {
  if (props.mode === 'dual') {
    return '双站台监控中心'
  } else {
    return `${selectedStation.value} 站台看板`
  }
})

// 连接状态（从store获取）
const connectionStatus = computed(() => {
  if (props.mode === 'dual') {
    return wmsStore.getDualStationState().globalConnectionStatus.wcsConnectionStatus
  } else {
    return wmsStore.getState().wcsConnectionStatus
  }
})

// 时间显示
const currentTime = ref('')
const currentDate = ref('')

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  currentDate.value = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 状态处理
const getStatusClass = (status: string) => {
  const statusMap: Record<string, string> = {
    'connecting': 'reconnecting',
    'connected': 'connected',
    'reconnecting': 'reconnecting',
    'disconnected': 'disconnected',
    'error': 'error'
  }
  return statusMap[status] || 'error'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'connecting': '连接中',
    'connected': '已连接',
    'reconnecting': '重连中',
    'disconnected': '已断开',
    'error': '错误'
  }
  return statusMap[status] || '未知'
}

// 生命周期
let timeTimer: ReturnType<typeof setInterval>

onMounted(() => {
  updateTime()
  timeTimer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeTimer) {
    clearInterval(timeTimer)
  }
})
</script>

<style scoped>
/* Flutter风格统一头部 */
.unified-header {
  height: 8vh;
  min-height: 60px;
  max-height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 10;
}

.unified-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-color, #00d4ff), transparent);
}

/* 左侧图标区域 */
.header-left {
  display: flex;
  align-items: center;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color, #00d4ff), var(--secondary-color, #0099ff));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 16px rgba(0, 212, 255, 0.3);
}

/* 居中标题 */
.system-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: clamp(18px, 2vw, 24px);
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color, #00d4ff), var(--secondary-color, #0099ff));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  margin: 0;
}

/* 右侧控件组 */
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* 站台切换器 */
.station-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  padding: 10px 16px;
  border-radius: 20px;
  font-size: clamp(11px, 1vw, 13px);
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.station-switcher:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color, #00d4ff);
}

.station-label {
  color: var(--on-surface-color, #ffffff);
  font-size: clamp(11px, 1vw, 13px);
}

.station-select {
  background: transparent;
  border: none;
  color: var(--primary-color, #00d4ff);
  font-size: clamp(11px, 1vw, 13px);
  font-weight: 600;
  cursor: pointer;
  outline: none;
  padding: 0 4px;
}

.station-select option {
  background: var(--surface-elevated, #1a1f3a);
  color: var(--on-surface-color, #ffffff);
}

/* 连接状态 */
.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  padding: 10px 16px;
  border-radius: 20px;
  font-size: clamp(11px, 1vw, 13px);
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.connection-status:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color, #00d4ff);
  box-shadow: 0 4px 16px rgba(0, 212, 255, 0.3);
}

.status-text {
  color: var(--on-surface-color, #ffffff);
  font-size: clamp(11px, 1vw, 13px);
}

/* 状态指示点 */
.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: relative;
  animation: pulse 2s infinite;
}

.status-dot.connected {
  background: var(--success-color, #00e676);
  box-shadow: 0 0 8px var(--success-color, #00e676);
}

.status-dot.connected::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: var(--success-color, #00e676);
  opacity: 0.3;
  animation: ping 2s infinite;
}

.status-dot.reconnecting {
  background: var(--warning-color-bright, #ffab00);
  box-shadow: 0 0 8px var(--warning-color-bright, #ffab00);
}

.status-dot.reconnecting::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: var(--warning-color-bright, #ffab00);
  opacity: 0.3;
  animation: ping 2s infinite;
}

.status-dot.disconnected,
.status-dot.error {
  background: var(--error-color, #ff5252);
  box-shadow: 0 0 8px var(--error-color, #ff5252);
}

.status-dot.disconnected::after,
.status-dot.error::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: var(--error-color, #ff5252);
  opacity: 0.3;
  animation: ping 2s infinite;
}

/* 时间显示 */
.current-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0;
  min-width: 140px;
}

.time-display {
  font-size: clamp(14px, 1.5vw, 16px);
  font-weight: 600;
  color: var(--primary-color, #00d4ff);
  font-family: 'Consolas', 'Monaco', monospace;
  letter-spacing: 1px;
}

.date-display {
  font-size: clamp(10px, 1vw, 11px);
  color: var(--on-surface-muted, #a0a0a0);
  margin-top: 2px;
  font-family: 'Consolas', 'Monaco', monospace;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes ping {
  0% { transform: scale(1); opacity: 0.3; }
  100% { transform: scale(2); opacity: 0; }
}

/* 响应式调整 */
@media (max-width: 1024px) {
  .unified-header {
    padding: 0 1rem;
  }

  .header-right {
    gap: 0.5rem;
  }

  .current-time {
    min-width: 120px;
  }
}
</style>
