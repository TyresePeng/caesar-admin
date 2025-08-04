<!--
  直播统计面板组件
  功能：展示直播间相关的统计信息，如直播状态、弹幕数量、清晰度数量、录制状态等
-->
<template>
  <div class="live-stats-panel">
    <div class="stats-header">📊 直播统计</div>
    <div class="stats-grid">
      <!-- 直播状态统计 -->
      <div class="stat-item">
        <div class="stat-value" :class="getStatusClass(roomStatus)">
          {{ roomStatus === "LIVING" ? "直播中" : "未直播" }}
        </div>
        <div class="stat-label">直播状态</div>
      </div>

      <!-- 弹幕数量统计 -->
      <div class="stat-item">
        <div class="stat-value">{{ danmakuCount }}</div>
        <div class="stat-label">弹幕数量</div>
      </div>

      <!-- 清晰度数量统计 -->
      <div class="stat-item">
        <div class="stat-value">{{ qualityCount }}</div>
        <div class="stat-label">清晰度</div>
      </div>

      <!-- 录制状态统计 -->
      <div class="stat-item">
        <div class="stat-value" :class="recordingCount > 0 ? 'recording' : ''">
          {{ recordingCount }}
        </div>
        <div class="stat-label">录制中</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

// Props 定义
interface Props {
  roomStatus: string;
  danmakuCount: number;
  streamUrls: Record<string, string>;
  isRecordingMap: Record<string, boolean>;
}

const props = withDefaults(defineProps<Props>(), {
  roomStatus: "",
  danmakuCount: 0,
  streamUrls: () => ({}),
  isRecordingMap: () => ({}),
});

// 计算属性
const qualityCount = computed(() => {
  return Object.keys(props.streamUrls).length;
});

const recordingCount = computed(() => {
  return Object.values(props.isRecordingMap).filter(Boolean).length;
});

// 获取状态样式类
const getStatusClass = (status: string) => {
  return status === "LIVING" ? "live" : "offline";
};
</script>

<style scoped>
.live-stats-panel {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #f6f8ff 0%, #f0f9ff 100%);
  border: 1px solid #e1f5fe;
  border-radius: 8px;
}

.stats-header {
  font-weight: 600;
  font-size: 14px;
  color: #262626;
  margin-bottom: 12px;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  border: 1px solid rgba(24, 144, 255, 0.1);
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(24, 144, 255, 0.2);
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 2px;
  transition: color 0.3s ease;
}

.stat-value.live {
  color: #52c41a;
}

.stat-value.offline {
  color: #8c8c8c;
}

.stat-value.recording {
  color: #ff4d4f;
  animation: pulse 2s infinite;
}

.stat-label {
  font-size: 11px;
  color: #666;
  text-align: center;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}
</style>
