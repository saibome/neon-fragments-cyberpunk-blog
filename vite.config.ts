import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import devServer from '@hono/vite-dev-server';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ isSsrBuild }) => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    // SSR 产物不需要再复制一份 public 静态资源
    publicDir: isSsrBuild ? false : 'public',
    plugins: [
      tailwindcss(),
      react(),
      // 仅开发期挂载 Hono dev server
      ...(isSsrBuild ? [] : [devServer({
        entry: 'server/index.ts',
        exclude: [
          /.*\.tsx?($|\?)/,
          /.*\.css($|\?)/,
          // /card/*.png 由 Hono 动态生成，不能被 Vite 截走；其它 png 走静态资源
          /^(?!\/card\/).*\.png($|\?)/,
          /.*\.jpe?g($|\?)/,
          /.*\.gif($|\?)/,
          /.*\.svg($|\?)/,
          /^\/@.+$/,
          /^\/node_modules\/.*/,
        ]
      })])
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      }
    },
    ssr: {
      noExternal: ['react-helmet-async']
    }
  };
});
