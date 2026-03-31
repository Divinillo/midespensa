interface Env {
  ASSETS: { fetch: (request: Request | string) => Promise<Response> };
}

// Handles /app and /app/ — serves the React SPA
export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  url.pathname = '/app/index.html';
  return context.env.ASSETS.fetch(url.toString());
};
