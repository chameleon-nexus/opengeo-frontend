import React, { useState, useEffect } from 'react';
import { Settings, Monitor, FileBarChart, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { Theme } from '../types';
import { generalSettingsAPI } from '../api/generalSettings';
import { useModuleI18n } from '../i18n/hooks';

interface GeneralSettingsProps {
  theme: Theme;
}

const GeneralSettingsPage: React.FC<GeneralSettingsProps> = ({ theme }) => {
  const { t } = useModuleI18n('settings');
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dataScreenUseMock, setDataScreenUseMock] = useState(true);
  const [diagnosisReportUseMock, setDiagnosisReportUseMock] = useState(true);
  const [initialData, setInitialData] = useState<{ dataScreen: boolean; diagnosisReport: boolean } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await generalSettingsAPI.get();
        setDataScreenUseMock(data.dataScreenUseMock);
        setDiagnosisReportUseMock(data.diagnosisReportUseMock);
        setInitialData({ dataScreen: data.dataScreenUseMock, diagnosisReport: data.diagnosisReportUseMock });
      } catch (err) {
        console.error('加载通用设置失败:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await generalSettingsAPI.update({
        data_screen_use_mock: dataScreenUseMock,
        diagnosis_report_use_mock: diagnosisReportUseMock,
      });
      setInitialData({ dataScreen: dataScreenUseMock, diagnosisReport: diagnosisReportUseMock });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('保存通用设置失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = initialData !== null && (
    dataScreenUseMock !== initialData.dataScreen || diagnosisReportUseMock !== initialData.diagnosisReport
  );

  if (loading) {
    return (
      <div className={`flex-1 p-6 lg:p-10 flex items-center justify-center ${isDark ? 'bg-geo-bg' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-blue-500' : 'text-blue-600'}`} />
          <p className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{t('generalSettingsPage.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-full no-scrollbar">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className={`text-3xl font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('generalSettingsPage.pageTitle')}</h2>
          <p className={`font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{t('generalSettingsPage.subtitle')}</p>
        </div>

        <div className={`rounded-[2rem] p-8 border shadow-sm ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-start gap-4 mb-8">
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600'}`}>
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('generalSettingsPage.mockSectionTitle')}</h3>
              <p className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                {t('generalSettingsPage.mockSectionHint')}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <Monitor className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('generalSettingsPage.dataScreenMock')}</p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    {dataScreenUseMock ? t('generalSettingsPage.dataScreenMockOn') : t('generalSettingsPage.dataScreenMockOff')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={dataScreenUseMock}
                onClick={() => setDataScreenUseMock(v => !v)}
                className={`relative w-12 h-7 rounded-full transition-colors ${dataScreenUseMock ? 'bg-blue-600' : isDark ? 'bg-zinc-700' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${dataScreenUseMock ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <FileBarChart className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                <div>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('generalSettingsPage.diagnosisMock')}</p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    {diagnosisReportUseMock ? t('generalSettingsPage.diagnosisMockOn') : t('generalSettingsPage.diagnosisMockOff')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={diagnosisReportUseMock}
                onClick={() => setDiagnosisReportUseMock(v => !v)}
                className={`relative w-12 h-7 rounded-full transition-colors ${diagnosisReportUseMock ? 'bg-blue-600' : isDark ? 'bg-zinc-700' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${diagnosisReportUseMock ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="pt-4 border-t border-dashed border-opacity-50 border-slate-300">
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  ${saved ? 'bg-green-600' : (isDark ? 'bg-gradient-coral hover:opacity-95 shadow-coral' : 'bg-slate-900 hover:bg-slate-800')}
                `}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> {t('generalSettingsPage.saving')}
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" /> {t('generalSettingsPage.saved')}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" /> {t('generalSettingsPage.save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsPage;
