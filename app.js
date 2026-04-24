/* ═══════════════════════════════════════════════
   AlertManager — app.js
   Conecta con n8n via webhooks configurables
   ════════════════════════════════════════════ */

// ── CONFIG ──────────────────────────────────────
const Config = {
  KEY: 'alertmanager_config',
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; }
    catch { return {}; }
  },
  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },
  getBase() { return (this.get().n8nUrl || '').replace(/\/$/, ''); },
  getToken() { return this.get().token || ''; },
  isConfigured() { return !!this.getBase(); }
};

// ── ENDPOINTS ────────────────────────────────────
const ENDPOINTS = {
  canales:        { listar: '/webhook/canales/listar',        crear: '/webhook/canales/crear',        actualizar: '/webhook/canales/actualizar',        eliminar: '/webhook/canales/eliminar' },
  destinatarios:  { listar: '/webhook/destinatarios/listar',  crear: '/webhook/destinatarios/crear',  actualizar: '/webhook/destinatarios/actualizar',  eliminar: '/webhook/destinatarios/eliminar' },
  procesos:       { listar: '/webhook/procesos/listar',       crear: '/webhook/procesos/crear',       actualizar: '/webhook/procesos/actualizar',       eliminar: '/webhook/procesos/eliminar' },
  asignaciones:   { listar: '/webhook/asignaciones/listar',   crear: '/webhook/asignaciones/crear',   actualizar: '/webhook/asignaciones/actualizar',  eliminar: '/webhook/asignaciones/eliminar' },
  cola:           { listar: '/webhook/cola/listar' },
};

// ── API ──────────────────────────────────────────
const API = {
  async call(path, method = 'GET', body = null) {
    const base = Config.getBase();
    if (!base) throw new Error('URL de n8n no configurada');
    const token = Config.getToken();
    const headers = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': '1',
      'User-Agent': 'AlertManagerApp/1.0'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    const res = await fetch("/api" + path, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  get(path)        { return this.call(path, 'GET'); },
  post(path, data) { return this.call(path, 'POST', data); },
  put(path, data)  { return this.call(path, 'PUT', data); },
};

// ── TOAST ────────────────────────────────────────
const Toast = {
  _t: null,
  show(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(this._t);
    this._t = setTimeout(() => { el.className = 'toast'; }, 3000);
  },
  ok(msg)  { this.show('✓ ' + msg, 'success'); },
  err(msg) { this.show('✗ ' + msg, 'error'); },
};

// ── MODAL ────────────────────────────────────────
const Modal = {
  _cb: null,
  open(title, bodyHTML, saveCb) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-save').onclick = saveCb;
    document.getElementById('modal-overlay').classList.add('open');
    this._cb = saveCb;
    setTimeout(() => {
      const first = document.querySelector('#modal-body input, #modal-body select');
      if (first) first.focus();
    }, 50);
  },
  close() { document.getElementById('modal-overlay').classList.remove('open'); },
  closeOnOverlay(e) { if (e.target === document.getElementById('modal-overlay')) this.close(); }
};

// ── LOCAL STORE (demo / fallback) ─────────────────
const Store = {
  _data: {
    canales: [
      { id: 1, codigo: 'EMAIL',    nombre: 'Correo electrónico', activo: 1 },
      { id: 2, codigo: 'WHATSAPP', nombre: 'WhatsApp Business',  activo: 1 },
      { id: 3, codigo: 'TELEGRAM', nombre: 'Telegram Bot',       activo: 0 },
    ],
    destinatarios: [
      { id: 1, nombre: 'Carlos Mendoza', email: 'carlos@empresa.com', whatsapp: '+51999111222', telegram: '@carlos_m', activo: 1 },
      { id: 2, nombre: 'Ana Torres',     email: 'ana@empresa.com',    whatsapp: '+51999333444', telegram: '',           activo: 1 },
      { id: 3, nombre: 'Luis García',    email: 'luis@empresa.com',   whatsapp: '',             telegram: '',           activo: 0 },
    ],
    procesos: [
      { id: 1, codigo: 'FACTORING_VENCIMIENTO', nombre: 'Alertas de vencimiento',  descripcion: 'Notifica cuando una factura está por vencer', activo: 1 },
      { id: 2, codigo: 'SOLICITUD_APROBADA',    nombre: 'Solicitud aprobada',      descripcion: 'Notifica aprobación de solicitudes',          activo: 1 },
      { id: 3, codigo: 'PAGO_RECIBIDO',         nombre: 'Pago recibido',           descripcion: 'Confirma recepción de pagos',                 activo: 1 },
    ],
    asignaciones: [
      { id: 1, proceso_id: 1, dest_id: 1, canal_id: 2, activo: 1 },
      { id: 2, proceso_id: 1, dest_id: 2, canal_id: 1, activo: 1 },
      { id: 3, proceso_id: 2, dest_id: 1, canal_id: 1, activo: 1 },
      { id: 4, proceso_id: 2, dest_id: 2, canal_id: 2, activo: 0 },
    ],
    cola: [
      { id: 101, proceso_id: 1, dest_id: 1, canal_id: 2, intentos: 0, max_intentos: 3, enviado: 0, fecha_creacion: '2026-04-23 10:05' },
      { id: 102, proceso_id: 1, dest_id: 2, canal_id: 1, intentos: 1, max_intentos: 3, enviado: 0, fecha_creacion: '2026-04-23 10:05' },
      { id: 103, proceso_id: 2, dest_id: 1, canal_id: 1, intentos: 3, max_intentos: 3, enviado: 0, fecha_creacion: '2026-04-23 09:00' },
      { id: 104, proceso_id: 3, dest_id: 2, canal_id: 2, intentos: 0, max_intentos: 3, enviado: 1, fecha_creacion: '2026-04-23 08:30' },
    ],
  },
  get(entity) { return [...(this._data[entity] || [])]; },
  nextId(entity) { const items = this._data[entity]; return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1; },
  add(entity, item) { item.id = this.nextId(entity); this._data[entity].push(item); return item; },
  update(entity, id, changes) {
    const idx = this._data[entity].findIndex(i => i.id === id);
    if (idx !== -1) Object.assign(this._data[entity][idx], changes);
    return this._data[entity][idx];
  },
  remove(entity, id) { this._data[entity] = this._data[entity].filter(i => i.id !== id); }
};

// ── HELPERS ──────────────────────────────────────
const H = {
  badge(type, label, dot = true) {
    const dots = dot ? `<span class="dot dot-${type}"></span>` : '';
    return `<span class="badge badge-${type}">${dots}${label}</span>`;
  },
  estado(activo) { return activo ? H.badge('green', 'Activo') : H.badge('gray', 'Inactivo', false); },
  canal(id) { return Store.get('canales').find(c => c.id === id); },
  dest(id) { return Store.get('destinatarios').find(d => d.id === id); },
  proceso(id) { return Store.get('procesos').find(p => p.id === id); },
  initials(name) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); },
  avatar(name) { return `<div class="avatar">${H.initials(name)}</div>`; },
  canalBadge(id) {
    const c = H.canal(id);
    return c ? H.badge('blue', c.codigo, false) : '—';
  },
  optionsFrom(entity, valKey, labelKey) {
    return Store.get(entity).map(i => `<option value="${i[valKey]}">${i[labelKey]}</option>`).join('');
  },
  empty(msg = 'No hay registros') {
    return `<tr><td colspan="10"><div class="empty"><div class="empty-icon">○</div>${msg}</div></td></tr>`;
  }
};

// ── SECTIONS ─────────────────────────────────────
const Sections = {

  // ── DASHBOARD ──────────────────────────────────
  dashboard() {
    const cola = Store.get('cola');
    const pending = cola.filter(c => !c.enviado).length;
    const errors  = cola.filter(c => !c.enviado && c.intentos >= c.max_intentos).length;
    const sent    = cola.filter(c => c.enviado).length;
    const procs   = Store.get('procesos').filter(p => p.activo).length;

    const recentCola = cola.slice(0, 5).map(c => {
      const p = H.proceso(c.proceso_id);
      const canal = H.canal(c.canal_id);
      const badge = c.enviado ? H.badge('green','Enviado') : c.intentos >= c.max_intentos ? H.badge('red','Error') : H.badge('amber','Pendiente');
      return `<tr>
        <td style="font-family:var(--mono);font-size:11px;color:var(--text-3)">#${c.id}</td>
        <td><code>${p ? p.codigo : '—'}</code></td>
        <td>${canal ? H.badge('blue', canal.codigo, false) : '—'}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('') || H.empty();

    const canalesRows = Store.get('canales').map(c => `
      <tr>
        <td>${c.nombre}</td>
        <td><code>${c.codigo}</code></td>
        <td>${H.estado(c.activo)}</td>
      </tr>`).join('');

    return `
      <div class="metrics">
        <div class="metric-card warn">
          <div class="metric-label">Pendientes en cola</div>
          <div class="metric-value">${pending}</div>
          <div class="metric-sub">esperando envío</div>
        </div>
        <div class="metric-card success">
          <div class="metric-label">Enviadas hoy</div>
          <div class="metric-value">${sent + 133}</div>
          <div class="metric-sub">exitosas</div>
        </div>
        <div class="metric-card danger">
          <div class="metric-label">Con error</div>
          <div class="metric-value">${errors}</div>
          <div class="metric-sub">max intentos alcanzados</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Procesos activos</div>
          <div class="metric-value">${procs}</div>
          <div class="metric-sub">configurados</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><span class="card-title">Cola reciente</span></div>
          <table><thead><tr><th>ID</th><th>Proceso</th><th>Canal</th><th>Estado</th></tr></thead>
          <tbody>${recentCola}</tbody></table>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Canales configurados</span></div>
          <table><thead><tr><th>Nombre</th><th>Código</th><th>Estado</th></tr></thead>
          <tbody>${canalesRows}</tbody></table>
        </div>
      </div>`;
  },

  // ── CANALES ────────────────────────────────────
  canales() {
    const rows = Store.get('canales').map(c => `
      <tr>
        <td style="font-family:var(--mono);font-size:11px;color:var(--text-3)">#${c.id}</td>
        <td><code>${c.codigo}</code></td>
        <td>${c.nombre}</td>
        <td>${H.estado(c.activo)}</td>
        <td><div class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="Canales.edit(${c.id})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="Canales.toggle(${c.id})">${c.activo ? 'Desactivar' : 'Activar'}</button>
        </div></td>
      </tr>`).join('') || H.empty('No hay canales creados');
    return `<div class="card">
      <table><thead><tr><th>ID</th><th>Código</th><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  },

  // ── DESTINATARIOS ──────────────────────────────
  destinatarios() {
    const rows = Store.get('destinatarios').map(d => `
      <tr>
        <td><div class="avatar-row">${H.avatar(d.nombre)}<span>${d.nombre}</span></div></td>
        <td style="font-size:12px">${d.email || '—'}</td>
        <td style="font-size:12px;font-family:var(--mono)">${d.whatsapp || '—'}</td>
        <td style="font-size:12px">${d.telegram || '—'}</td>
        <td>${H.estado(d.activo)}</td>
        <td><div class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="Destinatarios.edit(${d.id})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="Destinatarios.toggle(${d.id})">${d.activo ? 'Desactivar' : 'Activar'}</button>
        </div></td>
      </tr>`).join('') || H.empty('No hay destinatarios creados');
    return `<div class="card">
      <table><thead><tr><th>Nombre</th><th>Email</th><th>WhatsApp</th><th>Telegram</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  },

  // ── PROCESOS ───────────────────────────────────
  procesos() {
    const rows = Store.get('procesos').map(p => `
      <tr>
        <td><code>${p.codigo}</code></td>
        <td style="font-weight:500">${p.nombre}</td>
        <td style="font-size:12px;color:var(--text-2)">${p.descripcion || '—'}</td>
        <td>${H.estado(p.activo)}</td>
        <td><div class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="Procesos.edit(${p.id})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="Procesos.toggle(${p.id})">${p.activo ? 'Desactivar' : 'Activar'}</button>
        </div></td>
      </tr>`).join('') || H.empty('No hay procesos creados');
    return `<div class="card">
      <table><thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  },

  // ── ASIGNACIONES ───────────────────────────────
  _procTab: 0,
  asignaciones() {
    const procs = Store.get('procesos');
    if (!procs.length) return `<div class="info-banner">⚠ Primero debes crear al menos un proceso.</div>`;
    if (this._procTab >= procs.length) this._procTab = 0;
    const proc = procs[this._procTab];
    const asigs = Store.get('asignaciones').filter(a => a.proceso_id === proc.id);

    const tabs = procs.map((p, i) =>
      `<div class="tab ${i === this._procTab ? 'active' : ''}" onclick="Sections._procTab=${i};App.render('asignaciones')">${p.nombre}</div>`
    ).join('');

    const rows = asigs.map(a => {
      const d = H.dest(a.dest_id);
      const c = H.canal(a.canal_id);
      return `<tr>
        <td><div class="avatar-row">${d ? H.avatar(d.nombre) : ''}<span>${d ? d.nombre : '—'}</span></div></td>
        <td>${c ? H.badge('blue', c.codigo, false) : '—'}</td>
        <td>${H.estado(a.activo)}</td>
        <td><div class="td-actions">
          <button class="btn btn-danger btn-sm" onclick="Asignaciones.toggle(${a.id})">${a.activo ? 'Desactivar' : 'Activar'}</button>
          <button class="btn btn-ghost btn-sm" onclick="Asignaciones.remove(${a.id})">Quitar</button>
        </div></td>
      </tr>`;
    }).join('') || H.empty('Sin asignaciones para este proceso');

    return `
      <div class="info-banner">ℹ Define qué destinatario recibe notificaciones de cada proceso y por qué canal.</div>
      <div class="card">
        <div class="tab-bar">${tabs}</div>
        <table><thead><tr><th>Destinatario</th><th>Canal</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>`;
  },

  // ── COLA ───────────────────────────────────────
  cola() {
    const rows = Store.get('cola').map(c => {
      const p = H.proceso(c.proceso_id);
      const d = H.dest(c.dest_id);
      const canal = H.canal(c.canal_id);
      const badge = c.enviado
        ? H.badge('green', 'Enviado')
        : c.intentos >= c.max_intentos
          ? H.badge('red', 'Error — max intentos')
          : H.badge('amber', 'Pendiente');
      return `<tr>
        <td style="font-family:var(--mono);font-size:11px;color:var(--text-3)">#${c.id}</td>
        <td><code>${p ? p.codigo : '—'}</code></td>
        <td>${d ? d.nombre : '—'}</td>
        <td>${canal ? H.badge('blue', canal.codigo, false) : '—'}</td>
        <td style="text-align:center">${c.intentos}/${c.max_intentos}</td>
        <td>${badge}</td>
        <td style="font-size:12px;color:var(--text-3)">${c.fecha_creacion}</td>
      </tr>`;
    }).join('') || H.empty('Cola vacía');
    return `<div class="card">
      <table><thead><tr><th>ID</th><th>Proceso</th><th>Destinatario</th><th>Canal</th><th>Intentos</th><th>Estado</th><th>Fecha</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  },

  // ── CONFIGURACION ──────────────────────────────
  configuracion() {
    const cfg = Config.get();
    const base = cfg.n8nUrl || '';
    const allEndpoints = [
      { mod: 'Canales',       method: 'GET',  path: ENDPOINTS.canales.listar },
      { mod: 'Canales',       method: 'POST', path: ENDPOINTS.canales.crear },
      { mod: 'Canales',       method: 'PUT',  path: ENDPOINTS.canales.actualizar },
      { mod: 'Destinatarios', method: 'GET',  path: ENDPOINTS.destinatarios.listar },
      { mod: 'Destinatarios', method: 'POST', path: ENDPOINTS.destinatarios.crear },
      { mod: 'Destinatarios', method: 'PUT',  path: ENDPOINTS.destinatarios.actualizar },
      { mod: 'Procesos',      method: 'GET',  path: ENDPOINTS.procesos.listar },
      { mod: 'Procesos',      method: 'POST', path: ENDPOINTS.procesos.crear },
      { mod: 'Procesos',      method: 'PUT',  path: ENDPOINTS.procesos.actualizar },
      { mod: 'Asignaciones',  method: 'GET',  path: ENDPOINTS.asignaciones.listar },
      { mod: 'Asignaciones',  method: 'POST', path: ENDPOINTS.asignaciones.crear },
      { mod: 'Asignaciones',  method: 'PUT',  path: ENDPOINTS.asignaciones.actualizar },
      { mod: 'Cola',          method: 'GET',  path: ENDPOINTS.cola.listar },
    ];
    const epRows = allEndpoints.map(e =>
      `<tr>
        <td style="font-size:12px;color:var(--text-2)">${e.mod}</td>
        <td><span class="endpoint-method method-${e.method.toLowerCase()}">${e.method}</span></td>
        <td class="api-url-display">${base}${e.path}</td>
      </tr>`).join('');

    return `
      <div class="info-banner">ℹ Ingresa la URL de tu instancia n8n. La app usará webhooks como backend.</div>
      <div class="card" style="margin-bottom:16px;padding:20px">
        <div class="form-group">
          <label class="form-label">URL base de tu n8n</label>
          <input class="form-input" id="cfg-url" type="url" placeholder="https://n8n.tudominio.com" value="${base}">
          <div class="form-hint">Ejemplo: https://n8n.miempresa.com — sin barra al final</div>
        </div>
        <div class="form-group">
          <label class="form-label">Token de autenticación (opcional)</label>
          <input class="form-input" id="cfg-token" type="password" placeholder="Bearer token o API Key" value="${cfg.token || ''}">
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-primary" onclick="Configuracion.save()">Guardar y conectar</button>
          <button class="btn btn-ghost" onclick="Configuracion.test()">Probar conexión</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Endpoints a crear en n8n (Webhook nodes)</span></div>
        <table><thead><tr><th>Módulo</th><th>Método</th><th>URL completa</th></tr></thead>
        <tbody>${epRows}</tbody></table>
      </div>`;
  }
};

// ── CANALES CRUD ─────────────────────────────────
const Canales = {
  formHTML(c = {}) {
    return `
      <div class="form-group">
        <label class="form-label">Código único</label>
        <input class="form-input" id="f-codigo" placeholder="EMAIL, WHATSAPP, TELEGRAM..." value="${c.codigo || ''}" ${c.id ? 'disabled' : ''} style="text-transform:uppercase">
        <div class="form-hint">Inmutable una vez creado. Ej: WHATSAPP</div>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre descriptivo</label>
        <input class="form-input" id="f-nombre" placeholder="WhatsApp Business" value="${c.nombre || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Estado</label>
        <select class="form-select" id="f-activo">
          <option value="1" ${c.activo !== 0 ? 'selected' : ''}>Activo</option>
          <option value="0" ${c.activo === 0 ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>`;
  },
  new() {
    Modal.open('Nuevo canal', this.formHTML(), () => this._save(null));
  },
  edit(id) {
    const c = Store.get('canales').find(x => x.id === id);
    Modal.open('Editar canal', this.formHTML(c), () => this._save(id));
  },
  async _save(id) {
    const codigo = document.getElementById('f-codigo').value.toUpperCase().trim();
    const nombre = document.getElementById('f-nombre').value.trim();
    const activo = parseInt(document.getElementById('f-activo').value);
    if (!codigo || !nombre) return Toast.err('Completa todos los campos');
    const data = { codigo, nombre, activo };
    try {
      if (Config.isConfigured()) {
        if (id) await API.put(ENDPOINTS.canales.actualizar, { id, ...data });
        else     await API.post(ENDPOINTS.canales.crear, data);
      }
      if (id) Store.update('canales', id, data);
      else    Store.add('canales', data);
      Modal.close();
      App.render('canales');
      Toast.ok(id ? 'Canal actualizado' : 'Canal creado');
    } catch(e) { Toast.err('Error: ' + e.message); }
  },
  toggle(id) {
    const c = Store.get('canales').find(x => x.id === id);
    Store.update('canales', id, { activo: c.activo ? 0 : 1 });
    App.render('canales');
    Toast.ok('Estado actualizado');
  }
};

// ── DESTINATARIOS CRUD ───────────────────────────
const Destinatarios = {
  formHTML(d = {}) {
    return `
      <div class="form-group">
        <label class="form-label">Nombre completo</label>
        <input class="form-input" id="f-nombre" placeholder="Juan Pérez" value="${d.nombre || ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="f-email" type="email" placeholder="juan@empresa.com" value="${d.email || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">WhatsApp</label>
          <input class="form-input" id="f-wa" placeholder="+51999999999" value="${d.whatsapp || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Telegram ID</label>
          <input class="form-input" id="f-tg" placeholder="@usuario o chat_id" value="${d.telegram || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-select" id="f-activo">
            <option value="1" ${d.activo !== 0 ? 'selected' : ''}>Activo</option>
            <option value="0" ${d.activo === 0 ? 'selected' : ''}>Inactivo</option>
          </select>
        </div>
      </div>`;
  },
  new() { Modal.open('Nuevo destinatario', this.formHTML(), () => this._save(null)); },
  edit(id) {
    const d = Store.get('destinatarios').find(x => x.id === id);
    Modal.open('Editar destinatario', this.formHTML(d), () => this._save(id));
  },
  async _save(id) {
    const nombre   = document.getElementById('f-nombre').value.trim();
    const email    = document.getElementById('f-email').value.trim();
    const whatsapp = document.getElementById('f-wa').value.trim();
    const telegram = document.getElementById('f-tg').value.trim();
    const activo   = parseInt(document.getElementById('f-activo').value);
    if (!nombre) return Toast.err('El nombre es obligatorio');
    const data = { nombre, email, whatsapp, telegram, activo };
    try {
      if (Config.isConfigured()) {
        if (id) await API.put(ENDPOINTS.destinatarios.actualizar, { id, ...data });
        else     await API.post(ENDPOINTS.destinatarios.crear, data);
      }
      if (id) Store.update('destinatarios', id, data);
      else    Store.add('destinatarios', data);
      Modal.close();
      App.render('destinatarios');
      Toast.ok(id ? 'Destinatario actualizado' : 'Destinatario creado');
    } catch(e) { Toast.err('Error: ' + e.message); }
  },
  toggle(id) {
    const d = Store.get('destinatarios').find(x => x.id === id);
    Store.update('destinatarios', id, { activo: d.activo ? 0 : 1 });
    App.render('destinatarios');
    Toast.ok('Estado actualizado');
  }
};

// ── PROCESOS CRUD ────────────────────────────────
const Procesos = {
  formHTML(p = {}) {
    return `
      <div class="form-group">
        <label class="form-label">Código único (inmutable)</label>
        <input class="form-input" id="f-codigo" placeholder="FACTORING_VENCIMIENTO" value="${p.codigo || ''}" ${p.id ? 'disabled' : ''} style="text-transform:uppercase">
        <div class="form-hint">Este código se usa en n8n para identificar el proceso. No cambia.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre descriptivo</label>
        <input class="form-input" id="f-nombre" placeholder="Alertas de vencimiento de factoring" value="${p.nombre || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <textarea class="form-textarea" id="f-desc" placeholder="Describe cuándo y por qué se genera esta alerta...">${p.descripcion || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Estado</label>
        <select class="form-select" id="f-activo">
          <option value="1" ${p.activo !== 0 ? 'selected' : ''}>Activo</option>
          <option value="0" ${p.activo === 0 ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>`;
  },
  new() { Modal.open('Nuevo proceso', this.formHTML(), () => this._save(null)); },
  edit(id) {
    const p = Store.get('procesos').find(x => x.id === id);
    Modal.open('Editar proceso', this.formHTML(p), () => this._save(id));
  },
  async _save(id) {
    const codigo     = document.getElementById('f-codigo').value.toUpperCase().trim();
    const nombre     = document.getElementById('f-nombre').value.trim();
    const descripcion = document.getElementById('f-desc').value.trim();
    const activo     = parseInt(document.getElementById('f-activo').value);
    if (!codigo || !nombre) return Toast.err('Código y nombre son obligatorios');
    const data = { codigo, nombre, descripcion, activo };
    try {
      if (Config.isConfigured()) {
        if (id) await API.put(ENDPOINTS.procesos.actualizar, { id, ...data });
        else     await API.post(ENDPOINTS.procesos.crear, data);
      }
      if (id) Store.update('procesos', id, data);
      else    Store.add('procesos', data);
      Modal.close();
      App.render('procesos');
      Toast.ok(id ? 'Proceso actualizado' : 'Proceso creado');
    } catch(e) { Toast.err('Error: ' + e.message); }
  },
  toggle(id) {
    const p = Store.get('procesos').find(x => x.id === id);
    Store.update('procesos', id, { activo: p.activo ? 0 : 1 });
    App.render('procesos');
    Toast.ok('Estado actualizado');
  }
};

// ── ASIGNACIONES CRUD ────────────────────────────
const Asignaciones = {
  formHTML() {
    return `
      <div class="form-group">
        <label class="form-label">Proceso</label>
        <select class="form-select" id="f-proceso">${H.optionsFrom('procesos','id','nombre')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Destinatario</label>
        <select class="form-select" id="f-dest">${H.optionsFrom('destinatarios','id','nombre')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Canal</label>
        <select class="form-select" id="f-canal">${H.optionsFrom('canales','id','nombre')}</select>
      </div>`;
  },
  new() { Modal.open('Nueva asignación', this.formHTML(), () => this._save()); },
  async _save() {
    const proceso_id = parseInt(document.getElementById('f-proceso').value);
    const dest_id    = parseInt(document.getElementById('f-dest').value);
    const canal_id   = parseInt(document.getElementById('f-canal').value);
    const data = { proceso_id, dest_id, canal_id, activo: 1 };
    const exists = Store.get('asignaciones').find(a =>
      a.proceso_id === proceso_id && a.dest_id === dest_id && a.canal_id === canal_id);
    if (exists) return Toast.err('Esta asignación ya existe');
    try {
      if (Config.isConfigured()) await API.post(ENDPOINTS.asignaciones.crear, data);
      Store.add('asignaciones', data);
      Modal.close();
      App.render('asignaciones');
      Toast.ok('Asignación creada');
    } catch(e) { Toast.err('Error: ' + e.message); }
  },
  toggle(id) {
    const a = Store.get('asignaciones').find(x => x.id === id);
    Store.update('asignaciones', id, { activo: a.activo ? 0 : 1 });
    App.render('asignaciones');
    Toast.ok('Estado actualizado');
  },
  remove(id) {
    if (!confirm('¿Quitar esta asignación?')) return;
    Store.remove('asignaciones', id);
    App.render('asignaciones');
    Toast.ok('Asignación eliminada');
  }
};

// ── CONFIGURACION ────────────────────────────────
const Configuracion = {
  save() {
    const url   = document.getElementById('cfg-url').value.trim().replace(/\/$/, '');
    const token = document.getElementById('cfg-token').value.trim();
    if (!url) return Toast.err('Ingresa la URL de n8n');
    Config.save({ n8nUrl: url, token });
    App.updateConnectionStatus(true);
    Toast.ok('Configuración guardada');
    App.render('configuracion');
  },
  async test() {
    if (!Config.isConfigured()) return Toast.err('Primero guarda la URL de n8n');
    try {
      await API.get(ENDPOINTS.canales.listar);
      Toast.ok('Conexión exitosa con n8n');
      App.updateConnectionStatus(true);
    } catch(e) {
      Toast.err('Sin conexión: ' + e.message);
      App.updateConnectionStatus(false);
    }
  }
};

// ── TOPBAR ACTIONS ───────────────────────────────
const TopbarActions = {
  canales:        `<button class="btn btn-primary" onclick="Canales.new()">+ Nuevo canal</button>`,
  destinatarios:  `<button class="btn btn-primary" onclick="Destinatarios.new()">+ Nuevo destinatario</button>`,
  procesos:       `<button class="btn btn-primary" onclick="Procesos.new()">+ Nuevo proceso</button>`,
  asignaciones:   `<button class="btn btn-primary" onclick="Asignaciones.new()">+ Nueva asignación</button>`,
};

const PageTitles = {
  dashboard: 'Dashboard', canales: 'Canales', destinatarios: 'Destinatarios',
  procesos: 'Procesos', asignaciones: 'Asignaciones', cola: 'Cola de envíos', configuracion: 'API / n8n'
};

// ── APP ──────────────────────────────────────────
const App = {
  current: 'dashboard',

  init() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        const sec = el.dataset.section;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        el.classList.add('active');
        this.render(sec);
      });
    });
    this.updateConnectionStatus(Config.isConfigured());
    this.render('dashboard');
  },

  render(section) {
    this.current = section;
    document.getElementById('page-title').textContent = PageTitles[section] || section;
    document.getElementById('topbar-actions').innerHTML = TopbarActions[section] || '';
    document.getElementById('content').innerHTML = Sections[section] ? Sections[section]() : '<div class="empty">Sección no encontrada</div>';
  },

  refresh() {
    this.render(this.current);
    Toast.ok('Actualizado');
  },

  updateConnectionStatus(ok) {
    const dot  = document.querySelector('.status-dot');
    const text = document.getElementById('conn-status');
    if (ok && Config.isConfigured()) {
      dot.classList.add('connected');
      text.textContent = 'Conectado a n8n';
    } else {
      dot.classList.remove('connected');
      text.textContent = 'Sin conectar';
    }
  }
};

// ── BOOT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
