// ============================================================
// FantaOracle · Proxy RSS affidabile (Vercel Serverless Function)
// ------------------------------------------------------------
// Sostituisce i proxy CORS pubblici instabili (allorigins, corsproxy...).
// Scarica i feed lato server (niente problemi CORS) e li restituisce al
// frontend con gli header giusti. Whitelist di host per evitare che la
// funzione diventi un open proxy.
//
// Posiziona questo file in:  ~/Desktop/fantaoracle/api/feed.js
// Vercel lo espone automaticamente su:  /api/feed?url=<feed_url>
// Nessuna configurazione aggiuntiva necessaria.
// ============================================================

const ALLOWED_HOSTS = [
  'fantacalcio.it', 'www.fantacalcio.it',
  'fantamaster.it', 'www.fantamaster.it',
  'sosfanta.com', 'www.sosfanta.com',
  'fantagazzetta.com', 'www.fantagazzetta.com',
];

export default async function handler(req, res) {
  // CORS: consenti al frontend (anche da altri domini) di chiamare la funzione
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const target = req.query && req.query.url;
  if (!target || typeof target !== 'string') {
    res.status(400).json({ error: 'parametro url mancante' });
    return;
  }

  let parsed;
  try { parsed = new URL(target); }
  catch (e) { res.status(400).json({ error: 'url non valido' }); return; }

  // Solo http(s) e solo host noti: niente open proxy
  if (!['http:', 'https:'].includes(parsed.protocol) ||
      !ALLOWED_HOSTS.includes(parsed.hostname)) {
    res.status(403).json({ error: 'host non consentito' });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FantaOracle/1.0 (+https://www.lunghi.ch)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      res.status(502).json({ error: 'feed non raggiungibile', status: upstream.status });
      return;
    }

    const xml = await upstream.text();
    // Cache a livello edge: 5 min freschi + 10 min stale-while-revalidate
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).send(xml);
  } catch (e) {
    const msg = (e && e.name === 'AbortError') ? 'timeout' : String((e && e.message) || e);
    res.status(504).json({ error: 'lettura feed fallita', detail: msg });
  }
}
