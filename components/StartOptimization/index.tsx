import React from 'react';
import type { GeoWorkflowDTO } from '../../api/geoWorkflow';
import type { UserRole, BrandQuota } from '../../types';
import BrandListView from './BrandListView';
import type { BrandIntakeConfig, SelectedBrand, WorkbenchOpenParams } from './types';
import { brandQuotaBlockedMessage } from '../../lib/brandQuota';

interface Props {
  /** 进入二级「优化工作台」页（路由模块 OPTIMIZATION_WORKBENCH，侧栏无此项） */
  onEnterWorkbench: (params: WorkbenchOpenParams) => void;
  /** 按 workflow 阶段统一路由（对话 / 驾驶舱 / 工作台） */
  onOpenWorkflow: (brand: SelectedBrand, workflowId: string) => void;
  /** 打开最新分析报告全页（历史报告入口） */
  onOpenDiagnosisReport: (reportTaskId: string) => void;
  canCreateBrand?: boolean;
  brandQuota?: BrandQuota | null;
  userRole?: UserRole | null;
  onBrandQuotaRefresh?: () => void;
}

/**
 * 「优化管理」入口：始终展示品牌列表页；新建仅通过页内「开始优化」按钮进入工作台。
 */
const StartOptimization: React.FC<Props> = ({
  onEnterWorkbench,
  onOpenWorkflow,
  onOpenDiagnosisReport,
  canCreateBrand = true,
  brandQuota = null,
  userRole = null,
  onBrandQuotaRefresh,
}) => {
  const handleEnterWithNewWorkflow = (
    brand: SelectedBrand,
    wf: GeoWorkflowDTO,
    intake: BrandIntakeConfig
  ) => {
    onEnterWorkbench({
      brand,
      workflowId: wf.workflowId,
      initialStage: 'brand_parse',
      intake,
    });
  };

  const handleCreateBrandNew = () => {
    if (!canCreateBrand) {
      window.alert(brandQuotaBlockedMessage(brandQuota));
      return;
    }
    onEnterWorkbench({
      brand: null,
      workflowId: null,
      initialStage: 'brand_input',
      intake: null,
    });
  };

  const handleOpenExistingWorkflow = (brand: SelectedBrand, workflowId: string) => {
    onOpenWorkflow(brand, workflowId);
  };

  return (
    <BrandListView
      onEnterWithNewWorkflow={handleEnterWithNewWorkflow}
      onCreateBrandNew={handleCreateBrandNew}
      onOpenExistingWorkflow={handleOpenExistingWorkflow}
      onOpenReport={onOpenDiagnosisReport}
      canCreateBrand={canCreateBrand}
      userRole={userRole}
      onBrandQuotaRefresh={onBrandQuotaRefresh}
    />
  );
};

export default StartOptimization;
