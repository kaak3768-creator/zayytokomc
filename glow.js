/* ZayyStore — cahaya mengikuti kursor/jari di kartu produk (hanya tampilan; aman dihapus). */
(() => {
  const sel = ".sv-card.product-card";
  const move = (c, x, y) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", x - r.left + "px");
    c.style.setProperty("--my", y - r.top + "px");
  };
  document.addEventListener("pointermove", (e) => {
    const c = e.target.closest && e.target.closest(sel);
    if (c) move(c, e.clientX, e.clientY);
  }, { passive: true });
  // layar sentuh: kartu yang disentuh ikut bercahaya & maju sebentar
  let last = null, timer = null;
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    const c = e.target.closest && e.target.closest(sel);
    if (!c) return;
    move(c, e.clientX, e.clientY);
    if (last && last !== c) last.classList.remove("touch");
    c.classList.add("touch"); last = c;
    clearTimeout(timer); timer = setTimeout(() => c.classList.remove("touch"), 900);
  }, { passive: true });
})();
