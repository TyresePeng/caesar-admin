<!--
  单个直播间控制面板组件
  功能：封装单个直播间的所有功能，复用现有live-room组件
-->
<template>
  <div class="live-room-panel" v-loading="loading">
    <!-- 直播间控制区 + 状态展示区 -->
    <el-card shadow="never">
      <el-row :gutter="20" align="top">
        <!-- 左侧：直播控制和统计 -->
        <el-col :span="8">
          <!-- 房间控制组件 -->
          <RoomControl
            v-model:room-input="internalRoomData.roomInput"
            :is-room-loaded="internalRoomData.isLoaded"
            :is-monitoring="internalRoomData.isMonitoring"
            :loading="loading"
            :readonly="true"
            @load-room="loadRoom"
            @modify-room="modifyRoom"
            @start-monitor="startMonitor"
            @stop-monitor="stopMonitor"
          />

          <!-- 直播统计面板组件 -->
          <LiveStatsPanel
            :room-status="internalRoomData.roomStatus"
            :danmaku-count="internalRoomData.danmakus.length"
            :stream-urls="internalRoomData.streamUrls"
            :is-recording-map="internalRoomData.recordingStatus"
          />
        </el-col>

        <!-- 右侧：直播信息展示 -->
        <el-col :span="16">
          <LiveInfoPanel
            :room-title="internalRoomData.roomTitle"
            :room-status="internalRoomData.roomStatus"
            :stream-urls="internalRoomData.streamUrls"
            v-model:selected-quality="selectedQuality"
            v-model:show-preview="showPreview"
            :is-recording-map="internalRoomData.recordingStatus"
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
      :is-room-loaded="internalRoomData.isLoaded"
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
      :danmakus="internalRoomData.danmakus"
      :sending="loading"
      @clear-danmakus="clearDanmakus"
      @send-danmaku="sendMyDanmaku"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import douyinApi from "@/api/douyin";
import platformApi from "@/api/platform";
import AiDanmuApi, {
  type AiDanmuConfig,
  type AiDanmuStatus,
} from "@/api/ai-danmu";
import { useStompClient } from "@/api/useStompClient";
import RoomControl from "@/views/live-room/components/RoomControl.vue";
import LiveStatsPanel from "@/views/live-room/components/LiveStatsPanel.vue";
import LiveInfoPanel from "@/views/live-room/components/LiveInfoPanel.vue";
import AiDanmuManager from "@/views/live-room/components/AiDanmuManager.vue";
import DanmakuDisplay from "@/views/live-room/components/DanmakuDisplay.vue";

interface LiveRoomData {
  id: string;
  roomInput: string;
  displayName: string;
  roomTitle: string;
  roomStatus: string;
  isLoaded: boolean;
  isMonitoring: boolean;
  unreadCount: number;
  streamUrls: Record<string, string>;
  danmakus: Array<{ id: number; user: string; content: string }>;
  aiDanmuEnabled: boolean;
  recordingStatus: Record<string, boolean>;
  createTime: number;
  lastActiveTime: number;
}

const props = defineProps<{
  roomData: LiveRoomData;
}>();

const emit = defineEmits<{
  "room-updated": [roomId: string, data: Partial<LiveRoomData>];
  "monitoring-changed": [roomId: string, isMonitoring: boolean];
  "danmaku-received": [roomId: string, danmaku: { id: number; user: string; content: string }];
}>();

// ========== 内部状态管理 ==========
const loading = ref(false);
const internalRoomData = reactive({ ...props.roomData });

// ========== 流媒体和录制状态 ==========
const recordingStartTimeMap = ref<Record<string, number>>({});
const recordingDurationMap = ref<Record<string, string>>({});
const selectedQuality = ref("");

// ========== 弹幕相关状态 ==========
const myDanmaku = ref("");
const maxDanmakuLines = ref(50);
// 简单的弹幕去重缓存 - 存储最近的弹幕内容和时间
const recentDanmakus = new Map<string, number>(); // hash -> timestamp

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

// ========== WebSocket连接管理 ==========
const serviceUrl = import.meta.env.VITE_APP_API_URL;
const { connect, subscribe, disconnect } = useStompClient(`${serviceUrl}/ws`, {
  onDisconnect: () => {
    internalRoomData.isMonitoring = false;
    emit("monitoring-changed", props.roomData.id, false);
  },
});

// ========== 监听 props 变化 ==========
watch(() => props.roomData, (newData) => {
  Object.assign(internalRoomData, newData);
}, { deep: true });

// ========== 监听批量操作事件 ==========
const handleBatchOperation = (event: CustomEvent) => {
  const { action } = event.detail;
  if (action === 'start' && internalRoomData.isLoaded && !internalRoomData.isMonitoring) {
    startMonitor();
  } else if (action === 'stop' && internalRoomData.isMonitoring) {
    stopMonitor();
  }
};

// ========== 弹幕相关方法 ==========

/**
 * 清空弹幕列表
 */
const clearDanmakus = () => {
  internalRoomData.danmakus.splice(0);
  recentDanmakus.clear(); // 同时清空去重缓存
  // 清空弹幕不需要持久化保存
  // updateRoomData({ danmakus: [] });
};

/**
 * 发送我的弹幕
 */
function sendMyDanmaku() {
  loading.value = true;
  try {
    const content = myDanmaku.value.trim();
    if (!content) return;
    douyinApi.sendMsg(internalRoomData.roomInput, "", content);
    addDanmaku("我自己", content);
    myDanmaku.value = "";
  } catch (error) {
    ElMessage.error("发送弹幕失败");
  } finally {
    loading.value = false;
  }
}

/**
 * 检查弹幕是否重复
 */
function isDuplicateDanmaku(user: string, content: string): boolean {
  const now = Date.now();
  const hash = `${user.trim()}_${content.trim()}`;
  
  console.log(`🔍 检查重复弹幕: ${hash}, 缓存大小: ${recentDanmakus.size}`);
  
  // 检查是否在最近3秒内有相同的弹幕
  if (recentDanmakus.has(hash)) {
    const lastTime = recentDanmakus.get(hash)!;
    const timeDiff = now - lastTime;
    console.log(`⏰ 发现缓存弹幕，时间差: ${timeDiff}ms`);
    if (timeDiff < 3000) { // 3秒内的重复弹幕过滤
      console.log(`🚫 过滤3秒内重复弹幕: ${user} - ${content}`);
      return true;
    }
  }
  
  // 记录这条弹幕
  recentDanmakus.set(hash, now);
  console.log(`✅ 弹幕不重复，已记录: ${hash}`);
  
  // 清理超过30秒的老记录，防止内存无限增长
  if (recentDanmakus.size > 100) {
    const expireTime = now - 30000; // 30秒前
    let cleanedCount = 0;
    for (const [key, timestamp] of recentDanmakus.entries()) {
      if (timestamp < expireTime) {
        recentDanmakus.delete(key);
        cleanedCount++;
      }
    }
    console.log(`🧹 清理了 ${cleanedCount} 条过期弹幕缓存`);
  }
  
  return false;
}

/**
 * 添加弹幕到列表
 */
function addDanmaku(user: string, content: string) {
  console.log(`🎬 [房间${props.roomData.id}] addDanmaku 被调用: ${user} - ${content}`);
  
  // 简单去重检查
  if (isDuplicateDanmaku(user, content)) {
    console.log(`🚫 [房间${props.roomData.id}] 跳过重复弹幕: ${user} - ${content}`);
    return; // 跳过重复弹幕
  }
  
  console.log(`✅ [房间${props.roomData.id}] 添加新弹幕: ${user} - ${content}`);
  
  const timestamp = Date.now();
  
  // 生成全局唯一的ID（使用房间ID + 时间戳 + 随机数）
  const uniqueId = `${props.roomData.id}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  const id = parseInt(uniqueId.replace(/\D/g, '').substr(-10)) || timestamp;
  const danmaku = { id, user, content };
  
  internalRoomData.danmakus.push(danmaku);
  console.log(`📝 [房间${props.roomData.id}] 弹幕已添加到列表，当前总数: ${internalRoomData.danmakus.length}`);

  // 限制弹幕数量
  if (internalRoomData.danmakus.length > maxDanmakuLines.value) {
    const removed = internalRoomData.danmakus.shift(); // 移除最旧的弹幕
    console.log(`🗑️ [房间${props.roomData.id}] 移除旧弹幕:`, removed);
  }

  // 通知父组件收到新弹幕
  emit("danmaku-received", props.roomData.id, danmaku);
  console.log(`📢 [房间${props.roomData.id}] 已通知父组件弹幕接收事件`);
}

// ========== 直播间相关方法 ==========

/**
 * 加载直播间信息
 */
const loadRoom = async () => {
  loading.value = true;
  const roomId = internalRoomData.roomInput.trim();
  if (!roomId) {
    ElMessage.warning("请输入直播间地址或ID");
    loading.value = false;
    return;
  }

  try {
    const res = await douyinApi.queryRoom(roomId);
    
    // 更新房间信息
    const updatedData = {
      roomTitle: res.roomTitle,
      roomStatus: res.roomLiveStatus || res.roomStatus,
      streamUrls: {
        FULL_HD1: res.roomInfoJsonNode.web_stream_url.hls_pull_url_map.FULL_HD1,
        HD1: res.roomInfoJsonNode.web_stream_url.hls_pull_url_map.HD1,
        SD1: res.roomInfoJsonNode.web_stream_url.hls_pull_url_map.SD1,
        SD2: res.roomInfoJsonNode.web_stream_url.hls_pull_url_map.SD2,
      },
      isLoaded: true
    };

    Object.assign(internalRoomData, updatedData);

    // 初始化录制状态
    const recordingStatus = Object.keys(internalRoomData.streamUrls).reduce(
      (acc, key) => {
        acc[key] = false;
        return acc;
      },
      {} as Record<string, boolean>
    );
    
    internalRoomData.recordingStatus = recordingStatus;
    recordingStartTimeMap.value = {};
    recordingDurationMap.value = {};

    updateRoomData(updatedData);
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
  // 停止监听
  if (internalRoomData.isMonitoring) stopMonitor();

  // 重置状态
  const resetData = {
    isLoaded: false,
    roomTitle: "",
    roomStatus: "",
    streamUrls: {},
    recordingStatus: {},
    danmakus: []
  };

  Object.assign(internalRoomData, resetData);
  recordingStartTimeMap.value = {};
  recordingDurationMap.value = {};
  selectedQuality.value = "";
  showPreview.value = false;
  recentDanmakus.clear(); // 清理弹幕去重缓存

  updateRoomData(resetData);
  ElMessage.info("直播间修改已启用，请重新输入直播间地址");
};

/**
 * 开始监听弹幕
 */
const startMonitor = async () => {
  if (!internalRoomData.isLoaded) return;
  loading.value = true;
  try {
    await connect();
    subscribe(`/topic/room/${internalRoomData.roomInput.trim()}`, (msg) => {
      console.log(`🔥🔥🔥 [房间${props.roomData.id}] 收到WebSocket消息:`, msg);
      // 验证消息格式并添加弹幕
      if (msg?.nickname && msg?.content && 
          typeof msg.nickname === 'string' && 
          typeof msg.content === 'string' && 
          msg.content.trim() !== '') {
        console.log(`🎯 [房间${props.roomData.id}] 准备添加弹幕: ${msg.nickname} - ${msg.content}`);
        addDanmaku(msg.nickname.trim(), msg.content.trim());
      } else {
        console.warn(`❌ [房间${props.roomData.id}] 消息格式不正确:`, msg);
      }
    });
    await douyinApi.connectRoom(internalRoomData.roomInput.trim());
    internalRoomData.isMonitoring = true;
    emit("monitoring-changed", props.roomData.id, true);
    updateRoomData({ isMonitoring: true });
    ElMessage.success("开始监听弹幕");
  } catch (err) {
    console.error(`❌ [房间${props.roomData.id}] 监听失败:`, err);
    ElMessage.error("监听失败");
  } finally {
    loading.value = false;
  }
};

/**
 * 停止监听弹幕
 */
const stopMonitor = () => {
  if (!internalRoomData.isMonitoring) return;
  
  douyinApi.disconnectRoom(internalRoomData.roomInput.trim());
  disconnect();
  
  internalRoomData.isMonitoring = false;
  emit("monitoring-changed", props.roomData.id, false);
  updateRoomData({ isMonitoring: false });
  ElMessage.info("已停止监听弹幕");
};

// ========== 录制相关方法 ==========

/**
 * 开始录制
 */
const startRecord = async (quality: string) => {
  const roomId = internalRoomData.roomInput;
  const url = internalRoomData.streamUrls[quality];
  if (!url) return;

  loading.value = true;
  try {
    await douyinApi.liveRecord(roomId, url, quality);
    internalRoomData.recordingStatus[quality] = true;
    recordingStartTimeMap.value[quality] = Date.now();
    recordingDurationMap.value[quality] = "00:00:00";
    startRecordingTimer();
    updateRoomData({ recordingStatus: { ...internalRoomData.recordingStatus } });
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
  const roomId = internalRoomData.roomInput;
  const url = internalRoomData.streamUrls[quality];
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
    internalRoomData.recordingStatus[quality] = false;
    delete recordingStartTimeMap.value[quality];
    delete recordingDurationMap.value[quality];

    // 检查是否需要停止定时器
    const hasRecording = Object.values(internalRoomData.recordingStatus).some(
      (recording) => recording
    );
    if (!hasRecording) {
      stopRecordingTimer();
    }

    updateRoomData({ recordingStatus: { ...internalRoomData.recordingStatus } });
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
  const url = internalRoomData.streamUrls[selectedQuality.value];
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
  if (!showPreview.value) {
    showPreview.value = true;
  }
};

/**
 * 预览开关切换处理
 */
const onPreviewToggle = (value: boolean) => {
  // 处理预览切换
};

/**
 * 刷新视频
 */
const refreshVideo = () => {
  // 刷新视频逻辑
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
    if (internalRoomData.recordingStatus[quality]) {
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
  refreshUserStatus(userId);
};

/**
 * 启动单个用户AI弹幕
 */
const startSingleAiDanmu = async (userId: number) => {
  if (!internalRoomData.isLoaded) return;

  try {
    startingUsers.value.push(userId);

    const roomId = extractRoomId(internalRoomData.roomInput);
    if (!roomId) {
      ElMessage.error("请先加载有效的直播间");
      return;
    }

    await AiDanmuApi.startAiDanmu({
      userId: userId,
      roomId: parseInt(roomId),
      roomDescription: "",
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
  if (userIds.length === 0 || !internalRoomData.isLoaded) return;

  try {
    await ElMessageBox.confirm(
      `确定要为 ${userIds.length} 个用户启动AI弹幕吗？`,
      "批量启动确认",
      { type: "warning" }
    );

    const roomId = extractRoomId(internalRoomData.roomInput);
    if (!roomId) {
      ElMessage.error("请先加载有效的直播间");
      return;
    }

    await AiDanmuApi.batchStart({
      userIds: userIds,
      roomId: parseInt(roomId),
      roomDescription: "",
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

  if (/^\d+$/.test(input)) {
    return input;
  }

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
  }, 5000);
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

/**
 * 更新房间数据
 */
const updateRoomData = (data: Partial<LiveRoomData>) => {
  emit("room-updated", props.roomData.id, data);
};

// ========== 生命周期钩子 ==========

onMounted(() => {
  loadPlatformUsers();
  startStatusPolling();
  
  // 监听批量操作事件
  window.addEventListener('batchOperation', handleBatchOperation);
  
  // 如果房间已加载，自动加载房间信息
  if (internalRoomData.roomInput && !internalRoomData.isLoaded) {
    loadRoom();
  }
});

onUnmounted(() => {
  stopStatusPolling();
  stopRecordingTimer();
  
  // 移除批量操作事件监听
  window.removeEventListener('batchOperation', handleBatchOperation);
  
  // 如果正在监听，停止监听
  if (internalRoomData.isMonitoring) {
    stopMonitor();
  }
  
  // 清理弹幕去重缓存
  recentDanmakus.clear();
});
</script>

<style scoped>
.live-room-panel {
  padding: 0;
}

/* 紧凑布局 */
.live-room-panel :deep(.el-card) {
  margin-bottom: 16px;
}

.live-room-panel :deep(.el-card:last-child) {
  margin-bottom: 0;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .live-room-panel :deep(.el-col-8) {
    width: 100%;
    margin-bottom: 16px;
  }
  
  .live-room-panel :deep(.el-col-16) {
    width: 100%;
  }
}
</style>