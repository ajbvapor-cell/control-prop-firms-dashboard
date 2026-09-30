const KEY='granja_prop_5k_v1';
const base={spent:60,withdrawn:0,accounts:[
{name:'HwyRm',status:'Challenge',pnl:0,daily:0,profile:'CORE',risk:50,recovery:25},
{name:'Cuenta 2',status:'Esperando',pnl:0,daily:0,profile:'CORE',risk:50,recovery:25},
{name:'Cuenta 3',status:'Esperando',pnl:0,daily:0,profile:'CORE',risk:50,recovery:25},
{name:'Cuenta 4',status:'Esperando',pnl:0,daily:0,profile:'CORE',risk:50,recovery:25},
{name:'Cuenta 5',status:'Esperando',pnl:0,daily:0,profile:'CORE',risk:50,recovery:25}
]};
let state=load();
function load(){try{return JSON.parse(localStorage.getItem(KEY))||structuredClone(base)}catch{return structuredClone(base)}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
const money=v=>(v<0?'-$':'$')+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:2});
const pct=v=>Number(v).toFixed(1)+'%';
function statusClass(s){return s==='Funded'?'green':s==='Challenge'?'amber':s==='Muerta'?'red':'cyan'}
function render(){
 const funded=state.accounts.filter(a=>a.status==='Funded').length;
 const active=state.accounts.filter(a=>a.status==='Challenge').length;
 const dead=state.accounts.filter(a=>a.status==='Muerta').length;
 const net=state.withdrawn-state.spent;
 const recovery=state.spent?state.withdrawn/state.spent*100:0;
 document.getElementById('topKpis').innerHTML=[
 ['Cuentas funded',funded+'/5','green'],['Challenges activas',active,'amber'],['Gastado',money(state.spent),'cyan'],['Retirado neto',money(state.withdrawn),'pink'],['Beneficio neto',money(net),net>=0?'green':'red']
 ].map(x=>`<div class="kpi"><span>${x[0]}</span><strong class="${x[2]}">${x[1]}</strong></div>`).join('');
 document.getElementById('livePill').textContent=funded+' / 5 LIVE';
 document.getElementById('liveProgress').style.width=Math.min(100,funded/5*100)+'%';
 document.getElementById('nextObjective').textContent=funded>=5?'Producción de payouts':'Conseguir 5 cuentas funded';
 document.getElementById('accountGrid').innerHTML=state.accounts.map((a,i)=>`<div class="account-card">
 <div class="account-top"><div><div class="account-name">${a.name}</div><div class="account-meta">PROPR 5K · LIT</div></div><span class="pill ${statusClass(a.status)}">${a.status}</span></div>
 <label>Estado</label><select data-i="${i}" data-k="status">
 ${['Esperando','Challenge','Funded','Muerta'].map(s=>`<option ${s===a.status?'selected':''}>${s}</option>`).join('')}
 </select>
 <label>PnL actual ($)</label><input data-i="${i}" data-k="pnl" type="number" step="1" value="${a.pnl}">
 <label>PnL diario ($)</label><input data-i="${i}" data-k="daily" type="number" step="1" value="${a.daily}">
 <div class="account-bottom"><div><span>Riesgo</span><strong>$${a.risk}</strong></div><div><span>Recovery</span><strong>$${a.recovery}</strong></div></div>
 <div class="progress"><span style="width:${Math.max(0,Math.min(100,(Number(a.pnl)+300)/800*100))}%"></span></div>
 </div>`).join('');
 document.querySelectorAll('[data-i]').forEach(el=>el.onchange=e=>{const i=+e.target.dataset.i,k=e.target.dataset.k;state.accounts[i][k]=k==='status'?e.target.value:Number(e.target.value);save();render()});
 document.getElementById('cashGrid').innerHTML=[
 ['Gastado total',money(state.spent)],['Retirado total',money(state.withdrawn)],['Recovery',pct(recovery)]
 ].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
 document.getElementById('breakBar').style.width='100%';
 document.getElementById('breakBar').style.background='none';
 document.querySelector('#cashGrid').insertAdjacentHTML('afterend',`<div class="breakbar"><span style="width:${Math.min(100,recovery)}%"></span></div>`);
 document.getElementById('cashNote').textContent=net>=0?`Break-even superado. Beneficio neto actual ${money(net)}.`:`Faltan ${money(-net)} de cash neto para recuperar el gasto acumulado.`;
}
document.getElementById('addAccount').onclick=()=>{state.accounts.push({name:'Cuenta '+(state.accounts.length+1),status:'Esperando',pnl:0,daily:0,profile:'CORE',risk:50,recovery:25});save();render()};
document.getElementById('resetDemo').onclick=()=>{state=structuredClone(base);save();render()};
render();