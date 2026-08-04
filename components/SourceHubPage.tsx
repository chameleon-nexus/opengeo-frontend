import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { ModuleType, UserRole } from '../types';
import { SOURCE_HUB_SECTIONS, type SourceHubMarket } from '../config/sourceHub';
import { getEffectiveMenuIds } from '../config/menuByRole';
import { useModuleI18n } from '../i18n/hooks';

interface Props {
  userRole: UserRole | null;
  menuIds?: string[] | null;
  onSelect: (m: ModuleType) => void;
}

const sectionShell: Record<SourceHubMarket, string> = {
  domestic:
    'rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/50 to-white p-5 shadow-sm',
  overseas:
    'rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/40 to-white p-5 shadow-sm',
};

const badgeCls: Record<SourceHubMarket, string> = {
  domestic: 'bg-rose-100 text-rose-800 ring-rose-200/80',
  overseas: 'bg-teal-100 text-teal-800 ring-teal-200/80',
};

const iconWrapCls: Record<SourceHubMarket, string> = {
  domestic: 'from-[#FFE9E2] to-[#FFD3C5] text-[#E8553F]',
  overseas: 'from-teal-100 to-cyan-100 text-teal-700',
};

const SourceHubPage: React.FC<Props> = ({ userRole, menuIds, onSelect }) => {
  const { t } = useModuleI18n('publish');
  const allowed = useMemo(
    () => new Set(getEffectiveMenuIds(menuIds, userRole)),
    [menuIds, userRole],
  );

  const sections = useMemo(
    () =>
      SOURCE_HUB_SECTIONS.map((section) => ({
        ...section,
        entries: section.entries.filter((e) => allowed.has(e.moduleId)),
      })).filter((s) => s.entries.length > 0),
    [allowed],
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F5F5F7]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('sourceHub.pageTitle')}</h1>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-8 py-16 text-center text-sm text-gray-400">
            {t('sourceHub.empty')}
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((section) => (
              <section key={section.market} className={sectionShell[section.market]}>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${badgeCls[section.market]}`}
                  >
                    {t(section.titleKey)}
                  </span>
                  {section.hintKey ? (
                    <p className="min-w-0 flex-1 text-xs text-slate-600">{t(section.hintKey)}</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {section.entries.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <button
                        key={entry.moduleId}
                        type="button"
                        onClick={() => onSelect(entry.moduleId)}
                        className="group relative rounded-xl border border-white/80 bg-white/90 p-4 text-left shadow-sm transition-all hover:border-[#E8553F]/30 hover:shadow-md hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${iconWrapCls[section.market]}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-gray-900">
                                {t(entry.labelKey)}
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-[#E8553F]" />
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
                              {t(entry.descriptionKey)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SourceHubPage;
