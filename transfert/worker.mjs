// METFLIX: temporary, write-only participant drop box. Host capability never enters the QR.
const ALLOWED = new Set(['https://digitalfactory-lab.github.io']);
const enc = new TextEncoder();
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b=>b.toString(16).padStart(2,'0')).join('');
const hash = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
const fail = (status,message) => {throw Object.assign(new Error(message),{status});};
async function body(req) {
 if(!req.headers.get('content-type')?.startsWith('application/json'))fail(415,'Format non accepté.');
 const reader=req.body?.getReader(); if(!reader)fail(400,'Données manquantes.');
 const parts=[];let length=0;
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>50000){await reader.cancel();fail(413,'Texte trop long.');}parts.push(value);}
 const data=new Uint8Array(length);let at=0;for(const p of parts){data.set(p,at);at+=p.length;}
 try{const x=JSON.parse(new TextDecoder().decode(data));if(!x||typeof x!=='object'||Array.isArray(x))throw 0;return x;}catch{fail(400,'Données invalides.');}
}
function value(x,max,required=true){if(typeof x!=='string'||x.length>max||(required&&!x.trim()))fail(400,'Complète les champs, sans dépasser la longueur autorisée.');return x.trim();}
async function limited(req,db,scope,max) {
 const now=Date.now(),window=Math.floor(now/3600000);
 const key=await hash(`${scope}:${window}:${req.headers.get('CF-Connecting-IP')||'unknown'}`);
 const row=await db.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,(window+1)*3600000).first();
 if(row.count>max)fail(429,'Trop de demandes. Réessaie un peu plus tard.');
}
async function cleanup(db){await db.batch([db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now()),db.prepare('DELETE FROM rate_limits WHERE expires_at <= ?').bind(Date.now())]);}
async function route(req,env){
 const path=new URL(req.url).pathname,db=env.DB;
 if(path==='/health'&&req.method==='GET')return {ok:true,version:1};
 if(path==='/sessions'&&req.method==='POST'){
  const b=await body(req);const label=value(b.label,80);await limited(req,db,'create',8);await cleanup(db);
  const host=token(),code=token().slice(0,12).toUpperCase(),now=Date.now(),expires=now+86400000;
  await db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').bind(code,await hash(host),label,now,expires).run();
  return {code,host,label,expiresAt:expires};
 }
 const match=path.match(/^\/sessions\/([A-F0-9]{12})(\/texts)?$/);if(!match)fail(404,'Session introuvable.');
 const [,code,texts]=match;
 if(req.method==='POST'||(!texts&&req.method==='GET'))await limited(req,db,'participant',300);
 const session=await db.prepare('SELECT * FROM sessions WHERE code=? AND expires_at>?').bind(code,Date.now()).first();
 if(!session)fail(404,'Session fermée ou expirée. Demande le nouveau code au formateur.');
 if(!texts&&req.method==='GET')return {code,label:session.label,expiresAt:session.expires_at};
 if(texts&&req.method==='POST'){
  const b=await body(req);const name=value(b.name,30),title=value(b.title,180,false),script=value(b.script,12000),key=value(b.participantKey,64);
  if(!/^[a-f0-9]{64}$/.test(key))fail(400,'Identifiant invalide.');
  const author=await hash(key),now=Date.now();
  // Atomic insert/update and capacity check, including session expiry/deletion races.
  const result=await db.prepare(`INSERT INTO submissions(session_code,author_hash,name,title,script,updated_at)
   SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sessions WHERE code=? AND expires_at>?)
   AND ((SELECT COUNT(*) FROM submissions WHERE session_code=?)<12 OR EXISTS(SELECT 1 FROM submissions WHERE session_code=? AND author_hash=?))
   ON CONFLICT(session_code,author_hash) DO UPDATE SET name=excluded.name,title=excluded.title,script=excluded.script,updated_at=excluded.updated_at`)
   .bind(code,author,name,title,script,now,code,now,code,code,author).run();
  if(!result.meta.changes)fail(409,'Session complète (12 textes) ou fermée. Préviens le formateur.');
  return {ok:true,receivedAt:now};
 }
 if((texts&&req.method==='GET')||(!texts&&req.method==='DELETE')){
  const supplied=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
  // Stored credential is a digest; compare fixed-size digests with the Workers crypto API.
  const digest=await hash(supplied);
  if(!crypto.subtle.timingSafeEqual(enc.encode(digest),enc.encode(session.host_hash)))fail(403,'Accès réservé au navigateur qui a créé la session.');
  if(req.method==='DELETE'){await db.prepare('DELETE FROM sessions WHERE code=?').bind(code).run();return {ok:true};}
  const rows=await db.prepare('SELECT author_hash AS id,name,title,script,updated_at FROM submissions WHERE session_code=? ORDER BY updated_at ASC').bind(code).all();
  return {code,label:session.label,expiresAt:session.expires_at,texts:rows.results};
 }
 fail(405,'Action non disponible.');
}
export default {
 async fetch(req,env){
  const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(origin&&ALLOWED.has(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET, POST, DELETE, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type, Authorization';headers['Access-Control-Max-Age']='600';}
  if(origin&&!ALLOWED.has(origin))return Response.json({error:'Origine non autorisée.'},{status:403,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  try{return Response.json(await route(req,env),{headers});}
  catch(e){if(!e.status)console.error(JSON.stringify({event:'request_failed',message:'Database or runtime error'}));return Response.json({error:e.status?e.message:'Le transfert est momentanément indisponible. Ton texte reste sur cet appareil.'},{status:e.status||500,headers});}
 },
 async scheduled(event,env,ctx){ctx.waitUntil(cleanup(env.DB));}
};
