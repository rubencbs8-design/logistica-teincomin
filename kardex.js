// Formato FO-SI-057 "Entrega de EPP" (versión 02), una hoja A4 horizontal por cada 25 entregas
// (filas de 4 mm para que la firma se lea). Se arma en HTML con los datos de la hoja; se imprime o se
// convierte a PDF (html2pdf) y se guarda en Drive.
const Kardex = (()=>{
  const FILAS = 25;
  const css = `
  <style>
    .kx-page{ width:297mm; height:209mm; padding:6mm 6mm 5mm; background:#fff; color:#000; font-family:Arial,Helvetica,sans-serif; font-size:7pt;
      box-sizing:border-box; margin:0 auto 14px; display:flex; flex-direction:column; page-break-after:always; overflow:hidden; }
    .kx-page:last-child{ page-break-after:auto; margin-bottom:0; }
    .kx-page table{ border-collapse:collapse; width:100%; table-layout:fixed; }
    .kx-page td,.kx-page th{ border:0.6pt solid #000; padding:0.3mm 1mm; vertical-align:middle; overflow:hidden; line-height:1.15; }
    .kx-h1{ font-size:11pt; font-weight:bold; text-align:center; }
    .kx-b{ font-weight:bold; }
    .kx-c{ text-align:center; }
    .kx-gray{ background:#D9D9D9; font-weight:bold; }
    .kx-logo{ text-align:center; } .kx-logo img{ max-height:10mm; max-width:40mm; }
    .kx-num{ font-size:5.5pt; text-align:center; padding:0 !important; }
    .kx-x{ text-align:center; font-weight:bold; font-size:7.5pt; padding:0 !important; }
    .kx-firma{ padding:0 !important; text-align:center; } .kx-firma img{ max-height:3.8mm; max-width:38mm; display:block; margin:0 auto; }
    .kx-rows td{ height:4mm; padding-top:0; padding-bottom:0; line-height:1; }
    .kx-rows tr.kx-gray td{ font-size:6pt; line-height:1.1; }
    .kx-ley{ font-size:5.2pt; line-height:1.2; column-count:8; column-gap:2mm; padding:0.6mm 1.2mm !important; vertical-align:top !important; }
    .kx-foot td{ font-size:6.3pt; height:3.4mm; }
    .kx-pag{ text-align:right; font-size:6pt; margin-top:1mm; }
  </style>`;

  function x(v){ return v ? 'X' : ''; }

  // entregas: [{fecha, vale, marks:{n:true}, renov, firma}], otros: texto de "44. OTROS"
  function render(p, entregas, empresa, leyenda, firmas, otros, logoUrl){
    const paginas = [];
    const total = Math.max(1, Math.ceil(entregas.length / FILAS));
    for(let pg=0; pg<total; pg++){
      const filas = entregas.slice(pg*FILAS, (pg+1)*FILAS);
      while(filas.length < FILAS) filas.push(null);
      const nums = Array.from({length:44}, (_,i)=> i+1);
      const cols = `<colgroup><col style="width:7mm"><col style="width:15mm">${nums.map(()=>'<col style="width:4.35mm">').join('')}<col style="width:16mm"><col></colgroup>`;
      const ley = nums.map(n=> `${n}. ${esc(leyenda[n] || '')}`).join('<br>');
      paginas.push(`
      <div class="kx-page">
        <table>
          <colgroup><col style="width:46mm"><col><col style="width:38mm"><col style="width:20mm"><col style="width:20mm"></colgroup>
          <tr><td rowspan="4" class="kx-logo">${logoUrl ? `<img src="${logoUrl}">` : 'TEINCOMIN'}</td>
              <td rowspan="2" class="kx-h1">FORMULARIO</td><td colspan="3">CÓDIGO : ${esc(empresa.codigo)}</td></tr>
          <tr><td colspan="3">VERSIÓN: ${esc(empresa.version)}</td></tr>
          <tr><td rowspan="2" class="kx-h1">ENTREGA DE EPP</td><td colspan="3">FECHA: ${esc(empresa.fechaFormato)}</td></tr>
          <tr><td class="kx-c">Elaborado:<br>GSSOMA</td><td class="kx-c">Revisado:<br>RSIG</td><td class="kx-c">Aprobado:<br>RSIG</td></tr>
        </table>
        <table style="margin-top:1mm">
          <colgroup><col style="width:24%"><col style="width:11%"><col style="width:35%"><col style="width:14%"><col style="width:16%"></colgroup>
          <tr><td colspan="5" class="kx-gray">DATOS DEL EMPLEADOR:</td></tr>
          <tr class="kx-c kx-b"><td>RAZÓN SOCIAL O DENOMINACIÓN SOCIAL</td><td>RUC</td><td>DOMICILIO (Dirección, distrito, departamento, provincia)</td><td>ACTIVIDAD ECONÓMICA</td><td>N° TRABAJADORES EN EL CENTRO LABORAL</td></tr>
          <tr class="kx-c"><td>${esc(empresa.razon)}</td><td>${esc(empresa.ruc)}</td><td>${esc(empresa.domicilio)}</td><td>${esc(empresa.actividad)}</td><td>${esc(empresa.trabajadores)}</td></tr>
        </table>
        <table style="margin-top:1mm">
          <colgroup><col style="width:22%"><col style="width:5%"><col style="width:22%"><col style="width:5%"><col></colgroup>
          <tr><td colspan="5" class="kx-gray">MARCAR (X) TIPO DE EQUIPO DE SEGURIDAD O EMERGENCIA ENTREGADO</td></tr>
          <tr><td>EQUIPO DE PROTECCIÓN PERSONAL</td><td class="kx-x">X</td><td>EQUIPO DE EMERGENCIA</td><td></td><td>44. OTROS (DETALLAR): ${esc(otros)}</td></tr>
        </table>
        <table style="margin-top:1mm">
          <colgroup><col style="width:13%"><col style="width:30%"><col style="width:5%"><col style="width:11%"><col style="width:12%"><col style="width:10%"><col style="width:9%"><col></colgroup>
          <tr><td class="kx-b">APELLIDOS Y NOMBRES:</td><td>${esc(p['APELLIDOS Y NOMBRES'])}</td><td class="kx-b">DNI:</td><td>${esc(/^SIN-DNI/.test(p.DNI)?'':p.DNI)}</td>
              <td class="kx-b">FECHA DE INGRESO:</td><td>${esc(fmtFecha(p.FECHA_INGRESO))}</td><td class="kx-b">UNIDAD / SEDE:</td><td>${esc(p.SEDE || empresa.sede)}</td></tr>
          <tr><td class="kx-b">CARGO:</td><td>${esc(p.CARGO)}</td><td class="kx-b" colspan="2">TALLAS:</td>
              <td colspan="4">OVEROL: <b>${esc(p.T_OVEROL)}</b> &nbsp; PANTALÓN: <b>${esc(p.T_PANTALON)}</b> &nbsp; CAMISA: <b>${esc(p.T_CAMISA)}</b> &nbsp; POLO: <b>${esc(p.T_POLO)}</b> &nbsp;
              CHALECO: <b>${esc(p.T_CHALECO)}</b> &nbsp; ZAPATO: <b>${esc(p.T_ZAPATO)}</b> &nbsp; BOTAS: <b>${esc(p.T_BOTAS)}</b></td></tr>
        </table>
        <table style="margin-top:1mm" class="kx-rows">
          ${cols}
          <tr class="kx-gray kx-c"><td rowspan="2">ITEM</td><td rowspan="2">FECHA</td><td colspan="44">DESCRIPCIÓN</td><td rowspan="2">FECHA DE RENOVACIÓN</td><td rowspan="2">FIRMA SOLICITANTE</td></tr>
          <tr class="kx-gray">${nums.map(n=>`<td class="kx-num">${n}</td>`).join('')}</tr>
          ${filas.map((f,i)=> `<tr><td class="kx-c">${pg*FILAS+i+1}</td><td class="kx-c">${f?esc(fmtFecha(f.fecha)):''}</td>
              ${nums.map(n=>`<td class="kx-x">${f?x(f.marks[n]):''}</td>`).join('')}
              <td class="kx-c">${f&&f.renov?esc(fmtFecha(f.renov)):''}</td>
              <td class="kx-firma">${f&&f.firma&&firmas[f.firma]?`<img src="${firmas[f.firma]}">`:''}</td></tr>`).join('')}
        </table>
        <table style="margin-top:1mm">
          <tr><td class="kx-gray" style="width:16mm">LEYENDA</td><td class="kx-ley">${ley}</td></tr>
        </table>
        <table style="margin-top:1mm" class="kx-foot">
          <colgroup><col style="width:30%"><col style="width:30%"><col></colgroup>
          <tr><td colspan="2" class="kx-gray">RESPONSABLE DEL REGISTRO</td><td rowspan="3" style="vertical-align:top">Nota: entregar cada 6 meses: zapatos, overol, botas, chaleco y correa portalámpara.
              Entregar cada año: respirador y protector de cabeza.</td></tr>
          <tr><td>Nombre: ${esc(empresa.responsable||'')}</td><td>Cargo: ${esc(empresa.responsableCargo||'')}</td></tr>
          <tr><td>Fecha: ${esc(fmtFecha(todayYmd()))}</td><td>Firma:</td></tr>
        </table>
        <div class="kx-pag">Generado por la app Logística TEINCOMIN · Hoja ${pg+1} de ${total}</div>
      </div>`);
    }
    return css + paginas.join('');
  }

  // Convierte las filas de MOVIMIENTOS de un trabajador en las filas del formato (una por vale).
  function entregasDe(movs){
    const porVale = {};
    movs.filter(m=> String(m.CATEGORIA).toUpperCase()==='EPPS' && ['SALIDA','HISTORICO'].includes(String(m.TIPO).toUpperCase()) && !m.ANULADO)
      .forEach(m=>{
        const v = porVale[m.VALE] || (porVale[m.VALE] = { vale:m.VALE, fecha:m.FECHA, marks:{}, renov:'', firma:'', otros:[] });
        const n = num(m.KARDEX_N) || 44;
        v.marks[n] = true;
        if(n===44) v.otros.push(m.DESCRIPCION);
        if(m.FECHA_RENOVACION && (!v.renov || m.FECHA_RENOVACION < v.renov)) v.renov = m.FECHA_RENOVACION;
        if(m.FIRMA) v.firma = m.FIRMA;
      });
    return Object.values(porVale).sort((a,b)=> a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.vale < b.vale ? -1 : 1));
  }

  async function logoDataUrl(){
    try{
      const blob = await (await fetch('./teincomin.png')).blob();
      return await new Promise(r=>{ const fr = new FileReader(); fr.onload = ()=> r(fr.result); fr.readAsDataURL(blob); });
    }catch(e){ return ''; }
  }

  // Cada hoja se captura por separado y se agrega como una página (así no salen páginas en blanco entre hojas).
  async function pdfDataUrl(el){
    const hojas = [...el.querySelectorAll('.kx-page')];
    const opt = { margin:0, image:{ type:'jpeg', quality:0.92 }, html2canvas:{ scale:2, useCORS:true, backgroundColor:'#ffffff' },
      jsPDF:{ unit:'mm', format:'a4', orientation:'landscape' }, pagebreak:{ mode:[] } };
    let w = html2pdf().set(opt).from(hojas[0]).toPdf();
    hojas.slice(1).forEach(h=>{ w = w.get('pdf').then(pdf=> pdf.addPage()).from(h).toContainer().toCanvas().toPdf(); });
    return w.outputPdf('datauristring');
  }

  return { render, entregasDe, logoDataUrl, pdfDataUrl };
})();
