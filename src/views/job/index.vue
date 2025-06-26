<template>
  <div class="app-container" v-loading="loading">
    <!-- 搜索区域 -->
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="任务标题" prop="title">
          <el-input
            v-model="queryParams.title"
            placeholder="请输入任务标题"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="数据源" prop="origin">
          <el-select
            style="min-width: 100px"
            v-model="queryParams.platform"
            placeholder="请选择平台"
            clearable
          >
            <el-option
              v-for="item in platformOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="任务类型" prop="jobType">
          <el-select
            v-model="queryParams.jobType"
            placeholder="请选择任务类型"
            style="min-width: 120px"
            clearable
          >
            <el-option
              v-for="item in jobTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <i-ep-search />搜索
          </el-button>
          <el-button @click="handleResetQuery">
            <i-ep-refresh />重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格区域 -->
    <el-card shadow="never" class="table-container">
      <template #header>
        <el-button type="success" @click="handleOpenDialog()">
          <i-ep-plus />新增
        </el-button>
      </template>

      <el-table :data="jobConfigList" border stripe style="width: 100%">
        <el-table-column prop="title" label="任务标题" />
        <el-table-column prop="platformCode" label="平台编码">
          <template #default="scope">
            <el-tag v-if="scope.row.platformCode === 'douyin'">抖音</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="jobType" label="任务类型">
          <template #default="scope">
            <el-tag v-if="scope.row.jobType === 'VIDEO_CAPTURE'"
              >抓取视频</el-tag
            >
          </template>
        </el-table-column>
        <el-table-column prop="params" show-overflow-tooltip label="任务参数" />
        <el-table-column prop="cron" label="cron表达式" />
        <el-table-column label="状态" align="center" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 1" type="success">启用</el-tag>
            <el-tag v-if="scope.row.status === 3" type="success"
              >执行完成</el-tag
            >
            <el-tag v-if="scope.row.status === 0" type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" />
        <el-table-column prop="updateTime" label="更新时间" />
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(scope.row.id)"
            >
              删除
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="handleOpen(scope.row.id, scope.row.status)"
              >启用/禁用</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="handleQuery"
      />
    </el-card>

    <!-- 弹窗表单 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="600px"
      @close="handleCloseDialog"
    >
      <el-form
        ref="jobConfigFormRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="任务标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="定时表达式" prop="cron">
          <el-input v-model="formData.cron" placeholder="cron定时任务表达式" />
        </el-form-item>
        <el-form-item label="平台编码" prop="platformCode">
          <el-select v-model="formData.platformCode" placeholder="请选择平台">
            <el-option
              v-for="item in platformOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="任务类型" prop="jobType">
          <el-select v-model="formData.jobType" placeholder="请选择任务类型">
            <el-option
              v-for="item in jobTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="执行参数" prop="params">
          <el-input
            type="textarea"
            v-model="formData.params"
            placeholder="请输入执行参数（JSON格式）"
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleSubmit">确 定</el-button>
          <el-button @click="handleCloseDialog">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import jobConfigApi from "@/api/jobConfig";
const loading = ref(false);
// 字典定义
const platformOptions = [
  { label: "抖音", value: "douyin" },
  // { label: "快手", value: "kuaishou" },
];

const jobTypeOptions = [
  { label: "抓取视频", value: "VIDEO_CAPTURE" },
  // { label: "生成脚本", value: "generate_script" },
  // { label: "转码视频", value: "transcode_video" },
];

const queryFormRef = ref<InstanceType<typeof ElForm>>();
const jobConfigFormRef = ref<InstanceType<typeof ElForm>>();

const ids = ref<number[]>([]);
const total = ref(0);
const jobConfigList = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  title: "",
  platformCode: "",
  jobType: "",
});

const dialog = reactive({
  title: "",
  visible: false,
});

const formData = reactive({
  id: undefined as number | undefined,
  title: "",
  platformCode: "",
  jobType: "",
  params: "",
  cron: "*/5 * * * * *",
});

const rules = reactive({
  title: [{ required: true, message: "请输入任务标题", trigger: "blur" }],
  platformCode: [
    { required: true, message: "请选择平台编码", trigger: "change" },
  ],
  jobType: [{ required: true, message: "请选择任务类型", trigger: "change" }],
  cron: [{ required: true, message: "请输入定时任务表达式", trigger: "blur" }],
});

async function handleQuery() {
  loading.value = true;
  try {
    const params = {
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      title: queryParams.title || undefined,
      platformCode: queryParams.platformCode || undefined,
      jobType: queryParams.jobType || undefined,
    };
    const res = await jobConfigApi.listJobConfigPage(params);
    total.value = res.total;
    jobConfigList.value = res.records;
  } catch (error) {
    ElMessage.error("查询失败");
  } finally {
    loading.value = false;
  }
}

function handleResetQuery() {
  queryParams.title = "";
  queryParams.platformCode = "";
  queryParams.jobType = "";
  queryParams.pageNum = 1;
  queryParams.pageSize = 10;
  handleQuery();
}

function handleSelectionChange(selection: any[]) {
  ids.value = selection.map((item) => item.id);
}

function handleSubmit() {
  loading.value = true;
  jobConfigFormRef.value?.validate(async (valid) => {
    if (valid) {
      try {
        await jobConfigApi.saveJobConfig(formData);
        ElMessage.success("保存成功");
        handleQuery();
        dialog.visible = false;
      } catch {
        ElMessage.error("保存失败");
      } finally {
        loading.value = false;
      }
    }
  });
}

function handleDelete(id?: number) {
  const deleteIds = id ? [id] : ids.value;
  if (deleteIds.length === 0) {
    ElMessage.warning("请选择要删除的数据");
    return;
  }

  ElMessageBox.confirm("是否确认删除选中的任务配置？", "提示", {
    type: "warning",
  })
    .then(async () => {
      loading.value = true;
      try {
        await jobConfigApi.deleteJobConfig(deleteIds);
        ElMessage.success("删除成功");
        handleQuery();
        handleQuery();
      } catch {
        ElMessage.error("删除失败");
      }
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleOpenDialog() {
  dialog.visible = true;
}
function handleCloseDialog() {
  dialog.visible = false;
}

async function handleOpen(id: number, status: number) {
  loading.value = true;
  let updateData;
  if (status === 1) {
    updateData = { status: "0" };
  } else {
    updateData = { status: "1" };
  }
  await jobConfigApi
    .update(id, updateData)
    .then(() => {
      ElMessage.success("修改成功");
      handleQuery();
    })
    .catch(() => {
      ElMessage.error("修改失败");
    })
    .finally(() => {
      loading.value = false;
    });
}
onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}

.search-container {
  margin-bottom: 20px;
}

.table-container {
  margin-top: 10px;
}

.dialog-footer {
  text-align: right;
}
</style>
