import React from 'react';
import AiPlatformPicker from './AiPlatformPicker';
import OverseasPlatformPicker from './OverseasPlatformPicker';
import KnowledgeGraphToggle from './KnowledgeGraphToggle';
import StringTagsInput from './StringTagsInput';
import type { BrandIntakeFormValues } from './brandIntakeForm';
import { useModuleI18n } from '../../../i18n/hooks';

export interface BrandIntakeFormFieldsProps {
  values: BrandIntakeFormValues;
  onChange: (patch: Partial<BrandIntakeFormValues>) => void;
  /** 仅渲染部分区块（工作台分卡片布局） */
  section?: 'all' | 'object' | 'materials' | 'platforms';
  showBrandName?: boolean;
  brandNameReadOnly?: string;
  showBrandIntroduction?: boolean;
  showOverseas?: boolean;
  onOverseasNotOpenHint?: () => void;
  filesInputId: string;
  disabled?: boolean;
}

const BrandIntakeFormFields: React.FC<BrandIntakeFormFieldsProps> = ({
  values,
  onChange,
  section = 'all',
  showBrandName = true,
  brandNameReadOnly,
  showBrandIntroduction = true,
  showOverseas = false,
  onOverseasNotOpenHint,
  filesInputId,
  disabled = false,
}) => {
  const { t } = useModuleI18n('optimization');
  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50 disabled:opacity-60';

  const setInfer = (checked: boolean) => {
    onChange({
      inferCategoriesByAi: checked,
      subjectCategories: checked ? [] : values.subjectCategories,
    });
  };

  const objectBlock = (
    <div className="space-y-5">
      {showBrandName ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('stages.brandInput.brandName')}
            <span className="text-[#E8553F] ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={values.brandName}
            onChange={(e) => onChange({ brandName: e.target.value })}
            disabled={disabled}
            className={inputClass}
          />
        </div>
      ) : brandNameReadOnly ? (
        <div className="text-[11px] text-gray-400">
          {t('stages.brandInput.brandName')}：{brandNameReadOnly}
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('stages.brandInput.productLine')}
        </label>
        <input
          type="text"
          value={values.productName}
          onChange={(e) => onChange({ productName: e.target.value })}
          placeholder={t('stages.brandInput.productLinePlaceholder')}
          disabled={disabled}
          className={inputClass}
        />
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-2 mb-2">
          <input
            type="checkbox"
            checked={values.inferCategoriesByAi}
            onChange={(e) => setInfer(e.target.checked)}
            disabled={disabled}
            className="mt-0.5 rounded border-gray-300 text-[#E8553F] focus:ring-[#E8553F]/20"
          />
          <span className="text-sm font-medium text-gray-700">
            {t('stages.brandInput.inferCategoriesByAi')}
          </span>
        </label>
        <p className="mb-2 text-[11px] text-gray-400">{t('stages.brandInput.inferCategoriesByAiHint')}</p>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {t('stages.brandInput.category')}
          {!values.inferCategoriesByAi && <span className="text-[#E8553F] ml-0.5">*</span>}
        </label>
        <StringTagsInput
          tags={values.subjectCategories}
          onChange={(tags) => onChange({ subjectCategories: tags })}
          placeholder={t('stages.brandInput.categoryPlaceholder')}
          addLabel={t('stages.brandParse.add')}
          disabled={disabled || values.inferCategoriesByAi}
        />
        <p className="mt-1.5 text-[11px] text-gray-400">{t('stages.brandInput.categoryMultiHint')}</p>
      </div>

      {showBrandIntroduction ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('stages.brandInput.introduction')}
          </label>
          <textarea
            rows={4}
            value={values.brandIntroduction}
            onChange={(e) => onChange({ brandIntroduction: e.target.value })}
            placeholder={t('stages.brandInput.introductionPlaceholder')}
            disabled={disabled}
            className={`${inputClass} leading-relaxed resize-none`}
          />
        </div>
      ) : null}
    </div>
  );

  const materialsBlock = (
    <KnowledgeGraphToggle
      enabled={values.enableKnowledgeGraph}
      onChangeEnabled={(enabled) => onChange({ enableKnowledgeGraph: enabled })}
      files={values.files}
      onChangeFiles={(files) => onChange({ files })}
      inputId={filesInputId}
      materialsRequired={values.inferCategoriesByAi}
      materialsRequiredHint={t('stages.brandInput.kbRequiredForAiInferHint')}
      hideKnowledgeGraphToggle
    />
  );

  const platformsBlock = (
    <div className="space-y-5">
      <AiPlatformPicker
        selected={values.aiPlatforms}
        onChange={(next) => onChange({ aiPlatforms: next })}
        label={t('stages.brandInput.domesticAiLabel')}
      />
      {showOverseas ? (
        <OverseasPlatformPicker
          selected={values.overseasPlatforms}
          onChange={(next) => onChange({ overseasPlatforms: next })}
          onOverseasNotOpenHint={onOverseasNotOpenHint}
          notOpenHint={t('stages.brandInput.overseasAiNotOpenHint')}
        />
      ) : null}
    </div>
  );

  if (section === 'object') return objectBlock;
  if (section === 'materials') return materialsBlock;
  if (section === 'platforms') return platformsBlock;

  return (
    <div className="space-y-4">
      {objectBlock}
      {materialsBlock}
      {platformsBlock}
    </div>
  );
};

export default BrandIntakeFormFields;
