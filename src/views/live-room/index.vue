<!--
  直播间控制台主页面
  功能：整合各个子组件，提供直播间监控、AI弹幕管理、录制等完整功能
-->
<template>
  <div class="app-container live-monitor" v-loading="loading">
    <!-- 直播间控制区 + 状态展示区 -->
    <el-card shadow="never">
      <el-row :gutter="20" align="top">
        <!-- 左侧：直播控制和统计 -->
        <el-col :span="8">
          <!-- 房间控制组件 -->
          <RoomControl
            v-model:room-input="roomInput"
            :is-room-loaded="isRoomLoaded"
            :is-monitoring="isMonitoring"
            :loading="loading"
            @load-room="loadRoom"
            @modify-room="modifyRoom"
            @start-monitor="startMonitor"
            @stop-monitor="stopMonitor"
          />

          <!-- 直播统计面板组件 -->
          <LiveStatsPanel
            :room-status="roomStatus"
            :danmaku-count="danmakus.length"
            :stream-urls="streamUrls"
            :is-recording-map="isRecordingMap"
          />
        </el-col>

        <!-- 右侧：直播信息展示 -->
        <el-col :span="16">
          <LiveInfoPanel
            :room-title="roomTitle"
            :room-status="roomStatus"
            :stream-urls="streamUrls"
            v-model:selected-quality="selectedQuality"
            v-model:show-preview="showPreview"
            :is-recording-map="isRecordingMap"
            :recording-duration-map="recordingDurationMap"
            @quality-change="onQualityChange"
            @preview-toggle="onPreviewToggle"
            @start-record="startRecord"
            @stop-record="stopRecord"
            @copy-stream-url="copyStreamUrl"
            @video-refresh="refreshVideo"
          />
        </el-col>
      </el-row>
    </el-card>

    <!-- AI弹幕管理区域 -->
    <AiDanmuManager
      v-model:collapsed="aiDanmuCollapsed"
      :is-room-loaded="isRoomLoaded"
      :platform-users="platformUsers"
      :ai-status-map="aiStatusMap"
      :starting-users="startingUsers"
      :stopping-users="stoppingUsers"
      @batch-start="batchStartAiDanmu"
      @batch-stop="batchStopAiDanmu"
      @start-single="startSingleAiDanmu"
      @stop-single="stopSingleAiDanmu"
      @update-config="updateAiConfig"
      @select-user="selectUser"
    />

    <!-- 实时弹幕展示区 -->
    <DanmakuDisplay
      v-model:collapsed="danmakuCollapsed"
      v-model:max-lines="maxDanmakuLines"
      v-model:input-text="myDanmaku"
      :danmakus="danmakus"
      :sending="loading"
      @clear-danmakus="clearDanmakus"
      @send-danmaku="sendMyDanmaku"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import douyinApi from "@/api/douyin";
import platformApi from "@/api/platform";
import AiDanmuApi, {
  type AiDanmuConfig,
  type AiDanmuStatus,
} from "@/api/ai-danmu";
import { useStompClient } from "@/api/useStompClient";
import { useLeaveConfirm } from "@/utils/useLeaveConfirm";
import RoomControl from "./components/RoomControl.vue";
import LiveStatsPanel from "./components/LiveStatsPanel.vue";
import LiveInfoPanel from "./components/LiveInfoPanel.vue";
import AiDanmuManager from "./components/AiDanmuManager.vue";
import DanmakuDisplay from "./components/DanmakuDisplay.vue";

// ========== 基础状态管理 ==========
const loading = ref(false);
const roomInput = ref("");
const roomDescription = ref("");
const isRoomLoaded = ref(false);
const isMonitoring = ref(false);
const roomTitle = ref("");
const roomStatus = ref("");

// ========== 流媒体和录制状态 ==========
const streamUrls = ref<Record<string, string>>({});
const isRecordingMap = ref<Record<string, boolean>>({});
const recordingStartTimeMap = ref<Record<string, number>>({});
const recordingDurationMap = ref<Record<string, string>>({});
const selectedQuality = ref("");

// ========== 弹幕相关状态 ==========
const danmakus = ref<{ id: number; user: string; content: string }[]>([]);
const myDanmaku = ref("");
const maxDanmakuLines = ref(50);
let idCounter = 0;

// ========== 视频预览相关状态 ==========
const showPreview = ref(false);

// ========== UI折叠状态 ==========
const aiDanmuCollapsed = ref(false);
const danmakuCollapsed = ref(false);

// ========== AI弹幕管理相关状态 ==========
const platformUsers = ref<any[]>([]);
const aiStatusMap = ref<Record<number, AiDanmuStatus>>({});
const startingUsers = ref<number[]>([]);
const stoppingUsers = ref<number[]>([]);

// ========== 定时器管理 ==========
let statusPollingTimer: number | null = null;
let recordingTimerInterval: number | null = null;

// ========== WebSocket连接 ==========
const serviceUrl = import.meta.env.VITE_APP_API_URL;
const { connect, subscribe, disconnect } = useStompClient(`${serviceUrl}/ws`, {
  onDisconnect: () => (isMonitoring.value = false),
});

// ========== 弹幕相关方法 ==========

/**
 * 清空弹幕列表
 */
const clearDanmakus = () => {
  danmakus.value = [];
};

/**
 * 发送我的弹幕
 */
function sendMyDanmaku() {
  loading.value = true;
  try {
    const content = myDanmaku.value.trim();
    if (!content) return;
    douyinApi.sendMsg(roomInput.value, "", content);
    addDanmaku("我自己", content);
    myDanmaku.value = "";
  } catch (error) {
    ElMessage.error("发送弹幕失败");
  } finally {
    loading.value = false;
  }
}

/**
 * 添加弹幕到列表
 */
function addDanmaku(user: string, content: string) {
  const id = idCounter++;
  danmakus.value.push({ id, user, content });

  // 限制弹幕数量，保留最新的弹幕，旧弹幕会被新弹幕挤掉
  if (danmakus.value.length > maxDanmakuLines.value) {
    danmakus.value.splice(0, danmakus.value.length - maxDanmakuLines.value);
  }
}

// ========== 直播间相关方法 ==========

/**
 * 加载直播间信息
 */
const loadRoom = async () => {
  loading.value = true;
  const roomId = roomInput.value.trim();
  if (!roomId) {
    ElMessage.warning("请输入直播间地址或ID");
    loading.value = false;
    return;
  }

  try {
    const res = await douyinApi.queryRoom(roomId);
    roomTitle.value = res.roomTitle;
    // 使用 roomLiveStatus 字段，这个字段更准确
    roomStatus.value = res.roomLiveStatus || res.roomStatus;

    // 解析流地址
    const hls = res.roomInfoJsonNode.web_stream_url.hls_pull_url_map;
    streamUrls.value = {
      FULL_HD1: hls.FULL_HD1,
      HD1: hls.HD1,
      SD1: hls.SD1,
      SD2: hls.SD2,
    };

    // 初始化录制状态
    isRecordingMap.value = Object.keys(streamUrls.value).reduce(
      (acc, key) => {
        acc[key] = false;
        return acc;
      },
      {} as Record<string, boolean>
    );
    recordingStartTimeMap.value = {};
    recordingDurationMap.value = {};

    isRoomLoaded.value = true;
    ElMessage.success("直播间加载成功");
  } catch (err) {
    ElMessage.error("加载失败");
  } finally {
    loading.value = false;
  }
};

/**
 * 修改直播间 - 重置所有状态
 */
const modifyRoom = async () => {
  console.log("🔄 修改直播间 - 重置所有状态");

  // 停止监听
  if (isMonitoring.value) stopMonitor();

  // 重置直播间状态
  isRoomLoaded.value = false;
  roomTitle.value = "";
  roomStatus.value = "";
  roomDescription.value = "";

  // 清空流地址和录制状态
  streamUrls.value = {};
  isRecordingMap.value = {};
  recordingStartTimeMap.value = {};
  recordingDurationMap.value = {};
  selectedQuality.value = "";

  // 重置视频预览状态
  showPreview.value = false;

  // 清空弹幕
  clearDanmakus();

  console.log("✅ 直播间状态已重置");
  ElMessage.info("直播间修改已启用，请重新输入直播间地址");
};

/**
 * 开始监听弹幕
 */
const startMonitor = async () => {
  if (!isRoomLoaded.value) return;
  loading.value = true;
  try {
    await connect();
    subscribe(`/topic/room/${roomInput.value.trim()}`, (msg) => {
      if (msg?.nickname && msg?.content) {
        addDanmaku(msg.nickname, msg.content);
      }
    });
    await douyinApi.connectRoom(roomInput.value.trim());
    isMonitoring.value = true;
    ElMessage.success("开始监听弹幕");
  } catch (err) {
    ElMessage.error("监听失败");
  } finally {
    loading.value = false;
  }
};

/**
 * 停止监听弹幕
 */
const stopMonitor = () => {
  if (!isMonitoring.value) return;
  douyinApi.disconnectRoom(roomInput.value.trim());
  disconnect();
  isMonitoring.value = false;
  ElMessage.info("已停止监听弹幕");
};

// ========== 录制相关方法 ==========

/**
 * 开始录制
 */
const startRecord = async (quality: string) => {
  const roomId = roomInput.value;
  const url = streamUrls.value[quality];
  if (!url) return;

  loading.value = true;
  try {
    await douyinApi.liveRecord(roomId, url, quality);
    isRecordingMap.value[quality] = true;
    recordingStartTimeMap.value[quality] = Date.now();
    recordingDurationMap.value[quality] = "00:00:00";
    startRecordingTimer();
    ElMessage.success(`${quality} 开始录制`);
  } catch (e) {
    ElMessage.error(`${quality} 录制失败`);
  } finally {
    loading.value = false;
  }
};

/**
 * 停止录制
 */
const stopRecord = async (quality: string) => {
  const roomId = roomInput.value;
  const url = streamUrls.value[quality];
  if (!url) return;

  loading.value = true;
  try {
    await douyinApi.stopLiveRecord(roomId, url, quality);
    const res = await douyinApi.downloadRecording(roomId, url, quality);

    // 下载文件
    const blob = new Blob([res.data], { type: "video/mp4" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${roomId}_${quality}_${Date.now()}.mp4`;
    a.click();
    a.remove();

    // 更新状态
    isRecordingMap.value[quality] = false;
    delete recordingStartTimeMap.value[quality];
    delete recordingDurationMap.value[quality];

    // 检查是否需要停止定时器
    const hasRecording = Object.values(isRecordingMap.value).some(
      (recording) => recording
    );
    if (!hasRecording) {
      stopRecordingTimer();
    }

    ElMessage.success(`${quality} 已下载`);
  } catch (e) {
    ElMessage.error(`${quality} 停止失败`);
  } finally {
    loading.value = false;
  }
};

/**
 * 复制流地址
 */
const copyStreamUrl = () => {
  const url = streamUrls.value[selectedQuality.value];
  if (!url) {
    ElMessage.warning("请选择清晰度");
    return;
  }
  navigator.clipboard
    .writeText(url)
    .then(() => ElMessage.success("已复制"))
    .catch(() => ElMessage.error("复制失败"));
};

// ========== 视频预览相关方法 ==========

/**
 * 质量选择变化处理
 */
const onQualityChange = () => {
  console.log("🎯 清晰度改变:", selectedQuality.value);

  // 自动开启预览
  if (!showPreview.value) {
    console.log("🔄 自动开启视频预览");
    showPreview.value = true;
  }
};

/**
 * 预览开关切换处理
 */
const onPreviewToggle = (value: boolean) => {
  console.log("📺 预览开关切换:", value);
};

/**
 * 刷新视频
 */
const refreshVideo = () => {
  console.log("🔄 刷新视频");
};

// ========== 录制时间管理 ==========

/**
 * 格式化录制时间
 */
const formatRecordingTime = (startTime: number): string => {
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * 更新录制时间
 */
const updateRecordingTimes = () => {
  Object.keys(recordingStartTimeMap.value).forEach((quality) => {
    if (isRecordingMap.value[quality]) {
      recordingDurationMap.value[quality] = formatRecordingTime(
        recordingStartTimeMap.value[quality]
      );
    }
  });
};

/**
 * 开始录制时间更新定时器
 */
const startRecordingTimer = () => {
  if (recordingTimerInterval) return;
  recordingTimerInterval = window.setInterval(updateRecordingTimes, 1000);
};

/**
 * 停止录制时间更新定时器
 */
const stopRecordingTimer = () => {
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
};

// ========== AI弹幕管理相关方法 ==========

/**
 * 获取用户列表
 */
const loadPlatformUsers = async () => {
  try {
    const res = await platformApi.listPlatformUserPage({
      pageNum: 1,
      pageSize: 100,
      keywords: "",
    });
    platformUsers.value = res.records || [];

    // 初始化状态map
    platformUsers.value.forEach((user) => {
      if (!aiStatusMap.value[user.id]) {
        aiStatusMap.value[user.id] = {
          userId: user.id,
          enabled: false,
          sentCount: 0,
          lastSentTime: "",
          lastSentContent: "",
          runDuration: "",
        };
      }
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    ElMessage.error("获取用户列表失败");
  }
};

/**
 * 选择用户
 */
const selectUser = (userId: number) => {
  console.log("👤 选择用户:", userId);
  // 获取该用户的最新状态
  refreshUserStatus(userId);
};

/**
 * 启动单个用户AI弹幕
 */
const startSingleAiDanmu = async (userId: number) => {
  if (!isRoomLoaded.value) return;

  try {
    startingUsers.value.push(userId);

    const roomId = extractRoomId(roomInput.value);
    if (!roomId) {
      ElMessage.error("请先加载有效的直播间");
      return;
    }

    await AiDanmuApi.startAiDanmu({
      userId: userId,
      roomId: parseInt(roomId),
      roomDescription: roomDescription.value,
      randomSeconds: 3,
      aiPersonality: "专业销售顾问",
    });

    ElMessage.success("AI弹幕启动成功");
    refreshUserStatus(userId);
  } catch (error: any) {
    console.error("启动AI弹幕失败:", error);
    ElMessage.error(error.message || "启动AI弹幕失败");
  } finally {
    startingUsers.value = startingUsers.value.filter((id) => id !== userId);
  }
};

/**
 * 停止单个用户AI弹幕
 */
const stopSingleAiDanmu = async (userId: number) => {
  try {
    stoppingUsers.value.push(userId);
    await AiDanmuApi.stopAiDanmu(userId);
    ElMessage.success("AI弹幕已停止");
    refreshUserStatus(userId);
  } catch (error: any) {
    console.error("停止AI弹幕失败:", error);
    ElMessage.error(error.message || "停止AI弹幕失败");
  } finally {
    stoppingUsers.value = stoppingUsers.value.filter((id) => id !== userId);
  }
};

/**
 * 批量启动AI弹幕
 */
const batchStartAiDanmu = async (userIds: number[]) => {
  if (userIds.length === 0 || !isRoomLoaded.value) return;

  try {
    await ElMessageBox.confirm(
      `确定要为 ${userIds.length} 个用户启动AI弹幕吗？`,
      "批量启动确认",
      { type: "warning" }
    );

    const roomId = extractRoomId(roomInput.value);
    if (!roomId) {
      ElMessage.error("请先加载有效的直播间");
      return;
    }

    await AiDanmuApi.batchStart({
      userIds: userIds,
      roomId: parseInt(roomId),
      roomDescription: roomDescription.value,
      randomSeconds: 3,
      aiPersonality: "专业销售顾问",
    });

    ElMessage.success(`成功为 ${userIds.length} 个用户启动AI弹幕`);
    refreshAllStatus();
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("批量启动AI弹幕失败:", error);
      ElMessage.error(error.message || "批量启动AI弹幕失败");
    }
  }
};

/**
 * 批量停止AI弹幕
 */
const batchStopAiDanmu = async (userIds: number[]) => {
  if (userIds.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要为 ${userIds.length} 个用户停止AI弹幕吗？`,
      "批量停止确认",
      { type: "warning" }
    );

    await AiDanmuApi.batchStop({ userIds: userIds });
    ElMessage.success(`成功为 ${userIds.length} 个用户停止AI弹幕`);
    refreshAllStatus();
  } catch (error: any) {
    if (error !== "cancel") {
      console.error("批量停止AI弹幕失败:", error);
      ElMessage.error(error.message || "批量停止AI弹幕失败");
    }
  }
};

/**
 * 更新AI配置
 */
const updateAiConfig = async (config: Partial<AiDanmuConfig>) => {
  try {
    await AiDanmuApi.updateConfig(config);
    ElMessage.success("配置已更新");
  } catch (error: any) {
    console.error("更新配置失败:", error);
    ElMessage.error(error.message || "更新配置失败");
  }
};

/**
 * 刷新单个用户状态
 */
const refreshUserStatus = async (userId: number) => {
  try {
    const status = await AiDanmuApi.getUserStatus(userId);
    aiStatusMap.value[userId] = status;
  } catch (error) {
    console.error(`获取用户${userId}状态失败:`, error);
  }
};

/**
 * 刷新所有用户状态
 */
const refreshAllStatus = async () => {
  if (platformUsers.value.length === 0) return;

  try {
    const userIds = platformUsers.value.map((user) => user.id);
    const statusList = await AiDanmuApi.getBatchStatus(userIds);

    statusList.forEach((status) => {
      aiStatusMap.value[status.userId] = status;
    });
  } catch (error) {
    console.error("批量获取状态失败:", error);
  }
};

/**
 * 从直播间链接提取房间ID
 */
const extractRoomId = (input: string): string | null => {
  if (!input) return null;

  // 如果是纯数字，直接返回
  if (/^\d+$/.test(input)) {
    return input;
  }

  // 从抖音链接中提取房间ID
  const match = input.match(/live\.douyin\.com\/(\d+)/);
  return match ? match[1] : null;
};

/**
 * 开始状态轮询
 */
const startStatusPolling = () => {
  if (statusPollingTimer) return;

  statusPollingTimer = window.setInterval(() => {
    refreshAllStatus();
  }, 5000); // 每5秒轮询一次
};

/**
 * 停止状态轮询
 */
const stopStatusPolling = () => {
  if (statusPollingTimer) {
    clearInterval(statusPollingTimer);
    statusPollingTimer = null;
  }
};

// ========== 生命周期钩子 ==========

// 组件挂载时初始化
onMounted(() => {
  loadPlatformUsers();
  startStatusPolling();
});

// 组件卸载时清理
onUnmounted(() => {
  stopStatusPolling();
  stopRecordingTimer();
});

// ========== 离开确认 ==========
useLeaveConfirm({
  isMonitoring,
  isRecording: ref(false),
  stopMonitor,
  message: "检测到您正在监听，确定要离开吗？",
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}

.live-monitor {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
