<template>
  <div class="dashboard">
    <!-- 星空背景 -->
    <div class="stars-container" ref="starsContainer"></div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- 主内容（去掉侧边栏，全屏显示货物） -->
      <main class="main-content">
        <!-- 货物信息区域 - 全屏 -->
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
              <!-- 货物面板标题 -->
              <div class="goods-panel-header">
                <div class="panel-left">
                  <span class="panel-icon">📦</span>
                  <span class="panel-title">货物展示</span>
                </div>
                <div v-if="currentContainer" class="panel-center">
                  <div class="container-badge">
                    容器: {{ currentContainer }}
                  </div>
                </div>
                <div class="panel-right">
                  <span class="grid-info">5 × {{ gridRows }}</span>
                  <span class="count-badge">{{ localGoods.length }} / 15</span>
                </div>
              </div>

              <div class="goods-grid">
                <div
                  v-for="(goods, index) in localGoods.slice(0, 15)"
                  :key="goods.goodsNo"
                  class="goods-card"
                >
                  <div class="goods-card-header">
                    <span class="goods-no" style="color: #00d4ff;">{{ goods.goodsNo || 'N/A' }}</span>
                  </div>

                  <!-- 3D模型查看器区域 -->
                  <div class="goods-3d-container">
                    <Model3DViewer
                      :goods-no="goods.goodsNo || ''"
                      :container-code="currentContainer || ''"
                      :init-delay="index * 200"
                    />
                  </div>

                  <div class="goods-card-body">
                    <div class="goods-name">{{ goods.goodsName || '未知商品' }}</div>
                    <div class="goods-spec" style="color: #b3e5fc;">{{ goods.goodsSpec || '-' }}</div>
                  </div>
                  <div class="goods-card-footer">
                    <span class="goods-quantity" style="color: #ffffff;">{{ Math.floor(goods.quantity) || 0 }}</span>
                    <span class="goods-unit" style="color: #90a4ae;">{{ goods.unit || '件' }}</span>

                    <!-- 拣货数量显示 (红色向下箭头 + 数量) -->
                    <template v-if="goods.pickQuantity && goods.pickQuantity > 0">
                      <span class="pick-arrow" style="color: #ff5252; margin: 0 4px;">↓</span>
                      <span class="pick-quantity" style="color: #ff5252; font-weight: bold; font-size: 18px;">{{ Math.floor(goods.pickQuantity) }}</span>
                    </template>
                  </div>
                </div>
              </div>
              <div v-if="localGoods.length > 15" class="more-goods-hint">
                ... 还有 {{ localGoods.length - 15 }} 种货物
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useWMSStore } from '../stores/wms'
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr'
import type { HubConnection } from '@microsoft/signalr'
import { API_CONFIG } from '../config/api'
import Model3DViewer from '../components/Model3DViewer.vue'

// Props from parent (App.vue)
interface Props {
  stationNo: string
}

const props = withDefaults(defineProps<Props>(), {
  stationNo: 'Tran3001'
})

// 使用prop的站台编号
const localStationNo = ref(props.stationNo)

// Watch for station changes from parent
watch(() => props.stationNo, async (newStation) => {
  console.log(`📍 站台更新: ${localStationNo.value} → ${newStation}`)
  localStationNo.value = newStation
  wmsStore.setLocalStationNo(newStation)

  // 🔧 切换站台时不重新初始化连接，只刷新数据
  // 保持WebSocket全局连接不断开（参考Flutter设计）
  wmsStore.refreshData()
  console.log(`✅ 已切换到站台: ${newStation}（保持连接）`)
})

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

// 计算网格行数 (5列布局，最多显示15个货物)
const gridRows = computed(() => {
  const count = Math.min(localGoods.value.length, 15)
  return Math.ceil(count / 5)
})

// 本地状态
const starsContainer = ref<HTMLElement>()

// SignalR 连接
let signalRConnection: HubConnection | null = null

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
  } catch (error) {
    console.error("SignalR连接失败:", error)
    wmsStore.setWcsConnectionStatus('error')
  }
}

// 生命周期
onMounted(async () => {
  // 从持久化存储加载站台配置
  if (window.api && window.api.config) {
    try {
      // 调试：打印配置文件路径
      const configPath = await window.api.config.getPath()
      console.log('持久化存储路径:', configPath)
      
      // 加载保存的站台
      const savedStation = await window.api.config.get('station')
      console.log('已保存的站台:', savedStation)
      
      if (savedStation && !urlParams.get('p')) {
        // 如果有保存的站台且URL没有参数，使用保存的站台
        localStationNo.value = savedStation
        selectedStation.value = savedStation
        console.log('使用持久化存储的站台:', savedStation)
      } else {
        console.log('使用默认站台或URL参数:', localStationNo.value)
      }
      
      // 打印所有配置
      const allConfig = await window.api.config.getAll()
      console.log('所有配置:', allConfig)
    } catch (error) {
      console.error('Failed to load station from config:', error)
    }
  } else {
    console.warn('Config API not available')
  }
  
  // 设置当前站台编号
  console.log('设置当前站台编号:', localStationNo.value)
  wmsStore.setLocalStationNo(localStationNo.value)
  
  // 生成星星背景
  generateStars()

  // 数据刷新定时器（参考Flutter设计：10秒轮询，配合SignalR实时推送）
  // 主要用于确保数据一致性，SignalR是主要的数据更新方式
  const refreshTimer = setInterval(() => {
    wmsStore.refreshData()
  }, 10000) // 10秒刷新一次

  // 清理函数 - 必须在 await 之前注册
  onUnmounted(() => {
    clearInterval(refreshTimer)
    if (signalRConnection) {
      signalRConnection.stop()
    }
  })

  // 初始化
  console.log('单站台看板启动完成')
  await wmsStore.initialize()
  await initSignalR()
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

.content {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100vh;
}

/* 主内容区 - 全屏显示 */
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
  padding: 0;
  min-height: 0;
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
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(26, 31, 58, 0.4);
  border-radius: 0;
  border: none;
  overflow: hidden;
}

/* 货物面板标题 */
.goods-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  height: 48px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  border-bottom: 1px solid rgba(0, 212, 255, 0.5);
  position: relative;
}

.panel-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-icon {
  font-size: 24px;
}

.panel-title {
  color: var(--primary-color);
  font-size: 16px;
  font-weight: bold;
}

.panel-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.container-badge {
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.3), rgba(255, 87, 34, 0.2));
  border: 2px solid rgba(255, 152, 0, 0.6);
  border-radius: 20px;
  color: var(--container-color);
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 1px;
}

.panel-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.grid-info {
  color: rgba(0, 212, 255, 0.7);
  font-size: 14px;
}

.count-badge {
  padding: 4px 12px;
  background: rgba(0, 212, 255, 0.2);
  border-radius: 12px;
  color: var(--primary-color);
  font-size: 16px;
  font-weight: bold;
}

/* 5×N 自适应网格布局 (1-3行，最多15个) */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-auto-rows: 1fr;
  gap: 12px;
  width: 100%;
  flex: 1;
  padding: 12px;
  align-content: center;
}

/* 货物卡片 - Flutter样式 */
.goods-card {
  background: transparent;  /* Flutter使用透明背景 */
  border: 1.5px solid rgba(0, 212, 255, 0.4);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 212, 255, 0.15),
              0 4px 16px rgba(0, 153, 255, 0.1);
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
  background: linear-gradient(145deg, rgba(0, 212, 255, 0.1), rgba(0, 212, 255, 0.02));
  border-color: #00d4ff;
  box-shadow: 0 6px 20px rgba(0, 212, 255, 0.4),
              0 8px 32px rgba(0, 153, 255, 0.3),
              inset 1px 1px 2px rgba(0, 212, 255, 0.2);
  transform: translateY(-2px) scale(1.02);
}

.goods-card:hover::before {
  transform: scaleX(1);
}

/* 卡片头部 - 货物编号 */
.goods-card-header {
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.goods-no {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color);
  letter-spacing: 0.5px;
}

/* 3D模型容器 - 给予更多空间 */
.goods-3d-container {
  flex: 1;
  min-height: 0;
  position: relative;
  margin: 12px 0;
  overflow: hidden;
  border-radius: 8px;
}

/* 卡片主体 - 商品信息 */
.goods-card-body {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 4px 0;
}

.goods-name {
  font-size: 15px;
  font-weight: bold;
  color: var(--on-surface-color);
  margin-bottom: 4px;
  text-align: left;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.goods-spec {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 卡片底部 - 数量 */
.goods-card-footer {
  display: flex;
  justify-content: center;
  align-items: baseline;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-top: 8px;
}

.goods-quantity {
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;  /* Flutter使用白色 */
  margin-right: 4px;
  letter-spacing: 0.5px;
}

.goods-unit {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 400;
}

/* 更多货物提示 */
.more-goods-hint {
  margin-top: 8px;
  padding: 8px 12px;
  text-align: center;
  font-size: 16px;
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