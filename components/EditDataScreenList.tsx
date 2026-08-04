/**
 * 编辑分析明细 - 列表页
 * Admin 专用：查看并编辑系统内全部分析明细报告（监控日志任务）
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Loader2, Edit3, UserPlus, X } from 'lucide-react';
import { Theme } from '../types';
import { dataScreenReportAPI, DataScreenReportData } from '../api/dataScreenReport';
import { authAPI } from '../api/auth';
import EditDataScreenForm from './EditDataScreenForm';

interface UserItem {
  id: number;
  username: string;
  role: string;
  merchant_id: number | null;
}

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  agent: '代理商',
  customer: '客户',
};

const PAGE_SIZE = 15;

interface EditDataScreenListProps {
  theme: Theme;
}

const EditDataScreenList: React.FC<EditDataScreenListProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [reports, setReports] = useState<DataScreenReportData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [assignModal, setAssignModal] = useState<{ reportId: number; brandName: string; taskId: string } | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [assigningUser, setAssigningUser] = useState<number | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dataScreenReportAPI.listAll((page - 1) * PAGE_SIZE, PAGE_SIZE);
      setReports(res.reports || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleBackFromEdit = () => {
    setEditingReportId(null);
    loadReports();
  };

  const openAssignModal = async (reportId: number, brandName: string, taskId: string) => {
    setAssignModal({ reportId, brandName, taskId });
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
      await dataScreenReportAPI.assign(assignModal.reportId, userId);
      closeAssignModal();
      loadReports();
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Monitor className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            编辑分析明细
          </h2>
        </div>
        <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          查看并编辑系统内全部分析明细报告（监控日志任务），可将监控日志与分析明细指派给指定用户。
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
        ) : reports.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${isDark ? 'bg-zinc-900/50 border-white/10' : 'bg-white border-slate-200'}`}>
            <Monitor className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-600' : 'text-slate-300'}`} />
            <p className={`font-semibold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>暂无分析明细记录</p>
            <p className={`text-xs mt-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>请先完成监控日志任务，或编辑演示分析明细</p>
            <button
              onClick={async () => {
                try {
                  const { id } = await dataScreenReportAPI.ensureDemo();
                  setEditingReportId(id);
                } catch (e) {
                  setError(e instanceof Error ? e.message : '创建演示报告失败');
                }
              }}
              className={`mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <Edit3 className="w-4 h-4" /> 编辑演示分析明细（占比图、Top 语义词等）
            </button>
          </div>
        ) : (
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-zinc-900/50 border-white/10' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-slate-50 text-slate-500'}>
                  <th className="text-left px-4 py-3 font-semibold">任务ID</th>
                  <th className="text-left px-4 py-3 font-semibold">品牌</th>
                  <th className="text-left px-4 py-3 font-semibold">核心词/热度值</th>
                  <th className="text-left px-4 py-3 font-semibold">快照日期</th>
                  <th className="text-right px-4 py-3 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t ${isDark ? 'border-white/5 hover:bg-zinc-800/30' : 'border-slate-100 hover:bg-slate-50'}`}
                  >
                    <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                      {r.taskId || '-'}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {r.brandName || r.brandId || '-'}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      {r.coreWordsTotal} / {r.distilledWordsTotal}
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      {r.snapshotDate || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {r.taskId && r.taskId !== 'DEMO-DS-001' && (
                          <button
                            onClick={() => openAssignModal(r.id, r.brandName || r.brandId || '', r.taskId || '')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isDark
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            <UserPlus className="w-3.5 h-3.5" /> 指派
                          </button>
                        )}
                        <button
                          onClick={() => setEditingReportId(r.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isDark
                              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" /> 编辑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > PAGE_SIZE && (
              <div className={`flex justify-between items-center px-4 py-3 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  共 {total} 条
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
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>指派分析明细</h3>
                <button onClick={closeAssignModal} className={`p-1 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4">
                <p className={`text-sm mb-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  将「{assignModal.brandName}」的分析明细与监控日志指派给：
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

export default EditDataScreenList;
