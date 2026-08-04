import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useModuleI18n } from '../i18n/hooks';
import SiteImageAssetField from './SiteImageAssetField';

export type ContactChannelType =
  | 'phone'
  | 'email'
  | 'wechat'
  | 'whatsapp'
  | 'discord'
  | 'telegram'
  | 'line'
  | 'custom';

export interface ContactChannelRow {
  type: ContactChannelType;
  label?: string;
  value?: string;
  qr_url?: string;
  link?: string;
  enabled?: boolean;
  sort?: number;
}

export type ContactFormFieldKey =
  | 'phone'
  | 'email'
  | 'wechat'
  | 'whatsapp'
  | 'discord'
  | 'telegram'
  | 'line';

export interface ContactFormFieldRow {
  key: ContactFormFieldKey;
  type?: string;
  enabled: boolean;
  required: boolean;
  sort?: number;
}

const CHANNEL_TYPES: ContactChannelType[] = [
  'phone',
  'email',
  'wechat',
  'whatsapp',
  'discord',
  'telegram',
  'line',
  'custom',
];

const FORM_FIELD_KEYS: ContactFormFieldKey[] = [
  'phone',
  'email',
  'wechat',
  'whatsapp',
  'discord',
  'telegram',
  'line',
];

export const DEFAULT_ZH_FORM_FIELDS: ContactFormFieldRow[] = [
  { key: 'phone', enabled: true, required: true, sort: 0 },
  { key: 'wechat', enabled: true, required: false, sort: 1 },
  { key: 'email', enabled: true, required: false, sort: 2 },
];

export const DEFAULT_EN_FORM_FIELDS: ContactFormFieldRow[] = [
  { key: 'email', enabled: true, required: true, sort: 0 },
  { key: 'whatsapp', enabled: true, required: false, sort: 1 },
  { key: 'discord', enabled: true, required: false, sort: 2 },
  { key: 'phone', enabled: true, required: false, sort: 3 },
];

export function normalizeFormFields(
  raw: ContactFormFieldRow[] | undefined,
  englishSite: boolean,
): ContactFormFieldRow[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return FORM_FIELD_KEYS.map((key, idx) => {
      const found = raw.find((r) => r.key === key);
      if (!found) return { key, enabled: false, required: false, sort: idx };
      return {
        key,
        enabled: found.enabled !== false,
        required: !!found.required,
        sort: found.sort ?? idx,
      };
    }).filter((r) => r.enabled);
  }
  return englishSite ? [...DEFAULT_EN_FORM_FIELDS] : [...DEFAULT_ZH_FORM_FIELDS];
}

export function emptyChannel(type: ContactChannelType = 'wechat'): ContactChannelRow {
  return { type, label: '', value: '', qr_url: '', link: '', enabled: true, sort: 0 };
}

interface ContactChannelsSettingsProps {
  channels: ContactChannelRow[];
  formFields: ContactFormFieldRow[];
  englishSite: boolean;
  onChannelsChange: (rows: ContactChannelRow[]) => void;
  onFormFieldsChange: (rows: ContactFormFieldRow[]) => void;
  assetBusy: string | null;
  onAssetBusy: (key: string | null) => void;
  inputCls: string;
}

const ContactChannelsSettings: React.FC<ContactChannelsSettingsProps> = ({
  channels,
  formFields,
  englishSite,
  onChannelsChange,
  onFormFieldsChange,
  assetBusy,
  onAssetBusy,
  inputCls,
}) => {
  const { t } = useModuleI18n('site');

  const updateChannel = (idx: number, patch: Partial<ContactChannelRow>) => {
    const next = channels.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChannelsChange(next);
  };

  const removeChannel = (idx: number) => {
    onChannelsChange(channels.filter((_, i) => i !== idx));
  };

  const addChannel = () => {
    onChannelsChange([...channels, { ...emptyChannel('wechat'), sort: channels.length }]);
  };

  const toggleFormField = (key: ContactFormFieldKey, field: 'enabled' | 'required') => {
    const next = formFields.map((f) => {
      if (f.key !== key) return f;
      if (field === 'enabled') {
        const enabled = !f.enabled;
        return { ...f, enabled, required: enabled ? f.required : false };
      }
      return { ...f, required: !f.required };
    });
    onFormFieldsChange(next);
  };

  const displayFields = FORM_FIELD_KEYS.map((key) => formFields.find((f) => f.key === key) ?? {
    key,
    enabled: false,
    required: false,
    sort: 0,
  });

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{t('webMainSettings.contactChannelsTitle')}</h3>
          <p className="text-xs text-slate-500 mt-1">{t('webMainSettings.contactChannelsHint')}</p>
        </div>
        <div className="space-y-4">
          {channels.map((ch, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2">
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <select
                  value={ch.type}
                  onChange={(e) => updateChannel(idx, { type: e.target.value as ContactChannelType })}
                  className={`${inputCls} flex-1`}
                >
                  {CHANNEL_TYPES.map((ct) => (
                    <option key={ct} value={ct}>
                      {t(`webMainSettings.contactChannelTypes.${ct}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeChannel(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  aria-label={t('webMainSettings.contactChannelRemove')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={ch.value || ''}
                onChange={(e) => updateChannel(idx, { value: e.target.value })}
                placeholder={t('webMainSettings.contactChannelValuePlaceholder')}
                className={inputCls}
              />
              <input
                type="text"
                value={ch.link || ''}
                onChange={(e) => updateChannel(idx, { link: e.target.value })}
                placeholder={t('webMainSettings.contactChannelLinkPlaceholder')}
                className={inputCls}
              />
              <SiteImageAssetField
                label={t('webMainSettings.contactChannelQrLabel')}
                hint={t('webMainSettings.contactChannelQrHint')}
                value={ch.qr_url || ''}
                onChange={(url) => updateChannel(idx, { qr_url: url })}
                uploadType="background"
                uploading={assetBusy === `upload-channel-qr-${idx}`}
                onUploadStart={() => onAssetBusy(`upload-channel-qr-${idx}`)}
                onUploadEnd={() => onAssetBusy(null)}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addChannel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-dashed border-slate-300 text-slate-600 hover:border-[#E8553F] hover:text-[#E8553F]"
        >
          <Plus className="w-4 h-4" />
          {t('webMainSettings.contactChannelAdd')}
        </button>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{t('webMainSettings.contactFormFieldsTitle')}</h3>
          <p className="text-xs text-slate-500 mt-1">{t('webMainSettings.contactFormFieldsHint')}</p>
          {englishSite && (
            <p className="text-xs text-amber-600 mt-1">{t('webMainSettings.contactFormFieldsEnHint')}</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2 font-medium text-slate-600">{t('webMainSettings.contactFormFieldCol')}</th>
                <th className="text-center px-4 py-2 font-medium text-slate-600 w-24">{t('webMainSettings.contactFormShowCol')}</th>
                <th className="text-center px-4 py-2 font-medium text-slate-600 w-24">{t('webMainSettings.contactFormRequiredCol')}</th>
              </tr>
            </thead>
            <tbody>
              {displayFields.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{t(`webMainSettings.contactFormFieldTypes.${row.key}`)}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={() => toggleFormField(row.key, 'enabled')}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.required}
                      disabled={!row.enabled}
                      onChange={() => toggleFormField(row.key, 'required')}
                      className="rounded border-slate-300 disabled:opacity-40"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ContactChannelsSettings;
