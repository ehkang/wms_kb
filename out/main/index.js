"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const icon = path.join(__dirname, "../../resources/icon.png");
const getUserDataPath = () => electron.app.getPath("userData");
const getConfigPath = () => path.join(getUserDataPath(), "user-preferences.json");
class PersistentStore {
  data = {};
  defaults = {
    station: "Tran3001"
  };
  constructor() {
    this.ensureUserDataDir();
    this.load();
  }
  // 确保用户数据目录存在
  ensureUserDataDir() {
    const userDataDir = getUserDataPath();
    if (!fs__namespace.existsSync(userDataDir)) {
      fs__namespace.mkdirSync(userDataDir, { recursive: true });
    }
  }
  // 同步加载配置
  load() {
    try {
      const configPath = getConfigPath();
      if (fs__namespace.existsSync(configPath)) {
        const content = fs__namespace.readFileSync(configPath, "utf-8");
        const loadedData = JSON.parse(content);
        this.data = { ...this.defaults, ...loadedData };
      } else {
        this.data = { ...this.defaults };
        this.save();
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
      this.data = { ...this.defaults };
      this.backupCorruptedConfig();
    }
  }
  // 同步保存配置
  save() {
    try {
      const configPath = getConfigPath();
      const tempPath = configPath + ".tmp";
      fs__namespace.writeFileSync(tempPath, JSON.stringify(this.data, null, 2));
      fs__namespace.renameSync(tempPath, configPath);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  }
  // 异步保存配置
  async saveAsync() {
    return new Promise((resolve, reject) => {
      try {
        const configPath = getConfigPath();
        const tempPath = configPath + ".tmp";
        fs__namespace.writeFile(tempPath, JSON.stringify(this.data, null, 2), (err) => {
          if (err) {
            reject(err);
            return;
          }
          fs__namespace.rename(tempPath, configPath, (err2) => {
            if (err2) {
              reject(err2);
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  // 备份损坏的配置文件
  backupCorruptedConfig() {
    try {
      const configPath = getConfigPath();
      if (fs__namespace.existsSync(configPath)) {
        const backupPath = configPath + ".backup." + Date.now();
        fs__namespace.copyFileSync(configPath, backupPath);
        console.log(`Backed up corrupted config to: ${backupPath}`);
      }
    } catch (error) {
      console.error("Failed to backup corrupted config:", error);
    }
  }
  // 获取配置值
  get(key) {
    return this.data[key] ?? this.defaults[key];
  }
  // 设置配置值
  set(key, value) {
    this.data[key] = value;
    this.save();
  }
  // 异步设置配置值
  async setAsync(key, value) {
    this.data[key] = value;
    await this.saveAsync();
  }
  // 删除配置值
  delete(key) {
    delete this.data[key];
    this.save();
  }
  // 检查是否存在某个键
  has(key) {
    return key in this.data;
  }
  // 清空所有配置（保留默认值）
  clear() {
    this.data = { ...this.defaults };
    this.save();
  }
  // 获取所有配置
  get store() {
    return { ...this.data };
  }
  // 获取配置文件路径（用于调试）
  getConfigPath() {
    return getConfigPath();
  }
}
const store = new PersistentStore();
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      webSecurity: false,
      contextIsolation: true
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => console.log("pong"));
  electron.ipcMain.handle("config:get", async (_, key) => {
    return store.get(key);
  });
  electron.ipcMain.handle("config:set", async (_, key, value) => {
    await store.setAsync(key, value);
  });
  electron.ipcMain.handle("config:getAll", async () => {
    return store.store;
  });
  electron.ipcMain.handle("config:has", async (_, key) => {
    return store.has(key);
  });
  electron.ipcMain.handle("config:delete", async (_, key) => {
    store.delete(key);
  });
  electron.ipcMain.handle("config:clear", async () => {
    store.clear();
  });
  electron.ipcMain.handle("config:getPath", async () => {
    return store.getConfigPath();
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
