export const config = { runtime: 'edge' }

export default function handler() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
