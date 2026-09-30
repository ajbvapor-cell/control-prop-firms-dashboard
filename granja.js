const KEY='granja_prop_300k_v2';
const START_DATE='2026-09-30';
const COSTS={5000:48,10000:110,25000:275};
const VERSION=4;
const base={
  version:VERSION,
  spent:252,
  withdrawn:0,
  accounts:[
    {name:'PROPR 5K HWyRm',short:'HWyRm',size:5000,status:'Challenge',pnl:0,daily:0,start:'30/09/26',cost:60,risk:40,recovery:20,accountId:'urn:prp-account:mh3j2P46HWyR',webhook:'/api/webhook-5k',botEnabled:true},
    {name:'PROPR 5K1 · HAM',short:'5K1',size:5000,status:'Challenge',pnl:0,daily:0,start:'30/09/26',cost:48,risk:40,recovery:20,accountId:'urn:prp-account:o4qVJggpNHAM',webhook:'/api/webhook-5k1',botEnabled:false},
    {name:'PROPR 5K2 · PIRG',short:'5K2',size:5000,status:'Challenge',pnl:0,daily:0,start:'30/09/26',cost:48,risk:40,recovery:20,accountId:'urn:prp-account:PirgL8LEDDss',webhook:'/api/webhook-5k2',botEnabled:false},
    {name:'PROPR 5K3 · JY16',short:'5K3',size:5000,status:'Challenge',pnl:0,daily:0,start:'30/09/26',cost:48,risk:40,recovery:20,accountId:'urn:prp-account:JY16tX1UzHkc',webhook:'/api/webhook-5k3',botEnabled:false},
    {name:'PROPR 5K4 · 6HED',short:'5K4',size:5000,status:'Challenge',pnl:0,daily:0,start:'30/09/26',cost:48,risk:40,recovery:20,accountId:'urn:prp-account:6HEdbGfsj7rp',webhook:'/api/webhook-5k4',botEnabled:false}
  ]
};
const scenarios={
  base:{name:'Histórico',edge:'+0,156R',hit:'~98%',day:'~73 días',capital:'$300K',net:'~$380K',headline:'$300K funded',note:'Bootstrap por bloques sobre el histórico LIT. Es una referencia de capacidad si el edge se conserva, no una previsión de ingresos.'},
  degraded:{name:'Edge degradado',edge:'+0,105R',hit:'87,8%',day:'~110 días',capital:'$300K',net:'~$98K',headline:'$300K funded',note:'Escenario con deterioro moderado de ganancias, MAE y ejecución. Sigue siendo positivo, pero la expansión tarda más.'},
  stress:{name:'Estrés fuerte',edge:'+0,053R',hit:'~27%',day:'N/D',capital:'~$195K',net:'N/D',headline:'~$195K funded mediano',note:'Con el edge reducido aproximadamente a un tercio, alcanzar el techo deja de ser el resultado central. El dashboard debe frenar expansión si nos acercamos a este régimen.'}
};
let state=load();
let scenario='base';
function clone(v){return JSON.parse(JSON.stringify(v))}
function migrate(saved){
  if(!saved||!Array.isArray(saved.accounts))return clone(base);
  const out=clone(base);
  const savedSpent=Number(saved.spent)||0;
  out.spent=(Number(saved.version)||0)<4 && savedSpent===300 ? 252 : savedSpent;
  out.withdrawn=Number(saved.withdrawn)||0;
  out.accounts=base.accounts.map((fresh,i)=>{
    const old=saved.accounts[i]||{};
    return {
      ...fresh,
      pnl:Number(old.pnl)||0,
      daily:Number(old.daily)||0,
      status:['Funded','Muerta'].includes(old.status)?old.status:fresh.status
    };
  });
  return out;
}
function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    const migrated=migrate(saved);
    localStorage.setItem(KEY,JSON.stringify(migrated));
    return migrated;
  }catch{return clone(base)}
}
function save(){state.version=VERSION;localStorage.setItem(KEY,JSON.stringify(state))}
const money=v=>(Number(v)<0?'-$':'$')+Math.abs(Number(v)||0).toLocaleString('en-US',{maximumFractionDigits:0});
const k=v=>'$'+((Number(v)||0)/1000).toLocaleString('en-US',{maximumFractionDigits:0})+'K';
const pct=v=>(Number(v)||0).toFixed(1)+'%';
function fundedCapital(){return state.accounts.filter(a=>a.status==='Funded').reduce((s,a)=>s+Number(a.size||0),0)}
function firstFiveFunded(){return state.accounts.filter(a=>a.size===5000&&a.status==='Funded').length}
function statusClass(s){return s==='Funded'?'green':s==='Challenge'?'amber':s==='Muerta'?'red':'cyan'}
function milestoneState(target,cap){return cap>=target?'done':cap<target&&target===nextMilestone(cap)?'current':''}
function nextMilestone(cap){return [25000,75000,150000,300000].find(x=>cap<x)||300000}
function nextPurchase(cap){
  if(cap<25000)return {label:'PROPR 5K',cost:COSTS[5000],size:5000,why:'Completar las 5 primeras 5K funded'};
  if(cap<75000)return {label:'PROPR 10K',cost:110,size:10000,why:'Construir el bloque de 5×10K'};
  if(cap<150000)return {label:'PROPR 25K',cost:275,size:25000,why:'Añadir 3×25K para llegar a 150K'};
  if(cap<300000)return {label:'PROPR 25K',cost:275,size:25000,why:'Completar 6×25K adicionales hasta 300K'};
  return {label:'MODO ORDEÑO',cost:0,size:0,why:'No comprar más funded: maximizar payouts y preservar edge'};
}
function renderTop(){
  const cap=fundedCapital(),funded=state.accounts.filter(a=>a.status==='Funded').length,active=state.accounts.filter(a=>a.status==='Challenge').length,net=state.withdrawn-state.spent;
  document.getElementById('topKpis').innerHTML=[
    ['Capital funded',k(cap),'green'],
    ['Funded activas',funded,'green'],
    ['Challenges',active,'amber'],
    ['Cash retirado',money(state.withdrawn),'pink'],
    ['Beneficio neto',money(net),net>=0?'green':'red']
  ].map(x=>`<div class="kpi"><span>${x[0]}</span><strong class="${x[2]}">${x[1]}</strong></div>`).join('');
}
function renderMission(){
  const cap=fundedCapital(), target=nextMilestone(cap), prev=target===25000?0:target===75000?25000:target===150000?75000:150000;
  const progress=cap>=300000?100:Math.max(0,Math.min(100,(cap-prev)/(target-prev)*100));
  const np=nextPurchase(cap);
  const waiting=state.accounts.find(a=>a.status==='Esperando');
  let title,copy;
  if(cap>=300000){title='MODO ORDEÑO · $300K funded';copy='Techo funded alcanzado. El objetivo pasa a ser cash retirado por mes, supervivencia y detección temprana de deterioro del edge.'}
  else if(cap<25000){title='HITO 1 · conseguir $25K funded';copy='Las cinco PROPR 5K ya están compradas y conectadas. Una está ON y las otras se activan de forma escalonada con CORE 40/20.'}
  else{title='Siguiente hito · '+k(target)+' funded';copy=np.why+'. Financiar la expansión preferentemente con payouts ya cobrados.'}
  document.getElementById('missionTitle').textContent=title;
  document.getElementById('missionCopy').textContent=copy;
  document.getElementById('missionPct').textContent=Math.round(progress)+'%';
  document.getElementById('missionBar').style.width=progress+'%';
  document.getElementById('missionRing').style.setProperty('--p',progress+'%');
  document.getElementById('missionGrid').innerHTML=[
    ['Funded actual',k(cap)],
    ['Siguiente hito',cap>=300000?'Completado':k(target)],
    ['Falta',money(Math.max(0,target-cap))],
    ['Siguiente compra',waiting?waiting.name:np.label]
  ].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
}
function renderRoadmap(){
  const cap=fundedCapital();
  const items=[
    {target:25000,title:'$25K',desc:'5×5K funded',date:'Mediana ~22 días'},
    {target:75000,title:'$75K',desc:'+5×10K funded',date:'Mediana ~50 días'},
    {target:150000,title:'$150K',desc:'+3×25K funded',date:'Mediana ~57 días'},
    {target:300000,title:'$300K',desc:'+6×25K funded',date:'Mediana ~73 días'}
  ];
  document.getElementById('roadmap').innerHTML=items.map((m,i)=>`<div class="milestone ${milestoneState(m.target,cap)}"><span class="step">HITO ${i+1}</span><strong>${m.title}</strong><small>${m.desc}</small><small>${m.date}</small></div>`).join('');
}
function renderNext(){
  const cap=fundedCapital();
  const nextOff=state.accounts.find(a=>!a.botEnabled&&a.status!=='Funded'&&a.status!=='Muerta');
  const np=nextPurchase(cap);
  if(nextOff){
    document.getElementById('nextActionTitle').textContent='Activar '+nextOff.name+' cuando decidas';
    document.getElementById('nextBuyBadge').textContent='FASE 1';
    document.getElementById('nextAction').innerHTML=`<div><span class="eyebrow">SIGUIENTE INTERRUPTOR</span><strong>${nextOff.short} · BOT OFF</strong><small>${nextOff.webhook}</small></div><div><span class="eyebrow">CUENTA</span><strong>${nextOff.accountId.split(':').pop()}</strong><small>Ya comprada · no requiere nueva compra</small></div>`;
  }else{
    document.getElementById('nextActionTitle').textContent=np.why;
    document.getElementById('nextBuyBadge').textContent=cap>=300000?'ORDEÑO':'ESCALA';
    document.getElementById('nextAction').innerHTML=`<div><span class="eyebrow">SIGUIENTE CUENTA</span><strong>${np.label}</strong><small>Coste estándar ${money(np.cost)}</small></div><div><span class="eyebrow">CAJA</span><strong>${state.withdrawn-state.spent>=np.cost?'Disponible':'Acumular payouts'}</strong><small>Cash neto libre: ${money(state.withdrawn-state.spent)}</small></div>`;
  }
}
function renderAccounts(){
  const onCount=state.accounts.filter(a=>a.botEnabled).length;
  const launch=document.getElementById('launchStatus');
  if(launch)launch.textContent=`${onCount} activa${onCount===1?'':'s'} · ${state.accounts.length-onCount} preparada${state.accounts.length-onCount===1?'':'s'} en OFF`;
  document.getElementById('accountGrid').innerHTML=state.accounts.slice(0,5).map((a,i)=>`<div class="account-card">
    <div class="account-top"><div><div class="account-name">${a.name}</div><div class="account-meta">PROPR 5K · LIT · Coste ${money(a.cost)} · ${a.accountId.split(':').pop()}</div></div><span class="pill ${a.botEnabled?'green':'red'}">${a.botEnabled?'BOT ON':'BOT OFF'}</span></div>
    <div class="account-tech"><span>ID</span><code>${a.accountId}</code></div>
    <div class="account-tech"><span>Webhook</span><code>${a.webhook}</code></div>
    <label>Estado<select data-i="${i}" data-k="status">${['Challenge','Funded','Muerta'].map(s=>`<option ${s===a.status?'selected':''}>${s}</option>`).join('')}</select></label>
    <label>PnL actual ($)<input data-i="${i}" data-k="pnl" type="number" value="${a.pnl}"></label>
    <label>PnL diario ($)<input data-i="${i}" data-k="daily" type="number" value="${a.daily}"></label>
    <div class="account-bottom"><div><span>CORE</span><strong>$${a.risk}</strong></div><div><span>Recovery</span><strong>$${a.recovery}</strong></div><div><span>Trigger</span><strong>-$150</strong></div></div>
    <div class="account-guard"><span>Guard diario</span><strong>-$130</strong><span>Salida recovery</span><strong>$0</strong></div>
    <div class="progress"><span style="width:${Math.max(0,Math.min(100,(Number(a.pnl)+300)/800*100))}%"></span></div>
  </div>`).join('');
  document.querySelectorAll('[data-i]').forEach(el=>el.onchange=e=>{const i=Number(e.target.dataset.i),key=e.target.dataset.k;state.accounts[i][key]=key==='status'?e.target.value:Number(e.target.value);save();render()});
}
function renderScenario(){
  const s=scenarios[scenario];
  document.querySelectorAll('#scenarioTabs button').forEach(b=>b.classList.toggle('active',b.dataset.s===scenario));
  document.getElementById('scenarioHero').innerHTML=`<span>Resultado central a 12 meses</span><strong>${s.headline}</strong>`;
  document.getElementById('scenarioGrid').innerHTML=[
    ['Esperanza',s.edge],['P(300K / 12m)',s.hit],['Mediana 300K',s.day],['Funded 12m',s.capital],['Neto 12m',s.net]
  ].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  document.getElementById('scenarioNote').textContent=s.note;
}
function renderLadder(){
  const cap=fundedCapital();
  const rows=[
    {name:'5× PROPR 5K',capital:25000,cost:252},
    {name:'5× PROPR 10K',capital:75000,cost:550},
    {name:'3× PROPR 25K',capital:150000,cost:825},
    {name:'6× PROPR 25K',capital:300000,cost:1650}
  ];
  document.getElementById('ladder').innerHTML=rows.map(r=>{const done=cap>=r.capital,current=!done&&r.capital===nextMilestone(cap);return `<div class="ladder-row"><div><strong>${r.name}</strong><div class="muted">Hito ${k(r.capital)}</div></div><div class="cost">Coste ${money(r.cost)}</div><span class="status ${done?'green':current?'cyan':'muted'}">${done?'COMPLETO':current?'ACTUAL':'COLA'}</span></div>`}).join('');
}
function renderCash(){
  const net=state.withdrawn-state.spent,recovery=state.spent?state.withdrawn/state.spent*100:0;
  document.getElementById('cashGrid').innerHTML=[
    ['Gastado',money(state.spent)],['Payouts',money(state.withdrawn)],['Recovery',pct(recovery)]
  ].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  document.getElementById('breakBar').style.width=Math.min(100,recovery)+'%';
  document.getElementById('cashNote').textContent=net>=0?`Granja autofinanciada. Caja neta histórica: ${money(net)}.`:`Faltan ${money(-net)} en payouts para recuperar todo el gasto registrado.`;
  document.getElementById('spentInput').value=state.spent;
  document.getElementById('withdrawnInput').value=state.withdrawn;
}
function render(){renderTop();renderMission();renderRoadmap();renderNext();renderAccounts();renderScenario();renderLadder();renderCash()}
document.querySelectorAll('#scenarioTabs button').forEach(b=>b.onclick=()=>{scenario=b.dataset.s;renderScenario()});
document.getElementById('spentInput').onchange=e=>{state.spent=Math.max(0,Number(e.target.value)||0);save();render()};
document.getElementById('withdrawnInput').onchange=e=>{state.withdrawn=Math.max(0,Number(e.target.value)||0);save();render()};
document.getElementById('addPayout').onclick=()=>{const v=Number(prompt('Importe NETO cobrado del payout ($):','0'));if(v>0){state.withdrawn+=v;save();render()}};
document.getElementById('resetDemo').onclick=()=>{if(confirm('¿Restaurar el estado base actual de la granja?')){state=clone(base);save();render()}};
render();