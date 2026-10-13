/* Builds the dependency-free portable edition. Run after npm install:
 * node scripts/build-portable.cjs
 * No external CDN, network request, image asset or model is embedded. */
const fs=require('fs'),path=require('path');
const ts=require(process.env.TYPESCRIPT_PATH||'typescript');
const root=path.resolve(__dirname,'..');
const files=['core/math','core/terrain','core/geometry','core/shaders','standalone/engine','standalone/bootstrap'];
const diagnostics=[];
let bundle='(function(){"use strict";const modules={},cache={};\n';
for(const id of files){const file=path.join(root,'src',id+'.ts');const source=fs.readFileSync(file,'utf8');const r=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,strict:true}});diagnostics.push(...(r.diagnostics||[]));bundle+=`modules[${JSON.stringify(id)}]=function(require,module,exports){\n${r.outputText}\n};\n`;}
if(diagnostics.some(d=>d.category===ts.DiagnosticCategory.Error)){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));process.exit(1);}
bundle+=`function resolve(base,name){if(!name.startsWith('.'))return name;const p=base.split('/');p.pop();for(const part of name.split('/')){if(part==='..')p.pop();else if(part!=='.')p.push(part);}return p.join('/');}function load(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};if(!modules[id])throw new Error('Missing module '+id);modules[id](n=>load(resolve(id,n)),m,m.exports);return m.exports;}load('standalone/bootstrap');})();`;
const html=fs.readFileSync(path.join(root,'src/standalone/shell.html'),'utf8').replace('/*__STYLE__*/',fs.readFileSync(path.join(root,'src/style.css'),'utf8')).replace('/*__BUNDLE__*/',bundle.replace(/<\/script/gi,'<\\/script'));
const dist=path.join(root,'portable');fs.mkdirSync(dist,{recursive:true});fs.writeFileSync(path.join(dist,'Interactive_Island.html'),html);console.log('Built portable/Interactive_Island.html',Math.round(Buffer.byteLength(html)/1024)+' KB');
