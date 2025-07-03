package main

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

// 嵌入HTML文件
//
//go:embed web/kanban.html
var dashboardHTML []byte

// WMS和WCS服务器配置
const (
	WMS_URL      = "http://10.20.88.14:8008"
	WCS_URL      = "http://10.20.88.14:8009"
	DEFAULT_PORT = "8080"
)

func main() {
	// 设置Gin为发布模式，减少日志输出
	gin.SetMode(gin.ReleaseMode)

	// 创建Gin路由器
	r := gin.New()

	// 添加基本的日志中间件
	r.Use(gin.LoggerWithConfig(gin.LoggerConfig{
		Output: os.Stdout,
		Formatter: func(param gin.LogFormatterParams) string {
			return fmt.Sprintf("[%s] %s %s %d %s\n",
				param.TimeStamp.Format("15:04:05"),
				param.Method,
				param.Path,
				param.StatusCode,
				param.Latency,
			)
		},
	}))
	r.Use(gin.Recovery())

	// 主页面 - 提供嵌入的HTML
	r.GET("/", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", dashboardHTML)
	})

	r.GET("/dashboard", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", dashboardHTML)
	})

	// WMS API代理
	wmsURL, err := url.Parse(WMS_URL)
	if err != nil {
		log.Fatalf("WMS URL解析失败: %v", err)
	}

	r.Any("/api-wms/*proxyPath", func(c *gin.Context) {
		proxyPath := c.Param("proxyPath")
		log.Printf("WMS代理: %s -> %s%s", c.Request.URL.Path, WMS_URL, proxyPath)

		targetURL := *wmsURL
		targetURL.Path = proxyPath
		targetURL.RawQuery = c.Request.URL.RawQuery

		proxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL = &targetURL
				req.Host = targetURL.Host
			},
		}

		proxy.ServeHTTP(c.Writer, c.Request)
	})

	// WCS API代理
	wcsURL, err := url.Parse(WCS_URL)
	if err != nil {
		log.Fatalf("WCS URL解析失败: %v", err)
	}

	r.Any("/api-wcs/*proxyPath", func(c *gin.Context) {
		proxyPath := c.Param("proxyPath")
		log.Printf("WCS代理: %s -> %s%s", c.Request.URL.Path, WCS_URL, proxyPath)

		targetURL := *wcsURL
		targetURL.Path = proxyPath
		targetURL.RawQuery = c.Request.URL.RawQuery

		proxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL = &targetURL
				req.Host = targetURL.Host
			},
		}

		proxy.ServeHTTP(c.Writer, c.Request)
	})

	// SignalR Hub代理 - 支持WebSocket
	r.Any("/hubs/wcsHub/*any", func(c *gin.Context) {
		fullPath := "/hubs/wcsHub" + c.Param("any")
		log.Printf("SignalR代理: %s -> %s%s", c.Request.URL.Path, WCS_URL, fullPath)

		targetURL := *wcsURL
		targetURL.Path = fullPath
		targetURL.RawQuery = c.Request.URL.RawQuery

		proxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL = &targetURL
				req.Host = targetURL.Host
				if req.Header.Get("Upgrade") == "websocket" {
					req.Header.Set("Connection", "Upgrade")
					req.Header.Set("Upgrade", "websocket")
				}
			},
		}

		proxy.ServeHTTP(c.Writer, c.Request)
	})

	r.Any("/hubs/wcsHub", func(c *gin.Context) {
		fullPath := "/hubs/wcsHub"
		log.Printf("SignalR代理: %s -> %s%s", c.Request.URL.Path, WCS_URL, fullPath)

		targetURL := *wcsURL
		targetURL.Path = fullPath
		targetURL.RawQuery = c.Request.URL.RawQuery

		proxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL = &targetURL
				req.Host = targetURL.Host
				if req.Header.Get("Upgrade") == "websocket" {
					req.Header.Set("Connection", "Upgrade")
					req.Header.Set("Upgrade", "websocket")
				}
			},
		}

		proxy.ServeHTTP(c.Writer, c.Request)
	})

	// 健康检查端点
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"service":   "WMS Dashboard",
			"version":   "3.0.0",
			"embedded":  true,
			"timestamp": time.Now().Format("2006-01-02 15:04:05"),
		})
	})

	// 获取可用端口
	port := getAvailablePort()
	serverAddr := ":" + port

	// 创建HTTP服务器
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: r,
	}

	// 在新的goroutine中启动服务器
	go func() {
		log.Printf("🚀 WMS Dashboard 正在启动...")
		log.Printf("📱 服务端口: %s", port)
		log.Printf("🔗 本地访问: http://localhost:%s", port)
		log.Printf("🎯 WMS代理: %s", WMS_URL)
		log.Printf("🎯 WCS代理: %s", WCS_URL)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ 服务器启动失败: %v", err)
		}
	}()

	// 等待服务器启动
	time.Sleep(2 * time.Second)

	// 自动打开浏览器
	dashboardURL := fmt.Sprintf("http://localhost:%s", port)
	log.Printf("🌐 正在打开浏览器: %s", dashboardURL)

	if err := openBrowser(dashboardURL); err != nil {
		log.Printf("⚠️  无法自动打开浏览器: %v", err)
		log.Printf("💡 请手动访问: %s", dashboardURL)
	} else {
		log.Printf("✅ 浏览器已打开")
	}

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Printf("🛑 正在关闭服务器...")

	// 优雅关闭服务器
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("❌ 服务器关闭失败: %v", err)
	} else {
		log.Printf("✅ 服务器已关闭")
	}
}

// openBrowser 跨平台打开浏览器
func openBrowser(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		// 优先尝试Chrome
		chromePaths := []string{
			"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
			"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
			os.Getenv("LOCALAPPDATA") + "\\Google\\Chrome\\Application\\chrome.exe",
		}

		for _, path := range chromePaths {
			if _, err := os.Stat(path); err == nil {
				cmd = path
				args = []string{
					"--new-window",
					"--start-fullscreen",
					"--disable-web-security", // 允许跨域请求
					"--disable-features=VizDisplayCompositor",
					url,
				}
				break
			}
		}

		// 如果没找到Chrome，使用默认浏览器
		if cmd == "" {
			cmd = "rundll32"
			args = []string{"url.dll,FileProtocolHandler", url}
		}

	case "darwin":
		// macOS - 优先Chrome
		if _, err := os.Stat("/Applications/Google Chrome.app"); err == nil {
			cmd = "open"
			args = []string{"-a", "Google Chrome", "--args", "--start-fullscreen", url}
		} else {
			cmd = "open"
			args = []string{url}
		}

	case "linux":
		// Linux - 尝试多种浏览器
		browsers := []string{"google-chrome", "chromium-browser", "firefox", "xdg-open"}
		for _, browser := range browsers {
			if _, err := exec.LookPath(browser); err == nil {
				cmd = browser
				if browser == "google-chrome" || browser == "chromium-browser" {
					args = []string{"--start-fullscreen", url}
				} else {
					args = []string{url}
				}
				break
			}
		}

	default:
		return fmt.Errorf("不支持的操作系统: %s", runtime.GOOS)
	}

	if cmd == "" {
		return fmt.Errorf("未找到可用的浏览器")
	}

	return exec.Command(cmd, args...).Start()
}

// 获取可用端口
func getAvailablePort() string {
	// 优先使用环境变量指定的端口
	if port := os.Getenv("PORT"); port != "" {
		if isPortAvailable(port) {
			return port
		}
		log.Printf("⚠️ 环境变量指定的端口 %s 不可用，尝试默认端口", port)
	}

	// 尝试默认端口
	if isPortAvailable(DEFAULT_PORT) {
		return DEFAULT_PORT
	}

	// 寻找可用端口
	for port := 8080; port <= 8090; port++ {
		portStr := strconv.Itoa(port)
		if isPortAvailable(portStr) {
			log.Printf("🔄 使用端口 %s (默认端口不可用)", portStr)
			return portStr
		}
	}

	// 如果所有端口都不可用，让系统自动分配
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		log.Fatalf("❌ 无法获取可用端口: %v", err)
	}
	defer listener.Close()

	addr := listener.Addr().(*net.TCPAddr)
	autoPort := strconv.Itoa(addr.Port)
	log.Printf("🔄 使用系统自动分配的端口 %s", autoPort)
	return autoPort
}

// 检查端口是否可用
func isPortAvailable(port string) bool {
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return false
	}
	listener.Close()
	return true
}
