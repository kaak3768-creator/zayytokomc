'use strict';
const { handler, send, requireMethod, query } = require('../lib/core');
const { getProducts, promoInfo, CATEGORIES } = require('../lib/catalog');
const store = require('../lib/store');

// Samarkan identitas pembeli: "budi_123" -> "bu***"
const mask = (s) => { s = String(s || '').split('@')[0].replace(/[^A-Za-z0-9_. ]/g, ''); return (s.length < 3 ? s.slice(0, 1) : s.slice(0, 2)) + '***'; };

// Pembelian NYATA terbaru (sudah lunas) untuk banner "baru saja membeli". Tidak pernah dikarang.
async function recentFeed() {
  if (!store.enabled()) return [];
  const ids = await store.lrange('zs:orders', 0, 24);
  if (!ids.length) return [];
  const [os, ds] = await Promise.all([store.mget(ids.map((t) => `zs:order:${t}`)), store.mget(ids.map((t) => `zs:done:${t}`))]);
  const out = [];
  os.forEach((o, i) => {
    const d = ds[i];
    if (!o || !d || !d.paidAt || Date.now() - d.paidAt > 7 * 86400e3) return;
    if (o.m !== 'live' && process.env.VERCEL) return;           // pesanan uji (sandbox) tidak ditampilkan di toko sungguhan
    const first = o.i && o.i[0]; if (!first) return;
    const extra = o.i.length > 1 ? ` +${o.i.length - 1} lainnya` : '';
    out.push({ who: mask(o.u || (o.a && o.a) || o.e), item: (first[2] || first[0]) + extra, ts: d.paidAt });
  });
  return out.slice(0, 10);
}

// Daftar produk publik untuk etalase (tanpa data internal). ?feed=1 -> pembelian terbaru.
module.exports = handler(async (req, res) => {
  requireMethod(req, 'GET');
  if (query(req).get('feed')) return send(res, 200, { feed: await recentFeed() }, { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' });
  const all = await getProducts();
  const products = Object.values(all).map((p) => {
    const parts = Array.isArray(p.bundle) ? p.bundle.map((id) => all[id]).filter(Boolean) : [];
    const worth = parts.reduce((s, x) => s + x.price, 0);
    return {
      id: p.id, name: p.name, price: p.price, desc: p.desc || '', ...(p.cat ? { cat: p.cat } : {}), ...(p.featured ? { featured: true } : {}), ...(p.type === 'auto' ? { auto: true } : {}), ...(p.stock != null ? { stock: p.stock } : {}), ...(p.detail ? { detail: p.detail } : {}),
      img: p.img ? `/api/img?id=${p.id}&v=${p.img}` : null,
      ...(parts.length > 1 ? { bundle: parts.map((x) => x.name), worth } : {}),
    };
  });
  send(res, 200, { products, promo: promoInfo(), categories: CATEGORIES });
});
