const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const waitOn = require("wait-on");
const { chromium } = require("playwright");
const dotenv = require("dotenv");
const ROOT = process.cwd(); // or use path.join(__dirname, "../")
const NODE_ENV = process.env.NODE_ENV || "development";
const envPath = path.join(ROOT, `.env.${NODE_ENV}`);
dotenv.config({ path: envPath });
const userDataDir = app.getPath("userData");
const storageStateName = "test.storageState.json";
const storageStatePath = path.join(userDataDir, storageStateName);

let mainWindow;
let browser = null; // 用于保存 Chromium 浏览器实例
let browserContext = null; // 用于保存上下文（已有的你应该已经有了）
// 创建主窗口
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (NODE_ENV) {
    const devServerUrl = `http://localhost:${process.env.VITE_APP_PORT}`;
    try {
      console.log(`⏳ 等待${devServerUrl} Vite 服务启动...`);
      await waitOn({ resources: [devServerUrl], timeout: 30000 });
      await mainWindow.loadURL(devServerUrl);
      console.log("✅ Electron 服务启动成功");
    } catch (err) {
      console.error("❌ 等待 Vite 服务失败", err);
      mainWindow.loadURL("data:text/html,<h2>无法加载 Vite 开发服务器</h2>");
    }
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

//
// ========== IPC 方法注册 ==========
//

// 启动浏览器（加载默认 storage 文件）
ipcMain.handle("launch-browser", async (_, targetUrl) => {
  const contextDir = path.join(userDataDir, "playwright-profile");
  const hasState = fs.existsSync(storageStatePath);

  browserContext = await chromium.launchPersistentContext(contextDir, {
    headless: false,
    storageState: hasState ? storageStatePath : undefined,
  });

  const page = await browserContext.newPage();
  await page.goto(targetUrl || "https://example.com");
  return "浏览器已打开";
});

// 启动浏览器（不加载 storage 文件）
ipcMain.handle("launch-browser-no-file", async (_, targetUrl) => {
  // 如果已有浏览器上下文和浏览器，先关闭
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }

  // 启动无痕浏览器实例
  browser = await chromium.launch({ headless: false });
  browserContext = await browser.newContext();

  const page = await browserContext.newPage();
  await page.goto(targetUrl || "https://example.com");

  return "浏览器已打开（无持久化 storage）";
});

// 保存默认 storage 文件（固定名）
ipcMain.handle("save-storage-default", async () => {
  if (!browserContext) return "未打开浏览器";

  await browserContext.storageState({ path: storageStatePath });
  return `StorageState 已保存为 ${storageStateName}`;
});

// 导出默认 storage 文件到用户指定路径
ipcMain.handle("export-storage-default", async () => {
  if (!fs.existsSync(storageStatePath)) {
    return { success: false, message: "未找到默认的 StorageState 文件" };
  }

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "保存 StorageState 文件",
    defaultPath: storageStateName,
    filters: [{ name: "JSON 文件", extensions: ["json"] }],
  });

  if (canceled || !filePath) {
    return { success: false, message: "用户取消了保存" };
  }

  fs.copyFileSync(storageStatePath, filePath);
  return { success: true, message: `已导出到 ${filePath}` };
});

// 保存 storage 文件（指定 fileId）并返回 base64
ipcMain.handle("save-storage-and-upload", async (_, fileId) => {
  if (!browserContext) return { success: false, message: "未打开浏览器" };
  if (!fileId) return { success: false, message: "缺少 fileId 参数" };

  const fileName = `${fileId}.storageState.json`;
  const filePath = path.join(userDataDir, fileName);

  await browserContext.storageState({ path: filePath });

  if (!fs.existsSync(filePath)) {
    return { success: false, message: "StorageState 文件保存失败" };
  }

  const buffer = fs.readFileSync(filePath);
  return {
    success: true,
    fileName,
    base64: buffer.toString("base64"),
    message: "StorageState 已保存并返回",
  };
});

// IPC：获取当前 Playwright 浏览器的 StorageState 内容（base64）
ipcMain.handle("get-current-storage-file", async () => {
  if (!browserContext) {
    return { success: false, message: "浏览器未打开" };
  }
  try {
    // Playwright 的 storageState() 返回一个对象，参数传 path 会写文件，不传则返回对象
    const storageStateObj = await browserContext.storageState();

    // 转成 JSON 字符串
    const storageJsonStr = JSON.stringify(storageStateObj);

    // 转 Buffer，再 base64 编码返回
    const buffer = Buffer.from(storageJsonStr, "utf-8");

    return {
      success: true,
      fileName: "current.storageState.json",
      base64: buffer.toString("base64"),
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "获取 StorageState 失败",
    };
  }
});
// 获取指定 fileId 的 storage 文件流（base64）
ipcMain.handle("get-storage-file", async (_, fileId) => {
  if (!fileId) return { success: false, message: "缺少 fileId 参数" };

  const fileName = `${fileId}.storageState.json`;
  const filePath = path.join(userDataDir, fileName);

  if (!fs.existsSync(filePath)) {
    return { success: false, message: "StorageState 文件不存在" };
  }

  const buffer = fs.readFileSync(filePath);
  return {
    success: true,
    fileName,
    base64: buffer.toString("base64"),
  };
});

// 启动浏览器并使用传入的 storage JSON 字符串
ipcMain.handle(
  "launch-browser-with-json",
  async (_, targetUrl, storageJson) => {
    if (!targetUrl || !storageJson) {
      return { success: false, message: "缺少 targetUrl 或 storageJson 参数" };
    }

    try {
      // 如果已有上下文或浏览器，先关闭
      if (browserContext) {
        await browserContext.close();
        browserContext = null;
      }
      if (browser) {
        await browser.close();
        browser = null;
      }

      // 写入 storage JSON 到临时文件
      const fileName = "temp.storageState.json";
      const filePath = path.join(userDataDir, fileName);
      fs.writeFileSync(filePath, storageJson, "utf-8");

      // 启动 browserContext 并加载页面
      browser = await chromium.launch({ headless: false });
      browserContext = await browser.newContext({ storageState: filePath });

      const page = await browserContext.newPage();
      await page.goto(targetUrl);

      return { success: true, message: "浏览器已打开并加载 storageState" };
    } catch (err) {
      return { success: false, message: `启动失败：${err.message}` };
    }
  }
);
// 关闭浏览器
ipcMain.handle("close-browser", async () => {
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
    return "浏览器已关闭";
  } else {
    return "浏览器未打开";
  }
});
