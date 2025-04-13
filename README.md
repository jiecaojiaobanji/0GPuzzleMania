原作者https://github.com/mumumusf/0GPuzzleMania 
ip一行一行输麻烦稍微改下
# 0G Puzzle Mania 自动化工具使用教程

[English](README_EN.md) | 简体中文

## 1. 注册账号
1. 访问 [https://puzzlemania.0g.ai/?referral=7LBSgMJlaNPv)
2. 连接你的钱包（支持MetaMask等）
3. 连接你的Twitter账号

## 2. VPS环境配置

### 2.1 安装NVM
```bash
# 下载并安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 如果使用bash，执行：
source ~/.bashrc
# 如果使用zsh，执行：
source ~/.zshrc
```

### 2.2 安装Node.js
```bash
# 安装Node.js 22
nvm install 22

# 查看已安装的版本
nvm list

# 使用Node.js 22
nvm use 22

# 设置默认版本
nvm alias default 22

# 验证安装
node -v   # 预期输出: v22.13.1
nvm current # 预期输出: v22.13.1
npm -v    # 预期输出: 10.9.2
```

## 3. 部署脚本输入私钥ip
1. 克隆项目
```bash
git clone https://github.com//jiecaojiaobanji/0GPuzzleMania.git
cd 0GPuzzleMania
```


2. 安装依赖
```bash
npm install
```

3 输入私钥保存，一行一个私钥
```bash
nano  wallet.txt
粘贴私钥
ctrl +x
y
enter

```

4 ip 同私钥
```bash
nano  proxy.txt
ctrl +x
y
enter

```


## 4. 使用Screen会话
```bash
# 创建新的screen会话
screen -S 0g

# 运行脚本
node index.js

# 分离screen会话（按Ctrl+A+D）

# 重新连接screen会话
screen -r 0g

# 查看所有screen会话
screen -ls
```

## 5. 使用说明
1. 运行脚本后，按提示输入钱包私钥
2. 为每个钱包配置代理（可选）
3. 脚本会自动执行任务并每24小时循环一次

## 📞 联系方式

如有任何问题或建议，欢迎通过以下方式联系作者:

- Twitter：[@YOYOMYOYOA](https://x.com/YOYOMYOYOA)
- Telegram：[@YOYOZKS](https://t.me/YOYOZKS)

## ⚖️ 免责声明

1. 本程序仅供学习交流使用
2. 禁止用于商业用途
3. 使用本程序产生的任何后果由用户自行承担

---
Made with ❤️ by [@YOYOMYOYOA](https://x.com/YOYOMYOYOA) 
