import request from "@/utils/request";
import { UnwrapRef } from "vue";

import.meta.env;

const PLATFORM_BASE_URL = import.meta.env.VITE_APP_API_URL + "/douyin/";

class douyinApi {
  /**
   * 获取房间信息
   * @param roomId 房间ID
   */
  static queryRoom(roomId: string) {
    return request<any, any>({
      url: `${PLATFORM_BASE_URL}/query-room?roomId=${roomId}`,
      method: "GET",
    });
  }

  /**
   * 连接房间
   * @param roomId 房间ID
   */
  static connectRoom(roomId: string) {
    return request<any, any>({
      url: `${PLATFORM_BASE_URL}/connect-room?roomId=${roomId}`,
      method: "GET",
    });
  }

  /**
   * 断开直播间
   * @param roomId 房间ID
   */
  static disconnectRoom(roomId: string) {
    return request<any, any>({
      url: `${PLATFORM_BASE_URL}/disconnect-room?roomId=${roomId}`,
      method: "GET",
    });
  }
  /**
   * 直播录制
   *
   * @param roomId 房间号
   */
  static liveRecord(roomId: string) {
    return request<any, any>({
      url: `${PLATFORM_BASE_URL}/live-record?roomId=${roomId}`,
      method: "GET",
    });
  }

  /**
   * 停止直播录制
   *
   * @param roomId 房间号
   */
  static stopLiveRecord(roomId: string) {
    return request<any, any>({
      url: `${PLATFORM_BASE_URL}/stop-live-record?roomId=${roomId}`,
      method: "GET",
    });
  }

  /**
   * 获取直播录制状态
   *
   * @param roomId 房间号
   */
  static liveRecordStatus(roomId: string) {
    return request<any, any>({
      url: `${PLATFORM_BASE_URL}/live-record-status?roomId=${roomId}`,
      method: "GET",
    });
  }

  /**
   * 直播录制文件下载接口
   *
   * @param roomId 房间号
   */
  static downloadRecording(roomId: string) {
    return request<any, any>({
      url: `${PLATFORM_BASE_URL}/record/download/${roomId}`,
      method: "GET",
      responseType: "blob",
    });
  }
}
export default douyinApi;
