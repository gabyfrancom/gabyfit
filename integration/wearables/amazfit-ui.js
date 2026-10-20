(function(){
 if(window.__evolusaludAmazfitProduction)return;window.__evolusaludAmazfitProduction=true;
 const state={loading:false,data:null,error:null,last:0,selected:null,archive:[],nextBefore:undefined,olderLoading:false,olderError:null};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fields={steps:['steps',1],workout_duration:['exerciseMin',1],sleep_duration:['sleepSession',1],oxygen_saturation:['spo2',1],resting_heart_rate:['rhr',1],distance:['dist',0.001],active_calories:['kcal',1],total_calories:['totalKcal',1],hrv_rmssd:['hrv',1],respiratory_rate:['respiratory',1],vo2_max:['vo2',1],weight:['watchWeight',1],body_fat:['watchFat',1],body_temperature:['bodyTemp',1],speed:['speedKmh',3.6],cadence:['cadence',1],power:['power',1],elevation_gain:['ascent',1]};
 function days(){const out={};for(const r of [...state.archive,...(state.data?.daily||[])]){const d=out[r.date]||(out[r.date]={date:r.date});if(r.metric==='heart_rate'){d.hrAvg=r.mean;d.hrMin=r.minimum;d.hrMax=r.maximum;continue;}const f=fields[r.metric];if(f)d[f[0]]=(['steps','distance','active_calories','total_calories','workout_duration','sleep_duration','elevation_gain'].includes(r.metric)?r.total:r.mean)*f[1];}for(const d of Object.values(out)){const e=energyDay(d.date);if(e.rest!=null)d.restKcal=e.rest;}return out;}
 function status(){return '<div class="small muted" style="margin:8px 0">'+(state.loading?'Actualizando desde el móvil…':state.error?esc(state.error):state.data?.lastSync?'Sincronización automática · último lote: '+esc(new Date(state.data.lastSync.replace(' ','T')+(state.data.lastSync.endsWith('Z')?'':'Z')).toLocaleString('es-ES',{timeZone:'Atlantic/Canary'})):'Esperando sincronización del móvil.')+' <button class="btn sm" id="evoWearableRefresh">Actualizar datos</button> <a href="/api/wearables/export">Descargar registros</a></div>';}
 function extra(base){const ds=Object.values(days()).sort((a,b)=>b.date.localeCompare(a.date));const last=k=>ds.find(d=>d[k]!=null);
 const card=(k,label,u)=>{const r=last(k);return '<div class="stat"><div class="l">'+label+'</div><div class="v num">'+(r?esc(Number(r[k]).toLocaleString('es-ES',{maximumFractionDigits:1})):'—')+' <small>'+u+'</small></div><div class="small muted">'+(r?esc(fdate(r.date))+' · Zepp / Health Connect':'Sin datos automáticos recibidos')+'</div></div>';};
 const more=[['exerciseMin','Entrenamientos','min'],['sleepSession','Sesión de sueño','min'],['totalKcal','Calorías totales','kcal'],['respiratory','Frecuencia respiratoria','rpm'],['vo2','VO₂máx','ml/kg/min'],['watchWeight','Peso del dispositivo','kg'],['watchFat','Grasa corporal del dispositivo','%'],['bodyTemp','Temperatura corporal','°C'],['speedKmh','Velocidad media de las muestras','km/h'],['cadence','Cadencia media de las muestras','pasos/min'],['power','Potencia media de las muestras','W'],['ascent','Ascenso acumulado','m']].filter(([k])=>last(k));
 const missing=[['rhr','FC en reposo','lpm'],['spo2','SpO₂','%'],['hrv','HRV','ms']].filter(([k])=>!S.body.some(b=>b[k]!=null)&&!last(k));
 const cards=more.concat(missing).map(x=>card(...x)).join('');
 const note='<p class="small muted">Los datos automáticos sustituyen en pantalla la misma métrica y día importados; no se suman ambas fuentes. SpO₂, FC en reposo y HRV conservan los valores manuales o importados mientras no haya datos automáticos. Los campos sin datos de Health Connect no se estiman. La sesión de sueño incluye posibles periodos despierta.</p>';
 return base ? base.replace(/<\/div>\s*$/, (cards?'<div class="stats" style="margin-top:12px">'+cards+'</div>':'')+note+'</div>'):'<div class="panel"><div class="eyebrow">Reloj · salud</div><div class="stats">'+cards+'</div>'+note+'</div>';
 }
 function withDays(fn){const old=S.body;const D=days(),merged=old.map(b=>{const d=D[b.date];if(!d)return b;const o={...b};for(const k of ['rhr','spo2','hrv','hrAvg','hrMin','hrMax'])if(d[k]!=null)o[k]=d[k];return o;});for(const d of Object.values(D))if(!old.some(b=>b.date===d.date))merged.push({date:d.date,...Object.fromEntries(['rhr','spo2','hrv','hrAvg','hrMin','hrMax'].filter(k=>d[k]!=null).map(k=>[k,d[k]]))});S.body=merged;try{return fn();}finally{S.body=old;}}
 function draw(){if(document.getElementById('bodyForm'))fillCardioForm();if(typeof tab!=='undefined'&&tab==='cardio'){drawCardio();return;}if(typeof tab!=='undefined'&&tab==='food'){drawNutrition();return;}if(typeof tab==='undefined'||tab!=='body')return;const a=document.getElementById('evo-watch-activity'),b=document.getElementById('evo-watch-health');if(a)a.outerHTML=watchPanel();if(b)b.outerHTML=watchExtra();document.getElementById('evo-body-watch')?.remove();}
 async function refresh(){if(state.loading)return;state.loading=true;state.last=Date.now();state.error=null;draw();try{const r=await fetch('/api/wearables/status',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error('No se pudo actualizar (HTTP '+r.status+')');state.data=await r.json();}catch(e){state.error=e.message;}finally{state.loading=false;draw();}}

 const historyFields=[
 ['steps','Pasos','pasos'],['active','Tiempo activo','min'],['kcal','Calorías en movimiento','kcal'],['restKcal','Calorías en reposo (por diferencia)','kcal'],['dist','Distancia','km'],
 ['rhr','FC en reposo','lpm'],['hrAvg','Pulso medio','lpm'],['hrMin','Pulso mínimo','lpm'],['hrMax','Pulso máximo','lpm'],
 ['spo2','Oxígeno en sangre (SpO₂)','%'],['hrv','HRV (RMSSD si es automático)','ms'],['sleep','Sueño importado','h'],
 ['sleepSession','Sesión de sueño','min'],['deep','Sueño profundo','h'],['light','Sueño ligero','h'],['rem','Sueño REM','h'],['awake','Tiempo despierta','h'],
 ['sleepScore','Puntuación del sueño',''],['exerciseMin','Entrenamientos','min'],['totalKcal','Calorías totales','kcal'],['respiratory','Frecuencia respiratoria','rpm'],
 ['vo2','VO₂máx','ml/kg/min'],['stress','Estrés','/100'],['pai','PAI',''],['skinTemp','Temperatura de piel','°C'],
 ['watchWeight','Peso del dispositivo','kg'],['watchFat','Grasa del dispositivo','%'],['bodyTemp','Temperatura corporal','°C'],['speedKmh','Velocidad media de las muestras','km/h'],['cadence','Cadencia media de las muestras','pasos/min'],['power','Potencia media de las muestras','W'],['ascent','Ascenso acumulado','m']];
 function historyDays(){
  const out={};
  for(const b of S.body||[]){for(const [k]of historyFields)if(typeof b[k]==='number'&&Number.isFinite(b[k])){
   const d=out[b.date]||(out[b.date]={date:b.date,values:{}});d.values[k]={value:b[k],source:'Importado o manual'};}}
  for(const w of S.workouts||[]){if(!w.date||typeof w.min!=='number')continue;const d=out[w.date]||(out[w.date]={date:w.date,values:{}});const n=d.values.exerciseMin?.value||0;d.values.exerciseMin={value:n+w.min,source:'Entrenamientos importados'};}
  for(const d of Object.values(days())){const row=out[d.date]||(out[d.date]={date:d.date,values:{}});for(const [k]of historyFields)if(d[k]!=null)row.values[k]={value:d[k],source:'Zepp · Health Connect'};}
  return out;
 }
 function historyView(){
  const D=historyDays(),dates=Object.keys(D).sort().reverse(),chosen=state.selected||dates[0]||'',row=D[chosen],idx=dates.indexOf(chosen);
  const format=v=>Number(v).toLocaleString('es-ES',{maximumFractionDigits:1});
  const cols=historyFields.filter(([k])=>dates.some(d=>D[d].values[k]!=null));
  const cards=historyFields.filter(([k])=>row?.values[k]!=null||['kcal','restKcal','totalKcal'].includes(k)).map(([k,l,u])=>{const v=row?.values[k]||{value:null,source:'Pendiente de datos del reloj'};return '<div class="stat"><div class="l">'+esc(l)+'</div><div class="v num">'+(v.value==null?'—':esc(format(v.value)))+' <small>'+esc(u)+'</small></div><div class="small muted">'+esc(v.source)+'</div></div>';}).join('');
  const cursor=state.nextBefore!==undefined?state.nextBefore:state.data?.nextBefore;
  return '<div class="panel" style="margin-top:14px"><div class="eyebrow">Reloj · historial diario</div><h3>Datos del '+(chosen?esc(fdate(chosen)):'reloj')+'</h3>'+
  '<div class="row" style="gap:8px;flex-wrap:wrap;margin:12px 0"><button class="btn sm" data-watch-date="'+esc(dates[idx+1]||'')+'" '+(idx<0||idx>=dates.length-1?'disabled':'')+'>← Día anterior</button>'+
  '<label for="evoWatchDate">Ver día</label><input id="evoWatchDate" type="date" value="'+esc(chosen)+'" '+(dates.length?'min="'+dates[dates.length-1]+'" max="'+dates[0]+'"':'')+' style="width:auto">'+
  '<button class="btn sm" data-watch-date="'+esc(dates[idx-1]||'')+'" '+(idx<=0?'disabled':'')+'>Día siguiente →</button><button class="btn sm" id="evoWatchLatest">Último día</button></div>'+
  (cards?'<div class="stats">'+cards+'</div>':'<p class="muted">No hay registros recibidos o importados para este día.</p>')+
  '<p class="small muted">Cada fecha conserva sus datos. Un dato automático sustituye en esta vista la misma métrica y fecha importadas, sin sumarlos. No se rellenan días sin mediciones. Las fechas usan el horario de Canarias. Oxígeno y pulso en reposo: media de las lecturas recibidas ese día. Sesión de sueño: duración de la sesión, incluidos posibles periodos despierta.</p>'+
  '<details class="wlist"><summary>Ver días registrados ('+dates.length+')</summary><div class="tbl-wrap" style="margin-top:10px;overflow:auto"><table><thead><tr><th>Día</th>'+cols.map(([,l,u])=>'<th>'+esc(l)+(u?' ('+esc(u)+')':'')+'</th>').join('')+'<th></th></tr></thead><tbody>'+
  dates.map(d=>'<tr><td>'+esc(fdate(d))+'</td>'+cols.map(([k])=>'<td class="num">'+(D[d].values[k]?esc(format(D[d].values[k].value)):'—')+'</td>').join('')+'<td><button class="btn sm" data-watch-date="'+d+'">Ver día</button></td></tr>').join('')+
  '</tbody></table></div></details>'+(cursor?'<button class="btn sm" id="evoWatchOlder" style="margin-top:12px" '+(state.olderLoading?'disabled':'')+'>'+(state.olderLoading?'Cargando…':'Cargar días anteriores')+'</button>':'')+
  (state.olderError?'<p class="small">'+esc(state.olderError)+'</p>':'')+'</div>';
 }
 async function loadOlder(){
  const cursor=state.nextBefore!==undefined?state.nextBefore:state.data?.nextBefore;if(!cursor||state.olderLoading)return;
  state.olderLoading=true;state.olderError=null;draw();
  try{const r=await fetch('/api/wearables/status?before='+encodeURIComponent(cursor),{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error('No se pudieron cargar los días anteriores (HTTP '+r.status+')');const data=await r.json();const records=new Map(state.archive.map(r=>[r.date+'|'+r.metric,r]));for(const row of data.daily||[])records.set(row.date+'|'+row.metric,row);state.archive=Array.from(records.values());state.nextBefore=data.nextBefore||null;}
  catch(e){state.olderError=e.message;}finally{state.olderLoading=false;draw();}
 }


 function energyDay(date){
  const rows=(state.data?.daily||[]).concat(state.archive||[]).filter(r=>r.date===date);
  const a=rows.find(r=>r.metric==='active_calories'),t=rows.find(r=>r.metric==='total_calories');
  const matched=!!(a&&t&&a.coverage_hash&&a.coverage_hash===t.coverage_hash&&a.samples===t.samples&&t.total>=a.total);
  return {active:a?.total??null,total:t?.total??null,rest:matched?t.total-a.total:null,matched};
 }
 function nutritionView(){
  const date=typeof nDate!=='undefined'&&nDate?nDate:today(),D=historyDays(),r=D[date],e=energyDay(date);
  const val=(k)=>r?.values[k]?.value;
  const card=(l,v,u,note='')=>'<div class="stat"><div class="l">'+esc(l)+'</div><div class="v num">'+(v==null?'—':esc(Number(v).toLocaleString('es-ES',{maximumFractionDigits:1})))+' <small>'+esc(u)+'</small></div><div class="small muted">'+esc(note)+'</div></div>';
  const active=e.active??val('kcal'),total=e.total??val('totalKcal'),rest=e.rest;
  const f=typeof foodDays==='function'?foodDays()[date]:null;
  const T=typeof nTargets==='function'?nTargets():null;
  const intake=f?.t?.kcal??null;
  return '<div class="panel" style="margin-top:14px"><div class="eyebrow">Reloj · nutrición</div><h3>Actividad y energía · '+esc(fdate(date))+'</h3><div class="stats">'+
  card('Calorías en movimiento',active,'kcal',e.active!=null?'Zepp · Health Connect':active!=null?'Importado o manual':'Pendiente del reloj')+
  card('Calorías en reposo',rest,'kcal',rest!=null?'Total menos activas · mismos intervalos':'Pendiente: faltan intervalos comparables')+
  card('Calorías totales recibidas',total,'kcal','Pueden ser parciales; no añadir de nuevo las activas')+
  card('Energía de comidas registradas',intake,'kcal','Solo alimentos guardados para esta fecha')+
  (intake!=null&&total!=null?card('Comidas menos gasto recibido',intake-total,'kcal','Balance provisional; no equivale al balance diario completo'):'')+
  card('Metabolismo basal estimado',T?.bmr??null,'kcal/día','Fórmula del perfil actual; no es una lectura del reloj')+
  [['steps','Pasos','pasos'],['dist','Distancia','km'],['active','Tiempo activo','min'],['exerciseMin','Entrenamientos','min'],['sleep','Sueño importado','h'],['sleepSession','Sesión de sueño','min'],['hrAvg','Pulso medio','lpm'],['rhr','Pulso en reposo','lpm'],['watchWeight','Peso del reloj','kg'],['watchFat','Grasa corporal del reloj','%']].filter(([k])=>val(k)!=null).map(([k,l,u])=>card(l,val(k),u,r.values[k].source)).join('')+
  '</div><p class="small muted">Las calorías del reloj son estimaciones y pueden llegar incompletas. El reposo por diferencia solo se muestra cuando total y activas cubren exactamente los mismos intervalos. El objetivo usa los pasos de días anteriores recibidos cuando el perfil no fija un nivel de actividad. Este resumen no suma calorías del ejercicio al objetivo de comida ni sustituye el objetivo configurado. Sueño, pulso y composición corporal aportan contexto; no generan ajustes automáticos de dieta.</p><button class="btn sm" id="evoWearableRefresh">Actualizar reloj</button></div>';
 }
 function drawNutrition(){
  if(typeof tab==='undefined'||tab!=='food')return;
  const root=document.getElementById('view');if(!root)return;
  let panel=document.getElementById('evo-nutrition-watch');
  if(!panel){panel=document.createElement('section');panel.id='evo-nutrition-watch';const anchor=root.querySelector('.nday');if(anchor)anchor.after(panel);else root.appendChild(panel);}
  panel.innerHTML=nutritionView();
 }


 let cvDraft=null;
 function cardioValues(date){
  const d=days()[date]||{},out={};
  const map={steps:'steps',kcal:'kcal',dist:'dist',rhr:'rhr',hrv:'hrv',vo2:'vo2',spo2:'spo2',watchWeight:'weight',watchFat:'fat'};
  for(const [k,f]of Object.entries(map))if(d[k]!=null)out[f]={value:d[k],note:'Zepp · Health Connect · '+fdate(date)+' · resumen diario'};
  const latest=state.data?.latest?.find(r=>r.metric==='heart_rate'&&new Intl.DateTimeFormat('en-CA',{timeZone:'Atlantic/Canary',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(r.end_time))===date);
  if(latest)out.hr={value:latest.value,note:'Zepp · Health Connect · '+new Date(latest.end_time).toLocaleString('es-ES',{timeZone:'Atlantic/Canary'})};
  else if(d.hrAvg!=null)out.hr={value:d.hrAvg,note:'Zepp · Health Connect · media del '+fdate(date)};
  return out;
 }
 function fillCardioForm(){
  const form=document.getElementById('bodyForm'),date=document.getElementById('b_date')?.value;
  if(!form||!date||!cvDraft)return;
  if(cvDraft.form!==form){cvDraft.form=form;cvDraft.auto={};}
  for(const [key,value]of Object.entries(cvDraft.auto)){const input=document.getElementById('b_'+key);if(input&&input.value===String(value)){input.value='';}document.getElementById('evo-origin-'+key)?.remove();}
  cvDraft.auto={};
  const values=cardioValues(date);
  for(const [key,data]of Object.entries(values)){const input=document.getElementById('b_'+key);if(!input||input.value!==''||cvDraft.edited.has(key))continue;
   const value=Math.round(data.value*10)/10;input.value=String(value);cvDraft.auto[key]=value;
   const note=document.createElement('small');note.id='evo-origin-'+key;note.className='muted';note.textContent=data.note;input.after(note);
  }
  let note=document.getElementById('evo-cardio-autofill');if(!note){note=document.createElement('p');note.id='evo-cardio-autofill';note.className='small muted';note.style.gridColumn='1/-1';form.prepend(note);}
  note.textContent=state.loading?'Consultando datos del reloj…':'Se completan solo campos vacíos con registros del reloj de esta fecha. Revisa las cifras antes de guardar. La tensión arterial, la glucosa y los perímetros requieren mediciones propias; no se deducen del pulso. El sueño de sesión no se copia como sueño efectivo.';
  for(const h of form.querySelectorAll('.fieldset-h'))if(h.textContent==='Reloj (Zepp / Amazfit)'){h.textContent='Datos del reloj';const p=h.nextElementSibling;if(p?.tagName==='P')p.textContent='Datos sincronizados de la fecha elegida. Puedes revisar o completar los campos que falten.';}
 }
 function drawCardio(){
  if(document.getElementById('bodyForm')){fillCardioForm();return;}
  if(!document.getElementById('modalRoot')?.innerHTML)render();
 }
 function attachCardio(){
  if(typeof openBodyForm==='function'){const original=openBodyForm;openBodyForm=function(b){const r=original.apply(this,arguments);cvDraft={form:document.getElementById('bodyForm'),auto:{},edited:new Set()};fillCardioForm();if(!state.loading&&Date.now()-state.last>60000)void refresh();return r;};}
  if(typeof cvInputs==='function'){const original=cvInputs;cvInputs=function(){const I=original.apply(this,arguments);
   const D=days(),from=addDays(today(),-30),records=Object.values(D).filter(d=>d.date>=from&&d.date<today()&&typeof d.steps==='number');
   if(records.length)I.stepsAvg={v:records.reduce((a,d)=>a+d.steps,0)/records.length,n:records.length,source:'Health Connect'};
   const newest=key=>Object.values(D).filter(d=>d[key]!=null&&d.date<=today()).sort((a,b)=>b.date.localeCompare(a.date))[0];
   const r=newest('rhr');if(r&&(!I.rhr||r.date>=I.rhr.date))I.rhr={date:r.date,rhr:r.rhr,source:'Health Connect'};
   const w=newest('watchWeight');if(w&&(!I.wb||w.date>=I.wb.date))I.wb={date:w.date,weight:w.watchWeight,source:'Health Connect'};
   return I;
  };}
  if(typeof vCardio==='function'){const original=vCardio;vCardio=function(){return original.apply(this,arguments)+'<div class="panel small muted">Datos del reloj: pasos medios de días anteriores recibidos, pulso en reposo y peso cuando existen. La tensión conserva su propia medición. El pulso normal no sustituye al pulso en reposo.<button class="btn sm" id="evoWearableRefresh">Actualizar reloj</button></div>';};}
  document.addEventListener('input',e=>{if(cvDraft&&e.target.closest('#bodyForm')&&e.target.id.startsWith('b_')&&e.target.id!=='b_date'){const k=e.target.id.slice(2);cvDraft.edited.add(k);delete cvDraft.auto[k];document.getElementById('evo-origin-'+k)?.remove();}});
  document.addEventListener('change',e=>{if(e.target.id==='b_date'&&cvDraft){cvDraft.edited.clear();fillCardioForm();}});
 }


 function sportData(){
  const p=S.profile?.sports||{},I=cvInputs(),D=historyDays();
  const latest=k=>Object.keys(D).sort().reverse().map(date=>({date,...D[date].values[k]})).find(x=>x.value!=null);
  const rhr=I.rhr?.rhr??null,vo=p.vo2??latest('vo2')?.value??null,a=typeof age==='function'?age():null;
  const max=p.maxHr??(a!=null?208-0.7*a:null),reserve=max!=null&&rhr!=null&&max>rhr?max-rhr:null;
  const recovery=p.endHr!=null&&p.hr1min!=null&&p.endHr>=p.hr1min?p.endHr-p.hr1min:null;
  const equivalents=p.moderate!=null&&p.vigorous!=null?p.moderate+2*p.vigorous:null;
  return {p,I,rhr,vo,max,reserve,recovery,equivalents};
 }
 function sportPanel(){
  const x=sportData(),number=v=>v==null?'—':esc(Number(v).toLocaleString('es-ES',{maximumFractionDigits:1}));
  const card=(label,v,unit,note)=>'<div class="stat"><div class="l">'+esc(label)+'</div><div class="v num">'+number(v)+' <small>'+esc(unit)+'</small></div><p class="small muted">'+esc(note)+'</p></div>';
  return '<section class="panel" id="evo-sport-cardio" style="margin-top:14px"><div class="row" style="justify-content:space-between"><div><div class="eyebrow">Resistencia · condición física y recuperación</div><h3>Perfil deportivo</h3></div><button class="btn sm" id="evoSportForm">Completar datos deportivos</button></div>'+
  '<p class="small muted">'+(x.p.date?'Datos deportivos declarados con fecha '+esc(fdate(x.p.date))+'.':'Completa datos actuales; no se infiere tu carga de entrenamiento por haber corrido maratones.')+'</p><div class="stats" style="margin-top:12px">'+
  card('Pulso en reposo',x.rhr,'lpm',x.I.rhr?'Dato del '+fdate(x.I.rhr.date)+'. Se interpreta con tu patrón habitual y síntomas.':'Pendiente de una lectura específica en reposo.')+
  card(x.p.maxHr!=null?'FC máxima de prueba registrada':'FC máxima estimada · Tanaka',x.max,'lpm',x.p.maxHr!=null?'Dato introducido de una prueba supervisada.':'208 − 0,7 × edad. Referencia poblacional, no máximo individual ni objetivo de entrenamiento.')+
  card('Reserva cardíaca',x.reserve,'lpm','FC máxima − FC en reposo. Si la máxima es estimada, también lo es esta reserva.')+
  card('Recuperación del pulso al minuto',x.recovery,'lpm','FC al terminar − FC tras 1 minuto, de la misma prueba y protocolo. No se obtiene del máximo diario.')+
  card('VO₂máx registrado',x.vo,'ml/kg/min',x.p.vo2!=null?'Valor de prueba introducido por ti.':'Valor declarado/importado o del dispositivo; no equivale a una medición de laboratorio.')+
  card('Capacidad en MET · estimación convencional',x.vo!=null?x.vo/3.5:null,'MET','VO₂máx ÷ 3,5. Conversión orientativa, no gasto calórico del entrenamiento.')+
  card('Actividad semanal equivalente',x.equivalents,'min/sem','Minutos moderados + 2 × minutos vigorosos. No incluye automáticamente pasos ni minutos de sesión sin intensidad.')+
  '</div><p class="small muted">Estos indicadores describen condición física y recuperación; no son una puntuación de riesgo de infarto. La frecuencia en reposo puede ser menor en deportistas de resistencia: se valora con síntomas y tendencia, no solo con un corte general. No se diagnostica sobreentrenamiento con el pulso o la HRV aislados. Con SAF y anticoagulación, las intensidades y una prueba máxima se acuerdan con tu equipo médico; estas fórmulas no autorizan una intensidad concreta.</p>'+
  '<details><summary>Fórmulas y fuentes</summary><p class="small">Karvonen: FC de referencia = FC en reposo + fracción de intensidad × reserva cardíaca. Se muestra la fórmula, sin asignarte zonas automáticas.</p><p class="small"><a href="https://pubmed.ncbi.nlm.nih.gov/11153730/" target="_blank" rel="noopener noreferrer">Tanaka: FC máxima</a> · <a href="https://www.heart.org/en/healthy-living/exercise-and-physical-activity/fitness-basics/aha-recs-for-physical-activity-in-adults/" target="_blank" rel="noopener noreferrer">AHA: actividad moderada y vigorosa</a></p></details>'+
  '<h3 style="margin-top:18px">Alimentación cardiovascular y deporte</h3><p>El test MEDAS valora adherencia mediterránea; no mide tu rendimiento deportivo. DASH es otra referencia cardiovascular. La alimentación de resistencia requiere además valorar energía disponible, recuperación y carga de entrenamiento.</p><button class="btn sm" id="evoDietModels">Ver otros enfoques</button></section>';
 }
 function sportForm(){
  const p=S.profile?.sports||{},f=(k,l,u)=>'<div class="field"><label for="sport_'+k+'">'+l+' ('+u+')</label><input id="sport_'+k+'" type="number" step="any" min="0" value="'+esc(p[k]??'')+'"></div>';
  modal('Datos deportivos', '<form class="form" id="evoSportFormFields"><div class="field"><label for="sport_date">Fecha de referencia</label><input id="sport_date" type="date" value="'+esc(p.date||today())+'"></div>'+
  f('moderate','Actividad moderada de los últimos 7 días','min')+f('vigorous','Actividad vigorosa de los últimos 7 días','min')+
  f('maxHr','FC máxima de una prueba supervisada ya realizada','lpm')+f('vo2','VO₂máx de prueba, si lo conoces','ml/kg/min')+
  f('endHr','FC al finalizar la prueba de recuperación','lpm')+f('hr1min','FC al minuto de esa misma prueba','lpm')+
  '<p class="small muted" style="grid-column:1/-1">Cada minuto se cuenta una sola vez como moderado o vigoroso. Deja vacíos los datos desconocidos. No realices una prueba máxima para completar este formulario. La recuperación requiere el mismo protocolo y condiciones; no se puntúa sin ese contexto.</p></form>',
  '<button class="btn ghost" data-act="close">Cancelar</button><button class="btn primary" id="evoSportSave">Guardar datos deportivos</button>');
 }
 async function saveSport(){
  const p={date:document.getElementById('sport_date').value||today()},limits={moderate:10080,vigorous:10080,maxHr:250,vo2:120,endHr:250,hr1min:250};
  for(const [k,limit]of Object.entries(limits)){const text=document.getElementById('sport_'+k).value;if(text==='')continue;const value=Number(text);if(!Number.isFinite(value)||value<0||value>limit||(['maxHr','vo2','endHr','hr1min'].includes(k)&&value===0)){toast('Revisa los valores deportivos.');return;}p[k]=value;}
  if((p.moderate||0)+(p.vigorous||0)>10080){toast('Los minutos superan los de una semana.');return;}
  if(p.endHr!=null&&p.hr1min!=null&&p.hr1min>p.endHr){toast('La FC al minuto supera la final: revisa la prueba; no se calculará recuperación.');return;}
  try{await DB.doc('profile/main').update({sports:p});closeModal();render();toast('Datos deportivos guardados');}catch{toast('No se pudieron guardar los datos deportivos.');}
 }
 function sportDiet(){
  modal('Enfoques alimentarios', '<p><b>Mediterráneo / MEDAS:</b> cuestionario de adherencia alimentaria. No evalúa capacidad aeróbica ni necesidades de una maratón.</p><p><b>DASH:</b> patrón cardiovascular que prioriza fruta, verdura, legumbres, cereales integrales y limita grasas saturadas. Es una alternativa de referencia, no un nuevo test puntuado en esta app. <a href="https://www.nhlbi.nih.gov/health/dash-eating-plan" target="_blank" rel="noopener noreferrer">Referencia NHLBI</a>.</p><p><b>Nutrición de resistencia:</b> registra comidas, gasto recibido, entrenamientos y recuperación en Nutrición. El reloj puede aportar contexto, pero no determina por sí solo cuánto debes comer ni tus necesidades de sodio e hidratación en una prueba larga.</p><p class="small muted">Con Sintrom, mantén una ingesta habitual y estable de vitamina K al adaptar tu alimentación. No se aplican cambios automáticos a tu dieta ni a tu medicación.</p>','<button class="btn" data-act="close">Cerrar</button>');
 }
 function attachSport(){
  const original=vCardio;vCardio=function(){return original.apply(this,arguments)+sportPanel();};
  if(typeof cvInputs==='function'){const originalInputs=cvInputs;cvInputs=function(){const I=originalInputs.apply(this,arguments),p=I.p.sports;if(p&&p.date>=addDays(today(),-7)&&p.date<=today()&&p.moderate!=null&&p.vigorous!=null)I.p={...I.p,paMin:p.moderate+2*p.vigorous};return I;};}
  if(typeof le8==='function'){const originalLE8=le8;le8=function(I){const result=originalLE8(I),p=I.p.sports;if(p&&p.date>=addDays(today(),-7)&&p.date<=today()&&p.moderate!=null&&p.vigorous!=null){const component=result.m.find(m=>m.k==='pa');if(component)component.detail=p.moderate+' min moderados + '+p.vigorous+' min vigorosos = '+(p.moderate+2*p.vigorous)+' min equivalentes/semana (declarados, '+fdate(p.date)+')';}return result;};}
  document.addEventListener('click',e=>{if(e.target.closest('#evoSportForm')){e.preventDefault();sportForm();}else if(e.target.closest('#evoSportSave')){e.preventDefault();void saveSport();}else if(e.target.closest('#evoDietModels')){e.preventDefault();sportDiet();}});
 }

 function attach(){if(typeof watchPanel!=='function'||typeof watchExtra!=='function'||typeof wDays!=='function')return;
 const oldDays=wDays,oldPanel=watchPanel,oldExtra=watchExtra,oldRender=render;
 if(typeof avgSteps==='function'){const originalAvgSteps=avgSteps;avgSteps=function(n=14){const end=today(),from=addDays(end,-n),xs=Object.values(wDays()).filter(d=>d.date>=from&&d.date<end&&typeof d.steps==='number').map(d=>d.steps);return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:originalAvgSteps(n);};}
 wDays=function(){const o=oldDays();for(const [date,d]of Object.entries(days())){o[date]={...(o[date]||{date})};for(const k of ['steps','dist','kcal'])if(d[k]!=null)o[date][k]=d[k];}return o;};
 watchPanel=function(){return '<section id="evo-watch-activity">'+status()+oldPanel()+'</section>';};
 watchExtra=function(){return '<section id="evo-watch-health">'+historyView()+'</section>';};
 for(let i=TABS.length-1;i>=0;i--)if(TABS[i][0]==='wearable')TABS.splice(i,1);
 render=function(){if(tab==='wearable')tab='body';const r=oldRender.apply(this,arguments);if(tab==='food')drawNutrition();if((tab==='body'||tab==='food'||tab==='cardio')&&!state.loading&&Date.now()-state.last>60000)void refresh();return r;};
 document.addEventListener('click',e=>{
 const day=e.target.closest('[data-watch-date]');
 if(day){e.preventDefault();if(day.dataset.watchDate){state.selected=day.dataset.watchDate;draw();}}
 else if(e.target.closest('#evoWatchLatest')){e.preventDefault();state.selected=null;draw();}
 else if(e.target.closest('#evoWatchOlder')){e.preventDefault();void loadOlder();}
 else if(e.target.closest('#evoWearableRefresh')){e.preventDefault();void refresh();}
 },true);
 document.addEventListener('change',e=>{if(e.target.id==='evoWatchDate'){state.selected=e.target.value||null;draw();}});
 attachCardio();attachSport();renderNav();render();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();

;(function(){
 if(window.__evoClinicalSports)return;window.__evoClinicalSports=true;
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tools={
 run:{"name":"Detalle de carrera y entrenamiento","source":"","fields":[["distanceKm","Distancia","km",0.01,1000],["minutes","Duración (minutos decimales)","min",0.01,10080],["paceAvg","Ritmo medio","seg/km",30,3600],["paceBest","Mejor ritmo","seg/km",30,3600],["hrAvg","Pulso medio","lpm",20,250],["hrMax","Pulso máximo de la sesión","lpm",20,250],["kcal","Energía de la sesión según dispositivo","kcal",0,30000],["cadenceAvg","Cadencia media","pasos/min",0,350],["cadenceMax","Cadencia máxima","pasos/min",0,350],["powerAvg","Potencia media","W",0,3000],["powerMax","Potencia máxima","W",0,3000],["altAvg","Elevación media","m",-500,10000],["altMin","Elevación mínima","m",-500,10000],["altMax","Elevación máxima","m",-500,10000],["ascent","Ascenso acumulado","m",0,15000],["strideAvg","Zancada media","cm",1,400],["strideMax","Zancada máxima","cm",1,400],["verticalAvg","Oscilación vertical media","cm",0,30],["verticalMax","Oscilación vertical máxima","cm",0,30],["groundAvg","Contacto con el suelo medio","ms",1,1500],["groundMin","Contacto con el suelo mínimo","ms",1,1500],["zeppLoad","Carga estimada por Zepp (distinta de session-RPE)","UA Zepp",0,10000],["aerobicEffect","Efecto aeróbico según Zepp","0–5",0,5],["anaerobicEffect","Efecto anaeróbico según Zepp","0–5",0,5]],"note":"Registro por sesión con fecha y procedencia. Completa solo datos disponibles. Ritmo en segundos/km (09:42 = 582); duración en minutos decimales. Potencia, carga y efectos son estimaciones del dispositivo, no mediciones clínicas ni session-RPE. Las calorías de esta sesión no se suman automáticamente al gasto diario para evitar duplicados. La sincronización automática depende de lo que la fuente exporte a Health Connect."},
 cunningham:{name:'Metabolismo en reposo · Cunningham',source:'https://pubmed.ncbi.nlm.nih.gov/8537566/',fields:[['ffm','Masa libre de grasa (no masa muscular)','kg',1,250]],note:'500 + 22 × masa libre de grasa. Estimación de gasto en reposo; no calorías totales diarias. No sustituye la calorimetría indirecta.'},
 availability:{name:'Disponibilidad energética',source:'https://doi.org/10.1136/bjsports-2023-106994',fields:[['ffm','Masa libre de grasa','kg',1,250],['intake','Ingesta del día completo','kcal',0,30000],['exerciseNet','Gasto neto del ejercicio, por encima del reposo','kcal',0,30000]],note:'(Ingesta − gasto neto del ejercicio) ÷ masa libre de grasa. No uses calorías totales diarias ni calorías activas de todo el día como sustituto del ejercicio. No diagnostica REDs ni asigna un umbral universal.'},
 load:{name:'Carga de entrenamiento · session-RPE',source:'https://pubmed.ncbi.nlm.nih.gov/11708692/',fields:[['minutes','Duración de la sesión','min',1,1440],['rpe','Esfuerzo percibido global de la sesión, escala 0–10','RPE',0,10]],note:'Minutos × esfuerzo percibido global (0–10). Registra el esfuerzo después de la sesión de manera consistente. La carga no predice lesiones ni sobreentrenamiento por sí sola.'},
 sweat:{name:'Tasa de sudoración estimada',source:'https://pubmed.ncbi.nlm.nih.gov/17277604/',fields:[['beforeKg','Peso antes','kg',1,350],['afterKg','Peso después','kg',1,350],['drinkL','Líquido ingerido durante la sesión','L',0,20],['urineL','Orina durante la sesión (0 si no hubo)','L',0,20],['minutes','Duración','min',1,1440]],note:'[(Peso antes − después) + líquido ingerido − orina] ÷ horas. Aproximación: 1 kg de cambio ≈ 1 L. Misma báscula, ropa seca comparable y condiciones registradas. No determina el sodio perdido ni una pauta automática de bebida.'},
 cpet:{name:'Ergoespirometría · VT1 y VT2',source:'https://www.escardio.org/static-file/Escardio/Subspecialty/EAPC/Documents/4_Papadakis%20-%20Exercise%20Testing%20in%20athletes.pdf',fields:[['vt1Hr','FC en VT1 según informe','lpm',20,250],['vt2Hr','FC en VT2 según informe','lpm',20,250],['vt1Speed','Velocidad en VT1 según informe','km/h',0.1,40],['vt2Speed','Velocidad en VT2 según informe','km/h',0.1,40],['vo2peak','VO₂ pico medido según informe','ml/kg/min',1,120]],note:'Registra valores de una prueba cardiopulmonar ya realizada. VT1 y VT2 no se estiman de tu edad ni de un máximo diario del reloj. Son referencias del informe, no una autorización automática para entrenar.'},
 reds:{name:'REDs CAT2 · evaluación profesional',source:'https://pubmed.ncbi.nlm.nih.gov/37752002/',fields:[],note:'Registro de la evaluación y del plan del profesional. Esta aplicación no reproduce el diagnóstico CAT2, no calcula el semáforo y no decide la participación deportiva.'},
 recovery:{name:'Recuperación cardíaca · protocolo',source:'https://pubmed.ncbi.nlm.nih.gov/10536127/',fields:[['endHr','FC al finalizar el ejercicio de esa prueba','lpm',20,250],['oneHr','FC exactamente al minuto de recuperación','lpm',20,250]],note:'FC final − FC al minuto. Compara pruebas con el mismo protocolo, postura y recuperación activa/pasiva. No se asigna un umbral de normalidad universal.'}
 };
 const records=()=> (S.docs||[]).filter(d=>d.appRecord==='sports-clinical-v1'&&tools[d.sportTool]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||''));
 function calc(k,m){
  if(k==='cunningham')return {value:500+22*m.ffm,unit:'kcal/día'};
  if(k==='availability')return m.complete?{value:(m.intake-m.exerciseNet)/m.ffm,unit:'kcal/kg MLG/día'}:null;
  if(k==='load')return {value:m.minutes*m.rpe,unit:'UA'};
  if(k==='sweat'){const liters=m.beforeKg-m.afterKg+m.drinkL-m.urineL;return liters<0?null:{value:liters/(m.minutes/60),unit:'L/h'};}
  if(k==='recovery')return {value:m.endHr-m.oneHr,unit:'lpm'};
  return null;
 }
 function result(r){if(r.sportTool==='run'){const m=r.measurements||{};return (m.distanceKm??'—')+' km · '+Number(m.minutes||0).toLocaleString('es-ES',{maximumFractionDigits:2})+' min'+(m.hrAvg?' · '+m.hrAvg+' lpm':'');}const x=calc(r.sportTool,r.measurements||{});return x&&Number.isFinite(x.value)?Number(x.value).toLocaleString('es-ES',{maximumFractionDigits:1})+' '+x.unit:r.sportTool==='reds'?'Conclusión registrada por profesional':r.sportTool==='cpet'?'Umbrales del informe':'Datos incompletos';}
 function form(k,existing){
  const t=tools[k];if(!t)return;const d=existing||{},m=d.measurements||{},p=d.provenance||{};
  const input=(key,label,unit,min,max)=>'<div class="field"><label for="sc_'+key+'">'+E(label)+' ('+E(unit)+')</label><input id="sc_'+key+'" type="number" min="'+min+'" max="'+max+'" step="any" inputmode="decimal" value="'+E(m[key]??'')+'"></div>';
  let fields=t.fields.map(f=>input(...f)).join('');
  if(k==='availability')fields+='<label style="grid-column:1/-1"><input type="checkbox" id="sc_complete" '+(m.complete?'checked':'')+' style="width:auto"> He registrado la ingesta y el gasto del ejercicio del día completo; conozco la procedencia de ambos.</label>';
  if(['cunningham','availability'].includes(k))fields+='<div class="field"><label for="sc_ffmMethod">Método de masa libre de grasa</label><select id="sc_ffmMethod"><option value="">Selecciona</option>'+['DXA','Bioimpedancia','Informe profesional','Otra medición'].map(v=>'<option '+(p.ffmMethod===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div>';
  if(k==='recovery')fields+='<div class="field"><label for="sc_protocol">Protocolo de recuperación</label><select id="sc_protocol"><option value="">Selecciona</option>'+['Activa · caminando','Pasiva · de pie','Pasiva · sentada','Pasiva · tumbada','Otro protocolo del informe'].map(v=>'<option '+(p.protocol===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div>';
  if(k==='reds')fields+='<div class="field"><label for="sc_category">Clasificación comunicada por profesional</label><select id="sc_category">'+['No evaluado','Verde','Amarillo','Naranja','Rojo','Sin clasificación comunicada'].map(v=>'<option '+(p.category===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div><div class="field"><label for="sc_plan">Plan o recomendaciones recibidas</label><textarea id="sc_plan">'+E(p.plan||'')+'</textarea></div>';
  modal(t.name,'<form class="form" id="sc_form"><input type="hidden" id="sc_id" value="'+E(d.id||'')+'"><input type="hidden" id="sc_tool" value="'+k+'"><div class="field"><label for="sc_date">Fecha de medición o sesión</label><input id="sc_date" type="date" value="'+E(d.date||today())+'"></div>'+fields+
  '<div class="field"><label for="sc_source">Procedencia: informe, dispositivo o registro manual</label><input id="sc_source" value="'+E(p.source||'')+'" maxlength="200"></div>'+
  '<div class="field"><label for="sc_professional">Profesional / referencia de informe, si corresponde</label><input id="sc_professional" value="'+E(p.professional||'')+'" maxlength="200"></div>'+
  '<div class="field" style="grid-column:1/-1"><label for="sc_notes">Condiciones, protocolo y observaciones</label><textarea id="sc_notes" maxlength="4000">'+E(d.notes||'')+'</textarea></div>'+
  '<p class="small muted" style="grid-column:1/-1">'+E(t.note)+' <a href="'+t.source+'" target="_blank" rel="noopener noreferrer">Estudio / referencia</a></p><div id="sc_preview" class="small" style="grid-column:1/-1"></div></form>',
  '<button class="btn ghost" data-act="close">Cancelar</button><button class="btn" id="sc_calculate">Calcular / revisar</button><button class="btn primary" id="sc_save">Guardar registro</button>');
 }
 function read(){
  const get=k=>document.getElementById('sc_'+k),k=get('tool')?.value,t=tools[k];if(!t)throw Error('Registro desconocido');
  const date=get('date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today())throw Error('Revisa la fecha.');
  const m={},p={source:get('source').value.trim(),professional:get('professional').value.trim()};
  for(const [key,label,u,min,max]of t.fields){const raw=get(key).value;if(raw===''){if(k==='cpet'||k==='run')continue;throw Error('Falta: '+label);}const v=Number(raw);if(!Number.isFinite(v)||v<min||v>max)throw Error('Revisa: '+label);m[key]=v;}
  if(!p.source)throw Error('Indica la procedencia de los datos.'); if(k==='run'){if(!m.distanceKm||!m.minutes)throw Error('Introduce distancia y duración.'); for(const [a,b] of [['hrAvg','hrMax'],['powerAvg','powerMax'],['cadenceAvg','cadenceMax'],['strideAvg','strideMax'],['verticalAvg','verticalMax'],['altMin','altMax']])if(m[a]!=null&&m[b]!=null&&m[a]>m[b])throw Error('Revisa mínimos, medias y máximos.');}
  if(['cunningham','availability'].includes(k)){p.ffmMethod=get('ffmMethod').value;if(!p.ffmMethod)throw Error('Indica cómo se midió la masa libre de grasa.');}
  if(k==='availability'){m.complete=get('complete').checked;}
  if(k==='sweat'&&!calc(k,m))throw Error('El balance resulta negativo: revisa pesos, líquidos y orina.');
  if(k==='recovery'){p.protocol=get('protocol').value;if(!p.protocol)throw Error('Indica el protocolo de recuperación.');}
  if(k==='cpet'){if(!Object.keys(m).length)throw Error('Introduce al menos un valor del informe.');if(!p.professional)throw Error('Indica la referencia del informe o profesional.');if((m.vt1Hr!=null&&m.vt2Hr!=null&&m.vt2Hr<m.vt1Hr)||(m.vt1Speed!=null&&m.vt2Speed!=null&&m.vt2Speed<m.vt1Speed))throw Error('Revisa el orden de VT1 y VT2.');}
  if(k==='reds'){p.category=get('category').value;p.plan=get('plan').value.trim().slice(0,4000);if(p.category!=='No evaluado'&&!p.professional)throw Error('Indica el profesional que comunicó la evaluación.');}
  return {id:get('id').value,data:{date,appRecord:'sports-clinical-v1',sportTool:k,type:'Registro deportivo',title:t.name,measurements:m,provenance:p,notes:get('notes').value.trim().slice(0,4000),formulaVersion:1}};
 }
 async function save(){const b=document.getElementById('sc_save');if(b.disabled)return;
  try{const {id,data}=read();b.disabled=true;const old=id?records().find(r=>r.id===id):null;data.createdAt=old?.createdAt||new Date().toISOString();data.updatedAt=new Date().toISOString();const ref=id?DB.doc('docs/'+id):DB.collection('docs').doc();await ref.set(data);closeModal();render();toast('Registro deportivo guardado');}
  catch(e){if(document.getElementById('sc_preview'))document.getElementById('sc_preview').textContent=e.message||'No se pudo guardar.';}
  finally{if(document.getElementById('sc_save'))document.getElementById('sc_save').disabled=false;}
 }
 function panel(){
  const all=records(),card=(k,t)=>{const r=all.find(r=>r.sportTool===k);return '<article class="stat"><div class="l">'+E(t.name)+'</div><div class="v num" style="font-size:20px">'+E(r?result(r):'Pendiente de datos')+'</div><p class="small muted">'+E(r?fdate(r.date)+' · '+r.provenance?.source:'Necesita registro específico')+'</p>'+(r&&k==='cpet'?'<p class="small">VT1: '+E(r.measurements.vt1Hr??'—')+' lpm · VT2: '+E(r.measurements.vt2Hr??'—')+' lpm<br>VO₂ pico: '+E(r.measurements.vo2peak??'—')+' ml/kg/min</p>':'')+(r&&k==='reds'?'<p class="small">'+E(r.provenance?.category||'No evaluado')+' · '+E(r.provenance?.professional||'Sin evaluación profesional')+'</p>':'')+'<button class="btn sm" data-sc-new="'+k+'">Nuevo registro</button>'+(r?' <button class="btn sm" data-sc-edit="'+E(r.id)+'">Ver / editar</button>':'')+'<details style="margin-top:8px"><summary>Información y límites</summary><p class="small">'+E(t.note)+'</p><a href="'+t.source+'" target="_blank" rel="noopener noreferrer"'+(t.source?'':' hidden')+'>Referencia</a></details></article>';};
  const load=all.filter(r=>r.sportTool==='load'&&r.date>=addDays(today(),-6)&&r.date<=today()),sum=load.reduce((s,r)=>s+(calc('load',r.measurements)?.value||0),0);
  return '<section class="panel" id="evo-clinical-tools" style="margin-top:16px"><div class="eyebrow">Herramientas de deporte y nutrición · con referencias</div><h3>Mediciones, estimaciones e informes</h3><p class="small muted">Cada resultado conserva fecha, entradas y procedencia. No se mezclan en un nuevo índice de salud ni modifican automáticamente tus objetivos de comida o entrenamiento.</p><div class="stats">'+Object.entries(tools).map(([k,t])=>card(k,t)).join('')+'</div>'+
  (load.length?'<p>Carga session-RPE de los últimos 7 días: <b>'+E(sum.toLocaleString('es-ES'))+' UA</b> · '+load.length+' sesiones registradas.</p>':'')+
  '<details style="margin-top:12px"><summary>Historial de registros ('+all.length+')</summary><div class="tbl-wrap"><table><thead><tr><th>Fecha</th><th>Herramienta</th><th>Resultado</th><th>Procedencia</th><th></th></tr></thead><tbody>'+all.map(r=>'<tr><td>'+E(fdate(r.date))+'</td><td>'+E(tools[r.sportTool].name)+'</td><td>'+E(result(r))+'</td><td>'+E(r.provenance?.source)+'</td><td><button class="btn sm" data-sc-edit="'+E(r.id)+'">Ver / editar</button></td></tr>').join('')+'</tbody></table></div></details></section>';
 }
 function mount(){if(!['cardio','food','body'].includes(tab))return;const root=document.getElementById('view');if(!root)return;document.getElementById('evo-clinical-tools')?.remove();const section=document.createElement('div');section.innerHTML=panel();root.appendChild(section.firstElementChild);}
 const original=render;render=function(){const r=original.apply(this,arguments);mount();return r;};
 document.addEventListener('click',e=>{const n=e.target.closest('[data-sc-new]'),edit=e.target.closest('[data-sc-edit]');
  if(n){e.preventDefault();form(n.dataset.scNew);}else if(edit){e.preventDefault();const r=records().find(r=>r.id===edit.dataset.scEdit);if(r)form(r.sportTool,r);}else if(e.target.closest('#sc_calculate')){e.preventDefault();try{const r=read();document.getElementById('sc_preview').textContent=result({...r.data});}catch(error){document.getElementById('sc_preview').textContent=error.message;}}else if(e.target.closest('#sc_save')){e.preventDefault();void save();}});

 document.addEventListener('click',e=>{const target=e.target.closest('[data-act="editDoc"]');if(!target)return;const r=records().find(r=>r.id===target.dataset.id);if(r){e.preventDefault();e.stopImmediatePropagation();form(r.sportTool,r);}},true);
 mount();
})();