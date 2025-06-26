import request from "@/utils/request";
import { UnwrapRef } from "vue";

import.meta.env;

const PLATFORM_BASE_URL = import.meta.env.VITE_APP_API_URL + "/admin/platform/";
class platformApi {
  /**
   * 保存平台用户
   *
   * @param params 用户
   */
  static savePlatformUser(data: any) {
    return request<any, PageResult<boolean[]>>({
      url: `${PLATFORM_BASE_URL}/save-platform-user`,
      method: "post",
      data: data,
    });
  }
  /**
   * 获取平台用户分页列表
   *
   * @param query 搜索条件，包含分页信息和过滤字段
   */
  static listPlatformUserPage(query: any) {
    return request<any, PageResult<any>>({
      url: `${PLATFORM_BASE_URL}/list-platform-user-page`,
      method: "post",
      data: query,
    });
  }

  /**
   * 删除平台用户
   *
   * @param id 用户ID
   */
  static deletePlatformUser(idList: string) {
    return request<any, any>({
      url: `${PLATFORM_BASE_URL}/delete-platform-user?idList=${idList}`,
      method: "delete",
    });
  }
  static uploadStorageFile(file: File, id: string) {
    const formData = new FormData();
    formData.append("file", file);

    return request<any, any>({
      url: `${PLATFORM_BASE_URL}/upload/storage/file/${id}`,
      method: "post",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }
}
export default platformApi;
