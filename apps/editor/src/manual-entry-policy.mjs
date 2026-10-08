// Keep the v1 shelf/file and authenticated folder-host UI accessible explicitly.
export function resolveManualEntry({href,session}={}){
 const url=new URL(href);
 const legacy=url.searchParams.get('legacy')==='1';
 const authenticated=typeof session?.token==='string'&&session.token.length>0;
 const legacyToken=new URLSearchParams(url.hash.slice(1)).get('token');
 if(legacy||authenticated||legacyToken)return {kind:'legacy'};
 return {kind:'manual',href:new URL('./manual.html',url).href};
}
export function startManualEntry({location,session,loadLegacy}){
 const entry=resolveManualEntry({href:location.href,session});
 if(entry.kind==='legacy')return loadLegacy();
 location.replace(entry.href);
}
