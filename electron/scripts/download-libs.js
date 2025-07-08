const https = require('https');
const fs = require('fs');
const path = require('path');

// 库文件配置
const libraries = [
  {
    name: 'axios',
    url: 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
    filename: 'axios.min.js'
  },
  {
    name: 'signalr',
    url: 'https://cdn.jsdelivr.net/npm/@microsoft/signalr/dist/browser/signalr.min.js',
    filename: 'signalr.min.js'
  }
];

// 创建lib目录
const libDir = path.join(__dirname, '../lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// 下载文件函数
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    console.log(`正在下载: ${url}`);
    
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      // 处理重定向
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`重定向到: ${response.headers.location}`);
        return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP错误: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`下载完成: ${filepath}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // 删除不完整的文件
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 主函数
async function main() {
  console.log('开始下载外部依赖库...');
  console.log('');
  
  try {
    for (const lib of libraries) {
      const filepath = path.join(libDir, lib.filename);
      
      // 检查文件是否已存在
      if (fs.existsSync(filepath)) {
        console.log(`文件已存在，跳过: ${lib.filename}`);
        continue;
      }
      
      await downloadFile(lib.url, filepath);
      
      // 验证文件大小
      const stats = fs.statSync(filepath);
      if (stats.size === 0) {
        throw new Error(`下载的文件为空: ${lib.filename}`);
      }
      
      console.log(`文件大小: ${Math.round(stats.size / 1024)}KB`);
      console.log('');
    }
    
    console.log('✅ 所有外部依赖库下载完成！');
    console.log('');
    console.log('已下载的文件：');
    
    // 列出已下载的文件
    const files = fs.readdirSync(libDir);
    files.forEach(file => {
      const filepath = path.join(libDir, file);
      const stats = fs.statSync(filepath);
      console.log(`  - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });
    
  } catch (error) {
    console.error('❌ 下载失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { downloadFile, main };