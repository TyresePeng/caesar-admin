<!--
  用户选择器组件
  功能：展示用户列表，支持搜索、单选、多选等功能
-->
<template>
  <div class="user-selector">
    <!-- 搜索框 -->
    <el-input
      :model-value="searchKeyword"
      placeholder="搜索用户..."
      size="small"
      class="search-input"
      clearable
      @input="handleSearchInput"
    >
      <template #prefix>
        <i-ep-search />
      </template>
    </el-input>

    <!-- 用户列表 -->
    <div class="user-list">
      <div
        v-for="user in filteredUsers"
        :key="user.id"
        class="user-card"
        :class="{
          selected: selectedUserId === user.id,
          'ai-running': getAiStatus(user.id).enabled,
        }"
        @click="handleUserClick(user.id)"
      >
        <!-- 用户信息 -->
        <div class="user-info">
          <div class="user-avatar">
            {{ user.name?.charAt(0) || "用" }}
          </div>
          <div class="user-details">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-platform">
              <el-tag
                size="small"
                :type="user.status === 1 ? 'success' : 'info'"
              >
                {{ getPlatformName(user.code) }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 用户状态 -->
        <div class="user-status">
          <div class="status-indicators">
            <span
              class="status-dot"
              :class="user.status === 1 ? 'online' : 'offline'"
            ></span>
            <span class="ai-status" :class="getAiStatusClass(user.id)">
              {{ getAiStatusIcon(user.id) }}
            </span>
          </div>
          <div class="sent-count">
            已发{{ getAiStatus(user.id).sentCount }}条
          </div>
        </div>

        <!-- 选择框 -->
        <div class="user-checkbox">
          <el-checkbox-group
            :model-value="selectedUserIds"
            @change="handleCheckboxChange"
          >
            <el-checkbox :value="user.id" @click.stop />
          </el-checkbox-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { AiDanmuStatus } from "@/api/ai-danmu";

// Props 定义
interface Props {
  selectedUserId: number | null;
  selectedUserIds: number[];
  searchKeyword: string;
  users: any[];
  aiStatusMap: Record<number, AiDanmuStatus>;
}

const props = defineProps<Props>();

// Emits 定义
interface Emits {
  (e: "update:selectedUserId", value: number | null): void;
  (e: "update:selectedUserIds", value: number[]): void;
  (e: "update:searchKeyword", value: string): void;
  (e: "selectUser", userId: number): void;
}

const emit = defineEmits<Emits>();

// 计算属性
const filteredUsers = computed(() => {
  if (!props.searchKeyword) return props.users;
  return props.users.filter((user) =>
    user.name?.toLowerCase().includes(props.searchKeyword.toLowerCase())
  );
});

// 获取平台名称
const getPlatformName = (code: string) => {
  const platformMap: Record<string, string> = {
    douyin: "抖音",
    xiaohonshu: "小红书",
    weixin: "微信",
  };
  return platformMap[code] || code;
};

// 获取AI状态
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

// 获取AI状态图标
const getAiStatusIcon = (userId: number) => {
  return getAiStatus(userId).enabled ? "🟢" : "⚪";
};

// 获取AI状态样式类
const getAiStatusClass = (userId: number) => {
  return getAiStatus(userId).enabled ? "running" : "stopped";
};

// 事件处理函数
const handleSearchInput = (value: string) => {
  emit("update:searchKeyword", value);
};

const handleUserClick = (userId: number) => {
  emit("update:selectedUserId", userId);
  emit("selectUser", userId);
};

const handleCheckboxChange = (value: number[]) => {
  emit("update:selectedUserIds", value);
};
</script>

<style scoped>
.user-selector {
  height: 280px;
  border-right: 1px solid #ebeef5;
  padding-right: 16px;
}

.search-input {
  margin-bottom: 12px;
}

.user-list {
  height: 240px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 6px;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  background-color: #fafafa;
  position: relative;
}

.user-card:hover {
  background-color: #f0f9ff;
  border-color: #e1f5fe;
}

.user-card.selected {
  background-color: #e3f2fd;
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.user-card.ai-running {
  background: linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%);
  border-color: #52c41a;
}

.user-card.ai-running.selected {
  border-color: #1890ff;
  background: linear-gradient(135deg, #e6f7ff 0%, #f6ffed 100%);
}

.user-info {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 16px;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  color: #262626;
  margin-bottom: 4px;
}

.user-platform {
  font-size: 12px;
}

.user-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
}

.status-indicators {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.online {
  background-color: #52c41a;
  box-shadow: 0 0 6px rgba(82, 196, 26, 0.6);
}

.status-dot.offline {
  background-color: #d9d9d9;
}

.ai-status {
  font-size: 12px;
}

.sent-count {
  font-size: 11px;
  color: #8c8c8c;
  white-space: nowrap;
}

.user-checkbox {
  margin-left: 8px;
}

/* 滚动条样式 */
.user-list::-webkit-scrollbar {
  width: 6px;
}

.user-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.user-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.user-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 动画效果 */
.user-card {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
