// engine.js — состояние, сохранения, роутер команд терминала, развитие сюжета.
// Терминал — художественная бутафория: команды печатают сценарный текст по вымышленным целям.
import { NODES, CHAT, FILES, DECODE, SOLUTIONS, CUTSCENES, ENDING_KEYS } from './content.js';

const SAVE_KEY = 'mrak_save_v1';
const seg = {
  out: t => ({ k: 'out', text: t }),
  story: t => ({ k: 'story', text: t }),
  prog: l => ({ k: 'prog', label: l }),
  ok: () => ({ k: 'ok' }),
  bad: () => ({ k: 'bad' }),
  clear: () => ({ k: 'clear' })
};

export const Engine = {
  world: null, desktop: null, audio: null,            // late-bound в main.js
  state: null,

  fresh() {
    return {
      node: 1, nick: 'Mrak', rank: 'Новобранец', skill: 10,
      lang: 'ru', sound: true,
      done: {}, chatLog: [], chatGiven: {}, ending: null,
      seenPrologue: false
    };
  },
  init() { if (!this.state) this.state = this.fresh(); },

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch (e) {}
  },
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      this.state = Object.assign(this.fresh(), JSON.parse(raw));
      return true;
    } catch (e) { return false; }
  },
  reset() { this.state = this.fresh(); this.save(); },

  node() { return NODES[this.state.node]; },
  flag(name) { const d = this.state.done[this.state.node] || (this.state.done[this.state.node] = {}); return d[name]; },
  setFlag(name) { const d = this.state.done[this.state.node] || (this.state.done[this.state.node] = {}); d[name] = true; this.save(); if (this.desktop) this.desktop.refreshOps(); },
  bump(n) { this.state.skill = Math.min(100, this.state.skill + n); this.rankUp(); this.save(); if (this.desktop) this.desktop.refreshOps(); },
  rankUp() {
    const s = this.state.skill;
    this.state.rank = s >= 85 ? 'Призрак' : s >= 60 ? 'Оператор' : s >= 35 ? 'Взломщик' : s >= 20 ? 'Разведчик' : 'Новобранец';
  },

  // ---- доставка чата Phantom ----
  giveChat(key) {
    if (this.state.chatGiven[key]) return;
    this.state.chatGiven[key] = true;
    const msgs = CHAT[key]; if (!msgs) return;
    if (this.desktop) this.desktop.pushChat(msgs);
    else msgs.forEach(m => this.state.chatLog.push(m));
    this.save();
  },

  // ---- катсцены / продвижение ----
  playCutscene(n, variant) {
    const data = variant ? CUTSCENES[n][variant] : CUTSCENES[n];
    if (this.world && this.world.ready) this.world.cineText(data, () => this.afterCutscene(n));
    else if (this.desktop) this.desktop.cineText(data, () => this.afterCutscene(n));
  },
  afterCutscene(n) {
    if (n === 2) { this.state.node = 3; this.save(); this.giveChat(3); this.toApartment('Глава 3 — Разведка. Сядь за ПК.'); }
    else if (n === 4) { this.state.node = 5; this.save(); this.beginFlash(); }
    else if (n === 6) { this.state.node = 7; this.save(); this.toApartment('Глава 7 — Взлом периметра. Сядь за ПК.'); }
    else if (n === 11) { this.toMenu(); }
    if (this.desktop) this.desktop.refreshOps();
  },
  toApartment(msg) {
    if (this.desktop) this.desktop.close();
    if (this.world && this.world.ready) { this.world.loadScene('apartment'); if (msg) this.world.toast(msg); }
  },
  beginFlash() {
    if (this.desktop) this.desktop.close();
    if (this.world && this.world.ready) this.world.startFlash(() => this.flashDone());
  },
  flashDone() {
    this.bump(15);
    this.state.node = 6; this.save();
    this.playCutscene(6);
  },
  toMenu() { if (window.MrakMenu) window.MrakMenu(); },

  // ---- вызывается из Tor при публикации ----
  postToCell() {
    if (this.state.node !== 1) return false;
    this.setFlag('post'); this.bump(10);
    this.giveChat('afterPost');
    setTimeout(() => { this.state.node = 2; this.save(); this.desktop && this.desktop.refreshOps(); this.playCutscene(2); }, 3600);
    return true;
  },

  // ---- роутер терминала ----
  term(raw) {
    const line = (raw || '').trim();
    if (!line) return [];
    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const a1 = (parts[1] || '').toLowerCase();
    const rest = parts.slice(1).join(' ');
    const S = seg;

    switch (cmd) {
      case 'help': return [S.out('Базовые: whoami pwd uname ls cat clear help hint learn tools man'),
        S.out('По главам: osint nmap staff payload connect dump-hash answer sysinfo searchsploit exploit decode caesar dossier plan choose')];
      case 'hint': return [S.story('[подсказка] ' + (this.node().hint || 'Открой PHANTOM OPS — там цели главы.'))];
      case 'learn': return [S.out('Хочешь взламывать по-настоящему и легально? Тренируйся на:'),
        S.out('  TryHackMe  •  HackTheBox  •  PortSwigger Web Security Academy  •  CTF (picoCTF)'),
        S.story('Взлом чужих систем без разрешения — преступление. Здесь всё вымышлено.')];
      case 'tools': return [S.out('nmap  sqlmap  hydra  burpsuite  metasploit  wireshark  john  aircrack-ng'),
        S.story('(в этой истории — декорация; настоящие тебе не понадобятся)')];
      case 'clear': return [S.clear()];
      case 'man': return [S.out('man ' + (a1 || '?') + ': смотри help. Это стилизованный терминал истории.')];
      case 'whoami': if (this.state.node === 1) this.setFlag('whoami'); return [S.out('henry')];
      case 'pwd': if (this.state.node === 1) this.setFlag('pwd'); return [S.out('/home/henry')];
      case 'uname':
        if (this.state.node === 1) this.setFlag('uname');
        return [S.out('Linux mrak 3.13.0-kali #1 SMP x86_64 GNU/Linux')];
      case 'echo': return [S.out(rest)];
      case 'ls': return this._ls();
      case 'cat': return this._cat(a1);
      case 'osint': return this._osint(a1);
      case 'nmap': return this._nmap(a1);
      case 'staff': return this._staff();
      case 'payload': return this._payload(a1);
      case 'connect': return this._connect(a1);
      case 'dump-hash': case 'dumphash': return this._dump();
      case 'answer': return this._answer(rest);
      case 'sysinfo': return this._sysinfo();
      case 'searchsploit': return this._searchsploit();
      case 'exploit': return this._exploit(rest);
      case 'decode': return this._decode(a1);
      case 'caesar': return this._caesar(a1, parseInt(parts[2], 10));
      case 'dossier': return this._dossier();
      case 'plan': return this._plan();
      case 'choose': return this._choose(a1);
      default:
        return [S.out('bash: ' + cmd + ': команда не найдена'), S.out("введи 'help' или 'hint'")];
    }
  },

  _complete(node, chatKey, next, cineNode) {
    this.bump(10);
    if (chatKey) this.giveChat(chatKey);
    if (next != null) { this.state.node = next; }
    this.save();
    if (this.desktop) this.desktop.refreshOps();
    if (cineNode != null) setTimeout(() => this.playCutscene(cineNode), 1500);
  },

  _ls() {
    const n = this.state.node;
    let names;
    if (n <= 2) names = ['diary.txt', 'readme.txt', '.bash_history'];
    else if (n >= 7) names = ['ledger.enc', 'order.enc', 'confession.enc', 'rainbow.txt', 'readme.txt'];
    else names = ['diary.txt', 'readme.txt', 'rainbow.txt'];
    if (n === 1) this.setFlag('ls');
    return [seg.out(names.join('   '))];
  },
  _cat(f) {
    if (!f) return [seg.out('cat: укажи файл')];
    const key = f.replace(/^\.\//, '');
    if (FILES[key]) {
      if (this.state.node === 1 && key === 'diary.txt') { this.setFlag('diary'); this.audio && this.audio.sfx('ok'); }
      return FILES[key].split('\n').map(l => seg.out(l));
    }
    if (key === '.bash_history') return [seg.out('ls'), seg.out('cat diary.txt'), seg.out('su -')];
    return [seg.out('cat: ' + f + ': нет такого файла')];
  },

  _osint(t) {
    if (this.state.node !== 3) return [seg.story('Сейчас это не нужно. Проверь цели в PHANTOM OPS.')];
    if (t !== 'orlovbank' && t !== 'orlov') return [seg.out('osint: укажи цель, напр. osint orlovbank')];
    this.setFlag('osint');
    return [seg.prog('OSINT :: сбор открытых данных по ORLOV BANK'),
      seg.story('Юрлицо: ООО «Орлов-Финанс». Филиалы: 7. Головной офис — Садовая, 12.'),
      seg.story('Владелец скрыт за цепочкой фирм. Соцсети сотрудников открыты настежь.'),
      seg.story('В отзывах: «уволили пол-отдела», «пропали какие-то резервы». Запах гнили.'),
      seg.ok()];
  },
  _nmap(t) {
    const n = this.state.node;
    if (n === 3 && (t === 'sadovaya12' || t === 'sadovaya' || t === 'садовая12')) {
      this.setFlag('nmap');
      return [seg.prog('nmap -sV sadovaya12.local'),
        seg.story('22/tcp  ssh      OpenSSH'),
        seg.story('80/tcp  http     внутренний портал филиала'),
        seg.story('445/tcp smb      общая папка «CONSULT»'),
        seg.story('Рабочие станции консультантов в одной подсети. Олег — узел CONSULT-03.'),
        seg.ok()];
    }
    if (n === 7 && (t === 'orlovbank' || t === 'orlov')) {
      this.setFlag('nmap7');
      return [seg.prog('nmap -A orlovbank.internal (через бэкдор)'),
        seg.story('Туннель с флешки жив. Вижу внутренний шлюз 10.0.0.1'),
        seg.story('8080/tcp  admin-panel  (слабая)'),
        seg.story('Готово к connect orlovbank'), seg.ok()];
    }
    return [seg.out('nmap: уточни цель для текущей главы (см. hint)')];
  },
  _staff() {
    if (this.state.node !== 3) return [seg.story('Персонал не нужен сейчас.')];
    this.setFlag('staff');
    return [seg.out('ПЕРСОНАЛ ФИЛИАЛА (Садовая, 12):'),
      seg.out('  [стол справа]  Ирина К.  — ипотека'),
      seg.out('  [стол слева ]  Олег Ромащенко — вклады  <-- цель'),
      seg.out('  [ресепшн   ]  охрана, 2 камеры у банкоматов'),
      seg.story('Машина Олега (CONSULT-03) стоит СЛЕВА у окна. Туда и пойдёт флешка.')];
  },
  _payload(lvl) {
    if (this.state.node !== 3) return [seg.story('Пейлоад пока не нужен.')];
    if (lvl !== '2') return [seg.out('payload <1|2|3>  — выбери тип'),
      seg.out('  1 = шумный баннер (спалимся)'),
      seg.out('  2 = тихий бэкдор (рекомендую)'),
      seg.out('  3 = шифровальщик (НЕТ — пострадают люди)')];
    if (!this.flag('staff')) return [seg.story('Сначала разберись с персоналом: staff.')];
    this.setFlag('payload');
    const r = [seg.prog('сборка тихого бэкдора payload-2 (без шифрования, без шума)'),
      seg.story('Записан на флешку как обновление драйвера. Активируется при вставке в CONSULT-03.'),
      seg.ok()];
    this._complete(3, 'afterPayload', null, 4);
    return r;
  },
  _connect(t) {
    if (this.state.node !== 7) return [seg.story('Подключаться пока некуда.')];
    if (t !== 'orlovbank' && t !== 'orlov') return [seg.out('connect orlovbank')];
    if (!this.flag('nmap7')) return [seg.story('Сначала nmap orlovbank.')];
    this.setFlag('connect');
    return [seg.prog('ssh через бэкдор → orlovbank.internal'),
      seg.story('Соединение установлено. Ты внутри сети банка.'),
      seg.story('Нужен админ. Сдампь хэши: dump-hash'), seg.ok()];
  },
  _dump() {
    if (this.state.node !== 7) return [seg.story('Нечего дампить.')];
    if (!this.flag('connect')) return [seg.story('Сначала connect orlovbank.')];
    this.setFlag('dump');
    return [seg.prog('выгрузка хэшей паролей'),
      seg.out('admin : 21232f297a57a5a743894a0e4a801fc3'),
      seg.out('oleg  : 5f4dcc3b5aa765d61d8327deb882cf99'),
      seg.story('Это MD5. Сверься с rainbow.txt (cat rainbow.txt), потом answer <пароль admin>.'),
      seg.ok()];
  },
  _answer(a) {
    const v = (a || '').trim().toLowerCase().replace(/[.,!]/g, '');
    const n = this.state.node;
    if (n === 7) {
      if (!this.flag('dump')) return [seg.story('Нечего отвечать — сначала dump-hash.')];
      if (v === 'admin') { this.setFlag('pass'); return [seg.story('Пароль admin принят. Теперь sysinfo.'), seg.ok()]; }
      return [seg.bad(), seg.story('Неверно. 21232f297a57a5a743894a0e4a801fc3 — это MD5 самого частого дефолтного логина. Одно слово.')];
    }
    if (n === 8) {
      if (!this.flag('order')) return [seg.story('Сначала расшифруй order.enc (caesar order.enc 5).')];
      if (v.includes('соколов') || v === 'sokolov') {
        this.setFlag('answer8');
        const r = [seg.story('Соколова убрали за те же вопросы, что и отца Генри. Это система.'), seg.ok()];
        this._complete(8, 'afterDirt', 9, null);
        return r;
      }
      return [seg.bad(), seg.story('Неверно. Чья фамилия в приказе 44/С?')];
    }
    if (n === 9) {
      if (!this.flag('confess')) return [seg.story('Сначала decode confession.enc.')];
      if (v === 'orlov-2020' || v === 'orlov2020') {
        this.setFlag('answer9');
        const r = [seg.story('Ключ архива принят. Всё дело Орлова у тебя в руках.'), seg.ok()];
        this._complete(9, 'afterOwner', 10, null);
        return r;
      }
      return [seg.bad(), seg.story('Неверно. Ключ назван в самом признании.')];
    }
    return [seg.out('answer: сейчас не на что отвечать')];
  },
  _sysinfo() {
    if (this.state.node !== 7 || !this.flag('pass')) return [seg.story('Сначала получи доступ admin.')];
    this.setFlag('sysinfo');
    return [seg.out('OS: Ubuntu 14.04 LTS'), seg.out('Kernel: 3.13.0-24-generic'),
      seg.story('Старое ядро. Поищи известную дыру: searchsploit.')];
  },
  _searchsploit() {
    if (this.state.node !== 7 || !this.flag('sysinfo')) return [seg.story('Сначала sysinfo.')];
    this.setFlag('search');
    return [seg.out('Linux Kernel 3.13 overlayfs - Local Privilege Escalation   | CVE-2015-1328'),
      seg.out('(прочие результаты скрыты)'),
      seg.story('Повышение прав до root: exploit CVE-2015-1328')];
  },
  _exploit(arg) {
    if (this.state.node !== 7) return [seg.story('Нечего эксплуатировать.')];
    if (!this.flag('search')) return [seg.story('Сначала searchsploit.')];
    const a = (arg || '').toUpperCase().replace(/\s/g, '');
    if (!a.includes('CVE-2015-1328')) return [seg.bad(), seg.story('Не та дыра. Нужна именно CVE-2015-1328 (overlayfs).')];
    this.setFlag('exploit');
    const r = [seg.prog('запуск эксплойта CVE-2015-1328 (overlayfs LPE)'),
      seg.story('# whoami'), seg.out('root'),
      seg.story('Ты — root в системе ORLOV BANK. Полный доступ.'), seg.ok()];
    this._complete(7, 'afterExploit', 8, null);
    return r;
  },
  _decode(f) {
    const key = (f || '').replace(/^\.\//, '');
    if (this.state.node === 8 && key === 'ledger.enc') {
      this.setFlag('ledger');
      return [seg.prog('base64 -d ledger.enc'),
        ...SOLUTIONS.LEDGER_PLAIN.split('. ').map(s => seg.story(s)),
        seg.story('480 миллионов. Теперь приказ: caesar order.enc 5.'), seg.ok()];
    }
    if (this.state.node === 9 && key === 'confession.enc') {
      if (!this.flag('dossier')) return [seg.story('Сначала собери dossier.')];
      this.setFlag('confess');
      return [seg.prog('base64 -d confession.enc'),
        ...SOLUTIONS.CONFESS_PLAIN.split('. ').map(s => seg.story(s)),
        seg.story('Ключ архива назван прямо в тексте. answer <ключ>.'), seg.ok()];
    }
    if (FILES[key]) return [seg.out(FILES[key])];
    return [seg.out('decode: не могу раскодировать ' + (f || '(пусто)'))];
  },
  _caesar(f, n) {
    const key = (f || '').replace(/^\.\//, '');
    if (this.state.node === 8 && key === 'order.enc') {
      if (!(n >= 1)) return [seg.out('caesar order.enc <сдвиг>  — попробуй сдвиг 5')];
      const plain = DECODE.caesar(FILES['order.enc'], -n);
      if (n === 5) {
        this.setFlag('order');
        return [seg.prog('шифр Цезаря, сдвиг ' + n),
          ...plain.split('. ').map(s => seg.story(s)),
          seg.story('Кого уволили? answer <фамилия>.'), seg.ok()];
      }
      return [seg.out('[сдвиг ' + n + '] ' + plain.slice(0, 48) + '...'), seg.story('Похоже не тот сдвиг. Попробуй 5.')];
    }
    return [seg.out('caesar: нечего расшифровывать')];
  },
  _dossier() {
    if (this.state.node !== 9) return [seg.story('Досье пока рано.')];
    this.setFlag('dossier');
    return [seg.prog('сбор досье на владельца по архиву'),
      seg.out('Виктор Орлов — конечный бенефициар через офшоры.'),
      seg.out('Выведены пенсионные накопления 12000 вкладчиков.'),
      seg.story('Его признание зашифровано: decode confession.enc'), seg.ok()];
  },
  _plan() {
    if (this.state.node !== 10) return [seg.story('План финала ещё не открыт.')];
    this.setFlag('plan');
    return [seg.out('У тебя всё: 480М, досье Орлова, признание. Выбери финал:'),
      seg.out('  1 justice    — сдать полиции анонимно'),
      seg.out('  2 redemption — вернуть деньги вкладчикам, затем сдать (лучший)'),
      seg.out('  3 greed      — забрать 480М себе'),
      seg.out('  4 burn       — слить всё без разбора'),
      seg.out('  5 revenge    — написать Орлову лично'),
      seg.story('choose <слово или 1..5>')];
  },
  _choose(a) {
    if (this.state.node !== 10 || !this.flag('plan')) return [seg.story('Сначала plan.')];
    const map = { '1': 'justice', '2': 'redemption', '3': 'greed', '4': 'burn', '5': 'revenge' };
    let key = map[a] || (ENDING_KEYS.includes(a) ? a : null);
    if (!key) return [seg.out('choose justice|redemption|greed|burn|revenge  (или 1..5)')];
    this.state.ending = key; this.state.node = 11; this.save();
    if (this.desktop) this.desktop.refreshOps();
    setTimeout(() => this.playCutscene(11, key), 900);
    return [seg.story('Решение принято: ' + key + '.'), seg.ok()];
  }
};
window.MrakEngine = Engine;
