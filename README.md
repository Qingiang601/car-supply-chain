# 更新软件源
sudo apt update && sudo apt upgrade -y

# 安装 Git
sudo apt install -y git

# 安装 Docker
sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt install -y docker-compose

# 安装 Node.js 16.x 与 npm
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装结果
docker --version
docker-compose --version
node -v
npm -v
git --version

sudo mkdir -p /mnt/hgfs/project-share
sudo nano /etc/systemd/system/vmware-share.mount


[Unit]
Description=VMware Shared Folder Mount
After=vmware-vmblock-fuse.service

[Mount]
What=vmhgfs-fuse
Where=/mnt/hgfs/project-share
Type=fuse.vmhgfs-fuse
Options=allow_other,default_permissions

[Install]
WantedBy=multi-user.target


sudo systemctl enable vmware-share.mount
sudo systemctl start vmware-share.mount


#!/bin/bash
set -e

echo "=== 启动 Fabric 网络 ==="
docker-compose up -d

echo "=== 启动后端服务 ==="
cd ./backend
npm install
npm start &

echo "=== 启动前端服务 ==="
cd ../frontend
npm install
npm start &

echo "所有服务启动完成"

chmod +x start.sh


#!/bin/bash
set -e

echo "=== 停止前后端服务 ==="
pkill -f "npm start" || true

echo "=== 停止 Fabric 网络 ==="
docker-compose down

echo "所有服务已停止"

chmod +x stop.sh

# 查看所有 Docker 容器日志
docker logs -f $(docker ps -q)

# 查看指定容器日志（替换容器名）
docker logs -f <容器名>

# 查看前后端服务日志
ps aux | grep npm

# 查看共享文件夹挂载日志
journalctl -u vmware-share.mount



4. 环境统一说明
 
所有成员均需按照以下步骤配置环境：
 
1. 执行环境安装脚本，确保依赖版本一致
​
2. 配置 VMware 共享文件夹并设置开机挂载
​
3. 赋予  start.sh  和  stop.sh  执行权限
​
4. 通过  ./start.sh  一键启动所有服务
​
5. 通过日志命令排查运行问题



