<!--
  弹幕展示组件
  功能：展示实时弹幕列表，支持发送弹幕、清空弹幕等功能
-->
<template>
  <el-card class="danmaku-display" shadow="never">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <span class="header-title">🗨️ 实时弹幕展示</span>
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
          <el-button size="small" type="danger" @click="handleClearDanmakus">
            清空弹幕
          </el-button>
          <el-select
            :model-value="maxLines"
            size="small"
            style="width: 80px; margin-left: 8px"
            @change="handleMaxLinesChange"
          >
            <el-option
              v-for="n in [10, 20, 50, 100]"
              :key="n"
              :value="n"
              :label="n + ' 行'"
            />
          </el-select>
        </div>
      </div>
    </template>

    <el-collapse-transition>
      <div v-show="!collapsed">
        <!-- 弹幕列表容器 -->
        <div ref="danmakuContainer" class="danmaku-list-container">
          <div
            v-for="item in danmakus"
            :key="item.id"
            class="danmaku-item"
            :class="{
              right: item.user === '我自己' || item.user === '🤖AI',
              ai: item.user === '🤖AI',
              mine: item.user === '我自己',
            }"
          >
            <div class="bubble">
              <span class="user">{{ item.user }}：</span>
              <span class="content">{{ item.content }}</span>
            </div>
          </div>
        </div>

        <!-- 发送弹幕表单 -->
        <el-form @submit.prevent inline class="send-form" size="small">
          <el-form-item>
            <el-input
              :model-value="inputText"
              placeholder="请输入弹幕内容"
              @input="handleInputChange"
              @keyup.enter="handleSendDanmaku"
              style="width: 400px"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              @click="handleSendDanmaku"
              :loading="sending"
            >
              发送弹幕
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-collapse-transition>
  </el-card>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import { ArrowDown, ArrowUp } from "@element-plus/icons-vue";

// 弹幕项类型定义
interface DanmakuItem {
  id: number;
  user: string;
  content: string;
}

// Props 定义
interface Props {
  collapsed: boolean;
  danmakus: DanmakuItem[];
  maxLines: number;
  inputText: string;
  sending?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  sending: false,
});

// Emits 定义
interface Emits {
  (e: "update:collapsed", value: boolean): void;
  (e: "update:maxLines", value: number): void;
  (e: "update:inputText", value: string): void;
  (e: "clearDanmakus"): void;
  (e: "sendDanmaku"): void;
}

const emit = defineEmits<Emits>();

// 本地状态
const danmakuContainer = ref<HTMLElement | null>(null);
let scrollTimer: number | null = null;

// 监听弹幕列表变化，自动滚动到底部
watch(
  () => props.danmakus,
  (newDanmakus, oldDanmakus) => {
    // 只有在添加新弹幕时才滚动到底部
    if (newDanmakus.length > (oldDanmakus?.length || 0)) {
      // 使用防抖，避免高频滚动造成卡顿
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      scrollTimer = window.setTimeout(() => {
        nextTick(() => {
          scrollToBottom();
        });
      }, 50); // 50ms防抖延迟
    }
  },
  { deep: true }
);

// 滚动到底部
const scrollToBottom = () => {
  if (danmakuContainer.value) {
    const container = danmakuContainer.value;
    // 检查用户是否正在查看历史弹幕（不在底部）
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    
    // 只有当用户在底部时才自动滚动，避免打断用户查看历史弹幕
    if (isAtBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }
};

// 事件处理函数
const toggleCollapse = () => {
  emit("update:collapsed", !props.collapsed);
};

const handleClearDanmakus = () => {
  emit("clearDanmakus");
};

const handleMaxLinesChange = (value: number) => {
  emit("update:maxLines", value);
};

const handleInputChange = (value: string) => {
  emit("update:inputText", value);
};

const handleSendDanmaku = () => {
  if (props.inputText.trim()) {
    emit("sendDanmaku");
  }
};
</script>

<style scoped>
.danmaku-display {
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
  align-items: center;
  gap: 8px;
}

.danmaku-list-container {
  height: 250px;
  padding: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  font-size: 13px;
  background-color: #000;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 16px;
  scroll-behavior: smooth;
  /* 确保新弹幕能够正确显示 */
  min-height: 250px;
}

.danmaku-item {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  padding: 4px 8px;
  border-radius: 10px;
  background-color: transparent;
  border: none;
  color: #eee;
  word-break: break-word;
  line-height: 1.4;
  margin: 0;
}

.danmaku-item .bubble {
  display: flex;
  flex-direction: column;
}

.danmaku-item .user {
  font-weight: bold;
  color: #6cf;
  margin-bottom: 2px;
  font-size: 12px;
}

.danmaku-item .content {
  color: #eee;
}

.danmaku-item.ai {
  align-self: flex-start;
  background-color: transparent;
  border: none;
  color: #8ff;
}

.danmaku-item.ai .user {
  color: #0f9;
}

.danmaku-item.mine {
  align-self: flex-end;
  background-color: transparent;
  border: none;
  color: #fff;
}

.danmaku-item.mine .user {
  color: #ff6;
}

.danmaku-item.right {
  align-self: flex-end;
}

.send-form {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

/* 滚动条样式 */
.danmaku-list-container::-webkit-scrollbar {
  width: 6px;
}

.danmaku-list-container::-webkit-scrollbar-track {
  background: #333;
  border-radius: 3px;
}

.danmaku-list-container::-webkit-scrollbar-thumb {
  background: #666;
  border-radius: 3px;
}

.danmaku-list-container::-webkit-scrollbar-thumb:hover {
  background: #888;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .danmaku-list-container {
    height: 200px;
  }
}

/* 弹幕项动画 - 新弹幕从底部滑入 */
.danmaku-item {
  animation: slideInBottom 0.3s ease-out;
}

@keyframes slideInBottom {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 弹幕文字淡入效果 */
.danmaku-item .content {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
