/* CinemaLab — presentación en HTML con control desde el teléfono (PeerJS / WebRTC). */
(function () {
  'use strict';

  const PREFIJO = 'cinemalab-mec115-';
  const SITIO = 'https://cinemalab-mec115.vercel.app';
  const params = new URLSearchParams(location.search);
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const nuevoCodigo = () => String(Math.floor(100000 + Math.random() * 900000));
  const mmss = (s) => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  if (params.has('control')) iniciarControl(); else iniciarPresentador();

  /* ===================================================================== PRESENTADOR */
  function iniciarPresentador() {
    const escenario = document.getElementById('escenario');
    const laminas = Array.from(document.querySelectorAll('.lamina'));
    const progreso = document.getElementById('progreso');
    const emparejar = document.getElementById('emparejar');
    const estadoControl = document.getElementById('estado-control');
    const total = laminas.length;
    let actual = 0;

    // Pie y número en las hojas
    laminas.forEach((l, k) => {
      if (!l.classList.contains('hoja')) return;
      const pie = document.createElement('p'); pie.className = 'pie'; pie.textContent = 'CinemaLab · Mecánica Clásica MEC115';
      const num = document.createElement('p'); num.className = 'num-lamina'; num.textContent = String(k + 1);
      l.insertBefore(pie, l.querySelector('.notas')); l.insertBefore(num, l.querySelector('.notas'));
    });

    // Escalar el escenario 1920×1080 a la ventana
    function ajustar() {
      const s = Math.min(innerWidth / 1920, innerHeight / 1080);
      escenario.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
    }
    addEventListener('resize', ajustar); ajustar();

    const pasos = (l) => Array.from(l.querySelectorAll('.paso'));
    const pasoActual = () => pasos(laminas[actual]).filter((p) => p.classList.contains('visible')).length;
    const notas = (l) => (l.querySelector('.notas')?.textContent || '').replace(/\s+/g, ' ').trim();

    function activar(l) {
      // Ventanas de la app en vivo: se cargan la primera vez que se muestra la lámina
      l.querySelectorAll('.vivo[data-src]').forEach((v) => {
        if (v.querySelector('iframe')) return;
        const w = parseFloat(v.style.width), h = parseFloat(v.style.height), base = 1440, k = w / base;
        const f = document.createElement('iframe');
        f.src = v.dataset.src; f.title = 'CinemaLab en vivo'; f.loading = 'eager';
        f.style.width = base + 'px'; f.style.height = (h / k) + 'px'; f.style.transform = `scale(${k})`;
        v.appendChild(f);
      });
      // Números que cuentan
      l.querySelectorAll('[data-contar]').forEach((n) => {
        const fin = +n.dataset.contar, t0 = performance.now(), dur = 1200;
        const paso = (t) => { const p = Math.min(1, (t - t0) / dur); n.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(paso); };
        n.textContent = '0'; setTimeout(() => requestAnimationFrame(paso), 350);
      });
    }

    function mostrar(n, desdeAtras) {
      n = Math.max(0, Math.min(total - 1, n));
      const antes = actual;
      laminas.forEach((l, k) => {
        l.classList.toggle('activa', k === n);
        l.classList.toggle('atras', k < n);
        l.setAttribute('aria-hidden', k === n ? 'false' : 'true');
      });
      pasos(laminas[n]).forEach((p) => p.classList.toggle('visible', !!desdeAtras));
      actual = n;
      progreso.style.width = ((n + 1) / total * 100) + '%';
      try { history.replaceState(null, '', '#' + (n + 1)); } catch (e) { /* vista incrustada */ }
      if (n !== antes || !laminas[n].dataset.vista) { activar(laminas[n]); laminas[n].dataset.vista = '1'; }
      enviarEstado();
    }

    function sig() {
      const pend = pasos(laminas[actual]).find((p) => !p.classList.contains('visible'));
      if (pend) { pend.classList.add('visible'); enviarEstado(); return; }
      if (actual < total - 1) mostrar(actual + 1, false);
    }
    function ant() {
      const vis = pasos(laminas[actual]).filter((p) => p.classList.contains('visible'));
      if (vis.length) { vis[vis.length - 1].classList.remove('visible'); enviarEstado(); return; }
      if (actual > 0) mostrar(actual - 1, true);
    }
    function pantalla() {
      if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {});
    }
    const abrirEmparejar = () => emparejar.classList.add('abierto');
    const cerrarEmparejar = () => emparejar.classList.remove('abierto');

    addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key;
      if (['ArrowRight', 'PageDown', ' ', 'Enter', 'ArrowDown'].includes(k)) { e.preventDefault(); if (emparejar.classList.contains('abierto')) cerrarEmparejar(); else sig(); }
      else if (['ArrowLeft', 'PageUp', 'Backspace', 'ArrowUp'].includes(k)) { e.preventDefault(); ant(); }
      else if (k === 'Home') mostrar(0, false);
      else if (k === 'End') mostrar(total - 1, true);
      else if (k === 'f' || k === 'F') pantalla();
      else if (k === 'c' || k === 'C') emparejar.classList.toggle('abierto');
      else if (k === 'Escape') cerrarEmparejar();
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-accion]'); if (!b) return;
      ({ sig, ant, pantalla, control: abrirEmparejar, cerrar: cerrarEmparejar })[b.dataset.accion]?.();
      b.blur();
    });
    // Los botones aparecen al mover el mouse
    let quieto = null;
    addEventListener('mousemove', () => { document.body.classList.add('mueve'); clearTimeout(quieto); quieto = setTimeout(() => document.body.classList.remove('mueve'), 2200); });

    // Si el foco se quedó dentro de una ventana en vivo, un clic fuera lo devuelve
    escenario.addEventListener('mousedown', (e) => { if (!e.target.closest('.vivo')) window.focus(); });

    // QR del sitio (lámina de publicación)
    const qrSitio = document.getElementById('qr-sitio');
    if (qrSitio && window.qrcode) { const q = qrcode(0, 'M'); q.addData(SITIO); q.make(); qrSitio.innerHTML = q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); qrSitio.querySelector('svg').setAttribute('style', 'width:300px;height:300px;display:block'); }

    /* ---------- Control remoto */
    const conexiones = new Set();
    let codigo = leer('cinemalab-codigo') || nuevoCodigo();
    let peer = null;

    function estado() {
      const l = laminas[actual], p = pasos(l);
      return {
        t: 'estado', i: actual, total, titulo: l.dataset.titulo, tiempo: +l.dataset.tiempo || 60,
        notas: notas(l), paso: pasoActual(), pasos: p.length,
        siguiente: actual < total - 1 ? laminas[actual + 1].dataset.titulo : null,
        lista: laminas.map((x) => x.dataset.titulo),
      };
    }
    function enviarEstado() {
      const e = estado();
      conexiones.forEach((c) => { if (c.open) c.send(e); });
      estadoControl.classList.toggle('conectado', Array.from(conexiones).some((c) => c.open));
      estadoControl.textContent = 'Control conectado · lámina ' + (actual + 1) + '/' + total;
    }

    function pintarEmparejar() {
      const url = location.origin + location.pathname + '?control=' + codigo;
      document.getElementById('codigo-control').textContent = codigo;
      document.getElementById('enlace-control').textContent = (location.host || 'esta página') + location.pathname + '?control';
      const caja = document.getElementById('qr-control');
      if (window.qrcode) { const q = qrcode(0, 'M'); q.addData(url); q.make(); caja.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }
    }

    function conectarPeer() {
      const msg = document.getElementById('estado-peer');
      if (!window.Peer) { msg.textContent = 'No se pudo cargar el control remoto (sin internet). Igual podés usar el teclado.'; return; }
      pintarEmparejar();
      peer = new Peer(PREFIJO + codigo, { debug: 0 });
      peer.on('open', () => { guardar('cinemalab-codigo', codigo); msg.textContent = 'Listo: esperando el teléfono…'; });
      peer.on('connection', (c) => {
        conexiones.add(c);
        c.on('open', () => { msg.textContent = '¡Teléfono conectado!'; enviarEstado(); setTimeout(cerrarEmparejar, 900); });
        c.on('data', (d) => {
          if (!d || typeof d !== 'object') return;
          if (d.t === 'sig') sig();
          else if (d.t === 'ant') ant();
          else if (d.t === 'ir' && Number.isInteger(d.i)) mostrar(d.i, false);
          else if (d.t === 'hola') enviarEstado();
        });
        c.on('close', () => { conexiones.delete(c); enviarEstado(); });
        c.on('error', () => { conexiones.delete(c); enviarEstado(); });
      });
      peer.on('disconnected', () => { msg.textContent = 'Reconectando…'; setTimeout(() => { try { peer.reconnect(); } catch (e) { /* nada */ } }, 1500); });
      peer.on('error', (err) => {
        if (err && err.type === 'unavailable-id') { codigo = nuevoCodigo(); try { peer.destroy(); } catch (e) { /* nada */ } conectarPeer(); return; }
        msg.textContent = 'Problema de conexión (' + (err && err.type || 'desconocido') + '). Reintentando…';
        if (err && ['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) setTimeout(() => { try { peer.destroy(); } catch (e) { /* nada */ } conectarPeer(); }, 3000);
      });
    }

    // Arranque
    const inicial = parseInt(location.hash.slice(1), 10);
    mostrar(Number.isInteger(inicial) ? inicial - 1 : 0, false);
    conectarPeer();
    if (!Number.isInteger(inicial) || inicial === 1) abrirEmparejar();
  }

  /* ===================================================================== CONTROL (TELÉFONO) */
  function iniciarControl() {
    document.body.className = 'control';
    document.body.innerHTML = `
      <header class="c-cabeza"><span class="c-punto" id="c-punto"></span><b>CinemaLab · Control</b><span class="c-estado" id="c-estado">Conectando…</span></header>
      <main class="c-cuerpo" id="c-cuerpo"></main>
      <nav class="c-botones" aria-label="Avanzar o retroceder">
        <button type="button" id="c-ant" aria-label="Anterior">◀ Atrás</button>
        <button type="button" class="sig" id="c-sig" aria-label="Siguiente">Siguiente ▶</button>
      </nav>`;
    const cuerpo = document.getElementById('c-cuerpo');
    const punto = document.getElementById('c-punto');
    const txtEstado = document.getElementById('c-estado');
    let codigo = (params.get('control') || '').replace(/\D/g, '');
    let conn = null, peer = null, ultimo = null, listaAbierta = false;
    let inicioTotal = null, inicioLamina = Date.now(), laminaVista = -1, bloqueo = null;

    const pedirPantalla = async () => { try { if (!bloqueo && navigator.wakeLock) { bloqueo = await navigator.wakeLock.request('screen'); bloqueo.addEventListener('release', () => { bloqueo = null; }); } } catch (e) { /* sin wake lock */ } };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pedirPantalla(); });

    function mandar(m) {
      if (navigator.vibrate) navigator.vibrate(15);
      pedirPantalla();
      if (inicioTotal === null && (m.t === 'sig' || m.t === 'ir')) inicioTotal = Date.now();
      if (conn && conn.open) conn.send(m);
    }
    document.getElementById('c-sig').addEventListener('click', () => mandar({ t: 'sig' }));
    document.getElementById('c-ant').addEventListener('click', () => mandar({ t: 'ant' }));

    function pedirCodigo(error) {
      marcar(false, 'Sin conectar');
      cuerpo.innerHTML = `<div class="c-tarjeta c-ayuda"><p class="c-notas-titulo">Conectar con la presentación</p>
        <p>Escribí el código de 6 números que aparece en la computadora (tecla <b>C</b> lo muestra).</p>
        ${error ? `<p style="color:var(--rojo)">${esc(error)}</p>` : ''}
        <input id="c-codigo" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="000000" value="${esc(codigo)}">
        <button type="button" id="c-conectar">Conectar</button></div>`;
      const b = document.getElementById('c-conectar');
      b.onclick = () => { codigo = document.getElementById('c-codigo').value.replace(/\D/g, ''); if (codigo.length === 6) { try { history.replaceState(null, '', '?control=' + codigo); } catch (e) { /* nada */ } conectar(); } };
    }

    function render() {
      const e = ultimo; if (!e) return;
      if (e.i !== laminaVista) { laminaVista = e.i; inicioLamina = Date.now(); }
      const lista = e.lista.map((t, k) => `<button type="button" data-ir="${k}" class="${k === e.i ? 'actual' : ''}">${k + 1}. ${esc(t)}</button>`).join('');
      cuerpo.innerHTML = `
        <div class="c-tarjeta">
          <div class="c-num">Lámina ${e.i + 1} de ${e.total}</div>
          <p class="c-titulo">${esc(e.titulo)}</p>
          ${e.pasos ? `<div class="c-pasos">Elementos mostrados: ${e.paso} de ${e.pasos}${e.paso < e.pasos ? ' · «Siguiente» muestra el próximo' : ''}</div>` : ''}
        </div>
        <div class="c-relojes">
          <div class="c-reloj" id="r-lamina"><span>Esta lámina</span><b>0:00</b></div>
          <div class="c-reloj"><span>Sugerido</span><b>${mmss(e.tiempo)}</b></div>
          <div class="c-reloj" id="r-total"><span>Total</span><b>0:00</b></div>
        </div>
        <div class="c-tarjeta"><p class="c-notas-titulo">Qué decir</p><p class="c-notas">${esc(e.notas || 'Sin notas para esta lámina.')}</p></div>
        <div class="c-tarjeta c-sig">${e.siguiente ? `Después viene: <b>${esc(e.siguiente)}</b>` : '<b>Es la última lámina.</b>'}</div>
        <div class="c-acciones">
          <button type="button" id="c-lista-btn">${listaAbierta ? 'Ocultar' : 'Ver'} todas las láminas</button>
          <button type="button" id="c-reiniciar">Reiniciar cronómetro</button>
        </div>
        <div class="c-lista ${listaAbierta ? 'abierta' : ''}" id="c-lista">${lista}</div>`;
      document.getElementById('c-lista-btn').onclick = () => { listaAbierta = !listaAbierta; render(); };
      document.getElementById('c-reiniciar').onclick = () => { inicioTotal = Date.now(); inicioLamina = Date.now(); relojes(); };
      cuerpo.querySelectorAll('[data-ir]').forEach((b) => { b.onclick = () => { listaAbierta = false; mandar({ t: 'ir', i: +b.dataset.ir }); }; });
      relojes();
    }
    function relojes() {
      const e = ultimo; if (!e) return;
      const rl = document.getElementById('r-lamina'), rt = document.getElementById('r-total');
      if (!rl) return;
      const sl = (Date.now() - inicioLamina) / 1000;
      rl.querySelector('b').textContent = mmss(sl);
      rl.classList.toggle('pasado', sl > e.tiempo);
      rt.querySelector('b').textContent = inicioTotal ? mmss((Date.now() - inicioTotal) / 1000) : '0:00';
      rt.classList.toggle('pasado', inicioTotal && (Date.now() - inicioTotal) / 1000 > 20 * 60);
    }
    setInterval(relojes, 500);
    if (params.has('prueba')) window.__estadoPrueba = (e) => { ultimo = e; render(); marcar(true, 'Conectado'); };

    function marcar(ok, texto) { punto.classList.toggle('ok', ok); txtEstado.textContent = texto; }

    function conectar() {
      if (codigo.length !== 6) { pedirCodigo(); return; }
      if (!window.Peer) { pedirCodigo('No se pudo cargar la conexión. Revisá el internet del teléfono.'); return; }
      marcar(false, 'Conectando…');
      if (!ultimo) cuerpo.innerHTML = '<div class="c-tarjeta c-ayuda">Buscando la presentación con el código <b>' + esc(codigo) + '</b>…<br><br>Si no conecta, revisá que la computadora tenga la presentación abierta.</div>';
      if (peer) { try { peer.destroy(); } catch (e) { /* nada */ } }
      peer = new Peer({ debug: 0 });
      let intentos = 0;
      const abrir = () => {
        conn = peer.connect(PREFIJO + codigo, { reliable: true });
        conn.on('open', () => { marcar(true, 'Conectado'); conn.send({ t: 'hola' }); pedirPantalla(); });
        conn.on('data', (d) => { if (d && d.t === 'estado') { ultimo = d; render(); } });
        conn.on('close', () => { marcar(false, 'Se perdió la conexión…'); setTimeout(abrir, 2000); });
      };
      peer.on('open', abrir);
      peer.on('error', (err) => {
        if (err && err.type === 'peer-unavailable') {
          intentos++;
          marcar(false, 'No encuentro la presentación');
          if (intentos > 4 && !ultimo) { pedirCodigo('No encontré ninguna presentación con ese código.'); return; }
          setTimeout(abrir, 2500); return;
        }
        marcar(false, 'Reconectando…');
        setTimeout(conectar, 3000);
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* nada */ } });
    }
    conectar();
  }
})();
