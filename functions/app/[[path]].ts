interface Env {
  ASSETS: { fetch: (request: Request | string) => Promise<Response> };
}

// Handles /app/* deep links — serves the React SPA for client-side routing
export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  url.pathname = '/app/index.html';
  return context.env.ASSETS.fetch(url.toString());
};
