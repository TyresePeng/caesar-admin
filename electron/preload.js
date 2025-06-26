const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  launchBrowser: (url) => ipcRenderer.invoke("launch-browser", url), // 启动浏览器，加载指定url，带storage文件
  launchBrowserNoFile: (
    url // 启动浏览器，不加载storage文件，直接打开url
  ) => ipcRenderer.invoke("launch-browser-no-file", url),
  saveStorageDefault: () => ipcRenderer.invoke("save-storage-default"), // 保存当前storage到默认文件
  exportStorageDefault: () => ipcRenderer.invoke("export-storage-default"), // 导出默认storage文件，弹出保存对话框
  saveStorageAndUpload: (
    fileId // 保存当前storage并上传，入参fileId（你可以用来构建文件名或上传时标识）
  ) => ipcRenderer.invoke("save-storage-and-upload", fileId),
  getStorageFile: (fileId) => ipcRenderer.invoke("get-storage-file", fileId), // 获取指定fileId的storage文件base64数据
  closeBrowser: () => ipcRenderer.invoke("close-browser"), // 关闭浏览器实例
  getCurrentStorageFile: () => ipcRenderer.invoke("get-current-storage-file"),
  // 启动浏览器并加载指定 storage JSON 字符串
  launchBrowserWithJson: (targetUrl, storageJson) =>
    ipcRenderer.invoke("launch-browser-with-json", targetUrl, storageJson),
});
