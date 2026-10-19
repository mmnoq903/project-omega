// desktop.js — Kali XFCE: панель, иконки, таскающиеся окна, Terminal/Phantom/Tor/OPS.
import { Engine } from './engine.js';
import { NODES, TOR, TEAM, ENDING_RU } from './content.js';

export const Desktop = {
  root: null, visible: false, booted: false, built: false,
  wins: {}, zTop: 100, taskbar: null, appsMenu: null, termBusy: false,
  termBody: null, termInput: null, phBody: null, opsBody: null, torBody: null,
  history: [], hIdx: 0, chatQueue: [], chatTimer: null,

  build() {
    if (this.built) return;
    this.built = true;
    this.root = document.getElementById('desktop');
    this.root.innerHTML = `
      <div id="xfceWall"></div>
      <div id="bootScr"><pre id="bootLog"></pre></div>
      <div id="xfce" class="hidden">
        <div id="panel">
          <button id="appsBtn" class="pbtn">Applications</button>
          <div id="tasks"></div>
          <div id="panelRight"><span id="clock"></span>
            <button id="standBtn" class="pbtn" title="встать из-за ПК">⏏ встать</button></div>
        </div>
        <div id="appsMenu" class="hidden"></div>
        <div id="icons"></div>
        <div id="winLayer"></div>
      </div>
      <div id="deskCine" class="hidden"><div id="deskCineInner"></div>
        <div id="deskCineHint">ENTER — дальше • ESC — пропустить</div></div>`;
    this.taskbar = this.root.querySelector('#tasks');
    this.appsMenu = this.root.querySelector('#appsMenu');
    this._icons();
    this._apps();
    this.root.querySelector('#appsBtn').onclick = (e) => { e.stopPropagation(); this.appsMenu.classList.toggle('hidden'); };
    this.root.querySelector('#standBtn').onclick = () => this.standUp();
    this.root.querySelector('#winLayer').addEventListener('pointerdown', () => this.appsMenu.classList.add('hidden'));
    this._clock(); setInterval(() => this._clock(), 10000);
  },

  _icons() {
    const defs = [['term', 'Terminal', '▣'], ['phantom', 'Phantom', '✉'], ['tor', 'Tor Browser', '🌐'], ['ops', 'PHANTOM OPS', '◈']];
    const box = this.root.querySelector('#icons');
    defs.forEach(([k, label, g]) => {
      const d = document.createElement('div'); d.className = 'dicon';
      d.innerHTML = `<div class="dg">${g}</div><div class="dl">${label}</div>`;
      d.ondblclick = () => this.openApp(k);
      d.onclick = (e) => { if (e.detail === 1) d.classList.add('sel'); setTimeout(() => d.classList.remove('sel'), 400); };
      box.appendChild(d);
    });
  },
  _apps() {
    const items = [['term', '▣ Terminal'], ['phantom', '✉ Phantom Messenger'], ['tor', '🌐 Tor Browser'], ['ops', '◈ PHANTOM OPS'], ['--', ''], ['stand', '⏏ встать из-за ПК']];
    this.appsMenu.innerHTML = '';
    items.forEach(([k, label]) => {
      if (k === '--') { const s = document.createElement('div'); s.className = 'amsep'; this.appsMenu.appendChild(s); return; }
      const b = document.createElement('div'); b.className = 'amitem'; b.textContent = label;
      b.onclick = () => { this.appsMenu.classList.add('hidden'); k === 'stand' ? this.standUp() : this.openApp(k); };
      this.appsMenu.appendChild(b);
    });
  },
  _clock() { const c = this.root && this.root.querySelector('#clock'); if (c) c.textContent = new Date().toTimeString().slice(0, 5); },

  open() {
    this.build();
    this.visible = true;
    this.root.classList.remove('hidden');
    if (Engine.world) Engine.world.releasePointer();
    Engine.audio && Engine.audio.sfx('boot');
    if (!this.booted) { this._boot(); } else { this._showXfce(); }
  },
  _boot() {
    const scr = this.root.querySelector('#bootScr'), log = this.root.querySelector('#bootLog'), xfce = this.root.querySelector('#xfce');
    scr.classList.remove('hidden'); xfce.classList.add('hidden'); log.textContent = '';
    const lines = ['Kali GNU/Linux rolling', 'mrak login: henry', 'Password: ********', 'Last login: ' + new Date().toDateString(),
      '$ startxfce4', 'starting XFCE session...', '[ ok ] window manager', '[ ok ] panel', '[ ok ] desktop'];
    let i = 0;
    const tick = () => {
      if (i < lines.length) { log.textContent += lines[i++] + '\n'; setTimeout(tick, 120 + Math.random() * 90); }
      else { this.booted = true; setTimeout(() => { scr.classList.add('hidden'); this._showXfce(); }, 400); }
    };
    tick();
  },
  _showXfce() {
    this.root.querySelector('#xfce').classList.remove('hidden');
    this.refreshOps();
    if (!this.wins.ops || !this.wins.ops.el.isConnected) this.openApp('ops');
    if (!this.wins.term || !this.wins.term.el.isConnected) setTimeout(() => this.openApp('term'), 150);
    // доставить накопленный чат
    if (Engine.state.chatLog && Engine.state.chatLog.length && !this._flushed) {
      this._flushed = true; const log = Engine.state.chatLog.slice(); Engine.state.chatLog = []; this.pushChat(log);
    }
  },
  close() {
    this.visible = false;
    if (this.root) this.root.classList.add('hidden');
  },
  standUp() {
    this.close();
    if (Engine.world && Engine.world.ready) { Engine.world.loadScene('apartment'); Engine.world.toast('Ты встал из-за ПК. Осмотрись (WASD), сядь снова — E.'); }
  },

  // ---- окна ----
  openApp(k) {
    if (this.wins[k] && this.wins[k].el.isConnected) { this.focus(k); this.wins[k].el.classList.remove('min'); return; }
    const L = { term: 'henry@mrak: ~', phantom: 'Phantom — #phantom-cell (E2E)', tor: 'Tor Browser', ops: 'PHANTOM OPS' }[k];
    const pos = { term: [60, 70, 640, 400], phantom: [720, 90, 420, 440], tor: [160, 120, 720, 460], ops: [740, 300, 430, 360] }[k];
    const body = document.createElement('div'); body.className = 'wbody wbody-' + k;
    const win = this.makeWindow(k, L, body, pos);
    if (k === 'term') this._buildTerm(body);
    if (k === 'phantom') this._buildPhantom(body);
    if (k === 'tor') this._buildTor(body);
    if (k === 'ops') this._buildOps(body);
    Engine.audio && Engine.audio.sfx('click');
  },
  makeWindow(k, title, body, [x, y, w, h]) {
    const el = document.createElement('div'); el.className = 'win';
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++this.zTop}`;
    const bar = document.createElement('div'); bar.className = 'wbar';
    bar.innerHTML = `<span class="wt">${title}</span>`;
    const close = document.createElement('button'); close.className = 'wclose'; close.textContent = '✕';
    close.onclick = (e) => { e.stopPropagation(); this.closeWin(k); };
    bar.appendChild(close);
    el.appendChild(bar); el.appendChild(body);
    this.root.querySelector('#winLayer').appendChild(el);
    el.addEventListener('pointerdown', () => this.focus(k));
    this._drag(bar, el);
    const task = document.createElement('button'); task.className = 'task'; task.textContent = title.split('—')[0].trim().slice(0, 16);
    task.onclick = () => { if (el.classList.contains('min')) { el.classList.remove('min'); this.focus(k); } else el.classList.add('min'); };
    this.taskbar.appendChild(task);
    this.wins[k] = { el, body, task };
    return { el, body };
  },
  focus(k) { const w = this.wins[k]; if (w) w.el.style.zIndex = ++this.zTop; },
  closeWin(k) { const w = this.wins[k]; if (!w) return; w.el.remove(); w.task.remove(); delete this.wins[k]; },
  _drag(bar, el) {
    let sx, sy, ox, oy, drag = false, down = false;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('wclose')) return;
      down = true; drag = false; sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
    });
    bar.addEventListener('pointermove', (e) => {
      if (!down) return;
      if (!drag && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
      if (!drag) { drag = true; bar.setPointerCapture(e.pointerId); }
      let nx = ox + (e.clientX - sx), ny = Math.max(34, oy + (e.clientY - sy));
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
    });
    const up = (e) => { down = false; drag = false; try { bar.releasePointerCapture(e.pointerId); } catch (x) {} };
    bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
  },

  // ---- Terminal ----
  _buildTerm(body) {
    body.innerHTML = `<div id="termOut"></div>
      <div id="termLine"><span class="prompt">henry@mrak:~$</span><input id="termIn" autocomplete="off" spellcheck="false"></div>`;
    this.termBody = body.querySelector('#termOut');
    this.termInput = body.querySelector('#termIn');
    this._tprint([{ k: 'out', text: 'Kali Linux — qterminal. Введи help или hint.' }], true);
    body.onclick = () => this.termInput && this.termInput.focus();
    this.termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.termBusy) {
        const v = this.termInput.value; this.termInput.value = '';
        this._echo(v); this.history.push(v); this.hIdx = this.history.length;
        const segs = Engine.term(v); this._tprint(segs);
      } else if (e.key === 'ArrowUp') { if (this.hIdx > 0) this.termInput.value = this.history[--this.hIdx] || ''; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { if (this.hIdx < this.history.length) this.termInput.value = this.history[++this.hIdx] || ''; e.preventDefault(); }
      else { Engine.audio && Engine.audio.sfx('key'); }
    });
    setTimeout(() => this.termInput.focus(), 50);
  },
  _echo(v) {
    const d = document.createElement('div'); d.className = 'tl'; d.innerHTML = `<span class="prompt">henry@mrak:~$</span> ${this._esc(v)}`;
    this.termBody.appendChild(d); this._tscroll();
  },
  _esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
  _tscroll() { this.termBody.parentElement.scrollTop = 1e9; this.termBody.scrollIntoView(false); },
  async _tprint(segs, instant) {
    this.termBusy = true; if (this.termInput) this.termInput.disabled = true;
    for (const s of segs) {
      if (s.k === 'clear') { this.termBody.innerHTML = ''; continue; }
      if (s.k === 'ok') { Engine.audio && Engine.audio.sfx('ok'); continue; }
      if (s.k === 'bad') { Engine.audio && Engine.audio.sfx('bad'); continue; }
      if (s.k === 'prog') { await this._progress(s.label); continue; }
      const d = document.createElement('div'); d.className = 'tl ' + (s.k === 'story' ? 'story' : 'out');
      d.textContent = s.text; this.termBody.appendChild(d); this._tscroll();
      if (!instant) await this._wait(s.k === 'story' ? 480 : 45);
    }
    this.termBusy = false; if (this.termInput) { this.termInput.disabled = false; this.termInput.focus(); }
    this._tscroll();
  },
  async _progress(label) {
    const d = document.createElement('div'); d.className = 'tl prog';
    this.termBody.appendChild(d);
    const N = 26;
    for (let i = 1; i <= N; i++) {
      const bar = '█'.repeat(i) + '░'.repeat(N - i);
      d.textContent = `${label} [${bar}] ${Math.round(i / N * 100)}%`;
      if (i % 6 === 0) Engine.audio && Engine.audio.sfx('key');
      this._tscroll(); await this._wait(110);
    }
  },
  _wait(ms) { return new Promise(r => setTimeout(r, ms)); },

  // ---- Phantom ----
  _buildPhantom(body) {
    body.innerHTML = `<div id="phHead">#phantom-cell • end-to-end encrypted</div>
      <div id="phBody"></div>
      <div id="phInputRow"><input id="phIn" placeholder="написать ячейке..." autocomplete="off"><button id="phSend">▶</button></div>`;
    this.phBody = body.querySelector('#phBody');
    const send = () => {
      const inp = body.querySelector('#phIn'); const v = inp.value.trim(); if (!v) return; inp.value = '';
      this._bubble({ who: 'Mrak', text: v }, true);
      Engine.audio && Engine.audio.sfx('msg');
    };
    body.querySelector('#phSend').onclick = send;
    body.querySelector('#phIn').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    (Engine.state._phLog || []).forEach(m => this._bubble(m));
  },
  _bubble(m, store) {
    if (!this.phBody) { (Engine.state._phLog = Engine.state._phLog || []).push(m); return; }
    const d = document.createElement('div');
    const mine = m.who === 'Mrak';
    d.className = 'bub ' + (m.who === 'sys' ? 'sys' : mine ? 'me' : 'them');
    d.innerHTML = m.who === 'sys' ? `<i>${m.text}</i>` : `<b>${m.who}</b><span>${this._esc(m.text)}</span>`;
    this.phBody.appendChild(d); this.phBody.scrollTop = 1e9;
    (Engine.state._phLog = Engine.state._phLog || []).push(m);
  },
  pushChat(msgs) {
    if (!this.visible || !this.built) { (Engine.state.chatLog = Engine.state.chatLog || []).push(...msgs); return; }
    if (!this.wins.phantom || !this.wins.phantom.el.isConnected) this.openApp('phantom');
    msgs.forEach((m, i) => setTimeout(() => {
      this._bubble(m);
      if (m.who !== 'Mrak' && m.who !== 'sys') { Engine.audio && Engine.audio.sfx('msg'); this._notify(); }
    }, 1100 * (i + 1)));
  },
  _notify() { const t = this.wins.phantom && this.wins.phantom.task; if (t) { t.classList.add('blink'); setTimeout(() => t.classList.remove('blink'), 2500); } },

  // ---- Tor ----
  _buildTor(body) {
    const n = Engine.state.node;
    body.innerHTML = `<div id="torBar"><span class="lock">🧅</span><input id="torUrl" value="${TOR.onion}" readonly></div>
      <div id="torPage">
        <h2>CELL // ${TOR.onion}</h2>
        <div id="cellBoard"></div>
        ${n === 1 ? `<div id="cellPost"><h3>Опубликовать объявление</h3>
          <textarea id="postText">${TOR.postPrompt}</textarea>
          <button id="postBtn">Опубликовать на CELL</button></div>`
        : `<div class="cellNote">Публикации доступны только по ходу главы.</div>`}
      </div>`;
    const board = body.querySelector('#cellBoard');
    const posts = TOR.board.concat(Engine.state._cellPosts || []);
    posts.forEach(p => {
      const d = document.createElement('div'); d.className = 'post';
      d.innerHTML = `<div class="ph"><b>${p.author}</b> • ${p.title}</div><div class="pb">${this._esc(p.body)}</div>`;
      board.appendChild(d);
    });
    const pb = body.querySelector('#postBtn');
    if (pb) pb.onclick = () => {
      const txt = body.querySelector('#postText').value.trim() || TOR.postPrompt;
      (Engine.state._cellPosts = Engine.state._cellPosts || []).push({ author: 'Mrak', title: 'Собираю ячейку', body: txt });
      Engine.audio && Engine.audio.sfx('ok');
      if (Engine.postToCell()) {
        body.querySelector('#cellPost').innerHTML = '<div class="cellNote">Опубликовано. Жди ответа в Phantom.</div>';
        this.openApp('phantom');
      }
      this.refreshTor();
    };
  },
  refreshTor() { const w = this.wins.tor; if (w && w.el.isConnected) this._buildTor(w.body); },

  // ---- PHANTOM OPS ----
  _buildOps(body) { this.opsBody = body; this.refreshOps(); },
  refreshOps() {
    const body = this.opsBody || (this.wins.ops && this.wins.ops.body); if (!body) return;
    const nd = NODES[Engine.state.node] || {};
    const d = Engine.state.done[Engine.state.node] || {};
    const objs = (nd.obj || []).map(o => {
      const key = o.split(' ')[0].replace(/[<>|].*/, '');
      const map = { whoami: 'whoami', pwd: 'pwd', uname: 'uname', ls: 'ls', cat: 'diary', 'открыть': 'post', osint: 'osint', nmap: Engine.state.node === 7 ? 'nmap7' : 'nmap', staff: 'staff', payload: 'payload', connect: 'connect', 'dump-hash': 'dump', answer: Engine.state.node === 8 ? 'answer8' : Engine.state.node === 9 ? 'answer9' : 'pass', sysinfo: 'sysinfo', searchsploit: 'search', exploit: 'exploit', decode: Engine.state.node === 9 ? 'confess' : 'ledger', caesar: 'order', dossier: 'dossier', plan: 'plan', choose: 'plan' };
      const done = d[map[key]];
      return `<li class="${done ? 'dn' : ''}">${done ? '✔' : '○'} ${o}</li>`;
    }).join('');
    body.innerHTML = `
      <div class="opsHead">Глава ${Engine.state.node}: ${nd.title || ''}</div>
      <div class="opsRow">ник: <b>${Engine.state.nick}</b> • ранг: <b>${Engine.state.rank}</b></div>
      <div class="opsBar"><div style="width:${Engine.state.skill}%"></div></div>
      <div class="opsRow small">скилл ${Engine.state.skill}</div>
      <div class="opsSub">Цели главы</div><ul class="opsObj">${objs || '<li>—</li>'}</ul>
      <div class="opsSub">Ячейка PHANTOM</div>
      <ul class="opsTeam">${TEAM.map(t => `<li><b>${t.nick}</b> — ${t.role}</li>`).join('')}</ul>
      ${Engine.state.ending ? `<div class="opsEnd">Финал: ${ENDING_RU[Engine.state.ending]}</div>` : ''}`;
  },

  // ---- катсцена-оверлей (запасной, если 3D не готово) ----
  cineText(data, done) {
    const ov = this.root.querySelector('#deskCine'), inner = this.root.querySelector('#deskCineInner');
    ov.classList.remove('hidden'); let i = 0;
    const show = () => {
      if (i >= data.length) { ov.classList.add('hidden'); window.removeEventListener('keydown', onKey); done && done(); return; }
      const s = data[i++];
      inner.innerHTML = (s.spk ? `<div class="cs-spk">${s.spk}</div>` : '') + `<div class="cs-t">${s.t || s.text}</div>`;
      Engine.audio && Engine.audio.speak((s.spk ? s.spk + '. ' : '') + (s.t || s.text));
    };
    const onKey = (e) => { if (e.key === 'Enter') show(); else if (e.key === 'Escape') { i = data.length; show(); } };
    window.addEventListener('keydown', onKey); show();
  }
};
window.MrakDesktop = Desktop;
