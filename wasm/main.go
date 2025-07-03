package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"syscall/js"
	"time"
)

// WMS和WCS服务器配置
const (
	WMS_BASE_URL = "http://10.20.88.14:8008"
	WCS_BASE_URL = "http://10.20.88.14:8009"
)

// API响应结构
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Error   string      `json:"error,omitempty"`
}

// HTTP客户端配置
var httpClient = &http.Client{
	Timeout: 30 * time.Second,
}

// 主函数，导出JavaScript可调用的函数
func main() {
	// 注册全局函数到JavaScript
	js.Global().Set("goWasmRequest", js.FuncOf(makeAPIRequest))
	js.Global().Set("goWasmGetDeviceStatus", js.FuncOf(getDeviceStatus))
	js.Global().Set("goWasmGetContainerGoods", js.FuncOf(getContainerGoods))

	// 设置Promise包装器
	js.Global().Set("goWasmRequestAsync", js.FuncOf(makeAsyncAPIRequest))

	// 保持WASM程序运行
	fmt.Println("🚀 Go WASM API Client 已初始化")
	fmt.Println("✅ 支持的方法:")
	fmt.Println("  - goWasmRequest(method, url, data)")
	fmt.Println("  - goWasmGetDeviceStatus(deviceCode)")
	fmt.Println("  - goWasmGetContainerGoods(containerCode)")
	fmt.Println("  - goWasmRequestAsync(method, url, data) // 返回Promise")

	// 阻止程序退出
	select {}
}

// 通用API请求函数
func makeAPIRequest(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return createErrorResponse("参数不足，需要method和url")
	}

	method := args[0].String()
	url := args[1].String()

	var data []byte
	var err error

	// 如果有第三个参数，将其作为请求体
	if len(args) > 2 && !args[2].IsNull() {
		if args[2].Type() == js.TypeString {
			data = []byte(args[2].String())
		} else {
			// 尝试JSON序列化
			dataObj := args[2]
			if jsonStr, ok := objectToJSON(dataObj); ok {
				data = []byte(jsonStr)
			}
		}
	}

	response, err := makeHTTPRequest(method, url, data)
	if err != nil {
		return createErrorResponse(fmt.Sprintf("请求失败: %v", err))
	}

	return response
}

// 异步API请求函数，返回Promise
func makeAsyncAPIRequest(this js.Value, args []js.Value) interface{} {
	// 创建Promise
	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		resolve := args[0]
		reject := args[1]

		// 在新的goroutine中执行API调用
		go func() {
			defer func() {
				if r := recover(); r != nil {
					reject.Invoke(createErrorResponse(fmt.Sprintf("panic: %v", r)))
				}
			}()

			// 执行API请求
			result := makeAPIRequest(js.Null(), args)
			resolve.Invoke(result)
		}()

		return js.Undefined()
	}))
}

// 获取设备状态的专用函数
func getDeviceStatus(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return createErrorResponse("设备代码不能为空")
	}

	deviceCode := args[0].String()
	url := fmt.Sprintf("%s/api/WCS/getDevice/%s", WCS_BASE_URL, deviceCode)

	response, err := makeHTTPRequest("GET", url, nil)
	if err != nil {
		return createErrorResponse(fmt.Sprintf("获取设备状态失败: %v", err))
	}

	return response
}

// 获取容器货物的专用函数
func getContainerGoods(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return createErrorResponse("容器代码不能为空")
	}

	containerCode := args[0].String()
	url := fmt.Sprintf("%s/api/warehouse/Inventory/container/%s", WMS_BASE_URL, containerCode)

	response, err := makeHTTPRequest("GET", url, nil)
	if err != nil {
		return createErrorResponse(fmt.Sprintf("获取容器货物失败: %v", err))
	}

	return response
}

// 执行HTTP请求
func makeHTTPRequest(method, url string, data []byte) (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var body io.Reader
	if data != nil {
		body = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %v", err)
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "WMS-WASM-Client/1.0")

	// 添加CORS相关头部
	req.Header.Set("Access-Control-Allow-Origin", "*")
	req.Header.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	req.Header.Set("Access-Control-Allow-Headers", "Content-Type, Accept")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求执行失败: %v", err)
	}
	defer resp.Body.Close()

	responseData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %v", err)
	}

	// 解析响应
	var result map[string]interface{}
	if err := json.Unmarshal(responseData, &result); err != nil {
		// 如果不是JSON，返回原始文本
		result = map[string]interface{}{
			"success":    resp.StatusCode >= 200 && resp.StatusCode < 300,
			"statusCode": resp.StatusCode,
			"data":       string(responseData),
		}
	} else {
		result["success"] = resp.StatusCode >= 200 && resp.StatusCode < 300
		result["statusCode"] = resp.StatusCode
	}

	return result, nil
}

// 创建错误响应
func createErrorResponse(message string) map[string]interface{} {
	return map[string]interface{}{
		"success": false,
		"error":   message,
		"data":    nil,
	}
}

// JavaScript对象转JSON字符串
func objectToJSON(obj js.Value) (string, bool) {
	defer func() {
		if recover() != nil {
			// 忽略panic，返回false
		}
	}()

	// 使用JavaScript的JSON.stringify
	jsonStringify := js.Global().Get("JSON").Get("stringify")
	result := jsonStringify.Invoke(obj)

	if result.Type() == js.TypeString {
		return result.String(), true
	}

	return "", false
}
