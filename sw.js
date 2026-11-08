/* Service worker minimal agar web bisa dipasang sebagai aplikasi. Tidak menyimpan cache apa pun (pembayaran selalu langsung ke server). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
