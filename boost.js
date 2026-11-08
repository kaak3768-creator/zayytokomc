/* ZayyStore — putaran ke-4. Aman dihapus bersama boost.css. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const say = (m) => (window.toast ? window.toast(m) : null);
  const grid = $("#productGrid");

  /* 1. navigasi bawah (HP) */
  const bnav = $(".zs-bnav");
  if (bnav) {
    bnav.addEventListener("click", (e) => {
      const el = e.target.closest("[data-go]"); if (!el) return;
      const g = el.dataset.go;
      if (g === "top") { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }
      if (g === "produk") { e.preventDefault(); const t = $("#produk"); t && t.scrollIntoView({ behavior: "smooth" }); }
      if (g === "cart") { const c = $("#cartOpen"); c && c.click(); }
    });
    const cc = $("#cartCount"), bc = $("#bnavCount");
    const sync = () => { if (cc && bc) { bc.textContent = cc.textContent; bc.dataset.n = cc.textContent.trim() || "0"; } };
    if (cc) { new MutationObserver(sync).observe(cc, { childList: true, characterData: true, subtree: true }); sync(); }
    const secs = [["top", null], ["produk", $("#produk")]];
    addEventListener("scroll", () => {
      const p = $("#produk"), y = scrollY + innerHeight * 0.4;
      $$("[data-go]", bnav).forEach((a) => a.classList.remove("on"));
      const act = p && y >= p.offsetTop && y < p.offsetTop + p.offsetHeight ? "produk" : scrollY < 200 ? "top" : null;
      if (act) { const a = $(`[data-go="${act}"]`, bnav); a && a.classList.add("on"); }
    }, { passive: true });
  }

  /* 2. skeleton loading sebelum produk muncul */
  if (grid && !$(".product-card", grid)) {
    grid.innerHTML = '<div class="zs-skel"><i></i><i></i><i></i><i></i></div>'.repeat(4);
    setTimeout(() => { if (!$(".product-card", grid)) $$(".zs-skel", grid).forEach((s) => s.remove()); }, 10000); // jaga-jaga kalau gagal memuat
  }

  /* 3. bagikan produk + tautan langsung (?p=idProduk) */
  const base = () => location.href.split(/[?#]/)[0];
  const wantId = new URLSearchParams(location.search).get("p");
  let jumped = false;
  function paintShare() {
    if (!grid) return;
    $$(".product-card", grid).forEach((c) => {
      const id = c.dataset.id; if (!id || $(".share-btn", c)) return;
      const b = document.createElement("button"); b.type = "button"; b.className = "share-btn"; b.textContent = "🔗"; b.setAttribute("aria-label", "Bagikan produk");
      (c.querySelector(".sv-img") || c).appendChild(b);
    });
    if (wantId && !jumped) {
      const c = $$(".product-card", grid).find((x) => x.dataset.id === wantId);
      if (c) { jumped = true; setTimeout(() => { c.scrollIntoView({ behavior: "smooth", block: "center" }); c.classList.add("deeplink-pulse"); setTimeout(() => c.classList.remove("deeplink-pulse"), 3200); }, 500); }
    }
  }
  if (grid) {
    grid.addEventListener("click", async (e) => {
      const b = e.target.closest(".share-btn"); if (!b) return;
      e.stopPropagation();
      const c = b.closest(".product-card"), url = `${base()}?p=${encodeURIComponent(c.dataset.id)}`, name = ($("h3", c) || {}).textContent || "Produk ZayyStore";
      if (navigator.share && matchMedia("(pointer:coarse)").matches) { try { await navigator.share({ title: name, text: name + " — ZayyStore", url }); return; } catch { return; } }
      try { await navigator.clipboard.writeText(url); } catch { const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch {} t.remove(); }
      say("Link produk tersalin 🔗 — kirim ke temanmu!");
    });
    new MutationObserver(() => { clearTimeout(grid._sh); grid._sh = setTimeout(paintShare, 50); }).observe(grid, { childList: true });
    paintShare();
  }

  /* 4. efek suara (opsional, bawaan mati) — dibuat dengan WebAudio, tanpa file */
  let ctx = null, on = false;
  try { on = localStorage.getItem("zs_snd") === "1"; } catch {}
  const tone = (f, t0, d, type = "square", v = 0.05) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(v, ctx.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + d);
    o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + d + 0.02);
  };
  const play = (k) => {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume();
      if (k === "coin") { tone(988, 0, 0.09); tone(1319, 0.08, 0.2); }
      else if (k === "pop") { tone(520, 0, 0.07, "triangle", 0.07); tone(780, 0.05, 0.09, "triangle", 0.06); }
      else tone(300, 0, 0.04, "square", 0.03);
    } catch {}
  };
  const sb = document.createElement("button"); sb.className = "zs-snd" + (on ? " on" : ""); sb.type = "button";
  sb.setAttribute("aria-label", "Efek suara"); sb.title = "Efek suara"; sb.textContent = on ? "🔊" : "🔇"; document.body.appendChild(sb);
  sb.addEventListener("click", () => {
    on = !on; try { localStorage.setItem("zs_snd", on ? "1" : "0"); } catch {}
    sb.classList.toggle("on", on); sb.textContent = on ? "🔊" : "🔇"; play("coin"); say(on ? "Efek suara aktif 🔊" : "Efek suara dimatikan");
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest(".add-cart")) play("coin");
    else if (e.target.closest(".fav-btn")) play("pop");
    else if (e.target.closest(".filter,.sort-bar button,.zs-bnav a,.zs-bnav button")) play("tick");
  }, true);

  /* 5. judul tab berubah saat ditinggal */
  const title = document.title;
  document.addEventListener("visibilitychange", () => { document.title = document.hidden ? "🎮 Balik lagi ya! — ZayyStore" : title; });

  /* 6. pengingat voucher sekali per sesi saat kursor keluar dari atas halaman (desktop) */
  if (matchMedia("(pointer:fine)").matches) {
    document.addEventListener("mouseout", (e) => {
      if (e.relatedTarget || e.clientY > 0) return;
      try { if (sessionStorage.getItem("zs_exit")) return; sessionStorage.setItem("zs_exit", "1"); } catch { return; }
      say("🎟️ Jangan lupa! Pakai kode ZAYYXZELLMC untuk diskon 15%");
    });
  }
})();
