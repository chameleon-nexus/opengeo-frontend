import { Font } from '@react-pdf/renderer';
import notoRegular from '@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-400-normal.woff?url';
import notoBold from '@fontsource/noto-sans-sc/files/noto-sans-sc-chinese-simplified-700-normal.woff?url';

let registered = false;

export function ensureGeoReportPdfFonts(): void {
  if (registered) return;
  Font.register({
    family: 'NotoSansSC',
    fonts: [
      { src: notoRegular, fontWeight: 400 },
      { src: notoBold, fontWeight: 700 },
    ],
  });
  registered = true;
}
