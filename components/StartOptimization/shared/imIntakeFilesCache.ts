/** IM 表单提交的知识库材料暂存，供跳转工作台时写入 BrandIntakeConfig.files */
const cache = new Map<string, File[]>();

export function setImIntakeFiles(workflowId: string, files: File[]): void {
  const wid = workflowId.trim();
  if (!wid) return;
  if (!files.length) {
    cache.delete(wid);
    return;
  }
  cache.set(wid, [...files]);
}

export function takeImIntakeFiles(workflowId: string): File[] {
  const wid = workflowId.trim();
  if (!wid) return [];
  const files = cache.get(wid) ?? [];
  cache.delete(wid);
  return files;
}

export function peekImIntakeFiles(workflowId: string): File[] {
  const wid = workflowId.trim();
  if (!wid) return [];
  return cache.get(wid) ?? [];
}
