import request from "@/utils/request";

export interface MultiLiveRoomDto {
  roomId?: string;
  userId?: number;
  roomInput: string;
  displayName?: string;
  roomTitle?: string;
  roomStatus?: string;
  isLoaded?: boolean;
  isMonitoring?: boolean;
  unreadCount?: number;
  streamUrls?: Record<string, string>;
  recordingStatus?: Record<string, boolean>;
  aiDanmuEnabled?: boolean;
  createTime?: string;
  lastActiveTime?: string;
  sortOrder?: number;
  remark?: string;
}

export interface MultiLiveRoomQuery {
  userId?: number;
  keyword?: string;
  isMonitoring?: boolean;
  isLoaded?: boolean;
  sortBy?: string;
  sortDirection?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface BatchOperationParam {
  roomIds: string[];
  userId?: number;
  operationType?: string;
}

class MultiLiveRoomApi {
  /**
   * 获取用户的直播间列表
   */
  static getRoomList(query: MultiLiveRoomQuery = {}) {
    return request<MultiLiveRoomDto[]>({
      url: "/multi-live-rooms/list",
      method: "get",
      params: query,
    });
  }

  /**
   * 添加直播间
   */
  static addRoom(roomDto: MultiLiveRoomDto) {
    return request<MultiLiveRoomDto>({
      url: "/multi-live-rooms/add",
      method: "post",
      data: roomDto,
    });
  }

  /**
   * 更新直播间信息
   */
  static updateRoom(roomId: string, roomDto: Partial<MultiLiveRoomDto>) {
    return request<MultiLiveRoomDto>({
      url: `/multi-live-rooms/${roomId}`,
      method: "put",
      data: roomDto,
    });
  }

  /**
   * 删除直播间
   */
  static deleteRoom(roomId: string) {
    return request<void>({
      url: `/multi-live-rooms/${roomId}`,
      method: "delete",
    });
  }

  /**
   * 获取直播间详细信息
   */
  static getRoomDetail(roomId: string) {
    return request<MultiLiveRoomDto>({
      url: `/multi-live-rooms/${roomId}`,
      method: "get",
    });
  }

  /**
   * 批量开启监听
   */
  static batchStartMonitor(param: BatchOperationParam) {
    return request<void>({
      url: "/multi-live-rooms/batch-start-monitor",
      method: "post",
      data: param,
    });
  }

  /**
   * 批量停止监听
   */
  static batchStopMonitor(param: BatchOperationParam) {
    return request<void>({
      url: "/multi-live-rooms/batch-stop-monitor",
      method: "post",
      data: param,
    });
  }

  /**
   * 获取房间监听状态
   */
  static getMonitorStatus(roomIds: string[]) {
    return request<MultiLiveRoomDto[]>({
      url: "/multi-live-rooms/monitor-status",
      method: "get",
      params: { roomIds },
    });
  }

  /**
   * 更新房间最后活跃时间
   */
  static updateActiveTime(roomId: string) {
    return request<void>({
      url: `/multi-live-rooms/${roomId}/update-active-time`,
      method: "post",
    });
  }

  /**
   * 清理不活跃的房间
   */
  static cleanupInactiveRooms() {
    return request<number>({
      url: "/multi-live-rooms/cleanup-inactive",
      method: "delete",
    });
  }
}

export default MultiLiveRoomApi;