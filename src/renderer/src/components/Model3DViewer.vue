<template>
  <div class="model-3d-viewer" ref="containerRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { API_CONFIG } from '../config/api'

interface Props {
  goodsNo: string
  containerCode: string
  initDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  initDelay: 0
})

const containerRef = ref<HTMLElement>()
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let currentMesh: THREE.Mesh | null = null
let animationId: number | null = null
let envMap: THREE.Texture | null = null

// 初始化3D场景
function init3DScene() {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  // 场景
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1f3a)

  // 相机
  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000)
  camera.position.set(0, 50, 100)

  // 渲染器（增强渲染质量）
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setSize(width, height)
  // 限制像素比避免性能问题，同时保持清晰度
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  // 色调映射，让金属材质更真实
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.outputColorSpace = THREE.SRGBColorSpace
  containerRef.value.appendChild(renderer.domElement)

  // 控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.autoRotate = true
  controls.autoRotateSpeed = 2
  controls.enableZoom = false
  controls.enablePan = false

  // 优化光照以展现金属质感（参考nx_one）
  // 环境光 - 提供基础照明
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambientLight)

  // 半球光 - 模拟天空和地面的漫反射
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5)
  hemisphereLight.position.set(0, 200, 0)
  scene.add(hemisphereLight)

  // 主方向光 - 模拟主光源
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
  mainLight.position.set(50, 100, 50)
  mainLight.castShadow = true
  scene.add(mainLight)

  // 补光 - 减少阴影过暗
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.6)
  fillLight.position.set(-50, 50, -50)
  scene.add(fillLight)

  // 顶部点光源 - 增加高光效果
  const topLight = new THREE.PointLight(0xffffff, 0.8, 500)
  topLight.position.set(0, 150, 0)
  scene.add(topLight)

  // 生成环境贴图（用于金属材质的真实反射效果）
  generateEnvironmentMap()

  // 开始动画循环
  animate()
}

// 生成环境贴图
function generateEnvironmentMap() {
  if (!renderer || !scene) return

  try {
    // 使用 PMREMGenerator 生成环境贴图
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()

    // 使用 RoomEnvironment 创建室内环境（模拟工作室光照）
    const roomEnv = new RoomEnvironment(renderer)
    envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture

    // 设置场景环境
    scene.environment = envMap

    pmremGenerator.dispose()
    roomEnv.dispose()

    console.log('环境贴图生成成功')
  } catch (e) {
    console.warn('生成环境贴图失败，将使用基础光照:', e)
  }
}

// 动画循环
function animate() {
  if (!scene || !camera || !renderer || !controls) return

  animationId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

// 加载STL模型
async function loadModel() {
  if (!scene || !props.goodsNo) return

  // 清除旧模型
  if (currentMesh) {
    scene.remove(currentMesh)
    currentMesh.geometry.dispose()
    if (Array.isArray(currentMesh.material)) {
      currentMesh.material.forEach(mat => mat.dispose())
    } else {
      currentMesh.material.dispose()
    }
    currentMesh = null
  }

  // 构建下载URL（直接使用二进制下载接口）
  const modelUrl = `${API_CONFIG.NX_ONE_BASE_URL}/technical/drawing/model3d/download?code=${encodeURIComponent(props.goodsNo)}&version=A`

  console.log('加载3D模型:', props.goodsNo, '→', modelUrl)

  try {
    // 使用fetch获取STL文件（禁用缓存）
    const response = await fetch(modelUrl, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    console.log('3D模型响应类型:', contentType, '料号:', props.goodsNo)

    // 检查是否为有效的STL文件
    if (contentType && !contentType.includes('stl') && !contentType.includes('octet-stream')) {
      console.warn('响应类型不是STL:', contentType, '尝试继续解析')
    }

    // 获取文件内容
    const arrayBuffer = await response.arrayBuffer()

    // 验证文件大小
    if (arrayBuffer.byteLength < 84) {
      throw new Error(`STL文件过小: ${arrayBuffer.byteLength} bytes`)
    }

    // 验证STL文件头
    const dataView = new DataView(arrayBuffer)
    const triangleCount = dataView.getUint32(80, true) // Little Endian

    // 计算预期文件大小
    const expectedSize = 84 + triangleCount * 50

    if (Math.abs(arrayBuffer.byteLength - expectedSize) > 4) {
      console.warn('STL文件大小异常:', {
        actual: arrayBuffer.byteLength,
        expected: expectedSize,
        triangleCount
      })
    }

    // 使用STLLoader解析
    const loader = new STLLoader()
    const geometry = loader.parse(arrayBuffer)

    console.log('3D模型解析成功:', props.goodsNo, `三角形数: ${triangleCount}`)

    // 创建不锈钢材质（参考nx_one的金属材质）
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x8a9099,         // 不锈钢灰色
      metalness: 0.95,         // 高金属度
      roughness: 0.55,         // 适中粗糙度
      envMap: envMap,          // 环境贴图（关键！用于金属反射）
      envMapIntensity: 0.6,    // 环境贴图强度
      clearcoat: 0,
      reflectivity: 0.5,
      side: THREE.DoubleSide,
      flatShading: false
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true

    // 居中模型
    geometry.computeBoundingBox()
    if (geometry.boundingBox) {
      const center = new THREE.Vector3()
      geometry.boundingBox.getCenter(center)
      geometry.translate(-center.x, -center.y, -center.z)

      // 自适应缩放
      const size = new THREE.Vector3()
      geometry.boundingBox.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 50 / maxDim
      mesh.scale.set(scale, scale, scale)
    }

    scene.add(mesh)
    currentMesh = mesh

  } catch (error) {
    console.error('3D模型加载失败:', props.goodsNo, error.message)
    console.error('请求URL:', modelUrl)
    // 静默失败，不显示错误详情（用户体验更友好）
  }
}

// 窗口大小调整
function handleResize() {
  if (!containerRef.value || !camera || !renderer) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// 清理资源
function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  if (currentMesh) {
    currentMesh.geometry.dispose()
    if (Array.isArray(currentMesh.material)) {
      currentMesh.material.forEach(mat => mat.dispose())
    } else {
      currentMesh.material.dispose()
    }
  }

  if (envMap) {
    envMap.dispose()
    envMap = null
  }

  if (controls) {
    controls.dispose()
  }

  if (renderer) {
    renderer.dispose()
    if (containerRef.value && renderer.domElement.parentNode === containerRef.value) {
      containerRef.value.removeChild(renderer.domElement)
    }
  }

  scene = null
  camera = null
  renderer = null
  controls = null
  currentMesh = null
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

.model-3d-viewer >>> canvas {
  display: block;
}
</style>
