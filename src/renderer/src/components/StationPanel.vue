<template>
  <section class="station-panel" :class="{ 'station-right': stationId === 'Tran3003' }">
    <header class="station-header">
      <div class="header-left">
        <h2 class="station-name">{{ stationData.stationName }}</h2>
      </div>
      <div v-if="stationData.currentContainer" class="header-center">
        <div class="container-badge">
          容器: {{ stationData.currentContainer }}
        </div>
      </div>
      <div class="header-right">
        <span v-if="!stationData.currentContainer" class="no-tray">无托盘</span>
      </div>
    </header>
    
    <div class="goods-container">
      <div v-if="stationData.isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载货物信息...</p>
      </div>
      
      <div v-else-if="stationData.errorMessage" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ stationData.errorMessage }}</p>
      </div>
      
      <div v-else-if="stationData.localGoods.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <p>{{ stationData.currentContainer ? '该托盘暂无货物' : '当前站台暂无托盘' }}</p>
      </div>
      
      <div v-else class="goods-grid-container">
        <div class="goods-grid">
          <div
            v-for="(goods, index) in displayGoods"
            :key="goods.goodsNo"
            class="goods-card"
          >
            <div class="goods-card-header">
              <span class="goods-no">{{ goods.goodsNo || 'N/A' }}</span>
            </div>

            <!-- 3D模型查看器区域 -->
            <div class="goods-3d-container">
              <Model3DViewer
                :goods-no="goods.goodsNo || ''"
                :container-code="stationData.currentContainer || ''"
                :init-delay="index * 200"
              />
            </div>

            <div class="goods-card-body">
              <div class="goods-name" :title="goods.goodsName">{{ goods.goodsName || '未知商品' }}</div>
              <div class="goods-spec" :title="goods.goodsSpec">{{ goods.goodsSpec || '-' }}</div>
            </div>
            <div class="goods-card-footer">
              <span class="goods-quantity">{{ Math.floor(goods.quantity) || 0 }}</span>
              <span class="goods-unit">{{ goods.unit || '件' }}</span>

              <!-- 拣货数量显示 (红色向下箭头 + 数量) -->
              <template v-if="goods.pickQuantity && goods.pickQuantity > 0">
                <span class="pick-arrow" style="color: #ff5252; margin: 0 4px;">↓</span>
                <span class="pick-quantity" style="color: #ff5252; font-weight: bold; font-size: clamp(12px, 1.3vw, 16px);">{{ Math.floor(goods.pickQuantity) }}</span>
              </template>
            </div>
          </div>
        </div>
        <div v-if="stationData.localGoods.length > 16" class="more-goods-hint">
          ... 还有 {{ stationData.localGoods.length - 16 }} 种货物
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SingleStationData } from '../stores/wms'
import { computed } from 'vue'
import Model3DViewer from './Model3DViewer.vue'

interface Props {
  stationId: string
  stationData: SingleStationData
}

const props = defineProps<Props>()

const displayGoods = computed(() => {
  return props.stationData.localGoods.slice(0, 16)
})
</script>

<style scoped>
.station-panel {
  flex: 1;
  width: 50vw;
  height: 92vh;
  display: flex;
  flex-direction: column;
  background: #0a0e27;  /* Flutter背景色 */
  position: relative;
}

.station-panel.station-right {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.station-panel.station-right::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(180deg, transparent, var(--primary-color, #00d4ff), transparent);
}

.station-header {
  height: 6vh;
  min-height: 40px;
  max-height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  border-bottom: 1px solid rgba(0, 212, 255, 0.5);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  backdrop-filter: blur(10px);
  position: relative;
}

.station-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 1.5rem;
  right: 1.5rem;
  height: 1px;
  background: linear-gradient(90deg, transparent, #00d4ff, transparent);
}

.header-left {
  flex: 1;
}

.station-name {
  font-size: clamp(16px, 1.5vw, 20px);
  font-weight: 600;
  color: #00d4ff;
  letter-spacing: -0.01em;
  margin: 0;
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.container-badge {
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.3), rgba(255, 87, 34, 0.2));
  border: 2px solid rgba(255, 152, 0, 0.6);
  border-radius: 20px;
  color: #ff9800;
  font-size: clamp(12px, 1.2vw, 16px);
  font-weight: bold;
  letter-spacing: 1px;
  white-space: nowrap;
}

.header-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.no-tray {
  color: #90a4ae;
  font-style: italic;
  font-size: clamp(12px, 1.2vw, 16px);
}

.goods-container {
  flex: 1;
  height: calc(92vh - 6vh);
  padding: 2vh 1.5vw;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.goods-grid-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: min(2vh, 1.5vw);
  height: 100%;
  width: 100%;
}

.goods-card {
  background: transparent;  /* Flutter使用透明背景 */
  border: 1.5px solid rgba(0, 212, 255, 0.4);
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 0;
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.2),
              0 6px 20px rgba(0, 153, 255, 0.15);
}

.goods-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary-color, #00d4ff), var(--secondary-color, #7c4dff));
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

.goods-card-header {
  text-align: center;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 0.3rem;
  flex-shrink: 0;
}

.goods-no {
  font-size: clamp(10px, 1vw, 12px);
  font-weight: 600;
  color: #00d4ff;
  letter-spacing: 0.5px;
}

/* 3D模型容器 - 给予更多空间 */
.goods-3d-container {
  flex: 1;
  min-height: 0;
  position: relative;
  margin: 0.5rem 0;
  overflow: hidden;
  border-radius: 8px;
}

.goods-card-body {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.goods-name {
  font-size: clamp(12px, 1.2vw, 15px);
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 0.2rem;
  text-align: left;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.goods-spec {
  font-size: clamp(9px, 0.9vw, 11px);
  color: rgba(255, 255, 255, 0.6);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-card-footer {
  display: flex;
  justify-content: center;
  align-items: baseline;
  padding: 0.4rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-top: 0.5rem;
}

.goods-quantity {
  font-size: clamp(14px, 1.5vw, 16px);
  font-weight: bold;
  color: #ffffff;
  margin-right: 0.3rem;
  letter-spacing: 0.5px;
}

.goods-unit {
  font-size: clamp(10px, 1vw, 12px);
  color: #90a4ae;
  font-weight: 400;
}

.more-goods-hint {
  margin-top: 1rem;
  text-align: center;
  font-size: clamp(14px, 1.3vw, 18px);
  color: var(--on-surface-muted, #a0a0a0);
  font-style: italic;
}

/* 状态显示 */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #a0a0a0;
}

.loading-state {
  color: #00d4ff;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 212, 255, 0.3);
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: #ff5252;
}

.error-icon,
.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.error-state p,
.empty-state p,
.loading-state p {
  font-size: clamp(14px, 1.3vw, 18px);
  margin: 0;
}

/* 响应式调整 */
@media (max-width: 1366px) {
  .goods-grid {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(5, 1fr);
  }
  
  .goods-card {
    padding: 0.4rem;
  }
}

@media (max-width: 1024px) {
  .station-header {
    padding: 0 1rem;
  }
  
  .goods-container {
    padding: 1.5vh 1vw;
  }
  
  .goods-grid {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
  }
}

@media (max-height: 800px) {
  .goods-grid {
    grid-template-rows: repeat(3, 1fr);
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>