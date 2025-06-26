import { ElLoading } from "element-plus";

let loadingInstance: ReturnType<typeof ElLoading.service> | null = null;

/**
 * 包裹异步函数，自动显示加载蒙层，执行完成后自动关闭
 * @param apiCall 异步接口调用函数，返回 Promise
 */
export async function callWithLoading<T>(
  apiCall: () => Promise<T>
): Promise<T | undefined> {
  if (loadingInstance) return; // 防止重复调用
  loadingInstance = ElLoading.service({
    lock: true,
    text: "加载中...",
    background: "rgba(0, 0, 0, 0.4)",
  });
  try {
    return await apiCall();
  } finally {
    loadingInstance.close();
    loadingInstance = null;
  }
}
