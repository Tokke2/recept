/* ============================================================
   PLATS: /assets/spara.js  (assets-mappen i repo-roten)
   ============================================================
   DIREKT-SPARA TILL GITHUB – Mitt Maskinkök
   ============================================================
   Central modul som sparar filer DIREKT i repot från webbläsaren
   (ingen nedladdning/uppladdning) via GitHub:s API.

   Kräver en personlig GitHub-nyckel (token) – skapas EN gång:
     1. github.com/settings/personal-access-tokens/new
     2. Token name: "Mitt Maskinkök" · Expiration: 1 år
     3. Repository access: Only select repositories → Tokke2/recept
     4. Permissions → Contents → Read and write
     5. Generate token → kopiera → klistra in när sidan frågar

   Nyckeln sparas ENDAST i din egen webbläsare (localStorage).

   API (används av nytt-recept.html & generator.html):
     __MK_SPARA.save(path, content, message)  → Promise<{ok, url, error}>
     __MK_SPARA.hasToken() / clearToken()
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_SPARA) return;

  var OWNER = 'Tokke2', REPO = 'recept', BRANCH = 'main';
  var TOKEN_KEY = 'mk-gh-token';
  var UNLOCK_KEY = 'mk-edit-unlocked';   // samma upplåsning som ✏️-redigering

  /* ============================================================
     🔒 LÖSENORDSGATE – samma lösenord som i json/las.json
     (byts på GitHub – ETT ställe för allt: redigering + uppladdning)
     ============================================================ */
  async function sha256(text) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  async function getLock() {
    var paths = ['json/las.json', '../json/las.json'];
    for (var i = 0; i < paths.length; i++) {
      try {
        var d = await (await fetch(paths[i], { cache: 'no-store' })).json();
        return {
          pw: String(d.losenord || ''),
          hash: String(d.losenord_hash || '').toLowerCase().trim(),
          on: d.las_redigering !== false
        };
      } catch (e) {}
    }
    return { pw: '', hash: '', on: false };  // ingen låsfil = inget lås
  }

  async function checkPassword(input, lock) {
    if (lock.hash) {
      try { return (await sha256(input)) === lock.hash; } catch (e) {}
    }
    return lock.pw ? input === lock.pw : false;
  }

  function askPassword(lock) {
    return new Promise(function (resolve) {
      var bg = document.createElement('div');
      bg.className = 'no-print';
      bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:310;display:flex;align-items:center;justify-content:center;padding:16px;';
      bg.innerHTML =
        '<div id="mkSpPw" style="background:#fff;border-radius:16px;max-width:380px;width:100%;padding:26px 28px;text-align:center;font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
          '<div style="font-size:2rem;">🔒</div>' +
          '<h3 style="margin:6px 0 4px;">Uppladdning är låst</h3>' +
          '<p style="font-size:.88rem;color:#7f8c8d;margin:0 0 14px;">Ange lösenordet (samma som för ✏️ redigering – ligger i json/las.json)</p>' +
          '<input type="password" id="mkSpIn" placeholder="Lösenord" autocomplete="off" style="width:100%;padding:12px 14px;border:2px solid #e8e2d8;border-radius:10px;font-size:1rem;box-sizing:border-box;">' +
          '<div id="mkSpMsg" style="color:#c0392b;font-size:.82rem;min-height:18px;margin-top:6px;"></div>' +
          '<div style="display:flex;gap:10px;margin-top:10px;">' +
            '<button id="mkSpOk" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;">🔓 Lås upp</button>' +
            '<button id="mkSpNej" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;">Avbryt</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(bg);
      var input = bg.querySelector('#mkSpIn');
      setTimeout(function () { input.focus(); }, 120);
      async function attempt() {
        if (await checkPassword(input.value, lock)) {
          try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
          bg.remove(); resolve(true);
        } else {
          bg.querySelector('#mkSpMsg').textContent = 'Fel lösenord – försök igen';
          input.select();
        }
      }
      bg.querySelector('#mkSpOk').onclick = attempt;
      bg.querySelector('#mkSpNej').onclick = function () { bg.remove(); resolve(false); };
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') attempt(); });
    });
  }

  async function requireUnlock() {
    var unlocked = false;
    try { unlocked = sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) {}
    if (unlocked) return true;
    var lock = await getLock();
    if (!lock.on || (!lock.pw && !lock.hash)) return true;  // lås avstängt
    return askPassword(lock);
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t.trim()); } catch (e) {}
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  /* UTF-8-säker base64 (åäö, emojis m.m.) */
  function b64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /* ---------- Nyckel-dialog med klick-för-klick-guide ---------- */
  function askToken() {
    return new Promise(function (resolve) {
      var bg = document.createElement('div');
      bg.className = 'no-print';
      bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;';
      bg.innerHTML =
        '<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow:auto;padding:26px 28px;font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
          '<h3 style="margin:0 0 6px;">🔑 Engångsinställning: GitHub-nyckel</h3>' +
          '<p style="font-size:.9rem;color:#7f8c8d;margin:0 0 14px;">För att spara direkt på sajten behövs en personlig nyckel. Tar 2 minuter – görs EN gång, sparas bara i din webbläsare.</p>' +
          '<ol style="font-size:.9rem;line-height:1.7;padding-left:20px;margin:0 0 14px;">' +
            '<li>Öppna <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener" style="color:#c0392b;font-weight:700;">github.com/settings/personal-access-tokens/new</a></li>' +
            '<li><b>Token name:</b> Mitt Maskinkök · <b>Expiration:</b> Custom → 1 år</li>' +
            '<li><b>Repository access:</b> Only select repositories → välj <b>Tokke2/recept</b></li>' +
            '<li><b>Permissions</b> → Repository permissions → <b>Contents</b> → <b>Read and write</b></li>' +
            '<li>Klicka gröna <b>Generate token</b> → kopiera koden (börjar med github_pat_...)</li>' +
          '</ol>' +
          '<input type="password" id="mkGhTok" placeholder="Klistra in nyckeln här (github_pat_...)" style="width:100%;padding:12px 14px;border:2px solid #e8e2d8;border-radius:10px;font-size:.95rem;box-sizing:border-box;">' +
          '<div style="display:flex;gap:10px;margin-top:14px;">' +
            '<button id="mkGhOk" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;font-size:.95rem;cursor:pointer;">💾 Spara nyckeln</button>' +
            '<button id="mkGhAvbryt" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;font-size:.95rem;cursor:pointer;">Avbryt</button>' +
          '</div>' +
          '<p style="font-size:.78rem;color:#7f8c8d;margin:12px 0 0;">🔒 Nyckeln lagras endast i DIN webbläsare (localStorage) och skickas bara till api.github.com. Den kan bara ändra just detta repo.</p>' +
        '</div>';
      document.body.appendChild(bg);
      bg.querySelector('#mkGhOk').onclick = function () {
        var t = bg.querySelector('#mkGhTok').value.trim();
        if (!t) { bg.querySelector('#mkGhTok').style.borderColor = '#c0392b'; return; }
        setToken(t);
        bg.remove();
        resolve(t);
      };
      bg.querySelector('#mkGhAvbryt').onclick = function () { bg.remove(); resolve(''); };
    });
  }

  async function api(path, opts) {
    var token = getToken();
    opts = opts || {};
    opts.headers = Object.assign({
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }, opts.headers || {});
    return fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + '/' + path, opts);
  }

  /* ---------- Spara (skapa eller uppdatera) en fil ---------- */
  async function save(path, content, message) {
    /* 🔒 Lösenord först (samma som las.json), sedan GitHub-nyckel */
    if (!(await requireUnlock())) return { ok: false, error: 'Avbrutet – lösenord krävs.' };
    if (!getToken()) {
      var t = await askToken();
      if (!t) return { ok: false, error: 'Ingen nyckel angiven' };
    }
    try {
      /* Finns filen redan? Då behövs dess sha (= uppdatering) */
      var sha = null;
      var head = await api('contents/' + encodeURIComponent(path).replace(/%2F/g, '/') + '?ref=' + BRANCH);
      if (head.status === 401 || head.status === 403) {
        clearToken();
        return { ok: false, error: 'Nyckeln är ogiltig eller saknar behörighet – ange en ny (sidan frågar igen).' };
      }
      if (head.ok) sha = (await head.json()).sha;

      var body = { message: message || ('Sparad via sajten: ' + path), content: b64(content), branch: BRANCH };
      if (sha) body.sha = sha;

      var res = await api('contents/' + encodeURIComponent(path).replace(/%2F/g, '/'), {
        method: 'PUT', body: JSON.stringify(body)
      });
      if (!res.ok) {
        var err = await res.json().catch(function () { return {}; });
        if (res.status === 401 || res.status === 403) clearToken();
        return { ok: false, error: 'GitHub svarade ' + res.status + ': ' + (err.message || 'okänt fel') };
      }
      var data = await res.json();
      return { ok: true, url: (data.content && data.content.html_url) || '' };
    } catch (e) {
      return { ok: false, error: 'Nätverksfel: ' + e.message };
    }
  }

  /* ---------- Läs en fil (för t.ex. energi.json-uppdatering) ---------- */
  async function load(path) {
    try {
      var res = await api('contents/' + encodeURIComponent(path).replace(/%2F/g, '/') + '?ref=' + BRANCH);
      if (!res.ok) return null;
      var d = await res.json();
      return decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))));
    } catch (e) { return null; }
  }

  window.__MK_SPARA = {
    save: save,
    load: load,
    hasToken: function () { return !!getToken(); },
    clearToken: clearToken
  };
})();
