import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Search, RefreshCw, Plus, X, Trash2, Database, Scissors, FolderOpen, AlertCircle, Download } from 'lucide-react';
import { Theme, Brand } from '../types';
import { geoWorkflowAPI } from '../api/geoWorkflow';
import { knowledgeBaseAPI, KnowledgeBase as KBType } from '../api/knowledgeBase';
import { knowledgeAPI, Document } from '../api/knowledge';
import { useModuleI18n } from '../i18n/hooks';

interface KnowledgeBaseProps {
  theme: Theme;
  currentBrand?: Brand | null;
  allBrands?: Brand[];
  onBrandChange?: (brand: Brand) => void;
  onNavigateToBrandManagement?: () => void;
  /** 打开模块时预选该知识库（展示其文件列表）；与「优化工作台」跳入一致 */
  initialSelectedKnowledgeBaseId?: number | null;
  /** 驾驶舱：仅展示属于该 GEO 主线的知识库（无则左侧空列表） */
  scopeWorkflowId?: string | null;
  /** 驾驶舱：新建知识库后写回 workflow.knowledge_base_id */
  bindGeoWorkflowId?: string | null;
  onGeoWorkflowUpdated?: () => void;
}

function filterKnowledgeBasesForScope(
  list: KBType[],
  scopeWorkflowId: string | null | undefined,
  pinnedKnowledgeBaseId: number | null | undefined,
): KBType[] {
  if (!scopeWorkflowId?.trim()) return list;
  const wid = scopeWorkflowId.trim();
  return list.filter(
    (kb) =>
      kb.geo_workflow_id === wid ||
      (pinnedKnowledgeBaseId != null && kb.id === pinnedKnowledgeBaseId),
  );
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  theme,
  initialSelectedKnowledgeBaseId = null,
  scopeWorkflowId = null,
  bindGeoWorkflowId = null,
  onGeoWorkflowUpdated,
}) => {
  const { t } = useModuleI18n('knowledge');
  const { t: tc } = useModuleI18n('common');
  const isDark = theme === 'dark';
  const workflowKbLimitMsg = t('empty.workflowLimit');
  
  // -- State --
  const [kbs, setKbs] = useState<KBType[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'rules' | 'test'>('files');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Documents State
  const [files, setFiles] = useState<Document[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  
  // Modals
  const [isKbModalOpen, setIsKbModalOpen] = useState(false);
  
  // Inputs
  const [newKbData, setNewKbData] = useState({ name: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Chunk Config
  const [chunkConfig, setChunkConfig] = useState({
      size: 512,
      overlap: 50,
      separator: 'Paragraph (\\n\\n)'
  });

  // Retrieval Test
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<{id: number, text: string, score: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Derived
  const activeKb = kbs.find(k => k.id === selectedKbId);
  const isWorkflowScoped = Boolean(scopeWorkflowId?.trim());
  const workflowKbAtLimit = isWorkflowScoped && kbs.length >= 1;

  const handleOpenCreateKbModal = () => {
    if (workflowKbAtLimit) {
      window.alert(workflowKbLimitMsg);
      return;
    }
    setIsKbModalOpen(true);
  };

  // 列表加载后：优先选中 initialSelectedKnowledgeBaseId（若存在），否则保持当前或选第一个
  useEffect(() => {
    if (kbs.length === 0) return;
    const want = initialSelectedKnowledgeBaseId;
    if (want != null && kbs.some((k) => k.id === want)) {
      setSelectedKbId(want);
      return;
    }
    setSelectedKbId((prev) => (prev != null && kbs.some((k) => k.id === prev) ? prev : kbs[0].id));
  }, [kbs, initialSelectedKnowledgeBaseId]);

  // -- Effects --
  useEffect(() => {
      void loadKnowledgeBases();
  }, [scopeWorkflowId, initialSelectedKnowledgeBaseId]);

  useEffect(() => {
      if (selectedKbId) {
          loadDocuments();
          setActiveTab('files');
          setTestResults([]);
          setTestQuery('');
      }
  }, [selectedKbId]);

  // -- API Calls --
  const loadKnowledgeBases = async () => {
      setIsLoading(true);
      setError(null);
      try {
          const response = await knowledgeBaseAPI.list();
          const list = filterKnowledgeBasesForScope(
            response.knowledge_bases,
            scopeWorkflowId,
            initialSelectedKnowledgeBaseId,
          );
          setKbs(list);
      } catch (err) {
          setError(err instanceof Error ? err.message : t('errors.loadFailed'));
          console.error('加载知识库失败:', err);
      } finally {
          setIsLoading(false);
      }
  };

  const loadDocuments = async () => {
      if (!selectedKbId) return;
      setIsLoadingFiles(true);
      try {
          const docs = await knowledgeAPI.list(selectedKbId);
          setFiles(docs);
      } catch (err) {
          console.error('加载文档失败:', err);
      } finally {
          setIsLoadingFiles(false);
      }
  };

  // -- Handlers --
  const handleCreateKb = async () => {
      if (!newKbData.name.trim()) return;
      if (workflowKbAtLimit) {
        window.alert(workflowKbLimitMsg);
        return;
      }

      try {
          const newKb = await knowledgeBaseAPI.create({
              name: newKbData.name,
              description: newKbData.description || undefined,
          });
          if (bindGeoWorkflowId?.trim()) {
            await geoWorkflowAPI.advance(bindGeoWorkflowId.trim(), {
              knowledge_base_id: newKb.id,
            });
            onGeoWorkflowUpdated?.();
          }
          await loadKnowledgeBases();
          setSelectedKbId(newKb.id);
          setIsKbModalOpen(false);
          setNewKbData({ name: '', description: '' });
      } catch (err) {
          alert(err instanceof Error ? err.message : t('errors.createFailed'));
          console.error('创建知识库失败:', err);
      }
  };

  const handleDeleteKb = async (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm(t('confirm.deleteKb'))) return;
      
      try {
          await knowledgeBaseAPI.delete(id);
          setKbs(prev => prev.filter(k => k.id !== id));
          if (selectedKbId === id) {
              setSelectedKbId(kbs.length > 1 ? kbs[0].id : null);
          }
          if (bindGeoWorkflowId?.trim()) {
            onGeoWorkflowUpdated?.();
          }
      } catch (err) {
          alert(err instanceof Error ? err.message : t('errors.deleteFailed'));
          console.error('删除知识库失败:', err);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile || !selectedKbId) return;

      // 验证文件类型
      const allowedTypes = ['.txt', '.pdf', '.csv', '.json', '.md', '.markdown', '.html', '.htm'];
      const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExt)) {
          setUploadError(t('errors.uploadFailed'));
          return;
      }

      // 验证文件大小 (50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
          setUploadError(t('upload.maxSizeError'));
          return;
      }

      setIsUploading(true);
      setUploadError(null);
      
      try {
          await knowledgeAPI.upload(selectedFile, selectedKbId);
          await loadDocuments();
          await loadKnowledgeBases(); // 刷新知识库状态
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }
      } catch (err) {
          console.error('上传失败:', err);
          setUploadError(err instanceof Error ? err.message : t('errors.uploadFailed'));
      } finally {
          setIsUploading(false);
      }
  };

  const handleDeleteFile = async (docId: number) => {
      if (!confirm(t('confirm.deleteDoc'))) return;
      
      try {
          await knowledgeAPI.delete(docId);
          await loadDocuments();
          await loadKnowledgeBases();
      } catch (err) {
          alert(err instanceof Error ? err.message : t('errors.deleteDocFailed'));
      }
  };

  const handleDownloadFile = async (file: Document) => {
      setDownloadingId(file.id);
      try {
          await knowledgeAPI.downloadDocument(file.id, file.original_filename);
      } catch (err) {
          alert(err instanceof Error ? err.message : '下载失败');
      } finally {
          setDownloadingId(null);
      }
  };

  const handleTestSearch = async () => {
      if (!testQuery.trim() || !selectedKbId) return;
      setIsSearching(true);
      try {
          const result = await knowledgeAPI.testSearch(selectedKbId, testQuery, 5);
          setTestResults(result.results);
      } catch (err) {
          console.error('检索测试失败:', err);
          setTestResults([]);
          alert(err instanceof Error ? err.message : t('errors.testFailed'));
      } finally {
          setIsSearching(false);
      }
  };

  const formatFileSize = (bytes: number): string => {
      return (bytes / 1024).toFixed(1) + ' KB';
  };

  const getStatusBadge = (status: string) => {
      const statusMap: Record<string, { label: string; color: string }> = {
          'analyzed': { label: t('status.analyzed'), color: 'green' },
          'processing': { label: t('status.processingDoc'), color: 'coral' },
          'error': { label: t('status.error'), color: 'red' }
      };
      const info = statusMap[status] || { label: status, color: 'gray' };
      return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border
              ${info.color === 'green' 
                  ? (isDark ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-200')
                  : info.color === 'coral'
                  ? (isDark ? 'bg-[#E8553F]/15 text-[#FF9B85] border-[#E8553F]/35' : 'bg-[#FFF5F2] text-[#C2410C] border-[#E8553F]/30')
                  : (isDark ? 'bg-red-900/20 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200')
              }
          `}>
              {info.label}
          </span>
      );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className={`shrink-0 px-4 lg:px-6 pt-4 lg:pt-6 pb-2 ${isDark ? 'bg-transparent' : ''}`}>
        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('pageTitle')}</h1>
      </div>
    <div className="flex flex-1 min-h-0 p-4 lg:p-6 pt-2 gap-6 relative">
        
        {/* Left Sidebar: Knowledge Base List */}
        <div className={`w-80 flex flex-col rounded-[2rem] border shadow-sm overflow-hidden shrink-0
            ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}
        `}>
            {/* Header */}
            <div className={`p-6 border-b flex justify-between items-center 
                ${isDark ? 'border-zinc-800' : 'border-slate-100'}
            `}>
                <div className="flex-1 min-w-0">
                    <h3 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('list.title')}</h3>
                </div>
                <button 
                    type="button"
                    onClick={handleOpenCreateKbModal}
                    title={workflowKbAtLimit ? workflowKbLimitMsg : t('actions.create')}
                    className={`p-2 rounded-full transition-colors 
                        ${isDark 
                            ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' 
                            : 'hover:bg-slate-100 text-slate-500 hover:text-[#E8553F]'
                        }
                        ${workflowKbAtLimit ? 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-slate-500' : ''}
                    `}
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoading ? (
                    <div className="text-center py-10">
                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                        <p className="text-sm">{tc('actions.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-10 text-red-500">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">{error}</p>
                        <button onClick={loadKnowledgeBases} className="mt-2 text-xs underline">{tc('actions.refresh')}</button>
                    </div>
                ) : kbs.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <Database className="w-12 h-12 mx-auto mb-2 stroke-1" />
                        <p className="text-sm">{t('list.empty')}</p>
                    </div>
                ) : (
                    kbs.map(kb => (
                        <div 
                            key={kb.id}
                            onClick={() => setSelectedKbId(kb.id)}
                            className={`group p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 relative
                                ${selectedKbId === kb.id 
                                    ? (isDark 
                                        ? 'bg-zinc-800 border-zinc-700 ring-1 ring-[#E8553F]/40' 
                                        : 'bg-[#FFF5F2] border-[#E8553F]/35 ring-1 ring-[#E8553F]/25'
                                      ) 
                                    : (isDark 
                                        ? 'bg-transparent border-transparent hover:bg-zinc-800/50' 
                                        : 'bg-transparent border-transparent hover:bg-slate-50'
                                      )
                                }
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center 
                                        ${selectedKbId === kb.id 
                                            ? 'bg-gradient-coral text-white shadow-coral'
                                            : (isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-slate-100 text-slate-400')
                                        }
                                    `}>
                                        <Database className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className={`font-bold text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{kb.name}</div>
                                        <div className={`text-xs flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${kb.status === 'ready' ? 'bg-green-500' : kb.status === 'indexing' ? 'bg-[#E8553F] animate-pulse' : 'bg-zinc-400'}`}></span>
                                            {kb.status === 'ready' ? t('status.ready') : kb.status === 'indexing' ? t('status.indexing') : t('status.idle')}
                                        </div>
                                        {kb.geo_workflow_label ? (
                                            <div className={`mt-1 text-[11px] leading-snug ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                GEO 主线：{kb.geo_workflow_label}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteKb(kb.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className={`text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                                {kb.description || t('list.noDescription')}
                            </div>
                            <div className={`text-xs pt-3 border-t flex justify-between ${isDark ? 'border-zinc-700/50 text-zinc-600' : 'border-slate-200/50 text-slate-400'}`}>
                                <span>{kb.doc_count} 个文档</span>
                                <span>{kb.updated_at ? new Date(kb.updated_at).toLocaleString('zh-CN') : '-'}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Right Panel: KB Detail Workspace */}
        <div className={`flex-1 flex flex-col rounded-[2rem] border shadow-sm overflow-hidden 
            ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}
        `}>
            {!activeKb ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                    <FolderOpen className="w-16 h-16 mb-4 text-slate-400 stroke-1" />
                    <p className={`text-lg font-medium ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>{t('empty.noKnowledgeBases')}</p>
                </div>
            ) : (
                <>
                    {/* Detail Header */}
                    <div className={`px-8 py-6 border-b flex justify-between items-center shrink-0
                        ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-100 bg-white'}
                    `}>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className={`text-2xl font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeKb.name}</h2>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border
                                    ${activeKb.status === 'ready' 
                                        ? (isDark ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-200')
                                        : (isDark ? 'bg-[#E8553F]/15 text-[#FF9B85] border-[#E8553F]/35' : 'bg-[#FFF5F2] text-[#C2410C] border-[#E8553F]/30')
                                    }
                                `}>{activeKb.status === 'ready' ? t('status.retrievalReady') : t('status.processing')}</span>
                            </div>
                            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{activeKb.description || '暂无描述'}</p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={loadKnowledgeBases}
                                type="button"
                                className="btn-geo-secondary"
                            >
                                <RefreshCw className="w-4 h-4" /> {t('actions.refresh')}
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileUpload}
                                accept=".txt,.pdf,.csv,.json,.md,.markdown,.html,.htm"
                            />
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className={
                                  isUploading
                                    ? 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm text-white bg-[#94a3b8] cursor-not-allowed shadow-sm'
                                    : 'btn-geo-primary'
                                }
                            >
                                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {isUploading ? t('actions.uploading') : t('actions.upload')}
                            </button>
                        </div>
                    </div>

                    {uploadError && (
                        <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span>{uploadError}</span>
                            <button onClick={() => setUploadError(null)} className="ml-auto">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className={`flex border-b px-8 shrink-0 ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                        {[
                            { id: 'files', label: t('tabs.files'), icon: FileText },
                            { id: 'rules', label: t('tabs.rules'), icon: Scissors },
                            { id: 'test', label: t('tabs.test'), icon: Search },
                        ].map((tab) => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2
                                    ${activeTab === tab.id 
                                        ? 'border-[#E8553F] text-[#E8553F]' 
                                        : `border-transparent ${isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-700'}`
                                    }
                                `}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'files' && (
                            <div className="p-8 space-y-4">
                                {isLoadingFiles ? (
                                    <div className="text-center py-10">
                                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                                        <p className="text-sm">{tc('actions.loading')}</p>
                                    </div>
                                ) : files.length === 0 ? (
                                    <div className="text-center py-20 opacity-50">
                                        <FileText className="w-16 h-16 mx-auto mb-4 stroke-1" />
                                        <p className="text-lg font-medium mb-2">{t('empty.noDocuments')}</p>
                                        <p className="text-sm">点击右上角「上传文档」按钮开始添加</p>
                                    </div>
                                ) : (
                                    files.map(file => (
                                        <div 
                                            key={file.id}
                                            className={`group flex items-center gap-4 p-4 rounded-xl border transition-all
                                                ${isDark ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800' : 'bg-slate-50 border-slate-200 hover:bg-white'}
                                            `}
                                        >
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center
                                                ${file.file_type === 'pdf' 
                                                    ? (isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-500')
                                                    : (isDark ? 'bg-[#E8553F]/15 text-[#FF9B85]' : 'bg-[#FFF5F2] text-[#E8553F]')
                                                }
                                            `}>
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-semibold text-sm truncate ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                                                    {file.original_filename}
                                                </div>
                                                <div className={`text-xs flex items-center gap-3 mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                    <span>{file.file_type.toUpperCase()}</span>
                                                    <span>•</span>
                                                    <span>{formatFileSize(file.file_size)}</span>
                                                    <span>•</span>
                                                    <span>{file.chunks_count} 个切块</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {getStatusBadge(file.status)}
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDownloadFile(file)}
                                                    disabled={downloadingId === file.id}
                                                    className="p-2 text-slate-400 hover:text-[#E8553F] transition-colors"
                                                    title="下载原文件"
                                                >
                                                    <Download className={`w-4 h-4 ${downloadingId === file.id ? 'animate-pulse' : ''}`} />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => handleDeleteFile(file.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'rules' && (
                            <div className="p-8 space-y-6">
                                <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <h4 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('tabs.rules')}</h4>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                                                {t('form.chunkSize')}
                                            </label>
                                            <input 
                                                type="number" 
                                                value={chunkConfig.size}
                                                onChange={(e) => setChunkConfig({...chunkConfig, size: parseInt(e.target.value)})}
                                                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                                                {t('form.chunkOverlap')}
                                            </label>
                                            <input 
                                                type="number" 
                                                value={chunkConfig.overlap}
                                                onChange={(e) => setChunkConfig({...chunkConfig, overlap: parseInt(e.target.value)})}
                                                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                                                {t('form.separator')}
                                            </label>
                                            <select 
                                                value={chunkConfig.separator}
                                                onChange={(e) => setChunkConfig({...chunkConfig, separator: e.target.value})}
                                                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                            >
                                                <option>Paragraph (\n\n)</option>
                                                <option>Sentence (。)</option>
                                                <option>Custom</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <button type="button" className="btn-geo-primary mt-6 w-full">
                                        {t('actions.save')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'test' && (
                            <div className="p-8 space-y-6">
                                <div className={`p-6 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <h4 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('actions.test')}</h4>
                                    
                                    <div className="flex gap-3">
                                        <input 
                                            type="text" 
                                            value={testQuery}
                                            onChange={(e) => setTestQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
                                            placeholder={t('form.testQueryPlaceholder')}
                                            className={`flex-1 px-4 py-2.5 min-h-[42px] rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                                        />
                                        <button 
                                            type="button"
                                            onClick={handleTestSearch}
                                            disabled={isSearching}
                                            className="btn-geo-primary shrink-0 disabled:opacity-50"
                                        >
                                            {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {testResults.length > 0 && (
                                    <div className="space-y-3">
                                        <h5 className={`text-sm font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                                            检索结果 ({testResults.length})
                                        </h5>
                                        {testResults.map(result => (
                                            <div 
                                                key={result.id}
                                                className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-slate-200'}`}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                                        相似度
                                                    </span>
                                                    <span className={`text-sm font-bold ${result.score >= 0.9 ? 'text-green-500' : result.score >= 0.8 ? 'text-[#E8553F]' : 'text-slate-400'}`}>
                                                        {(result.score * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                                                    {result.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>

        {/* Create KB Modal */}
        {isKbModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <div className={`w-full max-w-md rounded-2xl shadow-sm ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
                    <div className={`p-6 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('actions.create')}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                                {t('form.name')}
                            </label>
                            <input 
                                type="text" 
                                value={newKbData.name}
                                onChange={(e) => setNewKbData({...newKbData, name: e.target.value})}
                                placeholder={t('form.namePlaceholder')}
                                className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                                {t('form.description')}
                            </label>
                            <textarea 
                                value={newKbData.description}
                                onChange={(e) => setNewKbData({...newKbData, description: e.target.value})}
                                rows={3}
                                placeholder={t('form.descriptionPlaceholder')}
                                className={`w-full px-4 py-2 rounded-lg border resize-none ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                            />
                        </div>
                    </div>
                    <div className={`p-6 border-t flex gap-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                        <button 
                            type="button"
                            onClick={() => {
                                setIsKbModalOpen(false);
                                setNewKbData({ name: '', description: '' });
                            }}
                            className="btn-geo-secondary flex-1"
                        >
                            {tc('actions.cancel')}
                        </button>
                        <button 
                            type="button"
                            onClick={handleCreateKb}
                            disabled={!newKbData.name.trim()}
                            className="btn-geo-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('actions.create')}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    </div>
  );
};

export default KnowledgeBase;
