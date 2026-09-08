import {tables,relations} from './data.js';
import {initialQuery,compile,allColumns} from './query.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value??'NULL').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let q=initialQuery(), compiled, worker, sequence=0, timer, lastExecuted='';
let activePane='sql';
const views=Object.fromEntries(tables.map(t=>[t.name,true]));
let positions;
function arrange(){positions={users:{x:24,y:105},orders:{x:370,y:205},items:{x:716,y:105}};}
arrange();
const options=(selected,empty=false)=>`${empty?'<option value="">なし</option>':''}${allColumns(tables).map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${c.id}</option>`).join('')}`;
function drawTableOptions(){$('from').innerHTML=tables.map(t=>`<option ${t.name===q.from?'selected':''}>${t.name}</option>`).join('');}
drawTableOptions();
function drawNodes(){
  $('canvas').style.height=`${Math.max(600,150+Math.ceil(tables.length/3)*250)}px`;
  $('nodes').innerHTML=tables.map(t=>{
    const pos=positions[t.name];
    const rows=views[t.name]?`<div class="preview"><table><thead><tr>${t.columns.map(([c])=>`<th><button data-column="${t.name}.${c}" class="${q.columns.includes(`${t.name}.${c}`)?'selected':''}" aria-pressed="${q.columns.includes(`${t.name}.${c}`)}">${escape(c)}</button></th>`).join('')}</tr></thead><tbody>${t.rows.slice(0,3).map((row,i)=>`<tr>${row.map((value,j)=>`<td><button data-cell="${t.name}:${i}:${j}" title="${escape(t.name+'.'+t.columns[j][0]+' = '+value)} を条件に追加">${escape(value)}</button></td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="columns">${t.columns.map(([c,type,key])=>`<label class="column ${q.columns.includes(`${t.name}.${c}`)?'selected':''}"><input type="checkbox" data-column="${t.name}.${c}" ${q.columns.includes(`${t.name}.${c}`)?'checked':''}><code>${c}</code><span class="key">${key??''}</span><span class="type">${type}</span></label>`).join('')}</div>`;
    return `<article class="node ${compiled?.connected.includes(t.name)?'in-query':''}" id="node-${t.name}" style="left:${pos.x}px;top:${pos.y}px"><div class="node-head" data-drag="${t.name}"><strong>${t.name}</strong><small>${t.label}</small><button data-view="${t.name}" aria-label="${t.name}を${views[t.name]?'列一覧':'表'}に切り替え">${views[t.name]?'列一覧':'表を見る'}</button></div>${rows}<div class="node-foot">${views[t.name]?`先頭3行 / 全${t.rows.length}行`:'列名を選択してSELECTへ追加'}${t.name===q.from?' · 開始テーブル':''}</div></article>`;
  }).join('');
  drawLines();
  $('schema-view').setAttribute('aria-pressed',String(Object.values(views).every(v=>!v)));
  $('data-view').setAttribute('aria-pressed',String(Object.values(views).every(Boolean)));
}
function drawLines(){
 $('connections').innerHTML=relations.map(r=>{const a=positions[r.from],b=positions[r.to];const x=a.x+300,y=a.y+65,xx=b.x,yy=b.y+65;const active=compiled?.joins.some(e=>e.r===r);return `<path class="${active?'active':''}" d="M${x} ${y} C${x+35} ${y},${xx-35} ${yy},${xx} ${yy}"/><text x="${x+8}" y="${Math.min(y,yy)-12}">${r.key} → ${r.foreign}</text>`;}).join('');
}
function drawFilters(){
 $('filters').innerHTML=q.filters.length?q.filters.map((f,i)=>`<div class="filter" data-filter="${i}"><select aria-label="条件の列" data-field="column">${options(f.column)}</select><select aria-label="比較方法" data-field="operator">${['=','!=','>','>=','<','<=','LIKE','IS NULL','IS NOT NULL'].map(op=>`<option ${op===f.operator?'selected':''}>${escape(op)}</option>`).join('')}</select><input aria-label="条件の値" data-field="value" value="${escape(f.value)}" ${f.operator.startsWith('IS ')?'disabled':''}><button data-remove="${i}" aria-label="条件${i+1}を削除">×</button></div>`).join(''):'<p class="empty">条件なし。表のセルからも追加できます。</p>';
 $('order').innerHTML=options(q.order,true);
 $('filter-count').textContent=q.filters.length;
}
function update(redraw=true){
 try{compiled=compile(q,tables,relations);$('sql').innerHTML=escape(compiled.display).replace(/\b(SELECT|FROM|INNER JOIN|LEFT JOIN|WHERE|AND|ON|ORDER BY|ASC|DESC|IS NULL|IS NOT NULL|LIKE)\b/g,'<span class="keyword">$1</span>');$('notice').textContent='';$('run').disabled=false;$('copy').disabled=false;
 $('explain').innerHTML=`<p><strong>FROM / JOIN</strong> — ${escape(q.from)}を起点に${compiled.joins.length?`関連する${compiled.joins.length}テーブルを結びます。`:'読み取ります。'} ${q.join==='LEFT'?'LEFT JOINは一致しない起点の行も残し、相手の列をNULLにします。':'INNER JOINは結合条件に一致する組だけ残します。'}</p><p><strong>WHERE</strong> — ${q.filters.length?`${q.filters.length}個の条件をすべて満たす行に絞ります。`:'行を絞り込みません。'}${q.join==='LEFT'&&q.filters.length?' 結合先の列へのWHERE条件によっては、NULLの行が除外されます。':''}</p><p><strong>SELECT</strong> — ${escape(q.columns.join('、'))}を表示します。1人に複数の注文があれば、名前も複数行に現れます。</p><p>これは論理的な読み方です。DB内部の物理的な実行順序とは異なります。</p>`;
 }catch(e){compiled=null;$('sql').textContent='列を選択すると、ここにSQLが表示されます。';$('notice').textContent=e.message;$('run').disabled=true;$('copy').disabled=true;$('explain').textContent=e.message;}
 $('selection-count').textContent=`${q.columns.length}列を選択`;
 if(lastExecuted&&compiled?.display!==lastExecuted)$('result-status').textContent='条件が変わりました。「実行する」で結果を更新します。';
 if(redraw)drawNodes();
}
function startWorker(){worker=new Worker(new URL('./worker.js',import.meta.url));worker.onmessage=({data})=>{if(data.id!==sequence)return;clearTimeout(timer);$('run').disabled=!compiled;if(data.error){$('result-status').textContent=data.error;$('result').replaceChildren();$('count').textContent='エラー';$('result-count').textContent='!';return;} const result=data.result[0];const rows=result?.values??[];$('count').textContent=`${rows.length}行`;$('result-count').textContent=rows.length;$('result-status').textContent=lastExecuted===compiled?.display?'実行済み · 教材DBの結果':'条件が変わりました。再実行してください。';$('result').innerHTML=result?`<table><thead><tr>${result.columns.map(c=>`<th>${escape(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>${!rows.length?'<p class="empty">条件に一致する行はありません。</p>':''}`:'<p class="empty">結果はありません。</p>';};worker.onerror=event=>{clearTimeout(timer);$('run').disabled=!compiled;$('result-status').textContent=`SQLエンジンの読み込みに失敗しました${event.message?`：${event.message}`:'。ページを再読み込みしてください。'}`;$('count').textContent='エラー';$('result-count').textContent='!';};}
function showPane(name){activePane=name;$('workbench').classList.remove('is-closed');document.querySelectorAll('.pane').forEach(p=>p.hidden=p.dataset.pane!==name);document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===name)));}
function closePane(){$('workbench').classList.add('is-closed');document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed','false'));}
function run(openResult=false){if(!compiled)return;clearTimeout(timer);const id=++sequence;lastExecuted=compiled.display;$('run').disabled=true;$('result-status').textContent='実行中…';worker.postMessage({id,sql:compiled.sql,params:compiled.params,tables,relations});if(openResult)showPane('result');timer=setTimeout(()=>{worker.terminate();startWorker();$('run').disabled=!compiled;$('result-status').textContent='実行を中止しました（10秒）。もう一度実行できます。';},10000);}
$('nodes').addEventListener('click',e=>{const view=e.target.closest('[data-view]');if(view){views[view.dataset.view]=!views[view.dataset.view];drawNodes();return;}const column=e.target.closest('[data-column]');if(column){const id=column.dataset.column;q.columns=q.columns.includes(id)?q.columns.filter(c=>c!==id):[...q.columns,id];update();return;}const cell=e.target.closest('[data-cell]');if(cell){const [name,i,j]=cell.dataset.cell.split(':');const t=tables.find(t=>t.name===name);q.filters.push({column:`${name}.${t.columns[j][0]}`,operator:'=',value:String(t.rows[i][j])});drawFilters();update();}});
$('filters').addEventListener('change',e=>{const row=e.target.closest('[data-filter]');if(!row)return;q.filters[Number(row.dataset.filter)][e.target.dataset.field]=e.target.value;drawFilters();update();});
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){q.filters.splice(Number(b.dataset.remove),1);drawFilters();update();}});
for(const field of ['from','join','order','direction'])$(field).addEventListener('change',e=>{q[field]=e.target.value;update();});
$('add-filter').onclick=()=>{q.filters.push({column:q.columns[0]??'users.id',operator:'=',value:''});drawFilters();update();};
$('clear').onclick=()=>{q.columns=[];q.filters=[];q.order='';drawFilters();update();};
$('reset').onclick=()=>{q=initialQuery();drawTableOptions();$('join').value=q.join;$('direction').value=q.direction;drawFilters();update();run();};
for(const [id,value] of [['schema-view',false],['data-view',true]])$(id).onclick=()=>{for(const name in views)views[name]=value;drawNodes();};
$('arrange').onclick=()=>{arrange();drawNodes();};$('run').onclick=()=>run(true);
$('copy').onclick=async()=>{if(!compiled)return;try{await navigator.clipboard.writeText(compiled.display);$('notice').textContent='SQLをコピーしました。';}catch{$('notice').textContent='コピーできませんでした。SQLを選択してコピーしてください。';}};
let drag;
$('nodes').addEventListener('pointerdown',e=>{const head=e.target.closest('[data-drag]');if(!head||e.target.closest('button')||e.button!==0)return;const name=head.dataset.drag;drag={name,x:e.clientX,y:e.clientY,start:{...positions[name]}};head.setPointerCapture(e.pointerId);});
$('nodes').addEventListener('pointermove',e=>{if(!drag)return;const pos=positions[drag.name];pos.x=Math.max(0,Math.min(740,drag.start.x+e.clientX-drag.x));pos.y=Math.max(0,Math.min(270,drag.start.y+e.clientY-drag.y));const node=$(`node-${drag.name}`);node.style.left=`${pos.x}px`;node.style.top=`${pos.y}px`;drawLines();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('nodes').addEventListener(event,()=>drag=null);
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>activePane===button.dataset.tab&&!$('workbench').classList.contains('is-closed')?closePane():showPane(button.dataset.tab));
document.querySelectorAll('.close-pane').forEach(button=>button.onclick=closePane);
const columnEditor=$('column-editor');
function addColumnRow(name='',type='TEXT',primary=false){const row=document.createElement('div');row.className='column-edit';row.innerHTML=`<input data-name required pattern="[A-Za-z_][A-Za-z0-9_]*" placeholder="column_name" value="${escape(name)}"><select data-type>${['INTEGER','TEXT','REAL','BLOB'].map(value=>`<option ${value===type?'selected':''}>${value}</option>`).join('')}</select><label><input type="radio" name="primary-column" ${primary?'checked':''}> PK</label><button type="button" data-delete-column aria-label="カラムを削除">×</button>`;row.querySelector('[data-delete-column]').onclick=()=>{if(columnEditor.children.length>1)row.remove();};columnEditor.append(row);}
function openTableDialog(){$('table-form').reset();columnEditor.replaceChildren();addColumnRow('id','INTEGER',true);addColumnRow('name','TEXT');$('table-error').textContent='';$('table-dialog').showModal();$('table-name').focus();}
$('new-table').onclick=openTableDialog;$('add-column').onclick=()=>addColumnRow();
for(const id of ['cancel-table','cancel-table-bottom'])$(id).onclick=()=>$('table-dialog').close();
$('table-form').onsubmit=e=>{e.preventDefault();const name=$('table-name').value.trim(),label=$('table-label').value.trim()||name;if(tables.some(t=>t.name===name)){$('table-error').textContent='同じ名前のテーブルがあります。';return;}const rows=[...columnEditor.children];const names=rows.map(row=>row.querySelector('[data-name]').value.trim());if(new Set(names).size!==names.length){$('table-error').textContent='カラム名が重複しています。';return;}const columns=rows.map(row=>[row.querySelector('[data-name]').value.trim(),row.querySelector('[data-type]').value,row.querySelector('input[type=radio]').checked?'PK':undefined]);tables.push({name,label,columns,rows:[]});views[name]=false;positions[name]={x:40+((tables.length-1)%3)*346,y:105+Math.floor((tables.length-1)/3)*250};q={...q,from:name,columns:[`${name}.${columns[0][0]}`],filters:[],order:''};drawTableOptions();drawFilters();update();$('table-dialog').close();showPane('sql');$('notice').textContent=`${name}を追加しました。データはまだ0行です。`;};
drawFilters();update();startWorker();run();
