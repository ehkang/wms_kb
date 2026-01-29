/**
 * 3D模型资源缓存管理器 - 单例模式
 *
 * 核心优化策略:
 * 1. 几何体缓存 - 相同goodsNo的STL只加载一次，所有实例共享
 * 2. 共享材质 - 所有模型使用同一个材质实例
 * 3. 共享环境贴图 - 全局统一的环境光照
 * 4. 统一动画循环 - 单个requestAnimationFrame管理所有Model3DViewer实例
 * 5. 视口可见性检测 - 只渲染可见区域的模型
 * 6. 帧率限制 - 降低到30fps减少GPU负载
 */

import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { API_CONFIG } from '../config/api'

// 几何体缓存接口
interface GeometryCache {
  geometry: THREE.BufferGeometry
  loading: Promise<THREE.BufferGeometry> | null
  lastUsed: number
  refCount: number
}

// 渲染实例接口
interface RenderInstance {
  id: string
  render: () => void
  checkVisibility: () => boolean
  isActive: boolean
}

class Model3DCache {
  private static instance: Model3DCache | null = null

  // 共享资源
  private sharedMaterial: THREE.MeshPhysicalMaterial | null = null
  private envMap: THREE.Texture | null = null
  private geometryCache: Map<string, GeometryCache> = new Map()

  // 渲染实例管理
  private renderInstances: Map<string, RenderInstance> = new Map()
  private animationId: number | null = null
  private isAnimating: boolean = false

  // STL加载器（可复用）
  private stlLoader: STLLoader = new STLLoader()

  // 性能配置
  private readonly MAX_FPS = 30
  private readonly FRAME_INTERVAL = 1000 / this.MAX_FPS
  private lastFrameTime = 0

  // 缓存管理
  private readonly CACHE_CLEANUP_INTERVAL = 60000  // 60秒
  private readonly CACHE_MAX_AGE = 300000  // 5分钟
  private cacheCleanupTimer: number | null = null

  // 临时渲染器（仅用于生成环境贴图）
  private tempRenderer: THREE.WebGLRenderer | null = null

  private constructor() {
    this.initializeSharedResources()
    this.startCacheCleanup()
  }

  static getInstance(): Model3DCache {
    if (!Model3DCache.instance) {
      Model3DCache.instance = new Model3DCache()
    }
    return Model3DCache.instance
  }

  /**
   * 初始化共享资源（材质、环境贴图）
   */
  private initializeSharedResources() {
    try {
      // 创建临时渲染器用于生成环境贴图
      this.tempRenderer = new THREE.WebGLRenderer({ antialias: false })
      this.tempRenderer.setSize(256, 256)  // 小尺寸足够

      // 生成环境贴图
      const pmremGenerator = new THREE.PMREMGenerator(this.tempRenderer)
      pmremGenerator.compileEquirectangularShader()

      const scene = new THREE.Scene()
      const geometry = new THREE.BoxGeometry(1, 1, 1)
      const material = new THREE.MeshBasicMaterial({ color: 0x808080 })
      const cube = new THREE.Mesh(geometry, material)
      scene.add(cube)

      this.envMap = pmremGenerator.fromScene(scene, 0.04).texture

      // 清理
      pmremGenerator.dispose()
      geometry.dispose()
      material.dispose()

      // 创建共享的不锈钢材质
      this.sharedMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x8a9099,
        metalness: 0.95,
        roughness: 0.55,
        envMap: this.envMap,
        envMapIntensity: 0.6,
        clearcoat: 0,
        reflectivity: 0.5,
        side: THREE.DoubleSide,
        flatShading: false
      })

    } catch (e) {
      console.error('Failed to initialize shared resources:', e)
    }
  }

  /**
   * 获取共享材质
   */
  getSharedMaterial(): THREE.MeshPhysicalMaterial | null {
    return this.sharedMaterial
  }

  /**
   * 获取环境贴图
   */
  getEnvMap(): THREE.Texture | null {
    return this.envMap
  }

  /**
   * 获取几何体（优先从缓存）
   */
  async getGeometry(goodsNo: string): Promise<THREE.BufferGeometry> {
    const cacheKey = goodsNo
    let cached = this.geometryCache.get(cacheKey)

    // 如果缓存中有且不在加载中
    if (cached && !cached.loading) {
      cached.lastUsed = Date.now()
      cached.refCount++
      return cached.geometry.clone()  // 返回克隆，避免多个mesh共享同一个geometry实例
    }

    // 如果正在加载，等待加载完成
    if (cached?.loading) {
      const geometry = await cached.loading
      return geometry.clone()
    }

    // 创建新的加载Promise
    const loadingPromise = this.loadGeometryFromServer(goodsNo)

    // 添加到缓存（标记为加载中）
    this.geometryCache.set(cacheKey, {
      geometry: new THREE.BufferGeometry(),
      loading: loadingPromise,
      lastUsed: Date.now(),
      refCount: 1
    })

    try {
      const geometry = await loadingPromise

      // 更新缓存
      this.geometryCache.set(cacheKey, {
        geometry,
        loading: null,
        lastUsed: Date.now(),
        refCount: 1
      })

      return geometry.clone()

    } catch (error) {
      // 加载失败，移除缓存
      this.geometryCache.delete(cacheKey)
      throw error
    }
  }

  /**
   * 从服务器加载几何体
   */
  private async loadGeometryFromServer(goodsNo: string): Promise<THREE.BufferGeometry> {
    const modelUrl = `${API_CONFIG.NX_ONE_BASE_URL}/technical/drawing/model3d/download?code=${encodeURIComponent(goodsNo)}&autoVersion=true`

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

    const arrayBuffer = await response.arrayBuffer()

    if (arrayBuffer.byteLength < 84) {
      throw new Error(`STL文件过小: ${arrayBuffer.byteLength} bytes`)
    }

    const geometry = this.stlLoader.parse(arrayBuffer)

    return geometry
  }

  /**
   * 释放几何体引用
   */
  releaseGeometry(goodsNo: string): void {
    const cached = this.geometryCache.get(goodsNo)
    if (cached && cached.refCount > 0) {
      cached.refCount--
    }
  }

  /**
   * 注册渲染实例
   */
  registerRenderInstance(id: string, render: () => void, checkVisibility: () => boolean): void {
    this.renderInstances.set(id, {
      id,
      render,
      checkVisibility,
      isActive: true
    })

    // 启动动画循环（如果还未启动）
    if (!this.isAnimating) {
      this.startAnimation()
    }
  }

  /**
   * 注销渲染实例
   */
  unregisterRenderInstance(id: string): void {
    this.renderInstances.delete(id)

    // 如果没有实例了，停止动画循环
    if (this.renderInstances.size === 0) {
      this.stopAnimation()
    }
  }

  /**
   * 统一动画循环
   */
  private animate = (currentTime: number): void => {
    if (!this.isAnimating) return

    this.animationId = requestAnimationFrame(this.animate)

    // 限制帧率
    const deltaTime = currentTime - this.lastFrameTime
    if (deltaTime < this.FRAME_INTERVAL) return

    this.lastFrameTime = currentTime - (deltaTime % this.FRAME_INTERVAL)

    // 渲染所有活动的实例
    this.renderInstances.forEach(instance => {
      // 检查可见性
      const isVisible = instance.checkVisibility()

      if (isVisible && instance.isActive) {
        instance.render()
      }
    })
  }

  /**
   * 启动动画循环
   */
  private startAnimation(): void {
    if (this.isAnimating) return

    this.isAnimating = true
    this.lastFrameTime = performance.now()
    this.animate(this.lastFrameTime)
  }

  /**
   * 停止动画循环
   */
  private stopAnimation(): void {
    this.isAnimating = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * 启动缓存清理定时器
   */
  private startCacheCleanup(): void {
    this.cacheCleanupTimer = window.setInterval(() => {
      this.cleanupCache()
    }, this.CACHE_CLEANUP_INTERVAL)
  }

  /**
   * 清理未使用的缓存
   */
  private cleanupCache(): void {
    const now = Date.now()

    this.geometryCache.forEach((cached, key) => {
      // 如果超过最大存活时间且没有引用，则清理
      if (now - cached.lastUsed > this.CACHE_MAX_AGE && cached.refCount === 0) {
        cached.geometry.dispose()
        this.geometryCache.delete(key)
      }
    })
  }

  /**
   * 完全销毁管理器（用于应用卸载）
   */
  destroy(): void {
    // 停止动画
    this.stopAnimation()

    // 停止缓存清理
    if (this.cacheCleanupTimer !== null) {
      clearInterval(this.cacheCleanupTimer)
      this.cacheCleanupTimer = null
    }

    // 清空渲染实例
    this.renderInstances.clear()

    // 清理缓存
    this.geometryCache.forEach(cached => {
      cached.geometry.dispose()
    })
    this.geometryCache.clear()

    // 释放共享资源
    if (this.sharedMaterial) {
      this.sharedMaterial.dispose()
      this.sharedMaterial = null
    }

    if (this.envMap) {
      this.envMap.dispose()
      this.envMap = null
    }

    if (this.tempRenderer) {
      this.tempRenderer.dispose()
      this.tempRenderer = null
    }

    // 重置单例
    Model3DCache.instance = null
  }

  /**
   * 获取性能统计信息
   */
  getStats(): {
    renderInstances: number
    cachedGeometries: number
    activeInstances: number
    fps: number
  } {
    const activeInstances = Array.from(this.renderInstances.values()).filter(
      i => i.isActive && i.checkVisibility()
    ).length

    return {
      renderInstances: this.renderInstances.size,
      cachedGeometries: this.geometryCache.size,
      activeInstances,
      fps: this.MAX_FPS
    }
  }
}

export default Model3DCache
