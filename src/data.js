export const tables = [
  {name:'users', label:'ユーザー', columns:[['id','INTEGER','PK'],['name','TEXT'],['email','TEXT']], rows:[[1,'青木 葵','aoi@example.test'],[2,'佐藤 凛','rin@example.test'],[3,'田中 悠','haru@example.test'],[4,'森 空','sora@example.test']]},
  {name:'orders', label:'注文', columns:[['id','INTEGER','PK'],['user_id','INTEGER','FK'],['total','INTEGER'],['created_at','TEXT']], rows:[[101,1,3200,'2026-09-01'],[102,1,5800,'2026-09-02'],[103,2,1500,'2026-09-03'],[104,3,4200,'2026-09-04']]},
  {name:'items', label:'注文明細', columns:[['id','INTEGER','PK'],['order_id','INTEGER','FK'],['product','TEXT'],['quantity','INTEGER']], rows:[[1,101,'ノート',2],[2,101,'ペン',3],[3,102,'バッグ',1],[4,103,'ペン',5],[5,104,'手帳',2]]}
];
export const relations = [
  {from:'users',key:'id',to:'orders',foreign:'user_id'},
  {from:'orders',key:'id',to:'items',foreign:'order_id'}
];
export function seed(db) {
  for(const t of tables) {
    const relation=relations.find(r=>r.to===t.name);
    const fk=relation ? `, FOREIGN KEY (${relation.foreign}) REFERENCES ${relation.from}(${relation.key})` : '';
    db.run(`CREATE TABLE ${t.name} (${t.columns.map(([name,type,key])=>`${name} ${type}${key==='PK'?' PRIMARY KEY':''}`).join(',')}${fk});`);
    for(const row of t.rows) db.run(`INSERT INTO ${t.name} VALUES (${row.map(()=>'?').join(',')})`,row);
  }
}
