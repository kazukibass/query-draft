importScripts('../vendor/sql-wasm.js');
const ready=initSqlJs({locateFile:()=>new URL('../vendor/sql-wasm.wasm',self.location.href).href});
const identifier=name=>{if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))throw Error(`不正な名前です: ${name}`);return name;};
function seed(db,tables,relations){
  for(const t of tables){
    const relation=relations.find(r=>r.to===t.name);
    const fk=relation?`, FOREIGN KEY (${identifier(relation.foreign)}) REFERENCES ${identifier(relation.from)}(${identifier(relation.key)})`:'';
    db.run(`CREATE TABLE ${identifier(t.name)} (${t.columns.map(([name,type,key])=>`${identifier(name)} ${['INTEGER','TEXT','REAL','BLOB'].includes(type)?type:'TEXT'}${key==='PK'?' PRIMARY KEY':''}`).join(',')}${fk});`);
    for(const row of t.rows)db.run(`INSERT INTO ${identifier(t.name)} VALUES (${row.map(()=>'?').join(',')})`,row);
  }
}
self.onmessage=async({data})=>{let db;try{const SQL=await ready;db=new SQL.Database();seed(db,data.tables,data.relations);db.run('PRAGMA query_only = ON');const statement=db.prepare(data.sql);statement.bind(data.params);const columns=statement.getColumnNames(),values=[];while(statement.step())values.push(statement.get());statement.free();self.postMessage({id:data.id,result:columns.length?[{columns,values}]:[]});}catch(e){self.postMessage({id:data.id,error:e.message});}finally{db?.close();}};
