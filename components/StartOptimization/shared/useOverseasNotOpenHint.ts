import { useCallback, useRef } from 'react';
import { OVERSEAS_AI_NOT_OPEN_TOAST, OVERSEAS_AI_OPEN } from '../../../constants/overseasAiOpen';

export function useOverseasNotOpenHint(showToast: (text: string) => void) {
  const sessionHintRef = useRef(false);

  const notifyOverseasNotOpen = useCallback(() => {
    if (OVERSEAS_AI_OPEN) return;
    showToast(OVERSEAS_AI_NOT_OPEN_TOAST);
  }, [showToast]);

  /** 国际块：从无出海路径到有出海路径时只提示一次，路径清空后可再提示 */
  const notifyOverseasPathActivated = useCallback(() => {
    if (OVERSEAS_AI_OPEN || sessionHintRef.current) return;
    sessionHintRef.current = true;
    showToast(OVERSEAS_AI_NOT_OPEN_TOAST);
  }, [showToast]);

  const resetOverseasPathHint = useCallback(() => {
    sessionHintRef.current = false;
  }, []);

  return { notifyOverseasNotOpen, notifyOverseasPathActivated, resetOverseasPathHint };
}
