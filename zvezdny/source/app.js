
(function(){
  'use strict';
  const demo=window.ZVEZDNY_DEMO;
  if(!demo){ throw new Error('Отсутствует локальный демонстрационный набор данных.'); }
  const byId=(id)=>document.getElementById(id);
  const money=(n)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Number.isFinite(n)?n:0)+' ₽';
  const integer=(n)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
  const months=['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  const fullMonths=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const campList=demo.camps;
  const clamp=(value,max)=>{const x=Number(value);return Number.isFinite(x)?Math.min(max,Math.max(0,Math.floor(x))):0;};
  const safeStr=(s)=>String(s).replace(/[&<>"']/g,(ch)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const sourceColors={'Авангард':'#45c569','Воин':'#80d999','Платный набор':'#b2e8be','Прочие':'#d5e9da'};
  // Ценообразование: ставка берётся с оборота одного объекта в одном календарном месяце.
  function tierFor(monthRevenue){ const r=clamp(monthRevenue,1e15); let selected=demo.tiers[0];for(const tier of demo.tiers){if(r>=tier.from)selected=tier;}return selected; }
  function feeFor(monthRevenue){const r=clamp(monthRevenue,1e15);const rate=tierFor(r).rate;const raw=Math.round(r*rate);return{revenue:r,rate,raw,fee:Math.max(demo.minimumMonthlyPayment,raw)};}
  const baseState={scenario:'base',scope:'one',camp:'zvezdny',focus:6,salary:50000,camps:{}};
  const state=baseState;
  function applyPreset(which){
    state.scenario=which;
    campList.forEach((camp)=>{
      const factor=camp.factor;
      state.camps[camp.id]={price:demo.price,paid:demo.scenarioSales[which].map(n=>Math.round(n*factor)),budget:demo.scenarioBudget[which].map(n=>Math.round(n*factor))};
    });
  }
  applyPreset('base');
  function campTotals(campId){
    const c=state.camps[campId];let paidCount=0,budgetCount=0,voucherCount=0,revenue=0,commercialRevenue=0,fee=0;
    const monthly=months.map((_,i)=>{
      const paid=clamp(c.paid[i],1e6),budget=clamp(c.budget[i],1e6),vouchers=paid+budget;
      // ВСЕ оформленные путёвки формируют базу комиссии, в т. ч. по госзаданию.
      // Это РАСЧЁТНАЯ стоимость, не утверждение об оплате бюджетных путёвок родителями.
      const x=feeFor(vouchers*c.price);
      paidCount+=paid;budgetCount+=budget;voucherCount+=vouchers;revenue+=x.revenue;
      commercialRevenue+=paid*c.price;fee+=x.fee;
      return{...x,paid,budget,vouchers,commercialRevenue:paid*c.price,budgetBasis:budget*c.price};
    });
    return{campId,monthly,paidCount,budgetCount,voucherCount,revenue,commercialRevenue,fee};
  }
  function selectedTotals(){const ids=state.scope==='four'?campList.map(c=>c.id):[state.camp];return ids.map(campTotals);}
  function allTotals(arr){return arr.reduce((a,x)=>({revenue:a.revenue+x.revenue,commercialRevenue:a.commercialRevenue+x.commercialRevenue,fee:a.fee+x.fee,paid:a.paid+x.paidCount,budget:a.budget+x.budgetCount,vouchers:a.vouchers+x.voucherCount}),{revenue:0,commercialRevenue:0,fee:0,paid:0,budget:0,vouchers:0});}
  function renderQuick(current){
    const x=current.monthly[state.focus];
    byId('quick-month').value=String(state.focus);
    byId('quick-price').value=state.camps[state.camp].price;
    byId('quick-paid').value=x.paid;
    byId('quick-budget').value=x.budget;
    byId('quick-total-count').textContent=integer(x.vouchers);
    byId('quick-revenue').textContent=money(x.revenue);
    byId('quick-rate').textContent=(x.rate*100).toFixed(2).replace('.',',')+'%';
    byId('quick-raw').textContent=money(x.raw);
    byId('quick-fee').textContent=money(x.fee);
    byId('quick-min-note').textContent=x.raw<demo.minimumMonthlyPayment?'Применён минимальный платёж 5 000 ₽, даже без оформленных путёвок.':'Минимальный платёж 5 000 ₽ учтён; текущая комиссия выше минимума.';
    byId('quick-tier-strip').innerHTML=demo.tiers.map(t=>`<div class="quick-tier ${t.rate===x.rate?'active':''}"><span>${safeStr(t.name)}</span><b>${(t.rate*100).toFixed(2).replace('.',',')}%</b></div>`).join('');
    byId('quick-method-current').textContent=state.camps[state.camp].price===35000?'При изменении стоимости в поле выше расчёт обновляется.':`Сейчас введено ${money(state.camps[state.camp].price)} за путёвку; это пользовательский сценарий.`;
  }
  function renderCalc(refreshRows){
    const current=campTotals(state.camp), group=selectedTotals(),tot=allTotals(group);
    byId('calc-price').value=state.camps[state.camp].price;
    renderQuick(current);
    byId('calc-year-revenue').textContent=money(tot.revenue);
    byId('calc-year-fee').textContent=money(tot.fee);
    byId('calc-paid-count').textContent=integer(tot.paid);
    byId('calc-budget-count').textContent=integer(tot.budget);
    byId('calc-total-count').textContent=integer(tot.vouchers);
    const tb=byId('calc-months-body');
    if(refreshRows){
      tb.innerHTML=months.map((m,i)=>`<tr data-month="${i}" class="${state.focus===i?'focus-row':''}"><td class="month-name">${fullMonths[i]}</td><td><input aria-label="Платные путёвки, ${fullMonths[i]}" data-type="paid" data-month="${i}" type="number" inputmode="numeric" min="0" max="1000000" step="1" value="${current.monthly[i].paid}"><span class="print-only print-paid">${integer(current.monthly[i].paid)}</span></td><td><input aria-label="Бюджетные путёвки, ${fullMonths[i]}" data-type="budget" data-month="${i}" type="number" inputmode="numeric" min="0" max="1000000" step="1" value="${current.monthly[i].budget}"><span class="print-only print-budget">${integer(current.monthly[i].budget)}</span></td><td class="monthly-count">—</td><td class="monthly-revenue">—</td><td class="monthly-rate">—</td><td class="monthly-fee">—</td></tr>`).join('');
    }
    for(let i=0;i<12;i++){
      const tr=tb.querySelector(`tr[data-month="${i}"]`);if(!tr)continue;
      const x=current.monthly[i];tr.classList.toggle('focus-row',state.focus===i);
      tr.querySelector('.monthly-count').textContent=integer(x.vouchers);
      tr.querySelector('.monthly-revenue').textContent=money(x.revenue);
      tr.querySelector('.monthly-rate').textContent=(x.rate*100).toFixed(x.rate===.0075?2:2).replace('.',',')+'%';
      tr.querySelector('.monthly-fee').innerHTML='<b>'+money(x.fee)+'</b>';
      tr.querySelector('.print-paid').textContent=integer(x.paid);tr.querySelector('.print-budget').textContent=integer(x.budget);
    }
    byId('calc-table-total').innerHTML=`<td>Итого за год</td><td>${integer(current.paidCount)}</td><td>${integer(current.budgetCount)}</td><td>${integer(current.voucherCount)}</td><td>${money(current.revenue)}</td><td>Помесячно</td><td>${money(current.fee)}</td>`;
    const x=current.monthly[state.focus];
    byId('focus-revenue').textContent=money(x.revenue);byId('focus-rate').textContent=(x.rate*100).toFixed(2).replace('.',',')+'%';
    byId('focus-raw').textContent=money(x.raw);byId('focus-fee').textContent=money(x.fee);
    byId('focus-min-note').textContent=x.raw<demo.minimumMonthlyPayment?'Применён минимальный платёж 5 000 ₽ за месяц.':'Расчётная комиссия выше минимального платежа 5 000 ₽.';
    byId('tier-list').innerHTML=demo.tiers.map(t=>`<div class="tier-row ${t.rate===x.rate?'active':''}"><span>${safeStr(t.name)}${t.rate===x.rate?' · текущий':''}</span><strong>${(t.rate*100).toFixed(2).replace('.',',')}%</strong></div>`).join('');
    byId('calc-network-section').hidden=state.scope!=='four';
    if(state.scope==='four'){
      byId('calc-network-body').innerHTML=group.map(t=>`<tr><td>${safeStr(campList.find(c=>c.id===t.campId).name)}</td><td>${money(t.revenue)}</td><td>${integer(t.voucherCount)}</td><td><b>${money(t.fee)}</b></td></tr>`).join('');
      byId('calc-network-foot').innerHTML=`<tr><td>Итого (сумма отдельных объектов)</td><td>${money(tot.revenue)}</td><td>${integer(tot.vouchers)}</td><td>${money(tot.fee)}</td></tr>`;
    }
    byId('econ-campbox').textContent=money(tot.fee);
    byId('econ-salary').textContent=money(state.salary*12);
    byId('salary-year').textContent=money(state.salary*12);
    renderNetworkCards();
  }
  function renderNetworkCards(){
    byId('network-cards').innerHTML=campList.map((c,i)=>{const t=campTotals(c.id);return `<article class="card network-card"><div class="network-no"><span>ОБЪЕКТ ${i+1}</span><span class="tag ${i?'neutral':'verified'}">${i?'Гипотеза':'Первый этап'}</span></div><h3>${safeStr(c.name)}</h3><p>${safeStr(c.description)}. Сценарий по объекту рассчитывается независимо.</p><strong>${money(t.fee)}</strong><small>ориентир / 12 месяцев</small></article>`;}).join('');
  }
  const flowContent={budget:{kicker:'ОРГАНИЗОВАННЫЙ ПОТОК',title:'Квота → список → подготовленный заезд',description:'Участник поступает по программе направляющей организации. Покупка путёвки родителем не является обязательным шагом.',steps:['Программа / организация','Согласованная квота','Список участников','Документы и проверка','Взвод / казарма','Заезд и отчёт'],footer:'Списки от «Авангарда», «Воина» и других организаций; автоматический обмен требует отдельной проверки.',symbol:'↗'},paid:{kicker:'ПЛАТНЫЙ ПОТОК',title:'Выбор программы → заявка → заезд',description:'Личная заявка родителя для 14–17 лет или совершеннолетнего участника 18+ — с отдельной проверкой правового сценария.',steps:['Выбор программы','Заявка 14–17 / 18+','Допустимая оплата','Подготовка документов','Взвод / казарма','Заезд и отчёт'],footer:'Платная деятельность, эквайринг, юридические основания и документы для 18+ согласуются с «Авангардом» и учредителем.',symbol:'₽'}};
  function renderFlow(key){const f=flowContent[key];byId('flow-kicker').textContent=f.kicker;byId('flow-title').textContent=f.title;byId('flow-description').textContent=f.description;byId('flow-footer').textContent=f.footer;byId('flow-symbol').textContent=f.symbol;byId('flow-steps').innerHTML=f.steps.map((x,i)=>`<div class="flow-step"><span>${['↳','◇','▤','✓','⌂','↗'][i]}</span><strong>${safeStr(x)}</strong></div>`).join('');document.querySelectorAll('[data-flow]').forEach(b=>{const on=b.dataset.flow===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});}
  const processes={
    booking:{tag:'Подтверждённый продуктовый контур',title:'Программы, смены и бронирования',description:'Объединяем статус программы, заявки и подготовки участника. Для организованных потоков отдельные правила набора.',outcome:'Картина набора и статусы участников на каждом этапе.',caveat:'Открытый и закрытый набор, программы, возраст 14–17 и сценарий 18+, допустимая оплата.',status:'Контур CampBox',check:false},
    documents:{tag:'Подтверждённый контур с правовой настройкой',title:'Документы и личный кабинет',description:'Сбор и проверка статусов необходимых документов; использование простой электронной подписи — после согласования правовой модели.',outcome:'Видно, какие документы получены, а какие требуют внимания.',caveat:'Утверждённые шаблоны, основания для ПЭП и маршрут для совершеннолетних участников.',status:'Контур + проверка',check:true},
    placement:{tag:'Подтверждённый контур с согласованием правил',title:'Взводы и казармы',description:'Предварительно распределяем участников по организационным критериям с последующим контролем сотрудником.',outcome:'Структурированное размещение по взводам и казармам.',caveat:'Возраст, смешанные взводы, правила размещения по комнатам и проверка вручную.',status:'Контур + настройка',check:true},
    presence:{tag:'Гипотеза — требуется техническая проверка',title:'Отмечать выезд группы и возвращение',description:'Сценарий экскурсии или занятия в ФОК: группа выехала → временно отсутствует → вернулась → подтверждена явка. Это постановка задачи, не подтверждённая функциональность.',outcome:'Прозрачный статус присутствия группы на территории и за её пределами — при подтверждении реализации.',caveat:'Массовый QR, события выезда/возврата, роли сотрудников и связь с КПП/СКУД.',status:'Требует проверки',check:true},
    communication:{tag:'Продуктовый контур / состав каналов уточняется',title:'Коммуникация и управленческие выгрузки',description:'Напоминания и рассылки по допустимым каналам, экспорт нужных реестров и аналитика по результатам смен.',outcome:'Меньше повторного сбора данных для типовых отчётов.',caveat:'Перечень каналов, шаблоны уведомлений и структура отчётов для руководства.',status:'Контур + настройка',check:true}
  };
  function renderProcess(key){const p=processes[key];byId('process-tag').textContent=p.tag;byId('process-title').textContent=p.title;byId('process-description').textContent=p.description;byId('process-outcome').textContent=p.outcome;byId('process-caveat').textContent=p.caveat;byId('process-status').textContent=p.status;byId('process-status').className='tag '+(p.check?'check':'verified');byId('process-status-note').textContent=p.check?'Детали и реализуемость уточняются на технической встрече.':'Индивидуальные настройки — после согласования процессов.';document.querySelectorAll('[data-process]').forEach(b=>{const on=b.dataset.process===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});}
  const quotaNames=['Авангард','Воин','Платный набор','Другое'],quotaColors=['#45c569','#80d999','#b4e8bf','#d8eee0'];
  let quotas=[140,95,80,35];const quotaMax=350;
  function updateQuota(index,newValue){newValue=clamp(newValue,quotaMax);const others=quotas.reduce((s,x,i)=>s+(i===index?0:x),0);const available=quotaMax-others;const old=quotas[index];quotas[index]=Math.max(0,Math.min(quotaMax,newValue));let overflow=Math.max(0,quotas.reduce((a,b)=>a+b,0)-quotaMax);if(overflow){for(let k=1;k<=3;k++){const i=(index+k)%4;const taken=Math.min(overflow,quotas[i]);quotas[i]-=taken;overflow-=taken;if(!overflow)break;}}renderQuota(false);}
  function renderQuota(rebuild=true){const used=quotas.reduce((a,b)=>a+b,0);byId('quota-allocated').textContent=integer(used);byId('quota-unallocated').textContent=integer(quotaMax-used);const stops=[];let start=0;for(let i=0;i<4;i++){const end=start+quotas[i]/quotaMax*100;stops.push(`${quotaColors[i]} ${start.toFixed(2)}% ${end.toFixed(2)}%`);start=end;}stops.push(`#f0f4f1 ${start.toFixed(2)}% 100%`);byId('quota-donut').style.background=`conic-gradient(${stops.join(',')})`;byId('quota-donut-total').textContent=integer(quotaMax);
    if(rebuild||!byId('quota-controls').children.length){byId('quota-controls').innerHTML=quotas.map((v,i)=>`<div class="quota-line"><div class="quota-labels"><span><i class="swatch" style="background:${quotaColors[i]}"></i>${quotaNames[i]}</span><strong>${v} мест</strong></div><input data-quota-index="${i}" type="range" min="0" max="350" step="5" value="${v}" aria-label="Квота ${quotaNames[i]}"></div>`).join('');}else{document.querySelectorAll('.quota-line').forEach((node,i)=>{node.querySelector('strong').textContent=quotas[i]+' мест';node.querySelector('input').value=quotas[i];});}
    byId('quota-legend').innerHTML=quotas.map((v,i)=>{const occupied=Math.round(v*[.84,.75,.65,.52][i]);return `<div><span><i class="swatch" style="background:${quotaColors[i]}"></i>${quotaNames[i]}</span><strong>${v}</strong></div><div class="occ-summary">Занято: ${occupied} · свободно: ${v-occupied}</div>`;}).join('')+`<div><span><i class="swatch" style="background:#f0f4f1;border:1px solid #dfe9e2"></i>Не распределено</span><strong>${quotaMax-used}</strong></div>`;
  }
  // Данные для отчётов синтетические, даты продажи и завершения смен не смешиваются.
  function generateReportData(){const rows=[];for(const year of [2027,2028]){campList.forEach((camp,c)=>{for(let m=1;m<=12;m++){for(let k=0;k<2;k++){
    const idx=(m+k*2+c)%4;const program=demo.programs[idx];const duration=[5,14,21,10][(m+k+c)%4];const status=['Завершена','Идёт','Планируется'][(m+k+c+(year-2027))%3];const planned=Math.round((130+(m%4)*25+k*31)*camp.factor);const actual=status==='Планируется'?0:Math.round(planned*(status==='Завершена'?.91:.54));const docs=Math.round(actual*.84);const salesBase=status==='Планируется'?Math.round(planned*.25):actual;const paid=idx===2?Math.round(salesBase*.88):0;
    const budgetVouchers=program.source==='Платный набор'?0:actual;
    const vouchers=paid+budgetVouchers;
    // В демонстрации дата оформления путёвки — месяц до завершения смены;
    // для бюджетного потока это НЕ месяц коммерческой оплаты.
    const saleYear=m===1?year-1:year;const saleMonth=m===1?12:m-1;
    rows.push({id:`${year}-${camp.id}-${m}-${k}`,year,camp:camp.id,month:m,saleYear,saleMonth,program:program.name,source:program.source,duration,status,planned,actual,docs,paid,budgetVouchers,vouchers,price:35000,turnover:paid*35000,commissionBase:vouchers*35000});
  }}});}return rows;}
  const reportRows=generateReportData();
  const filters={year:'2027',period:'all',camp:'zvezdny',program:'all',source:'all',duration:'all',status:'all'};
  function getFilteredRows(){const qmap={all:[1,12],q1:[1,3],q2:[4,6],q3:[7,9],q4:[10,12]};const [start,end]=qmap[filters.period];return reportRows.filter(r=>String(r.year)===filters.year&&r.month>=start&&r.month<=end&&(filters.camp==='all'||r.camp===filters.camp)&&(filters.program==='all'||r.program===filters.program)&&(filters.source==='all'||r.source===filters.source)&&(filters.duration==='all'||(filters.duration==='other'?![5,14,21].includes(r.duration):String(r.duration)===filters.duration))&&(filters.status==='all'||r.status===filters.status));}
  function sum(rows,key){return rows.reduce((a,x)=>a+x[key],0);}
  function presentCompact(n){if(n>=1e6)return(n/1e6).toFixed(n%1e6?1:0).replace('.',',')+'м';if(n>=1e3)return(n/1000).toFixed(n%1000?1:0).replace('.',',')+'к';return integer(n);}
  function barRows(container,arr,max,paired){container.innerHTML=arr.map(a=>{const w=max?Math.max(0,Math.min(100,a.value/max*100)):0;const plan=paired?(max?Math.min(100,a.plan/max*100):0):0;return `<div class="${paired?'bar-row':'dist-row'}"><span>${safeStr(a.name)}</span><div class="${paired?'bar-track':'dist-track'}">${paired?`<div style="position:relative;width:${plan}%;height:100%;background:#d6e9db"><div class="bar-fact" style="position:absolute;top:0;bottom:0;left:0;width:${a.plan?Math.min(100,a.value/a.plan*100):0}%"></div></div>`:`<div class="dist-fill" style="width:${w}%;background:${a.color||'#46c569'}"></div>`}</div><b>${paired?`${integer(a.value)} / ${integer(a.plan)}`:integer(a.value)}</b></div>`;}).join('');}
  function timeline(target,values,labels){const max=Math.max(1,...values);target.style.gridTemplateColumns=`repeat(${values.length},minmax(0,1fr))`;target.innerHTML=values.map((v,i)=>`<div class="time-col"><small>${v?presentCompact(v):'—'}</small><div class="time-bar-rail"><div class="time-bar" style="height:${v?Math.max(3,v/max*100):1}%" title="${safeStr(labels[i])}: ${integer(v)}"></div></div><span>${safeStr(labels[i])}</span></div>`).join('');}
  function reportFeesEstimate(rows){const m={};for(const r of rows){const key=`${r.camp}-${r.saleYear}-${r.saleMonth}`;m[key]=(m[key]||0)+r.commissionBase;}return Object.values(m).reduce((acc,v)=>acc+Math.round(v*tierFor(v).rate),0);}
  function renderReport(){const rows=getFilteredRows();const planned=sum(rows,'planned'),actual=sum(rows,'actual'),paid=sum(rows,'paid'),budget=sum(rows,'budgetVouchers'),vouchers=sum(rows,'vouchers'),commissionBase=sum(rows,'commissionBase'),revenue=sum(rows,'turnover'),docs=sum(rows,'docs');const kpis=[
    ['Заезды в выборке',integer(rows.length),'По месяцу завершения'],['План / факт участников',`${integer(planned)} / ${integer(actual)}`,'Факт в демоданных'],['Учтено путёвок',integer(vouchers),'Платные и бюджетные'],['В том числе бюджетных',integer(budget),'Включены в комиссию'],['Расчётная база всех путёвок',money(commissionBase),'Не равна денежным поступлениям'],['Расчётная комиссия',money(reportFeesEstimate(rows)),'Все источники, без минимума'],['Готовность документов',actual?`${Math.round(docs/actual*100)}%`:'—','Иллюстрация статусов'],['Загрузка от плана',planned?`${Math.round(actual/planned*100)}%`:'—','Факт / план участников']];
    byId('report-kpis').innerHTML=kpis.map(([name,v,note])=>`<article class="report-kpi"><small>${name}</small><strong>${v}</strong><em>${note}</em></article>`).join('');
    const grouped=demo.programs.map(p=>{const part=rows.filter(r=>r.program===p.name);return{name:p.name,plan:sum(part,'planned'),value:sum(part,'actual')}});
    barRows(byId('chart-programs'),grouped,Math.max(1,...grouped.map(p=>p.plan)),true);
    byId('chart-programs').insertAdjacentHTML('beforeend','<div class="bar-labels"><span><i style="background:#d6e9db"></i>План</span><span><i style="background:#4bc76b"></i>Факт</span></div>');
    const sources=Object.keys(sourceColors).map(name=>({name,value:sum(rows.filter(r=>r.source===name),'actual'),color:sourceColors[name]}));barRows(byId('chart-sources'),sources,Math.max(1,...sources.map(p=>p.value)),false);
    byId('chart-durations').innerHTML=[[5,'5 дней'],[14,'14 дней'],[21,'21 день'],['other','Другие']].map(([dur,label])=>`<div><strong>${integer(rows.filter(r=>dur==='other'?![5,14,21].includes(r.duration):r.duration===dur).length)}</strong><small>${label}</small></div>`).join('');
    const salesMonths=Array.from({length:13},(_,i)=>i===0?{year:Number(filters.year)-1,month:12,name:`Дек ’${String(Number(filters.year)-1).slice(2)}`}:{year:Number(filters.year),month:i,name:months[i-1]});
    const salesValues=salesMonths.map(m=>sum(rows.filter(r=>r.saleYear===m.year&&r.saleMonth===m.month),'turnover'));
    timeline(byId('chart-sales'),salesValues,salesMonths.map(x=>x.name));
    const feeBaseValues=salesMonths.map(m=>sum(rows.filter(r=>r.saleYear===m.year&&r.saleMonth===m.month),'commissionBase'));
    timeline(byId('chart-fee-base'),feeBaseValues,salesMonths.map(x=>x.name));
    const completedValues=Array.from({length:12},(_,i)=>rows.filter(r=>r.month===i+1&&r.status==='Завершена').length);timeline(byId('chart-completed'),completedValues,months);
    const included=campList.filter(c=>filters.camp==='all'||c.id===filters.camp);byId('report-camps-body').innerHTML=included.map(c=>{const sub=rows.filter(r=>r.camp===c.id);return `<tr><td><b>${safeStr(c.name)}</b></td><td>${integer(sub.length)}</td><td>${integer(sum(sub,'planned'))} / ${integer(sum(sub,'actual'))}</td><td>${integer(sum(sub,'paid'))}</td><td>${integer(sum(sub,'budgetVouchers'))}</td><td>${integer(sum(sub,'vouchers'))}</td><td>${money(sum(sub,'commissionBase'))}</td></tr>`;}).join('');
    byId('report-filter-summary').textContent=`Демонстрационные данные · ${rows.length} заездов в выборке. Комиссия включает бюджетные и платные оформленные путёвки. Период фильтра — по месяцу завершения; расчётная стоимость группируется по условному месяцу оформления. Показанная комиссия не является выставляемым платежом и не включает помесячный минимум.`;
  }
  function wire(){
    byId('print-btn').addEventListener('click',()=>window.print());
    byId('flow-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-flow]');if(b)renderFlow(b.dataset.flow);});
    document.querySelector('.process-rail').addEventListener('click',e=>{const b=e.target.closest('[data-process]');if(b)renderProcess(b.dataset.process);});
    byId('quota-controls').addEventListener('input',e=>{if(e.target.matches('[data-quota-index]'))updateQuota(Number(e.target.dataset.quotaIndex),e.target.value);});
    byId('quick-month').addEventListener('change',e=>{state.focus=clamp(e.target.value,11);byId('calc-focus-month').value=String(state.focus);renderCalc(false);});
    byId('quick-price').addEventListener('input',e=>{state.camps[state.camp].price=clamp(e.target.value,1e7);renderCalc(true);});
    byId('quick-price').addEventListener('change',e=>{e.target.value=state.camps[state.camp].price;renderCalc(true);});
    ['paid','budget'].forEach(type=>{
      const el=byId('quick-'+type);
      el.addEventListener('input',e=>{state.camps[state.camp][type][state.focus]=clamp(e.target.value,1e6);renderCalc(true);});
      el.addEventListener('change',e=>{e.target.value=state.camps[state.camp][type][state.focus];renderCalc(true);});
    });
    byId('calc-scenario').addEventListener('change',e=>{applyPreset(e.target.value);renderCalc(true);});
    byId('calc-scope').addEventListener('change',e=>{state.scope=e.target.value;renderCalc(false);});
    byId('calc-camp').addEventListener('change',e=>{state.camp=e.target.value;renderCalc(true);});
    byId('calc-price').addEventListener('input',e=>{state.camps[state.camp].price=clamp(e.target.value,1e7);renderCalc(false);});
    byId('calc-price').addEventListener('change',e=>{e.target.value=state.camps[state.camp].price;renderCalc(false);});
    byId('calc-focus-month').addEventListener('change',e=>{state.focus=Number(e.target.value);renderCalc(false);});
    byId('calc-months-body').addEventListener('input',e=>{if(!e.target.matches('[data-type]'))return;const i=Number(e.target.dataset.month);state.camps[state.camp][e.target.dataset.type][i]=clamp(e.target.value,1e6);state.focus=i;byId('calc-focus-month').value=String(i);renderCalc(false);});
    byId('calc-months-body').addEventListener('change',e=>{if(!e.target.matches('[data-type]'))return;e.target.value=state.camps[state.camp][e.target.dataset.type][Number(e.target.dataset.month)];renderCalc(false);});
    byId('salary-input').addEventListener('input',e=>{state.salary=Math.max(50000,clamp(e.target.value,60000));byId('salary-display').textContent=money(state.salary);renderCalc(false);});
    document.querySelectorAll('.filter-grid select').forEach(el=>el.addEventListener('change',e=>{filters[e.target.id.replace('filter-','')]=e.target.value;renderReport();}));
    byId('reset-filters').addEventListener('click',()=>{Object.assign(filters,{year:'2027',period:'all',camp:'zvezdny',program:'all',source:'all',duration:'all',status:'all'});Object.entries(filters).forEach(([k,v])=>byId('filter-'+k).value=v);renderReport();});
    // Навигация только по нажатию: прокрутка не переключает разделы.
    const sections=[...document.querySelectorAll('main>section.section')];
    const sectionNames=['Главное','Задачи и системы','Сценарии набора','Квоты и загрузка','Подготовка заезда','Отчёты руководителя','Финансовая модель','Экономика решения','Четыре лагеря','План внедрения','Следующий шаг'];
    const known=new Set(sections.map(el=>el.id));
    function showSection(id,updateHistory=true){
      if(!known.has(id))id='overview';
      sections.forEach(s=>{const on=s.id===id;s.classList.toggle('active',on);s.setAttribute('aria-hidden',String(!on));});
      document.querySelectorAll('.side-nav [data-target],.mobile-nav [data-target]').forEach(el=>{const on=el.dataset.target===id;el.classList.toggle('active',on);if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
      if(updateHistory&&location.hash!=='#'+id){history.pushState({section:id},'','#'+id);}
      window.scrollTo({top:0,behavior:'instant'});
    }
    document.querySelectorAll('.side-nav [data-target],.mobile-nav [data-target]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.target)));
    document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href').slice(1);if(known.has(id)){e.preventDefault();showSection(id);}}));
    // Управление «Назад / Далее» в конце каждого смыслового блока.
    sections.forEach((section,i)=>{
      const prev=i?`<button type="button" class="btn btn-outline" data-pager="${sections[i-1].id}">← ${sectionNames[i-1]}</button>`:'';
      const next=i<sections.length-1?`<button type="button" class="btn btn-primary" data-pager="${sections[i+1].id}">${sectionNames[i+1]} →</button>`:'';
      section.insertAdjacentHTML('beforeend',`<div class="section-pager"><span>Раздел ${i+1} из ${sections.length}</span><div>${prev}${next}</div></div>`);
    });
    document.querySelectorAll('[data-pager]').forEach(b=>b.addEventListener('click',()=>showSection(b.dataset.pager)));
    window.addEventListener('popstate',()=>showSection(location.hash.slice(1)||'overview',false));
    window.addEventListener('hashchange',()=>showSection(location.hash.slice(1)||'overview',false));
    // Печать содержит все секции, хотя в обычном режиме видна только выбранная.
    window.addEventListener('beforeprint',()=>{sections.forEach(s=>s.removeAttribute('aria-hidden'));byId('finance-advanced').open=true;});
    window.addEventListener('afterprint',()=>{sections.forEach(s=>s.setAttribute('aria-hidden',String(!s.classList.contains('active'))));});
    showSection(location.hash.slice(1)||'overview',false);
  }
  wire();renderFlow('budget');renderProcess('booking');renderQuota();renderReport();byId('calc-focus-month').value=String(state.focus);renderCalc(true);
  // В тестовой среде позволяет проверять чистую математическую модель без зависимости от DOM.
  window.ZVEZDNY_QA={tierFor,feeFor,campTotals,getFilteredRows,reportRows,state,reportFeesEstimate};
})();

