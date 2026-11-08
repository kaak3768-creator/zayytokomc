/* ZayyStore — putaran ke-7. Aman dihapus bersama nova3.css. Tidak menyentuh checkout/pembayaran. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const grid = $("#productGrid"), feat = $("#featGrid");
  const watch = (el, fn) => { if (el) new MutationObserver(fn).observe(el, { childList: true }); };

  /* 1. sapaan sesuai jam */
  const hello = $("#novaHello span");
  if (hello) {
    const h = new Date().getHours();
    const g = h < 4 ? "malam" : h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam";
    hello.textContent = `Selamat ${g}! Order otomatis aktif 24 jam`;
  }

  /* 2. header mengecil saat di-scroll */
  const head = $(".sv-header");
  if (head) {
    const f = () => head.classList.toggle("nova-shrink", scrollY > 80);
    addEventListener("scroll", f, { passive: true }); f();
  }

  /* 3. kartu produk muncul bergantian saat terlihat */
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      es.filter((e) => e.isIntersecting).forEach((e, k) => {
        const c = e.target; io.unobserve(c);
        c.style.setProperty("--rd", k * 0.07 + "s");
        c.classList.remove("nova-pre"); c.classList.add("nova-in");
        c.addEventListener("animationend", () => c.classList.remove("nova-in"), { once: true });
      });
    }, { threshold: 0.08 });
    const prep = () => $$(".product-card:not([data-nv])").forEach((c) => { c.dataset.nv = "1"; c.classList.add("nova-pre"); io.observe(c); });
    watch(grid, prep); watch(feat, prep); prep();
    setTimeout(() => $$(".product-card.nova-pre").forEach((c) => c.classList.remove("nova-pre")), 5000); // jaga-jaga
    document.addEventListener("click", (e) => { if (e.target.closest("#catTabs .filter, #subTabs button")) setTimeout(() => $$(".product-card.nova-pre").forEach((c) => { c.classList.remove("nova-pre"); }), 700); });
  }

  /* 4. langkah "Cara belanja" menyala bergantian */
  const steps = $$(".how-card");
  if (steps.length && !reduce) {
    let i = 0, hold = false, vis = false;
    const box = steps[0].parentNode;
    box.addEventListener("mouseenter", () => (hold = true)); box.addEventListener("mouseleave", () => (hold = false));
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => (vis = es[0].isIntersecting), { threshold: 0.2 }).observe(box);
    setInterval(() => {
      if (hold || !vis) return;
      steps.forEach((s, k) => s.classList.toggle("nova-on", k === i)); i = (i + 1) % steps.length;
    }, 1800);
  }

  /* 5. cari di FAQ */
  const faq = $(".zs-faq");
  if (faq) {
    const wrap = document.createElement("div"); wrap.className = "nova-faqsearch";
    wrap.innerHTML = '<input type="search" placeholder="Cari pertanyaan… (mis. voucher, QRIS, pesanan)" aria-label="Cari pertanyaan">';
    faq.parentNode.insertBefore(wrap, faq);
    const none = document.createElement("div"); none.className = "nova-faqnone"; none.hidden = true; none.textContent = "Tidak ada yang cocok. Coba kata lain atau chat admin lewat WhatsApp 💬";
    faq.after(none);
    wrap.querySelector("input").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase(); let n = 0;
      $$("details", faq).forEach((d) => { const ok = !q || d.textContent.toLowerCase().includes(q); d.classList.toggle("nova-hide", !ok); if (ok) n++; if (q && ok) d.open = true; });
      none.hidden = n > 0;
    });
  }
})();
