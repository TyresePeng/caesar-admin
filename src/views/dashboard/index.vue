<template>
  <div class="doc-container">
    <h1>Caesar Admin</h1>

    <section>
      <p>
        <strong>Caesar Admin</strong> 是一个基于
        <code>Vue3 + Vite + TypeScript</code>
        构建的现代化后台管理系统模板，并集成
        <code>Electron</code> 实现跨平台桌面应用打包。
        项目集成了任务管理、用户授权管理、直播间控制等模块，适用于多平台数据采集、弹幕监控与运营工具开发。
      </p>
    </section>

    <section>
      <h2>📌 项目简介</h2>
      <ul>
        <li><strong>项目名称：</strong> <code>caesar-crawler</code></li>
        <li><strong>主要用途：</strong>后台管理界面 + 桌面应用程序</li>
        <li><strong>核心特点：</strong></li>
        <ul>
          <li>现代前端架构：Vue3 + Vite + TypeScript</li>
          <li>跨平台支持：Electron 打包为桌面应用</li>
          <li>多账户授权管理：Playwright 模拟登录</li>
          <li>多任务调度与爬取：支持短视频内容抓取</li>
          <li>弹幕监控：接入直播间弹幕与录制控制</li>
          <li>工程规范完善：Git 提交、代码格式、类型校验等全流程支持</li>
          <li>
            服务端地址：<a
              href="https://github.com/TyresePeng/caesar"
              target="_blank"
              rel="noopener noreferrer"
              >https://github.com/TyresePeng/caesar</a
            >
          </li>
        </ul>
      </ul>
    </section>

    <section>
      <h2>💡 技术栈</h2>
      <table>
        <thead>
          <tr>
            <th>类别</th>
            <th>技术/工具</th>
            <th>版本</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>前端框架</td>
            <td>Vue</td>
            <td>^3.4.29</td>
          </tr>
          <tr>
            <td>构建工具</td>
            <td>Vite</td>
            <td>^5.3.1</td>
          </tr>
          <tr>
            <td>类型系统</td>
            <td>TypeScript</td>
            <td>^5.4.5</td>
          </tr>
          <tr>
            <td>状态管理</td>
            <td>Pinia</td>
            <td>^2.1.7</td>
          </tr>
          <tr>
            <td>UI 框架</td>
            <td>Element Plus</td>
            <td>^2.7.5</td>
          </tr>
          <tr>
            <td>HTTP 请求</td>
            <td>Axios</td>
            <td>^1.7.2</td>
          </tr>
          <tr>
            <td>桌面应用</td>
            <td>Electron</td>
            <td>^36.3.2</td>
          </tr>
          <tr>
            <td>打包工具</td>
            <td>Electron Builder</td>
            <td>^26.0.12</td>
          </tr>
          <tr>
            <td>爬虫框架</td>
            <td>Playwright（Node 支持）</td>
            <td>自定义集成</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>🧩 功能模块</h2>
      <ul>
        <li>
          <strong>用户池管理</strong>
          <ul>
            <li>利用 Playwright 打开第三方平台登录页</li>
            <li>用户扫码后自动保存登录状态（如 cookies、storage）</li>
            <li>登录信息以 Playwright 文件形式保存至后端</li>
            <li>多用户集中管理，支持任务调度调用</li>
          </ul>
        </li>
        <li>
          <strong>任务工作台（短视频采集）</strong>
          <ul>
            <li>自定义任务配置：关键词、平台、页数、爬取频率等</li>
            <li>支持批量执行、任务状态追踪、历史结果查看</li>
            <li>后台统一调度 Playwright 启动浏览器并采集短视频数据</li>
          </ul>
        </li>
        <li>
          <strong>直播间控制台</strong>
          <ul>
            <li>实时弹幕展示：展示直播间弹幕、互动内容</li>
            <li>AI 回复模拟（功能预留，暂未实现）</li>
            <li>录制控制：支持开始/停止录制直播视频，自动保存为 MP4</li>
          </ul>
        </li>
      </ul>
    </section>

    <section>
      <h2>🚀 快速安装（适用于普通用户）</h2>
      <p>
        如果你只是想<strong>快速使用桌面应用</strong>，无需环境配置，直接下载安装即可：
      </p>

      <h3>🖥️ macOS 安装包（Apple 芯片M1/M2/M3）</h3>
      <p>
        <a
          href="https://github.com/TyresePeng/caesar-admin/releases/download/v1.0.0/caesar-media-1.0.0-arm64.dmg"
          target="_blank"
          rel="noopener noreferrer"
          >点击下载 caesar-media-1.0.0-arm64.dmg</a
        >
      </p>
      <ul>
        <li>支持 macOS Apple Silicon (M1/M2/M3) 系列</li>
        <li>下载后双击安装即可使用</li>
      </ul>
      <p>
        <strong>⚠️ 安装后需确保后端服务已启动，否则部分功能将不可用</strong>
      </p>
      <p>
        服务端地址：<a
          href="https://github.com/TyresePeng/caesar"
          target="_blank"
          rel="noopener noreferrer"
          >https://github.com/TyresePeng/caesar</a
        >
      </p>
    </section>

    <section>
      <h2>✅ 开发者模式启动（适用于开发调试）</h2>
      <pre><code>
# 克隆项目
git clone https://github.com/TyresePeng/caesar-admin.git

# 进入项目目录
cd caesar-admin

# 安装 playwright 环境
npx playwright install

# 安装 pnpm（如未安装）
npm install -g pnpm

# 安装依赖
pnpm install

# 启动前端开发服务
pnpm dev

# 启动 Electron 桌面应用（开发模式）
pnpm electron:dev
      </code></pre>
    </section>

    <section>
      <h2>📦 打包与工程规范</h2>
      <h3>🛠️ 打包桌面应用</h3>
      <pre><code>
# 安装 playwright 环境
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install

# 使用 Electron Builder 打包桌面应用（支持 Mac/Windows/Linux）
pnpm electron:build
      </code></pre>
      <p>构建产物将在 <code>dist_app/</code> 目录中生成。</p>

      <h3>🧪 工程规范配置</h3>
      <ul>
        <li>
          ✅ <strong>统一代码风格</strong>：使用 ESLint + Prettier + Stylelint
        </li>
        <li>
          ✅ <strong>Git 提交规范</strong>：Husky + Commitlint + Commitizen
        </li>
        <li>✅ <strong>提交前自动格式化</strong>：lint-staged + prettier</li>
        <li>✅ <strong>TypeScript 严格类型检查</strong>：全面 tsconfig 设置</li>
        <li>
          ✅ <strong>统一编辑器配置</strong>：<code>.editorconfig</code>
          保持多开发者一致风格
        </li>
        <li>✅ <strong>目录结构清晰</strong>：支持多模块拆分与懒加载</li>
      </ul>
    </section>

    <section>
      <h2>📝 注意事项</h2>
      <ul>
        <li>
          修改 <code>.env.development</code> 中的
          <code>VITE_MOCK_DEV_SERVER</code> 可切换是否启用 Mock 数据
        </li>
        <li>
          若需连接本地后端，设置
          <code>VITE_APP_API_URL=http://localhost:8989</code>
        </li>
        <li>
          若组件类型提示报错，尝试重启 VSCode 或执行
          <code>pnpm install</code> 修复依赖
        </li>
        <li>Electron 调试日志详见 <code>logs/</code> 目录</li>
      </ul>
    </section>

    <section>
      <h2>📚 参考文档</h2>
      <ul>
        <li>
          <a
            href="https://blog.csdn.net/u013737132/article/details/130191394"
            target="_blank"
            rel="noopener noreferrer"
            >Vue3 + Vite + TS 后台管理系统搭建</a
          >
        </li>
        <li>
          <a
            href="https://blog.csdn.net/u013737132/article/details/130191363"
            target="_blank"
            rel="noopener noreferrer"
            >Git 提交规范指南</a
          >
        </li>
        <li>
          <a
            href="https://playwright.dev/"
            target="_blank"
            rel="noopener noreferrer"
            >Playwright 官方文档</a
          >
        </li>
        <li>
          <a
            href="https://www.electronjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            >Electron 官方指南</a
          >
        </li>
      </ul>
    </section>

    <section>
      <h2>📌 TODO（后续规划）</h2>
      <ul>
        <li>AI 自动弹幕回复集成（ChatGPT）</li>
        <li>任务类型支持：短视频自动批量发布、短视频评论采集</li>
        <li>多平台支持（抖音、快手、B站等）</li>
      </ul>
    </section>

    <section>
      <h2>📬 联系方式</h2>
      <p>如有需求要，请联系：</p>
      <blockquote>
        <p><strong>开发者</strong>：Tyrese</p>
        <p><strong>邮箱</strong>：tyrese.guo@gmail.com</p>
        <p>
          <strong>项目地址</strong>：<a
            href="https://github.com/TyresePeng/caesar-admin"
            target="_blank"
            rel="noopener noreferrer"
            >GitHub</a
          >
        </p>
      </blockquote>

      <h3>🧑‍💻 微信交流群</h3>
      <div class="wechat-container">
        <div class="wechat-item">
          <img
            src="https://raw.githubusercontent.com/TyresePeng/caesar/main/docs/chat.png"
            alt="微信群二维码"
          />
          <p><strong>微信群二维码</strong></p>
        </div>
        <div class="wechat-item">
          <img
            src="https://raw.githubusercontent.com/TyresePeng/caesar/main/docs/chat_tyrese.png"
            alt="作者微信"
          />
          <p><strong>作者微信</strong></p>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
// 你可以添加合适的 TS 逻辑或 Props，目前纯展示无需逻辑
</script>

<style scoped>
.doc-container {
  padding: 20px 24px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  color: #333;
  line-height: 1.6;
  max-width: 900px;
  margin: 0 auto;
}

h1 {
  font-weight: 700;
  font-size: 2.4rem;
  margin-bottom: 24px;
  color: #2c3e50;
}

h2 {
  font-weight: 600;
  font-size: 1.8rem;
  margin-bottom: 16px;
  border-bottom: 2px solid #eee;
  padding-bottom: 6px;
}

h3 {
  font-weight: 600;
  font-size: 1.4rem;
  margin-top: 20px;
  margin-bottom: 12px;
}

ul {
  list-style: disc inside;
  padding-left: 0;
  margin-bottom: 16px;
}

.flex-container {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.flex-item {
  flex: 1;
  background-color: #fafafa;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
}

pre {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 24px;
}

table,
th,
td {
  border: 1px solid #ccc;
}

th,
td {
  padding: 8px 12px;
  text-align: left;
}

a {
  color: #3498db;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.wechat-container {
  display: flex;
  gap: 24px;
  margin-top: 12px;
}

.wechat-item {
  text-align: center;
}

.wechat-item img {
  width: 180px;
  border-radius: 8px;
  border: 1px solid #ccc;
}

.wechat-item p {
  margin-top: 6px;
  font-weight: 600;
  color: #555;
}
</style>
