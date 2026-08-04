
import React from 'react';
import { CTA as CTAType } from '../../types/landing';
import { Theme } from '../../types';
import GeoMenuLayer from '../GeoMenuLayer';
import { useGeoMenu } from '../../hooks/useGeoMenu';

interface CTAProps {
  section: CTAType;
  theme: Theme;
  landingSurface?: 'default' | 'aidso';
  onNavigate?: (page: 'home' | 'pricing') => void;
  onNavigateToLogin?: () => void;
}

function renderTitleWithGeoHover(
  title: string,
  openGeoMenu: () => void,
  scheduleClose: () => void,
  geoUnderlineClass = 'decoration-white/50',
) {
  const m = title.match(/^(.*?)(GEO)(.*)$/);
  if (!m) {
    return title;
  }
  return (
    <>
      {m[1]}
      <span
        className={`cursor-default underline decoration-dotted underline-offset-[0.35em] ${geoUnderlineClass}`}
        onMouseEnter={openGeoMenu}
        onMouseLeave={scheduleClose}
      >
        GEO
      </span>
      {m[3]}
    </>
  );
}

const CTA: React.FC<CTAProps> = ({ section, theme, landingSurface = 'default', onNavigate, onNavigateToLogin }) => {
  const isDark = theme === 'dark';
  const aidso = landingSurface === 'aidso' && !isDark;
  const { geoMenuOpen, openGeoMenu, scheduleCloseGeoMenu } = useGeoMenu();

  if (section.disabled) {
    return null;
  }

  const sectionId = section.name || 'growth-consult-section';

  return (
    <section
      id={sectionId}
      className={`py-12 sm:py-16 ${isDark ? 'bg-geo-bg' : aidso ? 'bg-[#f8f9fb]' : 'bg-slate-100'}`}
    >
      <div className="mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8">
        <div
          className={`growth-consult-card relative overflow-hidden rounded-2xl ${
            aidso
              ? 'border border-slate-200/90 shadow-xl shadow-slate-200/45'
              : 'shadow-2xl shadow-violet-950/40 ring-1 ring-white/10'
          }`}
        >
          {!aidso && (
            <>
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#1a0638] via-[#2a1260] to-[#0f0520]"
                aria-hidden
              />
              <div
                className="absolute -right-16 top-0 h-[140%] w-[55%] rounded-full bg-gradient-to-l from-fuchsia-500/35 via-violet-500/25 to-transparent blur-3xl"
                aria-hidden
              />
              <div
                className="absolute -left-20 bottom-[-10%] h-[90%] w-[48%] rounded-full bg-gradient-to-tr from-sky-400/25 via-indigo-500/20 to-transparent blur-3xl"
                aria-hidden
              />
              <div
                className="absolute left-[15%] top-1/2 h-24 w-[70%] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent blur-2xl"
                aria-hidden
              />
              <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(167,139,250,0.18),transparent_55%)]"
                aria-hidden
              />
            </>
          )}
          {aidso && (
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#faf8ff] via-white to-[#f0f9ff]"
              aria-hidden
            />
          )}

          <div className="growth-consult-card__content relative z-10 flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center sm:min-h-[360px] sm:px-10 sm:py-16 md:min-h-[400px] lg:px-16">
            <h2
              className={`mb-5 max-w-4xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl ${
                aidso ? 'text-[#111827]' : 'text-white'
              }`}
            >
              {renderTitleWithGeoHover(
                section.title || '',
                openGeoMenu,
                scheduleCloseGeoMenu,
                aidso ? 'decoration-violet-400/55' : 'decoration-white/50',
              )}
            </h2>
            {section.description && (
              <p
                className={`mb-10 max-w-3xl text-base leading-relaxed md:text-lg ${
                  aidso ? 'text-[#4b5563]' : 'text-white/90'
                }`}
              >
                {section.description}
              </p>
            )}
            {section.buttons && section.buttons.length > 0 && (
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                {section.buttons.map((item, idx) => {
                  const isPrimary = item.variant !== 'outline';
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (onNavigateToLogin) {
                          onNavigateToLogin();
                        } else if (item.url === '/pricing' && onNavigate) {
                          onNavigate('pricing');
                        }
                      }}
                      className={
                        aidso
                          ? isPrimary
                            ? 'inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-xl bg-gradient-to-r from-[#E8553F] to-[#FF9B85] px-10 py-3.5 text-base font-semibold text-white shadow-md shadow-[#E8553F]/25 transition hover:opacity-95'
                            : 'inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-[#111827] transition hover:bg-slate-50'
                          : isPrimary
                            ? 'inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-xl bg-slate-100 px-10 py-3.5 text-base font-semibold text-slate-900 shadow-sm transition hover:bg-white'
                            : 'inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/30 bg-transparent px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10'
                      }
                    >
                      {item.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <GeoMenuLayer
        open={geoMenuOpen}
        onMouseEnter={openGeoMenu}
        onMouseLeave={scheduleCloseGeoMenu}
      />
    </section>
  );
};

export default CTA;
