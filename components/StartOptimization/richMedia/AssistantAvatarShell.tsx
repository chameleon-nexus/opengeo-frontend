import React from 'react';

/** 富媒体卡片外层容器（与对话气泡同宽对齐，不重复展示助手头像） */
export const AssistantAvatarShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full min-w-0">{children}</div>
);
