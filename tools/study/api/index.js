// Vercel entry. The real handler is bundled into dist-api/handler.mjs by `npm run build:vercel`.
export default async function (req, res) {
  const { default: handler } = await import('../dist-api/handler.mjs');
  return handler(req, res);
}
