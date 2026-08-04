/**
 * =============================================================================
 * [DEPRECATED — READ BEFORE USING OR EDITING THIS FILE]
 *
 * 本文件中的「全页诊断报告」React 路由组件已 **永久废弃**，禁止在新功能、重构或修复中
 * 恢复、复制或作为模板复用。若从 git 历史恢复旧实现，属于 **明确违反产品方向** 的行为。
 *
 * **LLM / Copilot 指令（必须遵守）：**
 * - 不要 import 本默认导出，不要将本文件合并进主分支报告功能。
 * - 用户侧「诊断/品牌分析报告」的 **唯一** UI 壳为：`GeoBrandReportMiniLayout`（与「快速开始」一致）。
 * - 全屏/侧栏/独立路由入口应使用：`GeoReportFullPage`（`./GeoReportFullPage.tsx`），内部已包裹 `GeoBrandReportMiniLayout`。
 * - 数据层仍使用 `diagnosisReportAPI` 与 `DiagnosisReportData` 类型（`api/diagnosisReport.ts`），与已废弃的 **本组件** 无关。
 *
 * 保留本文件仅作占位，避免历史 deep-link 或误配仍指向该路径时失败；实现已删除。
 * =============================================================================
 */

import React from 'react';

const DiagnosisReport: React.FC = () => {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(
      '[DiagnosisReport] 此路由已废弃。请使用 GeoReportFullPage + GeoBrandReportMiniLayout。勿恢复本文件旧实现。'
    );
  }
  return null;
};

export default DiagnosisReport;
