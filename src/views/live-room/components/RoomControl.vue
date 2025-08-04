<!--
  房间控制组件
  功能：处理直播间的加载、监听开始/停止等核心控制操作
-->
<template>
  <div class="room-control">
    <el-form label-width="80px" size="small">
      <!-- 直播间输入和控制区域 -->
      <el-form-item label="直播间">
        <div class="room-input-group">
          <el-input
            v-model="localRoomInput"
            placeholder="请输入直播间链接或ID"
            :disabled="isRoomLoaded"
            size="small"
            @input="handleRoomInputChange"
          />
          <div class="room-buttons">
            <el-button
              type="primary"
              @click="handleLoadRoom"
              :disabled="isRoomLoaded"
              :loading="loading"
              size="small"
            >
              加载
            </el-button>
            <el-button
              v-if="isRoomLoaded"
              type="warning"
              @click="handleModifyRoom"
              size="small"
            >
              修改
            </el-button>
          </div>
        </div>
      </el-form-item>

      <!-- 弹幕监听控制区域 -->
      <el-form-item label="弹幕监听">
        <div class="monitor-buttons">
          <el-button
            type="success"
            @click="handleStartMonitor"
            :disabled="!isRoomLoaded || isMonitoring"
            :loading="monitorLoading"
            size="small"
          >
            开始
          </el-button>
          <el-button
            type="warning"
            @click="handleStopMonitor"
            :disabled="!isMonitoring"
            size="small"
          >
            停止
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

// Props 定义
interface Props {
  roomInput: string;
  isRoomLoaded: boolean;
  isMonitoring: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

// Emits 定义
interface Emits {
  (e: "update:roomInput", value: string): void;
  (e: "loadRoom"): void;
  (e: "modifyRoom"): void;
  (e: "startMonitor"): void;
  (e: "stopMonitor"): void;
}

const emit = defineEmits<Emits>();

// 本地状态
const localRoomInput = ref(props.roomInput);
const monitorLoading = ref(false);

// 监听 props 变化，同步本地状态
watch(
  () => props.roomInput,
  (newVal) => {
    localRoomInput.value = newVal;
  }
);

// 事件处理函数
const handleRoomInputChange = () => {
  emit("update:roomInput", localRoomInput.value);
};

const handleLoadRoom = () => {
  emit("loadRoom");
};

const handleModifyRoom = () => {
  emit("modifyRoom");
};

const handleStartMonitor = async () => {
  monitorLoading.value = true;
  try {
    emit("startMonitor");
  } finally {
    // 延迟重置加载状态，让用户看到反馈
    setTimeout(() => {
      monitorLoading.value = false;
    }, 1000);
  }
};

const handleStopMonitor = () => {
  emit("stopMonitor");
};
</script>

<style scoped>
.room-control {
  width: 100%;
}

.room-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.room-buttons {
  display: flex;
  gap: 8px;
}

.room-buttons .el-button {
  flex: 1;
}

.monitor-buttons {
  display: flex;
  gap: 8px;
  width: 100%;
}

.monitor-buttons .el-button {
  flex: 1;
}
</style>
