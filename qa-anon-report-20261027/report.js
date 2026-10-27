// CampBox QA anonymous aggregate report. Only TEST employee credentials; no browser storage.
(()=>{'use strict';
const PROJECT='https://yvhnezmpxyftqbybmnfn.supabase.co';
const KEY="sb_publishable_y1NGovjOL4LyAWN85Zcwug_jkchBqeS";
const API=PROJECT+'/functions/v1/kp-qa-anon-report';
let token='',expires=0,busy=false;
const $=id=>document.getElementById(id);
const names={
section_view:'Открытие раздела',pricing_view:'Просмотр стоимости',modal_open:'Открытие окна',modal_close:'Закрытие окна',cta_click:'Нажатие кнопки',contact_click:'Нажатие на контакты'
};
const sections={main:'Главное',benefits:'Почему этот подход',privacy:'152-ФЗ',order:'Приказ № 201',offer:'Состав и стоимость',launch:'Запуск и решение'};
function message(id,text){const el=$(id);el.hidden=!text;el.textContent=text||'';}
function showReport(active){$('login-view').hidden=active;$('report-view').hidden=!active;}
function loading(state){busy=state;$('login-button').disabled=state;$('refresh').disabled=state;$('days').disabled=state;}
function add(parent,tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;if(value!=null)el.textContent=String(value);parent.append(el);return el;}
async function signIn(e){
 e.preventDefault();if(busy)return;message('login-error','');loading(true);
 const email=$('email').value.trim();const password=$('password').value;
 try{
  const r=await fetch(PROJECT+'/auth/v1/token?grant_type=password',{
    method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email,password}),cache:'no-store',credentials:'omit',redirect:'error'
  });
  $('password').value='';
  if(!r.ok)throw Error('Не удалось войти. Проверь тестовую учётную запись.');
  const j=await r.json();
  if(typeof j.access_token!=='string'||j.access_token.split('.').length!==3)throw Error('Сессия не подтверждена.');
  token=j.access_token;expires=Date.now()+Math.max(0,Math.min(3600,Number(j.expires_in)||0)-20)*1000;
  showReport(true);await refresh();
 }catch(err){
  token='';expires=0;showReport(false);message('login-error',err instanceof Error?err.message:'Ошибка входа');
 }finally{loading(false)}
}
async function refresh(){
 if(!token||Date.now()>=expires){logout();message('login-error','Тестовая сессия завершена. Войди ещё раз.');return}
 message('report-error','');
 const days=Number($('days').value);
 const r=await fetch(API,{
   method:'POST',
   headers:{'Authorization':'Bearer '+token,apikey:KEY,'Content-Type':'application/json'},
   body:JSON.stringify({action:'summary',days}),credentials:'omit',cache:'no-store',redirect:'error'
 });
 if(!r.ok){if(r.status===401||r.status===403){logout();message('login-error','Доступ не разрешён. Нужна активная роль manager или lead в тестовом Supabase.');return}
   throw Error('Не удалось получить сводку. Попробуй обновить позже.');}
 const data=await r.json();
 if(data.ok!==true||data.personal_attribution!==false)throw Error('Получены неверные данные отчёта.');
 render(data);
}
async function tryRefresh(){
 if(busy)return;loading(true);try{await refresh()}catch(e){message('report-error',e instanceof Error?e.message:'Ошибка запроса')}finally{loading(false)}
}
function logout(){token='';expires=0;$('password').value='';showReport(false);}
function render(d){
 const vals=d.by_name||{},sums=d.by_section||{};
 $('metric-total').textContent=String(d.total??0);
 $('metric-sections').textContent=String((vals.section_view||0));
 $('metric-pricing').textContent=String(vals.pricing_view||0);
 $('metric-contact').textContent=String((vals.contact_click||0)+(vals.modal_open||0));
 $('refreshed-at').textContent='Обновлено '+new Date().toLocaleString('ru-RU')+' · источник: тестовый Supabase';
 const section=$('section-chart');section.replaceChildren();
 const max=Math.max(1,...Object.values(sums).map(v=>Number(v)||0));
 for(const [key,label] of Object.entries(sections)){
   const row=add(section,'div','bar-row');const head=add(row,'div','bar-head');
   add(head,'span','',label);add(head,'b','',Number(sums[key])||0);
   const track=add(row,'div','track');const fill=add(track,'div','fill');
   fill.style.width=(100*(Number(sums[key])||0)/max).toFixed(1)+'%';
 }
 const events=$('event-list');events.replaceChildren();
 for(const [key,label] of Object.entries(names)){
  const row=add(events,'div','event-row');add(row,'span','',label);add(row,'strong','',Number(vals[key])||0);
 }
 const chart=$('day-chart');chart.replaceChildren();
 const days=Array.isArray(d.by_day)?d.by_day:[];
 if(days.length===0){add(chart,'div','empty','За выбранный период событий пока нет.');return}
 const maxDay=Math.max(1,...days.map(x=>Number(x.count)||0));
 for(const v of days){
  const col=add(chart,'div','day');add(col,'b','',v.count);
  const base=add(col,'div','column');const bar=add(base,'div','volume');
  bar.style.height=(100*(Number(v.count)||0)/maxDay).toFixed(1)+'%';
  add(col,'small','',String(v.day).slice(5));
 }
}
$('login-form').addEventListener('submit',signIn);
$('logout').addEventListener('click',logout);
$('refresh').addEventListener('click',tryRefresh);
$('days').addEventListener('change',tryRefresh);
window.opener=null;
})();
