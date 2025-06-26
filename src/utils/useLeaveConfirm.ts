import { onMounted, onBeforeUnmount, Ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { ElMessageBox } from "element-plus";

interface LeaveConfirmOptions {
  isMonitoring: Ref<boolean>;
  isRecording: Ref<boolean>;
  stopMonitor?: () => void;
  message?: string; // 弹窗提示文案
}

export function useLeaveConfirm(options: LeaveConfirmOptions) {
  const {
    isMonitoring,
    isRecording,
    stopMonitor,
    message = "当前正在监听或录制，确定要离开此页面吗？",
  } = options;

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (isMonitoring.value || isRecording.value) {
      event.preventDefault();
      event.returnValue = message; // 触发浏览器默认提示
    }
  }

  onMounted(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  onBeforeRouteLeave(async (to, from, next) => {
    if (isMonitoring.value || isRecording.value) {
      try {
        await ElMessageBox.confirm(message, "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
          closeOnClickModal: false,
          closeOnPressEscape: false,
        });
        // 用户点击确定
        stopMonitor?.();
        next();
      } catch (err) {
        // 用户点击取消或关闭弹窗
        next(false);
      }
    } else {
      next();
    }
  });
}
