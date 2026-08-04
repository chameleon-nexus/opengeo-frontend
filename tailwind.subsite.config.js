/** @type {import('tailwindcss').Config} - 子站全部模板专用 */
const path = require('path');

module.exports = {
  content: [
    // 扫描 openbackend 子站模板（含 default/corporate/tech/editorial）
    path.join(__dirname, '../openbackend/app/templates/**/*.html'),
  ],
  theme: {
    extend: {
      colors: {
        'geo-bg': '#1A1A1A',
        'geo-blue': '#3B82F6',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
