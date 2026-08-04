# OpenGEO 开源前端 — AI 二次开发说明

面向 Cursor / Copilot 等工具。人类用户第一次部署请看 [README.md](./README.md) 与 [openbackend 必做清单](../openbackend/README.md)。

## 仓库定位

开源 SaaS 控制台：GEO 工作流（开始优化 / 最新优化）、驾驶舱 `DataScreen`、知识库、语义 SEO、站点管理、Admin 后台。

**Open 版 A/B 开关**：读 `VITE_OPTIMIZATION_OPS_MODE`（默认 B）。B：驾驶舱「发布设置」Tab；A：范文/仿写 + 三方发稿。周期扣费与撰文/发稿在云端执行；监控区可只读展示交付链接。Admin 保留**工作流转移**，运营填 URL 仅在云端 Admin。

已移除侧栏与路由：全域看板、心智模拟、爬虫任务、监控日志页、基准报警、旧版现状分析列表等。

## 跑通系统：必填项

1. **openbackend** 按 README 完成 `.env`、bootstrap、uvicorn:8002、Celery、Admin「日常 AI 通道」。
2. **本仓库** `cp .env.example .env.local`，设置 `VITE_API_BASE_URL=http://localhost:8002`。
3. `npm install && npm run dev`。

Admin 日常 AI 菜单：`config/adminMenu.ts` → 分组 `ai` → `ModuleType.LLM_CHANNELS`（文案键 `llmChannelsMenu` =「日常 AI 通道」）。

## 目录要点

| 路径 | 说明 |
|------|------|
| `App.tsx` | 模块路由中枢（`ModuleType` switch） |
| `config/menuByRole.ts` | 侧栏菜单与角色权限 |
| `config/adminMenu.ts` | Admin 侧栏（含日常 AI 通道入口） |
| `constants/optimizationMode.ts` | 读 `VITE_OPTIMIZATION_OPS_MODE`；与云端 `OPTIMIZATION_OPS_MODE` 对齐 |
| `components/StartOptimization/OptimizationCockpit/PublishSettingsPanel.tsx` | 发布设置 UI |
| `components/LlmChannelManagement.tsx` | Admin 日常 AI 通道 UI |
| `components/DataScreen.tsx` | 驾驶舱（`dashboardAPI` 可见度） |
| `api/geoWorkflow.ts` | 工作流 API 与 phase 类型 |
| `api/llmChannel.ts` | 日常 AI 通道 Admin API |

## 加新功能页

1. 在 `types.ts` 增加 `ModuleType`（若需要新入口）。
2. `menuByRole.ts` 的 `SIDEBAR_MENU_ITEMS` / `ROLE_MENU_IDS` 配置可见性。
3. `App.tsx` lazy import 组件并添加 `renderModule` 分支。
4. 文案放入 `i18n/locales/{zh,en}/`。

## 注意

- 废弃 `ModuleType` 可能仍出现在旧 `menu_ids` 深链中；`App.tsx` 对下线模块显示「功能已下线」。
- 与后端开源版对齐：勿引用已删 API client（`crawlTasks`、`mindPersona`、`benchmarkAlert` 等）。
- 生产构建、`VITE_SAAS_HOST` 等选填 env 见 `.env.server`，非首次跑通所需。
