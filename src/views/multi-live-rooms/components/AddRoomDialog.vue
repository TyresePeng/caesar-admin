<!--
  添加直播间对话框组件
  功能：添加新的直播间到多直播间管理
-->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="添加直播间"
    width="500px"
    :close-on-click-modal="false"
    @close="onClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      @submit.prevent
    >
      <el-form-item label="直播间地址" prop="roomInput">
        <el-input
          v-model="formData.roomInput"
          placeholder="请输入抖音直播间链接或房间ID"
          clearable
          @keyup.enter="handleSubmit"
        />
        <div class="input-tip">
          支持格式：
          <br />
          • 直播间链接：https://live.douyin.com/123456789
          <br />
          • 房间ID：123456789
        </div>
      </el-form-item>

      <el-form-item label="显示名称" prop="displayName">
        <el-input
          v-model="formData.displayName"
          placeholder="为直播间设置一个易识别的名称（可选）"
          clearable
          maxlength="50"
          show-word-limit
          @keyup.enter="handleSubmit"
        />
        <div class="input-tip">如果不设置，将使用房间ID作为显示名称</div>
      </el-form-item>

      <el-form-item label="快速添加">
        <div class="quick-add-section">
          <el-button
            size="small"
            type="primary"
            plain
            @click="showPresetDialog"
          >
            从预设添加
          </el-button>
          <el-button
            size="small"
            type="success"
            plain
            @click="showHistoryDialog"
          >
            从历史添加
          </el-button>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="onClose">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          添加直播间
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 预设直播间对话框 -->
  <el-dialog
    v-model="presetDialogVisible"
    title="选择预设直播间"
    width="400px"
    append-to-body
  >
    <div class="preset-list">
      <el-card
        v-for="preset in presetRooms"
        :key="preset.id"
        class="preset-item"
        shadow="hover"
        @click="selectPreset(preset)"
      >
        <div class="preset-content">
          <div class="preset-name">{{ preset.displayName }}</div>
          <div class="preset-url">{{ preset.roomInput }}</div>
          <div class="preset-tags">
            <el-tag
              v-for="tag in preset.tags"
              :key="tag"
              size="small"
              type="info"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </el-card>
    </div>
    <div v-if="presetRooms.length === 0" class="empty-state">
      <el-empty description="暂无预设直播间" />
    </div>
  </el-dialog>

  <!-- 历史记录对话框 -->
  <el-dialog
    v-model="historyDialogVisible"
    title="选择历史直播间"
    width="500px"
    append-to-body
  >
    <div class="history-list">
      <el-card
        v-for="history in historyRooms"
        :key="history.roomInput"
        class="history-item"
        shadow="hover"
        @click="selectHistory(history)"
      >
        <div class="history-content">
          <div class="history-name">{{ history.displayName }}</div>
          <div class="history-url">{{ history.roomInput }}</div>
          <div class="history-time">
            上次使用: {{ formatTime(history.lastUsed) }}
          </div>
        </div>
      </el-card>
    </div>
    <div v-if="historyRooms.length === 0" class="empty-state">
      <el-empty description="暂无历史记录" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { ElMessage, FormInstance, FormRules } from "element-plus";

interface PresetRoom {
  id: string;
  roomInput: string;
  displayName: string;
  tags: string[];
}

interface HistoryRoom {
  roomInput: string;
  displayName: string;
  lastUsed: number;
}

interface FormData {
  roomInput: string;
  displayName: string;
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "room-added": [data: { roomInput: string; displayName: string }];
}>();

// ========== 响应式数据 ==========
const formRef = ref<FormInstance>();
const loading = ref(false);
const presetDialogVisible = ref(false);
const historyDialogVisible = ref(false);

const formData = ref<FormData>({
  roomInput: "",
  displayName: "",
});

const presetRooms = ref<PresetRoom[]>([
  {
    id: "1",
    roomInput: "123456789",
    displayName: "测试直播间1",
    tags: ["测试", "开发"],
  },
  {
    id: "2",
    roomInput: "https://live.douyin.com/987654321",
    displayName: "测试直播间2",
    tags: ["测试", "演示"],
  },
]);

const historyRooms = ref<HistoryRoom[]>([]);

// ========== 计算属性 ==========
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit("update:visible", val),
});

// ========== 表单验证规则 ==========
const formRules: FormRules = {
  roomInput: [
    { required: true, message: "请输入直播间地址或房间ID", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        const roomIdPattern = /^\d+$/;
        const urlPattern = /^https:\/\/live\.douyin\.com\/\d+/;

        if (!value) {
          callback(new Error("请输入直播间地址或房间ID"));
        } else if (!roomIdPattern.test(value) && !urlPattern.test(value)) {
          callback(new Error("请输入有效的直播间链接或房间ID"));
        } else {
          callback();
        }
      },
      trigger: "blur",
    },
  ],
  displayName: [
    { max: 50, message: "显示名称不能超过50个字符", trigger: "blur" },
  ],
};

// ========== 方法 ==========

/**
 * 关闭对话框
 */
const onClose = () => {
  resetForm();
  dialogVisible.value = false;
};

/**
 * 重置表单
 */
const resetForm = () => {
  formData.value = {
    roomInput: "",
    displayName: "",
  };
  formRef.value?.clearValidate();
};

/**
 * 提取房间ID
 */
const extractRoomId = (input: string): string => {
  const urlMatch = input.match(/live\.douyin\.com\/(\d+)/);
  return urlMatch ? urlMatch[1] : input;
};

/**
 * 提交表单
 */
const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    loading.value = true;

    const roomId = extractRoomId(formData.value.roomInput);
    const displayName = formData.value.displayName.trim() || `直播间${roomId}`;

    // 保存到历史记录
    saveToHistory({
      roomInput: formData.value.roomInput,
      displayName: displayName,
      lastUsed: Date.now(),
    });

    // 发送添加事件
    emit("room-added", {
      roomInput: formData.value.roomInput,
      displayName: displayName,
    });

    onClose();
    ElMessage.success("直播间添加成功");
  } catch (error) {
    console.error("表单验证失败:", error);
  } finally {
    loading.value = false;
  }
};

/**
 * 显示预设对话框
 */
const showPresetDialog = () => {
  presetDialogVisible.value = true;
};

/**
 * 显示历史对话框
 */
const showHistoryDialog = () => {
  loadHistory();
  historyDialogVisible.value = true;
};

/**
 * 选择预设直播间
 */
const selectPreset = (preset: PresetRoom) => {
  formData.value.roomInput = preset.roomInput;
  formData.value.displayName = preset.displayName;
  presetDialogVisible.value = false;
};

/**
 * 选择历史直播间
 */
const selectHistory = (history: HistoryRoom) => {
  formData.value.roomInput = history.roomInput;
  formData.value.displayName = history.displayName;
  historyDialogVisible.value = false;
};

/**
 * 格式化时间
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60 * 1000) {
    return "刚刚";
  } else if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`;
  } else if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * 保存到历史记录
 */
const saveToHistory = (room: HistoryRoom) => {
  try {
    const history = loadHistory();

    // 移除已存在的记录
    const existingIndex = history.findIndex(
      (h) => h.roomInput === room.roomInput
    );
    if (existingIndex > -1) {
      history.splice(existingIndex, 1);
    }

    // 添加到开头
    history.unshift(room);

    // 只保留最近20条记录
    if (history.length > 20) {
      history.splice(20);
    }

    localStorage.setItem("live-room-history", JSON.stringify(history));
  } catch (error) {
    console.error("保存历史记录失败:", error);
  }
};

/**
 * 加载历史记录
 */
const loadHistory = (): HistoryRoom[] => {
  try {
    const saved = localStorage.getItem("live-room-history");
    if (saved) {
      const history = JSON.parse(saved);
      historyRooms.value = Array.isArray(history) ? history : [];
      return historyRooms.value;
    }
  } catch (error) {
    console.error("加载历史记录失败:", error);
  }

  historyRooms.value = [];
  return historyRooms.value;
};

// ========== 监听器 ==========
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadHistory();
    }
  }
);

// ========== 生命周期 ==========
onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.input-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.quick-add-section {
  display: flex;
  gap: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.preset-list,
.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.preset-item,
.history-item {
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-item:hover,
.history-item:hover {
  transform: translateY(-2px);
}

.preset-content,
.history-content {
  padding: 8px;
}

.preset-name,
.history-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.preset-url,
.history-url {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  word-break: break-all;
}

.history-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.preset-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* 滚动条样式 */
.preset-list::-webkit-scrollbar,
.history-list::-webkit-scrollbar {
  width: 6px;
}

.preset-list::-webkit-scrollbar-thumb,
.history-list::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.preset-list::-webkit-scrollbar-thumb:hover,
.history-list::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker);
}
</style>
