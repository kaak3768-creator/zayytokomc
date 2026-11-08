/* ZayyStore — hitung mundur promo + banner "baru saja membeli".
   - Waktu berakhir promo datang dari SERVER (/api/products -> promo.end); (sekarang tidak dipakai: kode ZAYYXZELLMC tanpa batas waktu).
   - Banner hanya menampilkan pembelian NYATA yang sudah lunas (nama disamarkan, mis. "bu***"). Bila belum ada pembelian, banner tidak muncul. */
(() => {
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- hitung mundur promo ---------- */
  let timer = null;
  function startCountdown(promo) {
    const bar = $(".sv-promo"), box = $("#promoCount");
    if (!bar || !box || !promo || !promo.end) return;
    clearInterval(timer);
    const paint = () => {
      let ms = promo.end - Date.now();
      if (ms <= 0) { clearInterval(timer); bar.hidden = true; return; }
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const h = Math.floor(ms / 36e5); ms -= h * 36e5;
      const m = Math.floor(ms / 6e4); ms -= m * 6e4;
      const s = Math.floor(ms / 1e3);
      box.innerHTML = `<span class="lbl">Berakhir dalam</span>${d > 0 ? `<i><b>${d}</b>hari</i>` : ""}<i><b>${pad(h)}</b>jam</i><i><b>${pad(m)}</b>menit</i><i><b>${pad(s)}</b>detik</i>`;
      box.hidden = false;
    };
    paint(); timer = setInterval(paint, 1000);
  }
  if (window.ZS_PROMO) startCountdown(window.ZS_PROMO);
  /* cadangan: bila /api belum terjangkau (mis. index.html dibuka langsung dari folder), pakai tanggal di atribut data-end */
  setTimeout(() => { const bar = $("#promoBar"); if (!window.ZS_PROMO && bar && bar.dataset.end) startCountdown({ end: Date.parse(bar.dataset.end) }); }, 1500);
  document.addEventListener("zs:promo", (e) => startCountdown(e.detail));

  /* ---------- banner pembelian nyata ---------- */
  let feed = [], idx = 0, hideT = null;
  const box = document.createElement("div");
  box.className = "zs-feed"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); box.hidden = true;
  document.body.appendChild(box);
  const ago = (ts) => { const m = Math.max(1, Math.round((Date.now() - ts) / 6e4)); return m < 60 ? `${m} menit lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`; };
  const hide = () => { box.classList.remove("show"); setTimeout(() => { box.hidden = true; }, 450); };
  async function load() {
    try { const r = await fetch("/api/products?feed=1"); const j = await r.json(); feed = Array.isArray(j.feed) ? j.feed : []; } catch { /* abaikan */ }
  }
  function show() {
    if (!feed.length || document.hidden) return;
    const f = feed[idx++ % feed.length];
    box.innerHTML = `<span class="ic">🛒</span><div><b>${esc(f.who)}</b> baru saja membeli<br><strong>${esc(f.item)}</strong><small>${ago(f.ts)}</small></div><button type="button" aria-label="Tutup">×</button>`;
    box.hidden = false; requestAnimationFrame(() => box.classList.add("show"));
    clearTimeout(hideT); hideT = setTimeout(hide, 7000);
    box.querySelector("button").onclick = () => { clearTimeout(hideT); hide(); };
  }
  const intro = $("#intro");
  const go = async () => { await load(); show(); setInterval(async () => { await load(); show(); }, 60000); };
  setTimeout(go, 6000);
})();
