import request from "@/utils/request";

const JOB_CONFIG_BASE_URL =
  import.meta.env.VITE_APP_API_URL + "/admin/job-config/";

export interface JobConfig {
  id?: number;
  title?: string;
  platformCode?: string;
  jobType?: string;
  params?: string;
  cron?: string;
  status?: number;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

class JobConfigApi {
  /** 不分页获取所有任务 */
  static listAll() {
    return request<any, JobConfig[]>({
      url: `${JOB_CONFIG_BASE_URL}list`,
      method: "get",
    });
  }

  /** 根据ID获取任务详情 */
  static getJobConfigById(id: number) {
    return request<any, JobConfig>({
      url: `${JOB_CONFIG_BASE_URL}${id}`,
      method: "get",
    });
  }

  /** 新建任务 */
  static saveJobConfig(data: JobConfig) {
    return request<any, boolean>({
      url: `${JOB_CONFIG_BASE_URL}`,
      method: "post",
      data,
    });
  }

  /** 更新任务 */
  static update(id: number, data: any) {
    return request<any, boolean>({
      url: `${JOB_CONFIG_BASE_URL}${id}`,
      method: "put",
      data,
    });
  }

  /** 删除任务 */
  static deleteJobConfig(id: number) {
    return request<any, boolean>({
      url: `${JOB_CONFIG_BASE_URL}${id}`,
      method: "delete",
    });
  }

  /**
   * 分页查询任务列表
   * @param params { pageNum, pageSize, title, platformCode, jobType }
   */
  static listJobConfigPage(params: {
    pageNum?: number;
    pageSize?: number;
    title?: string;
    platformCode?: string;
    jobType?: string;
  }) {
    return request<any, PageResult<JobConfig>>({
      url: `${JOB_CONFIG_BASE_URL}`,
      method: "get",
      params,
    });
  }
}

export default JobConfigApi;
