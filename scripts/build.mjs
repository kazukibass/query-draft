import {mkdir,cp,copyFile,readFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
for(const file of ['index.html','styles.css','modes.css'])await copyFile(file,`dist/${file}`);
await cp('src','dist/src',{recursive:true});
for(const file of ['sql-wasm.js','sql-wasm.wasm'])await copyFile(`node_modules/sql.js/dist/${file}`,`dist/vendor/${file}`);
await copyFile('node_modules/sql.js/LICENSE','dist/vendor/LICENSE-sql.js');
console.log('Built dist/ with local SQLite engine');
