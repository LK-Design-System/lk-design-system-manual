import {movePath} from './canvas-move.mjs';
const at=(value,path)=>path.reduce((node,key)=>node?.[key],value);

// Only draggable domain elements can be removed with the handle's Delete key.
// A field, page, figure property or arbitrary JSON array is never a target.
export function planCanvasDelete(document,source){
 if(typeof source!=='string')return null;
 const path=movePath(source),collection=path.slice(0,-1),index=path.at(-1),items=at(document,collection);
 const owner=at(document,collection.slice(0,-1));
 const supported=collection.at(-1)==='blocks'||(collection.at(-1)==='items'&&owner?.type==='steps');
 if(!supported||!Array.isArray(items)||!Number.isInteger(index)||index<0||index>=items.length)return null;
 const next=items.length>1?[...collection,Math.min(index,items.length-2)]:collection.slice(0,-1);
 const handle=['blocks','items'].includes(next.at(-2));
 return {operation:{type:'remove',path:collection,index},path:'/'+next.join('/'),handle};
}
