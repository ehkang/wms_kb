<template>
  <section class="station-panel" :class="{ 'station-right': stationId === 'Tran3003' }">
    <header class="station-header">
      <h2 class="station-name">{{ stationData.stationName }}</h2>
      <div class="current-tray">
        <span v-if="stationData.currentContainer" class="tray-code">{{ stationData.currentContainer }}</span>
        <span v-else class="no-tray">无托盘</span>
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
            v-for="goods in displayGoods" 
            :key="goods.goodsNo"
            class="goods-card"
          >
            <div class="goods-card-header">
              <span class="goods-no">{{ goods.goodsNo || 'N/A' }}</span>
            </div>
            <div class="goods-card-body">
              <div class="goods-name" :title="goods.goodsName">{{ goods.goodsName || '未知商品' }}</div>
              <div class="goods-spec" :title="goods.goodsSpec">{{ goods.goodsSpec || '-' }}</div>
            </div>
            <div class="goods-card-footer">
              <span class="goods-quantity">{{ Math.floor(goods.quantity) || 0 }}</span>
              <span class="goods-unit">{{ goods.unit || '件' }}</span>
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
  background: var(--surface-color, #0a0a0a);
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  background: linear-gradient(90deg, transparent, var(--primary-color, #00d4ff), transparent);
}

.station-name {
  font-size: clamp(16px, 1.5vw, 20px);
  font-weight: 600;
  color: var(--primary-color, #00d4ff);
  letter-spacing: -0.01em;
  margin: 0;
}

.current-tray {
  font-size: clamp(12px, 1.2vw, 16px);
  font-weight: 500;
}

.tray-code {
  color: var(--accent-color, #00bfa5);
  background: rgba(0, 191, 165, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  border: 1px solid rgba(0, 191, 165, 0.3);
}

.no-tray {
  color: var(--text-muted, #90a4ae);
  font-style: italic;
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
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: clamp(0.5rem, 1vw, 1rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 0;
  box-shadow: 4px 4px 12px rgba(0, 0, 0, 0.5),
              -2px -2px 8px rgba(255, 255, 255, 0.05),
              inset 1px 1px 2px rgba(255, 255, 255, 0.1);
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
  border-color: var(--primary-color, #00d4ff);
  box-shadow: 6px 6px 20px rgba(0, 0, 0, 0.6),
              -3px -3px 12px rgba(0, 212, 255, 0.1),
              inset 1px 1px 2px rgba(0, 212, 255, 0.2),
              0 0 20px rgba(0, 212, 255, 0.2);
  transform: translateY(-2px) scale(1.02);
}

.goods-card:hover::before {
  transform: scaleX(1);
}

.goods-card-header {
  text-align: center;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 0.25rem;
}

.goods-no {
  font-size: clamp(12px, 1.2vw, 16px);
  font-weight: 600;
  color: var(--primary-color, #00d4ff);
  letter-spacing: 0.5px;
}

.goods-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.goods-name {
  font-size: clamp(14px, 1.4vw, 18px);
  font-weight: 500;
  color: var(--on-surface-color, #ffffff);
  margin-bottom: 0.25rem;
  text-align: center;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.goods-spec {
  font-size: clamp(11px, 1.1vw, 14px);
  color: var(--text-secondary, #b3e5fc);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-card-footer {
  display: flex;
  justify-content: center;
  align-items: baseline;
  padding-top: 0.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 0.25rem;
}

.goods-quantity {
  font-size: clamp(18px, 2vw, 24px);
  font-weight: 700;
  color: var(--success-color, #00e676);
  margin-right: 0.5rem;
}

.goods-unit {
  font-size: clamp(11px, 1.1vw, 14px);
  color: var(--text-muted, #90a4ae);
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
  color: var(--on-surface-muted, #a0a0a0);
}

.loading-state {
  color: var(--primary-color, #00d4ff);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 212, 255, 0.3);
  border-top-color: var(--primary-color, #00d4ff);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: var(--error-color, #ff5252);
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