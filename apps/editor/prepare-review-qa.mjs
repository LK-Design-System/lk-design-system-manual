import fs from 'node:fs/promises';
import { copySets, hash } from '../../src/copy-review.mjs';
const root=new URL('./.qa-document/',import.meta.url);
const backup=new URL('./.review-qa-backup/',import.meta.url);
if(process.argv[2]==='restore'){
  for(const name of ['manual.json','copy-review.json'])await fs.copyFile(new URL(name,backup),new URL(name,root));
  console.log('Synthetic review QA original bytes restored');
}else{
  await fs.mkdir(backup);
  for(const name of ['manual.json','copy-review.json'])await fs.copyFile(new URL(name,root),new URL(name,backup));
  const document=JSON.parse(await fs.readFile(new URL('manual.json',root),'utf8'));
  const old=JSON.parse(await fs.readFile(new URL('copy-review.json',root),'utf8'));
  const record={...old,schemaVersion:1,contract:'lds-manual-copy-review/v1',reviewKind:'contextual-agent-review',reviewer:'AUTOMATED STATUS FIXTURE — NOT ACTUAL COPY APPROVAL',reviewedAt:new Date().toISOString(),ruleset:'synthetic UI stale-state test only',audience:'test fixture',documentHash:hash(document),sets:copySets(document).map(set=>({...set,task:'synthetic status test',contextReason:'Test data simulates fresh records; no actual copy quality or product approval is asserted.',sourceItems:set.items,sourceHash:hash(set.items),decisions:set.items.map(item=>({...item,verdict:'KEEP',reason:'Synthetic test decision, not a real review.'}))}))};
  await fs.writeFile(new URL('copy-review.json',root),JSON.stringify(record,null,2)+'\n');
  console.log('Synthetic current-review status fixture prepared; restore after UI stale-state check');
}
