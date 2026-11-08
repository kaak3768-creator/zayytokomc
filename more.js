/* ZayyStore — tambahan putaran ke-3. Aman dihapus bersama more.css. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. urutkan produk (pakai CSS order, jadi tidak mengubah susunan asli) */
  const grid = $("#productGrid");
  if (grid) {
    let mode = "baru";
    const bar = document.createElement("div"); bar.className = "sort-bar";
    bar.innerHTML = '<em>Urutkan:</em><button type="button" data-s="baru" class="on">Terbaru</button><button type="button" data-s="murah">Termurah</button><button type="button" data-s="mahal">Termahal</button><button type="button" data-s="az">A–Z</button>';
    grid.parentNode.insertBefore(bar, grid);
    const info = () => { const m = {}; (window.ZS_LIST || []).forEach((p) => (m[p.id] = p)); return m; };
    function apply() {
      const m = info(), cards = $$(".product-card", grid);
      if (mode === "baru") { cards.forEach((c) => (c.style.order = "")); return; }
      const key = (c) => { const p = m[c.dataset.id] || {}; return mode === "az" ? (p.name || "").toLowerCase() : Number(p.price) || 0; };
      const sorted = [...cards].sort((a, b) => { const x = key(a), y = key(b); return mode === "mahal" ? (y > x ? 1 : y < x ? -1 : 0) : (x > y ? 1 : x < y ? -1 : 0); });
      sorted.forEach((c, i) => (c.style.order = i));
    }
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-s]"); if (!b) return;
      mode = b.dataset.s; $$("button", bar).forEach((x) => x.classList.toggle("on", x === b)); apply();
    });
    new MutationObserver(() => { clearTimeout(grid._s); grid._s = setTimeout(apply, 40); }).observe(grid, { childList: true });
  }

  /* 2. titik emas terbang dari tombol beli ke keranjang */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-cart"); const cart = $("#cartOpen");
    if (!btn || !cart || reduce || btn.classList.contains("soldout")) return;
    const a = btn.getBoundingClientRect(), b = cart.getBoundingClientRect();
    if (!b.width) return;
    const dot = document.createElement("div"); dot.className = "zs-fly"; dot.textContent = "🛒"; document.body.appendChild(dot);
    const x0 = a.left + a.width / 2 - 13, y0 = a.top + a.height / 2 - 13, x1 = b.left + b.width / 2 - 13, y1 = b.top + b.height / 2 - 13;
    const an = dot.animate([
      { transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 },
      { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 60}px) scale(1.25)`, opacity: 1, offset: .5 },
      { transform: `translate(${x1}px,${y1}px) scale(.35)`, opacity: .3 },
    ], { duration: 750, easing: "cubic-bezier(.45,0,.3,1)" });
    an.onfinish = () => dot.remove();
  }, true);

  /* 3. FAQ: buka satu per satu */
  $$(".zs-faq details").forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) $$(".zs-faq details").forEach((o) => { if (o !== d) o.open = false; });
  }));

  /* 4. tombol "Tanya Admin" melayang disembunyikan saat blok WhatsApp di bawah terlihat (biar tidak menumpuk) */
  const nl = $(".newsletter"), wf = $(".wa-float");
  if (nl && wf && "IntersectionObserver" in window) {
    wf.style.transition = "opacity .3s, transform .3s";
    new IntersectionObserver((es) => es.forEach((e) => { wf.style.opacity = e.isIntersecting ? "0" : ""; wf.style.transform = e.isIntersecting ? "translateY(20px)" : ""; wf.style.pointerEvents = e.isIntersecting ? "none" : ""; }), { threshold: 0.3 }).observe(nl);
  }
})();
