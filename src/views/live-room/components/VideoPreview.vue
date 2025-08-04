<!--
  视频预览组件
  功能：处理HLS视频流的预览播放，包括错误处理、加载状态等
-->
<template>
  <div v-if="show && selectedQuality" class="video-preview-container">
    <div class="video-header">
      <span>📺 直播预览 ({{ selectedQuality }})</span>
      <el-button size="small" text @click="handleRefresh">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="video-wrapper">
      <video
        ref="videoPlayer"
        class="live-video"
        :src="videoUrl"
        controls
        muted
        autoplay
        @error="onVideoError"
        @loadstart="onVideoLoadStart"
        @canplay="onVideoCanPlay"
      >
        您的浏览器不支持视频播放
      </video>

      <!-- 加载状态 -->
      <div v-if="loading" class="video-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <!-- 错误状态 -->
      <div v-if="error" class="video-error">
        <span>⚠️ 视频加载失败，请检查网络或稍后重试</span>
        <el-button
          size="small"
          text
          @click="handleRefresh"
          style="margin-left: 8px"
        >
          重试
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from "vue";
import { Refresh, Loading } from "@element-plus/icons-vue";
import Hls from "hls.js";

// Props 定义
interface Props {
  show: boolean;
  selectedQuality: string;
  streamUrls: Record<string, string>;
}

const props = defineProps<Props>();

// Emits 定义
interface Emits {
  (e: "refresh"): void;
}

const emit = defineEmits<Emits>();

// 本地状态
const videoPlayer = ref<HTMLVideoElement | null>(null);
const loading = ref(false);
const error = ref(false);
let hls: Hls | null = null;

// 计算视频URL
const videoUrl = computed(() => {
  return props.streamUrls[props.selectedQuality] || "";
});

// 销毁视频相关资源
const destroyVideo = () => {
  if (videoPlayer.value) {
    videoPlayer.value.pause();
    videoPlayer.value.src = "";
  }
  destroyHls();
  error.value = false;
  loading.value = false;
};

// 销毁HLS实例
const destroyHls = () => {
  if (hls) {
    hls.destroy();
    hls = null;
  }
};

// 初始化视频播放
const initVideo = () => {
  console.log("🎬 初始化视频播放:", props.selectedQuality, videoUrl.value);

  if (!videoPlayer.value || !videoUrl.value) {
    console.log("❌ 视频播放器或URL不存在");
    return;
  }

  error.value = false;
  loading.value = true;

  // 销毁之前的HLS实例
  destroyHls();

  // 使用HLS.js处理M3U8流
  if (Hls.isSupported()) {
    console.log("✅ HLS支持检查通过，创建HLS实例");
    hls = new Hls({
      enableWorker: false,
      lowLatencyMode: false,
      backBufferLength: 30,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 5,
      maxFragLookUpTolerance: 0.25,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 4,
      levelLoadingTimeOut: 10000,
      fragLoadingTimeOut: 20000,
    });

    hls.loadSource(videoUrl.value);
    hls.attachMedia(videoPlayer.value);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log("✅ HLS清单解析成功");
      loading.value = false;
      videoPlayer.value?.play().catch((err) => {
        console.log("⚠️ 自动播放被阻止:", err);
      });
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error("❌ HLS错误详情:", data);

      if (data.fatal) {
        console.error(
          "💀 HLS致命错误, 类型:",
          data.type,
          "详情:",
          data.details
        );
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log("🔄 网络错误，尝试恢复...");
            hls?.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log("🔄 媒体错误，尝试恢复...");
            hls?.recoverMediaError();
            break;
          default:
            console.log("💥 无法恢复的错误，显示错误状态");
            error.value = true;
            loading.value = false;
            break;
        }
      }
    });
  } else if (videoPlayer.value.canPlayType("application/vnd.apple.mpegurl")) {
    console.log("🍎 Safari原生HLS支持");
    videoPlayer.value.src = videoUrl.value;
    videoPlayer.value.load();
  } else {
    console.error("❌ 浏览器不支持HLS播放");
    error.value = true;
    loading.value = false;
  }
};

// 监听显示状态和清晰度变化
watch(
  [() => props.show, () => props.selectedQuality],
  ([newShow, newQuality]) => {
    if (newShow && newQuality) {
      nextTick(() => {
        initVideo();
      });
    } else {
      destroyVideo();
    }
  },
  { immediate: true }
);

// 监听视频URL变化
watch(
  () => videoUrl.value,
  (newUrl) => {
    if (newUrl && props.show) {
      nextTick(() => {
        initVideo();
      });
    }
  }
);

// 视频事件处理
const onVideoError = () => {
  console.error("❌ 视频加载失败");
  error.value = true;
  loading.value = false;
};

const onVideoLoadStart = () => {
  loading.value = true;
  error.value = false;
};

const onVideoCanPlay = () => {
  loading.value = false;
  error.value = false;
};

// 刷新视频
const handleRefresh = () => {
  emit("refresh");
  initVideo();
};

// 组件卸载时清理资源
onUnmounted(() => {
  destroyVideo();
});
</script>

<style scoped>
.video-preview-container {
  margin-top: 16px;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  background: #fafbfc;
  overflow: hidden;
}

.video-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #e1e8ed;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.video-wrapper {
  position: relative;
}

.live-video {
  width: 100%;
  height: 200px;
  background-color: #000;
  object-fit: contain;
  display: block;
}

.video-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  backdrop-filter: blur(4px);
}

.video-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 16px;
  text-align: center;
  color: #f56565;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  font-size: 14px;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
