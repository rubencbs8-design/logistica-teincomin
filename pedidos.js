/* ============================================================
   PEDIDOS: jefes de guardia y Seguridad piden; va directo a logística, que entrega en almacén
   (firma ahí) o despacha al jefe (el trabajador firma luego en su celular).
   (El estado POR APROBAR y su revisión quedan solo para pedidos antiguos.)
   Usa el estado y utilidades de app.js (S, M, $, openModal, busy, Firma, pedirFirmaCelular...).
   ============================================================ */
const PED = { activos:[], lista:[], filtro:'ACTIVOS' };
const PED_ESTADOS = [['ACTIVOS','En curso'], ['PENDIENTE','Por atender'], ['POR FIRMAR','Por firmar'],
  ['ENTREGADO','Entregados'], ['RECHAZADO','Rechazados'], ['ANULADO','Anulados'], ['TODOS','Todos (60 días)']];
const ESTADO_TXT = { 'POR APROBAR':'Por aprobar (Seguridad)', 'PENDIENTE':'Por atender (logística)', 'POR FIRMAR':'Despachado · falta firma',
  'ENTREGADO':'Entregado', 'RECHAZADO':'Rechazado', 'ANULADO':'Anulado' };

function cantDe(it){ return it.aprobada==null ? it.pedida : it.aprobada; }
function conEppPed(p){ return p.items.some(it=> it.categoria==='EPPS' && cantDe(it)>0); }
function esMio(p){ return p.usuario === String((Api.auth()||{}).u||'').toUpperCase(); }

// Qué puede hacer este usuario con el pedido. principal = le toca a él (cuenta en el contador del menú).
function accionesPedido(p){
  const r = rol(), b = [];
  if(p.estado==='POR APROBAR' && ['ADMIN','SEGURIDAD'].includes(r)) b.push(['aprobar','Revisar y aprobar','primary']);
  if(p.estado==='PENDIENTE' && ['ADMIN','LOGISTICO'].includes(r)) b.push(['atender','Atender','primary']);
  if(p.estado==='POR FIRMAR' && (esMio(p) || ['ADMIN','LOGISTICO','SEGURIDAD'].includes(r))) b.push(['firmar','Tomar firma del trabajador','primary']);
  const principal = b.length > 0;
  if(['POR APROBAR','PENDIENTE'].includes(p.estado)){
    if(esMio(p)) b.push(['anular','Anular','ghost danger']);
    else if(['ADMIN','LOGISTICO'].includes(r) || (r==='SEGURIDAD' && p.estado==='POR APROBAR')) b.push(['rechazar','Rechazar','ghost danger']);
  }
  return { principal, botones:b };
}

/* ---------- crear (desde la pantalla Nuevo pedido) ---------- */
function enviarPedido(cab){
  const pedido = { fecha:cab.fecha, labor:cab.labor, guardia:$('mGuardia').value, dni:cab.dni, obs:cab.obs,
    items: M.lineas.map(l=> ({ codigo:l.c, cantidad:num(l.cant) })), client_id: Date.now().toString(36) + Math.random().toString(36).slice(2,8) };
  busy($('mRegistrar'), async ()=>{
    let j;
    try{ j = await Api.call('pedido_crear', { pedido }); }
    catch(e){
      Cola.add(pedido, 'pedido_crear'); pintarCola(); limpiarVale();
      openModal(`<div class="ok-icon">📶</div><h3 style="text-align:center">Sin conexión: pedido guardado en este equipo</h3>
        <p class="muted" style="text-align:center">Se enviará solo cuando vuelva la señal.</p><div class="modal-actions"><button class="primary" onclick="closeModal()">Entendido</button></div>`);
      return;
    }
    if(!j.ok){ mostrarError(j.error); return; }
    limpiarVale();
    openModal(`<div class="ok-icon">✅</div><h3 style="text-align:center">Pedido enviado</h3><div class="vale-num">${esc(j.pedido)}</div>
      <p class="muted" style="text-align:center">Ya está en la bandeja de logística.</p>
      <div class="modal-actions"><button class="ghost" id="okVerPed">Ver mis pedidos</button><button class="primary" onclick="closeModal()">Nuevo pedido</button></div>`);
    $('okVerPed').addEventListener('click', ()=>{ closeModal(); switchView('pedidos'); });
    cargarBadgePedidos();
  });
}

/* ---------- bandeja ---------- */
function pintarEstadosPed(){
  $('pdEstados').innerHTML = PED_ESTADOS.map(([k,t])=> `<button class="chip ${PED.filtro===k?'active':''}" data-k="${k}">${t}</button>`).join('');
  $('pdEstados').querySelectorAll('.chip').forEach(b=> b.addEventListener('click', ()=>{ PED.filtro = b.dataset.k; cargarPedidos(); }));
}
async function cargarPedidos(){
  pintarEstadosPed();
  $('pdPie').textContent = 'Cargando…';
  const f = PED.filtro;
  const d = new Date(); d.setDate(d.getDate()-60);
  const filtro = f==='ACTIVOS' ? { activos:true } : f==='TODOS' ? { desde:d.toISOString().slice(0,10) } : { estado:f };
  try{
    const j = await Api.call('pedidos', { filtro });
    if(!j.ok) throw new Error(j.error);
    PED.lista = j.pedidos;
    if(f==='ACTIVOS') PED.activos = j.pedidos;
    pintarPedidos();
  }catch(e){ $('pdPie').textContent = 'No se pudo cargar: ' + e.message; }
}
function pintarPedidos(){
  const q = $('pdBuscar').value.trim();
  const l = PED.lista.filter(p=> !q || matchWords([p.pedido,p.solicitante,p.area,p.trabajador,p.dni,p.labor,p.vale].concat(p.items.map(i=> i.descripcion)).join(' '), q));
  // Primero lo que le toca a este usuario.
  l.sort((a,b)=> (accionesPedido(b).principal - accionesPedido(a).principal) || (a.creado < b.creado ? 1 : -1));
  $('pdLista').innerHTML = l.map(p=>{
    const ac = accionesPedido(p);
    const items = p.items.map(it=>{
      const ap = it.aprobada!=null && it.aprobada!==it.pedida ? ` <span class="bajo">→ aprobado ${fmtNum(it.aprobada)}</span>` : '';
      const en = it.entregada!=null ? ` <span class="${it.entregada<cantDe(it)?'bajo':'ok-txt'}">· entregado ${fmtNum(it.entregada)}</span>` : '';
      return `<li><b>${fmtNum(it.pedida)} ${esc(it.um)}</b> ${esc(it.descripcion)}${ap}${en}</li>`;
    }).join('');
    const hist = [p.aprobado_por && `Aprobó ${esc(p.aprobado_por)} ${esc(String(p.aprobado_en).slice(0,16))}`,
      p.atendido_por && `${p.estado==='RECHAZADO'?'Rechazó':p.estado==='ANULADO'?'Anuló':'Atendió'} ${esc(p.atendido_por)} ${esc(String(p.atendido_en).slice(0,16))}`,
      p.vale && `Salida ${esc(p.vale)}${p.modo==='DESPACHO'?' (despachado al solicitante)':''}`, p.motivo && esc(p.motivo)].filter(Boolean).join(' · ');
    return `<div class="ped ${ac.principal?'ped-mia':''}">
      <div class="ped-top"><b>${esc(p.pedido)}</b><span class="pe pe-${p.estado.replace(/ /g,'-')}">${esc(ESTADO_TXT[p.estado]||p.estado)}</span>
        <span class="muted small">${fmtFecha(p.fecha)}${p.guardia?' · guardia '+esc(p.guardia):''}</span></div>
      <div class="ped-meta">${esc(p.solicitante)} <span class="muted">(${esc(p.area||'—')})</span>${p.trabajador?` · para <b>${esc(p.trabajador)}</b>`:''}${p.labor?` · ${esc(p.labor)}`:''}</div>
      <ul class="ped-items">${items}</ul>
      ${hist?`<div class="muted small">${hist}</div>`:''}
      ${ac.botones.length?`<div class="row-gap">${ac.botones.map(([k,t,c])=> `<button class="small ${c}" data-acc="${k}" data-p="${esc(p.pedido)}">${t}</button>`).join('')}</div>`:''}
    </div>`;
  }).join('') || `<div class="empty-row">${PED.filtro==='ACTIVOS' ? 'No hay pedidos en curso.' : 'No hay pedidos en este estado.'}</div>`;
  $('pdPie').textContent = l.length + ' pedido(s).';
  $('pdLista').querySelectorAll('[data-acc]').forEach(b=> b.addEventListener('click', ()=>{
    const p = PED.lista.find(x=> x.pedido===b.dataset.p);
    ({ aprobar:revisarPedido, atender:atenderPedido, firmar:firmarEnCampo, anular:rechazarPedido, rechazar:rechazarPedido }[b.dataset.acc])(p);
  }));
}
$('pdBuscar').addEventListener('input', pintarPedidos);
$('pdNuevo').addEventListener('click', ()=> switchView('mov','PEDIDO'));
async function trasAccion(msg){ closeModal(); toast(msg,'ok'); await cargarPedidos(); cargarBadgePedidos(); }

/* ---------- Seguridad: revisar y aprobar ---------- */
function revisarPedido(p){
  const filas = p.items.map(it=>{
    const prod = S.byCode[it.codigo] || {};
    const u = p.dni && it.categoria==='EPPS' ? S.ultEpp[p.dni+'|'+(prod.k||it.codigo)] : null;
    const prev = u ? `<div class="small ${u.r && u.r>todayYmd()?'bajo':'muted'}">Última: ${fmtFecha(u.f)}${u.r?' · renovar '+fmtFecha(u.r):''}</div>` : '';
    return `<tr><td>${esc(it.descripcion)}${prev}</td><td>${esc(it.um)}</td><td class="num">${fmtNum(it.pedida)}</td><td class="num">${fmtNum(prod.stock||0)}</td>
      <td class="num"><input data-c="${esc(it.codigo)}" value="${it.pedida}" inputmode="decimal"></td></tr>`;
  }).join('');
  openModal(`<h3>Revisar ${esc(p.pedido)}</h3>
    <div class="muted">${esc(p.solicitante)} (${esc(p.area)}) · para <b>${esc(p.trabajador||'—')}</b>${p.labor?' · '+esc(p.labor):''}</div>
    <div class="tbl-scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>Producto</th><th>UM</th><th class="num">Pedido</th><th class="num">Stock</th><th class="num">Aprobar</th></tr></thead>
    <tbody id="raFilas">${filas}</tbody></table></div>
    <div class="field" style="margin-top:10px"><label>Comentario (opcional)</label><input id="raObs" placeholder="Ej. se aprueba 1 par, el otro aún está vigente"></div>
    <div class="hint">Pon 0 en lo que no se aprueba.</div><div class="err" id="raErr"></div>
    <div class="modal-actions"><button class="ghost" onclick="closeModal()">Cerrar</button><button class="ghost danger" id="raRech">Rechazar</button><button class="primary" id="raOk">Aprobar</button></div>`);
  $('raRech').addEventListener('click', ()=> rechazarPedido(p));
  $('raOk').addEventListener('click', ()=> busy($('raOk'), async ()=>{
    const items = [...document.querySelectorAll('#raFilas input')].map(i=> ({ codigo:i.dataset.c, cantidad:num(i.value) }));
    if(items.some(i=> i.cantidad<0)) { $('raErr').textContent = 'Cantidad inválida'; return; }
    try{
      const j = await Api.call('pedido_aprobar', { pedido:p.pedido, items, obs:$('raObs').value });
      if(!j.ok){ $('raErr').textContent = j.error; return; }
      trasAccion('Pedido aprobado: pasa a logística');
    }catch(e){ $('raErr').textContent = 'Sin conexión'; }
  }));
}

/* ---------- rechazar / anular ---------- */
function rechazarPedido(p){
  const anula = esMio(p);
  openModal(`<h3>${anula?'Anular':'Rechazar'} ${esc(p.pedido)}</h3>
    <div class="field"><label>Motivo *</label><input id="rjMotivo" placeholder="${anula?'Ej. ya no se necesita':'Ej. EPP aún vigente / sin stock'}"></div><div class="err" id="rjErr"></div>
    <div class="modal-actions"><button class="ghost" onclick="closeModal()">Cancelar</button><button class="primary" id="rjOk">${anula?'Anular pedido':'Rechazar pedido'}</button></div>`);
  $('rjOk').addEventListener('click', ()=> busy($('rjOk'), async ()=>{
    const motivo = $('rjMotivo').value.trim(); if(!motivo){ $('rjErr').textContent = 'Indica el motivo'; return; }
    try{
      const j = await Api.call('pedido_rechazar', { pedido:p.pedido, motivo });
      if(!j.ok){ $('rjErr').textContent = j.error; return; }
      trasAccion(j.estado==='ANULADO' ? 'Pedido anulado' : 'Pedido rechazado');
    }catch(e){ $('rjErr').textContent = 'Sin conexión'; }
  }));
}

/* ---------- logística: atender ---------- */
const AT = { p:null, q:{}, firma:null };
function atenderPedido(p){
  AT.p = p; AT.firma = null; AT.q = {};
  p.items.forEach(it=>{ const st = Math.max((S.byCode[it.codigo]||{}).stock||0, 0); AT.q[it.codigo] = String(Math.min(cantDe(it), st)); });
  pintarAtender();
}
function pintarAtender(){
  const p = AT.p, epp = p.items.some(it=> it.categoria==='EPPS' && num(AT.q[it.codigo])>0);
  const filas = p.items.map(it=>{
    const st = (S.byCode[it.codigo]||{}).stock||0;
    return `<tr><td>${esc(it.descripcion)}</td><td>${esc(it.um)}</td><td class="num">${fmtNum(it.pedida)}</td><td class="num">${fmtNum(cantDe(it))}</td>
      <td class="num ${st<cantDe(it)?'cero':''}">${fmtNum(st)}</td><td class="num"><input data-c="${esc(it.codigo)}" value="${esc(AT.q[it.codigo])}" inputmode="decimal"></td></tr>`;
  }).join('');
  openModal(`<h3>Atender ${esc(p.pedido)}</h3>
    <div class="muted">${esc(p.solicitante)} (${esc(p.area)})${p.guardia?' · guardia '+esc(p.guardia):''} · para <b>${esc(p.trabajador||'—')}</b>${p.labor?' · '+esc(p.labor):''}</div>
    <div class="tbl-scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>Producto</th><th>UM</th><th class="num">Pedido</th><th class="num">Aprobado</th><th class="num">Stock</th><th class="num">Entregar</th></tr></thead>
    <tbody id="atFilas">${filas}</tbody></table></div>
    ${epp ? `<div class="firma-box">
      <div><b>Firma del trabajador</b> <span class="muted">(si entregas en almacén)</span><div class="hint ${AT.firma?'ok':''}">${AT.firma?'Firmado ✓':'Sin firma'}</div></div>
      ${AT.firma && AT.firma.png ? `<img class="firma-mini" src="${AT.firma.png}" alt="Firma">` : ''}
      <div class="firma-btns"><button class="primary-outline small" id="atCel">📱 Celular del almacén</button><button class="ghost small" id="atPC">🖊 Esta PC</button></div></div>` : ''}
    <div class="err" id="atErr"></div>
    <div class="modal-actions wrap">
      <button class="ghost" onclick="closeModal()">Cerrar</button>
      ${epp ? `<button class="ghost" id="atDesp" title="Lo lleva el jefe; el trabajador firma en el celular del jefe">🚚 Despachar al solicitante</button>` : ''}
      <button class="primary" id="atOk">${epp ? '✔ Entregar en almacén' : '✔ Entregar'}</button></div>`);
  document.querySelectorAll('#atFilas input').forEach(i=> i.addEventListener('input', ()=>{ AT.q[i.dataset.c] = i.value; AT.firma = null; }));
  if(epp){
    $('atPC').addEventListener('click', ()=>{ const e = validarAtender(); if(e){ $('atErr').textContent = e; return; }
      Firma.abrir(textoRecibe(), png=>{ AT.firma = { png }; pintarAtender(); }); });
    $('atCel').addEventListener('click', ()=>{
      const e = validarAtender(); if(e){ $('atErr').textContent = e; return; }
      const token = lsGet('log_estacion', ''); if(!token){ toast('Primero vincula el celular de firma'); closeModal(); switchView('celular'); return; }
      const per = S.byDni[p.dni] || { 'APELLIDOS Y NOMBRES':p.trabajador, DNI:p.dni, CARGO:p.cargo };
      pedirFirmaCelular(token, solicitudFirma(per, itemsAtender().map(it=> ({ d:(S.byCode[it.codigo]||{}).d||it.codigo, cant:it.cantidad, um:(S.byCode[it.codigo]||{}).um||'' }))),
        f=>{ AT.firma = f; pintarAtender(); }, pintarAtender);
    });
    $('atDesp').addEventListener('click', ()=> confirmarAtender('DESPACHO'));
  }
  $('atOk').addEventListener('click', ()=> confirmarAtender('ENTREGA'));
}
function itemsAtender(){ return AT.p.items.map(it=> ({ codigo:it.codigo, cantidad:num(AT.q[it.codigo]) })); }
function textoRecibe(){ return `${AT.p.trabajador} recibe: ` + itemsAtender().filter(i=> i.cantidad>0).map(i=> `${fmtNum(i.cantidad)} ${(S.byCode[i.codigo]||{}).um||''} ${(S.byCode[i.codigo]||{}).d||i.codigo}`).join(', '); }
function validarAtender(){
  const its = itemsAtender();
  if(its.some(i=> i.cantidad<0 || isNaN(i.cantidad))) return 'Cantidad inválida';
  if(!its.some(i=> i.cantidad>0)) return 'No hay nada que entregar: si no se atenderá, recházalo';
  for(const i of its){ const p = S.byCode[i.codigo]; if(p && i.cantidad > p.stock + 1e-9) return `Solo hay ${fmtNum(p.stock)} ${p.um} de ${p.d}`; }
  return '';
}
function confirmarAtender(modo){
  const e = validarAtender(); if(e){ $('atErr').textContent = e; return; }
  const epp = AT.p.items.some(it=> it.categoria==='EPPS' && num(AT.q[it.codigo])>0);
  if(modo==='ENTREGA' && epp && !AT.firma){ $('atErr').textContent = 'Falta la firma del trabajador. Si se lo lleva el jefe, usa "Despachar al solicitante".'; return; }
  const btn = $(modo==='DESPACHO' ? 'atDesp' : 'atOk');
  busy(btn, async ()=>{
    const body = { pedido:AT.p.pedido, modo, fecha:todayYmd(), items:itemsAtender(), client_id: Date.now().toString(36) + Math.random().toString(36).slice(2,8) };
    if(AT.firma){ if(AT.firma.id) body.firma_id = AT.firma.id; else body.firma = AT.firma.png; }
    try{
      const j = await Api.call('pedido_atender', body);
      if(!j.ok){ $('atErr').textContent = j.error; return; }
      await trasAccion(j.estado==='POR FIRMAR' ? `Despachado (${j.vale}): falta que el trabajador firme en el celular del solicitante` : `Entregado: salida ${j.vale}`);
      cargarDatos();
    }catch(err){ $('atErr').textContent = 'Sin conexión'; }
  });
}

/* ---------- firma en campo (celular del jefe) ---------- */
function firmarEnCampo(p){
  const txt = `${p.trabajador} recibe: ` + p.items.filter(it=> it.entregada>0).map(it=> `${fmtNum(it.entregada)} ${it.um} ${it.descripcion}`).join(', ');
  Firma.abrir(txt + '. ' + TEXTO_FIRMA, async png=>{
    toast('Guardando firma…');
    try{
      const j = await Api.call('pedido_firmar', { pedido:p.pedido, firma:png });
      if(!j.ok){ toast(j.error,'err'); return; }
      trasAccion('Firma guardada: entrega completa');
    }catch(e){ toast('Sin conexión: vuelve a intentarlo cuando tengas señal','err'); }
  });
}
