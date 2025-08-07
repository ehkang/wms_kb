<template>
  <header class="global-header">
    <h1 class="system-title">双站台监控中心</h1>
    
    <div class="connection-status-group">
      <div class="connection-status">
        <span class="status-label">WMS:</span>
        <div class="status-dot" :class="getStatusClass(dualState.globalConnectionStatus.wmsConnectionStatus)"></div>
        <span :style="{ color: getStatusColor(dualState.globalConnectionStatus.wmsConnectionStatus) }">
          {{ getStatusText(dualState.globalConnectionStatus.wmsConnectionStatus) }}
        </span>
      </div>
      <div class="connection-status">
        <span class="status-label">WCS:</span>
        <div class="status-dot" :class="getStatusClass(dualState.globalConnectionStatus.wcsConnectionStatus)"></div>
        <span :style="{ color: getStatusColor(dualState.globalConnectionStatus.wcsConnectionStatus) }">
          {{ getStatusText(dualState.globalConnectionStatus.wcsConnectionStatus) }}
        </span>
      </div>
    </div>
    
    <div class="device-coordinates">
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
  </header>
</template>

<script setup lang="ts">
import type { DualStationState } from '../stores/wms'
import { computed } from 'vue'

interface Props {
  dualState: DualStationState
}

const props = defineProps<Props>()

const devices = computed(() => props.dualState.devices)

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

const getStatusColor = (status: string) => {
  const colorMap = {
    'connecting': '#ffab00',
    'connected': '#00e676',
    'reconnecting': '#ffab00',
    'disconnected': '#ff5252',
    'error': '#ff5252'
  }
  return colorMap[status] || '#ff5252'
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
</script>

<style scoped>
.global-header {
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
}

.global-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--primary-color, #00d4ff), transparent);
}

.system-title {
  font-size: clamp(18px, 2vw, 24px);
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color, #00d4ff), var(--secondary-color, #7c4dff));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  flex-shrink: 0;
}

.connection-status-group {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-shrink: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: clamp(11px, 1vw, 14px);
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.connection-status:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary-color, #00d4ff);
  box-shadow: 0 4px 16px rgba(0, 212, 255, 0.3);
}

.status-label {
  font-weight: 500;
  color: var(--on-surface-color, #ffffff);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success-color, #00e676);
  animation: pulse 2s infinite;
  box-shadow: 0 0 8px var(--success-color, #00e676);
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
  background: var(--success-color, #00e676);
  opacity: 0.3;
  animation: ping 2s infinite;
}

.status-dot.error {
  background: var(--error-color, #ff5252);
  box-shadow: 0 0 8px var(--error-color, #ff5252);
}

.status-dot.error::after {
  background: var(--error-color, #ff5252);
}

.status-dot.warning {
  background: var(--warning-color-bright, #ffab00);
  box-shadow: 0 0 8px var(--warning-color-bright, #ffab00);
}

.status-dot.warning::after {
  background: var(--warning-color-bright, #ffab00);
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

.device-coordinates {
  display: flex;
  gap: 1rem;
  flex-shrink: 1;
  min-width: 0;
}

.coordinate-item {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: clamp(10px, 0.9vw, 13px);
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  flex-shrink: 1;
}

.coordinate-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--accent-color, #00bfa5);
  box-shadow: 0 4px 16px rgba(0, 191, 165, 0.2);
}

.coordinate-label {
  font-weight: 500;
  margin-bottom: 2px;
  color: var(--on-surface-muted, #a0a0a0);
  font-size: clamp(9px, 0.8vw, 11px);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coordinate-value {
  font-weight: 600;
  color: var(--text-secondary, #b3e5fc);
  font-size: clamp(11px, 1vw, 14px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 响应式调整 */
@media (max-width: 1366px) {
  .device-coordinates {
    gap: 0.5rem;
  }
  
  .coordinate-item {
    padding: 0.4rem 0.8rem;
  }
  
  .connection-status-group {
    gap: 1rem;
  }
}

@media (max-width: 1024px) {
  .global-header {
    padding: 0 1rem;
  }
  
  .device-coordinates {
    display: none;
  }
}
</style>