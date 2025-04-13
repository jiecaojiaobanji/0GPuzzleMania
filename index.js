/**
 * @author 小林
 * @description 0G Puzzle Mania 平台自动化任务执行脚本
 * @version 1.0.0
 * @platform 0G Puzzle Mania (https://puzzlemania.0g.ai)
 */

import fs from 'fs';
import "dotenv/config";
import axios from 'axios';
import { Wallet } from 'ethers';
import ora from 'ora';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import cfonts from 'cfonts';
import readline from 'readline';
import chalk from 'chalk';
import banner from './banner.js';

// 用户交互提示函数
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// 文本居中显示函数
function centerText(text, color = "cyanBright") {
  const terminalWidth = process.stdout.columns || 80;
  const padding = Math.max(0, Math.floor((terminalWidth - text.length) / 2));
  return " ".repeat(padding) + chalk[color](text);
}

// 解析代理字符串
function parseProxyString(proxyStr) {
  try {
    // 处理格式: ip:port:username:password
    if (proxyStr.includes(':')) {
      const parts = proxyStr.split(':');
      if (parts.length === 4) {
        const [ip, port, username, password] = parts;
        return `http://${username}:${password}@${ip}:${port}`;
      } else if (parts.length === 2) {
        const [ip, port] = parts;
        return `http://${ip}:${port}`;
      }
    }
    return proxyStr;
  } catch (err) {
    console.error(chalk.red("代理格式解析错误:", err.message));
    return null;
  }
}

// 显示程序标题
console.clear();
console.log(chalk.cyan(banner));

// 全局变量初始化
let proxyUrl = null;
let agent = null;
let axiosInstance = axios.create();

// 设置代理服务器
async function setupProxy() {
  const useProxy = await askQuestion(chalk.cyan("\n是否使用代理? (Y/n): "));
  if (useProxy.toLowerCase() === 'y') {
    const proxyInput = await askQuestion(chalk.cyan("请输入代理地址 (支持格式: ip:port 或 ip:port:username:password): "));
    if (proxyInput) {
      proxyUrl = parseProxyString(proxyInput);
      if (proxyUrl) {
        if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
          agent = new HttpsProxyAgent(proxyUrl);
        } else if (proxyUrl.startsWith('socks5://')) {
          agent = new SocksProxyAgent(proxyUrl);
        } else {
          console.log(chalk.red("代理格式不支持. 请使用 http/https 或 socks5."));
          return;
        }
        axiosInstance = axios.create({ httpAgent: agent, httpsAgent: agent });
        console.log(chalk.green(`使用代理: ${proxyUrl}`));
      }
    } else {
      console.log(chalk.blue("继续无代理模式."));
    }
  } else {
    console.log(chalk.blue("继续无代理模式."));
  }
}

// 地址缩写显示
function shortAddress(address) {
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

// 倒计时格式化
function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// 实时倒计时显示
async function liveCountdown(durationMs) {
  const endTime = Date.now() + durationMs;
  return new Promise(resolve => {
    const timer = setInterval(() => {
      const remaining = Math.max(endTime - Date.now(), 0);
      process.stdout.write(chalk.yellow(`\r下次循环倒计时 ${formatCountdown(remaining)} ...`));
      if (remaining <= 0) {
        clearInterval(timer);
        process.stdout.write("\n");
        resolve();
      }
    }, 1000);
  });
}

// 请求重试机制
async function requestWithRetry(fn, maxRetries = 30, delayMs = 2000, debug = false) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      if (err.response && err.response.status === 429) {
        attempt++;
        if (debug) console.warn(chalk.yellow(`尝试 ${attempt}: 收到429错误, ${delayMs}ms后重试...`));
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error("达到最大重试次数");
}

// 任务验证
async function verifyTask(activityId, headers) {
  const payload = {
    operationName: "VerifyActivity",
    variables: { data: { activityId } },
    query:
      "mutation VerifyActivity($data: VerifyActivityInput!) {" +
      "  verifyActivity(data: $data) {" +
      "    record {" +
      "      id" +
      "      activityId" +
      "      status" +
      "      __typename" +
      "    }" +
      "    __typename" +
      "  }" +
      "}"
  };

  try {
    const response = await axiosInstance.post("https://api.deform.cc/", payload, { headers });
    const verifyData = response.data.data.verifyActivity;
    if (!verifyData || !verifyData.record) return false;
    return verifyData.record.status && verifyData.record.status.toUpperCase() === "COMPLETED";
  } catch (err) {
    return false;
  }
}

// 执行签到
async function performCheckIn(activityId, headers) {
  const payload = {
    operationName: "VerifyActivity",
    variables: { data: { activityId } },
    query: `mutation VerifyActivity($data: VerifyActivityInput!) {
      verifyActivity(data: $data) {
        record {
          id
          activityId
          status
          properties
          createdAt
          rewardRecords {
            id
            status
            appliedRewardType
            appliedRewardQuantity
            appliedRewardMetadata
            error
            rewardId
            reward {
              id
              quantity
              type
              properties
              __typename
            }
            __typename
          }
          __typename
        }
        missionRecord {
          id
          missionId
          status
          createdAt
          rewardRecords {
            id
            status
            appliedRewardType
            appliedRewardQuantity
            appliedRewardMetadata
            error
            rewardId
            reward {
              id
              quantity
              type
              properties
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
    }`
  };

  try {
    const response = await axiosInstance.post("https://api.deform.cc/", payload, { headers });
    return response.data;
  } catch (err) {
    console.error(chalk.red("签到错误:", err.response ? err.response.data : err.message));
    return null;
  }
}

// 账户登录
async function doLogin(walletKey, debug = true) {
  try {
    return await requestWithRetry(async () => {
      const wallet = new Wallet(walletKey);
      const address = wallet.address;
      console.log(chalk.blue("调试信息 - 钱包地址:", address));

      const privyHeaders = {
        "Host": "auth.privy.io",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "privy-app-id": "clphlvsh3034xjw0fvs59mrdc",
        "privy-ca-id": "94f3cea1-8c2b-478d-90da-edc794f7114b",
        "privy-client": "react-auth:2.4.1",
        "Origin": "https://puzzlemania.0g.ai",
        "Referer": "https://puzzlemania.0g.ai/"
      };

      // 初始化登录
      console.log(chalk.blue("调试信息 - 开始初始化登录..."));
      const initResponse = await axiosInstance.post("https://auth.privy.io/api/v1/siwe/init", { address }, { headers: privyHeaders });
      console.log(chalk.blue("调试信息 - 初始化登录成功"));
      const { nonce } = initResponse.data;
      const issuedAt = new Date().toISOString();
      const message = `puzzlemania.0g.ai wants you to sign in with your Ethereum account:
${address}

By signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.

URI: https://puzzlemania.0g.ai
Version: 1
Chain ID: 8453
Nonce: ${nonce}
Issued At: ${issuedAt}
Resources:
- https://privy.io`;

      // 签名消息
      console.log(chalk.blue("调试信息 - 开始签名消息..."));
      const signature = await wallet.signMessage(message);
      console.log(chalk.blue("调试信息 - 签名成功"));
      const authPayload = {
        message,
        signature,
        chainId: "eip155:8453",
        walletClientType: "metamask",
        connectorType: "injected",
        mode: "login-or-sign-up"
      };

      console.log(chalk.blue("调试信息 - 开始认证..."));
      const authResponse = await axiosInstance.post("https://auth.privy.io/api/v1/siwe/authenticate", authPayload, { headers: privyHeaders });
      console.log(chalk.blue("调试信息 - 认证成功"));
      const { token, user } = authResponse.data;
      let displayName = "未知用户";
      if (user && user.linked_accounts) {
        const twitterAcc = user.linked_accounts.find(acc => acc.type === "twitter_oauth" && acc.name);
        if (twitterAcc) displayName = twitterAcc.name.split("|")[0].trim();
      }

      // Deform平台登录
      console.log(chalk.blue("调试信息 - 开始平台登录..."));
      const userLoginPayload = {
        operationName: "UserLogin",
        variables: { data: { externalAuthToken: token } },
        query: `mutation UserLogin($data: UserLoginInput!) {
          userLogin(data: $data)
        }`
      };
      const deformLoginHeaders = {
        "content-type": "application/json",
        "origin": "https://puzzlemania.0g.ai",
        "x-apollo-operation-name": "UserLogin"
      };
      const userLoginResponse = await axiosInstance.post("https://api.deform.cc/", userLoginPayload, { headers: deformLoginHeaders });
      console.log(chalk.blue("调试信息 - 平台登录成功"));
      const userLoginToken = userLoginResponse.data.data.userLogin;

      return { userLoginToken, displayName, wallet, address, loginTime: Date.now() };
    }, 30, 2000, debug);
  } catch (err) {
    console.error(chalk.red(`账户 ${shortAddress((new Wallet(walletKey)).address)} 登录失败: ${err.message}`));
    if (err.response) {
      console.error(chalk.red("错误详情:", JSON.stringify(err.response.data, null, 2)));
    }
    return null;
  }
}

// 任务名称映射表
const taskNameMap = {
  "Campaign Registration": "活动注册",
  "Use a friend's referral code": "使用好友邀请码",
  "Mint 0G Puzzle Mania Commemorative NFT": "铸造0G Puzzle Mania纪念NFT",
  "Follow Michael Heinrich - CEO, 0G Labs": "关注Michael Heinrich - 0G Labs CEO",
  "Follow 0G Foundation": "关注0G基金会",
  "Follow Ming Wu - CTO, 0G Labs": "关注Ming Wu - 0G Labs CTO",
  "Follow 0G Labs": "关注0G Labs",
  "Like: Hype up Guild on 0G projects!": "点赞：0G项目公会",
  "Follow One Gravity - the first NFT collection on 0G": "关注One Gravity - 0G首个NFT系列",
  "RT: Hype up Guild on 0G projects!": "转发：0G项目公会",
  "Follow AI Verse - coming soon.": "关注AI Verse - 即将推出",
  "Like: Support One Gravity": "点赞：支持One Gravity",
  "Follow Battle of Agents - coming soon.": "关注Battle of Agents - 即将推出",
  "RT: Support One Gravity": "转发：支持One Gravity",
  "RT: You Need Decentralized AI": "转发：你需要去中心化AI",
  "RT: Battle of Agents is coming soon.": "转发：Battle of Agents即将推出",
  "Like: 600K strong on X!": "点赞：X平台60万粉丝",
  "Like: Guild on 0G with Michael!": "点赞：与Michael一起加入0G公会",
  "RT: 600K strong on X!": "转发：X平台60万粉丝",
  "RT: Guild on 0G with Michael!": "转发：与Michael一起加入0G公会",
  "Like: Learn from Ming": "点赞：向Ming学习",
  "Follow 0G Labs on Farcaster": "在Farcaster关注0G Labs",
  "Like: You Need Decentralized AI": "点赞：你需要去中心化AI",
  "RT: Learn from Ming": "转发：向Ming学习",
  "Like: Guild on 0G Farcaster": "点赞：在Farcaster加入0G公会",
  "Refer a friend": "邀请好友",
  "Like: Battle of Agents is coming soon.": "点赞：Battle of Agents即将推出",
  "RT: Guild on 0G Farcaster": "转发：在Farcaster加入0G公会"
};

// 获取任务中文名称
function getTaskChineseName(title) {
  return taskNameMap[title] || title;
}

// 单次任务循环
async function runCycleOnce(walletKey, axiosInstance) {
  const loginSpinner = ora(chalk.cyan(" 处理登录中...")).start();
  const loginData = await doLogin(walletKey, false);
  if (!loginData) {
    loginSpinner.fail(chalk.red("登录失败，跳过账户."));
    return;
  }
  loginSpinner.succeed(chalk.green(" 登录成功"));

  const { userLoginToken, displayName, address, loginTime } = loginData;

  // 获取用户信息
  const userMePayload = {
    operationName: "UserMe",
    variables: { campaignId: "f7e24f14-b911-4f11-b903-edac89a095ec" },
    query: `
      query UserMe($campaignId: String!) {
        userMe {
          campaignSpot(campaignId: $campaignId) {
            points
            records {
              id
              status
              createdAt
            }
          }
        }
      }`
  };
  const userMeHeaders = {
    "authorization": `Bearer ${userLoginToken}`,
    "content-type": "application/json",
    "x-apollo-operation-name": "UserMe"
  };
  let userMePoints = 0;
  try {
    const response = await axiosInstance.post("https://api.deform.cc/", userMePayload, { headers: userMeHeaders });
    userMePoints = response.data.data.userMe.campaignSpot.points || 0;
  } catch (err) {
    console.error(chalk.red("获取用户XP失败:", err.response ? err.response.data : err.message));
  }

  // 获取活动信息
  const campaignPayload = {
    operationName: "Campaign",
    variables: { campaignId: "f7e24f14-b911-4f11-b903-edac89a095ec" },
    query: `
      fragment ActivityFields on CampaignActivity {
        id
        title
        createdAt
        records {
          id
          status
          createdAt
          __typename
        }
        __typename
      }
      query Campaign($campaignId: String!) {
        campaign(id: $campaignId) {
          activities {
            ...ActivityFields
            __typename
          }
          __typename
        }
      }`
  };
  const campaignHeaders = {
    "authorization": `Bearer ${userLoginToken}`,
    "content-type": "application/json",
    "x-apollo-operation-name": "Campaign"
  };
  let campaignData;
  try {
    const campaignResponse = await axiosInstance.post("https://api.deform.cc/", campaignPayload, { headers: campaignHeaders });
    campaignData = campaignResponse.data.data.campaign;
  } catch (err) {
    console.error(chalk.red("获取活动数据失败:", err.response ? err.response.data : err.message));
    throw err;
  }
  if (!campaignData) throw new Error("未找到活动数据");

  // 处理任务
  let dailyCheckin = campaignData.activities.find(act =>
    act.title && act.title.toLowerCase().includes("daily check-in")
  );
  let claimedTasks = [];
  let unclaimedTasks = [];
  campaignData.activities.forEach(act => {
    if (dailyCheckin && act.id === dailyCheckin.id) return;
    if (act.records && act.records.length > 0) {
      claimedTasks.push(act);
    } else {
      unclaimedTasks.push(act);
    }
  });

  // 执行签到
  let checkinStatus = "未签到";
  if (dailyCheckin) {
    if (!dailyCheckin.records || dailyCheckin.records.length === 0) {
      const spinnerCheckin = ora(chalk.cyan(`执行签到: ${dailyCheckin.title}`)).start();
      const checkInResponse = await performCheckIn(dailyCheckin.id, campaignHeaders);
      spinnerCheckin.stop();
      if (
        checkInResponse &&
        checkInResponse.data &&
        checkInResponse.data.verifyActivity &&
        checkInResponse.data.verifyActivity.record &&
        checkInResponse.data.verifyActivity.record.status &&
        checkInResponse.data.verifyActivity.record.status.toUpperCase() === "COMPLETED"
      ) {
        checkinStatus = "签到成功";
        dailyCheckin.records = [checkInResponse.data.verifyActivity.record];
      } else {
        console.log(chalk.red("签到失败."));
      }
    } else {
      checkinStatus = "已完成";
    }
  }
  
  // 显示用户信息
  console.clear();
  console.log(chalk.magenta('\n==========================================================================='));
  console.log(chalk.blueBright.bold('                         用户信息'));
  console.log(chalk.magenta('============================================================================'));
  console.log(chalk.cyanBright(`用户名        : ${displayName}`));
  console.log(chalk.cyanBright(`钱包地址      : ${shortAddress(address)}`));
  console.log(chalk.cyanBright(`积分          : ${userMePoints}`));
  console.log(chalk.cyanBright(`每日签到      : ${dailyCheckin ? checkinStatus : "未完成"}`));
  console.log(chalk.cyanBright(`代理服务器    : ${proxyUrl || "未使用"}`));
  console.log(chalk.magenta('============================================================================'));

  // 显示已完成任务
  console.log(chalk.magenta('\n----------------------------- 已完成任务 ----------------------------\n'));
  if (claimedTasks.length === 0) {
    console.log(chalk.red('(暂无已完成任务)\n'));
  } else {
    claimedTasks.forEach(task => {
      console.log(chalk.green(`[已完成] 任务: ${getTaskChineseName(task.title)}`));
    });
    console.log('');
  }
  console.log(chalk.magenta('------------------------------------------------------------------------\n'));

  // 显示未完成任务
  console.log(chalk.magenta('---------------------------- 未完成任务 ---------------------------\n'));
  if (unclaimedTasks.length === 0) {
    console.log(chalk.red('(暂无未完成任务)\n'));
  } else {
    for (const task of unclaimedTasks) {
      const spinnerTask = ora(chalk.cyan(`正在验证: ${getTaskChineseName(task.title)}`)).start();
      const verified = await verifyTask(task.id, campaignHeaders);
      spinnerTask.stop();
      if (verified) {
        console.log(chalk.green(`[已完成] 任务: ${getTaskChineseName(task.title)}`));
      } else {
        console.log(chalk.red(`[未完成] 任务: ${getTaskChineseName(task.title)}`));
      }
    }
  }
  console.log(chalk.magenta('------------------------------------------------------------------------\n'));
}

// 主循环(多账户轮询)
async function mainLoopRoundRobin() {
  // 获取用户输入的钱包私钥和代理IP列表
  const wallets = [];
  const privateKeys = await askQuestion(chalk.cyan("\n请输入所有私钥，每行一个 (输入空行结束):\n"));
  const proxyIPs = await askQuestion(chalk.cyan("\n请输入所有代理IP，每行一个 (输入空行结束):\n"));

  const keys = privateKeys.split('\n').filter(key => key.trim());
  const ips = proxyIPs.split('\n').filter(ip => ip.trim());

  if (keys.length !== ips.length) {
    console.error(chalk.red("私钥和代理IP的数量不匹配"));
    process.exit(1);
  }

  for (let i = 0; i < keys.length; i++) {
    const privateKey = keys[i].trim();
    const proxyIP = ips[i].trim();

    // 处理私钥格式
    let processedKey = privateKey;
    if (processedKey.startsWith('0x')) {
      processedKey = processedKey.slice(2);
    }
    
    // 验证私钥格式
    try {
      const wallet = new Wallet(processedKey);
      const address = wallet.address;
      
      let proxyUrl = null;
      if (proxyIP) {
        proxyUrl = parseProxyString(proxyIP);
        if (proxyUrl) {
          console.log(chalk.green(`钱包 ${shortAddress(address)} 使用代理: ${proxyUrl}`));
        }
      }

      wallets.push({
        privateKey: processedKey,
        address: address,
        proxyUrl: proxyUrl
      });

      console.log(chalk.green(`钱包 ${shortAddress(address)} 已添加`));
    } catch (err) {
      console.error(chalk.red(`第 ${i + 1} 行私钥格式错误: ${err.message}`));
    }
  }
  
  if (wallets.length === 0) {
    console.error(chalk.red("未输入任何有效私钥，程序退出"));
    process.exit(1);
  }

  console.log(chalk.green(`\n成功添加 ${wallets.length} 个钱包，开始执行任务...\n`));

  while (true) {
    const cycleStart = Date.now();
    
    // 遍历所有钱包
    for (const wallet of wallets) {
      console.log(chalk.cyan(`\n处理账户: ${shortAddress(wallet.address)}\n`));
      try {
        // 获取所有可用的代理IP
        const allProxyIPs = ips.filter(ip => ip.trim());
        
        // 尝试登录，最多尝试5次
        let loginSuccess = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            // 前4次尝试使用代理IP
            let proxyUrl = null;
            if (attempt < 4) {
              const randomIP = allProxyIPs[Math.floor(Math.random() * allProxyIPs.length)];
              proxyUrl = parseProxyString(randomIP);
            }
            
            // 创建axios实例
            let axiosInstance = axios.create();
            if (proxyUrl) {
              let agent;
              if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
                agent = new HttpsProxyAgent(proxyUrl);
              } else if (proxyUrl.startsWith('socks5://')) {
                agent = new SocksProxyAgent(proxyUrl);
              }
              if (agent) {
                axiosInstance = axios.create({ httpAgent: agent, httpsAgent: agent });
              }
            }

            const loginData = await doLogin(wallet.privateKey, false);
            if (loginData) {
              loginSuccess = true;
              await runCycleOnce(wallet.privateKey, axiosInstance);
              break;
            }
          } catch (err) {
            console.error(chalk.red(`登录尝试 ${attempt + 1}/5 失败: ${err.message}`));
            if (attempt === 4) {
              console.log(chalk.yellow(`账户 ${shortAddress(wallet.address)} 登录失败，跳过该账户`));
            }
          }
        }
      } catch (err) {
        console.error(chalk.red(`账户 ${shortAddress(wallet.address)} 处理错误: ${err.message}`));
      }
      // 每个账户处理完后等待一段时间
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    const cycleDuration = 24 * 60 * 60 * 1000; // 24小时
    const elapsed = Date.now() - cycleStart;
    const remaining = cycleDuration - elapsed;
    if (remaining > 0) {
      await liveCountdown(remaining);
    }
  }
}

// 启动程序
mainLoopRoundRobin().catch(err => console.error(chalk.red("发生致命错误:", err.message)));
