import { reactive } from 'vue'
import axios, { AxiosInstance } from 'axios'
import { API_CONFIG } from '../config/api'
import { HubConnectionBuilder, HttpTransportType, HubConnection } from '@microsoft/signalr'

interface Device {
  code: string
  name?: string
  palletCode?: string
  workStatus?: number
  operationMode?: string
  currentLocation?: {
    code: string
    row: number
    col: number
    layer: number
  }
  childrenDevice?: Device[]
}

interface Container {
  code: string
  location: string
  deviceName: string
}

interface Goods {
  goodsNo: string
  goodsName: string
  goodsSpec?: string
  quantity: number
  unit: string
  pickQuantity?: number  // 拣货数量
}

interface WMSState {
  localStationNo: string
  stationName: string
  devices: Record<string, Device>
  containers: Container[]
  currentContainer: string
  localGoods: Goods[]
  pickTaskMap: Record<string, number>  // goodsNo -> pickQuantity
  isLoading: boolean
  errorMessage: string
  wmsConnectionStatus: string
  wcsConnectionStatus: string
  operationMode: string
  deviceTrayMap: Map<string, any>
}

// 🎯 新架构：每个站台的独立状态
interface StationState {
  stationNo: string
  stationName: string
  currentContainer: string
  localGoods: Goods[]
  pickTaskMap: Record<string, number>
  isLoading: boolean
  errorMessage: string
}

// ❌ 已删除：SingleStationData 和 DualStationState 接口（旧双站台架构，已废弃）
// 新架构使用 StationState 和 Map<string, StationState> 替代

class WMSStore {
  private state: WMSState
  private wmsAPI!: AxiosInstance
  private wcsAPI!: AxiosInstance
  private watchDeviceCodes = ['Crn2002', 'TranLine3000']
  // ❌ 已删除：dualStationState, coordinateDevices, watchStationNos（旧架构残留）

  // 🎯 新架构：站台容器映射表（4个站台的实时容器状态）
  private stationContainerMap: Map<string, string> = new Map([
    ['Tran3001', ''],
    ['Tran3002', ''],
    ['Tran3003', ''],
    ['Tran3004', '']
  ])

  // 🎯 新架构：每个站台独立的定时刷新器
  private stationRefreshTimers: Map<string, ReturnType<typeof setInterval>> = new Map()

  // 🎯 新架构：监控的站台列表（单站台模式1个，双站台模式2个）
  private monitoredStations: Set<string> = new Set()

  // 🎯 新架构：全局唯一的 SignalR 连接
  private signalRConnection: HubConnection | null = null
  private isSignalRInitialized: boolean = false

  // 🎯 新架构：每个站台的独立状态（响应式）
  private stationStates: Map<string, StationState> = reactive(new Map([
    ['Tran3001', { stationNo: 'Tran3001', stationName: 'Tran3001', currentContainer: '', localGoods: [], pickTaskMap: {}, isLoading: false, errorMessage: '' }],
    ['Tran3002', { stationNo: 'Tran3002', stationName: 'Tran3002', currentContainer: '', localGoods: [], pickTaskMap: {}, isLoading: false, errorMessage: '' }],
    ['Tran3003', { stationNo: 'Tran3003', stationName: 'Tran3003', currentContainer: '', localGoods: [], pickTaskMap: {}, isLoading: false, errorMessage: '' }],
    ['Tran3004', { stationNo: 'Tran3004', stationName: 'Tran3004', currentContainer: '', localGoods: [], pickTaskMap: {}, isLoading: false, errorMessage: '' }]
  ]))

  constructor() {
    this.state = reactive({
      localStationNo: 'Tran3001',
      stationName: '未知站台',
      devices: {},
      containers: [],
      currentContainer: '',
      localGoods: [],
      pickTaskMap: {},
      isLoading: false,
      errorMessage: '',
      wmsConnectionStatus: 'connecting',
      wcsConnectionStatus: 'connecting',
      operationMode: 'InOut',
      deviceTrayMap: new Map()
    })

    // ❌ 已删除：dualStationState 初始化（旧架构，已废弃）
    // 新架构使用 stationStates Map 来管理所有站台状态

    this.initializeAPI()
  }

  private initializeAPI(): void {
    this.wmsAPI = axios.create({
      baseURL: API_CONFIG.WMS_BASE_URL,
      timeout: 10000,
      headers: { 'Cache-Control': 'no-cache' }
    })

    this.wcsAPI = axios.create({
      baseURL: API_CONFIG.WCS_BASE_URL,
      timeout: 10000,
      headers: { 'Cache-Control': 'no-cache' }
    })

    // 请求拦截器
    this.wmsAPI.interceptors.request.use(
      (config) => {
        this.state.isLoading = true
        return config
      },
      (error) => {
        this.state.isLoading = false
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.wmsAPI.interceptors.response.use(
      (response) => {
        this.state.isLoading = false
        this.state.errorMessage = ''
        this.state.wmsConnectionStatus = 'connected'
        return response
      },
      (error) => {
        this.state.isLoading = false
        this.state.errorMessage = `WMS API错误: ${(error as Error).message}`
        this.state.wmsConnectionStatus = 'error'
        return Promise.reject(error)
      }
    )

    this.wcsAPI.interceptors.response.use(
      (response) => {
        this.state.isLoading = false
        this.state.errorMessage = ''
        this.state.wcsConnectionStatus = 'connected'
        return response
      },
      (error) => {
        this.state.isLoading = false
        this.state.errorMessage = `WCS API错误: ${(error as Error).message}`
        this.state.wcsConnectionStatus = 'error'
        return Promise.reject(error)
      }
    )
  }

  // ✅ 删除重复方法，统一使用 registerMonitoredStation 和 unregisterMonitoredStation

  setWcsConnectionStatus(status: string): void {
    this.state.wcsConnectionStatus = status
  }

  /**
   * 🎯 新架构：初始化全局 SignalR 连接（只调用一次）
   */
  async initializeSignalR(): Promise<void> {
    if (this.isSignalRInitialized) {
      console.log('⚠️ SignalR 已初始化，跳过重复初始化')
      // ✅ 修复：即使跳过初始化，也要根据实际连接状态更新 state
      if (this.signalRConnection) {
        const currentState = this.signalRConnection.state
        console.log(`📊 当前 SignalR 实际状态: ${currentState}`)

        // 根据 SignalR 的实际连接状态更新 store 状态
        switch (currentState) {
          case 'Connected':
            this.state.wcsConnectionStatus = 'connected'
            break
          case 'Connecting':
            this.state.wcsConnectionStatus = 'connecting'
            break
          case 'Reconnecting':
            this.state.wcsConnectionStatus = 'reconnecting'
            break
          case 'Disconnected':
            this.state.wcsConnectionStatus = 'disconnected'
            break
          default:
            this.state.wcsConnectionStatus = 'error'
        }
      }
      return
    }

    try {
      console.log('🔌 初始化全局 SignalR 连接...')
      this.state.wcsConnectionStatus = 'connecting'  // ✅ 设置初始状态
      const url = API_CONFIG.WS_URL

      this.signalRConnection = new HubConnectionBuilder()
        .withUrl(url, {
          transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .build()

      // 设备数据更新事件
      this.signalRConnection.on("DeviceDataUpdate", (deviceNo: string, newInfo: any) => {
        this.updateDevice(deviceNo, newInfo)
      })

      // 连接状态事件
      this.signalRConnection.onreconnecting(() => {
        console.log('🔄 SignalR 重连中...')
        this.state.wcsConnectionStatus = 'reconnecting'
      })

      this.signalRConnection.onreconnected(() => {
        console.log('✅ SignalR 重连成功')
        this.state.wcsConnectionStatus = 'connected'
      })

      this.signalRConnection.onclose(() => {
        console.log('❌ SignalR 连接已关闭')
        this.state.wcsConnectionStatus = 'disconnected'
      })

      await this.signalRConnection.start()
      console.log('✅ SignalR 全局连接已建立')
      this.state.wcsConnectionStatus = 'connected'
      this.isSignalRInitialized = true
    } catch (error) {
      console.error('❌ SignalR 连接失败:', error)
      this.state.wcsConnectionStatus = 'error'
      throw error
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.initGetDeviceInfo()
      this.state.wmsConnectionStatus = 'connected'

      // 🎯 新架构：初始化全局 SignalR 连接（只初始化一次）
      await this.initializeSignalR()
    } catch (error) {
      console.error('初始化连接失败:', error)
      this.state.wmsConnectionStatus = 'error'
      this.state.wcsConnectionStatus = 'error'
      this.state.errorMessage = `连接失败: ${(error as Error).message}`

      // 重试
      setTimeout(() => {
        this.initGetDeviceInfo().catch(console.error)
      }, 3000)
    }
  }

  private async getContainerGoods(containerCode: string): Promise<any> {
    try {
      const response = await this.wmsAPI.get(`/Inventory/container/${containerCode}`)
      return response.data
    } catch (error) {
      console.error('获取容器货物信息失败:', error)
      throw error
    }
  }

  private async getPickTasks(containerCode: string): Promise<Record<string, number>> {
    if (!containerCode || containerCode === '0') {
      return {}
    }

    try {
      const response = await axios.get(
        `https://aio.wxnanxing.com/api/wms/StockOutOrder/PickTask?containerCode=${encodeURIComponent(containerCode)}`
      )

      if (response.data && response.data.errCode === 0) {
        const taskList = response.data.data as any[]
        if (taskList && taskList.length > 0) {
          const result: Record<string, number> = {}

          for (const task of taskList) {
            const goodsNo = task.goodsNo?.toString()
            const pickQuantity = this.parseToInt(task.pickQuantity)

            // 只记录有效的拣货任务（数量 > 0）
            if (goodsNo && pickQuantity && pickQuantity > 0) {
              // 如果同一个货物有多个拣货任务，累加数量
              result[goodsNo] = (result[goodsNo] || 0) + pickQuantity
            }
          }

          return result
        }
      }

      return {}
    } catch (error) {
      console.error('获取拣货任务失败:', error)
      return {}
    }
  }

  private parseToInt(value: any): number | null {
    if (value == null) return null
    if (typeof value === 'number') return Math.floor(value)
    if (typeof value === 'string') return parseInt(value, 10) || null
    return null
  }

  private async getDeviceStatus(deviceNo: string): Promise<any> {
    try {
      const response = await this.wcsAPI.get(`/getDevice/${deviceNo}`)
      return response.data
    } catch (error) {
      console.error('获取设备状态失败:', error)
      throw error
    }
  }

  private async initGetDeviceInfo(): Promise<void> {
    // ✅ 只设置 WMS 连接状态，不要修改 WCS (SignalR) 连接状态
    this.state.wmsConnectionStatus = 'connecting'
    // ❌ 删除：this.state.wcsConnectionStatus = 'connecting'  // SignalR 由 initializeSignalR() 管理

    // 确保 coordinateDevices 存在
    if (!this.coordinateDevices) {
      this.coordinateDevices = ['Crn2001', 'Crn2002', 'RGV01']
    }

    const allDeviceCodes = [...this.watchDeviceCodes, ...this.coordinateDevices]
    const uniqueDeviceCodes = [...new Set(allDeviceCodes)]

    for (const deviceCode of uniqueDeviceCodes) {
      try {
        const deviceInfo = await this.getDeviceStatus(deviceCode)
        // 设备信息获取成功

        if (deviceInfo.childrenDevice && deviceInfo.childrenDevice.length > 0) {
          deviceInfo.childrenDevice.forEach((item: any) => {
            this.watchStationNos.push(item.code)
            this.state.devices[item.code] = item

            // 检查是否是当前站台
            if (item.code === this.state.localStationNo) {
              this.state.stationName = item.name || item.code
            }
          })
        } else {
          this.watchStationNos.push(deviceInfo.code)
          this.state.devices[deviceInfo.code] = deviceInfo

          if (deviceInfo.code === this.state.localStationNo) {
            this.state.stationName = deviceInfo.name || deviceInfo.code
          }
        }
      } catch (error) {
        console.error(`设备 ${deviceCode} 初始化失败:`, error)
      }
    }

    await this.handleInfo()
  }

  private updateDeviceTrayMap(): { deviceTrayMap: Map<string, any>; operationMode: string } {
    const deviceTrayMap = new Map<string, any>()
    let operationMode = this.state.operationMode
    let timestampCounter = Date.now()


    for (const [deviceCode, device] of Object.entries(this.state.devices)) {
      if (!device) continue

      if (device.operationMode) {
        operationMode = device.operationMode
      }

      if (device.childrenDevice && device.childrenDevice.length > 0) {
        const hasChildrenInMonitoring = device.childrenDevice.some((child: any) =>
          this.watchStationNos.includes(child.code)
        )

        if (!hasChildrenInMonitoring) {
          // 子设备不在独立监控中，处理父设备的子设备数据
          device.childrenDevice.forEach((child, index) => {
            const childDeviceCode = child.code || `${deviceCode}_child_${index}`
            // 子设备只检查托盘号有效性，不检查工作状态
            if (child.palletCode && child.palletCode != '0' && child.palletCode.toString().trim() !== '') {
              deviceTrayMap.set(childDeviceCode, {
                trayCode: child.palletCode.toString(),
                deviceName: child.name || device.name || deviceCode,
                location: `${device.name || deviceCode}-位置${index + 1}`,
                timestamp: ++timestampCounter
              })
            }
          })
        }
      } else {
        const isChildDevice = deviceCode.startsWith('Tran')

        if (device.palletCode && device.palletCode != '0' && device.palletCode.toString().trim() !== '') {
          const shouldInclude = isChildDevice || (device.workStatus != null && device.workStatus !== 0)

          if (shouldInclude) {
            deviceTrayMap.set(deviceCode, {
              trayCode: device.palletCode.toString(),
              deviceName: device.name || deviceCode,
              location: device.name || deviceCode,
              timestamp: ++timestampCounter
            })
          }
        }
      }
    }

    return { deviceTrayMap, operationMode }
  }

  private async handleInfo(): Promise<void> {
    if (Object.keys(this.state.devices).length === 0) {
      this.state.containers = []
      this.state.deviceTrayMap = new Map()
      return
    }

    const { deviceTrayMap, operationMode } = this.updateDeviceTrayMap()

    const trayCodeMap = new Map()
    deviceTrayMap.forEach((item: any, deviceCode: string) => {
      const trayCode = item.trayCode
      if (!trayCodeMap.has(trayCode)) {
        trayCodeMap.set(trayCode, {
          code: trayCode,
          location: item.location,
          deviceName: item.deviceName,
          deviceCode: deviceCode,
          timestamp: item.timestamp
        })
      } else {
        const existing = trayCodeMap.get(trayCode)
        let shouldReplace = false
        if (deviceCode === this.state.localStationNo && existing.deviceCode !== this.state.localStationNo) {
          shouldReplace = true
        } else if (existing.deviceCode !== this.state.localStationNo && deviceCode !== this.state.localStationNo) {
          shouldReplace = deviceCode > existing.deviceCode
        }
        if (shouldReplace) {
          trayCodeMap.set(trayCode, {
            code: trayCode,
            location: item.location,
            deviceName: item.deviceName,
            deviceCode: deviceCode,
            timestamp: item.timestamp
          })
        }
      }
    })

    const containers = Array.from(trayCodeMap.values()).map((item: any) => ({
      code: item.code,
      location: item.location,
      deviceName: item.deviceName
    }))

    this.state.containers = containers
    this.state.operationMode = operationMode
    this.state.deviceTrayMap = deviceTrayMap

    // 🎯 新架构：更新站台容器映射表
    this.updateStationContainerMap()
  }

  /**
   * 获取站台容器映射表（用于调试）
   */
  getStationContainerMap(): Map<string, string> {
    return new Map(this.stationContainerMap)
  }

  /**
   * 🎯 新架构：获取站台独立状态（供组件读取）
   */
  getStationState(stationNo: string): StationState | undefined {
    return this.stationStates.get(stationNo)
  }

  /**
   * 🎯 新架构：WebSocket消息处理 - 只负责更新站台容器映射表
   * 这个方法由SignalR的DeviceDataUpdate事件调用
   */
  async updateDevice(deviceNo: string, newInfo: Device): Promise<void> {
    // 确保 coordinateDevices 存在
    if (!this.coordinateDevices) {
      this.coordinateDevices = ['Crn2001', 'Crn2002', 'RGV01']
    }

    // 更新设备信息到内存
    if (this.watchStationNos.includes(deviceNo) || this.coordinateDevices.includes(deviceNo)) {
      this.state.devices[deviceNo] = newInfo

      if (deviceNo === this.state.localStationNo) {
        this.state.stationName = newInfo.name || newInfo.code || deviceNo
      }
    }

    if (newInfo.childrenDevice && newInfo.childrenDevice.length > 0) {
      newInfo.childrenDevice.forEach((child) => {
        if (this.watchStationNos.includes(child.code)) {
          this.state.devices[child.code] = child

          if (child.code === this.state.localStationNo) {
            this.state.stationName = child.name || child.code
          }
        }
      })
    }

    if (!this.watchStationNos.includes(deviceNo) && this.coordinateDevices.includes(deviceNo)) {
      this.watchStationNos.push(deviceNo)
    }

    // 🎯 核心：更新站台容器映射表（4个站台）
    this.updateStationContainerMap()
  }

  /**
   * 🎯 新架构：更新站台容器映射表
   * 从所有设备信息中提取4个站台的容器编码
   */
  private updateStationContainerMap(): void {
    const stations = ['Tran3001', 'Tran3002', 'Tran3003', 'Tran3004']

    stations.forEach(stationNo => {
      const device = this.state.devices[stationNo]
      let newContainerCode = ''

      if (device && device.palletCode && device.palletCode !== '0' && device.palletCode.toString().trim() !== '') {
        newContainerCode = device.palletCode.toString()
      }

      const oldContainerCode = this.stationContainerMap.get(stationNo) || ''

      // 🎯 关键：只有容器编码真正变化时才触发状态更新
      if (newContainerCode !== oldContainerCode) {
        console.log(`🔄 [${stationNo}] 容器变化: ${oldContainerCode} → ${newContainerCode}`)
        this.stationContainerMap.set(stationNo, newContainerCode)

        // ✅ 关键判断：只有当前监控的站台才触发刷新
        if (this.monitoredStations.has(stationNo)) {
          console.log(`✅ [${stationNo}] 该站台正在被监控，触发数据刷新`)
          this.handleStationContainerChange(stationNo, oldContainerCode, newContainerCode)
        } else {
          console.log(`⏭️ [${stationNo}] 该站台未被监控，忽略容器变化`)
        }
      }
    })
  }

  /**
   * 🎯 新架构：处理站台容器变化
   * @param stationNo 站台编号
   * @param oldContainer 旧容器编码
   * @param newContainer 新容器编码
   */
  private handleStationContainerChange(stationNo: string, oldContainer: string, newContainer: string): void {
    if (!oldContainer && newContainer) {
      // 场景1：容器入站
      console.log(`🚛 [${stationNo}] 容器入站: ${newContainer}`)
      this.onContainerArrival(stationNo, newContainer)
    } else if (oldContainer && !newContainer) {
      // 场景2：容器出站
      console.log(`🚚 [${stationNo}] 容器出站: ${oldContainer}`)
      this.onContainerDeparture(stationNo)
    } else if (oldContainer && newContainer && oldContainer !== newContainer) {
      // 场景3：容器更换（先出后入）
      console.log(`🔄 [${stationNo}] 容器更换: ${oldContainer} → ${newContainer}`)
      this.onContainerDeparture(stationNo)
      this.onContainerArrival(stationNo, newContainer)
    }
  }

  async refreshData(): Promise<void> {
    try {
      this.state.errorMessage = ''
      await this.handleInfo()
    } catch (error) {
      console.error('数据刷新失败:', error)
      this.state.errorMessage = `刷新失败: ${(error as Error).message}`
    }
  }

  /**
   * 🎯 新架构：容器入站处理
   * 立即加载数据 + 启动10秒定时刷新
   */
  private async onContainerArrival(stationNo: string, containerCode: string): Promise<void> {
    console.log(`📥 [${stationNo}] 处理容器入站: ${containerCode}`)

    // 🎯 关键：更新该站台的独立状态
    const stationState = this.stationStates.get(stationNo)
    if (stationState) {
      stationState.currentContainer = containerCode
      await this.loadStationGoods(stationNo, containerCode)
    }

    // 启动该站台的10秒定时刷新
    this.startStationRefreshTimer(stationNo, containerCode)
  }

  /**
   * 🎯 新架构：容器出站处理
   * 清空数据 + 停止定时刷新
   */
  private onContainerDeparture(stationNo: string): void {
    console.log(`📤 [${stationNo}] 处理容器出站`)

    // 🎯 关键：清空该站台的独立状态
    const stationState = this.stationStates.get(stationNo)
    if (stationState) {
      stationState.currentContainer = ''
      stationState.localGoods = []
      stationState.pickTaskMap = {}
    }

    // 停止该站台的定时刷新
    this.stopStationRefreshTimer(stationNo)
  }

  /**
   * 🎯 新架构：加载站台货物数据
   */
  private async loadStationGoods(stationNo: string, containerCode: string): Promise<void> {
    if (!containerCode || containerCode === '0') {
      return
    }

    const stationState = this.stationStates.get(stationNo)
    if (!stationState) return

    try {
      console.log(`📦 [${stationNo}] 加载货物数据: ${containerCode}`)
      stationState.isLoading = true

      // 并行获取货物信息和拣货任务
      const [res, pickTaskMap] = await Promise.all([
        this.getContainerGoods(containerCode),
        this.getPickTasks(containerCode)
      ])

      if (res.errCode === 0) {
        const goods = (res.data || []) as Goods[]

        // 🎯 关键：更新该站台的独立状态
        stationState.localGoods = goods.map(item => ({
          ...item,
          pickQuantity: pickTaskMap[item.goodsNo] || 0
        }))
        stationState.pickTaskMap = pickTaskMap
        stationState.errorMessage = ''
      } else {
        stationState.errorMessage = res.errMsg || '未知错误'
        stationState.localGoods = []
        stationState.pickTaskMap = {}
      }

      stationState.isLoading = false
    } catch (error) {
      console.error(`[${stationNo}] 加载货物失败:`, error)
      stationState.errorMessage = (error as Error).message || '请求失败'
      stationState.localGoods = []
      stationState.pickTaskMap = {}
      stationState.isLoading = false
    }
  }

  /**
   * 🎯 新架构：启动站台定时刷新器（10秒间隔）
   * 只有被监控的站台容器入站时才会调用此方法
   */
  private startStationRefreshTimer(stationNo: string, containerCode: string): void {
    // 先停止该站台已存在的定时器
    this.stopStationRefreshTimer(stationNo)

    console.log(`⏰ [${stationNo}] 启动10秒定时刷新器: ${containerCode}`)

    const timer = setInterval(async () => {
      // ✅ 验证容器是否还在该站台 + 站台是否还在监控中
      const currentContainer = this.stationContainerMap.get(stationNo)
      const isMonitored = this.monitoredStations.has(stationNo)

      if (currentContainer === containerCode && isMonitored) {
        console.log(`🔄 [${stationNo}] 定时刷新数据: ${containerCode}`)

        const stationState = this.stationStates.get(stationNo)
        if (!stationState) return

        try {
          // 静默刷新，不改变loading状态
          const [res, pickTaskMap] = await Promise.all([
            this.getContainerGoods(containerCode),
            this.getPickTasks(containerCode)
          ])

          if (res.errCode === 0) {
            const goods = (res.data || []) as Goods[]
            // 🎯 关键：更新该站台的独立状态
            stationState.localGoods = goods.map(item => ({
              ...item,
              pickQuantity: pickTaskMap[item.goodsNo] || 0
            }))
            stationState.pickTaskMap = pickTaskMap
          }
        } catch (error) {
          console.error(`[${stationNo}] 定时刷新失败:`, error)
        }
      } else {
        // 容器已变化或站台取消监控，停止定时器
        if (currentContainer !== containerCode) {
          console.log(`⏹️ [${stationNo}] 容器已变化 (${containerCode} → ${currentContainer})，停止刷新`)
        }
        if (!isMonitored) {
          console.log(`⏹️ [${stationNo}] 站台已取消监控，停止刷新`)
        }
        this.stopStationRefreshTimer(stationNo)
      }
    }, 10000) // 10秒间隔

    this.stationRefreshTimers.set(stationNo, timer)
  }

  /**
   * 🎯 新架构：停止站台定时刷新器
   */
  private stopStationRefreshTimer(stationNo: string): void {
    const timer = this.stationRefreshTimers.get(stationNo)
    if (timer) {
      clearInterval(timer)
      this.stationRefreshTimers.delete(stationNo)
      console.log(`⏹️ [${stationNo}] 停止定时刷新`)
    }
  }

  /**
   * 🎯 新架构：注册监控站台
   * 单站台模式注册1个，双站台模式注册2个
   */
  registerMonitoredStation(stationNo: string): void {
    if (this.monitoredStations.has(stationNo)) {
      console.log(`⚠️ [${stationNo}] 已在监控中，跳过重复注册`)
      return
    }

    console.log(`📍 [${stationNo}] 注册监控站台`)
    this.monitoredStations.add(stationNo)

    // 更新站台名称
    const stationState = this.stationStates.get(stationNo)
    const device = this.state.devices[stationNo]
    if (stationState && device && device.name) {
      stationState.stationName = device.name
    }

    // 检查该站台是否已有容器，如果有则立即加载
    const containerCode = this.stationContainerMap.get(stationNo) || ''
    if (containerCode) {
      console.log(`🚛 [${stationNo}] 已有容器: ${containerCode}，立即加载`)
      this.onContainerArrival(stationNo, containerCode)
    }
  }

  /**
   * 🎯 新架构：取消监控站台
   */
  unregisterMonitoredStation(stationNo: string): void {
    if (!this.monitoredStations.has(stationNo)) {
      return
    }

    console.log(`📍 [${stationNo}] 取消监控站台`)
    this.monitoredStations.delete(stationNo)
    this.stopStationRefreshTimer(stationNo)
  }

  /**
   * 🎯 新架构：清理资源
   */
  cleanup(): void {
    console.log('🧹 清理所有站台定时器')
    this.stationRefreshTimers.forEach((timer, stationNo) => {
      clearInterval(timer)
      console.log(`⏹️ [${stationNo}] 已清理`)
    })
    this.stationRefreshTimers.clear()
    this.monitoredStations.clear()
  }

  /**
   * 🎯 新架构：关闭全局 SignalR 连接
   */
  async closeSignalR(): Promise<void> {
    if (this.signalRConnection) {
      console.log('🔌 关闭全局 SignalR 连接')
      await this.signalRConnection.stop()
      this.signalRConnection = null
      this.isSignalRInitialized = false
    }
  }

  // ✅ 导出整个响应式状态对象，让 Vue 组件可以正确追踪变化
  getState(): WMSState {
    return this.state
  }

  // ❌ 已删除所有旧双站台方法（约150行代码）：
  // - initializeDualStation()
  // - initDualStationDeviceInfo()
  // - fetchStationData()
  // - updateStationDevice()
  // - getDualStationState()
  // - refreshDualStationData()
  // - 所有废弃的 getter 方法（stationName, devices, containers, currentContainer, localGoods, isLoading, errorMessage, wmsConnectionStatus, wcsConnectionStatus）
  //
  // 新架构使用：
  // - getStationState(stationNo) 获取单个站台状态
  // - registerMonitoredStation(stationNo) 注册监控
  // - unregisterMonitoredStation(stationNo) 取消监控
}

// 创建单例
let wmsStore: WMSStore

export function useWMSStore(): WMSStore {
  if (!wmsStore) {
    wmsStore = new WMSStore()
  }
  return wmsStore
}

// 导出类型定义供组件使用
export type { Device, Container, Goods, WMSState, SingleStationData, DualStationState, StationState }
