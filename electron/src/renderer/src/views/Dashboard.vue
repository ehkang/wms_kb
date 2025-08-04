<template>
  <div class="dashboard">
    <!-- 星空背景 -->
    <div class="stars-container" ref="starsContainer"></div>
    
    <!-- 头部 -->
    <header class="header" :class="{ error: errorMessage }">
      <h1 class="header-title">
        站台: {{ stationName }} ({{ localStationNo }})
        <span v-if="errorMessage"> - {{ errorMessage }}</span>
      </h1>
      <div class="header-controls">
        <div class="connection-status">
          <span class="status-label">WMS:</span>
          <div class="status-dot" :class="getStatusClass(wmsConnectionStatus)"></div>
          <span>{{ getStatusText(wmsConnectionStatus) }}</span>
        </div>
        <div class="connection-status">
          <span class="status-label">WCS:</span>
          <div class="status-dot" :class="getStatusClass(wcsConnectionStatus)"></div>
          <span>{{ getStatusText(wcsConnectionStatus) }}</span>
        </div>
        <div class="coordinates-display">
          <div class="coordinate-item">
            <div class="coordinate-label">{{ devices['Crn2001']?.name || '堆垛机001' }}:</div>
            <div class="coordinate-value">{{ getCrn2001Coords() }}</div>
          </div>
          <div class="coordinate-item">
            <div class="coordinate-label">{{ devices['Crn2002']?.name || '堆垛机002' }}:</div>
            <div class="coordinate-value">{{ getCrn2002Coords() }}</div>
          </div>
          <div class="coordinate-item">
            <div class="coordinate-label">{{ devices['RGV01']?.name || '穿梭车' }}:</div>
            <div class="coordinate-value">{{ getRgv01Coords() }}</div>
          </div>
        </div>
      </div>
    </header>

    <!-- 内容区域 -->
    <div class="content">
      <!-- 托盘信息 -->
      <aside class="tray-info">
        <div class="tray-title">
          在途托盘列表 ({{ containers.length }})
        </div>
        <div class="tray-list">
          <div v-if="containers.length === 0" class="loading">当前暂无托盘</div>
          <div 
            v-else
            v-for="tray in containers" 
            :key="tray.code"
            class="tray-item"
            :class="{ 
              active: currentContainer === tray.code, 
              blink: currentContainer === tray.code && isLight 
            }"
          >
            {{ tray.code }}
            <div class="tray-item-location">{{ tray.location }}</div>
          </div>
        </div>
      </aside>

      <!-- 主内容 -->
      <main class="main-content">
        <!-- 货物信息区域 -->
        <section class="goods-section">
          <div class="goods-list">
            <div v-if="isLoading" class="loading">加载货物信息...</div>
            <div v-else-if="errorMessage && localGoods.length === 0" class="error-message">
              {{ errorMessage }}
            </div>
            <div v-else-if="localGoods.length === 0" class="empty-state">
              <div class="empty-state-icon">📦</div>
              <p class="empty-state-text">{{ currentContainer ? '该托盘暂无货物' : '当前站台暂无托盘' }}</p>
            </div>
            <div v-else class="goods-grid-container">
              <div class="goods-grid">
                <div 
                  v-for="(goods, index) in localGoods.slice(0, 10)" 
                  :key="goods.goodsNo"
                  class="goods-card"
                >
                  <div class="goods-card-header">
                    <span class="goods-no">{{ goods.goodsNo || 'N/A' }}</span>
                  </div>
                  <div class="goods-card-body">
                    <div class="goods-name">{{ goods.goodsName || '未知商品' }}</div>
                    <div class="goods-spec">{{ goods.goodsSpec || '-' }}</div>
                  </div>
                  <div class="goods-card-footer">
                    <span class="goods-quantity">{{ Math.floor(goods.quantity) || 0 }}</span>
                    <span class="goods-unit">{{ goods.unit || '件' }}</span>
                  </div>
                </div>
              </div>
              <div v-if="localGoods.length > 10" class="more-goods-hint">
                ... 还有 {{ localGoods.length - 10 }} 种货物
              </div>
            </div>
          </div>
        </section>

        <!-- 日志区域 -->
        <section class="log-section">
          <div class="log-header">
            <div class="log-title">系统日志</div>
            <div class="log-controls">
              <select v-model="logFilter" class="log-filter">
                <option value="all">全部</option>
                <option value="info">信息</option>
                <option value="warning">警告</option>
                <option value="error">错误</option>
              </select>
              <button @click="clearLogs" class="log-clear">清空</button>
            </div>
          </div>
          <div class="log-container" ref="logContainer">
            <div 
              v-for="log in filteredLogs" 
              :key="log.id"
              class="log-entry"
              :class="mapLogLevel(log.logLevel)"
            >
              <div style="color: #606266; font-size: 14px; margin-bottom: 4px;">
                [{{ log.time }}] {{ log.categoryName || '系统' }}
              </div>
              <div class="log-message">
                {{ log.message }}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useWMSStore } from '../stores/wms'
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr'
import type { HubConnection } from '@microsoft/signalr'
import { API_CONFIG } from '../config/api'

// 获取站台配置
let defaultStation = 'Tran3001'
try {
  // 尝试从配置文件读取
  const config = require('../../../../../config.json')
  if (config.station) {
    defaultStation = config.station
  }
} catch (e) {
  console.log('使用默认站台:', defaultStation)
}

// 获取 URL 参数（URL 参数优先级更高）
const urlParams = new URLSearchParams(window.location.search)
const localStationNo = ref(urlParams.get('p') || defaultStation)

// 使用状态管理
const wmsStore = useWMSStore()

// 获取响应式状态
const state = wmsStore.getState()

// 使用计算属性来保证响应性
const stationName = computed(() => state.stationName)
const devices = computed(() => state.devices)
const containers = computed(() => state.containers)
const currentContainer = computed(() => state.currentContainer)
const localGoods = computed(() => state.localGoods)
const isLoading = computed(() => state.isLoading)
const errorMessage = computed(() => state.errorMessage)
const wmsConnectionStatus = computed(() => state.wmsConnectionStatus)
const wcsConnectionStatus = computed(() => state.wcsConnectionStatus)

// 本地状态
const isLight = ref(true)
const starsContainer = ref<HTMLElement>()
const logContainer = ref<HTMLElement>()
const logFilter = ref('all')
const logs = ref<Array<{
  id: number
  time: string
  categoryName: string
  message: string
  logLevel: number
}>>([])
const maxLogs = 500

// SignalR 连接
let signalRConnection: HubConnection | null = null

// 计算属性
const filteredLogs = computed(() => {
  if (logFilter.value === 'all') return logs.value
  return logs.value.filter(log => mapLogLevel(log.logLevel) === logFilter.value)
})

// 方法
const getStatusClass = (status: string) => {
  const statusMap = {
    'connecting': 'warning',
    'connected': '',
    'reconnecting': 'warning',
    'disconnected': 'error',
    'error': 'error'
  }
  return statusMap[status] || 'error'
}

const getStatusText = (status: string) => {
  const statusMap = {
    'connecting': '连接中',
    'connected': '已连接',
    'reconnecting': '重连中',
    'disconnected': '已断开',
    'error': '错误'
  }
  return statusMap[status] || '未知'
}

const getCrn2001Coords = () => {
  const crn2001 = devices.value['Crn2001']
  if (!crn2001) return '无数据'
  if (!crn2001.currentLocation) return '无位置信息'
  const loc = crn2001.currentLocation
  if (loc.code && loc.code !== '未知货位') return loc.code
  return `行${loc.row}列${loc.col}层${loc.layer}`
}

const getCrn2002Coords = () => {
  const crn2002 = devices.value['Crn2002']
  if (!crn2002) return '无数据'
  if (!crn2002.currentLocation) return '无位置信息'
  const loc = crn2002.currentLocation
  if (loc.code && loc.code !== '未知货位') return loc.code
  return `行${loc.row}列${loc.col}层${loc.layer}`
}

const getRgv01Coords = () => {
  const rgv01 = devices.value['RGV01']
  if (!rgv01) return '无数据'
  if (!rgv01.currentLocation) return '无位置信息'
  const loc = rgv01.currentLocation
  if (loc.code && loc.code !== '未知货位') return loc.code
  return `行${loc.row}列${loc.col}层${loc.layer}`
}

const mapLogLevel = (logLevel: number) => {
  switch(logLevel) {
    case 2: return 'info'
    case 3: return 'warning'
    case 4: return 'error'
    default: return 'info'
  }
}

const addLog = (logLevel: number, message: string, categoryName = '系统') => {
  const now = new Date()
  const time = now.toLocaleTimeString('zh-CN', { hour12: false })
  logs.value.push({
    id: Date.now() + Math.random(),
    time,
    categoryName,
    message,
    logLevel
  })
  
  // 限制日志数量
  if (logs.value.length > maxLogs) {
    logs.value = logs.value.slice(-maxLogs)
  }
  
  // 滚动到底部
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

const clearLogs = () => {
  logs.value = []
  addLog(2, '日志已清空')
}

const generateStars = () => {
  if (!starsContainer.value) return
  
  const numStars = 150
  for (let i = 0; i < numStars; i++) {
    const star = document.createElement('div')
    star.className = 'star'
    star.style.left = Math.random() * 100 + '%'
    star.style.top = Math.random() * 100 + '%'
    star.style.width = star.style.height = Math.random() * 3 + 1 + 'px'
    star.style.animationDelay = Math.random() * 2 + 's'
    star.style.animationDuration = (Math.random() * 1.5 + 0.5) + 's'
    starsContainer.value.appendChild(star)
  }
}

const initSignalR = async () => {
  try {
    const url = API_CONFIG.WS_URL
    
    signalRConnection = new HubConnectionBuilder()
      .withUrl(url, {
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build()

    // 设备数据更新事件
    signalRConnection.on("DeviceDataUpdate", (deviceNo: string, newInfo: any) => {
      wmsStore.updateDevice(deviceNo, newInfo)
    })

    // 日志事件
    signalRConnection.on("logger", (logData: any) => {
      addLog(logData.logLevel || 2, logData.message, logData.categoryName || '系统')
    })

    // 连接状态事件
    signalRConnection.onreconnecting(() => {
      wmsStore.setWcsConnectionStatus('reconnecting')
    })

    signalRConnection.onreconnected(() => {
      wmsStore.setWcsConnectionStatus('connected')
    })

    signalRConnection.onclose(() => {
      wmsStore.setWcsConnectionStatus('disconnected')
    })

    await signalRConnection.start()
    console.log("SignalR连接已建立")
    wmsStore.setWcsConnectionStatus('connected')
    addLog(2, 'SignalR连接已建立', 'WCS.Connection')
  } catch (error) {
    console.error("SignalR连接失败:", error)
    wmsStore.setWcsConnectionStatus('error')
    addLog(4, `WebSocket连接失败: ${error.message}`, 'WCS.Connection')
  }
}

// 生命周期
onMounted(async () => {
  // 设置当前站台编号
  console.log('设置当前站台编号:', localStationNo.value)
  wmsStore.setLocalStationNo(localStationNo.value)
  
  // 生成星星背景
  generateStars()
  
  // 闪烁定时器
  const blinkTimer = setInterval(() => {
    isLight.value = !isLight.value
  }, 500)
  
  // 数据刷新定时器
  const refreshTimer = setInterval(() => {
    wmsStore.refreshData()
  }, 3000)
  
  // 初始化
  addLog(2, 'WMS Dashboard 启动完成', 'WMS.System')
  await wmsStore.initialize()
  await initSignalR()
  
  // 清理函数
  onUnmounted(() => {
    clearInterval(blinkTimer)
    clearInterval(refreshTimer)
    if (signalRConnection) {
      signalRConnection.stop()
    }
  })
})

// F5 刷新功能
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5') {
    e.preventDefault()
    wmsStore.refreshData()
  }
})
</script>

<style scoped>
/* 将原始 HTML 中的所有样式复制过来 */
:root {
  --primary-color: #00d4ff;
  --secondary-color: #7c4dff;
  --accent-color: #00bfa5;
  --surface-color: #0a0a0a;
  --surface-elevated: #1a1a1a;
  --surface-glass: rgba(255, 255, 255, 0.02);
  --on-surface-color: #ffffff;
  --on-surface-muted: #a0a0a0;
  --error-color: #ff5252;
  --success-color: #00e676;
  --warning-color: #ffc107;
  --card-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  --border-color: rgba(255, 255, 255, 0.1);
  --shadow-color: rgba(0, 0, 0, 0.3);
  --glow-color: rgba(0, 212, 255, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dashboard {
  font-family: 'Inter', 'SF Pro Display', 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(124, 77, 255, 0.1) 0%, transparent 50%),
              var(--surface-color);
  color: var(--on-surface-color);
  overflow: hidden;
  height: 100vh;
  font-weight: 400;
  letter-spacing: -0.01em;
}

/* 动态背景粒子 */
.stars-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.star {
  position: absolute;
  background: var(--primary-color);
  border-radius: 50%;
  animation: float 6s ease-in-out infinite alternate;
  box-shadow: 0 0 6px var(--glow-color);
}

@keyframes float {
  0% { 
    opacity: 0.2;
    transform: translateY(0px) scale(0.8);
  }
  50% { 
    opacity: 0.6;
    transform: translateY(-20px) scale(1);
  }
  100% { 
    opacity: 0.2;
    transform: translateY(0px) scale(0.8);
  }
}

/* 头部 */
.header {
  position: relative;
  z-index: 1;
  height: 72px;
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  box-shadow: 0 8px 32px var(--shadow-color);
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
}

.header.error {
  background: linear-gradient(135deg, rgba(255, 82, 82, 0.1), rgba(211, 47, 47, 0.1));
  border-bottom-color: var(--error-color);
}

.header-title {
  font-size: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-glass);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.connection-status:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color);
  box-shadow: 0 4px 16px var(--glow-color);
}

.status-label {
  font-weight: 500;
  margin-right: 4px;
}

.coordinates-display {
  display: flex;
  gap: 12px;
}

.coordinate-item {
  background: var(--surface-glass);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 12px;
  min-width: 120px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.coordinate-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--accent-color);
  box-shadow: 0 4px 16px rgba(0, 191, 165, 0.2);
}

.coordinate-label {
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--on-surface-muted);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.coordinate-value {
  font-weight: 600;
  color: var(--on-surface-color);
  font-size: 14px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success-color);
  animation: pulse 2s infinite;
  box-shadow: 0 0 8px var(--success-color);
  position: relative;
}

.status-dot::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  background: var(--success-color);
  opacity: 0.3;
  animation: ping 2s infinite;
}

.status-dot.error {
  background: var(--error-color);
  box-shadow: 0 0 8px var(--error-color);
}

.status-dot.error::after {
  background: var(--error-color);
}

.status-dot.warning {
  background: var(--warning-color);
  box-shadow: 0 0 8px var(--warning-color);
}

.status-dot.warning::after {
  background: var(--warning-color);
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

/* 内容区域 */
.content {
  position: relative;
  z-index: 1;
  display: flex;
  height: calc(100vh - 72px);
  gap: 1px;
}

/* 托盘信息显示 */
.tray-info {
  width: 380px;
  max-width: 20%;
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: relative;
}

.tray-info::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(180deg, transparent, var(--primary-color), transparent);
}

.tray-title {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
  font-size: 16px;
  color: var(--primary-color);
  font-weight: 600;
  letter-spacing: -0.01em;
  position: relative;
}

.tray-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 24px;
  right: 24px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
}

.tray-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tray-list::-webkit-scrollbar {
  width: 4px;
}

.tray-list::-webkit-scrollbar-track {
  background: transparent;
}

.tray-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.tray-list::-webkit-scrollbar-thumb:hover {
  background: var(--primary-color);
}

.tray-item {
  background: var(--surface-glass);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  min-height: 70px;
  border-radius: 12px;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-color);
  position: relative;
  cursor: pointer;
  overflow: hidden;
  font-size: 18px;
  font-weight: 500;
}

.tray-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.tray-item:hover {
  background: rgba(0, 212, 255, 0.05);
  border-color: var(--primary-color);
  box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
  transform: translateY(-2px);
}

.tray-item:hover::before {
  transform: scaleX(1);
}

.tray-item.active {
  border-color: var(--accent-color);
  background: rgba(0, 191, 165, 0.1);
  box-shadow: 0 8px 32px rgba(0, 191, 165, 0.2);
}

.tray-item.active::before {
  background: var(--accent-color);
  transform: scaleX(1);
}

.tray-item.active.blink {
  animation: pulse 1.5s infinite;
}

.tray-item-location {
  font-size: 14px;
  color: var(--on-surface-muted);
  margin-top: 4px;
  font-weight: 400;
  opacity: 0.8;
}

.tray-item.active .tray-item-location {
  color: var(--accent-color);
  opacity: 1;
}

/* 主内容区 */
.main-content {
  flex: 1;
  background: var(--surface-color);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 货物信息区域 */
.goods-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40px;
  min-height: 0;
}

/* 日志区域 */
.log-section {
  height: 180px;
  display: flex;
  flex-direction: column;
  background: var(--surface-elevated);
  border-top: 2px solid var(--border-color);
  flex-shrink: 0;
}

.log-header {
  padding: 12px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.log-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-color);
}

.log-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.log-filter {
  background: var(--surface-glass);
  border: 1px solid var(--border-color);
  color: var(--on-surface-color);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.log-clear {
  background: var(--surface-glass);
  border: 1px solid var(--border-color);
  color: var(--on-surface-color);
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.log-clear:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color);
}

.log-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px 24px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.4;
}

.log-container::-webkit-scrollbar {
  width: 6px;
}

.log-container::-webkit-scrollbar-track {
  background: var(--surface-color);
}

.log-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.log-entry {
  padding: 4px 8px;
  margin-bottom: 2px;
  border-radius: 4px;
  border-left: 3px solid transparent;
  word-wrap: break-word;
  transition: background-color 0.2s ease;
}

.log-entry:hover {
  background: rgba(255, 255, 255, 0.03);
}

.log-entry.info {
  border-left-color: #67c23a;
  background: rgba(103, 194, 58, 0.05);
}

.log-entry.info .log-message {
  color: #67c23a;
}

.log-entry.warning {
  border-left-color: #e6a23c;
  background: rgba(230, 162, 60, 0.05);
}

.log-entry.warning .log-message {
  color: #e6a23c;
}

.log-entry.error {
  border-left-color: #f56c6c;
  background: rgba(245, 108, 108, 0.05);
}

.log-entry.error .log-message {
  color: #f56c6c;
}

.log-message {
  color: var(--on-surface-color);
}


.goods-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 网格容器 */
.goods-grid-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 5x2 网格布局 */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 24px;
  width: 100%;
  max-width: 1600px;
  height: 100%;
  max-height: 600px;
}

/* 货物卡片 */
.goods-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.goods-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.goods-card:hover {
  background: rgba(0, 212, 255, 0.05);
  border-color: var(--primary-color);
  box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
  transform: translateY(-4px);
}

.goods-card:hover::before {
  transform: scaleX(1);
}

/* 卡片头部 - 货物编号 */
.goods-card-header {
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.goods-no {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-color);
  letter-spacing: 0.5px;
}

/* 卡片主体 - 商品信息 */
.goods-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px 0;
}

.goods-name {
  font-size: 22px;
  font-weight: 500;
  color: var(--on-surface-color);
  margin-bottom: 8px;
  text-align: center;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.goods-spec {
  font-size: 18px;
  color: var(--on-surface-muted);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 卡片底部 - 数量 */
.goods-card-footer {
  display: flex;
  justify-content: center;
  align-items: baseline;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.goods-quantity {
  font-size: 32px;
  font-weight: 700;
  color: var(--success-color);
  margin-right: 8px;
}

.goods-unit {
  font-size: 18px;
  color: var(--on-surface-muted);
  font-weight: 400;
}

/* 更多货物提示 */
.more-goods-hint {
  margin-top: 16px;
  text-align: center;
  font-size: 18px;
  color: var(--on-surface-muted);
  font-style: italic;
}


/* 加载和错误状态 */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  font-size: 16px;
  color: #ccc;
}

.loading::after {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid #333;
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid var(--error-color);
  border-radius: 8px;
  padding: 16px;
  margin: 16px;
  color: var(--error-color);
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-state-icon {
  font-size: 80px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state-text {
  font-size: 28px;
  margin: 0;
  color: #888;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .tray-info {
    width: 250px;
  }
  
  .goods-card {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  
  .goods-info {
    margin-left: 0;
    margin: 12px 0;
  }
  
  .goods-quantity {
    margin-left: 0;
    justify-content: center;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--surface-color);
}

::-webkit-scrollbar-thumb {
  background: var(--primary-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--secondary-color);
}
</style>