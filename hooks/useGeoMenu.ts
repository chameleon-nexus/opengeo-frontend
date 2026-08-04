import { useCallback, useEffect, useRef, useState } from 'react';

/** 顶栏 / CTA 标题中「GEO」悬停展示产品浮层 */
export function useGeoMenu() {
  const [geoMenuOpen, setGeoMenuOpen] = useState(false);
  const geoCloseTimerRef = useRef<number | null>(null);

  const openGeoMenu = useCallback(() => {
    if (geoCloseTimerRef.current !== null) {
      window.clearTimeout(geoCloseTimerRef.current);
      geoCloseTimerRef.current = null;
    }
    setGeoMenuOpen(true);
  }, []);

  const scheduleCloseGeoMenu = useCallback(() => {
    if (geoCloseTimerRef.current !== null) window.clearTimeout(geoCloseTimerRef.current);
    geoCloseTimerRef.current = window.setTimeout(() => {
      setGeoMenuOpen(false);
      geoCloseTimerRef.current = null;
    }, 400);
  }, []);

  useEffect(
    () => () => {
      if (geoCloseTimerRef.current !== null) window.clearTimeout(geoCloseTimerRef.current);
    },
    [],
  );

  return { geoMenuOpen, openGeoMenu, scheduleCloseGeoMenu };
}
