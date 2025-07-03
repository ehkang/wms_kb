package main

import (
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func main() {
	r := gin.Default()

	// 设置静态文件服务
	r.StaticFile("/", "./dashboard_integrated.html")
	r.StaticFile("/dashboard", "./dashboard_integrated.html")

	// 自定义代理处理器，正确处理路径重写
	// WMS API Proxy - 移除 /api-wms 前缀
	wmsURL, _ := url.Parse("http://10.20.88.14:8008")
	r.Any("/api-wms/*proxyPath", func(c *gin.Context) {
		proxyPath := c.Param("proxyPath")
		log.Printf("WMS代理请求: %s -> %s%s", c.Request.URL.Path, wmsURL.String(), proxyPath)

		// 创建新的请求
		targetURL := *wmsURL
		targetURL.Path = proxyPath
		targetURL.RawQuery = c.Request.URL.RawQuery

		// 创建代理并修改请求
		proxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL = &targetURL
				req.Host = targetURL.Host
			},
		}

		proxy.ServeHTTP(c.Writer, c.Request)
	})

	// WCS API Proxy - 移除 /api-wcs 前缀
	wcsURL, _ := url.Parse("http://10.20.88.14:8009")
	r.Any("/api-wcs/*proxyPath", func(c *gin.Context) {
		proxyPath := c.Param("proxyPath")
		log.Printf("WCS代理请求: %s -> %s%s", c.Request.URL.Path, wcsURL.String(), proxyPath)

		// 创建新的请求
		targetURL := *wcsURL
		targetURL.Path = proxyPath
		targetURL.RawQuery = c.Request.URL.RawQuery

		// 创建代理并修改请求
		proxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL = &targetURL
				req.Host = targetURL.Host
			},
		}

		proxy.ServeHTTP(c.Writer, c.Request)
	})

	// SignalR Hub Proxy - 支持WebSocket协议升级
	signalRURL, _ := url.Parse("http://10.20.88.14:8009")
	r.Any("/hubs/wcsHub/*any", func(c *gin.Context) {
		// 获取完整路径
		fullPath := "/hubs/wcsHub" + c.Param("any")
		log.Printf("SignalR代理请求: %s -> %s%s", c.Request.URL.Path, signalRURL.String(), fullPath)

		// 创建新的请求URL
		targetURL := *signalRURL
		targetURL.Path = fullPath
		targetURL.RawQuery = c.Request.URL.RawQuery

		// 创建支持WebSocket的代理
		proxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL = &targetURL
				req.Host = targetURL.Host
				// 保留WebSocket相关的headers
				if req.Header.Get("Upgrade") == "websocket" {
					req.Header.Set("Connection", "Upgrade")
					req.Header.Set("Upgrade", "websocket")
				}
			},
		}

		proxy.ServeHTTP(c.Writer, c.Request)
	})

	// SignalR Hub根路径代理
	r.Any("/hubs/wcsHub", func(c *gin.Context) {
		fullPath := "/hubs/wcsHub"
		log.Printf("SignalR代理请求: %s -> %s%s", c.Request.URL.Path, signalRURL.String(), fullPath)

		// 创建新的请求URL
		targetURL := *signalRURL
		targetURL.Path = fullPath
		targetURL.RawQuery = c.Request.URL.RawQuery

		// 创建支持WebSocket的代理
		proxy := &httputil.ReverseProxy{
			Director: func(req *http.Request) {
				req.URL = &targetURL
				req.Host = targetURL.Host
				// 保留WebSocket相关的headers
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
			"status":  "ok",
			"service": "WMS Dashboard",
			"version": "2.0.0",
		})
	})

	log.Println("WMS Dashboard Server starting on :8080")
	log.Println("Dashboard: http://localhost:8080/dashboard")
	log.Println("Health Check: http://localhost:8080/health")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
