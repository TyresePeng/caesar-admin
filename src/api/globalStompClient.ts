// 全局WebSocket连接管理器，避免多个组件创建重复连接
import SockJS from "sockjs-client";
import Stomp from "stompjs";

// 从 .env 中获取服务地址
const serviceUrl = import.meta.env.VITE_APP_API_URL;

type MessageCallback = (data: any) => void;

// 全局弹幕去重记录
const globalDanmakuCache = new Map<string, number>(); // hash -> timestamp

class GlobalStompClient {
  private static instance: GlobalStompClient;
  private stompClient: Stomp.Client | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  
  // 存储订阅信息：destination -> Set<callback>
  private subscriptions = new Map<string, Set<MessageCallback>>();
  // 存储STOMP订阅对象：destination -> Stomp.Subscription
  private stompSubscriptions = new Map<string, Stomp.Subscription>();

  private constructor() {
    // 定期清理过期的弹幕缓存
    setInterval(() => {
      this.cleanExpiredDanmakuCache();
    }, 30000); // 每30秒清理一次
  }

  static getInstance(): GlobalStompClient {
    if (!GlobalStompClient.instance) {
      GlobalStompClient.instance = new GlobalStompClient();
    }
    return GlobalStompClient.instance;
  }

  /**
   * 清理过期的弹幕缓存
   */
  private cleanExpiredDanmakuCache() {
    const now = Date.now();
    const expireTime = 60000; // 1分钟过期
    
    for (const [hash, timestamp] of globalDanmakuCache.entries()) {
      if (now - timestamp > expireTime) {
        globalDanmakuCache.delete(hash);
      }
    }
  }

  /**
   * 检查弹幕是否已经处理过（全局去重）
   */
  private isDuplicateMessage(user: string, content: string): boolean {
    const hash = `${user.trim()}_${content.trim()}`;
    const now = Date.now();
    
    // 检查最近10秒内是否有相同弹幕
    if (globalDanmakuCache.has(hash)) {
      const lastTimestamp = globalDanmakuCache.get(hash)!;
      if (now - lastTimestamp < 10000) { // 10秒内的重复弹幕过滤
        console.log(`[全局去重] 过滤重复弹幕: ${user} - ${content}，上次时间: ${new Date(lastTimestamp).toLocaleTimeString()}`);
        return true;
      }
    }
    
    // 记录这条弹幕
    globalDanmakuCache.set(hash, now);
    console.log(`[全局去重] 新弹幕记录: ${user} - ${content}，当前缓存大小: ${globalDanmakuCache.size}`);
    return false;
  }

  /**
   * 建立WebSocket连接（单例模式，确保只有一个连接）
   */
  async connect(): Promise<void> {
    console.log(`[全局WebSocket] 尝试连接，当前状态: ${this.isConnected}`);
    
    if (this.isConnected) {
      console.log(`[全局WebSocket] 已连接，直接返回`);
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      console.log(`[全局WebSocket] 连接中，等待现有连接`);
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      console.log(`[全局WebSocket] 开始新连接到: ${serviceUrl}/ws`);
      const socket = new SockJS(`${serviceUrl}/ws`);
      const client = Stomp.over(socket);

      client.heartbeat.outgoing = 10000;
      client.heartbeat.incoming = 10000;
      client.debug = () => {}; // 关闭调试输出

      this.stompClient = client;

      // 监听连接断开事件
      socket.onclose = () => {
        this.isConnected = false;
        this.connectionPromise = null;
        console.warn("⚠️ 全局WebSocket 已断开");
        
        // 重新订阅所有活跃的订阅
        this.resubscribeAll();
      };

      client.connect(
        {},
        () => {
          this.isConnected = true;
          this.connectionPromise = null;
          console.log("✅ 全局 STOMP 已连接成功");
          
          // 连接成功后重新建立所有订阅
          this.resubscribeAll();
          resolve();
        },
        (err) => {
          this.isConnected = false;
          this.connectionPromise = null;
          console.error("❌ 全局 STOMP 连接失败", err);
          reject(err);
        }
      );
    });

    return this.connectionPromise;
  }

  /**
   * 订阅某个消息主题
   * @param destination 订阅地址
   * @param callback 消息回调函数
   */
  subscribe(destination: string, callback: MessageCallback): () => void {
    console.log(`[全局WebSocket] 新增订阅: ${destination}`);
    
    // 如果是第一次订阅该destination，创建回调集合
    if (!this.subscriptions.has(destination)) {
      this.subscriptions.set(destination, new Set());
      console.log(`[全局WebSocket] 首次订阅目标: ${destination}`);
    }

    const callbacks = this.subscriptions.get(destination)!;
    callbacks.add(callback);
    console.log(`[全局WebSocket] 目标 ${destination} 当前回调数量: ${callbacks.size}`);

    // 如果WebSocket已连接且该destination尚未有STOMP订阅，创建STOMP订阅
    if (this.isConnected && this.stompClient && !this.stompSubscriptions.has(destination)) {
      this.createStompSubscription(destination);
    }

    // 返回取消订阅函数
    return () => {
      console.log(`[全局WebSocket] 取消订阅: ${destination}`);
      callbacks.delete(callback);
      
      // 如果该destination没有回调了，取消STOMP订阅
      if (callbacks.size === 0) {
        console.log(`[全局WebSocket] 清理目标订阅: ${destination}`);
        this.subscriptions.delete(destination);
        const stompSub = this.stompSubscriptions.get(destination);
        if (stompSub) {
          stompSub.unsubscribe();
          this.stompSubscriptions.delete(destination);
        }
      }
    };
  }

  /**
   * 创建STOMP订阅
   */
  private createStompSubscription(destination: string) {
    if (!this.stompClient || !this.isConnected) {
      return;
    }

    console.log(`[全局WebSocket] 创建订阅: ${destination}`);
    
    const stompSub = this.stompClient.subscribe(destination, (message) => {
      try {
        const body = JSON.parse(message.body);
        console.log(`[全局WebSocket] 收到消息 ${destination}:`, body);
        
        // 临时禁用全局弹幕去重检查，直接分发消息
        if (body?.nickname && body?.content) {
          const callbacks = this.subscriptions.get(destination);
          if (callbacks) {
            console.log(`[全局WebSocket] 分发消息到 ${callbacks.size} 个回调`);
            // 调用所有回调函数
            callbacks.forEach(callback => {
              try {
                callback(body);
              } catch (error) {
                console.error(`回调函数执行错误 (${destination}):`, error);
              }
            });
          }
        }
      } catch (error) {
        console.error(`解析消息失败 (${destination}):`, error);
      }
    });

    this.stompSubscriptions.set(destination, stompSub);
  }

  /**
   * 重新建立所有订阅（连接恢复时使用）
   */
  private resubscribeAll() {
    if (!this.isConnected || !this.stompClient) {
      return;
    }

    // 清除旧的STOMP订阅对象
    this.stompSubscriptions.clear();

    // 为所有活跃的destination重新创建STOMP订阅
    this.subscriptions.forEach((callbacks, destination) => {
      if (callbacks.size > 0) {
        this.createStompSubscription(destination);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.stompClient && this.isConnected) {
      this.stompSubscriptions.forEach(sub => sub.unsubscribe());
      this.stompSubscriptions.clear();
      this.subscriptions.clear();

      this.stompClient.disconnect(() => {
        console.log("👋 全局 STOMP 已断开");
        this.isConnected = false;
      });
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// 导出单例实例
export const globalStompClient = GlobalStompClient.getInstance();