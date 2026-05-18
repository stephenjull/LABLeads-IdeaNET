/* ============================================================
   LABLeads · IdeaNET — console logic
   ============================================================ */
(() => {
  const DATA = window.LABLEADS_DATA;
  if (!DATA) { console.error('LABLEADS_DATA not loaded'); return; }

  // ---------- DOM refs
  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];

  const qInput = $('#qInput');
  const qSubmit = $('#qSubmit');
  const answersEl = $('#answers');
  const themesListEl = $('#themesList');
  const themesMobileEl = $('#themesMobile');
  const voiceSlot = $('#voiceSlot');
  const voiceIx = $('#voiceIx');
  const voiceTot = $('#voiceTot');
  const toastEl = $('#toast');

  // ---------- header stats
  const totalVoices = new Set(DATA.sessions.flatMap(s => s.turns.map(t => t.tag))).size;
  $('#hStatVoices').textContent = totalVoices;
  $('#hStatSessions').textContent = DATA.sessions.length;
  $('#hStatThemes').textContent = DATA.themes.length;

  // ---------- themes (rail + mobile)
  function renderThemes() {
    themesListEl.innerHTML = '';
    themesMobileEl.innerHTML = '';
    DATA.themes.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'theme';
      btn.dataset.id = t.id;
      btn.innerHTML = `<span class="num">${String(i + 1).padStart(2, '0')}</span><span style="flex:1">${escapeHtml(t.label)}</span><span class="arr">→</span>`;
      btn.addEventListener('click', () => {
        qInput.value = t.query;
        runQuery(t.query, { themeId: t.id });
      });
      themesListEl.appendChild(btn);

      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.dataset.id = t.id;
      chip.textContent = t.label;
      chip.addEventListener('click', () => {
        qInput.value = t.query;
        runQuery(t.query, { themeId: t.id });
      });
      themesMobileEl.appendChild(chip);
    });
  }

  function markActiveTheme(id) {
    $$('#themesList .theme').forEach(b => b.classList.toggle('active', b.dataset.id === id));
    $$('#themesMobile .chip').forEach(b => b.classList.toggle('active', b.dataset.id === id));
  }

  // ---------- voices panel (cycles through curated quotes)
  let voiceIxN = 0;
  function renderVoice() {
    const q = DATA.keyQuotes[voiceIxN];
    if (!q) return;
    voiceSlot.innerHTML = `
      <div class="voice" data-i="${voiceIxN}">
        "${escapeHtml(q.text)}"
        <span class="src">— ${escapeHtml(q.source)}</span>
      </div>
    `;
    voiceIx.textContent = String(voiceIxN + 1).padStart(2, '0');
    voiceTot.textContent = String(DATA.keyQuotes.length).padStart(2, '0');
    // clicking the voice copies it
    voiceSlot.querySelector('.voice').addEventListener('click', () => {
      copyText(`"${q.text}" — ${q.source}`);
    });
  }
  $('#voicePrev').addEventListener('click', () => {
    voiceIxN = (voiceIxN - 1 + DATA.keyQuotes.length) % DATA.keyQuotes.length;
    renderVoice();
  });
  $('#voiceNext').addEventListener('click', () => {
    voiceIxN = (voiceIxN + 1) % DATA.keyQuotes.length;
    renderVoice();
  });
  // auto-cycle every 7s if user hasn't interacted
  let voiceTimer;
  function startVoiceCycle() {
    clearInterval(voiceTimer);
    voiceTimer = setInterval(() => {
      voiceIxN = (voiceIxN + 1) % DATA.keyQuotes.length;
      renderVoice();
    }, 8000);
  }

  // ---------- icons
  const ICON_COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;

  // ---------- helpers
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('shown');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('shown'), 1400);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
    }
    showToast('Copied');
  }

  // ---------- BIG PICTURE (pre-baked, instant)
  function renderBigPicture() {
    const bp = DATA.bigPicture;
    const card = document.createElement('article');
    card.className = 'answer-card big-card big';
    const summaryEscaped = escapeHtml(bp.summary);
    const pillarsHtml = bp.pillars.map((p, i) => `
      <div class="pillar">
        <div class="ix">P${String(i + 1).padStart(2, '0')}</div>
        <h5>${escapeHtml(p.label)}</h5>
        <p>${escapeHtml(p.body)}</p>
      </div>
    `).join('');
    const followUps = [
      'How would you sequence the rollout — what comes first?',
      'Which of these pillars is most at risk if it isn\'t set up well?',
      'What would success look like at the end of 12 months?',
    ];

    card.innerHTML = `
      <div class="answer-head">
        <div class="answer-q"><strong>The big picture</strong> · synthesised across 3 sessions, ${totalVoices} voices</div>
        <div class="answer-actions">
          <button class="iconbtn" data-act="copy" title="Copy">${ICON_COPY}</button>
          <button class="iconbtn" data-act="close" title="Dismiss">${ICON_CLOSE}</button>
        </div>
      </div>
      <h2 class="answer-headline">${escapeHtml(bp.headline)}</h2>
      <div class="answer-body">
        <p>${summaryEscaped}</p>
        <div class="pillars">${pillarsHtml}</div>
        <p style="margin-top:14px;">${escapeHtml(bp.closing)}</p>
      </div>
      <div class="followups">
        <div class="label">Follow-ups</div>
        <div class="row">
          ${followUps.map(f => `<button class="fchip" data-q="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join('')}
        </div>
      </div>
    `;

    // copy / close / followups
    card.querySelector('[data-act="copy"]').addEventListener('click', () => {
      const txt = formatBigPictureForCopy(bp);
      copyText(txt);
      const b = card.querySelector('[data-act="copy"]');
      b.classList.add('copied'); b.innerHTML = ICON_CHECK;
      setTimeout(() => { b.classList.remove('copied'); b.innerHTML = ICON_COPY; }, 1500);
    });
    card.querySelector('[data-act="close"]').addEventListener('click', () => card.remove());
    card.querySelectorAll('.fchip').forEach(c => {
      c.addEventListener('click', () => {
        qInput.value = c.dataset.q;
        runQuery(c.dataset.q);
      });
    });

    // prepend (latest at top)
    answersEl.prepend(card);
    requestAnimationFrame(() => card.classList.add('rising'));
  }

  function formatBigPictureForCopy(bp) {
    let s = `${bp.headline}\n\n${bp.summary}\n\n`;
    bp.pillars.forEach((p, i) => {
      s += `${i + 1}. ${p.label}\n   ${p.body}\n\n`;
    });
    s += bp.closing + '\n\n— LABLeads IdeaNET, field synthesis\n';
    return s;
  }

  // ---------- LOCAL MATCHER (self-contained — no API calls)
  // English stopwords we drop from query before matching
  const STOPWORDS = new Set('a an the and or but if then so as is are was were be been being do does did have has had of in on at to from with for by about into over out up down it its this that these those i you he she we they them us my your his her our their what who which when where why how can could would should may might will shall just also some any all more most less very really maybe might quite kind sort'.split(/\s+/));

  function tokenize(s) {
    return (s || '').toLowerCase()
      .replace(/[^a-z0-9\-]+/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOPWORDS.has(w));
  }

  function scoreTheme(theme, tokens) {
    if (!tokens.length) return 0;
    const kw = new Set(theme.keywords || []);
    const label = (theme.label || '').toLowerCase();
    const headline = (theme.answer?.headline || '').toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (kw.has(t)) score += 4;
      if (label.includes(t)) score += 2;
      if (headline.includes(t)) score += 1;
    }
    return score;
  }

  function matchThemes(query) {
    const tokens = tokenize(query);
    const ranked = DATA.themes
      .map(t => ({ theme: t, score: scoreTheme(t, tokens) }))
      .sort((a, b) => b.score - a.score);
    return { ranked, tokens };
  }

  // ---------- run a query (local match — no API call)
  function runQuery(question, opts = {}) {
    if (!question || !question.trim()) return;
    question = question.trim();

    if (opts.themeId) markActiveTheme(opts.themeId);
    else markActiveTheme(null);

    // Direct theme lookup when a theme chip triggered this query
    let chosen = null;
    if (opts.themeId) {
      chosen = DATA.themes.find(t => t.id === opts.themeId) || null;
    }
    if (!chosen) {
      const { ranked } = matchThemes(question);
      const best = ranked[0];
      if (best && best.score >= 4) {
        chosen = best.theme;
        markActiveTheme(chosen.id);
      } else {
        // No strong match — show "closest themes" suggestion card
        const suggestions = ranked.slice(0, 4).filter(r => r.score > 0).map(r => r.theme);
        renderNoMatchCard(question, suggestions);
        return;
      }
    }

    renderThemeAnswer(question, chosen);
  }

  function renderQuoteBlock(q, idx) {
    if (!q) return '';
    return `<div class="pull-quote" data-qi="${idx}">
      "${escapeHtml(q.text)}"
      <span class="src">— <strong>${escapeHtml(q.source)}</strong></span>
      <button class="copyq" data-copyq="${idx}" aria-label="copy quote">${ICON_COPY}</button>
    </div>`;
  }

  function renderThemeAnswer(question, theme) {
    const card = document.createElement('article');
    card.className = 'answer-card';
    const a = theme.answer;
    const bodyHtml = a.body.map(item => {
      if (item.p != null) return `<p>${escapeHtml(item.p)}</p>`;
      if (item.q != null) {
        const q = DATA.keyQuotes[item.q];
        return renderQuoteBlock(q, item.q);
      }
      return '';
    }).join('\n');

    const followUpsHtml = (a.followUps || []).length
      ? `<div class="followups">
           <div class="label">Follow-ups</div>
           <div class="row">
             ${a.followUps.map(f => `<button class="fchip" data-q="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join('')}
           </div>
         </div>` : '';

    const pcHtml = a.programmeContext
      ? `<div class="programme-context">
           <div class="pc-eyebrow"><span class="dot"></span>Wider AI LCC context</div>
           <p>${escapeHtml(a.programmeContext)}</p>
         </div>` : '';

    card.innerHTML = `
      <div class="answer-head">
        <div class="answer-q"><strong>Q.</strong> ${escapeHtml(question)}</div>
        <div class="answer-actions">
          <button class="iconbtn" data-act="copy" title="Copy answer">${ICON_COPY}</button>
          <button class="iconbtn" data-act="close" title="Dismiss">${ICON_CLOSE}</button>
        </div>
      </div>
      <h2 class="answer-headline">${escapeHtml(a.headline)}</h2>
      <div class="answer-body">${bodyHtml}</div>
      ${pcHtml}
      ${followUpsHtml}
    `;

    card.querySelector('[data-act="copy"]').addEventListener('click', () => {
      const txt = formatThemeAnswerForCopy(question, theme);
      copyText(txt);
      const b = card.querySelector('[data-act="copy"]');
      b.classList.add('copied'); b.innerHTML = ICON_CHECK;
      setTimeout(() => { b.classList.remove('copied'); b.innerHTML = ICON_COPY; }, 1500);
    });
    card.querySelector('[data-act="close"]').addEventListener('click', () => card.remove());
    card.querySelectorAll('.fchip').forEach(c => {
      c.addEventListener('click', () => {
        qInput.value = c.dataset.q;
        runQuery(c.dataset.q);
      });
    });
    card.querySelectorAll('.copyq').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = Number(b.dataset.copyq);
        const q = DATA.keyQuotes[i];
        if (!q) return;
        copyText(`"${q.text}" — ${q.source}`);
        b.classList.add('copied'); b.innerHTML = ICON_CHECK;
        setTimeout(() => { b.classList.remove('copied'); b.innerHTML = ICON_COPY; }, 1500);
      });
    });

    answersEl.prepend(card);
    requestAnimationFrame(() => card.classList.add('rising'));
  }

  function formatThemeAnswerForCopy(question, theme) {
    const a = theme.answer;
    let s = `Q. ${question}\n\n${a.headline}\n\n`;
    for (const item of a.body) {
      if (item.p != null) s += item.p + '\n\n';
      else if (item.q != null) {
        const q = DATA.keyQuotes[item.q];
        if (q) s += `> "${q.text}"\n  — ${q.source}\n\n`;
      }
    }
    if (a.programmeContext) {
      s += 'Wider AI LCC context:\n' + a.programmeContext + '\n\n';
    }
    if (a.followUps?.length) {
      s += 'Follow-ups:\n';
      for (const f of a.followUps) s += `• ${f}\n`;
      s += '\n';
    }
    s += '— LABLeads IdeaNET, field synthesis\n';
    return s;
  }

  function renderNoMatchCard(question, suggestions) {
    const card = document.createElement('article');
    card.className = 'answer-card';
    const chipsList = suggestions.length ? suggestions : DATA.themes.slice(0, 4);
    const chipsHtml = chipsList.map(t => `<button class="fchip" data-theme="${t.id}">${escapeHtml(t.label)}</button>`).join('');

    card.innerHTML = `
      <div class="answer-head">
        <div class="answer-q"><strong>Q.</strong> ${escapeHtml(question)}</div>
        <div class="answer-actions">
          <button class="iconbtn" data-act="close" title="Dismiss">${ICON_CLOSE}</button>
        </div>
      </div>
      <h2 class="answer-headline">No strong match yet — here are the closest themes.</h2>
      <div class="answer-body">
        <p>This console synthesises answers from the actual conversations on file. Your question doesn't have a tight match in the corpus today, but one of these themes is probably near it — pick one to read the full synthesis, or rephrase the question.</p>
      </div>
      <div class="followups">
        <div class="label">Try a theme</div>
        <div class="row">${chipsHtml}</div>
      </div>
    `;
    card.querySelector('[data-act="close"]').addEventListener('click', () => card.remove());
    card.querySelectorAll('.fchip').forEach(c => {
      c.addEventListener('click', () => {
        const id = c.dataset.theme;
        const t = DATA.themes.find(x => x.id === id);
        if (!t) return;
        qInput.value = t.query;
        runQuery(t.query, { themeId: id });
      });
    });
    answersEl.prepend(card);
    requestAnimationFrame(() => card.classList.add('rising'));
  }

    // ---------- ask submit wiring
  qSubmit.addEventListener('click', () => runQuery(qInput.value));
  qInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); runQuery(qInput.value); }
  });
  // quick chips
  $$('.ask-quick .qchip').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.action === 'big') {
        renderBigPicture();
      } else {
        const q = b.dataset.q;
        qInput.value = q;
        runQuery(q);
      }
    });
  });

  // ---------- VIEW TOGGLE (Documentation / Visualisation)
  const viewToggle = $('#viewToggle');
  const vizStage = $('#vizStage');
  const vizFrame = $('#vizFrame');
  let currentView = 'docs';
  let vizLoaded = false;

  function setView(v) {
    if (v === currentView) return;
    currentView = v;
    document.body.classList.toggle('view-viz', v === 'viz');
    document.body.classList.toggle('view-docs', v === 'docs');
    vizStage.setAttribute('aria-hidden', v === 'viz' ? 'false' : 'true');
    $$('#viewToggle .vt-btn').forEach(b => {
      const on = b.dataset.view === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (v === 'viz' && !vizLoaded) {
      vizFrame.src = 'LABLeads.html?embed=1';
      vizLoaded = true;
    }
    // close tweaks panel on transition for clarity
    tweaks.classList.remove('shown');
    tweaksToggle.classList.remove('open');
  }
  $$('#viewToggle .vt-btn').forEach(b => {
    b.addEventListener('click', () => setView(b.dataset.view));
  });

  // ---------- TWEAKS
  const tweaks = $('#tweaks');
  const tweaksToggle = $('#tweaksToggle');
  tweaksToggle.addEventListener('click', () => {
    const open = tweaks.classList.toggle('shown');
    tweaksToggle.classList.toggle('open', open);
  });

  function setSeg(id, v) {
    $$(`#${id} button`).forEach(b => b.classList.toggle('on', b.dataset.v === v));
  }
  $$('#seg-density button').forEach(b => b.addEventListener('click', () => {
    document.body.classList.remove('density-cozy', 'density-default', 'density-spacious');
    document.body.classList.add('density-' + b.dataset.v);
    setSeg('seg-density', b.dataset.v);
  }));
  $$('#seg-ambient button').forEach(b => b.addEventListener('click', () => {
    setSeg('seg-ambient', b.dataset.v);
    const on = b.dataset.v === 'on';
    document.getElementById('ambient').classList.toggle('off', !on);
    document.getElementById('gridBg').classList.toggle('off', !on);
    ambientRun = on;
  }));

  // Palettes — same scheme as v3.1, applied to CSS vars
  const PALETTES = {
    lab: {
      paper: "#faf6ee", paper2: "#f3ede0", paper3: "#ede4d2", rule: "#e6dfce",
      ink: "#1c1916", ink2: "#4d4639", ink3: "#8a7f6c", ink4: "#c5b99f",
      lead: "#c8552d", leadTint: "rgba(200,85,45,0.08)",
      active: "#2a3d4a", quiet: "#a89884",
      isLight: true,
    },
    dusk: {
      paper: "#1b1830", paper2: "#1f1b38", paper3: "#252040", rule: "rgba(255,255,255,0.10)",
      ink: "#f4ecff", ink2: "#c6bbe3", ink3: "#7e74a0", ink4: "#4a4368",
      lead: "#e89eff", leadTint: "rgba(232,158,255,0.10)",
      active: "#9affd4", quiet: "#a8a0c0",
      isLight: false,
    },
    midnight: {
      paper: "#0d111c", paper2: "#131827", paper3: "#1a1f31", rule: "rgba(255,255,255,0.08)",
      ink: "#f4f1ea", ink2: "#b8bcc8", ink3: "#6a7088", ink4: "#3a3f52",
      lead: "#f5b452", leadTint: "rgba(245,180,82,0.10)",
      active: "#7cc4ff", quiet: "#a8a8b8",
      isLight: false,
    },
  };
  let activePaletteName = 'lab';
  function applyPalette(name) {
    const p = PALETTES[name]; if (!p) return;
    activePaletteName = name;
    const r = document.documentElement.style;
    r.setProperty('--paper', p.paper);
    r.setProperty('--paper-2', p.paper2);
    r.setProperty('--paper-3', p.paper3);
    r.setProperty('--paper-rule', p.rule);
    r.setProperty('--ink', p.ink);
    r.setProperty('--ink-2', p.ink2);
    r.setProperty('--ink-3', p.ink3);
    r.setProperty('--ink-4', p.ink4);
    r.setProperty('--lead', p.lead);
    r.setProperty('--lead-tint', p.leadTint);
    r.setProperty('--active', p.active);
    r.setProperty('--quiet', p.quiet);
    r.setProperty('--rule-strong', p.isLight ? 'rgba(28,25,22,0.10)' : 'rgba(255,255,255,0.10)');
    document.body.style.background =
      p.isLight
        ? `radial-gradient(ellipse at 12% 6%, ${withAlpha(p.lead,0.05)}, transparent 50%),
           radial-gradient(ellipse at 92% 94%, ${withAlpha(p.active,0.035)}, transparent 55%),
           ${p.paper}`
        : `radial-gradient(ellipse at 12% 6%, ${withAlpha(p.lead,0.10)}, transparent 50%),
           radial-gradient(ellipse at 92% 94%, ${withAlpha(p.active,0.06)}, transparent 55%),
           linear-gradient(180deg, ${p.paper} 0%, ${p.paper2} 100%)`;
    // adjust grid dot color contrast
    document.getElementById('gridBg').style.backgroundImage =
      p.isLight
        ? 'radial-gradient(circle, rgba(28,25,22,0.06) 1px, transparent 1px)'
        : 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)';
  }
  function withAlpha(hex, a) {
    if (hex.startsWith('rgb')) return hex.replace('rgb', 'rgba').replace(')', `,${a})`);
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }
  $$('#swatches button').forEach(b => b.addEventListener('click', () => {
    $$('#swatches button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    applyPalette(b.dataset.v);
  }));

  // ---------- AMBIENT atoms (decorative, very subtle)
  const ambient = document.getElementById('ambient');
  const actx = ambient.getContext('2d');
  let aDPR = Math.min(devicePixelRatio || 1, 2);
  let ambientNodes = [];
  let ambientRun = true;
  function fitAmbient() {
    aDPR = Math.min(devicePixelRatio || 1, 2);
    ambient.width = innerWidth * aDPR;
    ambient.height = innerHeight * aDPR;
    ambient.style.width = innerWidth + 'px';
    ambient.style.height = innerHeight + 'px';
  }
  function seedAmbient() {
    ambientNodes = [];
    const w = innerWidth, h = innerHeight;
    // a few "lead" atoms
    const N_LEAD = 4;
    for (let i = 0; i < N_LEAD; i++) {
      ambientNodes.push({
        kind: 'lead',
        x: Math.random()*w, y: Math.random()*h,
        r: 6 + Math.random()*3,
        vx: (Math.random()-0.5)*0.06, vy: (Math.random()-0.5)*0.06,
        phase: Math.random()*Math.PI*2,
      });
    }
    // many small particles
    const N_DOT = Math.floor((w*h) / 26000);
    for (let i = 0; i < N_DOT; i++) {
      ambientNodes.push({
        kind: 'dot',
        x: Math.random()*w, y: Math.random()*h,
        r: 1.3 + Math.random()*1.2,
        vx: (Math.random()-0.5)*0.08, vy: (Math.random()-0.5)*0.08,
        phase: Math.random()*Math.PI*2,
      });
    }
  }
  let t = 0;
  function drawAmbient() {
    if (!ambientRun) { requestAnimationFrame(drawAmbient); return; }
    t += 0.008;
    const w = innerWidth, h = innerHeight;
    actx.save();
    actx.scale(aDPR, aDPR);
    actx.clearRect(0, 0, w, h);
    const p = PALETTES[activePaletteName];

    // very thin connecting strokes between lead atoms
    const leads = ambientNodes.filter(n => n.kind === 'lead');
    actx.strokeStyle = withAlpha(p.lead, 0.10);
    actx.lineWidth = 0.8;
    actx.setLineDash([2, 4]);
    for (let i = 0; i < leads.length; i++) {
      for (let j = i+1; j < leads.length; j++) {
        const a = leads[i], b = leads[j];
        actx.beginPath(); actx.moveTo(a.x, a.y); actx.lineTo(b.x, b.y); actx.stroke();
      }
    }
    actx.setLineDash([]);

    for (const n of ambientNodes) {
      n.x += n.vx; n.y += n.vy;
      n.phase += 0.012;
      if (n.x < -20) n.x = w + 20; if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20; if (n.y > h + 20) n.y = -20;
      const breathe = 0.85 + 0.15 * Math.sin(n.phase);
      if (n.kind === 'lead') {
        // halo
        const grd = actx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5);
        grd.addColorStop(0, withAlpha(p.lead, 0.18 * breathe));
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        actx.fillStyle = grd;
        actx.beginPath(); actx.arc(n.x, n.y, n.r * 5, 0, Math.PI*2); actx.fill();
        // core
        actx.fillStyle = withAlpha(p.lead, 0.55);
        actx.beginPath(); actx.arc(n.x, n.y, n.r * breathe, 0, Math.PI*2); actx.fill();
      } else {
        actx.fillStyle = withAlpha(p.isLight ? p.ink : p.ink2, 0.18 * breathe);
        actx.beginPath(); actx.arc(n.x, n.y, n.r, 0, Math.PI*2); actx.fill();
      }
    }
    actx.restore();
    requestAnimationFrame(drawAmbient);
  }
  function startAmbient() {
    fitAmbient(); seedAmbient(); drawAmbient();
  }
  window.addEventListener('resize', () => { fitAmbient(); seedAmbient(); });

  // ---------- boot
  renderThemes();
  renderVoice();
  startVoiceCycle();
  startAmbient();

  // On first load: render the big-picture card automatically
  renderBigPicture();

  // Keyboard niceties
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      tweaks.classList.remove('shown');
      tweaksToggle.classList.remove('open');
    }
    if (e.key === '/' && document.activeElement !== qInput) {
      e.preventDefault();
      qInput.focus();
      qInput.select?.();
    }
    if (document.activeElement !== qInput) {
      if (e.key === 'v' || e.key === 'V') { e.preventDefault(); setView('viz'); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setView('docs'); }
    }
  });
})();
