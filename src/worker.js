let db;
async function init(){
  importScripts('../vendor/sql-wasm.js');
  const {seed}=await import('./data.js');
  const SQL=await initSqlJs({locateFile:()=>new URL('../vendor/sql-wasm.wasm',self.location.href).href});
  db=new SQL.Database();seed(db);db.run('PRAGMA query_only = ON');
}
const ready=init();
self.onmessage=async({data})=>{try{await ready;const result=db.exec(data.sql,data.params);self.postMessage({id:data.id,result});}catch(e){self.postMessage({id:data.id,error:e.message});}};
