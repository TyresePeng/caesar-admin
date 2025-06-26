<template>
  <div class="app-container live-monitor" v-loading="loading">
    <!-- 直播间控制区 -->
    <el-card shadow="never">
      <el-form
        label-width="100px"
        :inline="true"
        size="small"
        style="align-items: center"
      >
        <el-form-item
          label="直播间地址"
          style="display: flex; align-items: center"
        >
          <el-input
            v-model="roomInput"
            placeholder="请输入直播间链接或ID"
            style="width: 400px"
            :disabled="isRoomLoaded"
          />
          <el-button
            type="primary"
            @click="loadRoom"
            :disabled="isRoomLoaded"
            style="margin-left: 8px"
          >
            加载直播间
          </el-button>
          <el-button
            v-if="isRoomLoaded"
            type="warning"
            @click="modifyRoom"
            style="margin-left: 8px"
          >
            修改直播间
          </el-button>
        </el-form-item>
      </el-form>

      <el-form label-width="100px" style="margin-top: 10px" size="small">
        <el-form-item label="直播间描述">
          <el-input
            type="textarea"
            v-model="roomDescription"
            placeholder="请输入直播间描述，AI回复将参考此内容"
            :rows="3"
            style="width: 600px"
            maxlength="300"
            show-word-limit
            :disabled="isRoomLoaded"
          />
        </el-form-item>

        <!-- 控制按钮统一放最后一行 -->
        <el-form-item label="控制操作">
          <el-button
            type="success"
            @click="startMonitor"
            :disabled="!isRoomLoaded || isMonitoring"
          >
            开始监听弹幕
          </el-button>

          <el-button
            type="warning"
            @click="stopMonitor"
            :disabled="!isMonitoring"
          >
            停止监听弹幕
          </el-button>

          <el-button
            type="success"
            @click="startRecord"
            :disabled="!isRoomLoaded || isRecording"
          >
            <el-icon><VideoCameraFilled /></el-icon> 开始录制
          </el-button>

          <el-button type="danger" @click="stopRecord" :disabled="!isRecording">
            <el-icon><VideoPause /></el-icon> 停止录制
          </el-button>
        </el-form-item>
      </el-form>

      <el-tag v-if="recordingUrl" type="info" style="margin-top: 10px">
        录制完成：<a :href="recordingUrl" target="_blank">点击下载</a>
      </el-tag>
    </el-card>

    <!-- AI 弹幕回复配置区 -->
    <el-card class="mt-2" shadow="never">
      <template #header>AI 弹幕回复配置</template>
      <el-form label-width="120px" size="small">
        <el-form-item label="AI 回复开关">
          <el-switch v-model="aiReplyEnabled" />
        </el-form-item>

        <el-form-item label="回复模式">
          <el-radio-group v-model="replyMode">
            <el-radio :value="'single'">单一用户</el-radio>
            <el-radio :value="'roundrobin'">轮询用户池</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="replyMode === 'single'" label="选择用户">
          <el-select
            v-model="singleUser"
            placeholder="请选择单一回复用户"
            style="width: 200px"
          >
            <el-option
              v-for="user in userPool"
              :key="user"
              :label="user"
              :value="user"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="replyMode === 'roundrobin'" label="用户池选择">
          <el-checkbox-group v-model="selectedUsers">
            <el-checkbox v-for="user in userPool" :key="user" :label="user">{{
              user
            }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="屏蔽词管理">
          <el-input
            v-model="newBlockedWord"
            placeholder="输入屏蔽词，回车确认"
            @keyup.enter="addBlockedWord"
            clearable
            @clear="newBlockedWord = ''"
            style="width: 300px"
          />
          <div class="tag-list" style="margin-top: 6px; margin-left: 20px">
            <el-tag
              v-for="(word, index) in blockedWords"
              :key="word"
              closable
              @close="removeBlockedWord(index)"
              style="margin-right: 6px"
            >
              {{ word }}
            </el-tag>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 弹幕展示 -->
    <el-card class="mt-2" shadow="never">
      <template #header>实时弹幕展示</template>
      <div ref="danmakuContainer" class="danmaku-list-container">
        <div
          v-for="item in danmakus"
          :key="item.id"
          class="danmaku-item"
          :class="{ ai: item.user === '🤖AI' }"
        >
          <span class="user">{{ item.user }}：</span>
          <span class="content">{{ item.content }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from "vue";
import { ElMessage } from "element-plus";
import { VideoCameraFilled, VideoPause } from "@element-plus/icons-vue";
import { useStompClient } from "@/api/useStompClient";
import { useLeaveConfirm } from "@/utils/useLeaveConfirm";
import douyinApi from "@/api/douyin";
const loading = ref(false);
const roomInput = ref("");
const roomDescription = ref("");
const isRoomLoaded = ref(false);
const isMonitoring = ref(false);
const isRecording = ref(false);
const danmakus = ref<
  { id: number; user: string; content: string; track: number }[]
>([]);
const recordingUrl = ref("");
const aiReplyEnabled = ref(false);
const replyMode = ref<"single" | "roundrobin">("single");
const singleUser = ref("");
const userPool = ref(["AI用户A", "AI用户B", "AI用户C"]);
const selectedUsers = ref<string[]>([...userPool.value]);
const newBlockedWord = ref("");
const blockedWords = ref<string[]>([]);
const danmakuContainer = ref<HTMLElement | null>(null);

let roundRobinIndex = 0;
let idCounter = 0;

const serviceUrl = import.meta.env.VITE_APP_API_URL;
const { connect, subscribe, disconnect } = useStompClient(`${serviceUrl}/ws`, {
  onDisconnect: () => (isMonitoring.value = false),
});

const loadRoom = () => {
  if (!roomInput.value.trim()) {
    ElMessage.warning("请输入直播间地址或 ID");
    return;
  }
  isRoomLoaded.value = true;
  ElMessage.success("直播间加载成功");
};

const modifyRoom = async () => {
  loading.value = true;
  if (isRecording.value) {
    await stopRecord();
  }
  if (isMonitoring.value) {
    stopMonitor();
  }
  loading.value = false;
  isRoomLoaded.value = false;
  ElMessage.info("直播间修改已启用，请重新输入直播间地址");
};

const startMonitor = async () => {
  if (!isRoomLoaded.value) {
    ElMessage.warning("请先加载直播间");
    return;
  }
  if (isMonitoring.value) return;
  loading.value = true;
  try {
    await connect();
    subscribe(`/topic/room/${roomInput.value.trim()}`, (msgData) => {
      if (msgData?.nickname && msgData?.content) {
        addDanmaku(msgData.nickname, msgData.content);
      }
    });
    await douyinApi.connectRoom(roomInput.value.trim());
    isMonitoring.value = true;
    ElMessage.success("开始监听弹幕");
  } catch {
    ElMessage.error("监听失败");
  } finally {
    loading.value = false;
  }
};

const stopMonitor = () => {
  loading.value = true;
  if (!isMonitoring.value) return;
  douyinApi.disconnectRoom(roomInput.value.trim()).catch(() => {
    ElMessage.error("断开失败");
  });
  disconnect();
  isMonitoring.value = false;
  loading.value = false;
  ElMessage.info("停止监听弹幕");
};

const startRecord = async () => {
  loading.value = true;
  if (!isRoomLoaded.value) {
    ElMessage.warning("请先加载直播间");
    return;
  }
  if (isRecording.value) return;
  try {
    await douyinApi.liveRecord(roomInput.value.trim());
    isRecording.value = true;
    recordingUrl.value = "";
    ElMessage.success("开始录制");
  } catch {
    ElMessage.error("录制失败");
  } finally {
    loading.value = false;
  }
};

const stopRecord = async () => {
  if (!isRecording.value) {
    return ElMessage.info("录制未开始");
  }

  const roomId = roomInput.value.trim();
  try {
    loading.value = true;
    // 1. 停止录制（可以是 POST/GET，看你接口）
    await douyinApi.stopLiveRecord(roomId);

    // 2. 下载录制文件，注意 responseType 必须是 blob
    const res = await douyinApi.downloadRecording(roomId);
    // 3. 构建 Blob 并下载
    const blob = new Blob([res.data], { type: "video/mp4" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${roomId}_${Date.now()}.mp4`;
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    // 4. 状态变更
    isRecording.value = false;
    ElMessage.success("录制文件已下载");
  } catch (err) {
    console.error("停止录制失败", err);
    ElMessage.error("停止录制失败");
  } finally {
    loading.value = false;
  }
};

function addDanmaku(user: string, content: string) {
  if (blockedWords.value.some((word) => content.includes(word))) return;

  const id = idCounter++;
  danmakus.value.push({
    id,
    user,
    content,
    track: Math.floor(Math.random() * 5),
  });

  nextTick(() => {
    if (danmakuContainer.value) {
      danmakuContainer.value.scrollTop = danmakuContainer.value.scrollHeight;
    }
  });

  if (aiReplyEnabled.value && user !== "🤖AI") {
    const replyUser =
      replyMode.value === "single"
        ? singleUser.value || userPool.value[0]
        : selectedUsers.value[roundRobinIndex++ % selectedUsers.value.length] ||
          "🤖AI";

    callAIReply(content, roomDescription.value).then((reply) => {
      if (!reply) return;
      const aiId = idCounter++;
      danmakus.value.push({
        id: aiId,
        user: replyUser,
        content: reply,
        track: 0,
      });
      setTimeout(() => {
        danmakus.value = danmakus.value.filter((item) => item.id !== aiId);
      }, 5000);
    });
  }

  setTimeout(() => {
    danmakus.value = danmakus.value.filter((item) => item.id !== id);
  }, 5000);
}

const callAIReply = async (text: string, desc: string): Promise<string> => {
  await new Promise((r) => setTimeout(r, 500));
  return `AI回复：「${text}」收到啦～`;
};

function addBlockedWord() {
  const word = newBlockedWord.value.trim();
  if (word && !blockedWords.value.includes(word)) {
    blockedWords.value.push(word);
    newBlockedWord.value = "";
  }
}

function removeBlockedWord(index: number) {
  blockedWords.value.splice(index, 1);
}

useLeaveConfirm({
  isMonitoring,
  isRecording,
  stopMonitor,
  message: "检测到您正在录制，确定要离开吗？",
});

window.addEventListener("beforeunload", (event) => {
  if (isMonitoring.value || isRecording.value) {
    event.preventDefault();
    event.returnValue = "";
    stopMonitor();
  }
});

onBeforeUnmount(() => {
  stopMonitor();
});
</script>

<style scoped>
.mt-2 {
  margin-top: 20px;
}

.danmaku-list-container {
  height: 300px;
  padding: 6px 10px;
  overflow-y: auto;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  user-select: none;
  background: #000;
  border-radius: 8px;
}

.danmaku-item {
  padding: 2px 0;
  white-space: normal;
}

.danmaku-item.ai {
  font-style: italic;
  color: #0f9;
}

.user {
  color: #6cf;
}

.content {
  color: #eee;
}
</style>
