import { reactive } from 'vue'
import axios, { AxiosInstance } from 'axios'
import { API_CONFIG } from '../config/api'

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
}

interface WMSState {
  localStationNo: string
  stationName: string
  devices: Record<string, Device>
  containers: Container[]
  currentContainer: string
  localGoods: Goods[]
  isLoading: boolean
  errorMessage: string
  wmsConnectionStatus: string
  wcsConnectionStatus: string
  operationMode: string
  deviceTrayMap: Map<string, any>
}

interface SingleStationData {
  localStationNo: string
  stationName: string
  currentContainer: string
  localGoods: Goods[]
  isLoading: boolean
  errorMessage: string
}

interface DualStationState {
  station3002: SingleStationData
  station3003: SingleStationData
  globalConnectionStatus: {
    wmsConnectionStatus: string
    wcsConnectionStatus: string
  }
  devices: Record<string, Device>
}

class WMSStore {
  private state: WMSState
  private dualStationState: DualStationState
  private wmsAPI!: AxiosInstance
  private wcsAPI!: AxiosInstance
  private watchDeviceCodes = ['Crn2002', 'TranLine3000']
  private coordinateDevices = ['Crn2001', 'Crn2002', 'RGV01']
  private watchStationNos: string[] = []

  constructor() {
    this.state = reactive({
      localStationNo: 'Tran3001',
      stationName: '未知站台',
      devices: {},
      containers: [],
      currentContainer: '',
      localGoods: [],
      isLoading: false,
      errorMessage: '',
      wmsConnectionStatus: 'connecting',
      wcsConnectionStatus: 'connecting',
      operationMode: 'InOut',
      deviceTrayMap: new Map()
    })

    this.dualStationState = reactive({
      station3002: {
        localStationNo: 'Tran3002',
        stationName: 'Tran3002',
        currentContainer: '',
        localGoods: [],
        isLoading: false,
        errorMessage: ''
      },
      station3003: {
        localStationNo: 'Tran3003',
        stationName: 'Tran3003',
        currentContainer: '',
        localGoods: [],
        isLoading: false,
        errorMessage: ''
      },
      globalConnectionStatus: {
        wmsConnectionStatus: 'connecting',
        wcsConnectionStatus: 'connecting'
      },
      devices: {}
    })

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

  setLocalStationNo(stationNo: string): void {
    this.state.localStationNo = stationNo

    // 如果已经有设备信息，立即更新站台名称
    const device = this.state.devices[stationNo]
    if (device) {
      this.state.stationName = device.name || device.code || stationNo
    } else {
      // 先设置一个临时名称，等待设备信息加载后更新
      this.state.stationName = stationNo
    }
  }

  setWcsConnectionStatus(status: string): void {
    this.state.wcsConnectionStatus = status
  }

  async initialize(): Promise<void> {
    try {
      await this.initGetDeviceInfo()
      this.state.wmsConnectionStatus = 'connected'
      this.state.wcsConnectionStatus = 'connected'
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
    this.state.wmsConnectionStatus = 'connecting'
    this.state.wcsConnectionStatus = 'connecting'

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
      this.state.currentContainer = ''
      this.state.localGoods = []
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

    await this.checkCurrentStationTray()
  }

  private async checkCurrentStationTray(): Promise<void> {
    const currentStationTray = this.state.deviceTrayMap.get(this.state.localStationNo)

    if (currentStationTray) {
      if (currentStationTray.trayCode !== this.state.currentContainer) {
        await this.getGoods(currentStationTray.trayCode)
      }
    } else {
      if (this.state.currentContainer) {
        this.state.currentContainer = ''
        this.state.localGoods = []
      }
    }
  }

  private async getGoods(containerNo: string): Promise<void> {
    if (!containerNo || containerNo === '0' || containerNo.length === 0) {
      this.state.localGoods = []
      this.state.currentContainer = ''
      return
    }

    try {
      this.state.currentContainer = containerNo
      const res = await this.getContainerGoods(containerNo)

      if (res.errCode === 0) {
        this.state.localGoods = res.data || []
        this.state.errorMessage = ''
      } else {
        this.state.errorMessage = res.errMsg || '未知错误'
        this.state.localGoods = []
      }
    } catch (error) {
      this.state.errorMessage = (error as Error).message || '请求失败'
      this.state.localGoods = []
    }
  }

  async updateDevice(deviceNo: string, newInfo: Device): Promise<void> {
    let shouldUpdateCurrentStation = false

    // 确保 coordinateDevices 存在
    if (!this.coordinateDevices) {
      this.coordinateDevices = ['Crn2001', 'Crn2002', 'RGV01']
    }

    if (this.watchStationNos.includes(deviceNo) || this.coordinateDevices.includes(deviceNo)) {
      this.state.devices[deviceNo] = newInfo

      if (deviceNo === this.state.localStationNo) {
        this.state.stationName = newInfo.name || newInfo.code || deviceNo
        shouldUpdateCurrentStation = true
      }
    }

    if (newInfo.childrenDevice && newInfo.childrenDevice.length > 0) {
      newInfo.childrenDevice.forEach((child) => {
        if (this.watchStationNos.includes(child.code)) {
          this.state.devices[child.code] = child

          if (child.code === this.state.localStationNo) {
            this.state.stationName = child.name || child.code
            shouldUpdateCurrentStation = true
          }
        }
      })
    }

    if (!this.watchStationNos.includes(deviceNo) && this.coordinateDevices.includes(deviceNo)) {
      this.watchStationNos.push(deviceNo)
    }

    await this.handleInfo()

    if (shouldUpdateCurrentStation || deviceNo === this.state.localStationNo) {
      await this.checkCurrentStationTray()
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

  // 暴露响应式状态
  get stationName(): string {
    return this.state.stationName
  }
  get devices(): Record<string, Device> {
    return this.state.devices
  }
  get containers(): Container[] {
    return this.state.containers
  }
  get currentContainer(): string {
    return this.state.currentContainer
  }
  get localGoods(): Goods[] {
    return this.state.localGoods
  }
  get isLoading(): boolean {
    return this.state.isLoading
  }
  get errorMessage(): string {
    return this.state.errorMessage
  }
  get wmsConnectionStatus(): string {
    return this.state.wmsConnectionStatus
  }
  get wcsConnectionStatus(): string {
    return this.state.wcsConnectionStatus
  }

  // 导出整个响应式状态对象，让 Vue 组件可以正确追踪变化
  getState(): WMSState {
    return this.state
  }

  // 双站台相关方法
  async initializeDualStation(): Promise<void> {
    try {
      this.dualStationState.globalConnectionStatus.wmsConnectionStatus = 'connecting'
      this.dualStationState.globalConnectionStatus.wcsConnectionStatus = 'connecting'

      // 初始化双站台设备信息
      await this.initDualStationDeviceInfo()
      
      // 并行获取两个站台数据
      await Promise.all([
        this.fetchStationData('Tran3002'),
        this.fetchStationData('Tran3003')
      ])

      this.dualStationState.globalConnectionStatus.wmsConnectionStatus = 'connected'
      this.dualStationState.globalConnectionStatus.wcsConnectionStatus = 'connected'
    } catch (error) {
      console.error('双站台初始化失败:', error)
      this.dualStationState.globalConnectionStatus.wmsConnectionStatus = 'error'
      this.dualStationState.globalConnectionStatus.wcsConnectionStatus = 'error'
    }
  }

  private async initDualStationDeviceInfo(): Promise<void> {
    this.dualStationState.globalConnectionStatus.wmsConnectionStatus = 'connecting'
    this.dualStationState.globalConnectionStatus.wcsConnectionStatus = 'connecting'

    // 确保 coordinateDevices 存在
    if (!this.coordinateDevices) {
      this.coordinateDevices = ['Crn2001', 'Crn2002', 'RGV01']
    }

    // 双站台需要监控的设备：站台设备 + 坐标设备
    const dualStationDevices = ['Tran3002', 'Tran3003', ...this.coordinateDevices, ...this.watchDeviceCodes]
    const uniqueDeviceCodes = [...new Set(dualStationDevices)]

    for (const deviceCode of uniqueDeviceCodes) {
      try {
        const deviceInfo = await this.getDeviceStatus(deviceCode)
        
        if (deviceInfo.childrenDevice && deviceInfo.childrenDevice.length > 0) {
          deviceInfo.childrenDevice.forEach((item: any) => {
            this.dualStationState.devices[item.code] = item
          })
        } else {
          this.dualStationState.devices[deviceInfo.code] = deviceInfo
        }
      } catch (error) {
        console.error(`双站台设备 ${deviceCode} 初始化失败:`, error)
      }
    }
  }

  async fetchStationData(stationNo: string): Promise<void> {
    try {
      const stationKey = stationNo === 'Tran3002' ? 'station3002' : 'station3003'
      this.dualStationState[stationKey].isLoading = true
      this.dualStationState[stationKey].errorMessage = ''

      // 获取设备信息更新站台名称（只有获取到有效名称时才更新）
      const device = this.dualStationState.devices[stationNo]
      if (device && device.name) {
        this.dualStationState[stationKey].stationName = device.name
      }
      // 如果没有获取到设备名称，保持原有的站台编号，不改为"未知站台"

      // 检查当前站台是否有托盘
      const deviceTrayMap = new Map<string, any>()
      for (const [deviceCode, deviceInfo] of Object.entries(this.dualStationState.devices)) {
        if (deviceCode === stationNo && deviceInfo.palletCode && deviceInfo.palletCode !== '0' && deviceInfo.palletCode.toString().trim() !== '') {
          this.dualStationState[stationKey].currentContainer = deviceInfo.palletCode.toString()
          
          // 获取托盘货物信息
          const res = await this.getContainerGoods(deviceInfo.palletCode.toString())
          if (res.errCode === 0) {
            this.dualStationState[stationKey].localGoods = res.data || []
          } else {
            this.dualStationState[stationKey].errorMessage = res.errMsg || '未知错误'
            this.dualStationState[stationKey].localGoods = []
          }
          break
        }
      }

      // 如果没有找到托盘，清空数据
      if (!this.dualStationState[stationKey].currentContainer) {
        this.dualStationState[stationKey].currentContainer = ''
        this.dualStationState[stationKey].localGoods = []
      }

      this.dualStationState[stationKey].isLoading = false
    } catch (error) {
      const stationKey = stationNo === 'Tran3002' ? 'station3002' : 'station3003'
      this.dualStationState[stationKey].isLoading = false
      this.dualStationState[stationKey].errorMessage = (error as Error).message || '请求失败'
      this.dualStationState[stationKey].localGoods = []
    }
  }

  updateStationDevice(deviceNo: string, newInfo: Device): void {
    if (deviceNo === 'Tran3002' || deviceNo === 'Tran3003') {
      this.dualStationState.devices[deviceNo] = newInfo
      
      const stationKey = deviceNo === 'Tran3002' ? 'station3002' : 'station3003'
      // 只有获取到有效设备名称时才更新站台名称
      if (newInfo.name) {
        this.dualStationState[stationKey].stationName = newInfo.name
      }

      // 异步更新站台数据
      this.fetchStationData(deviceNo).catch(console.error)
    }

    // 同时更新坐标设备
    if (this.coordinateDevices.includes(deviceNo)) {
      this.dualStationState.devices[deviceNo] = newInfo
    }
  }

  getDualStationState(): DualStationState {
    return this.dualStationState
  }

  async refreshDualStationData(): Promise<void> {
    try {
      await Promise.all([
        this.fetchStationData('Tran3002'),
        this.fetchStationData('Tran3003')
      ])
    } catch (error) {
      console.error('双站台数据刷新失败:', error)
    }
  }
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
export type { Device, Container, Goods, WMSState, SingleStationData, DualStationState }
