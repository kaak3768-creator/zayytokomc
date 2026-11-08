/* ZayyStore — putaran ke-5. Aman dihapus bersama nova.css. Tidak menyentuh checkout/pembayaran. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
  const list = () => window.ZS_LIST || [];
  const byId = (id) => list().find((p) => String(p.id) === String(id));
  const grid = $("#productGrid");
  const ls = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const watch = (el, fn, opt) => { if (el) new MutationObserver(fn).observe(el, opt || { childList: true }); };

  document.documentElement.classList.add("nova-js");

  /* 1. teks mengetik di hero */
  const typeEl = $("#novaType");
  if (typeEl) {
    const words = ["Akun Minecraft", "Skin custom", "Server premium", "Plugin & Mod", "Jasa setup server"];
    if (reduce) typeEl.textContent = words[0];
    else {
      let w = 0, i = 0, del = false;
      const tick = () => {
        const full = words[w];
        i += del ? -1 : 1;
        typeEl.textContent = full.slice(0, i);
        let d = del ? 40 : 85;
        if (!del && i === full.length) { del = true; d = 1500; }
        else if (del && i === 0) { del = false; w = (w + 1) % words.length; d = 350; }
        setTimeout(tick, d);
      };
      tick();
    }
  }

  /* 2. muncul halus saat di-scroll */
  const targets = $$(".sv-head, .how-card, .nova-why-card, .zs-faq details, .newsletter .news-group, .collab-banner, .sv-hot-head");
  targets.forEach((el, k) => { el.classList.add("nova-rv"); el.style.setProperty("--rd", (k % 4) * 0.08 + "s"); });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    targets.forEach((t) => io.observe(t));
    setTimeout(() => targets.forEach((t) => t.classList.add("in")), 6000); // jaga-jaga
  } else targets.forEach((t) => t.classList.add("in"));

  /* 3. sorotan cahaya mengikuti kursor di kartu produk (desktop) */
  if (!reduce && matchMedia("(pointer:fine)").matches) {
    document.addEventListener("pointermove", (e) => {
      const b = e.target.closest && e.target.closest(".sv-body"); if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.setProperty("--mx", e.clientX - r.left + "px"); b.style.setProperty("--my", e.clientY - r.top + "px");
    }, { passive: true });
  }

  /* 4. terakhir dilihat */
  const KEY = "zs_recent";
  let strip = null;
  if (grid) {
    strip = document.createElement("div"); strip.className = "nova-recent"; strip.hidden = true;
    strip.innerHTML = '<div class="nova-recent-h"><span>🕘 Terakhir kamu lihat</span><button type="button" id="novaRecentClear">Hapus</button></div><div class="nova-recent-row" id="novaRecentRow"></div>';
    const tabs = $("#catTabs"); (tabs || grid).parentNode.insertBefore(strip, tabs || grid);
  }
  function paintRecent() {
    if (!strip) return;
    const ids = ls.get(KEY, []).filter((id) => byId(id)).slice(0, 6);
    strip.hidden = !ids.length;
    $("#novaRecentRow").innerHTML = ids.map((id) => {
      const p = byId(id);
      return `<button type="button" class="nova-chip" data-id="${esc(id)}">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : '<div class="ph">🎮</div>'}<span><b>${esc(p.name)}</b><em>${rp(p.price)}</em></span></button>`;
    }).join("");
  }
  function remember(id) {
    if (!id || !byId(id)) return;
    ls.set(KEY, [id, ...ls.get(KEY, []).filter((x) => x !== id)].slice(0, 8)); paintRecent();
  }
  document.addEventListener("click", (e) => {
    const chip = e.target.closest(".nova-chip");
    if (chip) {
      const card = $$(".product-card", grid).find((c) => c.dataset.id === chip.dataset.id);
      if (card) {
        if (card.classList.contains("nova-hide") || card.style.display === "none") { const all = $('#catTabs [data-cat="all"]'); all && all.click(); }
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("deeplink-pulse"); setTimeout(() => card.classList.remove("deeplink-pulse"), 3200);
      }
      return;
    }
    if (e.target.closest("#novaRecentClear")) { ls.set(KEY, []); paintRecent(); return; }
    const card = e.target.closest(".product-card");
    if (card && grid && grid.contains(card)) remember(card.dataset.id);
  });
  watch(grid, () => { clearTimeout(grid._nr); grid._nr = setTimeout(paintRecent, 60); });
  paintRecent();

  /* 5. filter harga (digabung ke baris "Urutkan") */
  const bar = $(".sort-bar");
  let range = "all";
  const ranges = { all: [0, Infinity], low: [0, 25000], mid: [25000, 50000], high: [50000, Infinity] };
  function applyRange() {
    if (!grid) return;
    const [lo, hi] = ranges[range]; let shown = 0, total = 0;
    $$(".product-card", grid).forEach((c) => {
      const p = byId(c.dataset.id); total++;
      const ok = !p || range === "all" || (Number(p.price) >= lo && (Number(p.price) < hi || hi === Infinity));
      c.classList.toggle("nova-hide", !ok);
      if (ok && c.style.display !== "none") shown++;
    });
    let none = $("#novaNone");
    if (!none) { none = document.createElement("div"); none.id = "novaNone"; none.className = "nova-none"; none.textContent = "Tidak ada produk di rentang harga ini."; grid.appendChild(none); }
    none.hidden = !(range !== "all" && total && !$$(".product-card", grid).some((c) => !c.classList.contains("nova-hide") && c.style.display !== "none"));
  }
  if (bar) {
    bar.insertAdjacentHTML("beforeend", '<em class="nova-sep">Harga:</em><button type="button" data-p="all" class="sel">Semua</button><button type="button" data-p="low">&lt; 25rb</button><button type="button" data-p="mid">25–50rb</button><button type="button" data-p="high">&gt; 50rb</button>');
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-p]"); if (!b) return;
      range = b.dataset.p; $$("button[data-p]", bar).forEach((x) => x.classList.toggle("sel", x === b)); applyRange();
    });
    watch(grid, () => { clearTimeout(grid._nf); grid._nf = setTimeout(applyRange, 80); });
    document.addEventListener("click", (e) => { if (e.target.closest("#catTabs .filter, #subTabs button")) setTimeout(applyRange, 30); });
  }

  /* 6. rekomendasi di keranjang ("Mungkin kamu suka") */
  const drawer = $(".cart-drawer"), items = $("#cartItems"), total = $(".cart-total", drawer || document);
  if (drawer && items && total) {
    const up = document.createElement("div"); up.className = "nova-up"; up.hidden = true;
    drawer.insertBefore(up, total);
    const paintUp = () => {
      const names = $$(".cart-row-info b", items).map((b) => b.textContent.trim());
      if (!names.length) { up.hidden = true; return; }
      const picks = list().filter((p) => !names.includes(p.name) && p.stock !== 0 && !p.bundle)
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.price - b.price).slice(0, 2);
      if (!picks.length) { up.hidden = true; return; }
      up.hidden = false;
      up.innerHTML = '<h4>✨ Mungkin kamu suka</h4><div class="nova-up-row">' + picks.map((p) => `<button type="button" data-id="${esc(p.id)}"><span><b>${esc(p.name)}</b><em>${rp(p.price)}</em></span><i>+ Tambah</i></button>`).join("") + "</div>";
    };
    up.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-id]"); if (!b) return;
      const add = $$(".add-cart", grid || document).find((x) => x.dataset.id === b.dataset.id);
      if (add) add.click();
    });
    watch(items, paintUp, { childList: true, subtree: true });
    paintUp();
  }
})();
