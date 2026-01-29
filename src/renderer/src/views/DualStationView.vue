<template>
  <div class="dual-station-dashboard">
    <!-- 星空背景 -->
    <div class="stars-container" ref="starsContainer"></div>

    <!-- 双站台主体容器 -->
    <main class="stations-container">
      <SingleStation
        station-no="Tran3002"
        class="station-left"
      />
      <SingleStation
        station-no="Tran3003"
        class="station-right"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SingleStation from './SingleStation.vue'

const starsContainer = ref<HTMLElement>()

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

// 生命周期
onMounted(() => {
  // 生成星空背景
  generateStars()
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
  height: 100%;  /* ✅ 修改：使用100%而不是100vh，适应父容器 */
  width: 100%;   /* ✅ 修改：使用100%而不是100vw */
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
  display: flex;
  position: relative;
  z-index: 1;
  flex: 1;  /* ✅ 占满父容器剩余空间 */
  min-height: 0;  /* ✅ 允许收缩 */
  gap: 2px;  /* 中间的小缝隙 */
  overflow: hidden;  /* ✅ 防止溢出 */
}

.station-left,
.station-right {
  flex: 1;  /* 自适应宽度，各占一半 */
  height: 100%;  /* ✅ 修改：使用100%而不是100vh */
  min-height: 0;  /* ✅ 允许收缩 */
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
  /* ✅ 移除固定高度，让flex布局自动处理 */
  .dual-station-dashboard {
    font-size: 13px;
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