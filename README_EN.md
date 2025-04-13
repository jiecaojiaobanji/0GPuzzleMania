# 0G Puzzle Mania Automation Tool Tutorial

English | [简体中文](README.md)

## 1. Account Registration
1. Visit [https://puzzlemania.0g.ai/?referral=7LBSgMJlaNPv)
2. Connect your wallet (MetaMask supported)
3. Connect your Twitter account

## 2. VPS Environment Setup

### 2.1 Install NVM
```bash
# Download and install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# If using bash, execute:
source ~/.bashrc
# If using zsh, execute:
source ~/.zshrc
```

### 2.2 Install Node.js
```bash
# Install Node.js 22
nvm install 22

# View installed versions
nvm list

# Use Node.js 22
nvm use 22

# Set as default version
nvm alias default 22

# Verify installation
node -v   # Expected output: v22.13.1
nvm current # Expected output: v22.13.1
npm -v    # Expected output: 10.9.2
```

## 3. Deploy Script
1. Clone the project
```bash
git clone https://github.com/mumumusf/0GPuzzleMania.git
cd 0GPuzzleMania
```

2. Install dependencies
```bash
npm install
```

## 4. Using Screen Sessions
```bash
# Create a new screen session
screen -S 0g

# Run the script
node index.js

# Detach screen session (Press Ctrl+A+D)

# Reconnect to screen session
screen -r 0g

# View all screen sessions
screen -ls
```

## 5. Usage Instructions
1. After running the script, enter your wallet private key as prompted
2. Configure proxy for each wallet (optional)
3. The script will automatically execute tasks and cycle every 24 hours

## 📞 Contact

For any questions or suggestions, please contact the author through:

- Twitter: [@YOYOMYOYOA](https://x.com/YOYOMYOYOA)
- Telegram: [@YOYOZKS](https://t.me/YOYOZKS)

## ⚖️ Disclaimer

1. This program is for learning and communication purposes only
2. Commercial use is prohibited
3. Users are responsible for any consequences arising from the use of this program

---
Made with ❤️ by [@YOYOMYOYOA](https://x.com/YOYOMYOYOA) 
