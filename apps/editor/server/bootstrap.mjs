import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { HostError } from './storage.mjs';

const secret=()=>randomBytes(32).toString('base64url');
const equals=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const storageKey='lds-manual-editor-bootstrap/v1';

// The launch ticket exists only in a per-user private file, never in a URL.
// Tab storage is origin-bound (including the port), not a cross-port cookie.
export function createBootstrap({token}) {
  const ticket=secret();let consumed=false;
  async function handle(req,res,url,origin) {
    if(!url.pathname.startsWith('/bootstrap/'))return false;
    if(url.search)throw new HostError(400,'BOOTSTRAP_QUERY','Bootstrap does not accept query credentials.');
    if(url.pathname==='/bootstrap/launch') {
      if(req.method!=='POST')throw new HostError(405,'BOOTSTRAP_METHOD','Use the private local launch form.');
      // A private file's navigation has opaque Origin:null. This narrow entry
      // requires the one-use file capability; general Origin checks stay strict.
      if(!['null',origin].includes(req.headers.origin))throw new HostError(403,'BOOTSTRAP_ORIGIN','Only the private file or this exact origin can launch.');
      if((req.headers['sec-fetch-dest']&&req.headers['sec-fetch-dest']!=='document')||(req.headers['sec-fetch-mode']&&req.headers['sec-fetch-mode']!=='navigate'))throw new HostError(403,'BOOTSTRAP_CONTEXT','Launch must be a top-level document navigation.');
      if(!(req.headers['content-type']||'').startsWith('application/x-www-form-urlencoded'))throw new HostError(415,'BOOTSTRAP_TYPE','Use the private launch form.');
      const chunks=[];let size=0;
      for await(const b of req){size+=b.length;if(size>2048)throw new HostError(413,'BOOTSTRAP_SIZE','Launch form is too large.');chunks.push(b);}
      const fields=new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
      if(fields.getAll('ticket').length!==1||[...fields.keys()].some(k=>k!=='ticket')||!equals(fields.get('ticket'),ticket))throw new HostError(403,'BOOTSTRAP_TICKET','Private launch capability required.');
      if(consumed)throw new HostError(409,'BOOTSTRAP_USED','This launch file was already used. Open the existing base URL in the same browser session.');
      consumed=true;
      const nonce=secret();
      res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
      // The response document has the loopback origin before this same-origin
      // navigation. This avoids carrying a secret in redirect/history URLs.
      const session=JSON.stringify({contract:storageKey,baseUrl:origin,token});
      res.end(`<!doctype html><meta charset="utf-8"><title>LDS Manual 시작</title><p>선택한 문서의 편집기를 여는 중입니다.</p><script nonce="${nonce}">sessionStorage.setItem(${JSON.stringify(storageKey)},${JSON.stringify(session)});location.replace('/');</script>`);
      return true;
    }
    if(url.pathname==='/bootstrap/session.js') {
      if(req.method!=='GET'||(req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']!=='same-origin'||req.headers['sec-fetch-dest']!=='script')throw new HostError(403,'BOOTSTRAP_SCRIPT','Session delivery is limited to this origin’s UI script.');
      res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});
      // This public receiver contains no credential. Only the authorized
      // launch response can place the host's bearer into this tab's storage.
      res.end(`(()=>{try{const session=JSON.parse(sessionStorage.getItem(${JSON.stringify(storageKey)})||'null');if(session?.contract===${JSON.stringify(storageKey)}&&session.baseUrl===${JSON.stringify(origin)}&&typeof session.token==='string')Object.defineProperty(globalThis,'__LDS_MANUAL_SESSION',{value:Object.freeze(session),configurable:true});}catch{}})();`);
      return true;
    }
    throw new HostError(404,'BOOTSTRAP_ROUTE','Unknown bootstrap entry.');
  }
  function decorateHTML(bytes) {
    const html=bytes.toString('utf8');
    if(!/<head\b[^>]*>/i.test(html))throw new HostError(500,'BOOTSTRAP_UI','Editor build must contain a head element.');
    // Classic blocking script executes before the existing module bundle.
    return Buffer.from(html.replace(/<head\b[^>]*>/i,head=>`${head}<script src="/bootstrap/session.js"></script>`));
  }
  async function createLaunchFile(directory,origin) {
    const target=path.join(directory,'start.html');
    const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; form-action ${origin}; base-uri 'none'"><title>LDS Manual 시작</title></head><body><form id="launch" method="post" action="${origin}/bootstrap/launch"><input type="hidden" name="ticket" value="${ticket}"><button type="submit">선택한 문서 편집기 열기</button></form><script>document.getElementById('launch').submit();</script></body></html>`;
    const file=await fs.open(target,'wx',0o600);
    try{await file.writeFile(html);await file.sync();}finally{await file.close();}
    return target;
  }
  return {handle,decorateHTML,createLaunchFile};
}
