// Rail positions use viewport geometry, matching the canvas overlay and its clipping.
// Cover frame/body nodes are transparent layout wrappers, not separate authoring rails.
export function getManualRailLeft(element){
 const leftOf=node=>{const left=node?.getBoundingClientRect?.().left;return Number.isFinite(left)?left:null;};
 const fallback=leftOf(element);
 let semanticLeft=fallback;
 const step=element?.closest?.('[data-manual-node="step"]'),stepLeft=leftOf(step);
 if(stepLeft!==null)return stepLeft;
 for(let parent=element?.parentElement;parent;parent=parent.parentElement){
  const kind=parent.dataset?.manualNode;
  let container;
  if(kind==='page')container=parent.querySelector?.(':scope > .lds-manual-content');
  else if(kind==='cover')container=parent.querySelector?.(':scope > .manual-v2-cover-content');
  // Prefer the shared page/container rail; a standalone semantic box falls back
  // to its outer edge so child controls cannot enter its icon/padding column.
  else if(kind==='callout'||kind==='quote'){semanticLeft=leftOf(parent)??semanticLeft;continue;}
  else if(kind==='toggle')container=parent.querySelector?.(':scope > div');
  else if(['listItem','list','procedure','mediaGroup'].includes(kind))container=parent;
  else continue;
  return leftOf(container)??semanticLeft;
 }
 return semanticLeft;
}
