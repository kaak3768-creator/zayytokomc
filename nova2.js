/* ZayyStore — putaran ke-6. Aman dihapus bersama nova2.css. Tidak menyentuh checkout/pembayaran. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const grid = $("#productGrid"), feat = $("#featGrid");
  const watch = (el, fn) => { if (el) new MutationObserver(fn).observe(el, { childList: true }); };

  /* 1. mode malam / siang (tersimpan di browser) */
  const btn = $("#novaTheme"), meta = $('meta[name="theme-color"]');
  const setNight = (on) => {
    root.classList.toggle("nova-night", on);
    if (btn) { btn.textContent = on ? "☀️" : "🌙"; btn.setAttribute("aria-label", on ? "Mode siang" : "Mode malam"); btn.title = on ? "Mode siang" : "Mode malam"; }
    if (meta) meta.setAttribute("content", on ? "#060e24" : "#0b2447");
  };
  let night = false; try { night = localStorage.getItem("zs_night") === "1"; } catch {}
  setNight(night);
  if (btn) btn.addEventListener("click", () => { night = !night; setNight(night); try { localStorage.setItem("zs_night", night ? "1" : "0"); } catch {} });

  /* 2. label "stok menipis" (stok ≤ 5, dari data nyata) */
  function paintLow() {
    $$(".sv-stock:not(.out):not([data-nova])").forEach((el) => {
      const m = el.textContent.match(/(\d+)/); if (!m) return;
      el.dataset.nova = "1";
      if (+m[1] > 0 && +m[1] <= 5) { el.classList.add("low"); el.textContent = "🔥 Hampir habis — sisa " + m[1]; }
    });
  }
  watch(grid, () => setTimeout(paintLow, 60)); watch(feat, () => setTimeout(paintLow, 60)); paintLow();

  /* 3. pixel burst ala Minecraft saat klik tombol utama */
  if (!reduce) {
    const colors = ["#ffd23f", "#3db2ff", "#8be0ff", "#52e58a", "#ff7ad9", "#fff"];
    document.addEventListener("click", (e) => {
      const t = e.target.closest(".add-cart:not(.soldout), .sv-cta, .nova-cta a, .primary-btn"); if (!t) return;
      for (let i = 0; i < 9; i++) {
        const p = document.createElement("i"); p.className = "nova-px"; const s = 5 + Math.random() * 6;
        p.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:${s}px;height:${s}px;background:${colors[i % colors.length]}`;
        document.body.appendChild(p);
        const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
        p.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d - s / 2}px,${Math.sin(a) * d + 24}px) rotate(${Math.random() * 180}deg) scale(.3)`, opacity: 0 }], { duration: 650 + Math.random() * 250, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => p.remove();
      }
    }, true);
  }

  /* 4. gerak parallax halus di latar hero */
  const heroBg = $(".sv-hero-bg");
  if (heroBg && !reduce) {
    let tick = false;
    addEventListener("scroll", () => { if (tick) return; tick = true; requestAnimationFrame(() => { if (scrollY < 900) heroBg.style.transform = `translateY(${scrollY * 0.18}px) scale(1.06)`; tick = false; }); }, { passive: true });
  }
})();
