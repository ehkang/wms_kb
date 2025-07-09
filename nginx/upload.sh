#!/bin/bash

# 服务器信息
SERVER="root@10.20.88.14"
REMOTE_DIR="/root/git/kanban"

echo "上传文件..."
scp nginx.conf kanban.html docker-compose.yml $SERVER:$REMOTE_DIR/

echo "文件上传完成！"