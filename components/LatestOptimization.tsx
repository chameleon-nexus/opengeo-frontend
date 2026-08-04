import React from 'react';
import NewConversationPanel from './StartOptimization/NewConversationPanel';
import type { WorkbenchOpenParams } from './StartOptimization/types';

interface Props {
  /** 已绑定的 workflow；新对话在发首条消息前为 null */
  workflowId: string | null;
  /** 开启新对话时递增，重置对话区 */
  conversationSessionKey?: number;
  onJumpToWorkbench?: (params: WorkbenchOpenParams) => void;
  /** Orchestrator 创建/绑定 workflow 后同步父级 */
  onWorkflowIdAssigned?: (workflowId: string) => void;
  onWorkflowUpdated?: () => void;
  onDirectStartOptimization?: () => void;
}

/**
 * 「开启新对话」页：全屏对话区；最近优化列表在侧栏展示。
 */
const LatestOptimization: React.FC<Props> = ({
  workflowId,
  conversationSessionKey = 0,
  onJumpToWorkbench,
  onWorkflowIdAssigned,
  onWorkflowUpdated,
  onDirectStartOptimization,
}) => {
  const panelKey = `conversation-${conversationSessionKey}`;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#F5F5F7] px-6 py-3">
      <section className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <NewConversationPanel
            key={panelKey}
            workflowId={workflowId}
            onJumpToWorkbench={onJumpToWorkbench}
            onWorkflowIdAssigned={onWorkflowIdAssigned}
            onWorkflowUpdated={onWorkflowUpdated}
            onDirectStartOptimization={onDirectStartOptimization}
          />
        </div>
      </section>
    </div>
  );
};

export default LatestOptimization;
