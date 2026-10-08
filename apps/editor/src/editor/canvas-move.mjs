const at=(value,path)=>path.reduce((node,key)=>node?.[key],value);
export const movePath=path=>path.split('/').filter(Boolean).map(key=>/^\d+$/.test(key)?Number(key):key);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// The drop index is a gap in the original array, before removal of the source.
export function planCanvasMove(document,source,destination,gap){
 const path=movePath(source),toPath=movePath(destination),fromPath=path.slice(0,-1),fromIndex=path.at(-1);
 const from=at(document,fromPath),to=at(document,toPath);
 const role=p=>p.at(-1)==='blocks'?'blocks':p.at(-1)==='items'&&at(document,p.slice(0,-1))?.type==='steps'?'steps':null;
 if(!role(fromPath)||role(fromPath)!==role(toPath)||!Array.isArray(from)||!Array.isArray(to)||!Number.isInteger(fromIndex)||fromIndex<0||fromIndex>=from.length||!Number.isInteger(gap)||gap<0||gap>to.length)return null;
 if(path.every((key,i)=>toPath[i]===key))return null;
 const toIndex=gap-(equal(fromPath,toPath)&&fromIndex<gap?1:0);
 if(equal(fromPath,toPath)&&fromIndex===toIndex)return null;
 return {operation:{type:'move',fromPath,fromIndex,toPath,toIndex},path:'/'+[...toPath,toIndex].join('/')};
}
