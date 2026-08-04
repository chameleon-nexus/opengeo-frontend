/**
 * 编辑分析明细（批次）- 列表页
 * Admin 专用：按监控批次维度查看、指派、编辑分析明细报告
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Loader2, Edit3, UserPlus, X, CheckCircle2, Clock } from 'lucide-react';
import { Theme } from '../types';
import { dataScreenReportAPI } from '../api/dataScreenReport';
import { authAPI } from '../api/auth';
import EditDataScreenForm from './EditDataScreenForm';

interface UserItem {
  id: number;
  username: string;
  role: string;
  merchant_id: number | null;
}

interface BatchItem {
  batchId: string;
  batchName: string;
  taskCount: number;
  completedCount: number;
  status: string;
  targetBrand: string;
  brandDisplayName: string;
  platforms: string[];
  createdAt: string | null;
  completedAt: string | null;
  hasReport: boolean;
  reportId: number | null;
  assignedUser: { id: number; username: string; role: string } | null;
}

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  agent: '代理商',
  customer: '客户',
};

const PAGE_SIZE = 15;

interface EditDataScreenBatchListProps {
  theme: Theme;
}

const EditDataScreenBatchList: React.FC<EditDataScreenBatchListProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [assignModal, setAssignModal] = useState<{ batchId: string; batchName: string } | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [assigningUser, setAssigningUser] = useState<number | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dataScreenReportAPI.listAllBatches((page - 1) * PAGE_SIZE, PAGE_SIZE);
      setBatches(res.batches || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const handleBackFromEdit = () => {
    setEditingReportId(null);
    loadBatches();
  };

  const openAssignModal = async (batchId: string, batchName: string) => {
    setAssignModal({ batchId, batchName });
    setAssignError(null);
    try {
      const list = await authAPI.getAdminUsers();
      setUsers(Array.isArray(list) ? list : (list as any)?.data ?? []);
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : '加载用户列表失败');
    }
  };

  const closeAssignModal = () => {
    setAssignModal(null);
    setAssigningUser(null);
    setAssignError(null);
  };

  const handleAssign = async (userId: number) => {
    if (!assignModal) return;
    setAssigningUser(userId);
    setAssignError(null);
    try {
      await dataScreenReportAPI.assignBatch(assignModal.batchId, userId);
      closeAssignModal();
      loadBatches();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : '指派失败');
    } finally {
      setAssigningUser(null);
    }
  };

  if (editingReportId !== null) {
    return (
      <div className={`p-6 ${isDark ? 'bg-geo-bg' : 'bg-slate-50'}`}>
        <EditDataScreenForm
          theme={theme}
          reportId={editingReportId}
          onBack={handleBackFromEdit}
        />
      </div>
    );
  }

  return (
    <div className={`p-6 ${isDark ? 'bg-geo-bg' : 'bg-slate-50'}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Layers className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            编辑分析明细（批次）
          </h2>
        </div>
        <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          按监控批次维度管理分析明细。可将整个批次的监控日志与分析明细指派给指定用户，或编辑批次下的报告。
        </p>

        {error && (
          <div className={`mb-4 p-4 rounded-xl ${isDark ? 'bg-red-900/20 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
        ) : batches.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${isDark ? 'bg-zinc-900/50 border-white/10' : 'bg-white border-slate-200'}`}>
            <Layers className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-600' : 'text-slate-300'}`} />
            <p className={`font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>暂无监控批次</p>
            <p className={`text-xs mt-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>请先在监控日志中创建监控任务</p>
          </div>
        ) : (
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-zinc-900/50 border-white/10' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-slate-50 text-slate-500'}>
                  <th className="text-left px-4 py-3 font-semibold">批次名称</th>
                  <th className="text-left px-4 py-3 font-semibold">品牌</th>
                  <th className="text-left px-4 py-3 font-semibold">平台</th>
                  <th className="text-center px-4 py-3 font-semibold">任务数</th>
                  <th className="text-left px-4 py-3 font-semibold">状态</th>
                  <th className="text-left px-4 py-3 font-semibold">已指派</th>
                  <th className="text-left px-4 py-3 font-semibold">创建时间</th>
                  <th className="text-right px-4 py-3 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr
                    key={b.batchId}
                    className={`border-t ${isDark ? 'border-white/5 hover:bg-zinc-800/30' : 'border-slate-100 hover:bg-slate-50'}`}
                  >
                    <td className={`px-4 py-3 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                      <div className="max-w-[200px] truncate font-medium" title={b.batchName}>
                        {b.batchName || b.batchId}
                      </div>
                      <div className={`text-xs font-mono mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        {b.batchId}
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {b.brandDisplayName || b.targetBrand || '-'}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      <div className="flex flex-wrap gap-1">
                        {b.platforms.slice(0, 4).map((p) => (
                          <span key={p} className={`px-1.5 py-0.5 rounded text-xs ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-slate-100 text-slate-600'}`}>
                            {p}
                          </span>
                        ))}
                        {b.platforms.length > 4 && (
                          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>+{b.platforms.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-center font-mono ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      {b.completedCount}/{b.taskCount}
                    </td>
                    <td className="px-4 py-3">
                      {b.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 已完成
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <Clock className="w-3.5 h-3.5" /> 进行中
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      {b.assignedUser ? (
                        <span>
                          {b.assignedUser.username}
                          <span className={`ml-1 px-1 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-slate-100'}`}>
                            {ROLE_LABEL[b.assignedUser.role] || b.assignedUser.role}
                          </span>
                        </span>
                      ) : (
                        <span className="opacity-40">未指派</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openAssignModal(b.batchId, b.batchName || b.batchId)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isDark
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5" /> 指派
                        </button>
                        {b.hasReport && b.reportId && (
                          <button
                            onClick={() => setEditingReportId(b.reportId!)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isDark
                                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" /> 编辑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > PAGE_SIZE && (
              <div className={`flex justify-between items-center px-4 py-3 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  共 {total} 个批次
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${
                      isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    上一页
                  </button>
                  <button
                    disabled={page * PAGE_SIZE >= total}
                    onClick={() => setPage((p) => p + 1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${
                      isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {assignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeAssignModal}>
            <div
              className={`max-w-md w-full mx-4 rounded-2xl shadow-xl ${isDark ? 'bg-zinc-900 border border-white/10' : 'bg-white border border-slate-200'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>指派批次</h3>
                <button onClick={closeAssignModal} className={`p-1 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4">
                <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  将批次「{assignModal.batchName}」的全部监控任务与分析明细指派给：
                </p>
                {assignError && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                    {assignError}
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {users.length === 0 && !assignError ? (
                    <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>暂无用户</p>
                  ) : (
                    users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleAssign(u.id)}
                        disabled={assigningUser !== null}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${
                          isDark
                            ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <span className="font-medium">{u.username}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-slate-200 text-slate-600'}`}>
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditDataScreenBatchList;
