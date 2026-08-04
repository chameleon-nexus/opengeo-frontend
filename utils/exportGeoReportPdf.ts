import React from 'react';
import { pdf } from '@react-pdf/renderer';
import type { EnrichedGeoReport, InteractivePkView } from './miniReportEnrich';
import { sanitizeExportFilenamePart } from './downloadSpreadsheet';
import { ensureGeoReportPdfFonts } from './geoReportPdf/fonts';

export type ExportGeoReportPdfInput = {
  enriched: EnrichedGeoReport;
  pkView: InteractivePkView;
};

function triggerPdfDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildPdfFilename(brandName: string): string {
  const brandPart = sanitizeExportFilenamePart(brandName, '品牌');
  const datePart = new Date().toISOString().slice(0, 10);
  return `${brandPart}_GEO诊断报告_${datePart}.pdf`;
}

/** 基于 EnrichedGeoReport 数据生成 PDF 并触发浏览器下载 */
export async function exportGeoReportPdf(input: ExportGeoReportPdfInput): Promise<void> {
  ensureGeoReportPdfFonts();

  const { default: GeoReportPdfDocument } = await import('./geoReportPdf/GeoReportPdfDocument');

  const blob = await pdf(
    React.createElement(GeoReportPdfDocument, {
      enriched: input.enriched,
      pkView: input.pkView,
    }),
  ).toBlob();

  triggerPdfDownload(buildPdfFilename(input.enriched.brandName), blob);
}
