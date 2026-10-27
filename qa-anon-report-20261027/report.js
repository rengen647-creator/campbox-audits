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

const targetLabels={
 contact:'Связаться с менеджером',details:'Контактное окно',calc_base:'Калькулятор: базовый комплект',calc_full:'Калькулятор: с дополнительной опцией',
 p0:'Политика обработки ПДн',p1:'Отдельные согласия',p2:'Минимум необходимых данных',p3:'Аналитика и сторонние сервисы',p4:'Доступ, хранение, защита',p5:'Реестр и проверка перед запуском',
 o0:'Об организации отдыха',o1:'Деятельность',o2:'Материально-техническая база',o3:'Услуги и стоимость',o4:'Доступная среда',o5:'Иная информация',
 s0:'Бриф и материалы',s1:'Проверка наполнения',s2:'Тестовая ссылка',s3:'Проверка и правки',s4:'SEO и аналитика',s5:'Запуск и доступы'
};
let clickedRows=[];
function buttonDescription(row){
 const dest=row.target_key||'';
 if(Object.prototype.hasOwnProperty.call(sections,dest))return {name:'Переход → '+sections[dest],kind:'Пункт меню или кнопка перехода'};
 if(Object.prototype.hasOwnProperty.call(targetLabels,dest))return {name:targetLabels[dest],kind:row.event_name==='contact_click'?'Контактная кнопка':dest.startsWith('calc_')?'Переключатель калькулятора':'Интерактивный элемент'};
 return {name:'Неизвестный элемент',kind:'Без расшифровки'};
}
function updateDetailedReport(data){
 clickedRows=Array.isArray(data.by_button)?data.by_button.filter(r=>
   r&&Number.isFinite(r.count)&&r.count>0&&
   (Object.prototype.hasOwnProperty.call(targetLabels,r.target_key)||
   Object.prototype.hasOwnProperty.call(sections,r.target_key))):[];
 renderButtons();
 const body=$('heat-body');body.replaceChildren();
 const metrics=Array.isArray(data.heat_sections)?data.heat_sections:[];
 const max=Math.max(1,...metrics.flatMap(r=>[r.views,r.clicks,r.contact,r.pricing].map(v=>Number(v)||0)));
 for(const [key,name] of Object.entries(sections)){
  const row=metrics.find(r=>r.section_key===key)||{};
  const tr=add(body,'tr');const heading=add(tr,'td','',name);
  heading.setAttribute('scope','row');
  for(const prop of ['views','clicks','contact','pricing']){
   const td=add(tr,'td');const n=Math.max(0,Math.floor(Number(row[prop])||0));
   const level=n===0?0:Math.min(4,Math.max(1,Math.ceil(4*n/max)));
   const el=add(td,'span','heat-pill level-'+level,n);
   el.setAttribute('aria-label',name+': '+n+' '+prop);
  }
 }
}
function renderButtons(){
 const body=$('clicked-elements');body.replaceChildren();
 const filter=$('click-section').value;
 const rows=clickedRows.filter(r=>filter==='all'||r.section_key===filter);
 if(!rows.length){const tr=add(body,'tr');const td=add(tr,'td','click-empty','Для выбранного раздела нажатий пока нет.');td.colSpan=3;return}
 for(const r of rows){
  const tr=add(body,'tr');
  const detail=buttonDescription(r);
  const title=add(tr,'td');
  add(title,'div','click-title',detail.name);add(title,'span','click-kind',detail.kind);
  add(tr,'td','click-section',sections[r.section_key]||'Раздел не определён');
  add(tr,'td','',Math.max(0,Math.floor(Number(r.count)||0)));
 }
}

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
 await refreshJourneys(days);
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
 updateDetailedReport(d);
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

let currentVisits=[];
async function refreshJourneys(dayRange){
 const period=dayRange===30?7:dayRange;
 message('journey-error','');
 try{
  const response=await fetch(API,{method:'POST',
   headers:{'Authorization':'Bearer '+token,apikey:KEY,'Content-Type':'application/json'},
   body:JSON.stringify({action:'journeys',days:period}),credentials:'omit',cache:'no-store',redirect:'error'});
  if(!response.ok)throw Error('Маршруты тестовых посещений сейчас недоступны.');
  const data=await response.json();
  if(data.ok!==true||data.personal_attribution!==false||!Array.isArray(data.visits))throw Error('Не удалось проверить данные маршрутов.');
  currentVisits=data.visits;
  $('journey-total').textContent='Посещений с новым отслеживанием: '+(Number(data.total_test_visits)||0);
  $('journey-subtitle').textContent='Маршруты за '+(period===1?'24 часа':'7 дней')+' · последние 12 тестовых посещений';
  const list=$('journey-visit');list.replaceChildren();list.disabled=currentVisits.length===0;
  if(!currentVisits.length){add(list,'option','','Нет данных');$('journey-stats').hidden=true;
   $('journey-steps').replaceChildren();add($('journey-steps'),'div','empty','Ожидаем первые события нового тестового отслеживания.');return}
  currentVisits.forEach((v,i)=>{const o=add(list,'option','','Тестовое посещение №'+v.number);o.value=String(i)});
  list.value='0';renderVisit();
 }catch(err){currentVisits=[];message('journey-error',err instanceof Error?err.message:'Маршруты недоступны');}
}
function renderVisit(){
 const i=Number($('journey-visit').value),v=currentVisits[i];
 if(!v)return;
 $('journey-stats').hidden=false;
 $('journey-time').textContent=Math.round(Number(v.active_seconds)||0)+' сек';
 $('journey-depth').textContent=(Number(v.max_scroll)||0)+'%';
 $('journey-actions').textContent=String(Number(v.total_actions)||0);
 const wrap=$('journey-steps');wrap.replaceChildren();
 const actionTitles={section:'Перешёл в раздел',pricing:'Посмотрел стоимость',click:'Нажал на элемент',
 scroll:'Достиг глубины просмотра',dwell:'Активно изучал раздел',
 modal_open:'Открыл окно связи',modal_close:'Закрыл окно связи'};
 const kinds={nav:'пункт меню',button:'кнопка',tile:'карточка',calculator:'калькулятор',contact:'контакт',modal:'кнопка в окне'};
 const rows=Array.isArray(v.steps)?v.steps:[];
 if(!rows.length){add(wrap,'div','empty','В этом тестовом посещении пока нет событий.');return}
 for(const item of rows){
  if(!item||!Object.prototype.hasOwnProperty.call(actionTitles,item.action))continue;
  const section=sections[item.section]||'Раздел КП';
  const detail=add(wrap,'div','journey-step');
  const t=new Date(item.time);add(detail,'div','journey-time',Number.isNaN(t.getTime())?'—':t.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
  add(detail,'div','journey-line');
  const copy=add(detail,'div','journey-text');
  let label=actionTitles[item.action],note=section;
  if(item.action==='click'){
   const desc=buttonDescription({target_key:item.target,event_name:'cta_click'});
   label=desc.name;
   note=section+' · '+(kinds[item.element]||'интерактивный элемент');
  }
  if(item.action==='scroll')label='Просмотрено примерно '+(Number(item.scroll)||0)+'% раздела';
  if(item.action==='dwell')label='Активное время: '+(Number(item.dwell_seconds)||0)+' сек';
  add(copy,'strong','',label);add(copy,'span','',note);
 }
}
$('journey-visit').addEventListener('change',renderVisit);

$('login-form').addEventListener('submit',signIn);
$('logout').addEventListener('click',logout);
$('refresh').addEventListener('click',tryRefresh);
$('days').addEventListener('change',tryRefresh);
$('click-section').addEventListener('change',renderButtons);
window.opener=null;
})();
