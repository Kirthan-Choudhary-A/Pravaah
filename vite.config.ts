import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Serves /api/* during `npm run dev` with the same handlers Vercel runs, keys from .env.local. */
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'pravaah-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const { handleApi } = await server.ssrLoadModule('/server/handlers.ts');
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = Buffer.concat(chunks);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (typeof v === 'string') headers.set(k, v);
        }
        const request = new Request(`http://localhost${req.url}`, {
          method: req.method ?? 'GET',
          headers,
          ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body }),
        });
        const response: Response = await handleApi(request, env);
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [react(), devApi(env)],
    resolve: {
      alias: {
        '@app': path.resolve(__dirname, './src/app'),
        '@components': path.resolve(__dirname, './src/components'),
        '@features': path.resolve(__dirname, './src/features'),
        '@engine': path.resolve(__dirname, './src/engine'),
        '@data': path.resolve(__dirname, './src/data'),
        '@state': path.resolve(__dirname, './src/state'),
        '@three': path.resolve(__dirname, './src/three'),
        '@animations': path.resolve(__dirname, './src/animations'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@config': path.resolve(__dirname, './src/config'),
        '@i18n': path.resolve(__dirname, './src/i18n'),
        '@types': path.resolve(__dirname, './src/types'),
        '@utils': path.resolve(__dirname, './src/utils'),
      },
    },
  };
});
