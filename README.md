# AI 角色扮演工作室

基于 **Vue 3 + TypeScript + Pinia + Vite** 的角色扮演创作工具。可以创建故事、管理角色、多会话聊天，并接入本地 **Ollama** 与 **ComfyUI** 生成能力。

## 技术栈

| 层面 | 选型 |
| --- | --- |
| 框架 | Vue 3.4（组合式 API + `<script setup>`） |
| 语言 | TypeScript 5.3，`vue-tsc` 全量类型检查 |
| 状态管理 | Pinia 2.1（setup store 写法） |
| 构建 | Vite 5.1 |
| 数据持久化 | localStorage（`services/storage.ts`） |
| AI 能力 | Ollama Chat API（支持 SSE 流式）/ ComfyUI HTTP API |

## 功能

- **故事库**：创建、浏览、编辑故事，按封面色区分
- **角色设定**：每个故事可挂载多个角色与系统提示词
- **多会话**：同一故事下可并行多个会话，独立保存
- **流式对话**：接入 Ollama，逐字渲染回复（`onToken` 回调）
- **设置面板**：可配置 Ollama 地址、模型名、系统提示词
- **本地优先**：全部数据存在 localStorage，无需后端即可运行

## 目录结构

```
src/
├─ components/           # 6 个组件
│  ├─ Library.vue        #   故事库（列表页）
│  ├─ StoryDetail.vue    #   故事详情
│  ├─ StoryModal.vue     #   创建/编辑故事弹窗
│  ├─ ChatView.vue       #   聊天主界面
│  ├─ TopBar.vue         #   顶部导航
│  └─ Toast.vue          #   轻提示
├─ services/             # 服务层（与 UI 解耦）
│  ├─ ollama.ts          #   Ollama 对话 / 流式输出
│  ├─ comfyui.ts         #   ComfyUI 图片生成
│  └─ storage.ts         #   localStorage 读写与版本兼容
├─ stores/
│  └─ main.ts            # Pinia 主 store：故事 / 会话 / 设置
├─ types/
│  └─ index.ts           # 全局类型定义
├─ App.vue
└─ main.ts
```

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:5173

### 接入 Ollama

```bash
# 先在本机启动 Ollama
ollama serve
ollama pull qwen2.5:7b
```

然后在应用「设置」里填：
- 地址：`http://localhost:11434`
- 模型：`qwen2.5:7b`

> 不连 Ollama 也能用——故事库、会话、设置这些功能完全本地化运行。

## 构建

```bash
npm run build     # vue-tsc 类型检查 + vite build
npm run preview
```

## 说明

个人练习项目，用于实践 Vue 3 组合式 API、Pinia 状态管理与外部 AI 服务的流式对接。
