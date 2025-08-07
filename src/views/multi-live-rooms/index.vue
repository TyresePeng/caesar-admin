<!--
  多直播间管理主页面
  功能：同时管理多个直播间，支持标签页切换和批量操作
-->
<template>
  <div class="app-container multi-live-rooms">
    <!-- 顶部操作区 -->
    <el-card shadow="never" class="operation-card">
      <div class="operation-bar">
        <div class="left-actions">
          <el-button type="primary" icon="Plus" @click="addNewRoom">
            添加直播间
          </el-button>
          <el-button
            type="success"
            icon="VideoPlay"
            :disabled="!hasActiveRooms"
            @click="batchStartMonitor"
          >
            批量开启监听
          </el-button>
          <el-button
            type="warning"
            icon="VideoPause"
            :disabled="!hasActiveRooms"
            @click="batchStopMonitor"
          >
            批量停止监听
          </el-button>
        </div>
        <div class="right-info">
          <el-tag v-if="activeRooms.length > 0" type="success">
            活跃房间: {{ activeRooms.length }}
          </el-tag>
          <el-tag v-if="monitoringRooms.length > 0" type="primary">
            监听中: {{ monitoringRooms.length }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 直播间标签页 -->
    <el-card shadow="never" class="tabs-card">
      <el-tabs
        v-model="activeTab"
        type="card"
        closable
        @tab-remove="removeRoom"
        @tab-change="onTabChange"
      >
        <el-tab-pane
          v-for="room in rooms"
          :key="room.id"
          :label="room.displayName"
          :name="room.id"
        >
          <template #label>
            <span class="tab-label">
              <el-badge
                :value="room.unreadCount"
                :hidden="room.unreadCount === 0"
                type="danger"
              >
                <span>{{ room.displayName }}</span>
              </el-badge>
              <el-tag
                v-if="room.isMonitoring"
                type="success"
                size="small"
                class="monitoring-tag"
              >
                监听中
              </el-tag>
            </span>
          </template>

          <!-- 单个直播间控制面板 -->
          <LiveRoomPanel
            :room-data="room"
            @room-updated="onRoomUpdated"
            @monitoring-changed="onMonitoringChanged"
            @danmaku-received="onDanmakuReceived"
          />
        </el-tab-pane>

        <!-- 添加直播间的空状态 -->
        <el-empty
          v-if="rooms.length === 0"
          description="暂无直播间，点击添加直播间开始管理"
          :image-size="200"
        >
          <el-button type="primary" @click="addNewRoom">添加直播间</el-button>
        </el-empty>
      </el-tabs>
    </el-card>

    <!-- 添加直播间对话框 -->
    <AddRoomDialog
      v-model:visible="addRoomDialogVisible"
      @room-added="onRoomAdded"
    />

    <!-- 批量操作确认对话框 -->
    <el-dialog
      v-model="batchOperationDialogVisible"
      :title="batchOperation.title"
      width="400px"
    >
      <p>{{ batchOperation.message }}</p>
      <template #footer>
        <el-button @click="batchOperationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchOperation"
          >确认</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import LiveRoomPanel from "./components/LiveRoomPanel.vue";
import AddRoomDialog from "./components/AddRoomDialog.vue";

interface LiveRoom {
  id: string;
  roomInput: string;
  displayName: string;
  roomTitle: string;
  roomStatus: string;
  isLoaded: boolean;
  isMonitoring: boolean;
  unreadCount: number;
  streamUrls: Record<string, string>;
  danmakus: Array<{ id: number; user: string; content: string }>;
  aiDanmuEnabled: boolean;
  recordingStatus: Record<string, boolean>;
  createTime: number;
  lastActiveTime: number;
}

// ========== 响应式数据 ==========
const activeTab = ref<string>("");
const rooms = ref<LiveRoom[]>([]);
const addRoomDialogVisible = ref(false);
const batchOperationDialogVisible = ref(false);
const batchOperation = ref({
  title: "",
  message: "",
  action: "" as "start" | "stop",
});

// ========== 计算属性 ==========
const activeRooms = computed(() => rooms.value.filter((room) => room.isLoaded));
const monitoringRooms = computed(() =>
  rooms.value.filter((room) => room.isMonitoring)
);
const hasActiveRooms = computed(() => activeRooms.value.length > 0);

// ========== 直播间管理方法 ==========

/**
 * 添加新的直播间
 */
const addNewRoom = () => {
  addRoomDialogVisible.value = true;
};

/**
 * 创建新的直播间对象
 */
const createRoom = (roomInput: string, displayName: string): LiveRoom => {
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: roomId,
    roomInput,
    displayName: displayName || roomInput,
    roomTitle: "",
    roomStatus: "",
    isLoaded: false,
    isMonitoring: false,
    unreadCount: 0,
    streamUrls: {},
    danmakus: [],
    aiDanmuEnabled: false,
    recordingStatus: {},
    createTime: Date.now(),
    lastActiveTime: Date.now(),
  };
};

/**
 * 处理添加直播间
 */
const onRoomAdded = (roomData: { roomInput: string; displayName: string }) => {
  const newRoom = createRoom(roomData.roomInput, roomData.displayName);
  rooms.value.push(newRoom);
  activeTab.value = newRoom.id;
  saveToLocalStorage();
  ElMessage.success(`直播间 "${newRoom.displayName}" 已添加`);
};

/**
 * 移除直播间
 */
const removeRoom = async (roomId: string) => {
  const room = rooms.value.find((r) => r.id === roomId);
  if (!room) return;

  // 如果正在监听，先确认停止
  if (room.isMonitoring) {
    try {
      await ElMessageBox.confirm(
        `直播间 "${room.displayName}" 正在监听中，确定要移除吗？`,
        "确认移除",
        { type: "warning" }
      );
    } catch {
      return; // 用户取消
    }
  }

  // 移除房间
  const index = rooms.value.findIndex((r) => r.id === roomId);
  if (index > -1) {
    rooms.value.splice(index, 1);

    // 如果移除的是当前标签页，切换到其他标签页
    if (activeTab.value === roomId) {
      if (rooms.value.length > 0) {
        const newIndex = Math.min(index, rooms.value.length - 1);
        activeTab.value = rooms.value[newIndex].id;
      } else {
        activeTab.value = "";
      }
    }

    saveToLocalStorage();
    ElMessage.success(`直播间 "${room.displayName}" 已移除`);
  }
};

/**
 * 标签页切换处理
 */
const onTabChange = (tabName: string) => {
  const room = rooms.value.find((r) => r.id === tabName);
  if (room) {
    room.unreadCount = 0; // 清除未读消息数
    room.lastActiveTime = Date.now();
    // 只保存房间配置，不保存弹幕相关数据
    saveToLocalStorage();
  }
};

// ========== 直播间状态更新方法 ==========

/**
 * 处理直播间数据更新
 */
const onRoomUpdated = (roomId: string, updateData: Partial<LiveRoom>) => {
  const room = rooms.value.find((r) => r.id === roomId);
  if (room) {
    Object.assign(room, updateData);
    room.lastActiveTime = Date.now();
    saveToLocalStorage();
  }
};

/**
 * 处理监听状态变化
 */
const onMonitoringChanged = (roomId: string, isMonitoring: boolean) => {
  const room = rooms.value.find((r) => r.id === roomId);
  if (room) {
    room.isMonitoring = isMonitoring;
    room.lastActiveTime = Date.now();
    saveToLocalStorage();
  }
};

/**
 * 处理收到弹幕
 */
const onDanmakuReceived = (
  roomId: string,
  danmaku: { id: number; user: string; content: string }
) => {
  const room = rooms.value.find((r) => r.id === roomId);
  if (room) {
    room.danmakus.push(danmaku);

    // 如果不是当前活跃标签页，增加未读计数
    if (activeTab.value !== roomId) {
      room.unreadCount++;
    }

    room.lastActiveTime = Date.now();
    // 弹幕数据不需要保存到localStorage
    // saveToLocalStorage();
  }
};

// ========== 批量操作方法 ==========

/**
 * 批量开启监听
 */
const batchStartMonitor = () => {
  const availableRooms = activeRooms.value.filter((room) => !room.isMonitoring);
  if (availableRooms.length === 0) {
    ElMessage.warning("没有可以开启监听的直播间");
    return;
  }

  batchOperation.value = {
    title: "批量开启监听",
    message: `确定要为 ${availableRooms.length} 个直播间开启监听吗？`,
    action: "start",
  };
  batchOperationDialogVisible.value = true;
};

/**
 * 批量停止监听
 */
const batchStopMonitor = () => {
  const monitoringRooms = rooms.value.filter((room) => room.isMonitoring);
  if (monitoringRooms.length === 0) {
    ElMessage.warning("没有正在监听的直播间");
    return;
  }

  batchOperation.value = {
    title: "批量停止监听",
    message: `确定要为 ${monitoringRooms.length} 个直播间停止监听吗？`,
    action: "stop",
  };
  batchOperationDialogVisible.value = true;
};

/**
 * 确认批量操作
 */
const confirmBatchOperation = () => {
  batchOperationDialogVisible.value = false;

  // 这里将通过事件通知各个房间执行相应操作
  const event = new CustomEvent("batchOperation", {
    detail: { action: batchOperation.value.action },
  });
  window.dispatchEvent(event);

  ElMessage.success(
    `批量${batchOperation.value.action === "start" ? "开启" : "停止"}监听操作已执行`
  );
};

// ========== 数据持久化方法 ==========

/**
 * 保存到本地存储
 */
const saveToLocalStorage = () => {
  try {
    // 保存房间配置时排除弹幕数据
    const roomsToSave = rooms.value.map((room) => ({
      ...room,
      danmakus: [], // 不保存弹幕数据
      unreadCount: 0, // 不保存未读计数
      isMonitoring: false, // 不保存监听状态
    }));

    const dataToSave = {
      rooms: roomsToSave,
      activeTab: activeTab.value,
      timestamp: Date.now(),
    };
    localStorage.setItem("multi-live-rooms-data", JSON.stringify(dataToSave));
  } catch (error) {
    console.error("保存到本地存储失败:", error);
  }
};

/**
 * 从本地存储加载
 */
const loadFromLocalStorage = () => {
  try {
    const savedData = localStorage.getItem("multi-live-rooms-data");
    if (savedData) {
      const data = JSON.parse(savedData);
      // 只恢复基本信息，不恢复连接状态
      if (data.rooms && Array.isArray(data.rooms)) {
        rooms.value = data.rooms.map((room: LiveRoom) => ({
          ...room,
          isMonitoring: false, // 重启时清除监听状态
          unreadCount: 0, // 清除未读计数
        }));

        if (
          data.activeTab &&
          rooms.value.find((r) => r.id === data.activeTab)
        ) {
          activeTab.value = data.activeTab;
        } else if (rooms.value.length > 0) {
          activeTab.value = rooms.value[0].id;
        }
      }
    }
  } catch (error) {
    console.error("从本地存储加载失败:", error);
  }
};

// ========== 生命周期钩子 ==========

onMounted(() => {
  loadFromLocalStorage();
});

onUnmounted(() => {
  saveToLocalStorage();
});

// 页面刷新前保存数据
window.addEventListener("beforeunload", saveToLocalStorage);
</script>

<style scoped>
.multi-live-rooms {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.operation-card {
  margin-bottom: 20px;
}

.operation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.left-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.right-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tabs-card {
  min-height: 600px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.monitoring-tag {
  font-size: 10px;
  padding: 0 4px;
  height: 16px;
  line-height: 16px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .multi-live-rooms {
    padding: 12px;
  }

  .operation-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .left-actions {
    justify-content: center;
  }

  .right-info {
    justify-content: center;
  }
}

/* 深色主题适配 */
.dark .monitoring-tag {
  border-color: var(--el-color-success);
}
</style>
