# DARK REVENGE / MRAK :: Тёмный код мести

Художественный офлайн-симулятор мести хакера. Смесь 3D от первого лица (квартира, двор,
банк) и рабочего стола Kali Linux. **Это не инструкция по взлому. Все цели, банк и
персонажи вымышлены.** Техники показаны «как в кино». Взлом чужих систем без разрешения —
преступление. Учись легально: TryHackMe, HackTheBox, PortSwigger, CTF.

## Запуск в браузере
ES-модули не работают через `file://` — нужен локальный сервер из папки `src`:

```bash
python3 -m http.server 8080 --directory src
# открыть http://localhost:8080
```

или `npx http-server src -p 8080 -o`.

## Управление
- **WASD** — ходьба, **Shift** — бег, **мышь** — осмотр (клик = захват курсора, **Esc** = курсор)
- **E** — действие (двери, письмо, сесть за ПК)
- Сесть за ПК всегда открывает рабочий стол Kali. Встать: **⏏** на панели или Applications → встать.
- В прологе/катсценах: **ENTER** — дальше, **ESC** — пропустить.

## Приложения Kali
- **Terminal** — kali bash (whoami, ls, cat, nmap, osint, payload, connect, dump-hash,
  answer, sysinfo, searchsploit, exploit, decode, caesar, dossier, plan, choose; `help`, `hint`, `learn`).
- **Phantom Messenger** — зашифрованный чат ячейки `#phantom-cell`.
- **Tor Browser** — даркнет-доска CELL (`cell7xphantom.onion`), публикации только отсюда.
- **PHANTOM OPS** — цели главы, ник, ранг, скилл, состав ячейки.

## Сборка .exe/.app (Tauri v2)
Нужны Rust и Tauri CLI. Из корня проекта:

```bash
npm install
npm run icons        # сгенерировать icon.icns/icon.ico из icons/icon.png
npm run tauri:dev    # запуск нативного окна
npm run tauri:build  # нативный бинарник в src-tauri/target/release/bundle
```

`productName: MRAK`, `identifier: com.phantom.mrak`, `frontendDist: ../src`. Игра полностью
офлайн; Three.js лежит локально в `src/vendor/`.

## Структура
```
src/index.html, styles.css
src/js/engine.js     состояние, катсцены, роутер команд, сохранения (localStorage mrak_save_v1)
src/js/content.js    NODES сюжета, чат, Tor, катсцены, загадки
src/js/world3d.js    Three.js мир, пролог, миссия «Флешка»
src/js/desktop.js    Kali XFCE: окна, Terminal/Phantom/Tor/OPS
src/js/audio.js      WebAudio SFX + речь RU/EN
src/js/main.js       мост меню ↔ 3D ↔ ПК
src/vendor/three.module.js
src-tauri/           Tauri v2
```
