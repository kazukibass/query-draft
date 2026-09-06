import {tables,relations} from './data.js';
export const columns=tables.flatMap(t=>t.columns.map(([name,type])=>({id:`${t.name}.${name}`,type})));
const validColumn=id=>{if(!columns.some(c=>c.id===id)) throw Error('不明な列です'); return id;};
export function initialQuery(){return {from:'users',columns:['users.name','orders.total'],filters:[{column:'orders.total',operator:'>=',value:'3000'}],join:'INNER',order:'',direction:'ASC'};}
export function compile(q) {
  if(!tables.some(t=>t.name===q.from)) throw Error('開始テーブルを選んでください');
  if(!q.columns.length) throw Error('表示したい列を1つ以上選んでください');
  if(!['INNER','LEFT'].includes(q.join)) throw Error('不正な結合方法');
  const selected=q.columns.map(validColumn);
  const required=new Set([q.from,...selected.map(c=>c.split('.')[0]),...q.filters.map(f=>validColumn(f.column).split('.')[0])]);
  if(q.order) required.add(validColumn(q.order).split('.')[0]);
  const connected=new Set([q.from]); const joins=[];
  for(const target of required) {
    const queue=[{node:q.from,path:[]}];const visited=new Set();let path;
    while(queue.length){const next=queue.shift(); if(next.node===target){path=next.path;break;} if(visited.has(next.node))continue;visited.add(next.node);
      for(const r of relations){const node=r.from===next.node?r.to:r.to===next.node?r.from:null;if(node)queue.push({node,path:[...next.path,{r,node}]});}}
    if(!path)throw Error('結合経路がありません');
    for(const edge of path)if(!connected.has(edge.node)){connected.add(edge.node);joins.push(edge);}
  }
  const params=[];
  const conditions=q.filters.map(f=>{
    const col=validColumn(f.column);
    if(!['=','!=','>','>=','<','<=','LIKE','IS NULL','IS NOT NULL'].includes(f.operator))throw Error('不正な条件');
    if(f.operator.startsWith('IS '))return `${col} ${f.operator}`;
    const type=columns.find(c=>c.id===col).type;
    const value=type==='INTEGER'?Number(f.value):String(f.value);
    if(type==='INTEGER'&&(String(f.value).trim()===''||!Number.isFinite(value)))throw Error(`${col}には数値を入力してください`);
    params.push(value);return `${col} ${f.operator} ?`;
  });
  const sql=`SELECT\n  ${selected.join(',\n  ')}\nFROM ${q.from}${joins.map(({r,node})=>`\n${q.join} JOIN ${node}\n  ON ${r.from}.${r.key} = ${r.to}.${r.foreign}`).join('')}${conditions.length?'\nWHERE '+conditions.join('\n  AND '):''}${q.order?`\nORDER BY ${validColumn(q.order)} ${q.direction==='DESC'?'DESC':'ASC'}`:''};`;
  let i=0;const display=sql.replace(/\?/g,()=>{const v=params[i++];return typeof v==='number'?String(v):`'${v.replaceAll("'","''")}'`;});
  return {sql,display,params,joins,connected:[...connected]};
}
