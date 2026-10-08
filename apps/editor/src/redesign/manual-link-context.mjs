import {setManualLink} from './manual-kernel.mjs';

// Link actions need visible document text as their target. Stored marks alone
// describe future typing, so they must not enable an otherwise empty action.
export function getManualLinkContext(state){
 const selection=state?.selection,mark=state?.schema?.marks?.link;
 if(!selection||!mark||['page','cover'].includes(selection.node?.type.name))return {eligible:false,href:'',mode:'add'};
 let link=null;
 if(selection.empty)link=mark.isInSet(selection.$from.marks());
 else{
  let firstText=false;
  for(const range of selection.ranges){
   state.doc.nodesBetween(range.$from.pos,range.$to.pos,node=>{
    if(firstText)return false;
    if(node.isText){firstText=true;link=mark.isInSet(node.marks);}
   });
   if(firstText)break;
  }
 }
 const eligible=(!selection.empty||!!link)&&setManualLink('https://example.invalid')(state);
 return {eligible:!!eligible,href:link?.attrs.href||'',mode:link?'edit':'add'};
}
