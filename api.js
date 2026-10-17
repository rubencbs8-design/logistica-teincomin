// Conexión con el Apps Script (backend/Code.gs) y utilidades comunes de la app y de la página de firma.
// Todas las llamadas son POST con texto plano (evita el preflight CORS de Apps Script).

// Pegar aquí la URL /exec del Apps Script una vez implementado.
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbzYvmmkObm0cnuGAJQ8oHWF9CJSV_DP-C6olJoZ8quRFMAX4Qwet04Y1PDoP0pNQySDBw/exec';

function lsGet(k, def){ try{ const v = JSON.parse(localStorage.getItem(k)); return v==null?def:v; }catch(e){ return def; } }
function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
function esc(s){ return (s==null?'':s).toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function num(v){ if(typeof v==='number') return v; const n = parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(n)?0:n; }
function fmtNum(n, d){ return Number(n||0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: d==null?2:d }); }
function fmtSol(n){ return 'S/ ' + Number(n||0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtFecha(ymd){ const m = String(ymd||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : (ymd||''); }
function todayYmd(){ const d = new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function addMonths(ymd, n){ const [y,m,d] = ymd.split('-').map(Number); const x = new Date(y, m-1+n, d, 12); return x.toISOString().slice(0,10); }
// Mayúsculas sin tildes, para buscar sin importar acentos.
function plain(s){ return (s||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase(); }
// Busca por todas las palabras, en cualquier orden ("casco" encuentra "CASCO C/TAFILETE" y "BANDEJA TIPO CASCO").
function matchWords(text, query){
  const t = plain(text);
  return plain(query).split(/\s+/).filter(Boolean).every(w => t.includes(w));
}

const Api = {
  url(){ return lsGet('log_api_url', '') || DEFAULT_API_URL; },
  setUrl(u){ lsSet('log_api_url', (u||'').trim()); },
  auth(){ return lsGet('log_auth', null) || (()=>{ try{ return JSON.parse(sessionStorage.getItem('log_auth')); }catch(e){ return null; } })(); },
  setAuth(a, recordar){
    lsDel('log_auth'); try{ sessionStorage.removeItem('log_auth'); }catch(e){}
    if(!a) return;
    if(recordar) lsSet('log_auth', a); else try{ sessionStorage.setItem('log_auth', JSON.stringify(a)); }catch(e){}
  },
  async post(body, timeoutMs){
    const url = this.url();
    if(!url) throw new Error('Falta configurar la URL del Apps Script (Ajustes)');
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), timeoutMs || 60000);
    try{
      const res = await fetch(url, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(body), signal: ctrl.signal });
      return await res.json();
    } finally { clearTimeout(t); }
  },
  // Llamada con usuario y PIN de la sesión.
  async call(action, data, timeoutMs){
    const a = this.auth() || {};
    const j = await this.post(Object.assign({ action, u: a.u, p: a.p }, data||{}), timeoutMs);
    if(j && j.auth === false && typeof onAuthLost === 'function') onAuthLost();
    return j;
  }
};

// Cola de vales sin enviar (si se corta internet): se guardan en esta PC y se reintentan solos.
const Cola = {
  all(){ return lsGet('log_cola', []); },
  save(l){ lsSet('log_cola', l); },
  // action: 'registrar' (vale de almacén) o 'pedido_crear' (pedido de un jefe de guardia o Seguridad)
  add(vale, action){ const l = this.all(); l.push({ vale, action: action || 'registrar', intentos:0, error:'' }); this.save(l); },
  async flush(){
    const l = this.all();
    if(!l.length) return { enviados:0, quedan:0 };
    let enviados = 0;
    const quedan = [];
    for(const it of l){
      try{
        const j = it.action==='pedido_crear' ? await Api.call('pedido_crear', { pedido: it.vale }) : await Api.call('registrar', { vale: it.vale });
        if(j && j.ok){ enviados++; continue; }
        // Rechazado por la hoja (p. ej. stock): queda con el error para que el logístico lo vea.
        it.error = (j && j.error) || 'Error'; it.intentos++; quedan.push(it);
      }catch(e){ quedan.push(it); quedan.push(...l.slice(l.indexOf(it)+1)); break; }
    }
    this.save(quedan);
    return { enviados, quedan: quedan.length };
  }
};
