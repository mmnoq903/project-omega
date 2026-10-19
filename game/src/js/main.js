// main.js — мост: меню → пролог → квартира → Kali. Связывает все модули.
import { Engine } from './engine.js';
import { World3D } from './world3d.js';
import { Desktop } from './desktop.js';
import { Audio } from './audio.js';
import { ENDING_RU } from './content.js';

Engine.init();
Engine.world = World3D; Engine.desktop = Desktop; Engine.audio = Audio;

const $ = s => document.querySelector(s);
const menu = $('#menu'), credits = $('#credits'), stage = $('#stage');

function hideMenu() { menu.classList.add('hidden'); credits.classList.add('hidden'); }
function showMenu() {
  Engine.audio.stopAmbient();
  if (Desktop.visible) Desktop.close();
  World3D.mode = 'idle';
  menu.classList.remove('hidden'); credits.classList.add('hidden');
  $('#continueBtn').disabled = !Engine.hasSave();
}
window.MrakMenu = showMenu;

function boot3D() {
  if (!World3D.ready) World3D.init($('#scene'));
}

function startClassic() {
  Audio.init(); Audio.resume();
  Engine.reset();
  hideMenu(); boot3D();
  World3D.playPrologue(() => { /* уже в квартире */ });
}
function continueGame() {
  Audio.init(); Audio.resume();
  if (!Engine.load()) { startClassic(); return; }
  hideMenu(); boot3D();
  World3D.loadScene('apartment');
  World3D.mode = 'play';
  const n = Engine.state.node;
  const hacking = (n >= 7 && n <= 10) || n === 3;
  World3D.toast(hacking ? `Глава ${n}. Сядь за ПК (E), чтобы продолжить.` : `Продолжение. Глава ${n}.`);
}
function showCredits() {
  credits.classList.remove('hidden'); menu.classList.add('hidden');
}

// ---- кнопки меню ----
$('#classicBtn').onclick = startClassic;
$('#continueBtn').onclick = continueGame;
$('#creditsBtn').onclick = showCredits;
$('#creditsBack').onclick = showMenu;

// озвучка RU/EN
const voiceBtn = $('#voiceBtn');
function syncVoice() { voiceBtn.textContent = 'Озвучка: ' + (Engine.state.lang === 'en' ? 'EN' : 'RU'); }
voiceBtn.onclick = () => { Engine.state.lang = Engine.state.lang === 'en' ? 'ru' : 'en'; Audio.setLang(Engine.state.lang); Engine.save(); syncVoice(); };

// звук вкл/выкл
const soundBtn = $('#soundBtn');
function syncSound() { soundBtn.textContent = 'Звук: ' + (Engine.state.sound ? 'ВКЛ' : 'ВЫКЛ'); }
soundBtn.onclick = () => { Engine.state.sound = !Engine.state.sound; Audio.setEnabled(Engine.state.sound); Engine.save(); syncSound(); };

Audio.init(); Audio.setLang(Engine.state.lang); Audio.setEnabled(Engine.state.sound);
syncVoice(); syncSound();
$('#continueBtn').disabled = !Engine.hasSave();

// первый клик — разблокировать аудио-контекст
addEventListener('pointerdown', () => Audio.resume(), { once: true });

// ESC в игре — курсор/меню-пауза подсказка
addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !menu.classList.contains('hidden')) return;
});

console.log('MRAK :: загружено. Всё вымышлено. Учись легально: learn');
