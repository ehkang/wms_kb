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

    <!-- 居中区域: 容器信息 -->
    <div class="header-center">
      <!-- 单站台模式: 显示容器编码或空状态 -->
      <div v-if="mode === 'single'" class="container-badge single" :class="{ empty: !containerCode }">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="opacity: 0.9;">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
        </svg>
        <span class="container-label">容器</span>
        <span class="container-code">{{ containerCode || '无' }}</span>
      </div>

      <!-- 双站台模式: 显示两个容器（包含空状态） -->
      <div v-if="mode === 'dual'" class="container-badges dual">
        <div
          v-for="(container, index) in containers"
          :key="container.station"
          class="container-badge"
          :class="[
            index === 0 ? 'primary' : 'secondary',
            { empty: !container.code }
          ]"
        >
          <span class="station-indicator">{{ container.station.replace('Tran', '') }}</span>
          <span class="container-code">{{ container.code || '无' }}</span>
        </div>
      </div>
    </div>

    <!-- 右侧控件组 -->
    <div class="header-right">
      <!-- 连接状态 -->
      <div class="connection-status">
        <div class="status-dot" :class="getStatusClass(connectionStatus)"></div>
        <span class="status-text">{{ getStatusText(connectionStatus) }}</span>
      </div>

      <!-- 站台切换器 (位置仅次于时间) -->
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

interface ContainerInfo {
  station: string
  code: string
}

interface Props {
  mode: 'single' | 'dual'
  currentStation?: string
  containerCode?: string  // 单站台模式: 容器编码
  containers?: ContainerInfo[]  // 双站台模式: 多个容器信息
}

const props = withDefaults(defineProps<Props>(), {
  currentStation: 'Tran3001',
  containerCode: '',
  containers: () => []
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

// ✅ 连接状态（全局唯一，与单站台/双站台无关）
const connectionStatus = computed(() => {
  return wmsStore.getState().wcsConnectionStatus
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
/* Flutter风格统一头部 - 压缩版 */
.unified-header {
  height: 2.67vh;  /* 🔥 从8vh压缩到2.67vh (三分之一) */
  min-height: 20px;  /* 🔥 从60px压缩到20px (三分之一) */
  max-height: 27px;  /* 🔥 从80px压缩到27px (三分之一) */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;  /* 从2rem压缩到1rem */
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
  width: 16px;  /* 🔥 从48px压缩到16px (三分之一) */
  height: 16px;  /* 🔥 从48px压缩到16px (三分之一) */
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color, #00d4ff), var(--secondary-color, #0099ff));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);  /* 阴影也相应缩小 */
}

.header-icon svg {
  width: 10px;  /* SVG图标缩小 */
  height: 10px;
}

/* 居中区域: 容器信息 */
.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 容器徽章 - 单站台 */
.container-badge.single {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 212, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  transition: all 0.3s ease;
}

.container-badge.single:hover {
  background: rgba(0, 212, 255, 0.15);
  border-color: var(--primary-color, #00d4ff);
  box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);
}

.container-badge.single svg {
  width: 11px;
  height: 11px;
  color: var(--primary-color, #00d4ff);
}

.container-label {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.container-code {
  font-size: 10px;
  font-weight: 600;
  color: var(--primary-color, #00d4ff);
  font-family: 'Consolas', 'Monaco', monospace;
  letter-spacing: 0.5px;
}

/* 容器徽章组 - 双站台 */
.container-badges.dual {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.container-badge.primary {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(0, 150, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid rgba(0, 150, 255, 0.4);
}

.container-badge.secondary {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(0, 230, 118, 0.15);
  backdrop-filter: blur(10px);
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid rgba(0, 230, 118, 0.4);
}

.station-indicator {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 4px;
}

.container-badge.primary .station-indicator {
  background: rgba(0, 150, 255, 0.3);
  color: #0096ff;
}

.container-badge.secondary .station-indicator {
  background: rgba(0, 230, 118, 0.3);
  color: #00e676;
}

.container-badge.primary .container-code {
  color: #0096ff;
}

.container-badge.secondary .container-code {
  color: #00e676;
}

/* 空容器状态 */
.container-badge.empty {
  opacity: 0.5;
  border-style: dashed;
}

.container-badge.empty .container-code {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

/* 右侧控件组 - 压缩版 */
.header-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;  /* 🔥 从1rem压缩到0.4rem */
}

/* 站台切换器 - 压缩版 */
.station-switcher {
  display: flex;
  align-items: center;
  gap: 3px;  /* 🔥 从8px压缩到3px */
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  padding: 2px 6px;  /* 🔥 从10px 16px压缩到2px 6px */
  border-radius: 8px;  /* 🔥 从20px压缩到8px */
  font-size: 9px;  /* 🔥 从11-13px压缩到9px */
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.station-switcher:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color, #00d4ff);
}

.station-switcher svg {
  width: 10px;  /* SVG图标缩小 */
  height: 10px;
}

.station-label {
  color: var(--on-surface-color, #ffffff);
  font-size: 9px;  /* 🔥 从11-13px压缩到9px */
  line-height: 1;
}

.station-select {
  background: transparent;
  border: none;
  color: var(--primary-color, #00d4ff);
  font-size: 9px;  /* 🔥 从11-13px压缩到9px */
  font-weight: 600;
  cursor: pointer;
  outline: none;
  padding: 0 2px;  /* 从4px压缩到2px */
  line-height: 1;
}

.station-select option {
  background: var(--surface-elevated, #1a1f3a);
  color: var(--on-surface-color, #ffffff);
}

/* 连接状态 - 压缩版 */
.connection-status {
  display: flex;
  align-items: center;
  gap: 3px;  /* 🔥 从8px压缩到3px */
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  padding: 2px 6px;  /* 🔥 从10px 16px压缩到2px 6px */
  border-radius: 8px;  /* 🔥 从20px压缩到8px */
  font-size: 9px;  /* 🔥 从11-13px压缩到9px */
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.connection-status:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color, #00d4ff);
  box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);  /* 阴影也压缩 */
}

.status-text {
  color: var(--on-surface-color, #ffffff);
  font-size: 9px;  /* 🔥 从11-13px压缩到9px */
  line-height: 1;
}

/* 状态指示点 - 压缩版 */
.status-dot {
  width: 6px;  /* 🔥 从10px压缩到6px */
  height: 6px;  /* 🔥 从10px压缩到6px */
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

/* 时间显示 - 压缩版 */
.current-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0;
  min-width: 60px;  /* 🔥 从140px压缩到60px */
}

.time-display {
  font-size: 9px;  /* 🔥 从14-16px压缩到9px */
  font-weight: 600;
  color: var(--primary-color, #00d4ff);
  font-family: 'Consolas', 'Monaco', monospace;
  letter-spacing: 0.5px;  /* 从1px压缩到0.5px */
  line-height: 1;
}

.date-display {
  font-size: 8px;  /* 🔥 从10-11px压缩到8px */
  color: var(--on-surface-muted, #a0a0a0);
  margin-top: 1px;  /* 从2px压缩到1px */
  font-family: 'Consolas', 'Monaco', monospace;
  line-height: 1;
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

/* 响应式调整 - 压缩版 */
@media (max-width: 1024px) {
  .unified-header {
    padding: 0 0.5rem;  /* 进一步压缩 */
  }

  .header-right {
    gap: 0.3rem;  /* 进一步压缩 */
  }

  .current-time {
    min-width: 50px;  /* 🔥 从120px压缩 */
  }
}
</style>
