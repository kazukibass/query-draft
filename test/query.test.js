import {test} from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import {seed} from '../src/data.js';
import {compile,initialQuery} from '../src/query.js';
const SQL=await initSqlJs();
function execute(q){const db=new SQL.Database();try{seed(db);const c=compile(q);return db.exec(c.sql,c.params)[0];}finally{db.close();}}
test('initial example executes on SQLite',()=>{assert.deepEqual(execute(initialQuery()).values,[['青木 葵',3200],['青木 葵',5800],['田中 悠',4200]]);});
test('LEFT JOIN retains unmatched users and WHERE can remove them',()=>{const q={...initialQuery(),join:'LEFT',filters:[]};assert.equal(execute(q).values.length,5);assert.deepEqual(execute(q).values.at(-1),['森 空',null]);q.filters=initialQuery().filters;assert.equal(execute(q).values.length,3);});
test('multi-hop relationship uses intermediate orders table',()=>{const q={...initialQuery(),columns:['users.name','items.product'],filters:[]};assert.equal(compile(q).joins.length,2);assert.equal(execute(q).values.length,5);});
test('reverse path joins towards users',()=>{const q={...initialQuery(),from:'items',columns:['items.product','users.name'],filters:[]};assert.equal(execute(q).values.length,5);});
test('values are parameterized, including apostrophes and SQL-looking strings',()=>{const q={...initialQuery(),columns:['users.name'],filters:[{column:'users.name',operator:'=',value:"' OR 1=1 --"}]};assert.equal(execute(q),undefined);assert.match(compile(q).display,/''' OR 1=1 --'/);});
test('NULL uses IS NULL and ordering is included',()=>{const q={...initialQuery(),join:'LEFT',filters:[{column:'orders.id',operator:'IS NULL',value:''}],order:'users.name'};assert.deepEqual(execute(q).values,[['森 空',null]]);});
test('invalid columns, numbers and empty selection fail explicitly',()=>{assert.throws(()=>compile({...initialQuery(),columns:[]}));assert.throws(()=>compile({...initialQuery(),columns:['users.fake']}));assert.throws(()=>compile({...initialQuery(),filters:[{column:'orders.total',operator:'=',value:'abc'}]}));});
