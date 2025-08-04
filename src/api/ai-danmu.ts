import request from "@/utils/request";

const AI_DANMU_BASE_URL = import.meta.env.VITE_APP_API_URL + "/ai-danmu";

// AI弹幕配置接口
export interface AiDanmuConfig {
  userId: number;
  roomId?: number;
  roomDescription: string;
  randomSeconds: number;
  aiPersonality: string;
}

// AI弹幕状态接口
export interface AiDanmuStatus {
  userId: number;
  enabled: boolean;
  sentCount: number;
  lastSentTime: string;
  lastSentContent: string;
  runDuration: string;
  errorMessage?: string;
}

// 启动AI弹幕请求
export interface StartAiDanmuRequest {
  userId: number;
  roomId: number;
  roomDescription: string;
  randomSeconds: number;
  aiPersonality: string;
}

// 更新配置请求
export interface UpdateConfigRequest {
  userId: number;
  roomDescription: string;
  randomSeconds: number;
  aiPersonality: string;
}

// 批量操作请求
export interface BatchRequest {
  userIds: number[];
  roomId: number;
  roomDescription: string;
  randomSeconds: number;
  aiPersonality: string;
}

// 批量停止请求
export interface BatchStopRequest {
  userIds: number[];
}

class AiDanmuApi {
  /**
   * 启动AI弹幕
   */
  static startAiDanmu(data: StartAiDanmuRequest) {
    return request<any, any>({
      url: `${AI_DANMU_BASE_URL}/start`,
      method: "post",
      data: data,
    });
  }

  /**
   * 停止AI弹幕
   */
  static stopAiDanmu(userId: number) {
    return request<any, any>({
      url: `${AI_DANMU_BASE_URL}/stop`,
      method: "post",
      data: { userId },
    });
  }

  /**
   * 更新AI弹幕配置（立即生效）
   */
  static updateConfig(data: UpdateConfigRequest) {
    return request<any, any>({
      url: `${AI_DANMU_BASE_URL}/config`,
      method: "put",
      data: data,
    });
  }

  /**
   * 获取用户AI弹幕状态
   */
  static getUserStatus(userId: number) {
    return request<any, any>({
      url: `${AI_DANMU_BASE_URL}/status/${userId}`,
      method: "get",
    });
  }

  /**
   * 获取所有用户状态
   */
  static getAllStatus() {
    return request<any, any[]>({
      url: `${AI_DANMU_BASE_URL}/status/all`,
      method: "get",
    });
  }

  /**
   * 批量获取用户状态（通过获取所有状态然后过滤）
   */
  static async getBatchStatus(userIds: number[]): Promise<any[]> {
    const allStatus = await this.getAllStatus();
    return allStatus.filter((status: any) => userIds.includes(status.userId));
  }

  /**
   * 批量启动AI弹幕
   */
  static batchStart(data: BatchRequest) {
    return request<any, any>({
      url: `${AI_DANMU_BASE_URL}/batch/start`,
      method: "post",
      data: data,
    });
  }

  /**
   * 批量停止AI弹幕
   */
  static batchStop(data: BatchStopRequest) {
    return request<any, any>({
      url: `${AI_DANMU_BASE_URL}/batch/stop`,
      method: "post",
      data: data,
    });
  }

  /**
   * 获取统计数据
   */
  static getStatistics() {
    return request<any, any>({
      url: `${AI_DANMU_BASE_URL}/statistics`,
      method: "get",
    });
  }

  /**
   * 健康检查
   */
  static healthCheck() {
    return request<any, any>({
      url: `${AI_DANMU_BASE_URL}/health`,
      method: "get",
    });
  }
}

export default AiDanmuApi;
