<!--
  用户配置面板组件
  功能：展示选中用户的AI弹幕配置界面、状态监控等
-->
<template>
  <div class="config-panel">
    <!-- 用户信息头部 -->
    <div class="config-header">
      <div class="selected-user-info">
        <h3>{{ selectedUser?.name }}</h3>
        <el-tag :type="selectedUser?.status === 1 ? 'success' : 'info'">
          {{ getPlatformName(selectedUser?.code) }}
        </el-tag>
        <el-tag
          :type="aiStatus.enabled ? 'success' : 'info'"
          style="margin-left: 8px"
        >
          {{ aiStatus.enabled ? "运行中" : "已停止" }}
        </el-tag>
      </div>
      <div class="control-buttons">
        <el-button
          v-if="!aiStatus.enabled"
          type="success"
          @click="handleStartAi"
          :disabled="!isRoomLoaded"
          :loading="startingUsers.includes(selectedUser?.id)"
        >
          启动AI弹幕
        </el-button>
        <el-button
          v-else
          type="warning"
          @click="handleStopAi"
          :loading="stoppingUsers.includes(selectedUser?.id)"
        >
          停止AI弹幕
        </el-button>
      </div>
    </div>

    <!-- 配置表单 -->
    <el-form
      :model="localConfig"
      label-width="120px"
      size="small"
      class="config-form"
    >
      <el-form-item label="直播间描述">
        <el-input
          v-model="localConfig.roomDescription"
          type="textarea"
          :rows="3"
          placeholder="请输入直播间描述，AI回复将参考此内容"
          maxlength="500"
          show-word-limit
          @blur="handleConfigChange"
        />
      </el-form-item>

      <el-form-item label="AI人格设定">
        <div class="personality-controls">
          <el-select
            v-model="localConfig.aiPersonality"
            placeholder="选择AI人格"
            style="width: 200px"
            @change="handleConfigChange"
          >
            <el-option label="专业销售顾问" value="专业销售顾问" />
            <el-option label="热情推荐员" value="热情推荐员" />
            <el-option label="产品专家" value="产品专家" />
            <el-option label="优惠活动助手" value="优惠活动助手" />
            <el-option label="贴心客服" value="贴心客服" />
            <el-option label="种草达人" value="种草达人" />
            <el-option label="自定义" value="自定义" />
          </el-select>
          <el-input
            v-if="localConfig.aiPersonality === '自定义'"
            v-model="localCustomPersonality"
            placeholder="如：专业美妆顾问、母婴用品专家"
            style="width: 200px; margin-left: 8px"
            @blur="handleCustomPersonalityChange"
          />
        </div>
      </el-form-item>

      <el-form-item label="发送间隔">
        <div class="interval-controls">
          <el-input-number
            v-model="localConfig.randomSeconds"
            :min="1"
            :max="10"
            :step="1"
            style="width: 120px"
            @change="handleConfigChange"
          />
          <span class="interval-hint">秒（随机等待时间）</span>
        </div>
      </el-form-item>
    </el-form>

    <!-- 状态监控 -->
    <div v-if="aiStatus" class="status-monitor">
      <h4>运行状态</h4>
      <el-row :gutter="16">
        <el-col :span="6">
          <el-statistic title="已发送" :value="aiStatus.sentCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic
            title="运行时长"
            :value="aiStatus.runDuration || '0分钟'"
          />
        </el-col>
        <el-col :span="12">
          <div class="last-sent">
            <div class="last-sent-label">最后发送内容：</div>
            <div class="last-sent-content">
              {{ aiStatus.lastSentContent || "暂无" }}
            </div>
            <div class="last-sent-time">
              {{ aiStatus.lastSentTime || "暂无" }}
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 错误信息 -->
      <div v-if="aiStatus.errorMessage" class="error-message">
        <el-alert
          :title="aiStatus.errorMessage"
          type="error"
          show-icon
          :closable="false"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { AiDanmuConfig, AiDanmuStatus } from "@/api/ai-danmu";

// Props 定义
interface Props {
  selectedUser: any;
  aiConfig: AiDanmuConfig;
  customPersonality: string;
  aiStatus: ReturnType<typeof getAiStatusHelper>;
  isRoomLoaded: boolean;
  startingUsers: number[];
  stoppingUsers: number[];
}

const props = defineProps<Props>();

// Emits 定义
interface Emits {
  (e: "update:aiConfig", value: Partial<AiDanmuConfig>): void;
  (e: "update:customPersonality", value: string): void;
  (e: "startAi"): void;
  (e: "stopAi"): void;
}

const emit = defineEmits<Emits>();

// 本地状态
const localConfig = ref<AiDanmuConfig>({ ...props.aiConfig });
const localCustomPersonality = ref(props.customPersonality);

// 监听外部配置变化
watch(
  () => props.aiConfig,
  (newConfig) => {
    localConfig.value = { ...newConfig };
  },
  { deep: true }
);

watch(
  () => props.customPersonality,
  (newValue) => {
    localCustomPersonality.value = newValue;
  }
);

// 获取平台名称
const getPlatformName = (code: string) => {
  const platformMap: Record<string, string> = {
    douyin: "抖音",
    xiaohonshu: "小红书",
    weixin: "微信",
  };
  return platformMap[code] || code;
};

// AI状态辅助函数类型（这里需要根据实际的getAiStatus函数来定义）
function getAiStatusHelper(status: AiDanmuStatus) {
  if (!status) return { enabled: false, sentCount: 0 };

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

  return {
    enabled: status.enabled || false,
    sentCount: status.sentCount || 0,
    lastSentTime: status.lastSentTime,
    lastSentContent: status.lastSentContent,
    runDuration: status.runDuration,
    errorMessage: status.errorMessage,
  };
}

// 事件处理函数
const handleStartAi = () => {
  emit("startAi");
};

const handleStopAi = () => {
  emit("stopAi");
};

const handleConfigChange = () => {
  emit("update:aiConfig", localConfig.value);
};

const handleCustomPersonalityChange = () => {
  emit("update:customPersonality", localCustomPersonality.value);
};
</script>

<style scoped>
.config-panel {
  height: 280px;
  overflow-y: auto;
  padding-left: 16px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f6f8ff 0%, #f0f9ff 100%);
  border-radius: 8px;
  border: 1px solid #e1f5fe;
  margin-bottom: 16px;
}

.selected-user-info h3 {
  margin: 0 0 8px 0;
  color: #262626;
  font-size: 18px;
}

.control-buttons {
  display: flex;
  gap: 8px;
}

.config-form {
  margin-top: 16px;
}

.personality-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.interval-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.interval-hint {
  color: #999;
  font-size: 12px;
}

.status-monitor {
  margin-top: 16px;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
}

.status-monitor h4 {
  margin: 0 0 12px 0;
  color: #262626;
  font-size: 14px;
  font-weight: 600;
}

.last-sent {
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.last-sent-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.last-sent-content {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.last-sent-time {
  font-size: 12px;
  color: #999;
}

.error-message {
  margin-top: 16px;
}

/* 表单样式优化 */
.el-form-item {
  margin-bottom: 16px;
}

.el-textarea__inner {
  resize: vertical;
  min-height: 80px !important;
}

/* 统计卡片样式 */
.el-statistic {
  text-align: center;
}

.el-statistic .el-statistic__content {
  font-weight: 600;
}

/* 滚动条样式 */
.config-panel::-webkit-scrollbar {
  width: 6px;
}

.config-panel::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.config-panel::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.config-panel::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
