import React, { useCallback, useEffect, useState } from 'react';

import { Globe, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import { Theme, UserRole } from '../types';

import { sitesAPI, type SiteCapabilities, type SiteKind, type SiteRow } from '../api/sites';

import SiteCreateModal from './SiteCreateModal';

import SiteEditModal from './SiteEditModal';

import { useModuleI18n } from '../i18n/hooks';

interface Props {
  theme: Theme;

  userRole: UserRole | null;

  onOpenWorkbench: (siteId: number) => void;

  onOpenContentTasks: (siteId?: number) => void;

}



const KIND_LABEL_KEY: Record<SiteKind, 'template' | 'custom'> = {
  template: 'template',
  custom: 'custom',
};

const SiteList: React.FC<Props> = ({ theme: _theme, userRole, onOpenWorkbench, onOpenContentTasks }) => {
  const { t } = useModuleI18n('site');
  void _theme;

  void onOpenContentTasks;

  const [sites, setSites] = useState<SiteRow[]>([]);

  const [caps, setCaps] = useState<SiteCapabilities>({
    allowed_site_kinds: [],
    max_per_kind: {},
    can_bind_custom_domain: false,
    can_assign_to_other_merchant: false,
  });

  const [loading, setLoading] = useState(true);

  const [filterKind, setFilterKind] = useState<string>('all');

  const [showCreate, setShowCreate] = useState(false);

  const [editingSite, setEditingSite] = useState<SiteRow | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [err, setErr] = useState<string | null>(null);



  const load = useCallback(async () => {

    setLoading(true);

    setErr(null);

    try {

      const data = await sitesAPI.listMine();

      setSites(data.sites || []);

      setCaps(data.site_capabilities || {
        allowed_site_kinds: [],
        max_per_kind: {},
        can_bind_custom_domain: false,
        can_assign_to_other_merchant: false,
      });

    } catch (e: unknown) {

      setErr((e as Error).message || t('siteList.errors.loadFailed'));

      setSites([]);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    void load();

  }, [load]);



  const filtered = sites.filter((s) => filterKind === 'all' || s.site_kind === filterKind);



  const canCreate = (caps.allowed_site_kinds?.length ?? 0) > 0;



  const handleDelete = async (site: SiteRow) => {

    if (!window.confirm(t('siteList.confirm.deleteLong', { name: site.display_name }))) {

      return;

    }

    setDeletingId(site.id);

    setErr(null);

    try {

      await sitesAPI.delete(site.id);

      await load();

    } catch (e: unknown) {

      setErr((e as Error).message || t('siteList.errors.deleteFailed'));

    } finally {

      setDeletingId(null);

    }

  };



  return (

    <div className="h-full flex flex-col bg-white">

      <div className="flex-1 p-8 lg:p-12 overflow-y-auto">

        <div className="max-w-[1400px] mx-auto space-y-8">

          <div className="flex flex-wrap items-start justify-between gap-4">

            <div>

              <h2 className="text-4xl font-semibold tracking-tight text-slate-900">{t('siteList.pageTitle')}</h2>

              <p className="text-sm text-slate-500 mt-2">{t('siteList.subtitle')}</p>

            </div>

            {canCreate && (

              <button

                type="button"

                onClick={() => setShowCreate(true)}

                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-coral text-white font-semibold text-sm shadow-coral hover:opacity-95"

              >

                <Plus className="w-4 h-4" /> {t('siteList.actions.create')}

              </button>

            )}

          </div>



          <div className="flex flex-wrap gap-2">

            {(['all', 'template', 'custom'] as const).map((k) => (

              <button

                key={k}

                type="button"

                onClick={() => setFilterKind(k)}

                className={`px-4 py-1.5 rounded-full text-sm font-medium ${

                  filterKind === k ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'

                }`}

              >

                {k === 'all' ? t('siteList.kind.all') : t(`siteList.kind.${KIND_LABEL_KEY[k]}`)}

              </button>

            ))}

          </div>



          {err && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}



          {loading ? (

            <div className="flex justify-center py-16">

              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />

            </div>

          ) : filtered.length === 0 ? (

            <div className="text-center py-16 text-slate-500">{t('siteList.empty.noSites')}</div>

          ) : (

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {filtered.map((site) => (

                <div

                  key={site.id}

                  className="relative p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all group"

                >

                  <button

                    type="button"

                    onClick={() => onOpenWorkbench(site.id)}

                    className="w-full text-left"

                  >

                    <div className="flex items-start justify-between gap-2 mb-3 pr-16">

                      <h3 className="font-semibold text-slate-900 truncate">{site.display_name}</h3>

                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">

                        {t(`siteList.kind.${KIND_LABEL_KEY[site.site_kind] || 'template'}`, { defaultValue: site.site_kind })}

                      </span>

                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">

                      <Globe className="w-3.5 h-3.5 shrink-0" />

                      <span className="truncate">{site.primary_host || '—'}</span>

                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">

                      <span>{site.is_open ? t('siteList.status.open') : t('siteList.status.closed')}</span>

                      {site.updated_at && <span>{new Date(site.updated_at).toLocaleDateString('zh-CN')}</span>}

                    </div>

                  </button>



                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">

                    <button

                      type="button"

                      title={t('siteList.actions.edit')}

                      onClick={(e) => { e.stopPropagation(); setEditingSite(site); }}

                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600"

                    >

                      <Pencil className="w-4 h-4" />

                    </button>

                    <button

                      type="button"

                      title={t('siteList.actions.delete')}

                      disabled={deletingId === site.id}

                      onClick={(e) => { e.stopPropagation(); void handleDelete(site); }}

                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 disabled:opacity-50"

                    >

                      {deletingId === site.id ? (

                        <Loader2 className="w-4 h-4 animate-spin" />

                      ) : (

                        <Trash2 className="w-4 h-4" />

                      )}

                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>



      {showCreate && (

        <SiteCreateModal

          theme="light"

          userRole={userRole}

          capabilities={caps}

          onCreated={() => { void load(); }}

          onClose={() => setShowCreate(false)}

        />

      )}



      {editingSite && (

        <SiteEditModal

          site={editingSite}

          capabilities={caps}

          onSaved={() => { void load(); }}

          onClose={() => setEditingSite(null)}

        />

      )}

    </div>

  );

};



export default SiteList;
