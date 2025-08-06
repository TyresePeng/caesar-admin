<!--
  直播信息面板组件
  功能：展示直播间基本信息、流控制、录制操作等功能
-->
<template>
  <div class="live-info-panel">
    <div class="info-header">📺 直播间信息</div>

    <!-- 基础信息区域 -->
    <div class="basic-info-section">
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
    </div>

    <!-- 流控制区域 -->
    <div v-if="hasStreams" class="stream-control-section">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="清晰度" label-width="60px" size="small">
            <el-select
              :model-value="selectedQuality"
              placeholder="选择清晰度"
              @change="handleQualityChange"
              size="small"
            >
              <el-option
                v-for="(url, quality) in streamUrls"
                :key="quality"
                :label="quality"
                :value="quality"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="预览" label-width="40px" size="small">
            <el-switch
              :model-value="showPreview"
              active-text=""
              inactive-text=""
              size="small"
              :disabled="!selectedQuality"
              @change="handlePreviewToggle"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 操作按钮区域 -->
      <div class="operation-buttons">
        <el-button-group>
          <el-button
            type="success"
            size="small"
            :disabled="isRecordingMap[selectedQuality]"
            :loading="recordingLoading"
            @click="handleStartRecord"
          >
            <el-icon><VideoCameraFilled /></el-icon> 录制
          </el-button>
          <el-button
            type="danger"
            size="small"
            :disabled="!isRecordingMap[selectedQuality]"
            :loading="recordingLoading"
            @click="handleStopRecord"
          >
            <el-icon><VideoPause /></el-icon> 停止
          </el-button>
          <el-button type="info" size="small" @click="handleCopyStreamUrl">
            复制链接
          </el-button>
        </el-button-group>

        <!-- 录制状态指示 -->
        <div v-if="isRecordingMap[selectedQuality]" class="recording-status">
          <span class="recording-indicator">🔴 录制中</span> - 时长:
          <strong>{{
            recordingDurationMap[selectedQuality] || "00:00:00"
          }}</strong>
        </div>
      </div>

      <!-- 视频预览区域 -->
      <VideoPreview
        :show="showPreview"
        :selected-quality="selectedQuality"
        :stream-urls="streamUrls"
        @refresh="handleVideoRefresh"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { VideoCameraFilled, VideoPause } from "@element-plus/icons-vue";
import VideoPreview from "./VideoPreview.vue";

// Props 定义
interface Props {
  roomTitle: string;
  roomStatus: string;
  streamUrls: Record<string, string>;
  selectedQuality: string;
  showPreview: boolean;
  isRecordingMap: Record<string, boolean>;
  recordingDurationMap: Record<string, string>;
}

const props = defineProps<Props>();

// Emits 定义
interface Emits {
  (e: "update:selectedQuality", value: string): void;
  (e: "update:showPreview", value: boolean): void;
  (e: "qualityChange", quality: string): void;
  (e: "previewToggle", show: boolean): void;
  (e: "startRecord", quality: string): void;
  (e: "stopRecord", quality: string): void;
  (e: "copyStreamUrl"): void;
  (e: "videoRefresh"): void;
}

const emit = defineEmits<Emits>();

// 本地状态
const recordingLoading = ref(false);

// 计算属性
const hasStreams = computed(() => {
  return Object.keys(props.streamUrls).length > 0;
});

// 事件处理函数
const handleQualityChange = (quality: string) => {
  emit("update:selectedQuality", quality);
  emit("qualityChange", quality);
};

const handlePreviewToggle = (show: boolean) => {
  emit("update:showPreview", show);
  emit("previewToggle", show);
};

const handleStartRecord = async () => {
  if (!props.selectedQuality) {
    ElMessage.warning("请先选择清晰度");
    return;
  }

  recordingLoading.value = true;
  try {
    emit("startRecord", props.selectedQuality);
  } finally {
    // 延迟重置，让用户看到反馈
    setTimeout(() => {
      recordingLoading.value = false;
    }, 1000);
  }
};

const handleStopRecord = async () => {
  if (!props.selectedQuality) {
    return;
  }

  recordingLoading.value = true;
  try {
    emit("stopRecord", props.selectedQuality);
  } finally {
    setTimeout(() => {
      recordingLoading.value = false;
    }, 1000);
  }
};

const handleCopyStreamUrl = () => {
  emit("copyStreamUrl");
};

const handleVideoRefresh = () => {
  emit("videoRefresh");
};
</script>

<style scoped>
.live-info-panel {
  padding: 16px 20px;
  border-left: 1px solid #eee;
  min-height: 160px;
}

.info-header {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 12px;
  color: #262626;
}

.basic-info-section {
  margin-bottom: 16px;
}

.basic-info-section p {
  margin: 6px 0;
  font-size: 14px;
  color: #333;
}

.stream-control-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.operation-buttons {
  margin-top: 12px;
}

.operation-buttons .el-button-group {
  width: 100%;
}

.operation-buttons .el-button-group .el-button {
  flex: 1;
}

.recording-status {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  text-align: center;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%);
  border: 1px solid #b7eb8f;
  border-radius: 6px;
}

.recording-indicator {
  color: #52c41a;
  font-weight: 500;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

/* 表单样式优化 */
.el-form-item {
  margin-bottom: 8px;
}

.el-select {
  width: 100%;
}
</style>
