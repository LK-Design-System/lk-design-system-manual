export function collectFigures(document){
  const result=[];
  function blocks(items,path){for(const [i,block]of (items||[]).entries()){const at=`${path}[${i}]`;if(block.type==='figure')result.push({...block,path:at});if(block.type==='steps')for(const [j,step]of block.items.entries())if(step.figure)result.push({...step.figure,path:`${at}.items[${j}].figure`});if(block.type==='columns'){result.push({...block.figure,path:`${at}.figure`});blocks(block.blocks,`${at}.blocks`);}}}
  if(document?.cover){if(document.cover.logo)result.push({...document.cover.logo,path:'cover.logo'});blocks(document.cover.blocks,'cover.blocks');}
  for(const [i,page]of(document?.pages||[]).entries())blocks(page.blocks,`pages[${i}].blocks`);
  return result;
}
export async function validateBrowserAssets(document,{token,urls={},signal}){
  const errors=[],next={...urls},dimensions=new Map();
  for(const figure of collectFigures(document)){
    if(figure.src==='@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg')continue;
    try{
      if(!next[figure.src]){const response=await fetch(`/api/asset?src=${encodeURIComponent(figure.src)}`,{signal,headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('원본 이미지 경로를 확인하거나 파일을 가져옵니다.');next[figure.src]=URL.createObjectURL(await response.blob());}
      if(!dimensions.has(figure.src)){const image=new Image();image.src=next[figure.src];await image.decode();dimensions.set(figure.src,{width:image.naturalWidth,height:image.naturalHeight});}
      const size=dimensions.get(figure.src),crop=figure.crop;
      if(crop&&(crop.sourceWidth!==size.width||crop.sourceHeight!==size.height))errors.push({path:`${figure.path}.crop`,code:'CROP_SOURCE',message:`원본 좌표 기준 ${size.width} × ${size.height}px와 지정 크기가 다릅니다. 기존 좌표는 자동 보정하지 않습니다.`});
    }catch(error){if(error.name==='AbortError')throw error;errors.push({path:`${figure.path}.src`,code:'ASSET',message:error.message});}
  }
  return {errors,urls:next};
}
export function normalizePath(path){if(!path||path==='document')return '/';if(path.startsWith('/'))return path;return '/'+path.replace(/^document\./,'').replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean).join('/');}
