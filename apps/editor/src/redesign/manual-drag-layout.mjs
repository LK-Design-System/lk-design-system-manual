import {manualPageParts,manualPageRole} from './manual-page-shape.mjs';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
import {manualPaginationMarker} from './manual-pagination-meta.mjs';
import {readManualNodeSemanticKind,manualSemanticLabel} from './manual-semantic-labels.mjs';
const labels={pageTitle:'페이지 제목',pageLead:'소개문',page:'페이지',cover:'표지',paragraph:'본문',heading:'소제목',bulletList:'목록',orderedList:'목록',listItem:'목록 항목',procedure:'절차',step:'단계',figure:'이미지',table:'표',callout:'콜아웃',quote:'인용',mediaGroup:'이미지와 설명',todo:'할 일',toggle:'토글',divider:'구분선',codeBlock:'코드 블록'};
const collections={doc:'pages',page:'blocks',cover:'blocks',coverSectionFrame:'blocks',coverBody:'blocks',procedure:'steps',step:'blocks',callout:'blocks',quote:'blocks',toggle:'blocks',bulletList:'items',orderedList:'items',listItem:'blocks'};
// Decorations belong to the view, so ProseMirror retains them during selection updates.
export function manualDragLayout(state){
 const paths=new Map(),targets=new Map(),attributes=new Map(),positions=new Map(),fieldDecorations=[];
 positions.set(state.doc,{pos:-1,id:state.doc.attrs.meta.id});
 state.doc.descendants((node,pos)=>{positions.set(node,{pos,id:node.attrs.id});if(node.isTextblock&&node.content.size===0)fieldDecorations.push(Decoration.node(pos,pos+node.nodeSize,{'data-manual-empty':'true'}));});
 let rootPage=null,pageNumber=0;
 state.doc.forEach((node,pos)=>{
  if(!['page','cover'].includes(node.type.name))return;
  attributes.set(node,{'data-manual-page-number':String(++pageNumber),'data-manual-page-total':String(state.doc.childCount)});
  if(node.type.name!=='page')return;
  const marker=manualPaginationMarker(node.attrs.meta.extensions,'page'),automatic=!!rootPage&&marker?.rootPageId===rootPage.attrs.id;
  if(automatic){attributes.set(node,{...attributes.get(node),'data-manual-auto-page':'true'});const title=manualPageParts(node,pos).title;if(title)fieldDecorations.push(Decoration.node(title.pos,title.pos+title.node.nodeSize,{'data-manual-derived-title':'true',contenteditable:'false','aria-readonly':'true',title:'원본 페이지의 제목을 따릅니다.'}));}
  else rootPage=node;
 });
 for(const [parent,info] of positions){
  const key=collections[parent.type.name];if(!key||!info.id)continue;
  const children=[];parent.forEach(child=>{if(labels[child.type.name]&&child.attrs.id&&!manualPageRole(child)?.derivedFrom)children.push(child);});
  const path=`${info.id}/${key}`;targets.set(path,{parentId:info.id,ids:children.map(node=>node.attrs.id)});
  if(parent!==state.doc)attributes.set(parent,{...attributes.get(parent),'data-move-collection':path});
  children.forEach((node,index)=>{const childPath=`${path}/${index}`;paths.set(childPath,node.attrs.id);attributes.set(node,{...attributes.get(node),'data-move-path':childPath,'data-move-label':manualSemanticLabel(readManualNodeSemanticKind(state,node,positions.get(node).pos))});});
 }
 return {paths,collections:targets,decorations:DecorationSet.create(state.doc,[...attributes].map(([node,attrs])=>Decoration.node(positions.get(node).pos,positions.get(node).pos+node.nodeSize,attrs)).concat(fieldDecorations))};
}
