// src/hooks/useStompClient.ts
import { ref, onUnmounted } from "vue";
import SockJS from "sockjs-client";
import Stomp from "stompjs";

// 从 .env 中获取服务地址
const serviceUrl = import.meta.env.VITE_APP_API_URL;

/**
 * 封装 STOMP 客户端，用于前端连接 Spring WebSocket 后端，接收消息
 * @param wsUrl WebSocket 连接地址（默认：http://localhost:8080/ws）
 * @param options 可选配置，如断开回调 onDisconnect
 */
export function useStompClient(
  wsUrl: string = `${serviceUrl}/ws`,
  options?: {
    /** WebSocket 断开连接时调用（可用于 UI 提示） */
    onDisconnect?: () => void;
  }
) {
  // STOMP 客户端实例
  const stompClient = ref<Stomp.Client | null>(null);

  // 是否连接成功标志
  const isConnected = ref(false);

  // 存储已订阅的地址及其对应的订阅对象
  const subscriptions = new Map<string, Stomp.Subscription>();

  /**
   * 建立 WebSocket + STOMP 连接
   */
  const connect = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = new SockJS(wsUrl);
      const client = Stomp.over(socket);

      client.heartbeat.outgoing = 10000;
      client.heartbeat.incoming = 10000;
      client.debug = () => {}; // 关闭调试输出

      stompClient.value = client;

      // ✅ 监听连接断开事件，调用外部回调
      socket.onclose = () => {
        isConnected.value = false;
        console.warn("⚠️ WebSocket 已断开");
        options?.onDisconnect?.();
      };

      client.connect(
        {}, // 连接头部参数，可为空
        () => {
          isConnected.value = true;
          console.log("✅ STOMP 已连接");
          resolve();
        },
        (err) => {
          isConnected.value = false;
          console.error("❌ STOMP 连接失败", err);
          options?.onDisconnect?.();
          reject(err);
        }
      );
    });
  };

  /**
   * 订阅某个消息主题（destination）
   * @param destination 订阅地址，如 "/topic/room/123456"
   * @param callback 收到消息时的处理函数
   */
  const subscribe = (destination: string, callback: (data: any) => void) => {
    if (!stompClient.value || !isConnected.value) {
      console.warn("⚠️ STOMP 尚未连接，不能订阅");
      return;
    }

    // 如果已订阅过该地址，先取消旧订阅
    if (subscriptions.has(destination)) {
      subscriptions.get(destination)?.unsubscribe();
    }

    // 新建订阅
    const sub = stompClient.value.subscribe(destination, (message) => {
      const body = JSON.parse(message.body);
      callback(body);
    });

    subscriptions.set(destination, sub);
  };

  /**
   * 主动断开连接，并清理订阅
   */
  const disconnect = () => {
    if (stompClient.value && isConnected.value) {
      subscriptions.forEach((sub) => sub.unsubscribe());
      subscriptions.clear();

      stompClient.value.disconnect(() => {
        console.log("👋 STOMP 已断开");
        isConnected.value = false;
      });
    }
  };

  /**
   * 页面卸载时自动断开连接
   */
  onUnmounted(() => {
    disconnect();
  });

  return {
    connect, // 手动建立连接
    subscribe, // 订阅消息
    disconnect, // 主动断开
    isConnected, // 连接状态，响应式
  };
}
