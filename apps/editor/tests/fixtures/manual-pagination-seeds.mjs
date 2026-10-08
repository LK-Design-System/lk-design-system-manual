import {createEmptyManualDocument} from '../../src/redesign/manual-v2.mjs';
import {withManualPaginationMarker} from '../../src/redesign/manual-pagination-meta.mjs';

// A saved synthetic record with two empty continuations exercises removal of
// distinct pages with identical titles and node sizes. Never seeds IndexedDB.
export function createManualEmptyPaginationSeed(){
 const document=createEmptyManualDocument(),root=document.pages[0];
 document.title='빈 자동 페이지 정리 · 합성 검증';root.title=[{type:'text',text:'NEW'}];
 root.blocks[0].content=[{type:'text',text:'원래 본문'}];
 document.pages.push(...Array.from({length:2},()=>({id:crypto.randomUUID(),title:[{type:'text',text:'OLD'}],blocks:[],extensions:withManualPaginationMarker({},{kind:'page',rootPageId:root.id}).extensions})));
 return document;
}
