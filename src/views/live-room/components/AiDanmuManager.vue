<!--
  AI弹幕管理组件
  功能：处理AI弹幕的用户选择、配置管理、批量操作等功能
-->
<template>
  <el-card shadow="never" class="ai-danmu-manager">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <span class="header-title">📢 AI弹幕管理</span>
          <el-button
            size="small"
            text
            @click="toggleCollapse"
            class="collapse-btn"
          >
            <el-icon>
              <component :is="collapsed ? 'ArrowDown' : 'ArrowUp'" />
            </el-icon>
            {{ collapsed ? "展开" : "收起" }}
          </el-button>
        </div>
        <div v-if="!collapsed" class="header-actions">
          <el-button
            type="success"
            size="small"
            @click="handleBatchStart"
            :disabled="selectedUserIds.length === 0 || !isRoomLoaded"
          >
            批量启动
          </el-button>
          <el-button
            type="warning"
            size="small"
            @click="handleBatchStop"
            :disabled="selectedUserIds.length === 0"
          >
            批量停止
          </el-button>
        </div>
      </div>
    </template>

    <el-collapse-transition>
      <div v-show="!collapsed">
        <el-row :gutter="20">
          <!-- 左侧：用户选择列表 -->
          <el-col :span="8">
            <UserSelector
              v-model:selectedUserId="selectedUserId"
              v-model:selectedUserIds="selectedUserIds"
              v-model:searchKeyword="userSearchKeyword"
              :users="platformUsers"
              :ai-status-map="aiStatusMap"
              @select-user="handleUserSelect"
            />
          </el-col>

          <!-- 右侧：配置面板 -->
          <el-col :span="16">
            <UserConfigPanel
              v-if="selectedUserId"
              :selected-user="selectedUser"
              :ai-config="aiConfig"
              :custom-personality="customPersonality"
              :ai-status="getAiStatus(selectedUserId)"
              :is-room-loaded="isRoomLoaded"
              :starting-users="startingUsers"
              :stopping-users="stoppingUsers"
              @update:ai-config="handleConfigUpdate"
              @update:custom-personality="handleCustomPersonalityUpdate"
              @start-ai="handleStartSingle"
              @stop-ai="handleStopSingle"
            />

            <!-- 未选择用户时的提示 -->
            <div v-else class="no-user-selected">
              <el-empty description="请从左侧选择一个用户进行配置" />
            </div>
          </el-col>
        </el-row>
      </div>
    </el-collapse-transition>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { ArrowDown, ArrowUp } from "@element-plus/icons-vue";
import UserSelector from "./UserSelector.vue";
import UserConfigPanel from "./UserConfigPanel.vue";
import type { AiDanmuConfig, AiDanmuStatus } from "@/api/ai-danmu";

// Props 定义
interface Props {
  collapsed: boolean;
  isRoomLoaded: boolean;
  platformUsers: any[];
  aiStatusMap: Record<number, AiDanmuStatus>;
  startingUsers: number[];
  stoppingUsers: number[];
}

const props = defineProps<Props>();

// Emits 定义
interface Emits {
  (e: "update:collapsed", value: boolean): void;
  (e: "batchStart", userIds: number[]): void;
  (e: "batchStop", userIds: number[]): void;
  (e: "startSingle", userId: number): void;
  (e: "stopSingle", userId: number): void;
  (e: "updateConfig", config: Partial<AiDanmuConfig>): void;
  (e: "selectUser", userId: number): void;
}

const emit = defineEmits<Emits>();

// 本地状态
const selectedUserId = ref<number | null>(null);
const selectedUserIds = ref<number[]>([]);
const userSearchKeyword = ref("");

// AI配置状态
const aiConfig = ref<AiDanmuConfig>({
  userId: 0,
  roomDescription: "",
  randomSeconds: 3,
  aiPersonality: "专业销售顾问",
});

const customPersonality = ref("");

// 计算属性
const selectedUser = computed(() =>
  props.platformUsers.find((user) => user.id === selectedUserId.value)
);

// 获取AI状态的辅助函数
const getAiStatus = (userId: number) => {
  const status = props.aiStatusMap[userId];
  if (!status) return { enabled: false, sentCount: 0 };

  // 如果status有status字段且包含code，说明是新格式
  if (status.status && status.status.code) {
    return {
      enabled: status.status.code === "RUNNING",
      sentCount: status.sentCount || 0,
      lastSentTime: status.lastSentTime,
      lastSentContent: status.lastSentContent,
      runDuration: status.runDuration,
      errorMessage: status.errorMessage,
    };
  }

  // 兼容旧格式
  return {
    enabled: status.enabled || false,
    sentCount: status.sentCount || 0,
    lastSentTime: status.lastSentTime,
    lastSentContent: status.lastSentContent,
    runDuration: status.runDuration,
    errorMessage: status.errorMessage,
  };
};

// 事件处理函数
const toggleCollapse = () => {
  emit("update:collapsed", !props.collapsed);
};

const handleBatchStart = () => {
  emit("batchStart", selectedUserIds.value);
};

const handleBatchStop = () => {
  emit("batchStop", selectedUserIds.value);
};

const handleStartSingle = () => {
  if (selectedUserId.value) {
    emit("startSingle", selectedUserId.value);
  }
};

const handleStopSingle = () => {
  if (selectedUserId.value) {
    emit("stopSingle", selectedUserId.value);
  }
};

const handleUserSelect = (userId: number) => {
  selectedUserId.value = userId;
  emit("selectUser", userId);
};

const handleConfigUpdate = (config: Partial<AiDanmuConfig>) => {
  Object.assign(aiConfig.value, config);
  emit("updateConfig", config);
};

const handleCustomPersonalityUpdate = (value: string) => {
  customPersonality.value = value;
};
</script>

<style scoped>
.ai-danmu-manager {
  margin-top: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title {
  font-weight: bold;
  font-size: 16px;
  color: #262626;
}

.collapse-btn {
  padding: 4px 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.no-user-selected {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
