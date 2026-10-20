const ISSUER='https://token.actions.githubusercontent.com';
const JWKS=ISSUER+'/.well-known/jwks';
const AUDIENCE='gabyfit-android-signing';
const REPO='gabyfrancom/gabyfit';
const REF='refs/heads/feature/gabyfit-health-connect-sync';
const WORKFLOW=REPO+'/.github/workflows/gabyfit-android.yml@'+REF;
const HEADERS={'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Type':'application/json'};
let cache=null;
export function allowedClaims(c,now=Math.floor(Date.now()/1000)){
 return c.iss===ISSUER&&c.aud===AUDIENCE&&c.repository===REPO
 &&String(c.repository_id)==='1207292560'&&String(c.repository_owner_id)==='109766180'
 &&c.ref===REF&&c.sub==='repo:'+REPO+':ref:'+REF&&c.workflow_ref===WORKFLOW
 &&c.event_name==='push'&&/^[0-9a-f]{40}$/.test(c.sha||'')
 &&Number.isInteger(c.iat)&&Number.isInteger(c.exp)&&Number.isInteger(c.nbf)
 &&c.iat<=now+30&&c.nbf<=now+30&&c.exp>now
 &&c.exp-c.iat>0&&c.exp-c.iat<=900&&now-c.iat<=900;
}
function bytes(s){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('encoding');return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0));}
function decode(s){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes(s)));}
export async function verifyToken(token,fetcher=fetch){
 if(typeof token!=='string'||token.length>16000)throw Error('token');
 const parts=token.split('.');if(parts.length!==3)throw Error('token');
 const h=decode(parts[0]),claims=decode(parts[1]);
 if(h.alg!=='RS256'||typeof h.kid!=='string'||h.kid.length>200||h.crit)throw Error('header');
 if(!allowedClaims(claims)){
 const expected={iss:ISSUER,aud:AUDIENCE,repository:REPO,repository_id:'1207292560',repository_owner_id:'109766180',ref:REF,sub:'repo:'+REPO+':ref:'+REF,workflow_ref:WORKFLOW,event_name:'push'};
 const fields=Object.entries(expected).filter(([k,v])=>String(claims[k])!==v).map(([k])=>k);
 throw Error('claims:'+ (fields.join(',')||'time_or_sha'));
 }
 let keys;
 if(fetcher===fetch&&cache&&cache.until>Date.now())keys=cache.keys;
 else{const res=await fetcher(JWKS,{redirect:'manual',signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('jwks');const text=await res.text();if(text.length>100000)throw Error('jwks');const j=JSON.parse(text);if(!Array.isArray(j.keys)||j.keys.length>32)throw Error('jwks');keys=j.keys;if(fetcher===fetch)cache={keys,until:Date.now()+300000};}
 const jwk=keys.find(k=>k.kid===h.kid&&k.kty==='RSA'&&k.alg==='RS256'&&(!k.use||k.use==='sig'));if(!jwk)throw Error('kid');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('signature');
 return claims;
}
export default {async fetch(request,env){
 const reject=(error,status)=>new Response(JSON.stringify({error}),{status,headers:HEADERS});
 if(new URL(request.url).pathname!=='/signing-material')return reject('not_found',404);
 if(request.method!=='POST')return reject('method',405);
 const a=request.headers.get('authorization')||'';
 if(!a.startsWith('Bearer '))return reject('unauthorized',401);
 try{await verifyToken(a.slice(7));}catch{return reject('unauthorized',401);}
 if(!env.SIGNING_P12||!env.SIGNING_PASSWORD)return reject('unavailable',503);
 return new Response(JSON.stringify({keystore_b64:env.SIGNING_P12,password:env.SIGNING_PASSWORD,key_alias:'gabyfit-v2',certificate_sha256:'bd73cb2df937dc23bc1cab74ef62ab940de13eeb2b5be9091d11a93743663855'}),{headers:HEADERS});
}};
