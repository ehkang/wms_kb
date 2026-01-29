<template>
  <div class="model-3d-viewer" ref="containerRef">
    <!-- 默认提示文本：当没有加载模型时显示 -->
    <div v-if="!hasModel" class="no-model-placeholder">
      <span class="placeholder-text">暂无模型</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Model3DCache from '../utils/Model3DCache'

interface Props {
  goodsNo: string
  containerCode: string
  initDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  initDelay: 0
})

const containerRef = ref<HTMLElement>()
const hasModel = ref(false)

// 🔥 3D场景资源（新架构：不再创建WebGLRenderer）
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let displayCanvas: HTMLCanvasElement | null = null  // 🔥 2D canvas用于显示
let controls: OrbitControls | null = null
let currentMesh: THREE.Mesh | null = null
let currentGoodsNo: string = ''

// 获取缓存管理器
const cache = Model3DCache.getInstance()
const instanceId = `viewer-${Date.now()}-${Math.random()}`

/**
 * 初始化3D场景（新架构：使用2D canvas显示）
 */
function init3DScene() {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  // 🔥 创建2D display canvas
  displayCanvas = document.createElement('canvas')
  displayCanvas.width = width
  displayCanvas.height = height
  displayCanvas.style.width = '100%'
  displayCanvas.style.height = '100%'
  displayCanvas.style.display = 'block'
  containerRef.value.appendChild(displayCanvas)

  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x4a5570)  // 🔥 更亮的背景色以增强不锈钢反射

  // 设置共享环境贴图
  const envMap = cache.getEnvMap()
  if (envMap) {
    scene.environment = envMap
    scene.backgroundBlurriness = 0.5
  }

  // 相机
  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000)
  camera.position.set(0, 50, 100)

  // 🔥 控制器（挂载到2D canvas，但不实际使用其渲染功能）
  controls = new OrbitControls(camera, displayCanvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.autoRotate = true
  controls.autoRotateSpeed = 2
  controls.enableZoom = false
  controls.enablePan = false

  // 🔥 优化光照系统 - 强化不锈钢质感
  // 环境光 - 提供柔和的基础照明
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)  // 🔥 提升到0.8以照亮不锈钢
  scene.add(ambientLight)

  // 半球光 - 模拟天空和地面的自然光照
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 1.2)  // 🔥 提升地面亮度和强度
  hemisphereLight.position.set(0, 200, 0)
  scene.add(hemisphereLight)

  // 主方向光 - 模拟工作室主光源
  const mainLight = new THREE.DirectionalLight(0xffffff, 2.0)  // 🔥 提升到2.0
  mainLight.position.set(50, 100, 50)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.width = 1024
  mainLight.shadow.mapSize.height = 1024
  scene.add(mainLight)

  // 补光 - 柔和的补光减少阴影
  const fillLight = new THREE.DirectionalLight(0xffffff, 1.2)  // 🔥 提升到1.2
  fillLight.position.set(-50, 50, -50)
  scene.add(fillLight)

  // 顶部点光源 - 增加金属高光
  const topLight = new THREE.PointLight(0xffffff, 1.8, 500)  // 🔥 提升到1.8
  topLight.position.set(0, 150, 0)
  scene.add(topLight)

  // 🔥 新增：前方补光 - 确保正面清晰可见
  const frontLight = new THREE.DirectionalLight(0xffffff, 1.0)
  frontLight.position.set(0, 0, 100)
  scene.add(frontLight)

  // 🔥 注册到统一动画循环（新架构：传递scene、camera和displayCanvas）
  if (scene && camera && displayCanvas) {
    cache.registerRenderInstance(instanceId, scene, camera, displayCanvas, checkVisibility)
  }
}

/**
 * 更新控制器（自动旋转等）
 */
function updateControls() {
  if (controls) {
    controls.update()
  }
}

// 🔥 添加控制器更新循环（独立于渲染循环）
let controlsUpdateInterval: number | null = null

function startControlsUpdate() {
  if (controlsUpdateInterval) return

  controlsUpdateInterval = window.setInterval(() => {
    updateControls()
  }, 1000 / 60)  // 60fps更新控制器
}

function stopControlsUpdate() {
  if (controlsUpdateInterval) {
    clearInterval(controlsUpdateInterval)
    controlsUpdateInterval = null
  }
}

/**
 * 检查组件是否在视口内
 */
function checkVisibility(): boolean {
  if (!containerRef.value) return false

  const rect = containerRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth

  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < viewportHeight &&
    rect.left < viewportWidth
  )
}

/**
 * 加载STL模型（使用缓存）
 */
async function loadModel() {
  if (!scene || !props.goodsNo) {
    hasModel.value = false
    return
  }

  // 清除旧模型
  if (currentMesh) {
    scene.remove(currentMesh)
    // 注意：不dispose几何体，因为它是从缓存获取的，由缓存管理器负责
    currentMesh.geometry.dispose()  // dispose克隆的geometry
    // 不dispose材质，因为是共享的
    currentMesh = null
  }

  // 释放旧的几何体引用
  if (currentGoodsNo) {
    cache.releaseGeometry(currentGoodsNo)
  }

  hasModel.value = false

  try {
    // 从缓存获取几何体
    const geometry = await cache.getGeometry(props.goodsNo)
    currentGoodsNo = props.goodsNo

    // 获取共享材质
    const material = cache.getSharedMaterial()
    if (!material) {
      throw new Error('共享材质未初始化')
    }

    // 创建网格
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true

    // 居中和缩放模型
    centerAndScaleMesh(mesh)

    scene.add(mesh)
    currentMesh = mesh
    hasModel.value = true

  } catch (error) {
    hasModel.value = false
    currentGoodsNo = ''
  }
}

/**
 * 居中和缩放网格
 */
function centerAndScaleMesh(mesh: THREE.Mesh): void {
  const geometry = mesh.geometry

  geometry.computeBoundingBox()
  if (geometry.boundingBox) {
    const center = new THREE.Vector3()
    geometry.boundingBox.getCenter(center)
    geometry.translate(-center.x, -center.y, -center.z)

    const size = new THREE.Vector3()
    geometry.boundingBox.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 50 / maxDim
    mesh.scale.set(scale, scale, scale)
  }
}

/**
 * 窗口大小调整（新架构：只调整canvas和相机）
 */
function handleResize() {
  if (!containerRef.value || !camera || !displayCanvas) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  // 调整2D canvas尺寸
  displayCanvas.width = width
  displayCanvas.height = height

  // 调整相机
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

/**
 * 清理资源（新架构：不再释放WebGLRenderer）
 */
function cleanup() {
  // 停止控制器更新
  stopControlsUpdate()

  // 从统一动画循环注销
  cache.unregisterRenderInstance(instanceId)

  // 清除网格
  if (currentMesh && scene) {
    scene.remove(currentMesh)
    currentMesh.geometry.dispose()  // dispose克隆的geometry
    currentMesh = null
  }

  // 释放几何体引用
  if (currentGoodsNo) {
    cache.releaseGeometry(currentGoodsNo)
    currentGoodsNo = ''
  }

  // 释放控制器
  if (controls) {
    controls.dispose()
    controls = null
  }

  // 🔥 移除2D canvas
  if (displayCanvas && containerRef.value && displayCanvas.parentNode === containerRef.value) {
    containerRef.value.removeChild(displayCanvas)
    displayCanvas = null
  }

  // 清理场景
  if (scene) {
    scene.clear()
    scene = null
  }

  camera = null
}

// 监听goodsNo变化重新加载模型
watch(() => props.goodsNo, () => {
  if (scene) {
    loadModel()
  }
})

// 监听containerCode变化强制重新加载
watch(() => props.containerCode, () => {
  if (scene) {
    loadModel()
  }
})

onMounted(() => {
  // 延迟初始化，避免同时加载多个模型
  setTimeout(() => {
    init3DScene()
    startControlsUpdate()  // 🔥 启动控制器更新
    window.addEventListener('resize', handleResize)

    // 初始化后加载模型
    setTimeout(() => {
      loadModel()
    }, 100)
  }, props.initDelay)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  cleanup()
})
</script>

<style scoped>
.model-3d-viewer {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.model-3d-viewer :deep(canvas) {
  display: block;
}

/* 暂无模型占位符 */
.no-model-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  z-index: 10;
  pointer-events: none;
}

.placeholder-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  letter-spacing: 1px;
}
</style>
