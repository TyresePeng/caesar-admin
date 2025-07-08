<!-- LiveDanmakuPanel.vue -->
<template>
  <div class="app-container live-monitor" v-loading="loading">
    <!-- 直播间控制区 + 状态展示区 -->
    <el-card shadow="never">
      <el-row :gutter="20" align="top">
        <!-- 左侧：直播控制 -->
        <el-col :span="16">
          <el-form label-width="100px" :inline="true" size="small">
            <el-form-item label="直播间地址">
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
                >加载直播间</el-button
              >
              <el-button
                v-if="isRoomLoaded"
                type="warning"
                @click="modifyRoom"
                style="margin-left: 8px"
                >修改直播间</el-button
              >
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

            <el-form-item label="控制操作">
              <el-button
                type="success"
                @click="startMonitor"
                :disabled="!isRoomLoaded || isMonitoring"
                >开始监听弹幕</el-button
              >
              <el-button
                type="warning"
                @click="stopMonitor"
                :disabled="!isMonitoring"
                >停止监听弹幕</el-button
              >
            </el-form-item>
          </el-form>
        </el-col>

        <!-- 右侧：直播信息展示 -->
        <el-col :span="8">
          <div
            style="
              padding: 12px 16px;
              border-left: 1px solid #eee;
              min-height: 160px;
            "
          >
            <div
              style="font-weight: bold; font-size: 16px; margin-bottom: 10px"
            >
              📺 直播间信息
            </div>
            <p><strong>标题：</strong>{{ roomTitle || "未获取" }}</p>
            <p>
              <strong>直播间状态：</strong>
              <el-tag
                size="small"
                :type="roomStatus === 'LIVING' ? 'success' : 'info'"
              >
                {{ roomStatus === "LIVING" ? "直播中" : "未直播" }}
              </el-tag>
            </p>

            <div v-if="Object.keys(streamUrls).length">
              <el-form label-width="80px" size="small">
                <el-form-item label="清晰度">
                  <el-select v-model="selectedQuality" placeholder="选择清晰度">
                    <el-option
                      v-for="(url, quality) in streamUrls"
                      :key="quality"
                      :label="quality"
                      :value="quality"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="操作">
                  <el-button
                    type="success"
                    size="small"
                    :disabled="isRecordingMap[selectedQuality]"
                    @click="startRecord(selectedQuality)"
                  >
                    <el-icon><VideoCameraFilled /></el-icon> 录制
                  </el-button>
                  <el-button
                    type="danger"
                    size="small"
                    :disabled="!isRecordingMap[selectedQuality]"
                    @click="stopRecord(selectedQuality)"
                    style="margin-left: 8px"
                  >
                    <el-icon><VideoPause /></el-icon> 停止
                  </el-button>
                  <el-button
                    type="info"
                    size="small"
                    style="margin-left: 8px"
                    @click="copyStreamUrl"
                    >复制流地址</el-button
                  >
                </el-form-item>
              </el-form>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- AI 弹幕配置区 -->
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
            placeholder="请选择用户"
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
            style="width: 300px"
          />
          <div style="margin-top: 6px; margin-left: 20px">
            <el-tag
              v-for="(word, index) in blockedWords"
              :key="word"
              closable
              @close="removeBlockedWord(index)"
              style="margin-right: 6px"
              >{{ word }}</el-tag
            >
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 弹幕展示区 + 控制区 -->
    <el-card class="mt-2" shadow="never">
      <template #header>
        🗨️ 实时弹幕展示
        <div style="float: right">
          <el-button size="small" type="danger" @click="clearDanmakus"
            >清空弹幕</el-button
          >
          <el-select
            v-model="maxDanmakuLines"
            size="small"
            style="width: 80px; margin-left: 8px"
          >
            <el-option
              v-for="n in [10, 20, 50, 100]"
              :key="n"
              :value="n"
              :label="n + ' 行'"
            />
          </el-select>
        </div>
      </template>

      <div ref="danmakuContainer" class="danmaku-list-container">
        <div
          v-for="item in danmakus"
          :key="item.id"
          class="danmaku-item"
          :class="{
            right: item.user === '我自己' || item.user === '🤖AI',
            ai: item.user === '🤖AI',
          }"
        >
          <div class="bubble">
            <span class="user">{{ item.user }}：</span>
            <span class="content">{{ item.content }}</span>
          </div>
        </div>
      </div>

      <el-form @submit.prevent inline class="mt-2" size="small">
        <el-form-item>
          <el-input
            v-model="myDanmaku"
            placeholder="请输入弹幕内容"
            @keyup.enter="sendMyDanmaku"
            style="width: 400px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="sendMyDanmaku">发送弹幕</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { VideoCameraFilled, VideoPause } from "@element-plus/icons-vue";
import douyinApi from "@/api/douyin";
import { useStompClient } from "@/api/useStompClient";
import { useLeaveConfirm } from "@/utils/useLeaveConfirm";
import { ca } from "element-plus/es/locale";

const loading = ref(false);
const roomInput = ref("");
const roomDescription = ref("");
const isRoomLoaded = ref(false);
const isMonitoring = ref(false);
const roomTitle = ref("");
const roomStatus = ref("");

const streamUrls = ref<Record<string, string>>({});
const isRecordingMap = ref<Record<string, boolean>>({});
const selectedQuality = ref("");

const aiReplyEnabled = ref(false);
const replyMode = ref<"single" | "roundrobin">("single");
const singleUser = ref("");
const userPool = ref(["AI用户A", "AI用户B", "AI用户C"]);
const selectedUsers = ref<string[]>([...userPool.value]);
const newBlockedWord = ref("");
const blockedWords = ref<string[]>([]);

const danmakus = ref<{ id: number; user: string; content: string }[]>([]);
const myDanmaku = ref("");
const maxDanmakuLines = ref(50);
let idCounter = 0;
let roundRobinIndex = 0;

const danmakuContainer = ref<HTMLElement | null>(null);

const clearDanmakus = () => {
  danmakus.value = [];
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

function addDanmaku(user: string, content: string) {
  if (blockedWords.value.some((word) => content.includes(word))) return;

  const id = idCounter++;
  danmakus.value.push({ id, user, content });

  if (danmakus.value.length > maxDanmakuLines.value) {
    danmakus.value.splice(0, danmakus.value.length - maxDanmakuLines.value);
  }

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
      danmakus.value.push({ id: aiId, user: replyUser, content: reply });

      nextTick(() => {
        if (danmakuContainer.value) {
          danmakuContainer.value.scrollTop =
            danmakuContainer.value.scrollHeight;
        }
      });
    });
  }
}

const callAIReply = async (text: string, desc: string): Promise<string> => {
  await new Promise((r) => setTimeout(r, 500));
  return `AI回复：「${text}」收到啦～`;
};

const serviceUrl = import.meta.env.VITE_APP_API_URL;
const { connect, subscribe, disconnect } = useStompClient(`${serviceUrl}/ws`, {
  onDisconnect: () => (isMonitoring.value = false),
});

const loadRoom = async () => {
  loading.value = true;
  const roomId = roomInput.value.trim();
  if (!roomId) {
    ElMessage.warning("请输入直播间地址或ID");
    return;
  }
  try {
    const res = await douyinApi.queryRoom(roomId);
    roomTitle.value = res.roomTitle;
    roomStatus.value = res.roomStatus;
    const hls = res.roomInfoJsonNode.web_stream_url.hls_pull_url_map;
    streamUrls.value = {
      FULL_HD1: hls.FULL_HD1,
      HD1: hls.HD1,
      SD1: hls.SD1,
      SD2: hls.SD2,
    };
    isRecordingMap.value = Object.keys(streamUrls.value).reduce(
      (acc, key) => {
        acc[key] = false;
        return acc;
      },
      {} as Record<string, boolean>
    );
    isRoomLoaded.value = true;
    ElMessage.success("直播间加载成功");
  } catch (err) {
    ElMessage.error("加载失败");
  } finally {
    loading.value = false;
  }
};

const modifyRoom = async () => {
  if (isMonitoring.value) stopMonitor();
  isRoomLoaded.value = false;
  roomTitle.value = "";
  roomStatus.value = "";
  ElMessage.info("直播间修改已启用，请重新输入直播间地址");
};

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

const stopMonitor = () => {
  if (!isMonitoring.value) return;
  douyinApi.disconnectRoom(roomInput.value.trim());
  disconnect();
  isMonitoring.value = false;
  ElMessage.info("已停止监听弹幕");
};

const startRecord = async (quality: string) => {
  const roomId = roomInput.value;
  const url = streamUrls.value[quality];
  if (!url) return;
  loading.value = true;
  try {
    await douyinApi.liveRecord(roomId, url, quality);
    isRecordingMap.value[quality] = true;
    ElMessage.success(`${quality} 开始录制`);
  } catch (e) {
    ElMessage.error(`${quality} 录制失败`);
  } finally {
    loading.value = false;
  }
};

const stopRecord = async (quality: string) => {
  const roomId = roomInput.value;
  const url = streamUrls.value[quality];
  if (!url) return;
  loading.value = true;
  try {
    await douyinApi.stopLiveRecord(roomId, url, quality);
    const res = await douyinApi.downloadRecording(roomId, url, quality);
    const blob = new Blob([res.data], { type: "video/mp4" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${roomId}_${quality}_${Date.now()}.mp4`;
    a.click();
    a.remove();
    isRecordingMap.value[quality] = false;
    ElMessage.success(`${quality} 已下载`);
  } catch (e) {
    ElMessage.error(`${quality} 停止失败`);
  } finally {
    loading.value = false;
  }
};

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

useLeaveConfirm({
  isMonitoring,
  isRecording: ref(false), // 如果没有录制状态，传一个 false 的响应式即可
  stopMonitor,
  message: "检测到您正在监听，确定要离开吗？",
});
</script>

<style scoped>
.mt-2 {
  margin-top: 20px;
}

.danmaku-list-container {
  height: 320px;
  padding: 10px;
  overflow-y: auto;
  font-size: 14px;
  background-color: #000;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.danmaku-item {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  padding: 4px 8px;
  border-radius: 10px;
  background-color: transparent; /* 去掉背景 */
  border: none; /* 去掉边框 */
  color: #eee;
  word-break: break-word;
  line-height: 1.4;
  margin: 0;
}

.danmaku-item .user {
  font-weight: bold;
  color: #6cf;
  margin-bottom: 2px;
}

.danmaku-item.ai {
  align-self: flex-start;
  background-color: transparent; /* 去掉背景 */
  border: none; /* 去掉边框 */
  color: #8ff;
}

.danmaku-item.ai .user {
  color: #0f9;
}

.danmaku-item.mine {
  align-self: flex-end;
  background-color: transparent; /* 去掉背景 */
  border: none; /* 去掉边框 */
  color: #fff;
}

.send-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.send-panel .el-input {
  flex-grow: 1;
}

.clear-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 14px;
}
</style>
