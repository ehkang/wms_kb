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
            <div v-else class="goods-grid-container" :style="gridContainerStyle">
              <div class="goods-grid" :data-rows="gridRows">
                <div
                  v-for="(goods, index) in localGoods.slice(0, 15)"
                  :key="goods.goodsNo"
                  class="goods-card"
                  :data-compact="gridRows >= 3"
                >
                  <!-- 🔥 3D模型查看器 - 占据整个卡片 -->
                  <div class="goods-3d-container">
                    <Model3DViewer
                      :goods-no="goods.goodsNo || ''"
                      :container-code="currentContainer || ''"
                      :init-delay="index * 200"
                    />

                    <!-- 🔥 漂浮信息层 - 覆盖在3D模型上 -->
                    <div class="goods-info-overlay">
                      <!-- 顶部：料号 -->
                      <div class="overlay-top">
                        <span class="goods-no" :ref="el => setGoodsNoRef(el, index)">{{ goods.goodsNo || 'N/A' }}</span>
                      </div>

                      <!-- 底部：名称、规格和数量信息 -->
                      <div class="overlay-bottom">
                        <!-- 左侧：名称和规格 -->
                        <div class="goods-info-left">
                          <div class="goods-name">{{ goods.goodsName || '未知商品' }}</div>
                          <div class="goods-spec">{{ goods.goodsSpec || '-' }}</div>
                        </div>

                        <!-- 右侧：数量信息 -->
                        <div class="quantity-info">
                          <span class="goods-quantity">{{ Math.floor(goods.quantity) || 0 }}</span>
                          <span class="goods-unit">{{ goods.unit || '件' }}</span>

                          <!-- 拣货数量显示 (红色向下箭头 + 数量) -->
                          <template v-if="goods.pickQuantity && goods.pickQuantity > 0">
                            <span class="pick-arrow">↓</span>
                            <span class="pick-quantity">{{ Math.floor(goods.pickQuantity) }}</span>
                          </template>
                        </div>
                      </div>
                    </div>
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
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useWMSStore } from '../stores/wms'
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
watch(() => props.stationNo, (newStation) => {
  // ✅ 新架构：监控管理由 App.vue 统一负责，这里只更新本地站台号
  localStationNo.value = newStation
})

// 使用状态管理
const wmsStore = useWMSStore()

// 🎯 新架构：获取该站台的独立状态（只读取需要的数据）
const stationState = computed(() => wmsStore.getStationState(localStationNo.value))
const currentContainer = computed(() => stationState.value?.currentContainer || '')
const localGoods = computed(() => stationState.value?.localGoods || [])
const isLoading = computed(() => stationState.value?.isLoading || false)
const errorMessage = computed(() => stationState.value?.errorMessage || '')

// 计算网格行数 (5列布局，最多显示15个货物)
const gridRows = computed(() => {
  const count = Math.min(localGoods.value.length, 15)
  return Math.ceil(count / 5)
})

// 计算网格容器的动态样式（根据行数调整高度）
const gridContainerStyle = computed(() => {
  const rows = gridRows.value
  if (rows === 0) return {}

  // 根据行数计算高度百分比
  // 1行: 占满整个可用空间
  // 2行: 每行占约50%
  // 3行: 每行占约33%
  return {
    '--grid-rows': rows
  }
})

// 本地状态
const starsContainer = ref<HTMLElement>()
const goodsNoRefs = ref<(HTMLElement | null)[]>([])

// 设置物料编码元素引用
const setGoodsNoRef = (el: HTMLElement | null, index: number) => {
  if (el) {
    goodsNoRefs.value[index] = el
  }
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

// 🔥 动态调整物料编码字体大小 - 使用黄金比例充分利用宽度
const adjustGoodsNoFontSize = () => {
  nextTick(() => {
    goodsNoRefs.value.forEach((el) => {
      if (!el) return

      const container = el.parentElement
      if (!container) return

      const containerWidth = container.clientWidth - 12 // 减去padding
      const text = el.textContent || ''
      if (!text || containerWidth <= 0) return

      const isCompact = el.closest('.goods-card')?.getAttribute('data-compact') === 'true'

      // 🔥 目标：文本宽度占容器宽度的 82% (接近黄金比例)
      const targetWidthRatio = 0.82
      const targetWidth = containerWidth * targetWidthRatio

      // 字体大小范围
      const maxFontSize = isCompact ? 22 : 28
      const minFontSize = isCompact ? 12 : 14

      // 🔥 使用二分查找法精确计算字体大小
      let low = minFontSize
      let high = maxFontSize
      let bestSize = minFontSize

      // 创建临时canvas用于精确测量文本宽度
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 二分查找最佳字体大小
      for (let i = 0; i < 15; i++) {  // 最多迭代15次
        const mid = (low + high) / 2
        ctx.font = `600 ${mid}px 'Inter', 'SF Pro Display', 'Segoe UI', 'Microsoft YaHei', sans-serif`
        const textWidth = ctx.measureText(text).width

        if (Math.abs(textWidth - targetWidth) < 2) {  // 误差在2px内即可
          bestSize = mid
          break
        }

        if (textWidth < targetWidth) {
          low = mid
          bestSize = mid  // 保存当前最佳值
        } else {
          high = mid
        }
      }

      el.style.fontSize = `${bestSize}px`
    })
  })
}

// 监听货物数据变化，重新调整字体
watch(() => localGoods.value, () => {
  adjustGoodsNoFontSize()
}, { deep: true })

// 监听网格行数变化（影响紧凑模式）
watch(() => gridRows.value, () => {
  adjustGoodsNoFontSize()
})

// F5 刷新功能处理器
const handleF5Refresh = (e: KeyboardEvent) => {
  if (e.key === 'F5') {
    e.preventDefault()
    wmsStore.refreshData()
  }
}

// ✅ 新架构：组件只负责 UI，不管理监控
onMounted(() => {

  // 生成星星背景
  generateStars()

  // 注册 F5 刷新事件
  document.addEventListener('keydown', handleF5Refresh)

  // 初始调整字体大小
  adjustGoodsNoFontSize()

  // 监听窗口大小变化
  window.addEventListener('resize', adjustGoodsNoFontSize)

})

// ✅ 清理事件监听器，防止内存泄漏
onUnmounted(() => {
  document.removeEventListener('keydown', handleF5Refresh)
  window.removeEventListener('resize', adjustGoodsNoFontSize)
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
  width: 100%;  /* 自适应宽度 */
  height: 100vh;
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

.content {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;  /* 占满剩余空间 */
  min-height: 0;  /* 关键：允许flex子元素收缩 */
  overflow: hidden;  /* 看板项目：禁止滚动 */
}

/* 主内容区 - 全屏显示 */
.main-content {
  flex: 1;
  background: var(--surface-color);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;  /* 看板项目：禁止滚动 */
}

/* 货物信息区域 */
.goods-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 0;  /* 关键：允许收缩 */
  overflow: hidden;  /* 看板项目：禁止滚动 */
}

.goods-list {
  flex: 1;
  overflow: hidden;  /* 看板项目：禁止滚动 */
  padding: 0;
  display: flex;
  align-items: stretch;  /* 拉伸填充 */
  justify-content: center;
  min-height: 0;  /* 关键：允许收缩 */
}

/* 网格容器 */
.goods-grid-container {
  width: 100%;
  height: 100%;  /* 占满父容器 */
  display: flex;
  flex-direction: column;
  background: rgba(26, 31, 58, 0.4);
  border-radius: 0;
  border: none;
  overflow: hidden;
  min-height: 0;  /* 关键：允许收缩 */
}

/* 5×N 自适应网格布局 (1-3行，最多15个) */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  /* 根据行数动态调整：1行占100%，2行各50%，3行各33% */
  grid-template-rows: repeat(var(--grid-rows, 1), 1fr);
  gap: 12px;
  width: 100%;
  flex: 1;  /* 占满剩余空间 */
  min-height: 0;  /* 关键：允许收缩 */
  padding: 12px;
  overflow: hidden;
  align-items: stretch;  /* 拉伸所有子元素 */
}

/* 🎯 紧凑模式：优化网格间距以平衡美观和空间利用 */
.goods-grid[data-rows="3"] {
  gap: 8px;  /* 🔥 优化间距到8px（移除panel header后有足够空间） */
  padding: 8px;  /* 🔥 优化内边距到8px */
}

/* 货物卡片 - Flutter样式 */
.goods-card {
  background: transparent;  /* Flutter使用透明背景 */
  border: 1.5px solid rgba(0, 212, 255, 0.4);
  border-radius: 6px;
  padding: 0;  /* 🔥 移除内边距，让3D模型占满整个卡片 */
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 212, 255, 0.15),
              0 4px 16px rgba(0, 153, 255, 0.1);
  width: 100%;
  height: 100%;
  min-height: 0;  /* 允许收缩 */
}

/* 🎯 紧凑模式：3行时启用 */
.goods-card[data-compact="true"] {
  padding: 0;  /* 🔥 保持0内边距 */
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

/* 🔥 料号样式 - 动态字体缩放（由JS控制） */
.goods-no {
  font-size: 15px;  /* 默认字体大小，会被JS动态调整 */
  font-weight: 600;
  color: var(--primary-color);
  letter-spacing: 0.5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: visible;  /* 允许显示完整文本 */
  width: 100%;
  display: inline-block;
  text-align: center;
  transition: font-size 0.2s ease;  /* 平滑过渡 */
}

/* 🔥 3D模型容器 - 占据整个卡片 */
.goods-3d-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
}

/* 🔥 漂浮信息覆盖层 */
.goods-info-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;  /* 允许点击穿透到3D模型 */
  z-index: 10;
}

/* 🔥 顶部区域 - 料号 */
.overlay-top {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
  padding: 4px 6px;  /* 🔥 压缩padding: 6px→4px, 8px→6px */
  text-align: center;
  backdrop-filter: blur(4px);
}

.goods-card[data-compact="true"] .overlay-top {
  padding: 3px 5px;  /* 🔥 紧凑模式进一步压缩 */
}

/* 🔥 底部区域 - 名称、规格和数量信息 */
.overlay-bottom {
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
  padding: 4px 6px;  /* 🔥 压缩padding: 6px→4px, 8px→6px */
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 6px;  /* 🔥 压缩gap: 8px→6px */
}

.goods-card[data-compact="true"] .overlay-bottom {
  padding: 3px 5px;  /* 🔥 紧凑模式进一步压缩 */
  gap: 4px;  /* 🔥 紧凑模式gap压缩 */
}

/* 左侧：名称和规格 */
.goods-info-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  min-width: 0;  /* 允许文字省略 */
}

/* 右侧：数量信息 */
.quantity-info {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;  /* 数量信息不压缩 */
}

/* 🔥 名称和规格样式 */
.goods-name {
  font-size: 15px;  /* 🔥 优化为1080p屏幕 */
  font-weight: bold;
  color: var(--on-surface-color);
  text-align: left;
  line-height: 1.1;  /* 🔥 压缩行高: 1.2→1.1 */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;  /* 只显示1行 */
  -webkit-box-orient: vertical;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  width: 100%;
}

/* 🎯 紧凑模式：减小字号 */
.goods-card[data-compact="true"] .goods-name {
  font-size: 13px;  /* 🔥 优化为1080p屏幕 */
}

.goods-spec {
  font-size: 12px;  /* 🔥 优化为1080p屏幕 */
  color: var(--text-secondary);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  margin-top: 1px;  /* 🔥 压缩间距: 2px→1px */
  width: 100%;
}

/* 🎯 紧凑模式：保持可读性 */
.goods-card[data-compact="true"] .goods-spec {
  font-size: 11px;  /* 🔥 优化为1080p屏幕 */
}

/* 🔥 数量信息样式 */
.goods-quantity {
  font-size: 17px;  /* 🔥 优化为1080p屏幕 */
  font-weight: bold;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

/* 🎯 紧凑模式：减小字号 */
.goods-card[data-compact="true"] .goods-quantity {
  font-size: 15px;  /* 🔥 优化为1080p屏幕 */
}

.goods-unit {
  font-size: 13px;  /* 🔥 优化为1080p屏幕 */
  color: #90a4ae;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

/* 🎯 紧凑模式：减小字号 */
.goods-card[data-compact="true"] .goods-unit {
  font-size: 12px;  /* 🔥 优化为1080p屏幕 */
}

/* 🔥 拣货数量样式 */
.pick-arrow {
  color: #ff5252;
  margin: 0 2px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.pick-quantity {
  color: #ff5252;
  font-weight: bold;
  font-size: 16px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.goods-card[data-compact="true"] .pick-quantity {
  font-size: 14px;
}

.pick-arrow {
  color: #ff5252;
  margin: 0 3px;
  font-size: 14px;
}

/* 🎯 紧凑模式：减小拣货箭头 */
.goods-card[data-compact="true"] .pick-arrow {
  font-size: 12px;
  margin: 0 2px;
}

.pick-quantity {
  color: #ff5252;
  font-weight: bold;
  font-size: 18px;
}

/* 🎯 紧凑模式：减小拣货数量字号 */
.goods-card[data-compact="true"] .pick-quantity {
  font-size: 16px;
}

/* 更多货物提示 */
.more-goods-hint {
  margin-top: 4px;  /* 🔥 压缩: 8px→4px */
  padding: 4px 8px;  /* 🔥 压缩: 8px 12px→4px 8px */
  text-align: center;
  font-size: 11px;  /* 🔥 压缩: 16px→11px */
  color: var(--on-surface-muted);
  font-style: italic;
  line-height: 1.2;  /* 🔥 控制行高 */
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  text-align: center;
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