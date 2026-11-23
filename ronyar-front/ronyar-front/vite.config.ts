import { defineConfig, type Plugin } from "vite";

const salesPreviewRoute: Plugin = {
  name: "sales-preview-route",
  configureServer(server) {
    server.middlewares.use(rewriteSalesPreview);
  },
  configurePreviewServer(server) {
    server.middlewares.use(rewriteSalesPreview);
  },
};

function rewriteSalesPreview(
  request: { url?: string },
  _response: unknown,
  next: () => void,
) {
  if (request.url && /^\/sales-preview\/?(?:\?|$)/.test(request.url)) {
    request.url = request.url.replace(/^\/sales-preview\/?/, "/sales-preview/index.html");
  }
  next();
}

export default defineConfig({
  plugins: [salesPreviewRoute],
  build: {
    rolldownOptions: { input: ["index.html", "sales-preview/index.html"] },
  },
  server: {
    proxy: {
      "/v2": { target: "http://localhost:3010", changeOrigin: false },
    },
  },
});
