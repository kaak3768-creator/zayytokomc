'use strict';
/**
 * API Admin Panel (semua butuh sesi admin: header Authorization: Bearer <token dari /api/auth>)
 *  GET  ?action=products | users | orders | activity
 *  POST {action:"save-product", id?, name, price, desc, delivery, needsUsername, cat (id kategori, wajib), featured?: bool, bundle?: [idProduk,...], image?}
 *  POST {action:"delete-product", id}
 *  POST {action:"reset-password", email, password}
 */
const crypto = require('crypto');
const { handler, send, readJson, query, HttpError, requireAdmin, hashPw } = require('../lib/core');
const store = require('../lib/store');
const { getProducts, CAT_IDS } = require('../lib/catalog');

const IMG_RE = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

async function allUsers() {
  const emails = await store.smembers('zs:users');
  return (await store.mget(emails.map((e) => `zs:user:${e}`))).filter(Boolean);
}

async function loadOrders() {                       // 300 pesanan terakhir + data lunas + status kirim
  const ids = await store.lrange('zs:orders', 0, 299);
  const [os, ds, ss] = await Promise.all([
    store.mget(ids.map((t) => `zs:order:${t}`)), store.mget(ids.map((t) => `zs:done:${t}`)), store.mget(ids.map((t) => `zs:ship:${t}`)),
  ]);
  return os.map((o, i) => o && { o, d: ds[i], s: ss[i] }).filter(Boolean);
}

module.exports = handler(async (req, res) => {
  requireAdmin(req);
  if (!store.enabled()) throw new HttpError(503, 'Redis belum dikonfigurasi (UPSTASH_REDIS_REST_URL / _TOKEN).');

  if (req.method === 'GET') {
    const a = query(req).get('action');
    if (a === 'products') {
      await getProducts();
      const list = (await store.getJson('zs:products')) || [];
      const st = await store.mget(list.map((p) => `zs:stock:${p.id}`));
      return send(res, 200, { products: list.map((p, i) => ({ ...p, stock: st[i] ?? null })) });
    }

    if (a === 'users' || a === 'activity') {
      const users = (await allUsers()).map(({ email, name, createdAt, lastSeen, visits }) => ({ email, name, createdAt, lastSeen, visits: visits || 0 }));
      users.sort((x, y) => (a === 'activity' ? y.lastSeen - x.lastSeen : y.createdAt - x.createdAt));
      return send(res, 200, { users });
    }

    if (a === 'orders') {
      const now = Date.now();
      const orders = (await loadOrders()).map(({ o, d, s }) => ({
        orderId: o.o, trx: o.t, email: o.e, account: o.a || null, username: o.u || null,
        items: o.i.map(([, q, n]) => `${n} ×${q}`), total: o.T, ts: o.ts, mode: o.m,
        status: d ? 'paid' : o.x < now ? 'failed' : 'pending',
        manual: !!(d && (d.deliveries || []).some((x) => x.manual)), shipped: !!s,
      }));
      return send(res, 200, { orders });
    }

    if (a === 'stats') {
      const rows = (await loadOrders()).filter(({ o }) => o.m === 'live' || !process.env.VERCEL);
      const DAY = 864e5, now = Date.now();
      const start = Math.floor((now + 7 * 3600e3) / DAY) * DAY - 7 * 3600e3;   // 00:00 WIB hari ini
      const days = Array.from({ length: 7 }, (_, k) => ({ t: start - (6 - k) * DAY, rev: 0, n: 0 }));
      let total = 0, paidN = 0, pending = 0, toShip = 0;
      const top = new Map();
      for (const { o, d, s } of rows) {
        if (d) {
          paidN++; total += o.T;
          const at = d.paidAt || o.ts;
          for (const x of days) if (at >= x.t && at < x.t + DAY) { x.rev += o.T; x.n++; }
          for (const [id, q, n] of o.i) top.set(n || id, (top.get(n || id) || 0) + q);
          if ((d.deliveries || []).some((x) => x.manual) && !s) toShip++;
        } else if (o.x > now) pending++;
      }
      const pad = (n) => String(n).padStart(2, '0');
      return send(res, 200, {
        today: days[6].rev, todayN: days[6].n, week: days.reduce((m, x) => m + x.rev, 0), total, paidN, pending, toShip,
        users: (await store.smembers('zs:users')).length,
        days: days.map((x) => { const t = new Date(x.t + 7 * 3600e3); return { label: `${pad(t.getUTCDate())}/${pad(t.getUTCMonth() + 1)}`, rev: x.rev }; }),
        top: [...top].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })),
      });
    }
    throw new HttpError(400, 'Aksi tidak dikenal.');
  }

  if (req.method === 'POST') {
    const b = await readJson(req);

    if (b.action === 'save-product') {
      const name = String(b.name || '').trim().slice(0, 80);
      const price = Number(b.price);
      if (name.length < 2) throw new HttpError(400, 'Nama produk minimal 2 karakter.');
      if (!Number.isInteger(price) || price < 1000 || price > 100_000_000) throw new HttpError(400, 'Harga harus bilangan bulat, minimal Rp 1.000.');
      const list = (await store.getJson('zs:products')) || [];
      let p = b.id ? list.find((x) => x.id === b.id) : null;
      if (b.id && !p) throw new HttpError(404, 'Produk tidak ditemukan.');
      if (!p) { p = { id: 'p' + crypto.randomBytes(4).toString('hex') }; list.push(p); }
      if (!CAT_IDS.has(String(b.cat || ''))) throw new HttpError(400, 'Pilih kategori produk.');
      p.cat = String(b.cat);
      if (b.featured) p.featured = true; else delete p.featured;   // tampil di bagian "Produk Paling Laku"
      if (Array.isArray(b.bundle)) {                       // paket bundling: daftar id produk isi paket
        const ids = [...new Set(b.bundle.map(String))];
        if (ids.length === 0) delete p.bundle;
        else {
          if (ids.length < 2 || ids.length > 6) throw new HttpError(400, 'Paket bundling harus berisi 2–6 produk.');
          for (const id of ids) {
            const c = list.find((x) => x.id === id);
            if (!c || c.bundle || id === p.id) throw new HttpError(400, 'Isi paket tidak valid (pilih produk biasa, bukan paket lain).');
          }
          p.bundle = ids;
        }
      }
      Object.assign(p, { name, price, desc: String(b.desc || '').trim().slice(0, 600), delivery: String(b.delivery || '').trim().slice(0, 400), detail: String(b.detail || '').trim().slice(0, 2000), needsUsername: !!b.needsUsername, type: b.type === 'auto' ? 'auto' : 'manual', autoText: String(b.autoText || '').trim().slice(0, 2000) });
      if (p.type === 'auto' && !p.autoText) throw new HttpError(400, 'Produk otomatis wajib mengisi teks yang akan dikirim ke pembeli.');
      let stockVal = null;                                  // kosong = tanpa batas
      if (b.stock !== '' && b.stock !== null && b.stock !== undefined) {
        stockVal = Number(b.stock);
        if (!Number.isInteger(stockVal) || stockVal < 0 || stockVal > 100000) throw new HttpError(400, 'Stok harus bilangan bulat 0–100.000 (kosongkan bila tanpa batas).');
      }
      if (b.image) {
        if (!IMG_RE.test(b.image) || b.image.length > 900_000) throw new HttpError(400, 'Foto tidak valid / terlalu besar (maks ±600 KB).');
        await store.setJson(`zs:img:${p.id}`, b.image, 0);
        p.img = Date.now().toString(36);
      }
      await store.setJson('zs:products', list, 0);
      if (stockVal === null) await store.del(`zs:stock:${p.id}`).catch(() => {});
      else await store.setNum(`zs:stock:${p.id}`, stockVal);
      return send(res, 200, { ok: true, product: p });
    }

    if (b.action === 'mark-shipped') {
      const t = String(b.trx || '');
      if (!/^[A-Za-z0-9_.:-]{4,80}$/.test(t) || !(await store.getJson(`zs:order:${t}`))) throw new HttpError(404, 'Pesanan tidak ditemukan.');
      if (b.shipped === false) await store.del(`zs:ship:${t}`);
      else await store.setJson(`zs:ship:${t}`, { at: Date.now() }, 0);
      return send(res, 200, { ok: true });
    }

    if (b.action === 'delete-product') {
      const list = (await store.getJson('zs:products')) || [];
      if (!list.some((x) => x.id === b.id)) throw new HttpError(404, 'Produk tidak ditemukan.');
      await store.setJson('zs:products', list.filter((x) => x.id !== b.id), 0);
      await store.del(`zs:img:${b.id}`).catch(() => {});
      await store.del(`zs:stock:${b.id}`).catch(() => {});
      return send(res, 200, { ok: true });
    }

    if (b.action === 'reset-password') {
      const email = String(b.email || '').toLowerCase();
      const pw = String(b.password || '');
      if (pw.length < 6 || pw.length > 72) throw new HttpError(400, 'Password baru 6–72 karakter.');
      const u = await store.getJson(`zs:user:${email}`);
      if (!u) throw new HttpError(404, 'User tidak ditemukan.');
      u.pw = hashPw(pw);
      await store.setJson(`zs:user:${email}`, u, 0);
      await store.del(`zs:fail:${email}`).catch(() => {});
      return send(res, 200, { ok: true });
    }
    throw new HttpError(400, 'Aksi tidak dikenal.');
  }
  throw new HttpError(405, 'Method tidak diizinkan');
});
