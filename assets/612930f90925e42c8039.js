/* One continuous audience document. No fetch, storage, remote assets or slide router. */
(() => {
 'use strict';
 const snapshot=JSON.parse(document.getElementById('audience-data').textContent);
 const {config,datasets}=snapshot, sections=config.sections;
 const delivery=window.univelkaDelivery;
 if(delivery)delivery.attach(snapshot);
 const $=id=>document.getElementById(id);
 const sectionBody=id=>$(id).querySelector(':scope>.section-body');
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=(v,digits=0)=>v==null?'—':typeof v==='string'?escape(v):new Intl.NumberFormat('fi-FI',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(v);
 const date=v=>v?String(v).slice(0,10).split('-').reverse().map((s,i)=>i<2?Number(s):s).join('.'):'—';
 const short={vanilla:'Vanilla',tbc:'TBC',wotlk:'WotLK',cata:'Cataclysm',mop:'MoP'};
 const expansions={vanilla:'Vanilla',tbc:'The Burning Crusade',wotlk:'Wrath of the Lich King',cata:'Cataclysm',mop:'Mists of Pandaria'};
 const colors={vanilla:'#a4aa79',tbc:'#78a78b',wotlk:'#8db4d0',cata:'#c58d6d',mop:'#bea1cb'};
 const classColors={Warrior:'#c79c6e',Paladin:'#f58cba',Hunter:'#abd473',Rogue:'#fff569',Priest:'#f0f0f0',DeathKnight:'#e26b7d',Shaman:'#71a9ee',Mage:'#69ccf0',Warlock:'#b1a9e8',Monk:'#62cfab',Druid:'#ffb16a'};
 const roleColors={HEALER:'#72c795',TANK:'#6dafff',DPS:'#ee7777'};
 const role=r=>String(r??'').split(' / ').map(v=>({DPS:'DPS',TANK:'Tankki',HEALER:'Healer',UNKNOWN:'Tuntematon'}[v]||v)).join(' / ');
 const state={from:'2019-11',to:'2026-09',month:'',reveal:false};
 let trendExpansion='all', trendRoles=false, trendSelected='', activeSection='opening', navigating=false;
 const rankingConfig=sections.find(s=>s.kind==='parse-table'),rankingViews=rankingConfig.views;
 let rankingExpansion='all',rankingClass='all';
 const rankingView=()=>rankingViews.find(v=>v.expansion===rankingExpansion&&v.character_class===rankingClass);
 const isRanking=id=>rankingViews.some(v=>v.id===id);
 const legacyExpansions=['vanilla','tbc','wotlk','cata','mop'];
 const expansionRank=value=>{const label=String(value).trim().toLocaleLowerCase('fi'),index=legacyExpansions.findIndex(e=>[e,short[e],expansions[e]].some(v=>v.toLocaleLowerCase('fi')===label));return index<0?legacyExpansions.length:index;};
 function compareExpansions(x,y){
   const a=String(x).split(/[,·]/).map(expansionRank),b=String(y).split(/[,·]/).map(expansionRank);
   for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])return a[i]-b[i];
   return a.length-b.length;
 }
 const rankingClasses=[...new Set(rankingViews.map(v=>v.character_class))].filter(c=>c!=='all');
 const playerViews={all:datasets['player-parses'],...Object.fromEntries(Object.keys(expansions).map(e=>[e,datasets['player-parses-'+e]]))};
 let playerExpansion='all';
 datasets['player-parses-all']=playerViews.all;
 const sessionViews={all:datasets['character-sessions'],...Object.fromEntries(Object.keys(expansions).map(e=>[e,datasets['sessions-'+e]]))};
 let sessionExpansion='all';
 datasets['sessions-all']=sessionViews.all;
 const survivalViews={all:datasets.survival,...Object.fromEntries(Object.keys(expansions).map(e=>[e,datasets['survival-'+e]]))};
 const survivalRaidViews=Object.fromEntries(['all',...Object.keys(expansions)].map(e=>[e,datasets['survival-raids-'+e]]));
 let survivalExpansion='all',survivalMode='characters';
 datasets['survival-all']=survivalViews.all;
 const attemptViews={all:datasets.players,...Object.fromEntries(Object.keys(expansions).map(e=>[e,datasets['players-'+e]]))};
 let attemptExpansion='all';
 datasets['players-all']=attemptViews.all;
 const expandedDetails=new Set();
 const tableStates=new Map(), chartDefaults={...state};
 const tableDefault=(id='')=>({q:'',expansion:'all',role:'all',sort:isRanking(id)?'average_boss_bests':'',dir:isRanking(id)?'desc':'asc',show:'10',others:'0'});
 const tableStateKey=id=>id==='survival'?'survival:'+survivalMode:id;
 const tableState=id=>{const key=tableStateKey(id);if(!tableStates.has(key))tableStates.set(key,tableDefault(id));return tableStates.get(key);};
 function heading(s){return `<div class="section-heading"><div><p class="eyebrow">${s.chapter==='historia'?'01 / Killan historia':s.chapter==='pelaajat'?'02 / Pelaajat':'03 / Parset'}</p><h2>${escape(s.title)}</h2><p class="subtitle">${escape(s.subtitle)}</p></div><a class="permalink" href="#${s.id}" aria-label="Linkki: ${escape(s.title)}">#</a></div>`;}
 function saveURL(id=activeSection){
   const ranking=isRanking(id)||id==='character-parses';
   const p=new URLSearchParams({section:ranking?'character-parses':id});
   if(ranking){p.set('expansion',rankingExpansion);p.set('class',rankingClass);}
   if(id==='player-parses'&&playerExpansion!=='all')p.set('expansion',playerExpansion);
   if(id==='character-sessions'&&sessionExpansion!=='all')p.set('expansion',sessionExpansion);
   if(id==='players'&&attemptExpansion!=='all')p.set('expansion',attemptExpansion);
   if(id==='survival'&&survivalExpansion!=='all')p.set('expansion',survivalExpansion);
   if(id==='survival'&&survivalMode==='raids')p.set('view','raids');
   const tableId=ranking?rankingView().id:id;
   if(datasets[tableId]?.columns){const s=tableState(tableId);for(const[k,v]of Object.entries(s))if(k!=='limit'&&v!==tableDefault(tableId)[k])p.set(k,v);}
   if(id==='progress'){for(const[k,v]of Object.entries(state))if(v!==chartDefaults[k])p.set(k,k==='reveal'?(v?'1':'0'):v);}
   if(id==='parse-trend'){if(trendRoles)p.set('roles','1');if(trendExpansion!=='all')p.set('expansion',trendExpansion);if(trendSelected)p.set('week',trendSelected);}
   try{history.replaceState(null,'','#'+p.toString());}catch{/* Anchor navigation itself remains available on restricted file origins. */}
 }
 function announce(text){$('announcement').textContent=text;}
 function download(name,columns,rows){
   const cell=v=>{let s=Array.isArray(v)?v.join(' | '):String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
   const csv='\uFEFF'+[columns.map(c=>c.label),...rows.map(r=>columns.map(c=>r[c.key]))].map(r=>r.map(cell).join(';')).join('\r\n');
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('CSV-tiedosto ladattu. Alkuperäiset sijoitukset säilyvät.');
 }
 function logLinksHTML(value,row){
   const urls=(Array.isArray(value)?value:[value]).filter(url=>typeof url==='string'&&/^https:\/\/classic\.warcraftlogs\.com\/reports\/[A-Za-z0-9]{16}(?:#fight=[1-9]\d*)?$/.test(url));
   if(!urls.length)return '—';
   return `<span class="log-links">${urls.map((url,i)=>`<a class="log-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape((urls.length===1?'Avaa logi':'Logi '+(i+1))+' · '+(row.boss||row.raid||row.raids||'Warcraft Logs')+' (uusi välilehti)')}">${urls.length===1?'Avaa logi ↗':'Logi '+(i+1)+' ↗'}</a>`).join('')}</span>`;
 }
 function display(v,c,row){
   if(v==null)return '—';
   if(c.format==='log-url'||c.format==='log-links')return logLinksHTML(v,row);
   if(c.format==='date')return date(v);
   if(c.format==='expansion')return `<span class="expansion" style="color:${colors[v]||'inherit'}">${escape(short[v]||v)}</span>`;
   if(c.format==='class')return `<span class="class-name" style="color:${classColors[v]||'inherit'}">${escape(v==='DeathKnight'?'Death Knight':v)}</span>`;
   if(c.format==='classes')return v.length?`<span class="class-list">${v.map(cls=>display(cls,{format:'class'},row)).join('')}</span>`:'—';
   if(c.format==='role')return `<span class="role">${escape(role(v))}</span>`;
   if(c.format==='text')return escape(v);
   if(c.format==='median')return number(v,2)+(row.best_median?'<span class="median-marker" title="Korkein mediaani"> ★</span>':'');
   if(c.format?.startsWith('percent'))return number(v*100,Number(c.format.slice(-1)));
   if(c.format?.startsWith('decimal'))return number(v,Number(c.format.slice(-1)));
   return number(v);
 }
 function identityColumn(d){return d.columns.find(c=>c.format==='text'&&['name','raid','boss','character_name'].includes(c.key))?.key||d.columns[0].key;}
 const searchCache=new WeakMap();
 const searchQuery=id=>tableState(id).q.trim().toLocaleLowerCase('fi');
 function detailRows(row){
   if(row.details)return row.details;
   if(row.boss_details_key){const source=datasets['evening-boss-details'];return source.by_key[row.boss_details_key]?.map(values=>Object.fromEntries(source.fields.map((field,i)=>[field,values[i]])))||[];}
   if(row.raid_details_key)return datasets['character-parse-raids'].by_key[row.raid_details_key]||[];
   return [];
 }
 function detailText(row){return Object.entries(row).filter(([key])=>!/(?:_key|_id|url|links)$/.test(key)).map(([key,v])=>key==='expansion'?[v,expansions[v],short[v]].join(' '):key==='role'?role(v):key==='eligible'?(v?'Täyttyy':'Ei täyty'):String(v??'')).join(' ').toLocaleLowerCase('fi');}
 function detailMatches(row,q){if(row.__search!==undefined)return row.__search.includes(q);if(!searchCache.has(row))searchCache.set(row,detailRows(row).map(detailText).join('\n'));return searchCache.get(row).includes(q);}
 function parentMatches(row,id,q){return datasets[id].columns.some(c=>String(c.format==='role'?role(row[c.key]):c.format==='expansion'?expansions[row[c.key]]:row[c.key]??'').toLocaleLowerCase('fi').includes(q));}
 function selectedRows(id,unfiltered=false){
   const d=datasets[id],s=unfiltered?tableDefault(id):tableState(id),q=s.q.trim().toLocaleLowerCase('fi');
   const rows=d.rows.filter(r=>(id!=='hundred-parses'||unfiltered||s.others==='1'||r.primary_scope)&&(s.expansion==='all'||r.expansion===s.expansion)&&(s.role==='all'||r.role===s.role||r.roles?.includes(s.role))&&(!q||parentMatches(r,id,q)||detailMatches(r,q)));
   if(s.sort)rows.sort((a,b)=>{let x=a[s.sort],y=b[s.sort];if(x==null||y==null)return x==null?(y==null?0:1):-1;const v=['expansion','expansions_played'].includes(s.sort)?compareExpansions(x,y):typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'fi');return s.dir==='desc'?-v:v;});
   return rows;
 }
 function baselineHTML(id,unfiltered=false){
   if(id==='hundred-parses')return '';
   const d=datasets[id],b=d.scope_baselines?d.scope_baselines[unfiltered||tableState(id).others==='1'?'all':'primary']:d.baseline;
   if(!b)return '';
   if(d.eligible_count===0)return `<div class="baseline">Tällä valinnalla ei ole kelpoisuusehdot täyttäviä ${d.identity==='player'?'pelaajia':'hahmoja'}.</div>`;
   if(b.average_boss_bests!=null)return `<div class="baseline">Killan keskiarvot: parhaiden ka ${number(b.average_boss_bests,2)} % · mediaanit ${number(b.median_all_kills,2)} %<br><small>${d.eligible_count} kelpoista ${d.identity==='player'?'pelaajaa':'hahmo–rooliriviä'} · koko kelpoinen vertailupopulaatio, jokaisella rivillä sama paino</small></div>`;
   if(b.average_parse!=null)return `<div class="baseline">Killan vertailu, kaikki tämän rajauksen kaatoparset: ka ${number(b.average_parse,2)} % · mediaani ${number(b.median_parse,2)} %</div>`;
   return '';
 }
 function playerCharactersHTML(row){return `<div class="roster-detail player-characters"><h3>Hahmot · ${escape(row.name)}</h3><table><thead><tr><th class="identity">Hahmo</th><th>Class</th><th>Bossien parhaiden ka %</th><th>Mediaani %</th><th>Bosseja</th><th>Kaatoja</th><th>Pelatut lisäosat</th></tr></thead><tbody>${row.details.map(r=>`<tr><td class="identity" style="color:${classColors[r.character_class]||'inherit'}">${escape(r.name)}</td><td>${display(r.character_class,{format:'class'},r)}</td><td class="gold">${number(r.average_boss_bests,2)}</td><td>${number(r.median_all_kills,2)}</td><td>${number(r.comparable_bosses)}</td><td>${number(r.kills)}</td><td>${escape(r.expansions_played)}</td></tr>`).join('')}</tbody></table></div>`;}
 function sessionBossesHTML(row){const details=row.details||detailRows(row);return `<div class="roster-detail evening-bosses"><h3>Raidin bossit · ${escape(row.character_name)} (${escape(role(row.role))})</h3><table><thead><tr><th class="identity">Bossi</th><th>Raidi</th><th>Lisäosa</th><th>Vaikeus</th><th>Koko</th><th>Parse %</th><th>Rooli</th><th>Logi</th></tr></thead><tbody>${details.map(r=>`<tr><td class="identity">${escape(r.boss)}</td><td>${escape(r.raid)}</td><td>${display(r.expansion,{format:'expansion'},r)}</td><td>${escape(r.difficulty)}</td><td>${number(r.raid_size)}</td><td class="gold">${number(r.parse,2)}</td><td>${escape(role(r.role))}</td><td>${logLinksHTML(r.wcl_url,r)}</td></tr>`).join('')}</tbody></table></div>`;}

 function attemptCharactersHTML(row){const columns=datasets.players.columns.flatMap(c=>c.key==='name'?[{...c,label:'Hahmo'},{key:'character_class',label:'Class',format:'class'}]:[c]);return `<div class="roster-detail attempt-characters"><h3>Hahmot · ${escape(row.name)}</h3><table><thead><tr>${columns.map(c=>`<th${c.key==='name'?' class="identity"':''}>${escape(c.label)}</th>`).join('')}</tr></thead><tbody>${row.details.map(r=>`<tr>${columns.map(c=>`<td${c.key==='name'?` class="identity" style="color:${classColors[r.character_class]||'inherit'}"`:''}>${display(r[c.key],c,r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
 function characterRaidsHTML(row){const details=row.details||detailRows(row);return `<div class="roster-detail character-raids"><h3>Parset raididungeonittain · ${escape(row.name)} (${escape(role(row.role))})</h3><table><thead><tr><th class="identity">Raididungeoni</th><th>Lisäosa</th><th>Kaatoja</th><th>Bossien parhaiden ka %</th><th>Mediaani %</th><th>Bosseja</th></tr></thead><tbody>${details.map(r=>`<tr><td class="identity">${escape(r.raid)}</td><td>${display(r.expansion,{format:'expansion'},r)}</td><td>${number(r.kills)}</td><td class="gold">${number(r.average_boss_bests,2)}</td><td>${number(r.median_all_kills,2)}</td><td>${number(r.comparable_bosses)}</td></tr>`).join('')}</tbody></table></div>`;}

 function bossRolesHTML(row){return `<div class="roster-detail boss-roles"><h3>Parset rooleittain · ${escape(row.boss)}</h3><table><thead><tr><th class="identity">Rooli</th><th>Parsejen ka %</th></tr></thead><tbody>${row.details.map(r=>`<tr><td class="identity" style="color:${roleColors[r.role]||'inherit'}">${escape(role(r.role))}</td><td class="gold">${number(r.average_parse,2)}</td></tr>`).join('')}</tbody></table></div>`;}

 function survivalRaidsHTML(row){return `<div class="roster-detail survival-raids"><h3>Kuolemat raididungeonittain · ${escape(row.name)}</h3><table><thead><tr><th class="identity">Raididungeoni</th><th>Lisäosa</th><th>Kuolemaa / kaato</th><th>Kuolemia / pulli</th><th>Kaatoja</th><th>Kuolemia yhteensä</th><th>Pulleja</th></tr></thead><tbody>${row.details.map(r=>`<tr><td class="identity">${escape(r.raid)}</td><td>${display(r.expansion,{format:'expansion'},r)}</td><td class="gold">${number(r.deaths_per_kill,3)}</td><td>${number(r.deaths_per_pull,3)}</td><td>${number(r.kills)}</td><td>${number(r.deaths)}</td><td>${number(r.pulls)}</td></tr>`).join('')}</tbody></table></div>`;}
 function survivalBossesHTML(row){return `<div class="roster-detail survival-bosses"><h3>Bossit · ${escape(row.raid)} (${escape(short[row.expansion])})</h3><table><thead><tr><th class="identity">Bossi</th><th>Raidin koko</th><th>Suhteelliset kuolemat / kaato</th><th>Suhteelliset kuolemat / pull</th><th>Absoluuttiset kuolemat / kaato</th><th>Raidissa käyneitä hahmoja</th><th>Kaatoja</th><th>Kuolemia yhteensä</th><th>Pulleja</th></tr></thead><tbody>${row.details.map(r=>`<tr><td class="identity">${escape(r.boss)}</td><td>${number(r.raid_size)}</td><td class="gold">${number(r.deaths_per_kill,3)}</td><td>${number(r.deaths_per_pull,3)}</td><td>${number(r.absolute_deaths_per_kill,3)}</td><td>${number(r.characters)}</td><td>${number(r.kills)}</td><td>${number(r.deaths)}</td><td>${number(r.pulls)}</td></tr>`).join('')}</tbody></table></div>`;}
 function rosterContentHTML(row,id){if((id==='survival'&&survivalMode==='raids')||id.startsWith('survival-raids-'))return survivalBossesHTML(row);if(id==='survival'||id.startsWith('survival-'))return survivalRaidsHTML(row);if(id==='bosses-by-parses')return bossRolesHTML(row);if(isRanking(id))return characterRaidsHTML(row);if(id==='players'||id.startsWith('players-'))return attemptCharactersHTML(row);if(id==='character-sessions'||id.startsWith('sessions-'))return sessionBossesHTML(row);if(id.startsWith('player-parses'))return playerCharactersHTML(row);return `<div class="roster-detail"><h3>Raidaajat · ${escape(row.raid||row.boss||'')}</h3><table><thead><tr><th class="identity">Raidaaja</th><th>Class</th><th>Rooli</th><th>Parsejen ka %</th><th>Kaatoja parseilla</th></tr></thead><tbody>${row.details.map(r=>`<tr><td class="identity" style="color:${classColors[r.character_class]||'inherit'}">${escape(r.name)}</td><td>${display(r.character_class,{format:'class'},r)}</td><td>${escape(role(r.role))}</td><td class="gold">${number(r.average_parse,2)}</td><td>${number(r.scored_kills)}</td></tr>`).join('')}</tbody></table></div>`;}
 const detailSortStates=new Map();
 function detailKeys(id){
   if((id==='survival'&&survivalMode==='raids')||id.startsWith('survival-raids-'))return ['boss','raid_size','deaths_per_kill','deaths_per_pull','absolute_deaths_per_kill','characters','kills','deaths','pulls'];
   if(id==='survival'||id.startsWith('survival-'))return ['raid','expansion','deaths_per_kill','deaths_per_pull','kills','deaths','pulls'];
   if(id==='bosses-by-parses')return ['role','average_parse'];
   if(isRanking(id))return ['raid','expansion','kills','average_boss_bests','median_all_kills','comparable_bosses'];
   if(id==='players'||id.startsWith('players-'))return datasets.players.columns.flatMap(c=>c.key==='name'?['name','character_class']:[c.key]);
   if(id==='character-sessions'||id.startsWith('sessions-'))return ['boss','raid','expansion','difficulty','raid_size','parse','role','wcl_url'];
   if(id.startsWith('player-parses'))return ['name','character_class','average_boss_bests','median_all_kills','comparable_bosses','kills','expansions_played'];
   return ['name','character_class','role','average_parse','scored_kills'];
 }
 const detailSortKey=(id,key,index=0)=>id+'|'+key+'|'+index;
 function changeDetailSort(control,column,toggle=true){
   const {detailTable:id,detailParent:key,detailIndex:index}=control.dataset;
   const stateKey=detailSortKey(id,key,index),previous=detailSortStates.get(stateKey)||{column:isRanking(id)?'3':'',dir:'desc'};
   const row=datasets[id].rows.find(r=>r.detail_key===key),field=detailKeys(id)[Number(column)];
   if(column==='')detailSortStates.set(stateKey,{column:'',dir:'asc'});
   else detailSortStates.set(stateKey,{column:String(column),dir:toggle&&previous.column===String(column)?(previous.dir==='asc'?'desc':'asc'):(detailRows(row).some(r=>typeof r[field]==='number')&&field!=='rank'?'desc':'asc')});
   updateResults(id,true);
   const selector=control.tagName==='SELECT'?'[data-detail-sort-select]':(control.closest('.detail-sort-tools')?`.detail-sort-tools [data-detail-sort]`:`thead [data-detail-sort="${column}"]`);
   document.querySelector(`#detail-${key} ${selector}`)?.focus({preventScroll:true});
 }
 // Sort raw values; formatted cells retain links, colors and mobile labels.
 function rosterHTML(row,id){
   const template=document.createElement('template');
   const q=searchQuery(id),allDetails=detailRows(row),details=q&&!parentMatches(row,id,q)?allDetails.filter(r=>detailText(r).includes(q)):allDetails;
   template.innerHTML=rosterContentHTML({...row,details},id);
   const fields=detailKeys(id);
   [...template.content.querySelectorAll('table')].forEach((table,tableIndex)=>{
     const headers=[...table.querySelectorAll('thead th')],body=table.querySelector('tbody');
     const stateKey=detailSortKey(id,row.detail_key,tableIndex);
     if(!detailSortStates.has(stateKey))detailSortStates.set(stateKey,{column:isRanking(id)?'3':'',dir:'desc'});
     const sort=detailSortStates.get(stateKey);
     const data=[...body.rows].map((tr,index)=>({tr,value:details[index]?.[fields[Number(sort.column)]]}));
     for(const {tr} of data)[...tr.cells].forEach((cell,index)=>cell.dataset.label=headers[index]?.textContent||'');
     if(sort.column!=='')data.sort((a,b)=>{const x=a.value,y=b.value;if(x==null||y==null)return x==null?(y==null?0:1):-1;const v=['expansion','expansions_played'].includes(fields[Number(sort.column)])?compareExpansions(x,y):typeof x==='number'&&typeof y==='number'?x-y:a.tr.cells[Number(sort.column)].textContent.localeCompare(b.tr.cells[Number(sort.column)].textContent,'fi');return sort.dir==='desc'?-v:v;});
     body.replaceChildren(...data.map(d=>d.tr));
     const attrs=`data-detail-table="${id}" data-detail-parent="${row.detail_key}" data-detail-index="${tableIndex}"`;
     const labels=headers.map(h=>h.textContent);
     headers.forEach((header,index)=>{header.scope='col';if(String(index)===sort.column)header.setAttribute('aria-sort',sort.dir==='desc'?'descending':'ascending');header.innerHTML=`<button data-detail-sort="${index}" ${attrs}>${escape(labels[index])}${String(index)===sort.column?(sort.dir==='desc'?' ↓':' ↑'):''}</button>`;});
     table.insertAdjacentHTML('beforebegin',`<div class="detail-sort-tools no-print"><label>Järjestä <select data-detail-sort-select ${attrs}><option value=""${sort.column===''?' selected':''}>Alkuperäinen järjestys</option>${labels.map((label,index)=>`<option value="${index}"${sort.column===String(index)?' selected':''}>${escape(label)}</option>`).join('')}</select></label><button data-detail-sort="${sort.column||'0'}" ${attrs} aria-label="Vaihda järjestyssuunta">${sort.column===''?'↕':sort.dir==='desc'?'↓ Laskeva':'↑ Nouseva'}</button></div>`);
   });
   return template.innerHTML;
 }
 function tableHTML(id,unfiltered=false){
   const d=datasets[id],s=unfiltered?tableDefault(id):tableState(id),allRows=selectedRows(id,unfiltered),rows=unfiltered?allRows:s.show==='all'?(delivery?allRows.slice(0,s.limit||200):allRows):allRows.slice(0,10),identity=identityColumn(d),barMax=d.bars?Math.max(...d.rows.map(r=>r[d.bars]??0)):0;
   function rowHTML(r,baseline=false){return `<tr${baseline?' class="baseline-row"':''}${r.detail_key?` data-detail-row="${r.detail_key}" data-detail-table="${id}"`:''}>${d.columns.map(c=>{
     const classes=[c.key===identity?'identity':'',c.key==='rank'?'rank':'',c.key===d.bars?'score':''].filter(Boolean).join(' ');
     let value=baseline&&['kills','deaths','pulls'].includes(c.key)?number(r[c.key],2):display(r[c.key],c,r);
     if(c.key===identity&&r.detail_key)value=`<button class="detail-toggle" data-detail-toggle="${r.detail_key}" data-detail-table="${id}" aria-expanded="${(!unfiltered&&expandedDetails.has(r.detail_key))}" aria-controls="detail-${r.detail_key}">${value} <span aria-hidden="true">${(!unfiltered&&expandedDetails.has(r.detail_key))?'−':'+'}</span></button>`;
     return `<td${classes?` class="${classes}"`:''}>${value}${c.key===d.bars&&r[c.key]!=null?`<i class="bar-track" aria-hidden="true"><span style="width:${r[c.key]/barMax*100}%"></span></i>`:''}</td>`;
   }).join('')}</tr>${r.detail_key&&(!unfiltered&&expandedDetails.has(r.detail_key))?`<tr id="detail-${r.detail_key}" class="roster-row"><td colspan="${d.columns.length}">${rosterHTML(r,id)}</td></tr>`:''}`;}
   const filtered=s.q||s.expansion!=='all'||s.role!=='all';
   return `<div class="table-meta" role="status"><span>${rows.length} / ${allRows.length} riviä${allRows.length!==d.rows.length?' · koko listassa '+d.rows.length:''}${filtered?' <span class="filtered">· Suodatettu alkuperäinen lista. Sijoitukset säilyvät.</span>':''}</span><span>Puuttuva havainto: —</span></div><div class="table-scroll${!unfiltered&&s.show==='all'&&allRows.length>10?' table-scroll--expanded':''}" tabindex="0" role="region" aria-label="${escape(d.metric)}: taulukko"><table><caption class="sr-only">${escape(d.metric)}</caption><thead><tr>${d.columns.map(c=>`<th scope="col" class="${c.key===identity?'identity':c.key==='rank'?'rank':''}"${s.sort===c.key?` aria-sort="${s.dir==='asc'?'ascending':'descending'}"`:''}><button data-sort="${c.key}" data-table="${id}">${escape(c.label)}${s.sort===c.key?(s.dir==='asc'?' ↑':' ↓'):''}</button></th>`).join('')}</tr></thead><tbody>${(id==='survival'||id.startsWith('survival-'))&&d.baseline?rowHTML(d.baseline,true):''}${rows.map(r=>rowHTML(r)).join('')||`<tr><td class="empty" colspan="${d.columns.length}">Ei hakua vastaavia rivejä. Muuta hakua tai suodatusta.</td></tr>`}</tbody></table></div>${!unfiltered&&allRows.length>10?`<div class="row-count-controls">${delivery&&s.show==='all'&&rows.length<allRows.length?`<button data-more-rows="${id}">Näytä seuraavat ${Math.min(200,allRows.length-rows.length)} riviä</button>`:''}<button data-show-rows="${id}">${s.show==='all'?'Näytä ensimmäiset 10':'Näytä kaikki '+allRows.length+' riviä'}</button></div>`:''}`;
 }
 function tableSection(s,includeHeading=true){
   const d=datasets[s.id],exp=[...new Set(d.rows.map(r=>r.expansion).filter(Boolean))].sort(compareExpansions),roles=[...new Set(d.rows.flatMap(r=>r.roles||[r.role]).filter(Boolean))];
   const winners=[];
   return (includeHeading?heading(s):'')+(s.id==='players'?`<div class="table-tools no-print"><label>Lisäosa<select id="attempt-expansion"><option value="all">Kaikki lisäosat</option>${Object.entries(expansions).map(([key,label])=>`<option value="${key}"${key===attemptExpansion?' selected':''}>${label}</option>`).join('')}</select></label></div><h3 class="selected-class-title">${escape(attemptExpansion==='all'?'Kaikki lisäosat':expansions[attemptExpansion])}</h3>`:'')+(s.id==='player-parses'?`<div class="table-tools no-print"><label>Lisäosa<select id="player-expansion"><option value="all">Kaikki lisäosat</option>${Object.entries(expansions).map(([key,label])=>`<option value="${key}"${key===playerExpansion?' selected':''}>${label}</option>`).join('')}</select></label></div><h3 class="selected-class-title">${escape(playerExpansion==='all'?'Kaikki lisäosat':expansions[playerExpansion])}</h3>`:'')+(s.id==='character-sessions'?`<div class="table-tools no-print"><label>Lisäosa<select id="session-expansion"><option value="all">Kaikki lisäosat</option>${Object.entries(expansions).map(([key,label])=>`<option value="${key}"${key===sessionExpansion?' selected':''}>${label}</option>`).join('')}</select></label></div><h3 class="selected-class-title">${escape(sessionExpansion==='all'?'Kaikki lisäosat':expansions[sessionExpansion])}</h3>`:'')+(s.id==='survival'?`<div class="table-tools no-print"><button data-survival-view="characters" aria-pressed="${survivalMode==='characters'}">Hahmoittain</button><button data-survival-view="raids" aria-pressed="${survivalMode==='raids'}">Raididungeonittain</button><label>Lisäosa<select id="survival-expansion"><option value="all">Kaikki lisäosat</option>${Object.entries(expansions).map(([key,label])=>`<option value="${key}"${key===survivalExpansion?' selected':''}>${label}</option>`).join('')}</select></label></div><h3 class="selected-class-title">${escape(survivalExpansion==='all'?'Kaikki lisäosat':expansions[survivalExpansion])}</h3>`:'')+baselineHTML(s.id)+`<div class="table-tools no-print">${s.id==='hundred-parses'?`<button data-hundred-other aria-pressed="${tableState(s.id).others==='1'}">${tableState(s.id).others==='1'?'Näytä vain päärajaus':'Näytä myös muut'}</button>`:''}<label for="search-${s.id}">Hae tästä taulukosta<input id="search-${s.id}" type="search" data-search="${s.id}" placeholder="Nimi, raidi tai muu hakusana" autocomplete="off"></label>${exp.length>1&&s.id!=='survival'?`<label>Lisäosa<select data-expansion="${s.id}"><option value="all">Kaikki lisäosat</option>${exp.map(e=>`<option value="${e}">${escape(expansions[e])}</option>`).join('')}</select></label>`:''}${roles.length>1?`<label>Rooli<select data-role="${s.id}"><option value="all">Kaikki roolit</option>${roles.map(r=>`<option value="${r}">${role(r)}</option>`).join('')}</select></label>`:''}<button data-reset="${s.id}">Tyhjennä suodatus</button><button class="csv" data-csv="${s.id}">Lataa CSV ↓</button></div><div id="results-${s.id}" class="table-results" data-dataset="${s.id}">${tableHTML(s.id)}</div>${d.role_baselines?`<div class="baseline">Killan vertailu: lisäosan vähintään 5 kaadon hahmo–roolikohtaiset raidi-illat<br>${d.role_baselines.map(b=>`${role(b.role)}: ka ${number(b.average_parse,2)} % · mediaanit ${number(b.median_parse,2)} % (${number(b.count)} iltaa)`).join('<br>')}</div>`:''}<div class="table-bottom"><p class="note">${escape(d.notes)}${winners.length?'<br><strong>Korkein mediaani myös Top-listan ulkopuolelta: '+winners.map(r=>`${escape(r.name)} (${role(r.role)}), ${number(r.median_all_kills,2)} %, keskiarvosija ${r.rank}`).join('; ')+'.</strong>':''}${d.editorial_note?'<br>'+escape(d.editorial_note):''}</p><a href="#${s.chapter==='parset'?'parse-methods':'methods'}">Määritelmät ↑</a></div>`;
 }
 function rankingSectionHTML(){
   const view=rankingView(),expLabel=rankingExpansion==='all'?'Kaikki lisäosat':expansions[rankingExpansion],classLabel=rankingClass==='all'?'Kaikki classit':rankingClass.replace('DeathKnight','Death Knight');
   return heading(rankingConfig)+`<div class="table-tools ranking-selectors no-print"><label>Lisäosa<select id="ranking-expansion"><option value="all">Kaikki lisäosat</option>${Object.entries(expansions).map(([key,label])=>`<option value="${key}"${key===rankingExpansion?' selected':''}>${label}</option>`).join('')}</select></label><label>Class<select id="ranking-class"><option value="all">Kaikki classit</option>${rankingClasses.map(cls=>`<option value="${cls}"${cls===rankingClass?' selected':''}>${cls.replace('DeathKnight','Death Knight')}</option>`).join('')}</select></label></div><div id="ranking-panel" aria-label="${escape(expLabel)} · ${escape(classLabel)}"><h3 class="selected-class-title">${escape(expLabel)} · ${escape(classLabel)}</h3>${tableSection({id:view.id,chapter:'parset'},false)}</div>`;
 }
 function renderAttempts(){datasets.players=attemptViews[attemptExpansion];sectionBody('players').innerHTML=tableSection(sections.find(s=>s.id==='players'));syncTools('players');}
 function survivalSection(){const section=sections.find(s=>s.id==='survival');return tableSection({...section,subtitle:survivalMode==='raids'?datasets.survival.qualification:section.subtitle});}
 function renderSurvival(){datasets.survival=(survivalMode==='raids'?survivalRaidViews:survivalViews)[survivalExpansion];sectionBody('survival').innerHTML=survivalSection();syncTools('survival');}
 function renderSessions(){datasets['character-sessions']=sessionViews[sessionExpansion];sectionBody('character-sessions').innerHTML=tableSection(sections.find(s=>s.id==='character-sessions'));syncTools('character-sessions');}
 function renderPlayers(){datasets['player-parses']=playerViews[playerExpansion];sectionBody('player-parses').innerHTML=tableSection(sections.find(s=>s.id==='player-parses'));syncTools('player-parses');}
 function renderRanking(){ sectionBody('character-parses').innerHTML=rankingSectionHTML();syncTools(rankingView().id); }
 const progressIsPulls=datasets.progress.unit==='pulls';
 const progressKeys=progressIsPulls?{proge:'progress_pulls',farm:'repeat_pulls',boss:'pulls'}:{proge:'progress_hours',farm:'repeat_hours',boss:'hours'};
 const progressAmount=value=>`${number(value,progressIsPulls?0:1)} ${progressIsPulls?'pullia':'h'}`;
  function progressChart() {
    const data = datasets.progress;
    const rows = data.rows.filter(r => r.month >= state.from && r.month <= state.to);
    const W=1100,H=320,left=48,right=18,top=67,bottom=34,plotW=W-left-right,plotH=H-top-bottom;
    const max = Math.max(10, ...rows.map(r => (r[progressKeys.proge] ?? 0) + (r[progressKeys.farm] ?? 0)));
    const tick = progressIsPulls ? Math.max(1,10**Math.floor(Math.log10(max/5))) : 5;
    const interval = progressIsPulls ? [1,2,5,10].map(v=>v*tick).find(v=>v>=max/5) : tick;
    const ceiling = Math.ceil(max/interval)*interval, step=plotW/rows.length;
    const y = h => top+plotH-h/ceiling*plotH;
    const x = i => left+(i+.5)*step;
    const grid = Array.from({length:Math.round(ceiling/interval)+1},(_,i) => {const v=i*interval;return `<line x1="${left}" x2="${W-right}" y1="${y(v)}" y2="${y(v)}" stroke="#303230"/><text x="${left-12}" y="${y(v)+4}" fill="#a9aaa6" font-size="14" text-anchor="end">${number(v)}</text>`;}).join('');
    const bounds = data.boundaries.map((b,i)=> {
      const startMonth=b.date.slice(0,7), endMonth=data.boundaries[i+1]?.date.slice(0,7) || '2026-10';
      const begin = rows.findIndex(r => r.month >= startMonth);
      const end = rows.findIndex(r => r.month >= endMonth);
      if (begin === -1 || endMonth <= rows[0].month) return '';
      const a = rows[0].month > startMonth ? left : left+begin*step;
      const z = end === -1 ? W-right : left+end*step;
      return `<line x1="${a}" x2="${z}" y1="22" y2="22" stroke="${colors[b.expansion]}" stroke-width="2"/><text x="${(a+z)/2}" y="15" text-anchor="middle" font-size="14" fill="${colors[b.expansion]}">${short[b.expansion]}</text><line x1="${a}" x2="${a}" y1="28" y2="${H-bottom}" stroke="${colors[b.expansion]}" stroke-opacity=".22"/>`;
    }).join('');
    const labels = rows.map((r,i)=> (i===0 && !rows.slice(1,4).some(m=>m.month.endsWith('-01'))) || r.month.endsWith('-01') ? `<text x="${x(i)}" y="${H-8}" text-anchor="middle" fill="#a9aaa6" font-size="14">${r.month.slice(0,4)}</text>`:'').join('');
    const annotations = data.annotations.filter(a => state.reveal || ['Lady Vashj',"Kil'jaeden",'The Lich King','Garrosh Hellscream'].includes(a.boss));
    const bars = rows.map((r,i)=>{
      const selected=r.month===state.month, label = r[progressKeys.proge] == null ? `${r.month}: ei aineistoa tässä rajauksessa` : `${r.month}: proge ${progressAmount(r[progressKeys.proge])}, farmi ${progressAmount(r[progressKeys.farm])}`;
      const a=annotations.find(a=>a.month===r.month);
      const total=(r[progressKeys.proge] ?? 0)+(r[progressKeys.farm] ?? 0);
      const bw=Math.max(2,step*.72);
      const visible=r[progressKeys.proge] == null ? `<line x1="${x(i)-bw/2}" x2="${x(i)+bw/2}" y1="${H-bottom-3}" y2="${H-bottom-3}" stroke="#a9aaa6" stroke-dasharray="2 2"/>` : `<rect x="${x(i)-bw/2}" y="${y(r[progressKeys.farm])}" width="${bw}" height="${r[progressKeys.farm]/ceiling*plotH}" fill="#777771"/><rect x="${x(i)-bw/2}" y="${y(total)}" width="${bw}" height="${r[progressKeys.proge]/ceiling*plotH}" fill="#d5b77a"/>`;
      const labelY = Math.min(y(total)-18, top+18+(i%3)*24);
      const annotation=a ? `<text x="${x(i)}" y="${labelY}" text-anchor="${i>rows.length-8?'end':'middle'}" fill="#d5b77a" font-size="12">${escape(a.boss)}</text><line x1="${x(i)}" x2="${x(i)}" y1="${labelY+4}" y2="${y(total)-2}" stroke="#d5b77a"/>` : '';
      return `<g class="month-hit${selected?' selected':''}" tabindex="0" role="button" data-month="${r.month}" aria-label="${escape(label)}" aria-pressed="${selected}"><title>${escape(label)}</title><rect class="hit" x="${left+i*step}" y="${top-5}" width="${step}" height="${plotH+6}"/>${visible}${annotation}</g>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${progressIsPulls?'Kuukausittaiset pullit':'Kuukausittainen bossitaisteluaika'}. Valitse kuukausi tarkastellaksesi sen sisältöä." role="group"><text x="${left}" y="47" fill="#a9aaa6" font-size="12">${progressIsPulls?'PULLEJA / KK':'BOSSITAISTELUTUNTEJA / KK'}</text>${grid}${bounds}${labels}${bars}</svg>`;
  }

  function detailHTML(month) {
    const row=datasets.progress.rows.find(r=>r.month===month);
    if (!row) return `<p class="month-title">Yksi kuukausi.<br>Monta bossia.</p><p class="note">Valitse pylväs hiirellä, koskettamalla tai näppäimistöllä. Näet ${progressIsPulls?'pullimäärän':'taisteluajan'} ja progebossien osuudet.</p><p class="note">← → siirtää valintaa kaaviossa.<br>Enter lukitsee valinnan.</p>`;
    if (row[progressKeys.proge] == null) return `<p class="month-title">${escape(month)}</p><p class="note">Ei aineistoa tässä rajauksessa. Puuttuva havainto ei tarkoita ${progressIsPulls?'nollaa pullia':'nollaa tuntia'}.</p>`;
    return `<p class="month-title">${escape(month)}</p><dl><div><dt>${progressIsPulls?'Pulleja yhteensä':'Taistelua yhteensä'}</dt><dd>${progressAmount(row[progressKeys.proge]+row[progressKeys.farm])}</dd></div><div><dt>Proge</dt><dd class="gold">${progressAmount(row[progressKeys.proge])}</dd></div><div><dt>Farmi</dt><dd>${progressAmount(row[progressKeys.farm])}</dd></div></dl>${row.bosses.length ? `<p class="note">${progressIsPulls?'Progepullien':'Progeajan'} jakautuminen:</p><ul>${row.bosses.map(b=>`<li>${escape(b.boss)} <strong>${progressAmount(b[progressKeys.boss])}</strong></li>`).join('')}</ul>` : '<p class="note">Ei progetaistelua tässä kuussa.</p>'}${progressIsPulls&&row.farm_bosses?(row.farm_bosses.length?`<p class="note">Farmipullien jakautuminen:</p><ul class="farm-bosses">${row.farm_bosses.map(b=>`<li>${escape(b.boss)} <strong>${progressAmount(b.pulls)}</strong></li>`).join('')}</ul>`:'<p class="note">Ei farmipulleja tässä kuussa.</p>'):''}`;
  }

  function monthTable() {
    return `<div class="table-scroll"><table><caption class="sr-only">${progressIsPulls?'Pullit':'Bossitaistelutunnit'} kuukausittain</caption><thead><tr><th>Kuukausi</th><th>Proge (${progressIsPulls?'pullia':'h'})</th><th>Farmi (${progressIsPulls?'pullia':'h'})</th><th>Yhteensä (${progressIsPulls?'pullia':'h'})</th></tr></thead><tbody>${datasets.progress.rows.filter(r=>r.month>=state.from&&r.month<=state.to).map(r=>`<tr><td>${r.month}</td><td>${number(r[progressKeys.proge],progressIsPulls?0:2)}</td><td>${number(r[progressKeys.farm],progressIsPulls?0:2)}</td><td>${number(r[progressKeys.proge]==null?null:r[progressKeys.proge]+r[progressKeys.farm],progressIsPulls?0:2)}</td></tr>`).join('')}</tbody></table></div>`;
  }
 function staticChart(svg){return svg.replace(/ id="(?:progress-chart|trend-chart)"/g,'').replace(/ data-(?:month|week)="[^"]*"/g,'').replace(/ tabindex="[^"]*"/g,'');}
 function fullProgressChart(){const saved={...state};Object.assign(state,chartDefaults);const svg=progressChart();Object.assign(state,saved);return staticChart(svg);}
 function fullTrendChart(){const saved=trendExpansion;trendExpansion='all';const svg=trendChart();trendExpansion=saved;return staticChart(svg);}
 function progressSection(s){const d=datasets.progress;return heading(s)+`<div class="chart-tools no-print"><label>Alkukuukausi<input id="from-month" type="month" min="2019-11" max="2026-09" value="${state.from}"></label><label>Loppukuukausi<input id="to-month" type="month" min="2019-11" max="2026-09" value="${state.to}"></label><button id="zoom-reset">Koko aikajana</button><button id="csv-progress">Lataa CSV ↓</button></div><div class="legend no-print"><span>Proge</span><span class="repeat">Farmi</span><span class="missing">Puuttuva kuukausi</span></div><div class="chart-layout"><div class="chart-wrap" tabindex="0" role="region" aria-label="${progressIsPulls?'Kuukausittaiset pullit':'Kuukausittainen bossitaisteluaika'}">${progressChart()}</div><aside id="chart-detail" class="chart-detail" aria-label="Kuukauden tiedot">${detailHTML(state.month)}</aside></div><div class="print-chart">${fullProgressChart()}</div><p class="note">Kuukauden pylväs voi sisältää useita bosseja. Bossin nimi osoittaa yhden progeosuuden, ei koko kuukauden ${progressIsPulls?'pullimäärää':'taisteluaikaa'}. Ensikaadon ${progressIsPulls?'pulli':'taistelu'} kuuluu progeen.</p><div class="chart-summary"><div><strong class="gold">${progressAmount(d[progressKeys.proge])}</strong><span>progea, koko aineisto</span></div><div><strong>${progressAmount(d[progressKeys.farm])}</strong><span>farmia, koko aineisto</span></div><div><strong>${progressAmount(progressIsPulls?datasets.totals.values.pulls:datasets.totals.values.combat_hours)}</strong><span>${progressIsPulls?'pulleja':'bossitaistelua'} yhteensä</span></div></div><div class="under-chart no-print"><button id="reveal" class="text-button" aria-expanded="${state.reveal}">${state.reveal?'Piilota lisänostot':'Näytä lisää progepiikkejä'}</button><a href="#methods" class="text-button">Miten proge määritellään?</a><button id="chart-table-toggle" class="text-button" aria-expanded="false">Näytä tiedot taulukkona</button><button id="progress-reset" class="text-button">Palauta kaavion aloitustila</button></div>${state.reveal?'<p class="reveal no-print">Valitse kuukausi nähdäksesi nimetyn bossin todellisen osuuden ja muut saman kuukauden progebossit.</p>':''}<div id="chart-table" class="no-print" hidden>${monthTable()}</div>`;}
 function trendRows(){const all=datasets['parse-trend'].rows,bounds=datasets['parse-trend'].boundaries;if(trendExpansion==='all')return all;const i=bounds.findIndex(b=>b.expansion===trendExpansion),a=bounds[i].date.slice(0,10),b=bounds[i+1]?.date.slice(0,10)||'2026-10-01';return all.filter(r=>r.week>=a.slice(0,7)+'-01'&&r.week<b);}
 function trendChart(){
   const data=datasets['parse-trend'],rows=trendRows(),W=1100,H=420,left=45,right=15,top=85,plotBottom=270,width=W-left-right;
   const start=Date.parse(rows[0].week),end=Date.parse(rows.at(-1).week),x=w=>left+(Date.parse(w)-start)/(end-start||1)*width,y=v=>top+(100-v)/100*(plotBottom-top);
   const segments=series=>{const out=[];let path='';for(const r of series){if(r.average_parse==null){if(path)out.push(path);path='';}else path+=(path?' L':'M')+x(r.week).toFixed(2)+','+y(r.average_parse).toFixed(2);}if(path)out.push(path);return out;};
   const visibleWeeks=new Set(rows.map(r=>r.week)),counts=data.weekly_counts.filter(r=>visibleWeeks.has(r.week)),maxCount=Math.max(1,...counts.map(r=>r.kills));
   const bands=data.tiers.map((t,i)=>{const a=Math.max(left,x(t.start)),z=Math.min(W-right,x(t.end));if(a>=z)return '';const label=t.raids.join(', ');return `<g class="tier-band"><title>${escape(t.label+' · '+label+' · '+date(t.start)+'–'+date(t.end))}</title><rect x="${a}" y="${top-12}" width="${z-a}" height="${plotBottom-top+12}" fill="${colors[t.expansion]}" fill-opacity="${i%2?.11:.055}"/><line x1="${a}" x2="${a}" y1="35" y2="${plotBottom}" stroke="${colors[t.expansion]}" stroke-opacity=".3"/>${z-a>34?`<text x="${(a+z)/2}" y="40" fill="${colors[t.expansion]}" font-size="11" text-anchor="middle">${escape(t.label)}</text>`:''}</g>`;}).join('');
   const grid=[0,25,50,75,100].map(v=>`<line x1="${left}" x2="${W-right}" y1="${y(v)}" y2="${y(v)}" stroke="#303230"/><text x="${left-12}" y="${y(v)+4}" fill="#a9aaa6" text-anchor="end" font-size="13">${v}</text>`).join('');
   const bounds=data.boundaries.map((b,i)=>{const a=Math.max(left,x(b.date.slice(0,10))),z=Math.min(W-right,x(data.boundaries[i+1]?.date.slice(0,10)||data.coverage_end));if(a>=z)return '';return `<line x1="${a}" x2="${z}" y1="25" y2="25" stroke="${colors[b.expansion]}"/><text x="${(a+z)/2}" y="17" fill="${colors[b.expansion]}" font-size="13" text-anchor="middle">${short[b.expansion]}</text>`;}).join('');
   const labels=rows.filter((r,i)=>(i===0&&!rows.slice(1,10).some(n=>n.week.slice(0,4)!==r.week.slice(0,4)))||(i>0&&r.week.slice(0,4)!==rows[i-1].week.slice(0,4))).map(r=>`<text x="${x(r.week)}" y="${H-6}" fill="#a9aaa6" font-size="13" text-anchor="middle">${r.week.slice(0,4)}</text>`).join('');
   const barWidth=Math.max(1,Math.min(14,width/Math.max(1,rows.length)*.65));
   const bars=counts.map(r=>{const h=r.kills/maxCount*65;return `<rect class="trend-count" x="${x(r.week)-barWidth/2}" y="${390-h}" width="${barWidth}" height="${h}" fill="#93958c" fill-opacity=".65"><title>Viikko ${date(r.week)}: ${number(r.kills)} kaatoa, joista ${number(r.scored_kills)} parseilla</title></rect>`;}).join('');
   const roleLines=trendRoles?Object.entries(roleColors).map(([r,color])=>{const values=data.role_rows[r].filter(v=>visibleWeeks.has(v.week));return segments(values).map(d=>`<path class="trend-role-line" data-curve-role="${r}" d="${d}" fill="none" stroke="${color}" stroke-width="2.5"/>`).join('')+values.filter(v=>v.average_parse!=null).map(v=>`<circle cx="${x(v.week)}" cy="${y(v.average_parse)}" r="2" fill="${color}"><title>${escape(role(r))} · ${date(v.week)}: ${number(v.average_parse,2)} %</title></circle>`).join('');}).join(''):'';
   const legend=trendRoles?Object.entries(roleColors).map(([r,color],i)=>`<line x1="${left+i*170}" x2="${left+25+i*170}" y1="61" y2="61" stroke="${color}" stroke-width="3"/><text x="${left+33+i*170}" y="65" fill="${color}" font-size="12">${escape(role(r))}</text>`).join('')+`<text x="${left+540}" y="65" fill="#a9aaa6" font-size="11">Kaikki roolit: himmeä kultainen vertailukäyrä</text>`:`<text x="${left}" y="65" fill="#d5b77a" font-size="12">Kaikki roolit · neljän kalenteriviikon parsekeskiarvo</text>`;
   return `<svg id="trend-chart" class="chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Parsekehitys, raiditierit ja viikoittaiset kaatomäärät. Puuttuvat viikot näkyvät katkoksina.">${bands}${grid}${bounds}${labels}${legend}${segments(rows).map(d=>`<path class="trend-segment" d="${d}" fill="none" stroke="#d5b77a" stroke-opacity="${trendRoles?.3:1}" stroke-width="${trendRoles?1.5:2.6}"/>`).join('')}${roleLines}${rows.filter(r=>r.average_parse!=null).map(r=>`<circle class="trend-point" tabindex="0" role="button" data-week="${r.week}" cx="${x(r.week)}" cy="${y(r.average_parse)}" r="${trendRoles?3:5}" fill="#d5b77a" fill-opacity="${trendRoles?.4:1}" aria-label="${date(r.week)}: ${number(r.average_parse,2)} %, ${r.scored_kills} kaatoa neljän viikon ikkunassa"><title>${date(r.week)}: ${number(r.average_parse,2)} %</title></circle>`).join('')}<text x="${left}" y="310" fill="#a9aaa6" font-size="12">KAATOJA / KALENTERIVIIKKO</text><text x="${W-right}" y="310" fill="#a9aaa6" font-size="11" text-anchor="end">Pylväsasteikko 0–${number(maxCount)}</text><line x1="${left}" x2="${W-right}" y1="390" y2="390" stroke="#545650"/>${bars}</svg>`;
 }

 function trendColumns(){return [{key:'week',label:'Viikko',format:'date'},{key:'average_parse',label:'Keskiarvo %',format:'decimal2'},{key:'scored_kills',label:'Kaatoja 4 viikon ikkunassa'},{key:'weekly_kills',label:'Viikon kaadot'},{key:'weekly_scored_kills',label:'Viikon kaadot parseilla'},...(trendRoles?['HEALER','TANK','DPS'].map(r=>({key:r,label:role(r)+' %',format:'decimal2'})):[])];}
 function trendExportRows(){const d=datasets['parse-trend'],counts=new Map(d.weekly_counts.map(r=>[r.week,r])),roles=Object.fromEntries(Object.entries(d.role_rows).map(([k,rs])=>[k,new Map(rs.map(r=>[r.week,r.average_parse]))]));return trendRows().map(r=>({...r,weekly_kills:counts.get(r.week).kills,weekly_scored_kills:counts.get(r.week).scored_kills,...Object.fromEntries(Object.entries(roles).map(([k,values])=>[k,values.get(r.week)]))}));}
 function trendTableHTML(){const columns=trendColumns();return `<div class="table-scroll"><table><caption class="sr-only">Parsekeskiarvot ja kaatomäärät</caption><thead><tr>${columns.map(c=>`<th>${escape(c.label)}</th>`).join('')}</tr></thead><tbody>${trendExportRows().map(r=>`<tr>${columns.map(c=>`<td>${display(r[c.key],c,r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
 function trendSection(s){
   const explanation='Ensin raidaajien keskiarvo per kaato, sitten kaadot yhtä suurella painolla neljältä kalenteriviikolta. Katkos tarkoittaa, ettei kyseiseltä viikolta ole havaintoja. Lähennys rajaa aikajanaa; se ei laske valmiita keskiarvoja uudelleen. Raiditierit alkavat killan ensimmäisistä kirjatuista pulleista, eivät raidien julkaisupäivistä. Pylväät näyttävät kaikki rajauksen kaadot viikolta, myös ilman parsea. Vanhat raidit säilyvät käyrän mukana.';
   return heading(s)+`<div class="chart-tools no-print"><label>Aikajanan lähennys<select id="trend-expansion"><option value="all">Koko aikajana</option>${Object.entries(expansions).map(([e,n])=>`<option value="${e}"${e===trendExpansion?' selected':''}>${n}</option>`).join('')}</select></label><button id="trend-role-toggle" aria-pressed="${trendRoles}">${trendRoles?'Yhdistä roolit':'Erottele roolit'}</button><button id="csv-trend">Lataa CSV ↓</button></div>
   <div class="trend-live"><div class="chart-wrap" tabindex="0" role="region" aria-label="Parsekehitys">${trendChart()}</div>
   <p id="trend-detail" class="trend-detail" role="status">Klikkaa käyrää tai aikajanan kohtaa nähdäksesi viikon raididungeonit ja parsekeskiarvot.</p>
   <button id="trend-table-toggle" class="text-button" aria-expanded="false">Näytä tiedot taulukkona</button>
   <div class="trend-inspector" tabindex="0" role="region" aria-label="Parsekehityksen taulukot ja selitteet" data-section-scroll>
   <div id="trend-raids" aria-live="polite"></div><div id="trend-table" hidden>${trendTableHTML()}</div><p class="note">${explanation}</p>
   </div></div><div class="print-chart">${fullTrendChart()}<p class="note">${explanation}</p></div>`;
 }

 function historyMethod(s){return heading(s)+`<div class="definition-grid">${[
   ['Merkityksellinen vaikeustaso','WotLK Onyxia, Vault of Archavon ja Tol Barad / Baradin Hold on rajattu pois kaikista tämän esityksen merkityksellisen vaikeustason tilastoista. Vanilla Onyxia säilyy mukana. Vanilla/TBC: saatavilla olevat vaikeudet. WotLK: ToC, ICC ja Ruby Sanctum Heroic. Ulduar: kullekin bossille sen kaadoista löytyvä korkein hardmode-taso. Taso määritetään bossikohtaisesti kaikista haetuista raidikoista; samaa tasoa käytetään myös wipeihin. Jos bossilta ei löydy hardmodea, sen normaali muoto säilyy mukana. Alemman tason hardmode-yritykset jäävät pois. Muut WotLK-raidit: Normal. Cataclysm/MoP: Heroic. Päärajaus käyttää 25/40 hengen raideja.'],
   ['Bossitaisteluaika','Tunnit sisältävät vain bossitaistelut. Trashit ja muu aika eivät sisälly lukuihin. Raidaajien yhteisaika summaa kaikkien mukana olleiden taisteluajat.'],
   ['Proge ja farmi',`Progea ${progressIsPulls?'ovat pullit':'on aika'} ensimmäiseen kirjattuun kaatoon asti, ensikaatopulli mukaan lukien. Ensikaato ja pullit lasketaan vain esityksen 25/40 hengen ja merkityksellisen vaikeustason rajauksesta. Myöhemmät pullit, myös wipet, ovat farmia.`]
 ].map(([t,b])=>`<article><h3>${t}</h3><p>${b}</p></article>`).join('')}</div><p class="note">Historia ja pelaajatilastot: 25/40 henkeä ja merkityksellinen vaikeustaso. Puuttuva havainto näytetään viivana tai aukkona. Hahmot ja pelaajat ovat erilliset identiteetit; yhdellä pelaajalla voi olla useita hahmoja. Kaikki hahmon aliakset on niputettu yhteen.</p>`;}
 function parseMethod(s){return heading(s)+`<div class="definition-grid">${[
   ['Bossien parhaiden ka %','Jokaiselta vertailukelpoiselta bossilta otetaan paras parse. Pelaajataulukossa mukana ovat vain valitussa lisäosarajauksessa 50 kaatoa ja 10 eri bossia saavuttaneet hahmot. Paras valitaan erikseen jokaiselle hahmo–bossi-parille roolista riippumatta, ja näiden tulosten keskiarvo on pelaajan arvo.'],
   ['Kaikkien kaatojen mediaani %','Kaikkien rajaukseen kuuluvien kaatoparsejen mediaani. ★ merkitsee listan korkeinta mediaania.'],
   ['Killan vertailu ennen Top-rajausta','Kaikkien kelpoisuusehdot täyttävien rivien mittarikeskiarvot, yhtä suuri paino per hahmo–roolirivi tai pelaaja. Listan pituus ei rajaa vertailupopulaatiota.'],
   ['Hahmot ja roolit','Hahmo, class ja rooli pysyvät hahmolistoilla eri riveinä. DPS, tankki-DPS ja healer-HPS vertaavat omaan ranking-populaatioonsa. Pelaajalista yhdistää tarkistetut hahmot ja roolit. Parhaat raidit yhdistää samalla hahmolla saman raidin aikana käytetyt roolit yhdelle riville.'],
   ['Kelpoisuus näkyy jokaisella listalla','Lisäosa- ja class-listat: vähintään 50 kaatoa ja 10 bossia. Myös kaikkien lisäosien hahmolista: 50 kaatoa ja 10 bossia. Pelaajalista: jokaiselta mukaan tulevalta hahmolta vähintään 50 kaatoa ja 10 eri bossia valitussa lisäosarajauksessa, roolit yhdistettynä. Rajat sovelletaan ennen Top-rajausta.'],
   ['Ajoneuvobossien poikkeukset','Flame Leviathan ja Gunship jäävät bossien parhaiden keskiarvon, bossirajan ja mediaanien ulkopuolelle. Niiden validit parset ovat mukana kaatomäärissä ja yksittäisten 100 prosentin parsejen listassa.'],
   ['100 prosentin parset omana kokonaisuutenaan','Kaikki tarkat 100:t säilyvät. Oletuksena näkyy päärajaus; Näytä myös muut tuo muut raidimuodot samaan taulukkoon. Koko ja vaikeus näkyvät jokaisella rivillä. Ei lisäbossipoissulkuja.']
 ].map(([t,b])=>`<article><h3>${t}</h3><p>${b}</p></article>`).join('')}</div><p class="note">Lisäosa ja class valitsevat ennalta lasketun rankingin ja vertailupopulaation. Haku ja rooli rajaavat sen julkaistuja rivejä. Ne säilyttävät alkuperäiset pisteet, sijoitukset ja vertailupopulaation. Aineisto on kiinteä katsaus 20.9.2026 asti.</p>`;}
 function totalsHTML(s){const t=datasets.totals.values;return heading(s)+`<div class="stats-grid">${[
   [t.characters,'hahmoa',0],[t.players,'pelaajaa',0],[t.kills,'kaatoa',0],[t.pulls,'pullia',0],[t.kill_pull_percentage,'kaadot / pullit %',2],[t.combat_hours,'killan bossitaistelutuntia',1],[t.raider_days,'days bossitaistelu playediä',0],[t.sessions,'raidi-iltaa',0],[t.expansions,'lisäosaa',0],[t.raid_dungeons,'raidia',0],[datasets['player-highlights'].boss_completion.total_bosses,'bossia',0]
 ].map(([v,l,dp])=>`<div class="stat"><strong>${number(v,dp)}</strong><span>${l}</span></div>`).join('')}</div><p class="note">25/40 hengen raidit, merkityksellinen vaikeustaso. Tunnit ovat bossitaistelua.</p>`;}
 function playerHighlightsHTML(){
   const d=datasets['player-highlights'],p=d.daluna,c=d.boss_completion;
   return `<div class="highlights player-highlights">
     <article class="highlight"><span class="hundred-count">${number(d.all_expansions.players)}</span><h3>Pelaajaa kaikissa lisäosissa</h3><p>Mukana kaikissa ${number(d.all_expansions.expansions)} lisäosassa: Vanilla, TBC, WotLK, Cataclysm ja MoP. Saman pelaajan hahmot lasketaan yhteen.</p><p class="highlight-player-names">${d.all_expansions.names.map(escape).join(', ')}</p></article>
     <article class="highlight"><span class="hundred-count">${number(c.total_bosses)} / ${number(c.total_bosses)}</span><h3>${c.players.map(escape).join(', ')}</h3><p>Jokainen aineistossa kaadettu eri bossi tapettuna. Bossit erotellaan lisäosittain.</p></article>
     <article class="highlight"><span class="hundred-count">${number(p.guild_combat_hours_percentage,1)} %</span><h3>${escape(p.name)} mukana</h3><p>Kaikesta killan bossitaisteluajasta: ${number(p.combat_hours,1)} / ${number(d.guild_combat_hours,1)} tuntia.</p></article>
   </div>`;
 }
 function highlightsHTML(s){return heading(s)+`<div class="highlights">${datasets['hundred-highlights'].rows.map((r,i)=>`<article class="highlight"><span class="hundred-count">${r.count} × 100</span><h3>${escape(r.character)}</h3><p>${i===2?'Ainoa kahden DPS-100:n hahmo. Tulokset tulivat eri raidikerroilla.':`${role(r.role)} · samalla raidikäynnillä<br>${escape(r.raid)}, ${date(r.date)}`}</p><p>${r.bosses?r.bosses.map(escape).join('<br>'):r.kills.map(k=>`${escape(k.boss)} — ${date(k.date)}`).join('<br>')}</p>${r.evening_perfects?`<div class="highlight-evening"><h4>Halloweenin yhteissaalis: ${number(r.evening_perfects.count)} × 100</h4><p>${r.evening_perfects.raiders.map(v=>`${escape(v.character)}: ${number(v.count)} × 100 (${role(v.role)}) — ${v.bosses.map(escape).join(', ')}`).join('<br>')}</p><p>Yhden raidi-illan ennätys: ${number(r.evening_perfects.record_count)} täyttä 100 parsea. Naxxramas, ${date(r.evening_perfects.date)}.</p></div>`:''}</article>`).join('')}</div><p class="note">Nostot koskevat 25/40 hengen merkityksellisen vaikeustason tuloksia.</p>`;}
 function bodyFor(s){
   if(delivery&&!delivery.ready(s.id))return heading(s)+`<p class="load-status" role="status">Tilasto ladataan, kun avaat osion.</p><button data-load-section="${s.id}">Lataa tilasto</button>`;
   if(s.kind==='table')return s.id==='survival'?survivalSection():tableSection(s);
   if(s.kind==='parse-table')return rankingSectionHTML();
   if(s.kind==='cover')return `<div><p class="eyebrow">Univelka / 2019–2026</p><h1>Seitsemän vuotta<br>univelkaa</h1><p class="years">2019 — 2026</p><p class="intro">Kirjattu raidihistoria ensimmäisistä Molten Coren kaadoista Pandarian loppuun. Killan historia, pelaajat ja parset yhdessä tarinassa.</p><a class="scroll-link" href="#historia">Aloita historiasta ↓</a></div><img class="cover-logo" src="${$('guild-logo').src}" alt="Univelka-killan silmälogo">`;
   if(s.kind==='chapter')return `<div class="chapter-number" aria-hidden="true">${s.number}</div><h2>${escape(s.title)}</h2><p>${escape(s.subtitle)}</p><nav class="chapter-links" aria-label="${escape(s.title)}: aiheet">${sections.filter(t=>t.chapter===s.chapter&&!['cover','chapter','closing'].includes(t.kind)).map(t=>`<a href="#${t.id}">${escape(t.title)}</a>`).join('')}</nav>`;
   if(s.kind==='totals')return totalsHTML(s);
   if(s.kind==='history-method')return historyMethod(s);
   if(s.kind==='parse-method')return parseMethod(s);
   if(s.kind==='progress')return progressSection(s);
   if(s.kind==='trend')return trendSection(s);
   if(s.kind==='player-highlights')return heading(s)+playerHighlightsHTML();
   if(s.kind==='highlights')return highlightsHTML(s);
   if(s.kind==='closing')return `<img src="${$('guild-logo').src}" alt=""><h2>Kiitos raidaajille</h2><p>${number(datasets.totals.values.pulls)} yhteistä pullia</p><a class="scroll-link" href="Tietovisa.html">Avaa tietovisa →</a><br><a class="scroll-link" href="#opening">Takaisin alkuun ↑</a>`;
   return '';
 }
 function updateResults(id,preserveScroll=false){const previous=$('results-'+id).querySelector('.table-scroll'),position=preserveScroll&&previous?{top:previous.scrollTop,left:previous.scrollLeft}:null;$('results-'+id).innerHTML=tableHTML(id);if(position){const current=$('results-'+id).querySelector('.table-scroll');current.scrollTop=position.top;current.scrollLeft=position.left;}syncTools(id);if(id==='hundred-parses'){const button=document.querySelector('[data-hundred-other]');button.textContent=tableState(id).others==='1'?'Näytä vain päärajaus':'Näytä myös muut';button.setAttribute('aria-pressed',String(tableState(id).others==='1'));}}
 function syncTools(id){const s=tableState(id);const q=document.querySelector(`[data-search="${id}"]`),e=document.querySelector(`[data-expansion="${id}"]`),r=document.querySelector(`[data-role="${id}"]`);if(q&&q.value!==s.q)q.value=s.q;if(e)e.value=s.expansion;if(r)r.value=s.role;}
 function renderProgress(){const section=sections.find(s=>s.id==='progress');sectionBody('progress').innerHTML=progressSection(section);bindProgress();}
 function selectMonth(month,persist=true){state.month=month;$('chart-detail').innerHTML=detailHTML(month);document.querySelectorAll('[data-month]').forEach(el=>{const selected=el.dataset.month===month;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});if(persist)saveURL('progress');}
 function on(id,event,fn){$(id)?.addEventListener(event,fn);}
 function bindProgress(){
   for(const key of ['from','to'])on(key+'-month','change',e=>{const value=e.target.value;if(!datasets.progress.rows.some(r=>r.month===value)){e.target.value=state[key];return;}state[key]=value;if(state.from>state.to)state[key==='from'?'to':'from']=value;renderProgress();saveURL('progress');});
   on('zoom-reset','click',()=>{Object.assign(state,chartDefaults);renderProgress();saveURL('progress');});
   on('progress-reset','click',()=>{Object.assign(state,chartDefaults);renderProgress();saveURL('progress');});
   on('reveal','click',()=>{state.reveal=!state.reveal;renderProgress();saveURL('progress');});
   on('chart-table-toggle','click',()=>{const hidden=!$('chart-table').hidden;$('chart-table').hidden=hidden;$('chart-table-toggle').setAttribute('aria-expanded',String(!hidden));});
   on('csv-progress','click',()=>download('Univelka-proge.csv',[{key:'month',label:'Kuukausi'},{key:progressKeys.proge,label:progressIsPulls?'Proge (pullia)':'Proge (h)'},{key:progressKeys.farm,label:progressIsPulls?'Farmi (pullia)':'Farmi (h)'}],datasets.progress.rows.filter(r=>r.month>=state.from&&r.month<=state.to)));
   document.querySelectorAll('[data-month]').forEach(el=>{
     el.addEventListener('pointerenter',()=>{if(!state.month)$('chart-detail').innerHTML=detailHTML(el.dataset.month);});
     el.addEventListener('pointerleave',()=>{if(!state.month)$('chart-detail').innerHTML=detailHTML('');});
     el.addEventListener('click',()=>selectMonth(el.dataset.month));el.addEventListener('focus',()=>selectMonth(el.dataset.month));
     el.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='Enter'||e.key===' ')selectMonth(el.dataset.month);else{const all=[...document.querySelectorAll('[data-month]')];all[all.indexOf(el)+(e.key==='ArrowLeft'?-1:1)]?.focus();}}});
   });
 }
 function selectTrendWeek(week,persist=true){
   const r=datasets['parse-trend'].rows.find(r=>r.week===week);if(!r)return;
   trendSelected=week;
   $('trend-detail').textContent=`Viikko ${date(r.week)} · käyrän neljän viikon keskiarvo ${number(r.average_parse,2)} % · ${number(r.scored_kills)} pisteytettyä kaatoa neljän viikon ikkunassa`;
   const count=datasets['parse-trend'].weekly_counts.find(v=>v.week===week);
   $('trend-detail').textContent+=` · tällä viikolla ${number(count.kills)} kaatoa (${number(count.scored_kills)} parseilla)`;
   if(trendRoles)$('trend-detail').textContent+=' · '+['HEALER','TANK','DPS'].map(roleKey=>{const v=datasets['parse-trend'].role_rows[roleKey].find(v=>v.week===week);return role(roleKey)+' '+number(v.average_parse,2)+' %';}).join(' · ');
   const raids=datasets['parse-trend'].weekly_raids.filter(r=>r.week===week);
   const end=new Date(week+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);
   $('trend-raids').innerHTML=`<div class="weekly-raids"><h3>Viikon ${date(week)}–${date(end.toISOString())} raididungeonit</h3><p class="note">Raididungeonit valitulta kalenteriviikolta. Keskiarvot lasketaan vain viikon pisteytetyistä kaadoista; myös pelkkiä wipejä sisältävät raidit näkyvät. Käyrä näyttää neljän viikon liukuvan keskiarvon. ${datasets['parse-trend'].scope}.</p>${raids.length?`<div class="table-scroll" tabindex="0" role="region" aria-label="Valitun viikon raididungeonit"><table><caption class="sr-only">Viikon raididungeonit ja parsekeskiarvot</caption><thead><tr><th class="identity">Raididungeoni</th><th>Lisäosa</th><th>Viikon parsejen ka %</th><th>Kaatoja parseilla</th><th>Parsehavaintoja</th></tr></thead><tbody>${raids.map(r=>`<tr><td class="identity">${escape(r.raid)}</td><td>${display(r.expansion,{format:'expansion'},r)}</td><td class="gold">${number(r.average_parse,2)}</td><td>${number(r.scored_kills)}</td><td>${number(r.parse_observations)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="note">Tällä viikolla ei ole raidihavaintoja tässä rajauksessa.</p>'}</div>`;
   document.querySelectorAll('[data-week]').forEach(el=>{const selected=el.dataset.week===week;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});
   $('trend-table').hidden=true;$('trend-raids').hidden=false;
   $('trend-table-toggle').setAttribute('aria-expanded','false');$('trend-table-toggle').textContent='Näytä tiedot taulukkona';
   document.querySelector('#parse-trend .trend-inspector').scrollTop=0;
   if(persist)saveURL('parse-trend');
 }
 function bindTrend(){
   on('trend-role-toggle','click',()=>{trendRoles=!trendRoles;const selected=trendSelected;sectionBody('parse-trend').innerHTML=trendSection(sections.find(s=>s.id==='parse-trend'));bindTrend();if(selected)selectTrendWeek(selected,false);saveURL('parse-trend');$('trend-role-toggle').focus({preventScroll:true});});
   on('trend-expansion','change',e=>{trendExpansion=e.target.value;trendSelected='';sectionBody('parse-trend').innerHTML=trendSection(sections.find(s=>s.id==='parse-trend'));bindTrend();saveURL('parse-trend');});
   on('csv-trend','click',()=>download('Univelka-parsekehitys.csv',trendColumns(),trendExportRows()));
   on('trend-table-toggle','click',()=>{const hidden=!$('trend-table').hidden;$('trend-table').hidden=hidden;$('trend-raids').hidden=!hidden;$('trend-table-toggle').setAttribute('aria-expanded',String(!hidden));$('trend-table-toggle').textContent=hidden?'Näytä tiedot taulukkona':'Näytä viikon raididungeonit';document.querySelector('#parse-trend .trend-inspector').scrollTop=0;});
   on('trend-chart','click',e=>{if(e.target.closest('[data-week]'))return;const svg=$('trend-chart'),point=svg.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const local=point.matrixTransform(svg.getScreenCTM().inverse()),rows=trendRows();const ratio=Math.max(0,Math.min(1,(local.x-45)/(1100-45-15)));selectTrendWeek(rows[Math.round(ratio*(rows.length-1))].week);});
   document.querySelectorAll('[data-week]').forEach(el=>{
     const select=()=>selectTrendWeek(el.dataset.week);
     el.addEventListener('focus',select);el.addEventListener('click',select);
     el.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='Enter'||e.key===' ')select();else{const all=[...document.querySelectorAll('[data-week]')];all[all.indexOf(el)+(e.key==='ArrowLeft'?-1:1)]?.focus();}}});
   });
 }
 async function applyURL(){
   const raw=location.hash.slice(1),p=raw.includes('=')?new URLSearchParams(raw):new URLSearchParams({section:raw});
   let id=p.get('section')||p.get('scene')||'opening';if(id==='parses'||id==='parse-rankings')id='parset';
   if(id==='parse-all'||id==='class-parses'||id==='expansion-parses'||id==='character-parses'||id.startsWith('parse-class-')||legacyExpansions.some(e=>id==='parse-'+e)){
     rankingExpansion=legacyExpansions.includes(id.replace('parse-',''))?id.replace('parse-',''):p.get('expansion') in expansions?p.get('expansion'):'all';
     const oldClass=id.startsWith('parse-class-')?id.replace('parse-class-',''):p.get('class');
     rankingClass=rankingClasses.find(c=>c.toLowerCase().replace(' ','-')===String(oldClass).toLowerCase())||'all';
     id='character-parses';
   }
   if(id.startsWith('sessions-')&&id.slice(9) in expansions){p.set('expansion',id.slice(9));id='character-sessions';}
   if(id==='hundred-other'){id='hundred-parses';p.set('others','1');}
   if(!sections.some(s=>s.id===id))return;
   if(delivery){const hash=location.hash;navigating=true;if(!await loadSection(id)||location.hash!==hash){navigating=false;return;}}
   if(id==='players'){attemptExpansion=p.get('expansion') in expansions?p.get('expansion'):'all';renderAttempts();}
   if(id==='survival'){survivalMode=p.get('view')==='raids'?'raids':'characters';survivalExpansion=p.get('expansion') in expansions?p.get('expansion'):'all';renderSurvival();}
   if(id==='character-sessions'){sessionExpansion=p.get('expansion') in expansions?p.get('expansion'):'all';renderSessions();}
   if(id==='player-parses'){playerExpansion=p.get('expansion') in expansions?p.get('expansion'):'all';renderPlayers();}
   if(id==='character-parses')renderRanking();
   const tableId=id==='character-parses'?rankingView().id:id;
   if(datasets[tableId]?.columns){const s=tableDefault(tableId),d=datasets[tableId];s.others=id==='hundred-parses'&&p.get('others')==='1'?'1':'0';s.show=p.get('show')==='all'?'all':'10';s.q=(p.get('q')||'').slice(0,150);if(id!=='survival'&&d.rows.some(r=>r.expansion===p.get('expansion')))s.expansion=p.get('expansion');if(d.rows.some(r=>r.role===p.get('role')||r.roles?.includes(p.get('role'))))s.role=p.get('role');if(d.columns.some(c=>c.key===p.get('sort')))s.sort=p.get('sort');if(['asc','desc'].includes(p.get('dir')))s.dir=p.get('dir');tableStates.set(tableStateKey(tableId),s);updateResults(tableId);}
   if(id==='progress'){Object.assign(state,chartDefaults);for(const k of ['from','to','month'])if(datasets.progress.rows.some(r=>r.month===p.get(k)))state[k]=p.get(k);state.reveal=p.get('reveal')==='1';if(state.from>state.to)[state.from,state.to]=[state.to,state.from];renderProgress();}
   if(id==='parse-trend'){trendSelected='';trendRoles=p.get('roles')==='1';trendExpansion=p.get('expansion') in expansions?p.get('expansion'):'all';sectionBody('parse-trend').innerHTML=trendSection(sections.find(s=>s.id===id));bindTrend();if(trendRows().some(r=>r.week===p.get('week')))selectTrendWeek(p.get('week'),false);}
   activeSection=id;navigating=true;$(id).scrollIntoView({behavior:'instant',block:'start'});updateActive(id);setTimeout(()=>{navigating=false;},100);
 }
 function updateActive(id){const chapter=sections.find(s=>s.id===id)?.chapter;document.querySelectorAll('.topbar>nav a').forEach(a=>{if(a.getAttribute('href')==='#'+chapter)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});document.querySelectorAll('#chapter-menu a').forEach(a=>{if(a.getAttribute('href')==='#'+id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
 $('main').innerHTML=sections.map(s=>`<section id="${s.id}" class="${['cover','chapter','closing'].includes(s.kind)?s.kind:'content-section'}" data-kind="${s.kind}" aria-label="${escape(s.title)}"><div class="section-body">${bodyFor(s)}</div></section>`).join('');
 $('chapter-menu').innerHTML=config.chapters.map(c=>`<strong>${c.number} / ${escape(c.title)}</strong>${sections.filter(s=>s.chapter===c.id&&s.kind!=='chapter').map(s=>`<a href="#${s.id}">${escape(s.title)}</a>`).join('')}`).join('');
 $('snapshot-label').textContent=snapshot.snapshot_id;
 bindProgress();bindTrend();
 async function loadSection(id){
   if(!delivery||delivery.ready(id))return true;
   const section=sections.find(s=>s.id===id);if(!section)return false;
   const status=$(id).querySelector('.load-status');if(status)status.textContent='Ladataan tilastoa…';
   try{await delivery.section(id);sectionBody(id).innerHTML=bodyFor(section);scheduleFit();return true;}
   catch{if(status)status.textContent='Tilastoa ei voitu ladata. Tarkista verkkoyhteys ja yritä uudelleen.';return false;}
 }
 if(delivery){
   new ResizeObserver(()=>{if(matchMedia('(max-width:1000px)').matches)document.documentElement.style.setProperty('--presentation-bar',document.querySelector('.topbar').offsetHeight+'px');else document.documentElement.style.removeProperty('--presentation-bar');}).observe(document.querySelector('.topbar'));
   const lazyObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)loadSection(entry.target.id);},{rootMargin:'0px'});
   sections.filter(s=>!delivery.ready(s.id)).forEach(s=>lazyObserver.observe($(s.id)));
   document.addEventListener('click',e=>{const button=e.target.closest('[data-load-section]');if(button)loadSection(button.dataset.loadSection);});
   document.addEventListener('click',async e=>{
     const detail=e.target.closest('[data-detail-toggle]')||(!e.target.closest('button,a,input,select')?e.target.closest('[data-detail-row]'):null);
     if(!detail)return;
     e.stopImmediatePropagation();
     const key=detail.dataset.detailToggle||detail.dataset.detailRow,id=detail.dataset.detailTable;
     if(expandedDetails.has(key)){expandedDetails.delete(key);updateResults(id,true);return;}
     const row=datasets[id].rows.find(r=>r.detail_key===key);
     detail.setAttribute('aria-busy','true');
     try{await delivery.detail(row);expandedDetails.add(key);updateResults(id,true);document.querySelector(`[data-detail-toggle="${key}"]`)?.focus({preventScroll:true});}
     catch{announce('Tietoja ei voitu ladata. Tarkista yhteys ja avaa rivi uudelleen.');detail.setAttribute('aria-busy','false');}
   },true);
 }
 document.addEventListener('input',e=>{const id=e.target.dataset.search;if(id){tableState(id).q=e.target.value;updateResults(id);saveURL(id);}});
 document.addEventListener('change',e=>{if(e.target.matches('[data-detail-sort-select]')){changeDetailSort(e.target,e.target.value,false);return;}if(e.target.id==='attempt-expansion'){attemptExpansion=e.target.value;renderAttempts();saveURL('players');$('attempt-expansion').focus({preventScroll:true});return;}if(e.target.id==='survival-expansion'){survivalExpansion=e.target.value;renderSurvival();saveURL('survival');$('survival-expansion').focus({preventScroll:true});return;}if(e.target.id==='session-expansion'){sessionExpansion=e.target.value;renderSessions();saveURL('character-sessions');$('session-expansion').focus({preventScroll:true});return;}if(e.target.id==='player-expansion'){playerExpansion=e.target.value;renderPlayers();saveURL('player-parses');$('player-expansion').focus({preventScroll:true});return;}if(e.target.id==='ranking-expansion'||e.target.id==='ranking-class'){const control=e.target.id;if(control==='ranking-expansion')rankingExpansion=e.target.value;else rankingClass=e.target.value;renderRanking();saveURL('character-parses');$(control).focus({preventScroll:true});return;}const id=e.target.dataset.expansion||e.target.dataset.role;if(id){tableState(id)[e.target.dataset.expansion?'expansion':'role']=e.target.value;updateResults(id);saveURL(id);}});
 document.addEventListener('click',e=>{
   const detailSort=e.target.closest('[data-detail-sort]');
   if(detailSort){changeDetailSort(detailSort,detailSort.dataset.detailSort);return;}
   const survivalView=e.target.closest('[data-survival-view]');
   if(survivalView){survivalMode=survivalView.dataset.survivalView==='raids'?'raids':'characters';renderSurvival();saveURL('survival');document.querySelector(`[data-survival-view="${survivalMode}"]`)?.focus({preventScroll:true});return;}
   if(e.target.closest('[data-hundred-other]')){const s=tableState('hundred-parses');s.others=s.others==='1'?'0':'1';updateResults('hundred-parses');saveURL('hundred-parses');return;}
   const detail=e.target.closest('[data-detail-toggle]')||(!e.target.closest('button,a,input,select')?e.target.closest('[data-detail-row]'):null);
   if(detail){const key=detail.dataset.detailToggle||detail.dataset.detailRow,id=detail.dataset.detailTable;if(expandedDetails.has(key))expandedDetails.delete(key);else expandedDetails.add(key);updateResults(id,true);document.querySelector(`[data-detail-toggle="${key}"]`)?.focus({preventScroll:true});return;}
   const more=e.target.closest('[data-more-rows]');if(more){const id=more.dataset.moreRows,s=tableState(id);s.limit=(s.limit||200)+200;updateResults(id,true);return;}
   const show=e.target.closest('[data-show-rows]');if(show){const id=show.dataset.showRows,s=tableState(id);s.show=s.show==='all'?'10':'all';s.limit=200;updateResults(id);saveURL(id);return;}
   const sort=e.target.closest('[data-sort]'),reset=e.target.closest('[data-reset]'),csv=e.target.closest('[data-csv]');
   if(sort){const id=sort.dataset.table,s=tableState(id),key=sort.dataset.sort;s.dir=s.sort===key?(s.dir==='asc'?'desc':'asc'):(['number','decimal1','decimal2','decimal3','median','percent1','percent2'].includes(datasets[id].columns.find(c=>c.key===key).format)&&key!=='rank'?'desc':'asc');s.sort=key;updateResults(id);saveURL(id);document.querySelector(`#results-${id} [data-sort="${key}"]`).focus({preventScroll:true});}
   if(reset){const id=reset.dataset.reset;tableStates.set(tableStateKey(id),tableDefault(id));if(id==='players'){attemptExpansion='all';renderAttempts();}else if(id==='player-parses'){playerExpansion='all';renderPlayers();}else if(id==='character-sessions'){sessionExpansion='all';renderSessions();}else if(id==='survival'){survivalExpansion='all';renderSurvival();}else updateResults(id);saveURL(id);}
   if(csv){const id=csv.dataset.csv;download('Univelka-'+id+'.csv',datasets[id].columns.map(c=>c.format.startsWith('percent')?{...c,label:c.label+' (suhdeluku)'}:c),selectedRows(id));}
   if(e.target.closest('#chapter-menu a')){$('chapter-menu').hidden=true;$('chapters').setAttribute('aria-expanded','false');}
 });
 on('chapters','click',()=>{const open=$('chapter-menu').hidden;$('chapter-menu').hidden=!open;$('chapters').setAttribute('aria-expanded',String(open));});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('chapter-menu').hidden=true;$('chapters').setAttribute('aria-expanded','false');}});
 // Keep each screen topic inside the viewport, including after filters and detail changes.
 let fitting=false,fitScheduled=false,printing=false;
 function fitSections(){
   if(fitting||printing||matchMedia('print').matches)return;
   fitting=true;
   const desktop=matchMedia('(min-width:1001px)').matches;
   for(const s of sections){
     const section=$(s.id),body=sectionBody(s.id);
     section.style.removeProperty('--section-scale');
     if(!desktop)continue;
     const style=getComputedStyle(section),available=section.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
     const scale=Math.min(1,Math.max(0,available-2)/Math.max(1,body.scrollHeight),section.clientWidth/Math.max(1,body.scrollWidth));
     section.style.setProperty('--section-scale',String(scale));
   }
   fitting=false;
 }
 function scheduleFit(){if(fitScheduled||printing)return;fitScheduled=true;requestAnimationFrame(()=>{fitScheduled=false;fitSections();});}
 new MutationObserver(scheduleFit).observe($('main'),{childList:true,subtree:true,characterData:true});
 new ResizeObserver(scheduleFit).observe($('main'));
 window.addEventListener('resize',scheduleFit);
 document.fonts.ready.then(scheduleFit);
 document.querySelectorAll('#main img').forEach(img=>img.addEventListener('load',scheduleFit));
 function moveSection(direction){
   const index=sections.findIndex(s=>s.id===activeSection),next=sections[Math.max(0,Math.min(sections.length-1,index+direction))];
   if(!next||next.id===activeSection)return;
   activeSection=next.id;updateActive(activeSection);saveURL();
   const focused=document.activeElement;
   if(focused instanceof HTMLElement&&$('main').contains(focused))focused.blur();
   $(next.id).scrollIntoView({behavior:'instant',block:'start'});
   $('announcement').textContent=next.title;
 }
 document.addEventListener('keydown',e=>{
   if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||!['ArrowDown','ArrowUp','PageDown','PageUp'].includes(e.key))return;
   const target=e.target;
   if(target.closest('input,select,textarea,[contenteditable]:not([contenteditable=false]),#chapter-menu'))return;
   if(delivery&&matchMedia('(max-width:1000px)').matches)return;
   // A focused scroll region keeps its native keyboard scrolling.
   if(target.matches('.table-scroll,.chart-wrap,[data-section-scroll]'))return;
   e.preventDefault();
   if(!e.repeat)moveSection(e.key==='ArrowDown'||e.key==='PageDown'?1:-1);
 });
 // Native scroll snapping and keyboard paging use the same section boundaries.
 let scheduled=false;
 window.addEventListener('scroll',()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;const max=document.documentElement.scrollHeight-innerHeight;$('reading-progress').style.width=(max?scrollY/max*100:0)+'%';if(navigating)return;const current=sections.filter(s=>$(s.id).getBoundingClientRect().top<=160).at(-1)||sections[0];if(current.id!==activeSection){activeSection=current.id;updateActive(activeSection);saveURL();}});},{passive:true});
 window.addEventListener('hashchange',applyURL);
 on('print','click',async()=>{
   if(delivery){const button=$('print');button.disabled=true;button.textContent='Valmistellaan tulostusta…';
     try{await Promise.all(sections.map(s=>loadSection(s.id)));if(!sections.every(s=>delivery.ready(s.id)))throw new Error('Incomplete print data');}
     catch{announce('Tulostusta ei voitu valmistella. Käytä ladattavaa PDF-varaversiota.');button.disabled=false;button.textContent='Tulosta / PDF';return;}
     button.disabled=false;button.textContent='Tulosta / PDF';
   }
   window.print();
 });
 window.addEventListener('beforeprint',()=>{printing=true;if(delivery&&!sections.every(s=>delivery.ready(s.id))){document.documentElement.classList.add('incomplete-print');return;}sectionBody('players').innerHTML=heading(sections.find(s=>s.id==='players'))+Object.keys(attemptViews).map(e=>{const id='players-'+e;return `<article data-print-dataset="${id}"><h3>${escape(e==='all'?'Kaikki lisäosat':expansions[e])}</h3>${tableHTML(id,true)}</article>`;}).join('');sectionBody('survival').innerHTML=heading({...sections.find(s=>s.id==='survival'),subtitle:'25/40 henkeä · merkityksellinen vaikeustaso'})+Object.keys(survivalViews).map(e=>{const id='survival-'+e;return `<article data-print-dataset="${id}"><h3>Hahmoittain (vähintään 50 katettua kaatoa) · ${escape(e==='all'?'Kaikki lisäosat':expansions[e])}</h3>${tableHTML(id,true)}</article>`;}).join('')+Object.keys(survivalRaidViews).map(e=>{const id='survival-raids-'+e;return `<article data-print-dataset="${id}"><h3>Raididungeonittain (ilman kaatorajaa) · ${escape(e==='all'?'Kaikki lisäosat':expansions[e])}</h3>${tableHTML(id,true)}</article>`;}).join('');sectionBody('character-sessions').innerHTML=heading(sections.find(s=>s.id==='character-sessions'))+Object.keys(expansions).map(e=>{const id='sessions-'+e;return `<article data-print-dataset="${id}"><h3>${escape(e==='all'?'Kaikki lisäosat':expansions[e])}</h3>${tableHTML(id,true)}</article>`;}).join('');$('ranking-panel').innerHTML=rankingViews.filter(v=>datasets[v.id].rows.length).map(v=>`<article class="print-class" data-print-dataset="${v.id}"><h3>${escape(v.expansion==='all'?'Kaikki lisäosat':expansions[v.expansion])} · ${escape(v.character_class==='all'?'Kaikki classit':v.character_class.replace('DeathKnight','Death Knight'))}</h3>${baselineHTML(v.id)}${tableHTML(v.id,true)}<p class="note">${escape(datasets[v.id].notes)}</p></article>`).join('');for(const s of sections)if(!['players','player-parses','character-sessions','survival'].includes(s.id)&&datasets[s.id]?.columns)$('results-'+s.id).innerHTML=tableHTML(s.id,true);sectionBody('player-parses').innerHTML=heading(sections.find(s=>s.id==='player-parses'))+Object.keys(playerViews).map(e=>{const id='player-parses-'+e;return `<article data-print-dataset="${id}"><h3>${escape(e==='all'?'Kaikki lisäosat':expansions[e])}</h3>${baselineHTML(id)}${tableHTML(id,true)}</article>`;}).join('');});
 window.addEventListener('afterprint',()=>{printing=false;if(document.documentElement.classList.contains('incomplete-print')){document.documentElement.classList.remove('incomplete-print');scheduleFit();return;}scheduleFit();renderAttempts();renderSurvival();renderSessions();renderPlayers();renderRanking();for(const s of sections)if(datasets[s.id]?.columns)updateResults(s.id);});
 fitSections();applyURL();updateActive(activeSection);
})();
