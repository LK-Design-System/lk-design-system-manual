import {Decoration,DecorationSet} from '@tiptap/pm/view';

// A menu target is visual context, independent of the editor's caret/selection.
export function manualMenuTargetDecorations(state,{menu,editor,generation,readOnly=false}={}){
 if(!state||!menu||!['block','turnInto'].includes(menu.mode)||readOnly||editor?.editable===false||editor?.state!==state||menu.editor!==editor||menu.revision!==state.doc||menu.generation!==generation)return DecorationSet.empty;
 let target=null;
 state.doc.descendants((node,pos)=>{
  if(node.attrs.id===menu.targetId){target={node,pos};return false;}
 });
 if(!target)return DecorationSet.empty;
 const {node,pos}=target;
 if(['page','cover','coverSectionFrame','coverBody'].includes(node.type.name)||!(['step','listItem'].includes(node.type.name)||node.type.spec.group?.split(' ').some(group=>['block','stepBlock','calloutBlock','mediaBlock'].includes(group))))return DecorationSet.empty;
 return DecorationSet.create(state.doc,[Decoration.node(pos,pos+node.nodeSize,{class:'manual-block-menu-target','data-manual-menu-target':'true'})]);
}
