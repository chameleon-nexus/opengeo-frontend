import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
  AI_PLATFORM_DESC,
  CITATION_PREF_DESC,
  type EnrichedGeoReport,
  type InteractivePkView,
  platformRankToMentionLabel,
} from '../miniReportEnrich';
import { RadarChartPdf } from './RadarChartPdf';
import { pdfStyles as s } from './styles';
import i18n from '../../i18n/config';

export type GeoReportPdfDocumentProps = {
  enriched: EnrichedGeoReport;
  pkView: InteractivePkView;
};

const rt = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key, { ns: 'report', ...options });

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={s.sectionTitleRow}>
      <View style={s.sectionBar} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function SummaryBlock({
  line1,
  line2,
  foot,
}: {
  line1: string;
  line2?: string;
  foot?: string;
}) {
  return (
    <View style={s.card}>
      <Text style={s.summaryBadge}>总结</Text>
      {line1 ? <Text style={s.summaryText}>{line1}</Text> : null}
      {line2 ? <Text style={s.summaryText}>{line2}</Text> : null}
      {foot ? <Text style={s.summaryFoot}>{foot}</Text> : null}
    </View>
  );
}

function formatPlatformCell(rank: string): string {
  const r = String(rank || '').toLowerCase();
  if (r === 'none') return rt('status.notMentioned');
  if (['top1', 'top2', 'top3', 'top4', 'top5'].includes(r)) {
    return platformRankToMentionLabel(rank);
  }
  return rank || '—';
}

function rankLabel(rank: number): string {
  return `第${rank}名`;
}

const GeoReportPdfDocument: React.FC<GeoReportPdfDocumentProps> = ({ enriched, pkView }) => {
  const platformCols = enriched._aiPlatformCols;
  const reportTitle = rt('reportTitle', { brandName: enriched.brandName });

  return (
    <Document title={reportTitle}>
      <Page size="A4" style={s.page}>
        {enriched.industry ? <Text style={s.coverMeta}>{enriched.industry}</Text> : null}
        <Text style={s.coverTitle}>{reportTitle}</Text>
        <Text style={s.coverMeta}>{rt('diagnosisTime', { dateTime: enriched._dateTimeFull })}</Text>

        {enriched._pkLeaderboard.length > 0 ? (
          <View style={s.section} wrap={false}>
            <SectionTitle title={rt('sections.brandScoreLeaderboard')} />
            <Text style={s.sectionDesc}>
              {rt('sections.brandScoreLeaderboardHint')}
            </Text>
            <View style={s.table}>
              <View style={[s.tableRow, s.tableHeader]}>
                <Text style={s.tableCellNarrow}>名次</Text>
                <Text style={s.tableCellWide}>品牌</Text>
                <Text style={[s.tableCellNarrow, { textAlign: 'right' }]}>评分</Text>
              </View>
              {enriched._pkLeaderboard.map((row, idx) => {
                const showGap =
                  enriched._pkLeaderboardShowEllipsis
                  && row.isSelf
                  && idx === enriched._pkLeaderboard.length - 1;
                return (
                  <React.Fragment key={`${row.rank}-${row.name}`}>
                    {showGap ? (
                      <Text style={s.ellipsisRow}>···</Text>
                    ) : null}
                    <View style={[s.tableRow, row.isSelf ? s.selfHighlight : {}]}>
                      <Text style={s.tableCellNarrow}>{rankLabel(row.rank)}</Text>
                      <Text style={s.tableCellWide}>
                        {row.name}
                        {row.isSelf ? `（${rt('sections.thisBrand')}）` : ''}
                      </Text>
                      <Text style={[s.tableCellNarrow, { textAlign: 'right' }]}>{row.score} 分</Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={s.section} wrap={false}>
          <SectionTitle title="品牌 PK 对比" />
          <View style={s.pkRow}>
            <View style={s.pkBox}>
              <Text style={s.pkName}>{enriched.brandName}</Text>
              <Text style={s.pkScore}>
                {enriched._brandScore}
                <Text style={{ fontSize: 10 }}> 分</Text>
              </Text>
            </View>
            <View style={s.pkMid}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>PK</Text>
            </View>
            <View style={[s.pkBox, { position: 'relative' }]}>
              {pkView.rivalBadge ? <Text style={s.pkBadge}>{pkView.rivalBadge}</Text> : null}
              <Text style={s.pkName}>{pkView.compName}</Text>
              <Text style={s.pkScoreRival}>
                {pkView.compScore}
                <Text style={{ fontSize: 10 }}> 分</Text>
              </Text>
            </View>
          </View>

          {pkView.compareBars.map((bar) => (
            <View key={bar.label} style={s.compareRow}>
              <View style={s.compareValues}>
                <Text>{bar.leftText}</Text>
                <Text>{bar.rightText}</Text>
              </View>
              <View style={s.compareBarTrack}>
                <View style={[s.compareBarFill, { width: `${bar.leftPercent}%` }]} />
              </View>
              <Text style={s.compareLabel}>{bar.label}</Text>
            </View>
          ))}

          <SummaryBlock
            line1={pkView.fsSummaryLine1}
            line2={pkView.fsSummaryLine2}
            foot={enriched._fsSummaryFoot}
          />
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.section}>
          <SectionTitle title={rt('sections.brandVisibility')} />
          <RadarChartPdf rows={enriched.radarRows} showIndustry={enriched._showIndustryBenchmark} />
          <View style={s.metricGrid}>
            {enriched.visibilityCards.map((card) => (
              <View key={card.title} style={s.metricCard}>
                <Text style={s.metricTitle}>{card.title}</Text>
                <Text style={s.metricValue}>
                  {card.value}
                  {card.unit ? ` ${card.unit}` : ''}
                </Text>
              </View>
            ))}
          </View>
          <SummaryBlock
            line1={enriched._visibilitySummaryLine1}
            line2={enriched._visibilitySummaryLine2}
            foot={enriched._visibilitySummaryFoot}
          />
        </View>

        <View style={s.section} break>
          <SectionTitle title={rt('sections.aiCompetitiveness')} />
          <Text style={s.sectionDesc}>{AI_PLATFORM_DESC}</Text>
          <View style={s.table}>
            <View style={[s.tableRow, s.tableHeader]}>
              <Text style={s.tableCellWide}>核心词</Text>
              {platformCols.map((col) => (
                <Text key={col.id} style={[s.tableCell, { textAlign: 'center' }]}>
                  {col.name}
                </Text>
              ))}
            </View>
            {enriched._aiPlatformRows.length === 0 ? (
              <View style={s.tableRow}>
                <Text style={s.tableCell}>暂无核心词数据</Text>
              </View>
            ) : (
              enriched._aiPlatformRows.map((row) => (
                <View key={row.rowId} style={s.tableRow}>
                  <Text style={s.tableCellWide}>{row.keyword}</Text>
                  {row.platforms.map((rk, i) => (
                    <Text key={i} style={[s.tableCell, { textAlign: 'center' }]}>
                      {formatPlatformCell(rk)}
                    </Text>
                  ))}
                </View>
              ))
            )}
          </View>
          <SummaryBlock
            line1={enriched._aiPlatformSummaryLine1}
            line2={enriched._aiPlatformSummaryLine2}
            foot={enriched._aiPlatformSummaryFoot}
          />
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.section}>
          <SectionTitle title={rt('sections.aiMentionRanking')} />
          <Text style={s.sectionDesc}>{enriched._aiRankingSubtitle}</Text>
          <View style={s.table}>
            <View style={[s.tableRow, s.tableHeader]}>
              <Text style={s.tableCellNarrow}>名次</Text>
              {platformCols.map((col) => (
                <Text key={col.id} style={[s.tableCell, { textAlign: 'center' }]}>
                  {col.name}
                </Text>
              ))}
            </View>
            {enriched._aiRankingRows.map((row, idx) => (
              <View key={row.rowId} style={s.tableRow}>
                <Text style={s.tableCellNarrow}>{row.rankLabel || `第${idx + 1}名`}</Text>
                {row.cells.map((cell, ci) => (
                  <Text
                    key={ci}
                    style={[
                      s.tableCell,
                      { textAlign: 'center' },
                      cell.highlight ? { color: '#6d28d9', fontWeight: 700 } : {},
                    ]}
                  >
                    {cell.text}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          <SummaryBlock
            line1={enriched._aiRankingSummaryLine1}
            line2={enriched._aiRankingSummaryLine2}
            foot={enriched._aiRankingSummaryFoot}
          />
        </View>

        <View style={s.section} break>
          <SectionTitle title={rt('sections.positiveKeywords')} />
          {enriched._positiveWords.length === 0 ? (
            <Text style={s.muted}>暂无正面提及词</Text>
          ) : (
            <View style={s.tagWrap}>
              {enriched._positiveWords.map((w, i) => (
                <Text key={w.id || w.text} style={[s.tag, { fontSize: 8 + Math.min(4, Math.floor(i === 0 ? 4 : Math.max(0, 3 - i * 0.3))) }]}>
                  {w.text}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.section}>
          <SectionTitle title={rt('sections.modelCitationPreference')} />
          <Text style={s.sectionDesc}>{CITATION_PREF_DESC}</Text>
          {enriched._citationPlatforms.map((plat) => (
            <View key={plat.id} style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{plat.name} 引用来源</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableHeader]}>
                  <Text style={s.tableCellNarrow}>排名</Text>
                  <Text style={s.tableCellWide}>来源</Text>
                  <Text style={[s.tableCellNarrow, { textAlign: 'right' }]}>占比</Text>
                </View>
                {plat.pairRows.flatMap((prow) => [prow.left, prow.right]).map((cell) => (
                  <View key={`${plat.id}-${cell.rankNum}`} style={s.tableRow}>
                    <Text style={s.tableCellNarrow}>{cell.rankNum}</Text>
                    <Text style={s.tableCellWide}>{cell.name}</Text>
                    <Text style={[s.tableCellNarrow, { textAlign: 'right' }]}>{cell.pct}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={s.section} break>
          <SectionTitle title={rt('sections.optimizationSuggestions')} />
          {enriched._optimizationSuggestions.length === 0 ? (
            <Text style={s.muted}>{rt('empty.noSuggestions')}</Text>
          ) : (
            enriched._optimizationSuggestions.map((raw, idx) => {
              const sg = raw as {
                num?: string | number;
                title?: string;
                platform?: string;
                trigger?: string;
                output?: string;
                howLines?: string[];
                metrics?: string;
              };
              const howLines = Array.isArray(sg.howLines) ? sg.howLines : [];
              return (
                <View key={idx} style={s.optCard} wrap={false}>
                  <Text style={s.optTitle}>
                    {sg.num != null ? `${sg.num}. ` : `${idx + 1}. `}
                    {sg.title || '—'}
                  </Text>
                  <Text style={s.optLine}>
                    <Text style={s.muted}>优先优化平台：</Text>
                    {sg.platform ?? '—'}
                  </Text>
                  <Text style={s.optLine}>
                    <Text style={s.muted}>触发点：</Text>
                    {sg.trigger ?? '—'}
                  </Text>
                  <Text style={s.optLine}>
                    <Text style={s.muted}>要产出：</Text>
                    {sg.output ?? '—'}
                  </Text>
                  {howLines.length ? (
                    <View style={{ marginTop: 4 }}>
                      <Text style={[s.optLine, s.muted]}>怎么写：</Text>
                      {howLines.map((line, li) => (
                        <Text key={li} style={s.optLine}>
                          · {line}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  <Text style={s.optLine}>
                    <Text style={s.muted}>预期提升指标：</Text>
                    {sg.metrics ?? '—'}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </Page>
    </Document>
  );
};

export default GeoReportPdfDocument;
