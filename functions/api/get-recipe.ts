// This endpoint has been disabled — recipe content is now served from
// the static RECIPE_DB bundle included in the client, with no server call needed.
export const onRequest: PagesFunction = async () =>
  new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
