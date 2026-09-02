/* ============================================================
   PLATS: /assets/kommentarer.js  (assets-mappen i repo-roten)
   ============================================================
   💬 KOMMENTARER PER RECEPT – Mitt Maskinkök  (roadmap 8)
   ============================================================
   Besökare som TESTAT ett recept kan kommentera + rapportera
   "✔️ funkade i min maskin" (t.ex. GreenPan till glassrecepten).

   Teknik (ingen server – GitHub Issues, som förslagslådan):
   · En issue per recept: titel = "💬 <receptfilnamn>", label
     "kommentar". Skapas automatiskt första gången någon vill
     kommentera (förifylld issue-länk).
   · Kommentarerna på issuen listas på receptsidan (GitHub API,
     läsning kräver inget konto).
   · Två knappar: "💬 Skriv kommentar" och "🔧 Rapportera maskin
     som funkade" – den senare förifyller en mall med maskinval
     ur databasen (dropdown i egen dialog).
   · Att skriva kräver GitHub-konto (gratis) – tydligt förklarat.
   REDIGERING av recept är för ADMIN (lösenord) – kommentarer är
   besökarnas kanal, receptfilerna röres aldrig av dem.
   Laddas av site.js på receptsidor.
   ============================================================ */
(function () {
  'use strict';
  if (window.__MK_KOMMENTAR_LOADED) return;
  window.__MK_KOMMENTAR_LOADED = true;

  var isRecipePage = (window.__MK_IS_RECIPE !== undefined ? window.__MK_IS_RECIPE : !!document.querySelector('meta[name="recept:namn"]'));
  if (!isRecipePage) return;

  var REPO = 'Tokke2/recept';
  var fil = decodeURIComponent(location.pathname.split('/').pop());
  var rNamn = ((document.querySelector('meta[name="recept:namn"]') || {}).content || fil)
    .replace(/[\u{1F300}-\u{1FAFF}\uFE0F]/gu, '').trim();
  var root = window.__MK_ROOT || '../';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function datum(iso) {
    try { return new Date(iso).toLocaleDateString('sv-SE'); } catch (e) { return ''; }
  }

  /* Enkel markdown-lite: radbrytningar + fetstil, allt annat escapas */
  function md(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }

  async function hittaIssue() {
    try {
      var r = await fetch('https://api.github.com/repos/' + REPO +
        '/issues?state=open&labels=kommentar&per_page=100');
      if (!r.ok) return null;
      var issues = (await r.json()).filter(function (i) { return !i.pull_request; });
      return issues.find(function (i) { return i.title === '💬 ' + fil; }) || null;
    } catch (e) { return null; }
  }

  async function hamtaKommentarer(issue) {
    if (!issue || !issue.comments) return [];
    try {
      var r = await fetch(issue.comments_url + '?per_page=50');
      return r.ok ? await r.json() : [];
    } catch (e) { return []; }
  }

  function nyIssueUrl(body) {
    return 'https://github.com/' + REPO + '/issues/new' +
      '?title=' + encodeURIComponent('💬 ' + fil) +
      '&labels=' + encodeURIComponent('kommentar') +
      '&body=' + encodeURIComponent(body);
  }
  function kommentarUrl(issue) {
    return issue.html_url + '#new_comment_field';
  }

  /* ---------- 🔧 "Maskin som funkade"-dialogen ---------- */
  async function maskinRapport(issue) {
    if (document.getElementById('mk-komm-bg')) return;
    var maskiner = [];
    try {
      var idx = await (await fetch(root + 'json/maskiner-index.json')).json();
      await Promise.all(idx.map(async function (f) {
        try { maskiner.push(await (await fetch(root + 'json/maskiner/' + f)).json()); } catch (e) {}
      }));
    } catch (e) {}
    maskiner.sort(function (a, b) { return (a.namn || '').localeCompare(b.namn || '', 'sv'); });

    var bg = document.createElement('div');
    bg.id = 'mk-komm-bg';
    bg.className = 'no-print';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:320;display:flex;align-items:center;justify-content:center;padding:16px;';
    bg.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:22px 26px;font-family:Segoe UI,system-ui,sans-serif;color:#2c3e50;">' +
        '<h3 style="margin:0 0 4px;">🔧 Funkade receptet i din maskin?</h3>' +
        '<p style="font-size:.82rem;color:#7f8c8d;margin:0 0 12px;">Hjälp andra: rapportera att receptet fungerade i en maskin som inte står i receptet (t.ex. GreenPan Frost till glassen).</p>' +
        '<label style="display:block;font-size:.8rem;font-weight:700;margin-bottom:3px;">Maskin</label>' +
        '<select id="km-maskin" style="width:100%;padding:10px;border:2px solid #e8e2d8;border-radius:9px;font-family:inherit;font-size:.9rem;margin-bottom:10px;">' +
          maskiner.map(function (m) { return '<option>' + esc((m.varumarke || '') + ' ' + (m.modellnamn || m.namn || m.id)) + '</option>'; }).join('') +
          '<option value="__annan">Annan maskin (skriv själv i rapporten)</option>' +
        '</select>' +
        '<label style="display:block;font-size:.8rem;font-weight:700;margin-bottom:3px;">Program/inställning du använde (valfritt)</label>' +
        '<input id="km-prog" type="text" placeholder="t.ex. Soft Ice Cream, texturnivå 4" style="width:100%;padding:10px;border:2px solid #e8e2d8;border-radius:9px;font-family:inherit;font-size:.9rem;box-sizing:border-box;margin-bottom:14px;">' +
        '<p style="font-size:.75rem;color:#a5967e;margin:0 0 12px;">Rapporten skickas som GitHub-kommentar (gratis konto krävs – tar 2 min att skapa). Ägaren kan sedan koppla maskinen till receptet permanent.</p>' +
        '<div style="display:flex;gap:10px;">' +
          '<button id="km-ok" style="flex:1;background:#27ae60;color:#fff;border:none;border-radius:10px;padding:12px;font-weight:700;cursor:pointer;font-family:inherit;">📤 Öppna rapporten</button>' +
          '<button id="km-nej" style="background:#ecf0f1;color:#2c3e50;border:none;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;font-family:inherit;">Avbryt</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bg);

    var ned = false;
    bg.addEventListener('mousedown', function (e) { ned = (e.target === bg); });
    bg.addEventListener('click', function (e) { if (e.target === bg && ned) bg.remove(); });
    bg.querySelector('#km-nej').onclick = function () { bg.remove(); };
    bg.querySelector('#km-ok').onclick = function () {
      var maskin = bg.querySelector('#km-maskin').value;
      if (maskin === '__annan') maskin = '(skriv maskinens namn här)';
      var prog = bg.querySelector('#km-prog').value.trim();
      var body = '🔧 **FUNKADE I MIN MASKIN**\n\n' +
        '**Maskin:** ' + maskin + '\n' +
        (prog ? '**Program/inställning:** ' + prog + '\n' : '') +
        '**Resultat:** (beskriv gärna – blev det bra? något att tänka på?)\n\n' +
        '---\n_Maskinrapport via ' + rNamn + ' på tokke2.github.io/recept_';
      window.open(issue ? kommentarUrl(issue) : nyIssueUrl(body), '_blank', 'noopener');
      if (issue) {
        /* kommentar på befintlig issue kan inte förifyllas – kopiera till urklipp */
        try { navigator.clipboard.writeText(body); } catch (e) {}
        if (window.__MK_TOAST) window.__MK_TOAST('📋 Rapportmallen är kopierad – klistra in i kommentarsfältet som öppnades!');
      }
      bg.remove();
    };
  }

  /* ---------- 💬 FLIK under receptet + räknare överst ---------- */
  async function bygg() {
    if (document.getElementById('mk-kommentarer')) return;
    var issue = await hittaIssue();
    var kommentarer = await hamtaKommentarer(issue);
    var alla = [];
    if (issue && issue.body && issue.body.trim()) {
      alla.push({ user: issue.user, body: issue.body, created_at: issue.created_at });
    }
    alla = alla.concat(kommentarer);
    var antal = alla.length;

    /* 🔢 RÄKNARE ÖVERST: pastill i snabb-översikten (eller egen rad) –
       klick scrollar ner till kommentarsfliken */
    var ov = document.getElementById('mk-oversikt');
    var pill = document.createElement('a');
    pill.href = '#mk-kommentarer';
    pill.id = 'mk-komm-pill';
    pill.className = 'no-print';
    pill.style.cssText = 'display:inline-flex;align-items:center;gap:5px;background:#fff;' +
      'border:1.5px solid ' + (antal ? '#c0392b' : '#e8e2d8') + ';border-radius:999px;padding:5px 13px;' +
      'font-size:.82rem;font-weight:700;color:' + (antal ? '#c0392b' : '#7f8c8d') + ';text-decoration:none;white-space:nowrap;';
    pill.textContent = '💬 ' + antal + ' kommentar' + (antal === 1 ? '' : 'er');
    pill.title = antal ? 'Klicka för att läsa kommentarerna' : 'Bli först att kommentera!';
    pill.addEventListener('click', function (e) {
      e.preventDefault();
      oppnaFlik('komm');
      var m = document.getElementById('mk-kommentarer');
      try { if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    });
    if (ov) ov.appendChild(pill);
    else {
      var header = document.querySelector('header');
      if (header && header.parentNode) {
        var rad = document.createElement('div');
        rad.className = 'no-print';
        rad.style.cssText = 'margin:-8px 0 14px;font-family:Segoe UI,system-ui,sans-serif;';
        rad.appendChild(pill);
        header.parentNode.insertBefore(rad, header.nextSibling);
      }
    }

    /* 🗂️ FLIKARNA: [📖 Recept] [💬 Kommentarer (N)] – egen flik under receptet */
    var kort = document.createElement('div');
    kort.className = 'card no-print';
    kort.id = 'mk-kommentarer';
    kort.innerHTML =
      '<div style="display:flex;gap:0;border-bottom:2px solid #e8e2d8;margin-bottom:14px;">' +
        '<button id="mkfl-recept" class="mkfl" style="background:none;border:none;border-bottom:3px solid transparent;' +
          'padding:9px 18px;font-weight:700;font-size:.9rem;cursor:pointer;font-family:inherit;color:#7f8c8d;">📖 Om receptet</button>' +
        '<button id="mkfl-komm" class="mkfl" style="background:none;border:none;border-bottom:3px solid #c0392b;' +
          'padding:9px 18px;font-weight:700;font-size:.9rem;cursor:pointer;font-family:inherit;color:#c0392b;">💬 Kommentarer (' + antal + ')</button>' +
      '</div>' +
      '<div id="mkfl-innehall-recept" style="display:none;font-size:.88rem;color:#7f8c8d;line-height:1.6;"></div>' +
      '<div id="mkfl-innehall-komm"></div>';

    var footer = document.querySelector('footer');
    if (footer) footer.parentNode.insertBefore(kort, footer);
    else document.body.appendChild(kort);

    /* Om receptet-fliken: beskrivning + maskiner (sammanfattning) */
    var beskr = (document.querySelector('meta[name="recept:beskrivning"]') || {}).content || '';
    var maskiner = (document.querySelector('meta[name="recept:maskiner"]') || {}).content || '';
    kort.querySelector('#mkfl-innehall-recept').innerHTML =
      (beskr ? '<p>' + esc(beskr) + '</p>' : '') +
      (maskiner ? '<p style="margin-top:8px;">🔧 ' + esc(maskiner).replace(/\|/g, ' · ') + '</p>' : '') +
      '<p style="margin-top:8px;font-size:.78rem;">⭐ Betygsätt receptet högre upp på sidan!</p>';

    /* Kommentars-fliken */
    var kh = '';
    if (alla.length) {
      kh += alla.map(function (k) {
        var arMaskin = /FUNKADE I MIN MASKIN/i.test(k.body || '');
        return '<div style="border-left:3px solid ' + (arMaskin ? '#27ae60' : '#e8e2d8') + ';padding:8px 12px;margin:8px 0;background:' + (arMaskin ? '#f4fbf6' : '#faf7f2') + ';border-radius:0 8px 8px 0;">' +
          '<div style="font-size:.75rem;color:#a5967e;margin-bottom:3px;">' +
            (k.user && k.user.avatar_url ? '<img src="' + k.user.avatar_url + '&s=32" style="width:16px;height:16px;border-radius:50%;vertical-align:middle;margin-right:5px;">' : '') +
            '<b>' + esc(k.user ? k.user.login : 'okänd') + '</b> · ' + datum(k.created_at) + '</div>' +
          '<div style="font-size:.86rem;line-height:1.55;">' + md(k.body || '') + '</div></div>';
      }).join('');
    } else {
      kh += '<p style="font-size:.85rem;color:#7f8c8d;">Inga kommentarer än – bli först att berätta hur det gick! 👨‍🍳</p>';
    }
    kh += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">' +
      '<button id="mk-komm-skriv" style="background:#c0392b;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.88rem;">💬 Skriv kommentar</button>' +
      '<button id="mk-komm-maskin" style="background:#eaf7ef;color:#27ae60;border:2px solid #27ae60;border-radius:10px;padding:9px 16px;font-weight:700;cursor:pointer;font-family:inherit;font-size:.88rem;">🔧 Funkade i en annan maskin?</button>' +
      '</div>' +
      '<p style="font-size:.72rem;color:#a5967e;margin-top:8px;">Kommentarer via GitHub (gratis konto). Recepten redigeras endast av ägaren – kommentarerna är er kanal! 💚</p>';
    kort.querySelector('#mkfl-innehall-komm').innerHTML = kh;

    /* Flikväxling */
    window.oppnaFlik = oppnaFlik;
    function oppnaFlik(vilken) {
      var ar = vilken === 'komm';
      kort.querySelector('#mkfl-innehall-komm').style.display = ar ? '' : 'none';
      kort.querySelector('#mkfl-innehall-recept').style.display = ar ? 'none' : '';
      var fk = kort.querySelector('#mkfl-komm'), fr = kort.querySelector('#mkfl-recept');
      fk.style.borderBottomColor = ar ? '#c0392b' : 'transparent';
      fk.style.color = ar ? '#c0392b' : '#7f8c8d';
      fr.style.borderBottomColor = ar ? 'transparent' : '#c0392b';
      fr.style.color = ar ? '#7f8c8d' : '#c0392b';
    }
    kort.querySelector('#mkfl-komm').onclick = function () { oppnaFlik('komm'); };
    kort.querySelector('#mkfl-recept').onclick = function () { oppnaFlik('recept'); };

    kort.querySelector('#mk-komm-skriv').onclick = function () {
      var body = '**Jag testade receptet!**\n\n(Berätta hur det gick – betyg, ändringar, tips?)\n\n---\n_Kommentar via ' + rNamn + ' på tokke2.github.io/recept_';
      window.open(issue ? kommentarUrl(issue) : nyIssueUrl(body), '_blank', 'noopener');
    };
    kort.querySelector('#mk-komm-maskin').onclick = function () { maskinRapport(issue); };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bygg);
  else setTimeout(bygg, 600);
})();
