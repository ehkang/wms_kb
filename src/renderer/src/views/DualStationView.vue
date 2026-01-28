<template>
  <div class="dual-station-dashboard">
    <!-- 星空背景 -->
    <div class="stars-container" ref="starsContainer"></div>

    <!-- 双站台主体容器 -->
    <main class="stations-container">
      <StationPanel 
        station-id="Tran3002" 
        :station-data="dualState.station3002" 
        class="station-left" 
      />
      <StationPanel 
        station-id="Tran3003" 
        :station-data="dualState.station3003" 
        class="station-right"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useWMSStore } from '../stores/wms'
import StationPanel from '../components/StationPanel.vue'
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr'
import type { HubConnection } from '@microsoft/signalr'
import { API_CONFIG } from '../config/api'

const wmsStore = useWMSStore()
const starsContainer = ref<HTMLElement>()

// 获取双站台状态
const dualState = computed(() => wmsStore.getDualStationState())

// SignalR 连接
let signalRConnection: HubConnection | null = null

const generateStars = () => {
  if (!starsContainer.value) return
  
  const numStars = 100
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
      console.log(`双站台收到设备更新: ${deviceNo}`, newInfo)
      // 更新站台设备
      if (deviceNo === 'Tran3002' || deviceNo === 'Tran3003') {
        wmsStore.updateStationDevice(deviceNo, newInfo)
      }
      // 更新坐标设备
      else if (['Crn2001', 'Crn2002', 'RGV01'].includes(deviceNo)) {
        wmsStore.updateStationDevice(deviceNo, newInfo)
      }
      // 更新其他监控设备
      else if (['Crn2002', 'TranLine3000'].includes(deviceNo)) {
        // 处理父设备的子设备更新
        if (newInfo.childrenDevice && newInfo.childrenDevice.length > 0) {
          newInfo.childrenDevice.forEach((childDevice: any) => {
            if (childDevice.code === 'Tran3002' || childDevice.code === 'Tran3003') {
              wmsStore.updateStationDevice(childDevice.code, childDevice)
            }
          })
        }
        // 同时更新父设备信息到双站台设备列表中
        const dualState = wmsStore.getDualStationState()
        dualState.devices[deviceNo] = newInfo
      }
    })

    // 连接状态事件
    signalRConnection.onreconnecting(() => {
      const currentState = wmsStore.getDualStationState()
      currentState.globalConnectionStatus.wcsConnectionStatus = 'reconnecting'
    })

    signalRConnection.onreconnected(() => {
      const currentState = wmsStore.getDualStationState()
      currentState.globalConnectionStatus.wcsConnectionStatus = 'connected'
    })

    signalRConnection.onclose(() => {
      const currentState = wmsStore.getDualStationState()
      currentState.globalConnectionStatus.wcsConnectionStatus = 'disconnected'
    })

    await signalRConnection.start()
    console.log("双站台SignalR连接已建立")
    const currentState = wmsStore.getDualStationState()
    currentState.globalConnectionStatus.wcsConnectionStatus = 'connected'
  } catch (error) {
    console.error("双站台SignalR连接失败:", error)
    const currentState = wmsStore.getDualStationState()
    currentState.globalConnectionStatus.wcsConnectionStatus = 'error'
  }
}

// 生命周期
onMounted(async () => {
  // 生成星空背景
  generateStars()
  
  // 数据刷新定时器（参考Flutter设计：10秒轮询，配合SignalR实时推送）
  // 主要用于确保数据一致性，SignalR是主要的数据更新方式
  const refreshTimer = setInterval(() => {
    wmsStore.refreshDualStationData()
  }, 10000) // 10秒刷新一次
  
  // 初始化双站台数据
  console.log('正在初始化双站台数据...')
  await wmsStore.initializeDualStation()
  
  // 初始化SignalR连接
  await initSignalR()
  
  // 清理函数
  onUnmounted(() => {
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
    wmsStore.refreshDualStationData()
  }
})
</script>

<style scoped>
/* Flutter主题配色方案 */
:root {
  --primary-color: #00d4ff;
  --secondary-color: #0099ff;
  --accent-color: #00bfa5;
  --surface-color: #0a0e27;  /* Flutter背景色 */
  --surface-elevated: #1a1f3a;  /* Flutter表面色 */
  --surface-glass: rgba(255, 255, 255, 0.02);
  --on-surface-color: #ffffff;
  --on-surface-muted: #a0a0a0;
  --error-color: #ff5252;
  --success-color: #00e676;
  --warning-color: #ffc107;
  --warning-color-bright: #ffab00;
  --text-secondary: #b3e5fc;
  --text-muted: #90a4ae;
  --card-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  --border-color: rgba(255, 255, 255, 0.1);
  --shadow-color: rgba(0, 0, 0, 0.3);
  --glow-color: rgba(0, 212, 255, 0.3);
  --container-color: #ff9800;  /* 容器编码橙色 */
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dual-station-dashboard {
  font-family: 'Inter', 'SF Pro Display', 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(124, 77, 255, 0.1) 0%, transparent 50%),
              var(--surface-color);
  color: var(--on-surface-color);
  overflow: hidden;
  height: 100vh;
  width: 100vw;
  font-weight: 400;
  letter-spacing: -0.01em;
  display: flex;
  flex-direction: column;
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

.stations-container {
  height: 100vh;
  display: flex;
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
}

.station-left,
.station-right {
  width: 50vw;
  height: 100vh;
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
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

/* 响应式调整 */
@media (max-width: 1366px) {
  .dual-station-dashboard {
    font-size: 14px;
  }
}

@media (max-width: 1024px) {
  .dual-station-dashboard {
    font-size: 13px;
  }
  
  .stars-container .star {
    display: none; /* 在小屏幕上隐藏星星以提高性能 */
  }
}

@media (max-height: 800px) {
  .dual-station-dashboard {
    font-size: 12px;
  }
}

/* 确保组件在全屏模式下正确显示 */
@media (min-width: 1920px) and (min-height: 1080px) {
  .dual-station-dashboard {
    font-size: 16px;
  }
  
  .stars-container {
    display: block;
  }
  
  .star {
    opacity: 0.8;
  }
}

/* 开发模式窗口适配 */
@media (max-width: 1600px) and (max-height: 900px) {
  .stations-container {
    height: 100vh;
  }

  .station-left,
  .station-right {
    height: 100vh;
  }
}

/* 确保在任何情况下都不会出现水平滚动条 */
.dual-station-dashboard,
.stations-container,
.station-left,
.station-right {
  overflow-x: hidden;
}
</style>