<template>
  <div class="app-container" v-loading="loading">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item prop="keywords" label="关键字">
          <el-input
            v-model="queryParams.keywords"
            placeholder="角色名称"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery"
            ><i-ep-search />搜索</el-button
          >
          <el-button @click="handleResetQuery"><i-ep-refresh />重置</el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-card shadow="never" class="table-container">
      <template #header>
        <el-button type="success" @click="handleOpenDialog()">
          <i-ep-plus />新增
        </el-button>
        <el-button
          type="danger"
          :disabled="ids.length === 0"
          @click="handleDelete()"
        >
          <i-ep-delete />删除
        </el-button>
      </template>

      <el-table
        :data="roleList"
        border
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="帐号名称" />
        <el-table-column prop="code" label="平台">
          <template #default="scope">
            <el-tag v-if="scope.row.code === douyin">抖音</el-tag>
            <el-tag v-if="scope.row.code === xiaohonshu">小红书</el-tag>
            <el-tag v-if="scope.row.code === weixin">微信</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" align="center" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 1" type="success">正常</el-tag>
            <el-tag v-else type="info">失效</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="350">
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
              @click="
                authLoin(
                  scope.row.id,
                  scope.row.status,
                  scope.row.sessionStorage,
                  scope.row.code
                )
              "
              >授权登录</el-button
            >
            <el-button
              type="success"
              size="small"
              @click="authLoinSuc(scope.row.id, scope.row.status)"
              >授权</el-button
            >
            <el-button
              type="warning"
              size="small"
              @click="closeAuthLoin(scope.row.id)"
              >关闭浏览器</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="handleQuery"
      />
    </el-card>
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="500px"
      @close="handleCloseDialog"
    >
      <el-form
        ref="roleFormRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="帐号名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入帐号名称" />
        </el-form-item>
        <el-form-item label="平台" prop="code">
          <el-radio-group v-model="formData.code">
            <el-radio :label="douyin">抖音</el-radio>
            <!-- <el-radio :label="xiaohonshu">小红书</el-radio> -->
            <!-- <el-radio :label="weixin">微信</el-radio> -->
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number
            v-model="formData.sort"
            controls-position="right"
            :min="0"
            style="width: 100px"
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
import platformApi from "@/api/platform";

defineOptions({ name: "Platform", inheritAttrs: false });

const douyin = "douyin";
const xiaohonshu = "xiaohonshu";
const weixin = "weixin";

const queryFormRef = ref<InstanceType<typeof ElForm>>();
const roleFormRef = ref<InstanceType<typeof ElForm>>();

const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);
const roleList = ref<any[]>([]);

const queryParams = reactive<any>({
  pageNum: 1,
  pageSize: 10,
  keywords: "",
});

const dialog = reactive({
  title: "",
  visible: false,
});

const formData = reactive<any>({
  sort: 1,
  code: douyin,
  name: "",
  id: undefined,
});

const rules = reactive({
  name: [{ required: true, message: "请输入帐号名称", trigger: "blur" }],
  code: [{ required: true, message: "请选择平台", trigger: "change" }],
  sort: [
    { required: true, type: "number", message: "请输入排序", trigger: "blur" },
  ],
});

function handleQuery() {
  loading.value = true;
  platformApi
    .listPlatformUserPage(queryParams)
    .then((res) => {
      total.value = res.total;
      roleList.value = res.records;
    })
    .finally(() => {
      loading.value = false;
    });
}

function handleResetQuery() {
  queryParams.keywords = "";
  queryParams.pageNum = 1;
  handleQuery();
}

function handleSelectionChange(selection: any[]) {
  ids.value = selection.map((item) => item.id);
}

function handleOpenDialog(roleId?: number) {
  dialog.visible = true;
  dialog.title = roleId ? "编辑帐号" : "新增帐号";
  if (!roleId) {
    formData.name = "";
    formData.code = douyin;
    formData.sort = 1;
    formData.id = undefined;
  }
}

function handleSubmit() {
  roleFormRef.value?.validate((valid) => {
    if (valid) {
      loading.value = true;
      platformApi
        .savePlatformUser(formData)
        .then(() => {
          ElMessage.success("保存成功");
          handleQuery();
          dialog.visible = false;
        })
        .finally(() => {
          loading.value = false;
        });
    }
  });
}

function handleDelete(roleId?: number) {
  const deleteIds = roleId ? [roleId] : ids.value;
  if (deleteIds.length === 0) {
    ElMessage.warning("请选择要删除的数据");
    return;
  }

  ElMessageBox.confirm("是否确认删除选中的帐号？", "提示", {
    type: "warning",
  }).then(() => {
    loading.value = true;
    platformApi
      .deletePlatformUser(deleteIds)
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

function handleCloseDialog() {
  dialog.visible = false;
}

function authLoin(
  roleId: number,
  ststus: number,
  storageJson: string,
  code: string
) {
  ElMessage.success(code + "授权开始");
  if (code === douyin) {
    if (
      storageJson !== undefined &&
      storageJson !== "" &&
      storageJson !== null
    ) {
      openBrowserJson("https://www.douyin.com/?recommend=1", storageJson);
    } else {
      openBrowser("https://www.douyin.com/?recommend=1");
    }
  }
}

async function authLoinSuc(roleId: string, status: number) {
  loading.value = true;
  try {
    const res = await window.electronAPI.getCurrentStorageFile();
    if (!res.success) {
      ElMessage.error("获取当前浏览器 StorageState 失败：" + res.message);
      return;
    }
    // base64 转 File 对象
    const file = await (async () => {
      const response = await fetch(
        `data:application/json;base64,${res.base64}`
      );
      const blob = await response.blob();
      return new File([blob], res.fileName, { type: "application/json" });
    })();
    await platformApi
      .uploadStorageFile(file, roleId)
      .then(() => {
        ElMessage.success("当前浏览器 StorageState 上传成功");
        handleQuery();
      })
      .catch((err) => {
        ElMessage.error("当前浏览器 StorageState 上传失败" + err);
      });
  } finally {
    loading.value = false;
  }
}

function closeAuthLoin(roleId: number) {
  closeBrowser();
}

function closeBrowser() {
  loading.value = true;
  window.electronAPI
    .closeBrowser()
    .then(() => {
      ElMessage.success("浏览已关闭");
    })
    .catch((err) => {
      ElMessage.error("浏览已失败");
    })
    .finally(() => {
      loading.value = false;
    });
}

function openBrowserJson(targetUrl: string, storageJson: string) {
  loading.value = true;
  window.electronAPI
    .launchBrowserWithJson(targetUrl, storageJson)
    .then((res) => {
      console.log("打开结果:", res);
    })
    .catch(console.error)
    .finally(() => {
      loading.value = false;
    });
}
onMounted(() => {
  handleQuery();
});

function openBrowser(url: string) {
  loading.value = true;
  window.electronAPI
    .launchBrowserNoFile(url)
    .then(() => {
      ElMessage.success("浏览器已启动");
    })
    .catch((err) => {
      ElMessage.error("启动失败" + err);
    })
    .finally(() => {
      loading.value = false;
    });
}
onMounted(() => {
  handleQuery();
});
</script>
