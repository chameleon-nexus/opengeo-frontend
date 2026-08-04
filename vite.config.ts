import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',  // Base public path when served in production
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['test111.htsjgeo.com', '.htsjgeo.com', 'test111.aieo.com', '.aieo.com'],
      },
      plugins: [
        react(),
        {
          name: 'spa-route-fallback',
          configureServer(server) {
            server.middlewares.use((req, _res, next) => {
              const pathname = (req.url ?? '').split('?')[0];
              // /app 在 Windows 下会被 Vite 误解析为 App.tsx，强制走 SPA 入口
              if (
                pathname === '/' ||
                pathname === '/app' ||
                pathname === '/workspace' ||
                pathname === '/login' ||
                pathname === '/site-admin' ||
                pathname.startsWith('/site-admin/') ||
                pathname === '/diagnosis-report' ||
                pathname === '/data-screen' ||
                pathname === '/credential'
              ) {
                req.url = '/index.html';
              }
              next();
            });
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      publicDir: 'public',
      build: {
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            assetFileNames: 'assets/[name].[hash].[ext]',
            chunkFileNames: 'assets/[name].[hash].js',
            entryFileNames: 'assets/[name].[hash].js',
            manualChunks(id) {
              if (id.includes('node_modules/react-dom/')) return 'vendor-react';
              if (id.includes('node_modules/react/')) return 'vendor-react';
              if (id.includes('node_modules/echarts/')) return 'vendor-echarts';
              if (id.includes('node_modules/echarts-wordcloud/')) return 'vendor-echarts';
              if (id.includes('node_modules/zrender/')) return 'vendor-echarts';
              if (id.includes('node_modules/recharts/')) return 'vendor-recharts';
              if (id.includes('node_modules/d3-')) return 'vendor-recharts';
              if (id.includes('node_modules/lucide-react/')) return 'vendor-icons';
              if (id.includes('node_modules/react-icons/')) return 'vendor-react-icons';
              if (id.includes('node_modules/html2pdf')) return 'vendor-html2pdf';
              if (id.includes('node_modules/@react-pdf/')) return 'vendor-react-pdf';
              if (id.includes('node_modules/@fontsource/')) return 'vendor-fonts';
            },
          }
        }
      }
    };
});
