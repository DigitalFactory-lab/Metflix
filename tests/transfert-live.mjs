// Integration smoke test. Creates only disposable test sessions and closes them in finally.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const base='https://metflix-transferts.digital-factory-liege.workers.dev';
async function call(path,{method='GET',body,host,origin='https://digitalfactory-lab.github.io'}={}){const r=await fetch(base+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(host?{Authorization:'Bearer '+host}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,data:r.status===204?null:await r.json()};}
let session;
try {
 assert.equal((await call('/health')).status,200);
 const pre=await call('/sessions',{method:'OPTIONS'});assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),'https://digitalfactory-lab.github.io');
 assert.equal((await call('/sessions',{method:'POST',origin:'https://example.org',body:{label:'forbidden'}})).status,403);
 const created=await call('/sessions',{method:'POST',body:{label:'TEST automatique — à supprimer'}});assert.equal(created.status,200,JSON.stringify(created.data));session=created.data;
 assert.match(session.code,/^[A-F0-9]{12}$/);assert.equal(session.host.length,64);
 const path='/sessions/'+session.code;const info=await call(path);assert.equal(info.status,200);assert.equal(info.data.host,undefined);assert.equal(info.data.texts,undefined);
 assert.equal((await call(path+'/texts')).status,403);assert.equal((await call(path+'/texts',{host:'bad'})).status,403);
 const keys=Array.from({length:13},()=>randomBytes(32).toString('hex'));
 assert.equal((await call(path+'/texts',{method:'POST',body:{name:'Vide',title:'',script:'',participantKey:keys[0]}})).status,400);
 // Race capacity: 13 simultaneous new writers must yield exactly twelve slots.
 const all=await Promise.all(keys.map((k,i)=>call(path+'/texts',{method:'POST',body:{name:'Test '+i,title:'Essai',script:'Épisode & preuve '+i,participantKey:k}})));
 assert.equal(all.filter(r=>r.status===200).length,12);assert.equal(all.filter(r=>r.status===409).length,1);
 const winner=all.findIndex(r=>r.status===200);
 assert.equal((await call(path+'/texts',{method:'POST',body:{name:'Élise',title:'Version corrigée',script:'Un texte corrigé <sans balise>.',participantKey:keys[winner]}})).status,200);
 const list=await call(path+'/texts',{host:session.host});assert.equal(list.status,200);assert.equal(list.data.texts.length,12);assert.equal(list.data.texts.filter(x=>x.name==='Élise').length,1);
 assert.ok(list.data.texts.every(x=>!('participantKey' in x)&&!('host' in x)));
 assert.equal((await call(path,{method:'DELETE',host:'wrong'})).status,403);
 assert.equal((await call(path,{method:'DELETE',host:session.host})).status,200);session=null;
 assert.equal((await call(path)).status,404);
 console.log('PASS: CORS, session, QR sans secret, lecture protégée, validation, 12 envois concurrents, remplacement, fermeture.');
}finally{if(session)await call('/sessions/'+session.code,{method:'DELETE',host:session.host});}
