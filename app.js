/* ============================================================
   ESTADO Y UTILIDADES DE PANTALLA
   ============================================================ */
const $ = id => document.getElementById(id);
const S = { base:[], byCode:{}, personal:[], byDni:{}, labores:[], leyenda:{}, ultEpp:{}, empresa:{}, usuario:{}, cargado:false };
const GRUPOS = ['TODOS','ACEROS','EPPS','EQ ALIMAK','HERRAMIENTAS','JACKLEG','STOPER','OFICINA','SEGURIDAD','LUBRICANTE'];
function grupo(p){ return p.sub==='REP. JACKLEG' ? 'JACKLEG' : p.sub==='REP STOPPER' ? 'STOPER' : p.cat; }

let toastTimer;
function toast(msg, kind){
  const t = $('toast'); t.textContent = msg; t.className = 'toast show ' + (kind||'');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=> t.classList.remove('show'), 3800);
}
function openModal(html){ $('modalBox').innerHTML = html; $('modal').classList.add('open'); }
function closeModal(){ $('modal').classList.remove('open'); }
$('modal').addEventListener('mousedown', e=>{ if(e.target.id==='modal') closeModal(); });
async function busy(btn, fn){
  const txt = btn.textContent; btn.disabled = true; btn.textContent = 'Procesando…';
  try{ return await fn(); } finally { btn.disabled = false; btn.textContent = txt; }
}
function descargarExcel(filas, nombre){
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, nombre + ' ' + todayYmd() + '.xlsx');
}

// Autocompletar genérico: source(q) → [{label, sub, value}]
function autocomplete(input, list, source, onPick){
  let items = [], sel = -1;
  const draw = ()=>{
    list.innerHTML = items.map((it,i)=> `<div class="ac-item ${i===sel?'sel':''}" data-i="${i}"><span>${esc(it.label)}</span><small>${esc(it.sub||'')}</small></div>`).join('');
    list.classList.toggle('open', items.length>0);
    list.querySelectorAll('.ac-item').forEach(el=> el.addEventListener('mousedown', e=>{ e.preventDefault(); pick(+el.dataset.i); }));
  };
  const pick = i=>{ const it = items[i]; if(!it) return; items = []; draw(); onPick(it); };
  input.addEventListener('input', ()=>{ items = input.value.trim() ? source(input.value).slice(0,15) : []; sel = items.length?0:-1; draw(); });
  input.addEventListener('focus', ()=>{ if(input.value.trim()){ items = source(input.value).slice(0,15); sel = items.length?0:-1; draw(); } });
  input.addEventListener('blur', ()=> setTimeout(()=>{ items=[]; draw(); }, 150));
  input.addEventListener('keydown', e=>{
    if(!items.length) return;
    if(e.key==='ArrowDown'){ sel = Math.min(sel+1, items.length-1); draw(); e.preventDefault(); }
    else if(e.key==='ArrowUp'){ sel = Math.max(sel-1, 0); draw(); e.preventDefault(); }
    else if(e.key==='Enter'){ pick(sel<0?0:sel); e.preventDefault(); }
    else if(e.key==='Escape'){ items=[]; draw(); }
  });
}
function buscarPersonal(q, incluirCesados){
  return S.personal.filter(p=> (incluirCesados || p.ESTADO!=='CESADO') && matchWords(p.DNI+' '+p['APELLIDOS Y NOMBRES']+' '+p.CARGO, q))
    .map(p=> ({ label:p['APELLIDOS Y NOMBRES'], sub:(/^SIN-DNI/.test(p.DNI)?'SIN DNI':'DNI '+p.DNI)+' · '+p.CARGO, value:p.DNI }));
}

/* ============================================================
   INGRESO (usuario + PIN)
   ============================================================ */
function onAuthLost(){ Api.setAuth(null); $('app').classList.add('hidden'); $('login').classList.remove('hidden'); $('lgErr').textContent = 'La sesión ya no es válida. Ingresa de nuevo.'; }
$('lgCfg').addEventListener('click', ()=>{ $('lgCfgBox').classList.toggle('hidden'); $('lgUrl').value = Api.url(); });
$('lgPin').addEventListener('keydown', e=>{ if(e.key==='Enter') $('lgBtn').click(); });
$('lgBtn').addEventListener('click', ()=> busy($('lgBtn'), async ()=>{
  $('lgErr').textContent = '';
  if(!$('lgCfgBox').classList.contains('hidden') && $('lgUrl').value.trim()) Api.setUrl($('lgUrl').value);
  if(!Api.url()){ $('lgErr').textContent = 'Primero configura la URL del Apps Script.'; $('lgCfgBox').classList.remove('hidden'); return; }
  const u = $('lgUser').value.trim().toUpperCase(), p = $('lgPin').value.trim();
  if(!u || !p){ $('lgErr').textContent = 'Ingresa usuario y PIN.'; return; }
  try{
    const j = await Api.post({ action:'login', u, p });
    if(!j.ok){ $('lgErr').textContent = j.error || 'No se pudo ingresar.'; return; }
    Api.setAuth({ u, p, nombre:j.nombre, rol:j.rol }, $('lgRecordar').checked);
    $('lgPin').value = '';
    iniciarApp();
  }catch(e){ $('lgErr').textContent = 'No hay conexión con la hoja. Revisa internet o la URL.'; }
}));
$('btnSalir').addEventListener('click', ()=>{ Api.setAuth(null); location.reload(); });

// Menú según el rol: cada botón trae data-roles (sin el atributo = todos).
function rol(){ return (S.usuario && S.usuario.rol) || (Api.auth()||{}).rol || 'LECTURA'; }
function aplicarRol(){
  const r = rol();
  document.querySelectorAll('#nav [data-roles]').forEach(el=> el.style.display = el.dataset.roles.split(' ').includes(r) ? '' : 'none');
  $('whoami').innerHTML = `<b>${esc(S.usuario.nombre || (Api.auth()||{}).nombre || '')}</b><br>${esc(r)}${S.usuario.area?' · '+esc(S.usuario.area):''}`;
  $('pdNuevo').style.display = ['ADMIN','SEGURIDAD','SOLICITANTE'].includes(r) ? '' : 'none';
  $('celBadge').style.display = ['ADMIN','LOGISTICO'].includes(r) ? '' : 'none';
  $('eEntregar').textContent = ['ADMIN','LOGISTICO'].includes(r) ? '↗ Entregar EPP' : '＋ Pedir EPP';
  $('eEntregar').style.display = ['ADMIN','LOGISTICO','SEGURIDAD'].includes(r) ? '' : 'none';
}
function vistaInicial(){
  const r = rol();
  if(r==='SOLICITANTE') switchView('mov','PEDIDO');
  else if(r==='SEGURIDAD' || r==='LECTURA') switchView(r==='LECTURA' ? 'stock' : 'pedidos');
  else switchView('mov','SALIDA');
}
function iniciarApp(){
  $('login').classList.add('hidden'); $('app').classList.remove('hidden');
  aplicarRol();
  cargarDatos().then(()=>{ aplicarRol(); vistaInicial(); });
  Cola.flush().then(pintarCola);
  setInterval(()=> Cola.flush().then(pintarCola), 60000);
  setInterval(cargarBadgePedidos, 60000);
  pintarCelular();
}

/* ============================================================
   DATOS (catálogos + stock)
   ============================================================ */
async function cargarDatos(){
  $('lastSync').textContent = 'Actualizando…';
  try{
    const j = await Api.call('datos');
    if(!j.ok){ toast(j.error||'Error al leer la hoja','err'); $('lastSync').textContent = 'Error'; return; }
    S.base = j.base; S.byCode = {}; j.base.forEach(p=> S.byCode[p.c] = p);
    S.personal = j.personal; S.byDni = {}; j.personal.forEach(p=> S.byDni[p.DNI] = p);
    S.labores = j.labores; S.leyenda = j.leyenda || {}; S.ultEpp = j.ultEpp || {}; S.empresa = j.empresa || {}; S.usuario = j.usuario || {};
    S.cargado = true;
    $('lastSync').textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'});
    pintarLabores(); refrescarVista(); cargarBadgePedidos();
  }catch(e){ $('lastSync').textContent = 'Sin conexión'; toast('No hay conexión con la hoja','err'); }
}
$('btnRefresh').addEventListener('click', ()=>{ cargarDatos(); if(vista==='pedidos') cargarPedidos(); });

// Contador del menú: lo que espera a este usuario (aprobar, atender o tomar firma).
async function cargarBadgePedidos(){
  try{
    const j = await Api.call('pedidos', { filtro:{ activos:true } });
    if(!j.ok) return;
    PED.activos = j.pedidos;
    const n = j.pedidos.filter(p=> accionesPedido(p).principal).length;
    $('pedBadge').textContent = n; $('pedBadge').classList.toggle('hidden', !n);
  }catch(e){}
}

/* ============================================================
   NAVEGACIÓN
   ============================================================ */
const TITULOS = { pedidos:'Pedidos', stock:'Stock', movs:'Movimientos', epp:'EPP por trabajador', personal:'Personal', productos:'Productos', labores:'Labores',
  celular:'Celular de firma', ajustes:'Ajustes' };
let vista = 'mov';
function switchView(v, tipo){
  vista = v;
  document.querySelectorAll('.view').forEach(s=> s.classList.toggle('active', s.id==='view-'+v));
  document.querySelectorAll('#nav button').forEach(b=> b.classList.toggle('active', b.dataset.v===v && (v!=='mov' || b.dataset.t===(tipo==='AJUSTE'?'STOCK INICIAL':tipo))));
  if(v==='mov') setTipo(tipo || M.tipo);
  else $('viewTitle').textContent = TITULOS[v];
  refrescarVista();
}
document.querySelectorAll('#nav button').forEach(b=> b.addEventListener('click', ()=>{ switchView(b.dataset.v, b.dataset.t); document.querySelector('.side').classList.remove('open'); }));
$('btnMenu').addEventListener('click', ()=> document.querySelector('.side').classList.toggle('open'));
function refrescarVista(){
  if(!S.cargado) return;
  ({ mov:pintarMov, pedidos:cargarPedidos, stock:pintarStock, movs:()=>{ if(!$('vTabla').tBodies[0].rows.length) cargarMovs(); }, epp:pintarRenov,
     personal:pintarPersonal, productos:pintarProductos, labores:pintarLabores, celular:pintarCelular, ajustes:pintarAjustes }[vista] || (()=>{}))();
}

/* ============================================================
   REGISTRAR MOVIMIENTO (salida, ingreso, devolución, stock inicial, ajuste)
   ============================================================ */
const TIPOS = {
  'SALIDA':        { titulo:'Salida / entrega', cab:'Datos de la entrega', btn:'Registrar salida', trab:true, labor:true, prov:false, costo:false },
  'INGRESO':       { titulo:'Ingreso al almacén', cab:'Datos del ingreso', btn:'Registrar ingreso', trab:false, labor:false, prov:true, costo:true },
  'DEVOLUCION':    { titulo:'Devolución al almacén', cab:'Datos de la devolución', btn:'Registrar devolución', trab:true, labor:true, prov:false, costo:false },
  'STOCK INICIAL': { titulo:'Stock inicial', cab:'Conteo físico', btn:'Registrar stock inicial', trab:false, labor:false, prov:false, costo:true },
  'AJUSTE':        { titulo:'Ajuste de inventario', cab:'Datos del ajuste', btn:'Registrar ajuste', trab:false, labor:false, prov:false, costo:true },
  'PEDIDO':        { titulo:'Nuevo pedido', cab:'Datos del pedido', btn:'Enviar pedido', trab:true, labor:true, prov:false, costo:false, guardia:true }
};
const M = { tipo:'SALIDA', cat:'TODOS', lineas:[], dni:'', firma:null, resSel:0, resultados:[] };
$('mFecha').value = todayYmd();

function setTipo(t){
  M.tipo = t; const c = TIPOS[t];
  $('viewTitle').textContent = c.titulo; $('movCabTitulo').textContent = c.cab; $('mRegistrar').textContent = c.btn;
  $('tipoAjuste').classList.toggle('hidden', !(t==='STOCK INICIAL' || t==='AJUSTE'));
  document.querySelectorAll('#tipoAjuste button').forEach(b=> b.classList.toggle('active', b.dataset.t===t));
  document.querySelector('.fx-trab').style.display = c.trab ? '' : 'none';
  document.querySelector('.fx-labor').style.display = c.labor ? '' : 'none';
  document.querySelector('.fx-prov').style.display = c.prov ? '' : 'none';
  document.querySelector('.fx-doc').style.display = c.prov ? '' : 'none';
  document.querySelector('.fx-guardia').style.display = c.guardia ? '' : 'none';
  $('mObs').placeholder = t==='AJUSTE' ? 'Motivo del ajuste (obligatorio)' : 'Opcional';
  document.querySelectorAll('#mTabla .col-costo').forEach(el=> el.style.display = c.costo ? '' : 'none');
  $('mExcelBox').classList.toggle('hidden', !['INGRESO','STOCK INICIAL','AJUSTE'].includes(t));
  if(!c.trab) setTrabajador('');
  M.firma = null;
  pintarMov();
}
document.querySelectorAll('#tipoAjuste button').forEach(b=> b.addEventListener('click', ()=> setTipo(b.dataset.t)));

function setTrabajador(dni){
  M.dni = dni; M.firma = null;
  const p = S.byDni[dni];
  $('mTrab').value = p ? p['APELLIDOS Y NOMBRES'] : '';
  $('mTrabInfo').textContent = p ? `${/^SIN-DNI/.test(p.DNI)?'Sin DNI':'DNI '+p.DNI} · ${p.CARGO}${p.T_ZAPATO?' · zapato '+p.T_ZAPATO:''}${p.T_BOTAS?' · botas '+p.T_BOTAS:''}${p.T_OVEROL?' · overol '+p.T_OVEROL:''}` : '';
  pintarLineas();
}
autocomplete($('mTrab'), $('mTrabList'), q=> buscarPersonal(q), it=>{ $('mTrab').classList.remove('invalid'); setTrabajador(it.value); });
$('mTrab').addEventListener('input', ()=>{
  $('mTrab').classList.remove('invalid');
  if(M.dni){ M.dni=''; M.firma=null; pintarLineas(); }
  $('mTrabInfo').className = 'hint';
  $('mTrabInfo').textContent = $('mTrab').value.trim() ? 'Elige al trabajador de la lista' : '';
});
// Si escribió el nombre o DNI y no lo eligió de la lista, se toma solo cuando hay una única coincidencia.
$('mTrab').addEventListener('blur', ()=> setTimeout(()=>{
  const q = $('mTrab').value.trim();
  if(M.dni || !q) return;
  const l = buscarPersonal(q);
  if(l.length===1) setTrabajador(l[0].value);
  else{ $('mTrabInfo').className = 'hint danger'; $('mTrabInfo').textContent = l.length ? `Hay ${l.length} coincidencias: elige una de la lista` : 'No está en Personal: agrégalo en Catálogos → Personal'; }
}, 200));
// Muestra el error y lleva al campo que falta.
function mostrarError(err){
  $('mErr').textContent = err;
  if(!err) return;
  const campo = /trabajador/i.test(err) && !/firma/i.test(err) ? $('mTrab') : /labor/i.test(err) ? $('mLabor') : null;
  if(campo){ campo.classList.add('invalid'); campo.scrollIntoView({ block:'center', behavior:'smooth' }); campo.focus(); }
  toast(err, 'err');
}
$('mLabor').addEventListener('change', ()=> $('mLabor').classList.remove('invalid'));

function pintarLabores(){
  const act = S.labores.filter(l=> l.estado!=='INACTIVO').map(l=> l.labor);
  const prev = $('mLabor').value;
  $('mLabor').innerHTML = '<option value="">— Sin labor —</option>' + act.map(l=> `<option>${esc(l)}</option>`).join('');
  if(act.includes(prev)) $('mLabor').value = prev;
  if(vista==='labores'){
    $('lTabla').tBodies[0].innerHTML = S.labores.map(l=> `<tr><td><b>${esc(l.labor)}</b></td><td>${esc(l.frente)}</td><td>${esc(l.zona)}</td>
      <td>${esc(l.estado)}</td><td><button class="small ghost" data-l="${esc(l.labor)}">Editar</button></td></tr>`).join('');
    $('lTabla').querySelectorAll('[data-l]').forEach(b=> b.addEventListener('click', ()=> editarLabor(S.labores.find(l=> l.labor===b.dataset.l))));
  }
}

function pintarMov(){
  $('mCats').innerHTML = GRUPOS.map(g=> `<button class="chip ${g===M.cat?'active':''}" data-g="${g}">${g==='TODOS'?'Todas':g}</button>`).join('');
  $('mCats').querySelectorAll('.chip').forEach(b=> b.addEventListener('click', ()=>{ M.cat = b.dataset.g; pintarMov(); $('mBuscar').focus(); }));
  buscarProductos(); pintarLineas();
}

function buscarProductos(){
  const q = $('mBuscar').value.trim();
  let l = S.base.filter(p=> M.cat==='TODOS' || grupo(p)===M.cat);
  if(q) l = l.filter(p=> matchWords(p.c+' '+p.d+' '+p.sub, q));
  else if(M.tipo==='SALIDA' || M.tipo==='PEDIDO') l = l.filter(p=> p.stock>0);
  M.resultados = l.slice(0, 80); M.resSel = 0;
  $('mRes').innerHTML = M.resultados.length ? M.resultados.map((p,i)=>{
    const cls = p.stock<=0 ? 'cero' : (p.min!=null && p.stock<=p.min ? 'bajo' : '');
    return `<div class="res ${i===0&&q?'sel':''}" data-c="${esc(p.c)}"><span class="cod">${esc(p.c)}</span>
      <span>${esc(p.d)}<div class="sub">${esc(grupo(p))}${p.sub!==p.cat&&grupo(p)===p.cat?' · '+esc(p.sub):''}</div></span>
      <span class="st ${cls}">${fmtNum(p.stock)} ${esc(p.um)}</span></div>`;
  }).join('') : `<div class="empty-row">${q ? 'Sin resultados' + (M.cat!=='TODOS'?' en '+M.cat+'. Prueba con "Todas".':'.') :
      (M.tipo==='SALIDA' || M.tipo==='PEDIDO' ? 'No hay productos con stock en esta categoría. Registra primero el stock inicial o un ingreso.' : 'Escribe para buscar.')}</div>`;
  $('mRes').querySelectorAll('.res').forEach(el=> el.addEventListener('click', ()=> agregarLinea(el.dataset.c)));
}
$('mBuscar').addEventListener('input', buscarProductos);
$('mBuscar').addEventListener('keydown', e=>{
  const n = M.resultados.length; if(!n) return;
  if(e.key==='ArrowDown' || e.key==='ArrowUp'){
    M.resSel = Math.max(0, Math.min(n-1, M.resSel + (e.key==='ArrowDown'?1:-1)));
    $('mRes').querySelectorAll('.res').forEach((el,i)=> el.classList.toggle('sel', i===M.resSel));
    $('mRes').querySelectorAll('.res')[M.resSel].scrollIntoView({block:'nearest'}); e.preventDefault();
  } else if(e.key==='Enter'){ agregarLinea(M.resultados[M.resSel].c); e.preventDefault(); }
});

function agregarLinea(c){
  const p = S.byCode[c]; if(!p) return;
  const ya = M.lineas.find(l=> l.c===c);
  if(ya){ toast(p.d + ' ya está en el vale'); }
  else M.lineas.push({ c, cant:'', costo: TIPOS[M.tipo].costo && p.costo ? String(p.costo) : '' });
  if(p.cat==='EPPS') M.firma = null; // cambió lo que firma el trabajador
  pintarLineas();
  const inp = $('mTabla').querySelector(`input[data-c="${CSS.escape(c)}"][data-k="cant"]`);
  if(inp) inp.focus();
  $('mBuscar').select();
}

function pintarLineas(){
  const c = TIPOS[M.tipo];
  const tb = $('mTabla').tBodies[0];
  tb.innerHTML = M.lineas.map(l=>{
    const p = S.byCode[l.c];
    const sub = num(l.cant) * num(l.costo);
    return `<tr><td class="small">${esc(p.c)}</td><td>${esc(p.d)}</td><td>${esc(p.um)}</td><td class="num ${p.stock<=0?'cero':''}">${fmtNum(p.stock)}</td>
      <td class="num col-cant"><input data-c="${esc(p.c)}" data-k="cant" value="${esc(l.cant)}" inputmode="decimal" placeholder="${M.tipo==='AJUSTE'?'+ / −':'0'}"></td>
      <td class="num col-costo" style="${c.costo?'':'display:none'}"><input data-c="${esc(p.c)}" data-k="costo" value="${esc(l.costo)}" inputmode="decimal" placeholder="opcional"></td>
      <td class="num col-costo" style="${c.costo?'':'display:none'}">${sub?fmtSol(sub):''}</td>
      <td><button class="small ghost" data-del="${esc(p.c)}" title="Quitar">✕</button></td></tr>`;
  }).join('');
  tb.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', ()=>{ const l = M.lineas.find(x=> x.c===inp.dataset.c); l[inp.dataset.k] = inp.value; actualizarTotales(); $('mErr').textContent=''; if(M.tipo==='PEDIDO') pintarAvisos(); });
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter'){ $('mBuscar').focus(); $('mBuscar').select(); } });
  });
  tb.querySelectorAll('[data-del]').forEach(b=> b.addEventListener('click', ()=>{ M.lineas = M.lineas.filter(l=> l.c!==b.dataset.del); M.firma=null; pintarLineas(); }));
  $('mVacio').style.display = M.lineas.length ? 'none' : '';
  $('mCount').textContent = M.lineas.length ? `(${M.lineas.length})` : '';
  $('mTrabLbl').textContent = 'Trabajador' + (M.tipo==='SALIDA' && tieneEpp() ? ' *' : ' (opcional)');
  $('mLaborLbl').textContent = 'Labor' + (M.tipo==='SALIDA' && M.lineas.some(l=> S.byCode[l.c].cat==='ACEROS') ? ' *' : ' (opcional)');
  pintarAvisos(); pintarFirma(); actualizarTotales();
}
function tieneEpp(){ return M.lineas.some(l=> S.byCode[l.c].cat==='EPPS'); }
function actualizarTotales(){
  const tot = M.lineas.reduce((s,l)=> s + num(l.cant)*num(l.costo), 0);
  $('mTotal').textContent = TIPOS[M.tipo].costo && tot ? 'Total: ' + fmtSol(tot) : '';
  $('mTabla').querySelectorAll('tbody tr').forEach((tr,i)=>{ const l = M.lineas[i]; const s = num(l.cant)*num(l.costo); if(tr.cells[6]) tr.cells[6].textContent = s?fmtSol(s):''; });
}
function pintarAvisos(){
  const av = [];
  if(M.tipo==='PEDIDO'){
    M.lineas.forEach(l=>{ const p = S.byCode[l.c]; if(num(l.cant) > p.stock) av.push(`<div class="aviso">${esc(p.d)}: pides ${fmtNum(num(l.cant))} y en almacén hay ${fmtNum(p.stock)} ${esc(p.um)}. Logística entregará lo que haya.</div>`); });
  }
  if((M.tipo==='SALIDA' || M.tipo==='PEDIDO') && M.dni){
    M.lineas.forEach(l=>{
      const p = S.byCode[l.c]; if(p.cat!=='EPPS') return;
      const u = S.ultEpp[M.dni+'|'+(p.k||p.c)];
      if(!u) return;
      const vigente = u.r && u.r > todayYmd();
      av.push(`<div class="aviso ${vigente?'':'info'}">${esc(p.d)}: última entrega de "${esc(u.d)}" el ${fmtFecha(u.f)}${u.r?(vigente?` · su renovación recién toca el ${fmtFecha(u.r)}`:` · renovación desde ${fmtFecha(u.r)}`):''}</div>`);
    });
  }
  if(M.tipo==='STOCK INICIAL') av.push('<div class="aviso info">Ingresa la cantidad contada físicamente. El costo es opcional: si lo pones, sirve para valorizar el consumo en Power BI.</div>');
  if(M.tipo==='AJUSTE') av.push('<div class="aviso info">Cantidad positiva para sumar al stock, negativa para restar (ej. −2 por pérdida o merma).</div>');
  $('mAvisos').innerHTML = av.join('');
}
$('mLimpiar').addEventListener('click', ()=>{ M.lineas=[]; M.firma=null; pintarLineas(); });

/* ---------- carga masiva desde Excel (stock inicial, ingreso, ajuste) ---------- */
// Plantilla: todos los productos activos; se llena CANTIDAD (y COSTO_UNIT opcional). Las filas sin cantidad se ignoran.
$('mPlantilla').addEventListener('click', ()=>{
  const ord = S.base.slice().sort((a,b)=> (a.cat+a.sub+a.d).localeCompare(b.cat+b.sub+b.d));
  const filas = ord.map(p=> ({ CODIGO:p.c, DESCRIPCION:p.d, CATEGORIA:p.cat, SUBCATEGORIA:p.sub, UM:p.um, STOCK_ACTUAL:p.stock, CANTIDAD:'', COSTO_UNIT:'' }));
  const ws = XLSX.utils.json_to_sheet(filas);
  ws['!cols'] = [{wch:10},{wch:48},{wch:16},{wch:18},{wch:8},{wch:13},{wch:11},{wch:12}];
  ws['!autofilter'] = { ref: 'A1:H' + (filas.length+1) };
  const ins = XLSX.utils.aoa_to_sheet([
    ['CÓMO LLENAR ESTA PLANTILLA'], [''],
    ['1. En la hoja CARGA, escribe la CANTIDAD solo en los productos que vas a cargar. Las filas sin cantidad se ignoran.'],
    ['2. COSTO_UNIT (soles por unidad) es opcional. Sirve para valorizar el consumo en Power BI.'],
    ['3. Para un AJUSTE, la cantidad puede ser negativa (ej. -2 por merma).'],
    ['4. No cambies la columna CODIGO. Puedes filtrar u ordenar, y borrar las filas que no uses.'],
    ['5. En la app: Stock inicial / ajuste (o Ingreso) → Cargar Excel → revisa el vale → Registrar.'],
    [''], ['Generada el ' + fmtFecha(todayYmd()) + ' con ' + filas.length + ' productos activos.']]);
  ins['!cols'] = [{wch:110}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CARGA');
  XLSX.utils.book_append_sheet(wb, ins, 'INSTRUCCIONES');
  XLSX.writeFile(wb, 'Plantilla carga almacen ' + todayYmd() + '.xlsx');
});
$('mCargar').addEventListener('click', ()=>{ $('mArchivo').value = ''; $('mArchivo').click(); });
$('mArchivo').addEventListener('change', async ()=>{
  const f = $('mArchivo').files[0]; if(!f) return;
  try{
    const wb = XLSX.read(await f.arrayBuffer(), { type:'array' });
    const ws = wb.Sheets['CARGA'] || wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:true });
    const r = leerCarga(filas);
    r.lineas.forEach(l=>{
      const ya = M.lineas.find(x=> x.c===l.c);
      if(ya){ ya.cant = l.cant; if(l.costo!=='') ya.costo = l.costo; } else M.lineas.push(l);
    });
    pintarLineas();
    openModal(`<h3>Excel cargado</h3>
      <p><b>${r.lineas.length}</b> producto(s) pasaron al vale${r.ignoradas?`; ${r.ignoradas} fila(s) sin cantidad se ignoraron`:''}.</p>
      ${r.errores.length?`<div class="aviso">${r.errores.length} fila(s) con problemas no se cargaron:</div>
        <div class="tbl-wrap short" style="margin-top:6px"><table class="tbl"><thead><tr><th>Fila</th><th>Problema</th></tr></thead><tbody>
        ${r.errores.slice(0,200).map(e=> `<tr><td>${e.fila}</td><td>${esc(e.msg)}</td></tr>`).join('')}</tbody></table></div>`:''}
      <p class="muted small">Revisa las cantidades en la tabla y pulsa <b>${esc(TIPOS[M.tipo].btn)}</b>. Nada se guarda hasta entonces.</p>
      <div class="modal-actions"><button class="primary" onclick="closeModal()">Revisar vale</button></div>`);
  }catch(e){ toast('No se pudo leer el archivo: ' + e.message, 'err'); }
});
// Lee las filas del Excel: busca el encabezado (CODIGO / CANTIDAD), arma las líneas y junta los errores por fila.
function leerCarga(filas){
  const out = { lineas:[], errores:[], ignoradas:0 };
  const norm = s=> plain(s).replace(/[^A-Z0-9]/g,'');
  const hi = filas.findIndex(r=> r.some(c=> norm(c)==='CANTIDAD'));
  if(hi<0) throw new Error('no encuentro la columna CANTIDAD. Usa la plantilla de la app.');
  const h = filas[hi].map(norm);
  const iC = h.findIndex(x=> x==='CODIGO'), iD = h.findIndex(x=> x==='DESCRIPCION'), iQ = h.indexOf('CANTIDAD');
  const iP = h.findIndex(x=> ['COSTOUNIT','COSTOUNITARIO','COSTO','PRECIO','PRECIOUNIT'].includes(x));
  const porDesc = {};
  S.base.forEach(p=>{ const k = plain(p.d).replace(/\s+/g,' ').trim(); (porDesc[k] = porDesc[k] || []).push(p); });
  const vistos = {};
  for(let i=hi+1; i<filas.length; i++){
    const r = filas[i], fila = i+1;
    const qTxt = String(r[iQ]==null?'':r[iQ]).trim();
    if(!qTxt){ if(r.some(c=> String(c).trim())) out.ignoradas++; continue; }
    const q = typeof r[iQ]==='number' ? r[iQ] : parseFloat(qTxt.replace(',','.'));
    if(isNaN(q)){ out.errores.push({ fila, msg:`Cantidad "${qTxt}" no es un número` }); continue; }
    if(q===0){ out.ignoradas++; continue; }
    if(q<0 && M.tipo!=='AJUSTE'){ out.errores.push({ fila, msg:'Cantidad negativa: solo se permite en un ajuste' }); continue; }
    let p = iC>=0 ? S.byCode[String(r[iC]).trim().toUpperCase()] : null;
    if(!p && iD>=0){
      const m = porDesc[plain(r[iD]).replace(/\s+/g,' ').trim()] || [];
      if(m.length===1) p = m[0];
      else if(m.length>1){ out.errores.push({ fila, msg:`"${r[iD]}" existe en ${m.length} categorías: indica el CODIGO` }); continue; }
    }
    if(!p){ out.errores.push({ fila, msg:`No existe el producto ${iC>=0&&r[iC]?String(r[iC]):''} ${iD>=0?String(r[iD]):''}`.trim() + ' (créalo en Productos)' }); continue; }
    if(vistos[p.c]){ out.errores.push({ fila, msg:`${p.c} está repetido (fila ${vistos[p.c]}); se usó la primera` }); continue; }
    vistos[p.c] = fila;
    const cTxt = iP>=0 ? String(r[iP]==null?'':r[iP]).trim() : '';
    const costo = cTxt==='' ? '' : (typeof r[iP]==='number' ? r[iP] : parseFloat(cTxt.replace(',','.')));
    if(costo!=='' && (isNaN(costo) || costo<0)){ out.errores.push({ fila, msg:`Costo "${cTxt}" inválido en ${p.d}` }); continue; }
    out.lineas.push({ c:p.c, cant:String(q), costo: costo==='' ? (TIPOS[M.tipo].costo && p.costo ? String(p.costo) : '') : String(Math.round(costo*10000)/10000) });
  }
  return out;
}

/* ---------- firma ---------- */
function pintarFirma(){
  const necesita = M.tipo==='SALIDA' && tieneEpp();
  $('mFirmaBox').classList.toggle('hidden', !necesita);
  if(!necesita) return;
  const f = M.firma;
  $('mFirmaImg').classList.toggle('hidden', !(f && f.png));
  if(f && f.png) $('mFirmaImg').src = f.png;
  $('mFirmaQuitar').classList.toggle('hidden', !f);
  $('mFirmaEstado').className = 'hint ' + (f ? 'ok' : '');
  $('mFirmaEstado').textContent = f ? ('Firmado ' + (f.id ? 'en el celular' : 'en esta PC') + ' ✓') : 'Sin firma';
}
$('mFirmaQuitar').addEventListener('click', ()=>{ M.firma = null; pintarFirma(); });

function validarVale(paraFirma){
  const c = TIPOS[M.tipo];
  if(!$('mFecha').value) return 'Indica la fecha';
  if(!M.lineas.length) return 'Agrega al menos un producto';
  const conTrab = M.tipo==='SALIDA' || M.tipo==='PEDIDO';
  if(conTrab && tieneEpp() && !M.dni) return 'En EPPS el trabajador es obligatorio';
  if(conTrab && M.lineas.some(l=> S.byCode[l.c].cat==='ACEROS') && !$('mLabor').value) return 'En ACEROS la labor es obligatoria';
  if(M.tipo==='AJUSTE' && !$('mObs').value.trim()) return 'Indica el motivo del ajuste';
  for(const l of M.lineas){
    const p = S.byCode[l.c], q = num(l.cant);
    if(M.tipo==='AJUSTE' ? q===0 : !(q>0)) return 'Ingresa la cantidad de ' + p.d;
    if(String(l.cant).trim() && isNaN(parseFloat(String(l.cant).replace(',','.')))) return 'Cantidad inválida en ' + p.d;
    const sale = M.tipo==='SALIDA' ? q : (M.tipo==='AJUSTE' && q<0 ? -q : 0);
    if(sale > p.stock + 1e-9) return `Solo hay ${fmtNum(p.stock)} ${p.um} de ${p.d}`;
    if(c.costo && String(l.costo).trim() && !(num(l.costo)>=0)) return 'Costo inválido en ' + p.d;
  }
  if(!paraFirma && M.tipo==='SALIDA' && tieneEpp() && !M.firma) return 'Falta la firma del trabajador (botón Firmar en el celular o en esta PC)';
  return '';
}

$('mFirmaPC').addEventListener('click', ()=>{
  const err = validarVale(true); mostrarError(err); if(err) return;
  const p = S.byDni[M.dni];
  Firma.abrir(`${p['APELLIDOS Y NOMBRES']} recibe: ` + M.lineas.map(l=> `${fmtNum(num(l.cant))} ${S.byCode[l.c].um} ${S.byCode[l.c].d}`).join(', '), png=>{ M.firma = { png }; pintarFirma(); });
});

$('mFirmaCel').addEventListener('click', ()=>{
  const err = validarVale(true); mostrarError(err); if(err) return;
  const token = lsGet('log_estacion', '');
  if(!token){ toast('Primero vincula el celular de firma'); switchView('celular'); return; }
  const p = S.byDni[M.dni];
  const items = M.lineas.map(l=> ({ d:S.byCode[l.c].d, cant:num(l.cant), um:S.byCode[l.c].um }));
  pedirFirmaCelular(token, solicitudFirma(p, items), f=>{ M.firma = f; closeModal(); pintarFirma(); }, closeModal);
});
const TEXTO_FIRMA = 'Declaro haber recibido los EPP descritos en buen estado y me comprometo a usarlos y conservarlos correctamente.';
function solicitudFirma(p, items){ return { trabajador:p['APELLIDOS Y NOMBRES'], dni:/^SIN-DNI/.test(p.DNI)?'':p.DNI, cargo:p.CARGO, items, texto:TEXTO_FIRMA }; }

// Pide la firma al celular de la estación. onOk({id, png}) al firmar; onCancel() si se cancela.
let firmaPoll = null;
async function pedirFirmaCelular(token, sol, onOk, onCancel){
  let j;
  try{ j = await Api.call('firma_pedir', { token, solicitud: sol }); }catch(e){ toast('Sin conexión','err'); return; }
  if(!j.ok){ toast(j.error,'err'); return; }
  const id = j.id;
  openModal(`<h3>Esperando la firma en el celular…</h3>
    <p class="muted">En el celular de firma apareció <b>${esc(sol.trabajador)}</b> con ${sol.items.length} EPP. Pídele que revise y firme con el dedo.</p>
    <div class="hint" id="fpEstado">Esperando…</div>
    <div class="modal-actions"><button class="ghost" id="fpCancelar">Cancelar</button></div>`);
  const inicio = Date.now();
  const parar = ()=>{ clearTimeout(firmaPoll); firmaPoll = null; };
  $('fpCancelar').addEventListener('click', ()=>{ parar(); Api.call('firma_cancelar', { token, id }).catch(()=>{}); onCancel(); });
  const tick = async ()=>{
    if(!$('fpEstado')) return parar();
    try{
      const e = await Api.call('firma_estado', { id });
      if(e.estado==='FIRMADO'){
        parar();
        let png = e.png;
        if(!png){ const im = await Api.call('firma_img', { ids:[e.firma_id] }); png = (im.imagenes||{})[e.firma_id]; }
        onOk({ id: e.firma_id, png }); toast('Firma recibida ✓','ok');
        return;
      }
      if(e.estado==='CANCELADO' || e.estado==='VENCIDO'){ parar(); $('fpEstado').textContent = 'La solicitud se canceló o venció.'; return; }
      $('fpEstado').textContent = 'Esperando… (' + Math.round((Date.now()-inicio)/1000) + ' s)';
    }catch(err){ $('fpEstado').textContent = 'Sin conexión, reintentando…'; }
    if(Date.now()-inicio < 15*60000) firmaPoll = setTimeout(tick, 2000);
  };
  firmaPoll = setTimeout(tick, 1500);
}

/* ---------- registrar ---------- */
$('mRegistrar').addEventListener('click', ()=>{
  const err = validarVale(false);
  mostrarError(err); if(err) return;
  const c = TIPOS[M.tipo];
  const cab = { tipo:M.tipo, fecha:$('mFecha').value, dni: c.trab ? M.dni : '', labor: c.labor ? $('mLabor').value : '',
    proveedor: c.prov ? $('mProv').value.trim() : '', documento: c.prov ? $('mDoc').value.trim() : '', obs:$('mObs').value.trim() };
  // Un vale lleva como máximo 90 productos: una carga grande (ej. stock inicial desde Excel) se parte en varios vales.
  const POR_VALE = 90;
  const partes = [];
  for(let i=0; i<M.lineas.length; i+=POR_VALE) partes.push(M.lineas.slice(i, i+POR_VALE));
  const vales = partes.map(ls=> Object.assign({}, cab, {
    items: ls.map(l=> ({ codigo:l.c, cantidad:num(l.cant), costo_unit: c.costo ? num(l.costo) : 0 })),
    client_id: Date.now().toString(36) + Math.random().toString(36).slice(2,8) }));
  if(M.firma){ if(M.firma.id) vales[0].firma_id = M.firma.id; else vales[0].firma = M.firma.png; }
  if(M.tipo==='PEDIDO') return enviarPedido(cab);
  busy($('mRegistrar'), async ()=>{
    const hechos = [];
    for(let i=0; i<vales.length; i++){
      if(vales.length>1) $('mRegistrar').textContent = `Registrando ${i+1} de ${vales.length}…`;
      let j;
      try{ j = await Api.call('registrar', { vale: vales[i] }); }
      catch(e){
        vales.slice(i).forEach(v=>{ Cola.add(v); aplicarLocal(v); }); pintarCola(); limpiarVale();
        openModal(`<div class="ok-icon">📶</div><h3 style="text-align:center">Sin conexión: ${vales.length-i} vale(s) guardado(s) en esta PC</h3>
          <p class="muted" style="text-align:center">${hechos.length?'Ya se registraron: '+esc(hechos.join(', '))+'. ':''}El resto se enviará solo a la hoja cuando vuelva internet.</p>
          <div class="modal-actions"><button class="primary" onclick="closeModal()">Entendido</button></div>`);
        cargarDatos(); return;
      }
      if(!j.ok){
        // Lo ya registrado sale del vale para no duplicarlo al reintentar.
        const ok = new Set(vales.slice(0,i).flatMap(v=> v.items.map(it=> it.codigo)));
        M.lineas = M.lineas.filter(l=> !ok.has(l.c)); pintarLineas();
        $('mErr').textContent = (hechos.length ? `Se registraron ${hechos.join(', ')}; el resto no: ` : '') + j.error;
        if(hechos.length) cargarDatos();
        return;
      }
      aplicarLocal(vales[i]); hechos.push(j.vale);
    }
    limpiarVale();
    openModal(`<div class="ok-icon">✅</div><h3 style="text-align:center">${hechos.length>1?hechos.length+' vales registrados':'Vale registrado'} · ${esc(TIPOS[cab.tipo].titulo.toLowerCase())}</h3>
      <div class="vale-num">${hechos.length>1 ? esc(hechos[0]) + ' … ' + esc(hechos[hechos.length-1]) : esc(hechos[0])}</div>
      <div class="modal-actions"><button class="ghost" id="okVer">Ver en movimientos</button><button class="primary" id="okNuevo">Nuevo vale</button></div>`);
    $('okNuevo').addEventListener('click', ()=>{ closeModal(); $('mBuscar').focus(); });
    $('okVer').addEventListener('click', ()=>{ closeModal(); $('vBuscar').value = hechos.length>1 ? '' : hechos[0]; switchView('movs'); cargarMovs(); });
    cargarDatos();
  });
});
// Actualiza el stock en pantalla sin esperar a la hoja.
function aplicarLocal(v){
  v.items.forEach(it=>{
    const p = S.byCode[it.codigo]; if(!p) return;
    const s = v.tipo==='SALIDA' ? -it.cantidad : it.cantidad;
    p.stock = Math.round((p.stock + s)*10000)/10000;
  });
}
function limpiarVale(){ M.lineas = []; M.firma = null; $('mObs').value=''; $('mProv').value=''; $('mDoc').value=''; $('mBuscar').value=''; buscarProductos(); pintarLineas(); }

/* ============================================================
   FIRMA EN ESTA PC (mouse / tableta USB)
   ============================================================ */
const Firma = (()=>{
  const cv = $('fmCanvas'), cx = cv.getContext('2d');
  let dibujando=false, hay=false, last=null, cb=null;
  function ajustar(){ const r = cv.getBoundingClientRect(), d = window.devicePixelRatio||1; cv.width = r.width*d; cv.height = r.height*d; cx.setTransform(d,0,0,d,0,0); cx.lineCap='round'; cx.lineJoin='round'; cx.strokeStyle='#0B1F5C'; }
  const pt = e=>{ const r = cv.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top, p:e.pressure||0.5 }; };
  cv.addEventListener('pointerdown', e=>{ dibujando=true; last=pt(e); cv.setPointerCapture(e.pointerId); $('fmPh').style.display='none'; });
  cv.addEventListener('pointermove', e=>{ if(!dibujando) return; const p = pt(e); cx.lineWidth = 1.2 + p.p*2.4; cx.beginPath(); cx.moveTo(last.x,last.y); cx.lineTo(p.x,p.y); cx.stroke(); last=p; hay=true; });
  ['pointerup','pointercancel','pointerleave'].forEach(t=> cv.addEventListener(t, ()=> dibujando=false));
  function limpiar(){ cx.clearRect(0,0,cv.width,cv.height); hay=false; $('fmPh').style.display=''; }
  $('fmLimpiar').addEventListener('click', limpiar);
  $('fmCancelar').addEventListener('click', ()=> $('firmaModal').classList.remove('open'));
  $('fmOk').addEventListener('click', ()=>{
    if(!hay){ toast('Falta la firma','err'); return; }
    $('firmaModal').classList.remove('open'); cb && cb(recortar());
  });
  // Recorta el espacio en blanco y deja fondo transparente (ocupa menos en Drive y en el PDF).
  function recortar(){
    const d = cx.getImageData(0,0,cv.width,cv.height).data; let x0=cv.width, y0=cv.height, x1=0, y1=0;
    for(let y=0;y<cv.height;y+=2) for(let x=0;x<cv.width;x+=2){ if(d[(y*cv.width+x)*4+3]>0){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
    const pad=12; x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(cv.width,x1+pad); y1=Math.min(cv.height,y1+pad);
    const o = document.createElement('canvas'), esc2 = Math.min(1, 600/(x1-x0));
    o.width = Math.round((x1-x0)*esc2); o.height = Math.round((y1-y0)*esc2);
    o.getContext('2d').drawImage(cv, x0, y0, x1-x0, y1-y0, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  }
  return { abrir(texto, fn){ cb = fn; $('fmTexto').textContent = texto; $('firmaModal').classList.add('open'); requestAnimationFrame(()=>{ ajustar(); limpiar(); }); } };
})();

/* ============================================================
   STOCK
   ============================================================ */
function llenarCats(sel){
  const cats = [...new Set(S.base.map(p=> p.cat))].sort();
  const prev = sel.value;
  sel.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c=> `<option>${esc(c)}</option>`).join('');
  sel.value = prev;
}
function filasStock(){
  const q = $('sBuscar').value.trim(), cat = $('sCat').value;
  return S.base.filter(p=> (!cat || p.cat===cat) && (!$('sConStock').checked || p.stock!==0) && (!$('sReponer').checked || (p.min!=null && p.stock<=p.min))
    && (!q || matchWords(p.c+' '+p.d+' '+p.sub, q)));
}
function pintarStock(){
  llenarCats($('sCat'));
  const conStock = S.base.filter(p=> p.stock>0);
  $('kItems').textContent = fmtNum(conStock.length);
  $('kValor').textContent = fmtSol(conStock.reduce((s,p)=> s + p.stock*p.costo, 0));
  $('kReponer').textContent = fmtNum(S.base.filter(p=> p.min!=null && p.stock<=p.min).length);
  $('kSinCosto').textContent = fmtNum(conStock.filter(p=> !p.costo).length);
  const l = filasStock();
  $('sTabla').tBodies[0].innerHTML = l.slice(0, 600).map(p=>{
    const cls = p.stock<=0 ? 'cero' : (p.min!=null && p.stock<=p.min ? 'bajo' : '');
    return `<tr class="click" data-c="${esc(p.c)}"><td class="small">${esc(p.c)}</td><td>${esc(p.d)}</td><td>${esc(p.cat)}</td><td class="small">${esc(p.sub)}</td><td>${esc(p.um)}</td>
      <td class="num ${cls}">${fmtNum(p.stock)}</td><td class="num">${p.min==null?'':fmtNum(p.min)}</td><td class="num">${p.costo?fmtSol(p.costo):''}</td>
      <td class="num">${p.costo&&p.stock?fmtSol(p.stock*p.costo):''}</td><td class="small">${fmtFecha(p.ultimo)}</td></tr>`;
  }).join('');
  $('sPie').textContent = l.length > 600 ? `Mostrando 600 de ${l.length}. Usa el buscador para acotar.` : `${l.length} productos. Clic en un producto para ver su kardex.`;
  $('sTabla').querySelectorAll('tr.click').forEach(tr=> tr.addEventListener('click', ()=> kardexProducto(tr.dataset.c)));
}
['sBuscar','sCat','sConStock','sReponer'].forEach(id=> $(id).addEventListener(id==='sBuscar'?'input':'change', pintarStock));
$('sExcel').addEventListener('click', ()=> descargarExcel(filasStock().map(p=> ({ CODIGO:p.c, DESCRIPCION:p.d, CATEGORIA:p.cat, SUBCATEGORIA:p.sub, UM:p.um,
  STOCK:p.stock, STOCK_MIN:p.min, COSTO_PROMEDIO:p.costo, VALOR:Math.round(p.stock*p.costo*100)/100, ULTIMO_MOV:p.ultimo })), 'Stock almacen'));

async function kardexProducto(c){
  const p = S.byCode[c];
  openModal(`<h3>Kardex · ${esc(p.d)}</h3><div class="muted">${esc(p.c)} · ${esc(p.cat)} · ${esc(p.um)}</div><div id="kpBody" class="hint">Cargando…</div>`);
  try{
    const j = await Api.call('movimientos', { filtro:{ codigo:c } });
    if(!j.ok) throw new Error(j.error);
    let saldo = 0;
    const filas = j.movimientos.map(m=>{ saldo = Math.round((saldo + num(m.MOV_STOCK))*10000)/10000; return Object.assign({ saldo }, m); });
    $('modalBox').style.width = '900px';
    $('kpBody').outerHTML = `<div class="tbl-wrap short" style="max-height:60vh;margin-top:10px"><table class="tbl"><thead><tr><th>Fecha</th><th>Vale</th><th>Tipo</th>
      <th class="num">Entra</th><th class="num">Sale</th><th class="num">Saldo</th><th class="num">Costo unit.</th><th>Trabajador / proveedor</th><th>Labor</th></tr></thead><tbody>
      ${filas.map(m=> `<tr class="${m.ANULADO?'anulado':''}"><td>${fmtFecha(m.FECHA)}</td><td class="small">${esc(m.VALE)}</td><td><span class="tag ${esc(String(m.TIPO).split(' ')[0])}">${esc(m.TIPO)}</span></td>
        <td class="num">${num(m.MOV_STOCK)>0?fmtNum(m.MOV_STOCK):''}</td><td class="num">${num(m.MOV_STOCK)<0?fmtNum(-m.MOV_STOCK):''}</td><td class="num"><b>${fmtNum(m.saldo)}</b></td>
        <td class="num">${m.COSTO_UNIT?fmtSol(m.COSTO_UNIT):''}</td><td class="small">${esc(m.TRABAJADOR||m.PROVEEDOR)}</td><td class="small">${esc(m.LABOR)}</td></tr>`).join('') ||
        '<tr><td colspan="9" class="muted">Sin movimientos</td></tr>'}</tbody></table></div>
      <div class="modal-actions"><button class="primary" onclick="closeModal();$('modalBox').style.width=''">Cerrar</button></div>`;
  }catch(e){ $('kpBody').textContent = 'No se pudo cargar: ' + e.message; }
}

/* ============================================================
   MOVIMIENTOS
   ============================================================ */
let MOVS = [];
const d30 = new Date(); d30.setDate(d30.getDate()-30);
$('vDesde').value = d30.toISOString().slice(0,10); $('vHasta').value = todayYmd();
async function cargarMovs(){
  $('vPie').textContent = 'Cargando…';
  try{
    const t = $('vTipo').value;
    const j = await Api.call('movimientos', { filtro:{ desde:$('vDesde').value, hasta:$('vHasta').value, tipo:t, historico: t==='HISTORICO' } });
    if(!j.ok) throw new Error(j.error);
    MOVS = j.movimientos.reverse();
    pintarMovs();
  }catch(e){ $('vPie').textContent = 'No se pudo cargar: ' + e.message; }
}
function filasMovs(){ const q = $('vBuscar').value.trim(); return MOVS.filter(m=> !q || matchWords([m.VALE,m.DESCRIPCION,m.CODIGO,m.TRABAJADOR,m.DNI,m.LABOR,m.PROVEEDOR,m.DOCUMENTO,m.TIPO,m.USUARIO].join(' '), q)); }
function pintarMovs(){
  const l = filasMovs();
  const vivos = l.filter(m=> !m.ANULADO && m.TIPO!=='ANULACION');
  $('vkVales').textContent = fmtNum(new Set(vivos.map(m=> m.VALE)).size);
  $('vkSal').textContent = fmtSol(vivos.filter(m=> m.TIPO==='SALIDA').reduce((s,m)=> s+num(m.COSTO_TOTAL), 0) - vivos.filter(m=> m.TIPO==='DEVOLUCION').reduce((s,m)=> s+num(m.COSTO_TOTAL), 0));
  $('vkIng').textContent = fmtSol(vivos.filter(m=> m.TIPO==='INGRESO' || m.TIPO==='STOCK INICIAL').reduce((s,m)=> s+num(m.COSTO_TOTAL), 0));
  const puede = S.usuario.rol!=='LECTURA';
  let prevVale = '';
  $('vTabla').tBodies[0].innerHTML = l.slice(0, 1500).map(m=>{
    const primero = m.VALE!==prevVale; prevVale = m.VALE;
    const anulable = puede && primero && !m.ANULADO && !['ANULACION','HISTORICO'].includes(m.TIPO);
    return `<tr class="${m.ANULADO?'anulado':''}"><td>${fmtFecha(m.FECHA)}</td><td class="small">${esc(m.VALE)}</td><td><span class="tag ${esc(String(m.TIPO).split(' ')[0])}">${esc(m.TIPO)}</span></td>
      <td>${esc(m.DESCRIPCION)}<div class="small muted">${esc(m.CODIGO)}</div></td><td class="num">${num(m.MOV_STOCK)<0?'−':''}${fmtNum(m.CANTIDAD)}</td><td>${esc(m.UM)}</td>
      <td class="num">${m.COSTO_TOTAL!==''&&m.COSTO_TOTAL!=null?fmtSol(m.COSTO_TOTAL):''}</td><td class="small">${esc(m.TRABAJADOR)}</td><td class="small">${esc(m.LABOR)}</td>
      <td class="small">${esc([m.DOCUMENTO,m.PROVEEDOR].filter(Boolean).join(' · '))}</td><td class="small">${esc(m.USUARIO)}</td>
      <td>${anulable?`<button class="small ghost danger" data-anular="${esc(m.VALE)}">Anular</button>`:''}</td></tr>`;
  }).join('') || '<tr><td colspan="12" class="muted">Sin movimientos en el periodo.</td></tr>';
  $('vPie').textContent = `${l.length} filas` + (l.length>1500?' (se muestran 1500; acota las fechas)':'') + '. El histórico del kardex físico se ve eligiendo tipo HISTORICO o en EPP por trabajador.';
  $('vTabla').querySelectorAll('[data-anular]').forEach(b=> b.addEventListener('click', ()=> anularVale(b.dataset.anular)));
}
$('vCargar').addEventListener('click', cargarMovs);
$('vTipo').addEventListener('change', cargarMovs);
$('vBuscar').addEventListener('input', pintarMovs);
$('vExcel').addEventListener('click', ()=> descargarExcel(filasMovs().map(m=>{ const o = Object.assign({}, m); o.ANULADO = m.ANULADO?'SI':''; delete o.FIRMA; return o; }), 'Movimientos almacen'));

function anularVale(vale){
  openModal(`<h3>Anular ${esc(vale)}</h3><p class="muted">El vale queda registrado (tachado) y se agrega una anulación que devuelve el stock. Esto no se puede deshacer.</p>
    <div class="field"><label>Motivo *</label><input id="anMotivo" placeholder="Ej. cantidad mal digitada"></div><div class="err" id="anErr"></div>
    <div class="modal-actions"><button class="ghost" onclick="closeModal()">Cancelar</button><button class="primary" id="anOk">Anular vale</button></div>`);
  $('anOk').addEventListener('click', ()=> busy($('anOk'), async ()=>{
    const motivo = $('anMotivo').value.trim(); if(!motivo){ $('anErr').textContent='Indica el motivo'; return; }
    try{
      const j = await Api.call('anular', { vale, motivo });
      if(!j.ok){ $('anErr').textContent = j.error; return; }
      closeModal(); toast('Vale anulado','ok'); cargarMovs(); cargarDatos();
    }catch(e){ $('anErr').textContent = 'Sin conexión'; }
  }));
}

/* ============================================================
   EPP POR TRABAJADOR + KARDEX FO-SI-057
   ============================================================ */
let EPP = { dni:'', movs:[] };
autocomplete($('eTrab'), $('eTrabList'), q=> buscarPersonal(q, true), it=> verEpp(it.value));
async function verEpp(dni){
  const p = S.byDni[dni]; EPP = { dni, movs:[] };
  $('eTrab').value = p['APELLIDOS Y NOMBRES'];
  const t = [['Overol',p.T_OVEROL],['Pantalón',p.T_PANTALON],['Camisa',p.T_CAMISA],['Polo',p.T_POLO],['Chaleco',p.T_CHALECO],['Zapato',p.T_ZAPATO],['Botas',p.T_BOTAS]];
  $('eFicha').innerHTML = `<div class="fn">${esc(p['APELLIDOS Y NOMBRES'])}</div><div class="muted">${/^SIN-DNI/.test(p.DNI)?'<span class="cero">Sin DNI (complétalo en Personal)</span>':'DNI '+esc(p.DNI)} · ${esc(p.CARGO)} · ${esc(p.AREA||p.SEDE)}${p.ESTADO==='CESADO'?' · <b class="cero">CESADO</b>':''}</div>
    <div class="tallas">${t.map(([k,v])=> `<span>${k}: <b>${esc(v||'—')}</b></span>`).join('')}</div>`;
  $('eBtns').style.display = '';
  $('eTabla').tBodies[0].innerHTML = '<tr><td colspan="8" class="muted">Cargando…</td></tr>';
  try{
    const j = await Api.call('movimientos', { filtro:{ dni } });
    if(!j.ok) throw new Error(j.error);
    EPP.movs = j.movimientos;
    const l = j.movimientos.filter(m=> String(m.CATEGORIA)==='EPPS' && ['SALIDA','HISTORICO','DEVOLUCION'].includes(m.TIPO)).reverse();
    $('eCount').textContent = `(${l.length})`;
    $('eTabla').tBodies[0].innerHTML = l.map(m=> `<tr class="${m.ANULADO?'anulado':''}"><td>${fmtFecha(m.FECHA)}</td><td class="small">${esc(m.VALE)}</td><td>${esc(m.KARDEX_N)}</td>
      <td>${esc(m.DESCRIPCION)}${m.OBS?`<div class="small muted">${esc(m.OBS)}</div>`:''}</td><td class="num">${m.TIPO==='DEVOLUCION'?'−':''}${fmtNum(m.CANTIDAD)}</td>
      <td>${fmtFecha(m.FECHA_RENOVACION)}</td><td>${m.FIRMA?'✓':''}</td><td class="small">${m.TIPO==='HISTORICO'?'Kardex físico':esc(m.USUARIO)}</td></tr>`).join('')
      || '<tr><td colspan="8" class="muted">Sin entregas de EPP registradas.</td></tr>';
  }catch(e){ $('eTabla').tBodies[0].innerHTML = `<tr><td colspan="8" class="cero">No se pudo cargar: ${esc(e.message)}</td></tr>`; }
}
$('eEntregar').addEventListener('click', ()=>{ switchView('mov', ['ADMIN','LOGISTICO'].includes(rol()) ? 'SALIDA' : 'PEDIDO'); setTrabajador(EPP.dni); M.cat='EPPS'; pintarMov(); });

function pintarRenov(){
  const hoy = todayYmd(), lim = (()=>{ const d = new Date(); d.setDate(d.getDate()+30); return d.toISOString().slice(0,10); })();
  const l = Object.entries(S.ultEpp).filter(([k,v])=> v.r && v.r <= lim).map(([k,v])=> ({ dni:k.split('|')[0], ...v }))
    .filter(x=> S.byDni[x.dni] && S.byDni[x.dni].ESTADO!=='CESADO').sort((a,b)=> a.r < b.r ? -1 : 1);
  $('eRenov').tBodies[0].innerHTML = l.map(x=> `<tr class="click" data-dni="${esc(x.dni)}"><td>${esc(S.byDni[x.dni]['APELLIDOS Y NOMBRES'])}</td><td>${esc(x.d)}</td>
    <td>${fmtFecha(x.f)}</td><td class="${x.r<hoy?'cero':'bajo'}">${fmtFecha(x.r)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Nada por renovar en los próximos 30 días.</td></tr>';
  $('eRenov').querySelectorAll('tr.click').forEach(tr=> tr.addEventListener('click', ()=> verEpp(tr.dataset.dni)));
}

let kxActual = null;
$('eKardex').addEventListener('click', ()=> busy($('eKardex'), async ()=>{
  const p = S.byDni[EPP.dni]; if(!p) return;
  const entregas = Kardex.entregasDe(EPP.movs);
  const ids = [...new Set(entregas.map(e=> e.firma).filter(Boolean))];
  let firmas = {};
  for(let i=0; i<ids.length; i+=40){
    const j = await Api.call('firma_img', { ids: ids.slice(i, i+40) });
    if(j.ok) Object.assign(firmas, j.imagenes);
  }
  const otros = [...new Set(entregas.flatMap(e=> e.otros))].join(', ');
  const emp = Object.assign({}, S.empresa, { responsable: S.usuario.nombre, responsableCargo: S.usuario.rol==='ADMIN'?'':'LOGISTICO' });
  $('kxDoc').innerHTML = Kardex.render(p, entregas, emp, S.leyenda, firmas, otros, await Kardex.logoDataUrl());
  $('kxTitulo').textContent = 'Kardex FO-SI-057 · ' + p['APELLIDOS Y NOMBRES'] + ` (${entregas.length} entregas)`;
  $('kxEstado').textContent = '';
  kxActual = p;
  $('kxOverlay').classList.remove('hidden');
}));
$('kxCerrar').addEventListener('click', ()=> $('kxOverlay').classList.add('hidden'));
$('kxImprimir').addEventListener('click', ()=> window.print());
$('kxDrive').addEventListener('click', ()=> busy($('kxDrive'), async ()=>{
  $('kxEstado').textContent = 'Generando PDF…';
  try{
    const pdf = await Kardex.pdfDataUrl($('kxDoc'));
    $('kxEstado').textContent = 'Subiendo a Drive…';
    const j = await Api.call('kardex_pdf', { dni: kxActual.DNI, pdf }, 120000);
    if(!j.ok) throw new Error(j.error);
    $('kxEstado').innerHTML = `Guardado en Drive ✓ <a href="${esc(j.url)}" target="_blank" rel="noopener">abrir</a>`;
  }catch(e){ $('kxEstado').textContent = 'No se pudo guardar: ' + e.message; }
}));

/* ============================================================
   PERSONAL
   ============================================================ */
function pintarPersonal(){
  const q = $('pBuscar').value.trim(), ces = $('pCesados').checked;
  const l = S.personal.filter(p=> (ces || p.ESTADO!=='CESADO') && (!q || matchWords([p.DNI,p['APELLIDOS Y NOMBRES'],p.CARGO,p.AREA,p.SEDE].join(' '), q)))
    .sort((a,b)=> a['APELLIDOS Y NOMBRES'] < b['APELLIDOS Y NOMBRES'] ? -1 : 1);
  $('pTabla').tBodies[0].innerHTML = l.map(p=> `<tr><td class="${/^SIN-DNI/.test(p.DNI)?'cero':''}">${esc(p.DNI)}</td><td>${esc(p['APELLIDOS Y NOMBRES'])}</td><td>${esc(p.CARGO)}</td>
    <td>${esc(p.AREA)}</td><td>${esc(p.SEDE)}</td><td class="small">${[p.T_OVEROL,p.T_PANTALON,p.T_CAMISA,p.T_POLO,p.T_CHALECO,p.T_ZAPATO,p.T_BOTAS].map(v=> esc(v||'·')).join(' / ')}</td>
    <td>${esc(p.ESTADO)}</td><td><button class="small ghost" data-dni="${esc(p.DNI)}">Editar</button></td></tr>`).join('');
  $('pPie').textContent = `${l.length} trabajadores` + (S.personal.some(p=> /^SIN-DNI/.test(p.DNI)) ? ' · los marcados en rojo no tenían DNI en el kardex físico: edítalos para completarlo.' : '');
  $('pTabla').querySelectorAll('[data-dni]').forEach(b=> b.addEventListener('click', ()=> editarPersonal(S.byDni[b.dataset.dni])));
}
$('pBuscar').addEventListener('input', pintarPersonal); $('pCesados').addEventListener('change', pintarPersonal);
$('pNuevo').addEventListener('click', ()=> editarPersonal(null));
function editarPersonal(p){
  const v = k=> esc(p ? p[k] : '');
  const tallas = [['T_OVEROL','Overol'],['T_PANTALON','Pantalón'],['T_CAMISA','Camisa'],['T_POLO','Polo'],['T_CHALECO','Chaleco'],['T_ZAPATO','Zapato'],['T_BOTAS','Botas']];
  openModal(`<h3>${p?'Editar trabajador':'Nuevo trabajador'}</h3>
    <div class="form-grid">
      <div class="field"><label>DNI *</label><input id="peDNI" value="${p&&/^SIN-DNI/.test(p.DNI)?'':v('DNI')}" inputmode="numeric" maxlength="12"></div>
      <div class="field"><label>Estado</label><select id="peEST"><option>ACTIVO</option><option>CESADO</option></select></div>
      <div class="field span2"><label>Apellidos y nombres *</label><input id="peNOM" value="${v('APELLIDOS Y NOMBRES')}"></div>
      <div class="field"><label>Cargo</label><input id="peCAR" value="${v('CARGO')}" list="dlCargos"></div>
      <div class="field"><label>Área</label><input id="peAREA" value="${v('AREA')}" list="dlAreas"></div>
      <div class="field"><label>Sede / unidad</label><input id="peSEDE" value="${v('SEDE')||esc(S.empresa.sede||'')}"></div>
      <div class="field"><label>Fecha de ingreso</label><input type="date" id="peING" value="${v('FECHA_INGRESO')}"></div>
    </div>
    <label>Tallas</label>
    <div class="form-grid" style="grid-template-columns:repeat(7,1fr)">${tallas.map(([k,n])=> `<div class="field"><label>${n}</label><input id="pe${k}" value="${v(k)}"></div>`).join('')}</div>
    <datalist id="dlCargos">${[...new Set(S.personal.map(x=> x.CARGO).filter(Boolean))].map(c=> `<option>${esc(c)}</option>`).join('')}</datalist>
    <datalist id="dlAreas">${[...new Set(S.personal.map(x=> x.AREA).filter(Boolean))].map(c=> `<option>${esc(c)}</option>`).join('')}</datalist>
    <div class="err" id="peErr"></div>
    <div class="modal-actions"><button class="ghost" onclick="closeModal()">Cancelar</button><button class="primary" id="peOk">Guardar</button></div>`);
  if(p) $('peEST').value = p.ESTADO || 'ACTIVO';
  $('peOk').addEventListener('click', ()=> busy($('peOk'), async ()=>{
    const datos = { DNI: $('peDNI').value.trim() || (p ? p.DNI : ''), 'APELLIDOS Y NOMBRES': $('peNOM').value.trim(), CARGO:$('peCAR').value, AREA:$('peAREA').value,
      SEDE:$('peSEDE').value, FECHA_INGRESO:$('peING').value, ESTADO:$('peEST').value };
    tallas.forEach(([k])=> datos[k] = $('pe'+k).value);
    if(!datos.DNI){ $('peErr').textContent = 'Ingresa el DNI'; return; }
    if(/^\d+$/.test(datos.DNI) && datos.DNI.length!==8){ $('peErr').textContent = 'El DNI debe tener 8 dígitos'; return; }
    if(!datos['APELLIDOS Y NOMBRES']){ $('peErr').textContent = 'Ingresa apellidos y nombres'; return; }
    try{
      const j = await Api.call('personal_guardar', { datos, dni_original: p ? p.DNI : '' });
      if(!j.ok){ $('peErr').textContent = j.error; return; }
      closeModal(); toast('Trabajador guardado','ok'); await cargarDatos();
    }catch(e){ $('peErr').textContent = 'Sin conexión'; }
  }));
}

/* ============================================================
   PRODUCTOS
   ============================================================ */
function pintarProductos(){
  llenarCats($('qCat'));
  const q = $('qBuscar').value.trim(), cat = $('qCat').value, dup = $('qDup').checked;
  const l = S.base.filter(p=> (!cat || p.cat===cat) && (!dup || /DUPLICADO/.test(p.obs)) && (!q || matchWords(p.c+' '+p.d+' '+p.sub, q)));
  $('qTabla').tBodies[0].innerHTML = l.slice(0, 500).map(p=> `<tr><td class="small">${esc(p.c)}</td><td>${esc(p.d)}</td><td>${esc(p.cat)}</td><td class="small">${esc(p.sub)}</td>
    <td>${esc(p.um)}</td><td class="num">${p.min==null?'':fmtNum(p.min)}</td><td class="num">${p.ref?fmtSol(p.ref):''}</td><td>${p.k?esc(p.k)+' · '+esc((S.leyenda[p.k]||'').slice(0,22)):''}</td>
    <td>${p.vida==null?'':p.vida}</td><td class="small ${/DUPLICADO/.test(p.obs)?'bajo':''}">${esc(p.obs)}</td><td><button class="small ghost" data-c="${esc(p.c)}">Editar</button></td></tr>`).join('');
  $('qPie').textContent = (l.length>500?`Mostrando 500 de ${l.length}. `:`${l.length} productos. `) + 'Los inactivos no aparecen en la app (se reactivan desde la hoja, pestaña BASE).';
  $('qTabla').querySelectorAll('[data-c]').forEach(b=> b.addEventListener('click', ()=> editarProducto(S.byCode[b.dataset.c])));
}
['qBuscar','qCat','qDup'].forEach(id=> $(id).addEventListener(id==='qBuscar'?'input':'change', pintarProductos));
$('qNuevo').addEventListener('click', ()=> editarProducto(null));
function editarProducto(p){
  const cats = [...new Set(S.base.map(x=> x.cat))].sort();
  const subs = [...new Set(S.base.map(x=> x.sub))].sort();
  const ums = [...new Set(S.base.map(x=> x.um))].sort();
  const v = (k, d)=> esc(p ? (p[k]==null?'':p[k]) : (d||''));
  openModal(`<h3>${p?'Editar '+esc(p.c):'Nuevo producto'}</h3>
    <div class="form-grid">
      <div class="field span2"><label>Descripción *</label><input id="prD" value="${v('d')}"></div>
      <div class="field"><label>Categoría *</label><input id="prCat" value="${v('cat')}" list="dlCat"></div>
      <div class="field"><label>Subcategoría</label><input id="prSub" value="${v('sub')}" list="dlSub"></div>
      <div class="field"><label>Unidad de medida *</label><input id="prUM" value="${v('um','UND')}" list="dlUM"></div>
      <div class="field"><label>Stock mínimo (alerta)</label><input id="prMin" value="${v('min')}" inputmode="decimal"></div>
      <div class="field"><label>Costo referencial (S/)</label><input id="prRef" value="${p&&p.ref?p.ref:''}" inputmode="decimal" placeholder="Se usa si no hay ingresos con costo"></div>
      <div class="field"><label>Estado</label><select id="prEst"><option>ACTIVO</option><option>INACTIVO</option></select></div>
      <div class="field fx-epp"><label>Columna del kardex FO-SI-057</label><select id="prK">${Object.entries(S.leyenda).map(([n,d])=> `<option value="${n}">${n}. ${esc(d)}</option>`).join('')}</select></div>
      <div class="field fx-epp"><label>Renovar cada (meses)</label><input id="prVida" value="${v('vida')}" inputmode="numeric" placeholder="Vacío = por desgaste"></div>
    </div>
    <datalist id="dlCat">${cats.map(c=> `<option>${esc(c)}</option>`).join('')}</datalist>
    <datalist id="dlSub">${subs.map(c=> `<option>${esc(c)}</option>`).join('')}</datalist>
    <datalist id="dlUM">${ums.map(c=> `<option>${esc(c)}</option>`).join('')}</datalist>
    <div class="err" id="prErr"></div>
    <div class="modal-actions"><button class="ghost" onclick="closeModal()">Cancelar</button><button class="primary" id="prOk">Guardar</button></div>`);
  const epp = ()=> document.querySelectorAll('.fx-epp').forEach(el=> el.style.display = $('prCat').value.trim().toUpperCase()==='EPPS' ? '' : 'none');
  $('prCat').addEventListener('input', epp); epp();
  $('prK').value = String(p && p.k || 44);
  if(p) $('prEst').value = 'ACTIVO';
  $('prOk').addEventListener('click', ()=> busy($('prOk'), async ()=>{
    const datos = { CODIGO: p ? p.c : '', DESCRIPCION:$('prD').value, CATEGORIA:$('prCat').value, SUBCATEGORIA:$('prSub').value, UM:$('prUM').value,
      STOCK_MIN:$('prMin').value.trim(), COSTO_REF:$('prRef').value.trim(), KARDEX_N:$('prK').value, VIDA_MESES:$('prVida').value.trim(), ESTADO:$('prEst').value };
    if(!datos.DESCRIPCION.trim() || !datos.CATEGORIA.trim() || !datos.UM.trim()){ $('prErr').textContent = 'Descripción, categoría y unidad son obligatorias'; return; }
    try{
      const j = await Api.call('producto_guardar', { datos });
      if(!j.ok){ $('prErr').textContent = j.error; return; }
      closeModal(); toast('Producto ' + j.codigo + ' guardado','ok'); await cargarDatos();
    }catch(e){ $('prErr').textContent = 'Sin conexión'; }
  }));
}

/* ============================================================
   LABORES
   ============================================================ */
$('lNuevo').addEventListener('click', ()=> editarLabor(null));
function editarLabor(l){
  openModal(`<h3>${l?'Editar labor':'Nueva labor'}</h3><div class="form-grid">
    <div class="field"><label>Labor *</label><input id="laL" value="${esc(l?l.labor:'')}" ${l?'readonly':''}></div>
    <div class="field"><label>Estado</label><select id="laE"><option>ACTIVO</option><option>INACTIVO</option></select></div>
    <div class="field"><label>Chimenea / frente</label><input id="laF" value="${esc(l?l.frente:'')}"></div>
    <div class="field"><label>Zona</label><input id="laZ" value="${esc(l?l.zona:'')}"></div></div>
    <div class="err" id="laErr"></div>
    <div class="modal-actions"><button class="ghost" onclick="closeModal()">Cancelar</button><button class="primary" id="laOk">Guardar</button></div>`);
  if(l) $('laE').value = l.estado;
  $('laOk').addEventListener('click', ()=> busy($('laOk'), async ()=>{
    try{
      const j = await Api.call('labor_guardar', { datos:{ LABOR:$('laL').value, FRENTE:$('laF').value, ZONA:$('laZ').value, ESTADO:$('laE').value } });
      if(!j.ok){ $('laErr').textContent = j.error; return; }
      closeModal(); toast('Labor guardada','ok'); await cargarDatos();
    }catch(e){ $('laErr').textContent = 'Sin conexión'; }
  }));
}

/* ============================================================
   CELULAR DE FIRMA (vínculo por QR)
   ============================================================ */
function enlaceCelular(token){
  const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
  return base + 'firma.html#t=' + token + '&u=' + encodeURIComponent(Api.url());
}
function pintarCelular(){
  const token = lsGet('log_estacion', '');
  $('celBadge').textContent = token ? '📱 Celular vinculado' : '📱 Sin celular';
  $('celBadge').className = 'badge ' + (token ? 'ok' : 'warn');
  if(vista!=='celular') return;
  $('qrBox').innerHTML = '';
  if(!token){ $('qrInfo').textContent = 'Aún no hay un celular vinculado.'; return; }
  new QRCode($('qrBox'), { text: enlaceCelular(token), width: 240, height: 240, correctLevel: QRCode.CorrectLevel.L });
  $('qrInfo').textContent = 'Escanea con el celular de firma.';
}
$('celBadge').addEventListener('click', ()=> switchView('celular'));
$('celCrear').addEventListener('click', ()=> busy($('celCrear'), async ()=>{
  if(lsGet('log_estacion','') && !confirm('¿Generar un código nuevo? El celular vinculado antes dejará de recibir firmas de esta PC.')) return;
  try{
    const j = await Api.call('estacion_crear', { nombre:'ALMACEN' });
    if(!j.ok){ toast(j.error,'err'); return; }
    lsSet('log_estacion', j.token); pintarCelular();
  }catch(e){ toast('Sin conexión','err'); }
}));
$('celCopiar').addEventListener('click', ()=>{
  const t = lsGet('log_estacion',''); if(!t){ toast('Primero genera el código'); return; }
  navigator.clipboard.writeText(enlaceCelular(t)).then(()=> toast('Enlace copiado: envíalo al celular por WhatsApp','ok'));
});

/* ============================================================
   AJUSTES Y COLA
   ============================================================ */
function pintarAjustes(){ $('cfgUrl').value = Api.url(); pintarCola(); }
$('cfgGuardar').addEventListener('click', ()=>{ Api.setUrl($('cfgUrl').value); toast('Guardado','ok'); cargarDatos(); });
$('cfgProbar').addEventListener('click', async ()=>{
  const prev = Api.url(); Api.setUrl($('cfgUrl').value);
  $('cfgRes').textContent = 'Probando…';
  try{ const j = await Api.call('login'); $('cfgRes').textContent = j.ok ? '✅ Conectado como ' + j.nombre : '❌ ' + j.error; }
  catch(e){ $('cfgRes').textContent = '❌ No responde. Revisa que la implementación sea "Cualquier usuario" y que la URL termine en /exec.'; Api.setUrl(prev); }
});
function pintarCola(){
  const l = Cola.all();
  $('colaBadge').classList.toggle('hidden', !l.length);
  $('colaBadge').textContent = `⏳ ${l.length} vale(s) sin enviar`;
  $('colaLista').innerHTML = l.length ? l.map(it=> `<div>${esc(it.vale.tipo)} · ${fmtFecha(it.vale.fecha)} · ${it.vale.items.length} producto(s)${it.error?` · <span class="cero">${esc(it.error)}</span>`:''}</div>`).join('') : 'Ninguno.';
}
$('colaBadge').addEventListener('click', ()=> switchView('ajustes'));
$('colaReintentar').addEventListener('click', async ()=>{ const r = await Cola.flush(); pintarCola(); toast(r.enviados ? r.enviados + ' enviado(s)' : 'Nada enviado'); if(r.enviados) cargarDatos(); });
window.addEventListener('online', ()=> Cola.flush().then(r=>{ pintarCola(); if(r.enviados){ toast(r.enviados + ' vale(s) enviados','ok'); cargarDatos(); } }));

/* ============================================================
   ARRANQUE
   ============================================================ */
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
setTipo('SALIDA');
if(Api.auth()) iniciarApp();
else { $('login').classList.remove('hidden'); $('lgUrl').value = Api.url(); if(!Api.url()) $('lgCfgBox').classList.remove('hidden'); }
