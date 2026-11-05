// Sans Scroll — script injecté dans instagram.com au démarrage de chaque page.
// Il masque les publicités du fil, bloque les Reels (le scroll vidéo à l'infini),
// ajoute la barre de navigation dans les messages et signale les messages non lus à l'appli.
(() => {
  if (window.__SS_LOADED__) return;
  window.__SS_LOADED__ = true;

  const cfg = Object.assign(
    { blockAllReels: true, blockExplore: false },
    window.__SS_CONFIG__ || {}
  );

  // ---------- Règles ----------
  const isReelsFeed = (p) => /^\/reels(\/|$)/i.test(p) || /^\/[^/]+\/reels\/?$/i.test(p);
  const isSingleReel = (p) => /\/reel\/[^/]+/i.test(p);
  const isBlockedPath = (p) => isReelsFeed(p) || (cfg.blockAllReels && isSingleReel(p));
  const isHomePath = (p) => p === "/" || p === "";

  // Libellé « Sponsorisé » des pubs, selon la langue d'Instagram
  const AD_LABEL = /^(sponsored|sponsoris[ée]e?|gesponsert|patrocinado|sponsorizzato|gesponsord|sponsorowane|reklam|реклама)$/i;

  // ---------- Styles ----------
  const css = `
    a[href="/reels/"], a[href^="/reels/"], a[href$="/reels/"],
    a[href*="apps.apple.com"], a[href*="itunes.apple.com"] { display: none !important; }

    /* Pas de display:none : le fil d'Instagram arrêterait de charger la suite (écran noir).
       La pub reste en place, invisible, et le post suivant remonte par-dessus. */
    article.ss-ad { opacity: 0 !important; pointer-events: none !important; }
    article.ss-ad * { pointer-events: none !important; }
    article.ss-ad video { visibility: hidden !important; }
    html.ss-blocked video { visibility: hidden !important; }

    #ss-block, #ss-toast, #ss-gear, #ss-nav {
      --ss-bg: #ffffff; --ss-fg: #0f1419; --ss-muted: #65676b; --ss-line: #dbdbdb;
      --ss-card: #f3f4f6; --ss-accent: #0095f6;
      --ss-grad: linear-gradient(45deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%);
      font-family: -apple-system, system-ui, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased; box-sizing: border-box;
    }
    @media (prefers-color-scheme: dark) {
      #ss-block, #ss-toast, #ss-gear, #ss-nav {
        --ss-bg: #0c1014; --ss-fg: #f5f5f5; --ss-muted: #a8a8a8; --ss-card: #262626; --ss-line: #262626;
      }
    }

    #ss-block {
      position: fixed; inset: 0; z-index: 2147483646; display: flex; align-items: center;
      justify-content: center; padding: 24px; text-align: center;
      background: var(--ss-bg); color: var(--ss-fg);
    }
    #ss-block h2 {
      font-size: 26px; margin: 14px 0 6px; font-weight: 800;
      background: var(--ss-grad); -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    #ss-block p { margin: 0 0 22px; color: var(--ss-muted); font-size: 15px; }
    #ss-block .ss-icon {
      width: 76px; height: 76px; margin: 0 auto; border-radius: 24px; display: flex;
      align-items: center; justify-content: center; font-size: 38px; background: var(--ss-grad);
      box-shadow: 0 10px 30px rgba(214, 41, 118, .35);
    }
    #ss-block button {
      display: block; width: 220px; margin: 8px auto 0; padding: 13px 18px; border-radius: 12px;
      border: 0; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer;
    }
    #ss-block .ss-primary { background: var(--ss-grad); color: #fff; box-shadow: 0 6px 18px rgba(214, 41, 118, .3); }
    #ss-block .ss-secondary { background: var(--ss-card); color: var(--ss-fg); }

    #ss-gear {
      position: fixed; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 64px);
      z-index: 2147483645; width: 38px; height: 38px; border-radius: 50%; border: 0; padding: 0;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      background: var(--ss-grad); color: #fff;
      box-shadow: 0 4px 14px rgba(214, 41, 118, .4); -webkit-tap-highlight-color: transparent;
    }
    #ss-gear svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 1.8;
      stroke-linecap: round; stroke-linejoin: round; }

    #ss-nav {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483640; display: flex;
      align-items: flex-start; height: calc(50px + env(safe-area-inset-bottom, 0px));
      background: var(--ss-bg); border-top: 1px solid var(--ss-line);
    }
    #ss-nav a {
      flex: 1; height: 50px; display: flex; align-items: center; justify-content: center;
      color: var(--ss-fg); -webkit-tap-highlight-color: transparent;
    }
    #ss-nav svg { width: 26px; height: 26px; stroke: currentColor; fill: none; stroke-width: 1.9;
      stroke-linecap: round; stroke-linejoin: round; }
    #ss-nav a.ss-on svg { stroke-width: 2.7; }
    #ss-nav img { width: 27px; height: 27px; border-radius: 50%; object-fit: cover; }

    #ss-toast {
      position: fixed; left: 50%; bottom: 90px; transform: translateX(-50%) translateY(12px);
      z-index: 2147483647; padding: 11px 16px; border-radius: 999px; font-size: 14px; font-weight: 600;
      background: var(--ss-grad); color: #fff; opacity: 0; pointer-events: none;
      box-shadow: 0 6px 18px rgba(214, 41, 118, .35);
      transition: opacity .2s, transform .2s; white-space: nowrap;
    }
    #ss-toast.ss-show { opacity: 1; transform: translateX(-50%) translateY(0); }
  `;

  function addStyle() {
    if (document.getElementById("ss-style")) return;
    const s = document.createElement("style");
    s.id = "ss-style";
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // ---------- Pubs ----------
  const adResize = "ResizeObserver" in window
    ? new ResizeObserver((entries) => {
        for (const e of entries) e.target.style.setProperty("margin-bottom", -e.target.offsetHeight + "px", "important");
      })
    : null;

  function isAd(article) {
    // Le libellé est un petit texte isolé dans l'en-tête du post
    for (const el of article.querySelectorAll("span, a, div")) {
      if (el.childElementCount > 3) continue;
      const t = (el.textContent || "").replace(/\s+/g, "").trim();
      if (t.length > 0 && t.length <= 14 && AD_LABEL.test(t)) return true;
    }
    return false;
  }

  function hideAds() {
    // Chaque post n'est examiné que quelques fois, pour garder le défilement fluide
    document.querySelectorAll("article:not([data-ss-done])").forEach((a) => {
      if (isAd(a)) {
        a.classList.add("ss-ad");
        a.setAttribute("data-ss-done", "1");
        if (adResize) adResize.observe(a);
        else a.style.setProperty("margin-bottom", -a.offsetHeight + "px", "important");
        a.querySelectorAll("video").forEach((v) => { try { v.muted = true; v.pause(); } catch (_) {} });
        return;
      }
      const seen = (parseInt(a.getAttribute("data-ss-seen"), 10) || 0) + 1;
      if (seen >= 4) a.setAttribute("data-ss-done", "1");
      else a.setAttribute("data-ss-seen", String(seen));
    });
  }

  // ---------- Messages non lus (pour les notifications) ----------
  let lastUnread = -1;
  function reportUnread() {
    let n = null;
    const link = document.querySelector('a[href="/direct/inbox/"]');
    if (link) {
      const m = (link.innerText != null ? link.innerText : link.textContent || "").match(/\d+/);
      n = m ? parseInt(m[0], 10) : 0;
    } else {
      const m = document.title.match(/^\((\d+)\)/);
      if (m) n = parseInt(m[1], 10);
    }
    if (n === null || n === lastUnread) return;
    lastUnread = n;
    try { window.webkit.messageHandlers.sansScroll.postMessage({ action: "unread", count: n }); } catch (_) {}
  }

  // ---------- Barre de navigation dans les messages ----------
  const NAV_ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    dm: '<svg viewBox="0 0 24 24"><path d="M22 3 9.2 10.1M22 3l-7 18-3.8-8.9L2 8.6 22 3Z"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  };

  function getProfile() {
    try { return JSON.parse(localStorage.getItem("ss-profile") || "null"); } catch (_) { return null; }
  }

  // Retient le lien et la photo de ton profil depuis la barre d'Instagram (accueil, recherche…)
  function rememberProfile() {
    for (const a of document.querySelectorAll("a[href] img")) {
      const link = a.closest("a[href]");
      const href = link.getAttribute("href");
      if (!/^\/[A-Za-z0-9._]{1,30}\/$/.test(href)) continue;
      const r = link.getBoundingClientRect();
      if (!r.height || r.top < innerHeight - 140) continue;
      const prev = getProfile();
      if (!prev || prev.href !== href || prev.img !== a.src) {
        try { localStorage.setItem("ss-profile", JSON.stringify({ href, img: a.src })); } catch (_) {}
      }
      return;
    }
  }

  function toggleInboxNav(show) {
    let bar = document.getElementById("ss-nav");
    if (!show) { if (bar) bar.remove(); return; }
    if (!bar && document.body) {
      bar = document.createElement("nav");
      bar.id = "ss-nav";
      const profile = getProfile();
      const items = [
        ["/", NAV_ICONS.home, "Accueil", false],
        ["/explore/", NAV_ICONS.search, "Rechercher", false],
        ["/direct/inbox/", NAV_ICONS.dm, "Messages", true],
        [profile ? profile.href : "/accounts/edit/", NAV_ICONS.user, "Profil", false],
      ];
      for (const [href, icon, label, on] of items) {
        const a = document.createElement("a");
        a.href = href;
        a.setAttribute("aria-label", label);
        if (on) a.className = "ss-on";
        if (label === "Profil" && profile && profile.img) {
          const img = document.createElement("img");
          img.src = profile.img;
          img.alt = "";
          img.onerror = () => { a.innerHTML = NAV_ICONS.user; };
          a.appendChild(img);
        } else {
          a.innerHTML = icon;
        }
        bar.appendChild(a);
      }
      document.body.appendChild(bar);
    }
    // laisse de la place sous la liste des conversations
    const probe = document.elementFromPoint ? document.elementFromPoint(innerWidth / 2, innerHeight - 90) : null;
    for (let el = probe; el && el !== document.body; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
        if (!el.hasAttribute("data-ss-pad")) {
          el.setAttribute("data-ss-pad", "1");
          el.style.setProperty("padding-bottom", "calc(56px + env(safe-area-inset-bottom, 0px))", "important");
        }
        break;
      }
    }
  }

  // ---------- Bouton Réglages (sur l'accueil) ----------
  const GEAR = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>';

  function toggleGear(show) {
    let el = document.getElementById("ss-gear");
    if (!show) { if (el) el.remove(); return; }
    if (el || !document.body) return;
    el = document.createElement("button");
    el.id = "ss-gear";
    el.type = "button";
    el.setAttribute("aria-label", "Réglages Sans Scroll");
    el.innerHTML = GEAR;
    el.addEventListener("click", openSettings);
    document.body.appendChild(el);
  }

  // ---------- Écran « bloqué » ----------
  function showBlock() {
    document.documentElement.classList.add("ss-blocked");
    pauseVideos();
    if (document.getElementById("ss-block") || !document.body) return;
    const el = document.createElement("div");
    el.id = "ss-block";
    el.innerHTML = `
      <div>
        <div class="ss-icon">✋</div>
        <h2>Reels bloqués</h2>
        <p>Pas de vidéos à l'infini ici.</p>
        <button class="ss-primary" data-act="back" type="button">Retour</button>
        <button class="ss-secondary" data-act="home" type="button">Accueil</button>
      </div>`;
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-act]");
      if (!b) return;
      if (b.dataset.act === "back" && history.length > 1) history.back();
      else location.href = "/";
    });
    document.body.appendChild(el);
  }

  function hideBlock() {
    document.documentElement.classList.remove("ss-blocked");
    const el = document.getElementById("ss-block");
    if (el) el.remove();
  }

  function pauseVideos() {
    document.querySelectorAll("video").forEach((v) => {
      try { v.muted = true; v.pause(); } catch (_) {}
    });
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    if (!document.body) return;
    let el = document.getElementById("ss-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ss-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add("ss-show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("ss-show"), 1800);
  }

  function openSettings() {
    try { window.webkit.messageHandlers.sansScroll.postMessage({ action: "openSettings" }); }
    catch (_) { toast("Réglages indisponibles ici"); }
  }

  // ---------- Routage ----------
  function route() {
    addStyle();
    const p = location.pathname;

    hideAds();
    reportUnread();
    rememberProfile();
    toggleGear(isHomePath(p));
    toggleInboxNav(/^\/direct\/(inbox|requests)\/?$/i.test(p));

    if (isBlockedPath(p)) showBlock();
    else hideBlock();

    if (cfg.blockExplore && /^\/explore\/?$/i.test(p)) {
      location.replace("/explore/search/");
    }
  }

  // Empêche d'ouvrir un Reel en cliquant (navigation interne d'Instagram)
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target && e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      let url;
      try { url = new URL(a.href, location.href); } catch (_) { return; }
      if (url.hostname.endsWith("instagram.com") && isBlockedPath(url.pathname)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toast("Reels bloqués 🚫");
      }
    },
    true
  );

  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m];
    history[m] = function () {
      const r = orig.apply(this, arguments);
      setTimeout(route, 0);
      return r;
    };
  }
  window.addEventListener("popstate", route);
  document.addEventListener("DOMContentLoaded", route);

  // Réagit aux nouveaux posts chargés, au plus 4 fois par seconde
  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; route(); }, 250);
  }).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(route, 1500);
  route();

  window.SansScroll = { toast, route, openSettings };
})();
