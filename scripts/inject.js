// Sans Scroll — script injecté dans instagram.com au démarrage de chaque page.
// Il désactive le fil d'actualité, bloque les Reels et remplace l'accueil par un panneau calme.
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
  const isLoggedIn = () =>
    /(^|;\s*)ds_user_id=/.test(document.cookie) &&
    !document.querySelector('input[name="username"], input[name="password"]');

  // ---------- Styles ----------
  const reelLinks = cfg.blockAllReels ? ', a[href*="/reel/"]' : "";
  const css = `
    a[href="/reels/"], a[href^="/reels/"], a[href$="/reels/"]${reelLinks},
    a[href*="apps.apple.com"], a[href*="itunes.apple.com"] { display: none !important; }

    html.ss-home main > *:not(#ss-home) { display: none !important; }
    html.ss-home, html.ss-home body { overflow: hidden !important; overscroll-behavior: none !important; }
    html.ss-blocked video { visibility: hidden !important; }

    #ss-home, #ss-block, #ss-toast {
      --ss-bg: #ffffff; --ss-fg: #0f1419; --ss-muted: #65676b;
      --ss-card: #f3f4f6; --ss-line: #e4e6eb; --ss-accent: #0095f6;
      font-family: -apple-system, system-ui, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased; box-sizing: border-box;
    }
    @media (prefers-color-scheme: dark) {
      #ss-home, #ss-block, #ss-toast {
        --ss-bg: #000000; --ss-fg: #f5f5f5; --ss-muted: #a8a8a8;
        --ss-card: #1a1a1a; --ss-line: #262626;
      }
    }
    #ss-home *, #ss-block * { box-sizing: border-box; }

    #ss-home {
      display: flex !important; flex-direction: column; justify-content: center;
      min-height: calc(100vh - 120px); padding: 32px 20px 96px; width: 100%;
      background: var(--ss-bg); color: var(--ss-fg);
    }
    #ss-home .ss-wrap { max-width: 420px; width: 100%; margin: 0 auto; }
    #ss-home .ss-eyebrow {
      font-size: 13px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
      color: var(--ss-muted); margin: 0 0 10px;
    }
    #ss-home h1 { font-size: 28px; line-height: 1.15; font-weight: 700; margin: 0 0 8px; letter-spacing: -.01em; }
    #ss-home p.ss-sub { font-size: 15px; line-height: 1.45; color: var(--ss-muted); margin: 0 0 24px; }
    #ss-home .ss-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    #ss-home .ss-btn {
      display: flex; flex-direction: column; gap: 10px; align-items: flex-start;
      padding: 16px; border-radius: 16px; background: var(--ss-card); color: var(--ss-fg);
      text-decoration: none; font-size: 15px; font-weight: 600; border: 0; text-align: left;
      min-height: 88px; cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    #ss-home .ss-btn:active { transform: scale(.98); opacity: .85; }
    #ss-home .ss-btn svg { width: 24px; height: 24px; stroke: currentColor; fill: none; stroke-width: 1.8;
      stroke-linecap: round; stroke-linejoin: round; }
    #ss-home .ss-btn[hidden] { display: none; }
    #ss-home .ss-foot {
      margin-top: 18px; display: flex; justify-content: center;
    }
    #ss-home .ss-link {
      background: none; border: 0; color: var(--ss-muted); font-size: 14px; font-weight: 500;
      padding: 10px 14px; cursor: pointer; font-family: inherit;
    }

    #ss-block {
      position: fixed; inset: 0; z-index: 2147483646; display: flex; align-items: center;
      justify-content: center; padding: 24px; text-align: center;
      background: var(--ss-bg); color: var(--ss-fg);
    }
    #ss-block h2 { font-size: 24px; margin: 14px 0 6px; font-weight: 700; }
    #ss-block p { margin: 0 0 22px; color: var(--ss-muted); font-size: 15px; }
    #ss-block .ss-icon { font-size: 44px; }
    #ss-block button {
      display: block; width: 220px; margin: 8px auto 0; padding: 13px 18px; border-radius: 12px;
      border: 0; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer;
    }
    #ss-block .ss-primary { background: var(--ss-accent); color: #fff; }
    #ss-block .ss-secondary { background: var(--ss-card); color: var(--ss-fg); }

    #ss-toast {
      position: fixed; left: 50%; bottom: 90px; transform: translateX(-50%) translateY(12px);
      z-index: 2147483647; padding: 11px 16px; border-radius: 999px; font-size: 14px; font-weight: 600;
      background: var(--ss-fg); color: var(--ss-bg); opacity: 0; pointer-events: none;
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

  // ---------- Icônes ----------
  const ICONS = {
    dm: '<svg viewBox="0 0 24 24"><path d="M22 3 9.2 10.1M22 3l-7 18-3.8-8.9L2 8.6 22 3Z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.3-9.4C1.4 8 3.6 4 7.3 4c2 0 3.5 1.1 4.7 2.7C13.2 5.1 14.7 4 16.7 4c3.7 0 5.9 4 4.6 7.6C19.5 16.4 12 21 12 21Z"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  };

  // ---------- Profil ----------
  const RESERVED = new Set([
    "explore", "reels", "reel", "direct", "accounts", "stories", "p", "tv", "about",
    "legal", "privacy", "notifications", "create", "web", "challenge", "emails", "developer",
  ]);
  let profilePath = null;
  try { profilePath = localStorage.getItem("ss-profile"); } catch (_) {}
  let profileFetching = false;

  function rememberProfile(href) {
    profilePath = href;
    try { localStorage.setItem("ss-profile", href); } catch (_) {}
  }

  // 1) on demande à Instagram le pseudo du compte connecté
  function fetchProfile() {
    if (profilePath || profileFetching) return;
    const m = document.cookie.match(/(?:^|;\s*)ds_user_id=(\d+)/);
    if (!m) return;
    profileFetching = true;
    fetch("/api/v1/users/" + m[1] + "/info/", {
      credentials: "include",
      headers: { "X-IG-App-ID": "936619743392459" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const u = j && j.user && j.user.username;
        if (u) rememberProfile("/" + u + "/");
      })
      .catch(() => {})
      .finally(() => { profileFetching = false; });
  }

  // 2) sinon, on cherche le lien avatar dans la barre de navigation
  function findProfilePath() {
    if (profilePath) return profilePath;
    for (const img of document.querySelectorAll("nav a[href] img, [role='navigation'] a[href] img")) {
      const a = img.closest("a[href]");
      const href = a && a.getAttribute("href");
      const m = href && href.match(/^\/([A-Za-z0-9._]{1,30})\/$/);
      if (m && !RESERVED.has(m[1].toLowerCase())) {
        rememberProfile(href);
        return href;
      }
    }
    fetchProfile();
    return null;
  }

  // ---------- Accueil ----------
  function buildHome() {
    const el = document.createElement("section");
    el.id = "ss-home";
    el.innerHTML = `
      <div class="ss-wrap">
        <p class="ss-eyebrow">Sans Scroll</p>
        <h1>Rien à scroller ici.</h1>
        <p class="ss-sub">Ton fil est désactivé. Va droit à ce que tu es venu faire.</p>
        <div class="ss-grid">
          <a class="ss-btn" href="/direct/inbox/">${ICONS.dm}Messages</a>
          <a class="ss-btn" href="/explore/search/">${ICONS.search}Rechercher</a>
          <a class="ss-btn" href="/accounts/activity/">${ICONS.bell}Notifications</a>
          <a class="ss-btn" data-ss="profile" href="#" hidden>${ICONS.user}Mon profil</a>
        </div>
        <div class="ss-foot"><button class="ss-link" data-ss="settings" type="button">Réglages</button></div>
      </div>`;
    el.addEventListener("click", (e) => {
      const t = e.target.closest("[data-ss]");
      if (!t) return;
      e.preventDefault();
      if (t.dataset.ss === "settings") openSettings();
      if (t.dataset.ss === "profile") {
        const p = findProfilePath();
        if (p) location.href = p;
      }
    });
    return el;
  }

  function ensureHome() {
    const main = document.querySelector("main");
    if (!main) return;
    let el = document.getElementById("ss-home");
    if (!el || el.parentElement !== main) {
      if (el) el.remove();
      el = buildHome();
      main.appendChild(el);
    }
    const profileBtn = el.querySelector('[data-ss="profile"]');
    const p = findProfilePath();
    if (p) { profileBtn.hidden = false; profileBtn.setAttribute("href", p); }
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
        <div class="ss-icon">🚫</div>
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
    const root = document.documentElement;
    const p = location.pathname;

    const home = isHomePath(p) && isLoggedIn();
    root.classList.toggle("ss-home", home);
    if (home) {
      ensureHome();
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    } else {
      const el = document.getElementById("ss-home");
      if (el) el.remove();
    }

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
  setInterval(route, 400);
  route();

  window.SansScroll = { toast, route, openSettings };
})();
