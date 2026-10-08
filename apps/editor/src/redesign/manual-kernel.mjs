import {setManualDividerStyle} from './manual-divider-style.mjs';
import {Schema,DOMSerializer,Fragment,Slice} from '@tiptap/pm/model';
import {EditorState,Plugin,PluginKey,Selection,TextSelection,NodeSelection,AllSelection} from '@tiptap/pm/state';
import {EditorView} from '@tiptap/pm/view';
import {history,undo,redo,isHistoryTransaction,closeHistory} from '@tiptap/pm/history';
import {InputRule,inputRules,undoInputRule} from '@tiptap/pm/inputrules';
import {canSplit} from '@tiptap/pm/transform';
import {keymap,keydownHandler} from '@tiptap/pm/keymap';
import {baseKeymap,chainCommands,setBlockType,toggleMark,selectAll} from '@tiptap/pm/commands';
import {wrapInList,liftListItem,splitListItem,sinkListItem} from '@tiptap/pm/schema-list';
import {prototypeSchema,isPrototypeLinkSafe} from './prototype-kernel.mjs';
import {validateAssets} from './document-store.mjs';
import {validateManualDocument,createEmptyManualDocument,newManualId,plainInline} from './manual-v2.mjs';
import {manualPaginationMarker,remapManualPaginationMeta} from './manual-pagination-meta.mjs';
import {createManualPaginationTransaction} from './manual-pagination.mjs';
import {deleteEmptyManualBlockAtStart} from './manual-empty-block-commands.mjs';
import {deleteManualToggleTitleBackward} from './manual-toggle-commands.mjs';
import {deleteEmptyManualToggleAtStart} from './manual-toggle-boundary.mjs';
import {manualTableSelectionPlugin,clearManualTableCells,replaceManualTableCellText} from './manual-table-selection.mjs';
import {getOrderedPageEntries,withManualPageOrder,getManualDocumentCovers,withManualDocumentCovers} from './manual-page-order.mjs';
import {getManualTableLayout,readManualTableCellLayout,withManualTableCellLayout} from './manual-table-layout.mjs';
import {projectManualCover,restoreManualCover,getManualCoverProjection,getManualCoverCellProjection,withoutManualCoverRole} from './manual-cover-legacy-projection.mjs';
import {MANUAL_COVER_ELEMENT_ROLES,createManualCoverElement} from './manual-cover-elements.mjs';
import {getManualBrandAsset} from './manual-brand-assets.mjs';
import {withManualCoverFlowProvenance} from './manual-cover-flow-provenance.mjs';
import {getManualBrandRenderAttributes} from './manual-brand-render.mjs';
import {manualCalloutFocusPlugin,manualCalloutFocusKey} from './manual-callout-commands.mjs';
import {manualTableArrowDown,manualTableArrowHorizontal} from './manual-table-navigation.mjs';
import {manualCoverRuntimeRows,getManualCoverLogicalRows,hasMergedManualCoverTable,normalizeManualCoverTableCommand} from './manual-cover-table-shape.mjs';
import {readManualFigureLayout,withManualFigureWidth,withoutManualFigureWidth,manualFigureWidthStyle,resolveManualFigureAlignment,manualFigureAlignmentStyle} from './manual-figure-layout.mjs';
import {readManualNodeSemanticKind} from './manual-semantic-labels.mjs';
import {projectManualPage,restoreManualPage,getManualPageProjection,withoutManualPageRole,remapManualPageProjectionMeta,withManualPageRole} from './manual-page-projection.mjs';
import {manualPageRole,manualPageParts,ordinaryManualPageField,manualContinuationTitle} from './manual-page-shape.mjs';
const attrs={id:{default:null},meta:{default:{}}};
const box=(tag,kind)=>node=>[tag,{'data-manual-kind':kind,'data-manual-node':kind,'data-manual-id':node.attrs.id||''},0];
const inline=(tag,kind)=>({content:'inline*',toDOM:box(tag,kind),...(kind==='paragraph'?{parseDOM:[{tag:'p'}]}:{})});
const structural=(content,tag,kind,group)=>({attrs,content,...(group?{group}:{}),defining:true,isolating:true,toDOM:box(tag,kind)});
const marks={};prototypeSchema.spec.marks.forEach((name,spec)=>{marks[name]=spec;});marks.strike={parseDOM:[{tag:'s'},{tag:'del'},{style:'text-decoration=line-through'}],toDOM:()=>['s',0]};marks.underline={parseDOM:[{tag:'u'},{style:'text-decoration=underline'}],toDOM:()=>['u',0]};
export function manualFigureMediaSpec(meta,resolveAsset=key=>key){
 const {asset,alt,crop,previewTitle}=meta,src=resolveAsset(asset);
 const media=!src?['span',{'data-manual-image-empty':'true'},'이미지를 추가하세요.']:crop?
  ['http://www.w3.org/2000/svg svg',{role:'img','aria-label':alt||'',viewBox:`${crop.x} ${crop.y} ${crop.width} ${crop.height}`},['image',{href:src,width:crop.sourceWidth,height:crop.sourceHeight}]]:
  ['img',{src,alt:alt||'',...(getManualCoverProjection(meta.extensions)?.role==='logo'?{class:'lds-manual-logo'}:{})}];
 return ['div',{contenteditable:'false',...getManualBrandRenderAttributes(asset),...(previewTitle?{class:'lds-manual-document-preview'}:{})},...(previewTitle?[['p',{class:'lds-manual-document-preview-label'},previewTitle]]:[]),media];
}
export function manualCoverLogoSpec(meta,resolveAsset=key=>key){
 const logo=meta.logo,src=logo?resolveAsset(logo.src):null;
 return ['img',{class:'lds-manual-logo',contenteditable:'false',alt:logo?.alt||'',...getManualBrandRenderAttributes(logo?.src),...(src?{src}:{hidden:''})}];
}
export const manualSchema=new Schema({nodes:{
 doc:{attrs:{meta:{default:{}},coverOrder:{default:null}},content:'(cover|page)+'},
 page:structural('block*','section','page'),
 pageTitle:{...inline('h2','pageTitle'),attrs,group:'block',defining:true},pageLead:{...inline('p','pageLead'),attrs,group:'block'},
 cover:structural('block* coverSectionFrame','section','cover'),
 coverSectionFrame:{attrs,content:'block* coverBody',selectable:false,defining:true,toDOM:node=>['div',{'data-manual-node':'coverSectionFrame','data-manual-id':node.attrs.id||'',class:'lds-manual-section'},0]},
 coverBody:{attrs,content:'block*',selectable:false,toDOM:node=>['div',{'data-manual-node':'coverBody','data-manual-id':node.attrs.id||'',class:'lds-manual-section-body'},0]},
 coverTitle:inline('h1','coverTitle'),coverSection:inline('h2','coverSection'),
 coverMetadata:{content:'metadataItem*',toDOM:box('dl','metadata')},
 metadataItem:{attrs,content:'metadataLabel metadataValue',toDOM:box('div','metadataItem')},
 metadataLabel:inline('dt','metadataLabel'),metadataValue:inline('dd','metadataValue'),
 paragraph:{...inline('p','paragraph'),attrs,group:'block stepBlock calloutBlock mediaBlock'},
 heading:{...inline('h3','heading'),attrs:{...attrs,level:{default:3}},group:'block stepBlock calloutBlock mediaBlock',defining:true,parseDOM:[1,2,3].map(level=>({tag:`h${level}`,attrs:{level}})),toDOM:node=>[`h${node.attrs.level}`,{'data-manual-node':'heading','data-manual-kind':'heading','data-manual-id':node.attrs.id||'',...(coverRole(node)?{'data-manual-cover-role':coverRole(node).role,...(coverRole(node).role==='sectionTitle'?{class:'lds-manual-section-title'}:{})}:{})},0]},
 todo:{...inline('p','todo'),attrs,group:'block stepBlock calloutBlock mediaBlock',toDOM:node=>['div',{'data-manual-node':'todo','data-manual-id':node.attrs.id||'','data-checked':String(node.attrs.meta.checked??false)},0]},
 toggle:structural('toggleTitle block*','section','toggle','block stepBlock calloutBlock mediaBlock'),toggleTitle:inline('p','toggleTitle'),
 divider:{attrs,group:'block stepBlock calloutBlock mediaBlock',atom:true,toDOM:node=>['hr',{'data-manual-node':'divider','data-manual-id':node.attrs.id||''}]},
 codeBlock:{attrs,content:'text*',marks:'',group:'block stepBlock calloutBlock mediaBlock',code:true,defining:true,parseDOM:[{tag:'pre',preserveWhitespace:'full'}],toDOM:node=>['pre',{'data-manual-node':'codeBlock','data-manual-id':node.attrs.id||'','data-language':node.attrs.meta.language||''},['code',0]]},
 text:{group:'inline'},hardBreak:{inline:true,group:'inline',selectable:false,parseDOM:[{tag:'br'}],toDOM:()=>['br']},
 bulletList:{attrs,content:'listItem+',group:'block stepBlock calloutBlock mediaBlock',parseDOM:[{tag:'ul'}],toDOM:box('ul','list')},
 orderedList:{attrs,content:'listItem+',group:'block stepBlock calloutBlock mediaBlock',parseDOM:[{tag:'ol',getAttrs:dom=>({meta:{start:Math.max(1,parseInt(dom.getAttribute('start')||'1',10)||1)}})}],toDOM:node=>['ol',{'data-manual-id':node.attrs.id||'','data-manual-node':'list','data-manual-kind':'list',start:node.attrs.meta.start||1},0]},
 listItem:{attrs,content:'paragraph (paragraph|bulletList|orderedList)*',defining:true,parseDOM:[{tag:'li'}],toDOM:box('li','listItem')},
 quote:{...structural('paragraph+','blockquote','quote','block stepBlock calloutBlock mediaBlock'),parseDOM:[{tag:'blockquote'}]},
 procedure:{...structural('step+','ol','procedure','block mediaBlock'),toDOM:node=>['ol',{'data-manual-id':node.attrs.id||'','data-manual-node':'procedure','data-manual-kind':'procedure',start:node.attrs.meta.start||1},0]},
 step:structural('stepTitle stepBlock*','li','step'),stepTitle:inline('h3','stepTitle'),
 figure:structural('figureCaption','figure','figure','block stepBlock calloutBlock mediaBlock'),figureCaption:inline('figcaption','figureCaption'),
 table:{...structural('tableRow+','table','table','block calloutBlock mediaBlock'),tableRole:'table',toDOM:node=>{const layout=getManualTableLayout(node),spec=box('table','table')(node);return layout.hasColumnWeights?[spec[0],spec[1],['colgroup',...layout.columnPercentages.map(width=>['col',{style:`width: ${width}%;`}])],['tbody',0]]:spec;}},
 tableRow:{attrs:{header:{default:false}},content:'tableCell+',tableRole:'row',toDOM:node=>{const spec=box('tr','tableRow')(node),heights=[];node.forEach(cell=>{const height=readManualTableCellLayout(cell.attrs.meta?.extensions)?.rowMinHeightPx;if(height!==undefined)heights.push(height);});return heights.length?[spec[0],{...spec[1],style:`height: ${Math.max(...heights)}px;`},0]:spec;}},
 tableCell:{attrs:{...attrs,colspan:{default:1},rowspan:{default:1},colwidth:{default:null}},content:'inline*',tableRole:'cell',isolating:true,toDOM:node=>{const spec=box('td','tableCell')(node);return [spec[0],{...spec[1],...(node.attrs.colspan!==1?{colspan:node.attrs.colspan}:{}),...(node.attrs.rowspan!==1?{rowspan:node.attrs.rowspan}:{})},0];}},
 callout:{...structural('calloutTitle calloutBlock*','aside','callout','block stepBlock calloutBlock mediaBlock'),toDOM:node=>['aside',{'data-manual-id':node.attrs.id||'','data-manual-node':'callout','data-manual-kind':'callout','data-tone':node.attrs.meta.tone||'signal'},0]},calloutTitle:inline('h3','calloutTitle'),
 mediaGroup:{...structural('figure mediaBlock*','section','mediaGroup','block'),toDOM:node=>['section',{'data-manual-id':node.attrs.id||'','data-manual-node':'mediaGroup','data-manual-kind':'mediaGroup','data-layout':node.attrs.meta.layout||'stacked'},0]},
},marks});
// Clipboard metadata is typed JSON, never raw HTML or executable attributes.
function clipboardAttributes(name,dom){
 try{
  const raw=dom.getAttribute('data-manual-meta'),meta=raw?JSON.parse(raw):{};
  if(!meta||typeof meta!=='object'||Array.isArray(meta))return false;
  const id=dom.getAttribute('data-manual-id')||newManualId(),base={schemaVersion:2,id:newManualId(),title:'',pages:[{id:newManualId(),title:[],blocks:[]}]};
  let candidate;
  if(['pageTitle','pageLead'].includes(name))return {id,meta};
  if(name==='page')base.pages=[{id,title:[],blocks:[],...meta}];
  else if(name==='cover')base.cover={id,title:[],metadata:[],blocks:[],...meta};
  else if(name==='metadataItem')base.cover={id:newManualId(),title:[],metadata:[{id,label:[],value:[],...meta}],blocks:[]};
  else if(name==='listItem')base.pages[0].blocks=[{type:'list',id:newManualId(),ordered:false,items:[{id,blocks:[para()],...meta}]}];
  else if(name==='step')base.pages[0].blocks=[{type:'procedure',id:newManualId(),start:1,steps:[{id,title:[],blocks:[],...meta}]}];
  else if(name==='tableCell')base.pages[0].blocks=[{type:'table',id:newManualId(),label:'',headers:[{id,content:[],...meta}],rows:[]}];
  else if(Object.hasOwn(manualSchema.nodes[name].spec.attrs||{},'id')){
   const type=['bulletList','orderedList'].includes(name)?'list':name;
   candidate=blankBlock(type,{...meta,id,...(type==='list'?{ordered:name==='orderedList'}:{}),...(type==='heading'?{level:Number(dom.getAttribute('data-manual-level')||3)}:{})});base.pages[0].blocks=[candidate];
  }
  validateManualDocument(base);
  if(!Object.hasOwn(manualSchema.nodes[name].spec.attrs||{},'id'))return name==='tableRow'?{header:dom.getAttribute('data-manual-header')==='true'}:null;
  const normalized=candidate?without(candidate,['id','type','content','text','title','blocks','steps','items','rows','headers','figure','caption','ordered','level']):meta;
  return {id,meta:normalized,...(name==='heading'?{level:Number(dom.getAttribute('data-manual-level')||3)}:{}),...(name==='tableCell'&&dom.getAttribute('colspan')==='3'&&getManualCoverCellProjection(meta.extensions)?.canonicalColspan===3?{colspan:3}:{})};
 }catch{return false;}
}
for(const [name,type]of Object.entries(manualSchema.nodes)){
 if(!type.spec.toDOM)continue;
 const render=type.spec.toDOM;
 type.spec.toDOM=node=>{const spec=render(node),attributes=typeof spec[1]==='object'&&!Array.isArray(spec[1])?spec[1]:{};return [spec[0],{...attributes,'data-manual-type':name,...(node.attrs.meta?{'data-manual-meta':JSON.stringify(node.attrs.meta)}:{}),...(node.attrs.id?{'data-manual-id':node.attrs.id}:{}),...(coverRole(node)?{'data-manual-cover-role':coverRole(node).role}:{}),...(name==='heading'?{'data-manual-level':String(node.attrs.level)}:{}),...(name==='tableRow'?{'data-manual-header':String(node.attrs.header)}:{})},...spec.slice(attributes===spec[1]?2:1)];};
 // Semantic clipboard roles win over generic tags such as h3, p, ol and li.
 type.spec.parseDOM=[{tag:`[data-manual-type="${name}"]`,priority:100,getAttrs:dom=>clipboardAttributes(name,dom)},...(type.spec.parseDOM||[])];
}
function copyManualNodes(nodes){
 const idMap=new Map();
 for(const node of nodes){if(node.attrs.id)idMap.set(node.attrs.id,newManualId());node.descendants(child=>{if(child.attrs.id)idMap.set(child.attrs.id,newManualId());});}
 const clone=node=>{const marks=node.marks.map(mark=>mark.type.name==='link'&&mark.attrs.href.startsWith('#')&&idMap.has(mark.attrs.href.slice(1))?mark.type.create({href:'#'+idMap.get(mark.attrs.href.slice(1))}):mark);return node.isText?node.mark(marks):node.type.create({...structuredClone(node.attrs),...(node.attrs.meta?{meta:remapManualPageProjectionMeta(remapManualPaginationMeta(node.attrs.meta,idMap),idMap)}:{}),...(Object.hasOwn(node.attrs,'id')?{id:idMap.get(node.attrs.id)||newManualId()}:{})},children(node).map(clone),marks);};
 return nodes.map(node=>{const copied=clone(node);const release=child=>{if(child.isText)return child;const next=child.copy(Fragment.fromArray(children(child).map(release)));return ['pageTitle','pageLead'].includes(next.type.name)&&!manualPageRole(next)?ordinaryManualPageField(next):next;};return release(copied);});
}
function closeManualClipboardNode(node){
 if(node.isText)return node;
 const content=children(node).map(closeManualClipboardNode),first={callout:'calloutTitle',toggle:'toggleTitle',step:'stepTitle'}[node.type.name];
 // A partial text range may begin after a container's required title.
 // Closing an isolating slice must restore that empty slot, never relabel its body.
 if(first&&content[0]?.type.name!==first)content.unshift(manualSchema.nodes[first].create());
 return node.type.create(node.attrs,content,node.marks);
}
export function normalizeManualPastedSlice(slice){
 const copied=copyManualNodes(children(slice.content));
 const out=[];
 copied.forEach(node=>{
  if(['coverSectionFrame','coverBody'].includes(node.type.name)){const flattened=normalizeManualPastedSlice(new Slice(node.content,0,0));out.push(...children(flattened.content));return;}
  if(!['page','cover'].includes(node.type.name)){out.push(node);return;}
  // Copy page contents into the destination page; source wrapper metadata travels with its title.
  node.forEach(child=>{
   if(['pageTitle','coverTitle','coverSection'].includes(child.type.name))out.push(manualSchema.nodes.heading.create({id:['pageTitle','coverTitle'].includes(child.type.name)?node.attrs.id:newManualId(),level:child.type.name==='coverTitle'?1:2,meta:{extensions:{clipboardContainer:info(node)}}},child.content));
   else if(child.type.name==='pageLead')out.push(manualSchema.nodes.paragraph.create({id:newManualId()},child.content));
   else if(child.type.name==='coverMetadata')child.forEach(item=>out.push(manualSchema.nodes.paragraph.create({id:newManualId(),meta:{extensions:{clipboardMetadata:info(item)}}},[...children(item.child(0)),manualSchema.text(': '),...children(item.child(1))])));
   else if(['coverSectionFrame','coverBody'].includes(child.type.name)){const flattened=normalizeManualPastedSlice(new Slice(child.content,0,0));out.push(...children(flattened.content));}
   else out.push(child);
  });
 });
 const content=Fragment.fromArray(out.map(closeManualClipboardNode)),max=Slice.maxOpen(content,false);
 return new Slice(content,Math.min(slice.openStart,max.openStart),Math.min(slice.openEnd,max.openEnd));
}
const without=(obj,names)=>Object.fromEntries(Object.entries(obj).filter(([k])=>!names.includes(k)));
const children=node=>{const out=[];node.forEach(child=>out.push(child));return out;};
const textNodes=runs=>runs.map(run=>run.type==='hardBreak'?manualSchema.nodes.hardBreak.create():manualSchema.text(run.text,(run.marks||[]).map(mark=>manualSchema.marks[mark.type].create(mark.type==='link'?{href:mark.href}:null))));
const readInline=node=>{const result=[];node.forEach(child=>{if(child.type.name==='hardBreak')result.push({type:'hardBreak'});else result.push({type:'text',text:child.text,...(child.marks.length?{marks:child.marks.map(mark=>({type:mark.type.name,...(mark.type.name==='link'?{href:mark.attrs.href}:{})}))}:{})});});return result;};
const make=(type,obj,content,omit=[])=>manualSchema.nodes[type].create({id:obj.id,...(type==='heading'?{level:obj.level??3}:{}),meta:structuredClone(without(obj,['id','type',...omit]))},content);
function blockToNode(b){
 switch(b.type){
  case 'todo':return make('todo',b,textNodes(b.content),['content']);
  case 'toggle':return make('toggle',b,[manualSchema.nodes.toggleTitle.create(null,textNodes(b.title)),...b.blocks.map(blockToNode)],['title','blocks']);
  case 'divider':return make('divider',b,null);
  case 'codeBlock':return make('codeBlock',b,b.text?manualSchema.text(b.text):null,['text']);
  case 'paragraph':case 'heading':{const role=getManualPageProjection(b.extensions),bound=role?.blockId===b.id,type=bound&&role.role==='title'&&b.type==='heading'&&b.level===2?'pageTitle':bound&&role.role==='lead'&&b.type==='paragraph'?'pageLead':b.type;return make(type,b,textNodes(b.content),['content','level']);}
  case 'list':return make(b.ordered?'orderedList':'bulletList',b,b.items.map(item=>make('listItem',item,item.blocks.map(blockToNode),['blocks'])),['items','ordered']);
  case 'quote':return make('quote',b,b.blocks.map(blockToNode),['blocks']);
  case 'procedure':return make('procedure',b,b.steps.map(step=>make('step',step,[manualSchema.nodes.stepTitle.create(null,textNodes(step.title)),...step.blocks.map(blockToNode)],['title','blocks'])),['steps']);
  case 'figure':return make('figure',b,manualSchema.nodes.figureCaption.create(null,textNodes(b.caption)),['caption']);
  case 'table':return make('table',b,manualCoverRuntimeRows(b).map((row,index)=>manualSchema.nodes.tableRow.create({header:index===0},row.map((c,column)=>{const node=make('tableCell',c,textNodes(c.content),['content']);return row.length===2&&column===1&&getManualCoverCellProjection(c.extensions)?.canonicalColspan===3?node.type.create({...node.attrs,colspan:3},node.content):node;}))),['headers','rows']);
  case 'callout':return make('callout',b,[manualSchema.nodes.calloutTitle.create(null,textNodes(b.title)),...b.blocks.map(blockToNode)],['title','blocks']);
  case 'mediaGroup':return make('mediaGroup',b,[blockToNode(b.figure),...b.blocks.map(blockToNode)],['figure','blocks']);
  default:throw new TypeError(`지원하지 않는 노드 ${b.type}`);
 }
}
export function documentToNode(document){
 validateManualDocument(document);const content=[],usedIds=[];const collect=value=>{if(!value||typeof value!=='object')return;if(value.id)usedIds.push(value.id);for(const [key,child]of Object.entries(value))if(key!=='extensions')collect(child);};collect(document);
 for(const c of getManualDocumentCovers(document)){const projected=projectManualCover(c,{usedIds});collect(projected);const idFor=kind=>{const base=`manual-cover:${c.id}:layout:${kind}`;let id=base;for(let suffix=2;usedIds.includes(id);suffix++)id=`${base}:${suffix}`;usedIds.push(id);return id;},body=projected.bodyBlocks.map(blockToNode),prefix=coverRole(body[0])?.role==='sectionTitle'?[body.shift()]:[];content.push(make('cover',c,[...projected.headerBlocks.map(blockToNode),manualSchema.nodes.coverSectionFrame.create({id:idFor('frame')},[...prefix,manualSchema.nodes.coverBody.create({id:idFor('body')},body)])],['title','metadata','sectionTitle','blocks','logo']));}
 const usedPageIds=[];const collectPageIds=value=>{if(!value||typeof value!=='object')return;if(value.id)usedPageIds.push(value.id);for(const [key,child]of Object.entries(value))if(key!=='extensions')collectPageIds(child);};collectPageIds(document);content.forEach(node=>node.descendants(child=>{if(child.attrs.id)usedPageIds.push(child.attrs.id);}));
 content.push(...document.pages.map(p=>{const projected=projectManualPage(p,{usedIds:usedPageIds});projected.blocks.forEach(block=>usedPageIds.push(block.id));return make('page',p,projected.blocks.map(blockToNode),['title','lead','blocks']);}));
 const byId=new Map(content.map(node=>[node.attrs.id,node])),ordered=getOrderedPageEntries(document).map(page=>byId.get(page.id));
 const result=manualSchema.nodes.doc.create({meta:structuredClone(without(document,['cover','covers','pages'])),coverOrder:document.covers?.map(cover=>cover.id)||null},ordered);result.check();return result;
}
const info=node=>({...structuredClone(node.attrs.meta),id:node.attrs.id});
function releaseCoverProjection(block){
 const result=structuredClone(block),visit=value=>{if(!value||typeof value!=='object')return;const marker=getManualCoverProjection(value.extensions);if(marker){for(const [key,data]of Object.entries(value.extensions))if(data===marker)delete value.extensions[key];if(!Object.keys(value.extensions).length)delete value.extensions;}for(const [key,child]of Object.entries(value))if(key!=='extensions'&&child&&typeof child==='object')Array.isArray(child)?child.forEach(visit):visit(child);};visit(result);return result;
}
function nodeToBlock(node,{usedIds}={}){
 const common=info(node),parts=children(node);
 switch(node.type.name){
  case 'todo':return {...common,type:'todo',checked:common.checked??false,content:readInline(node)};
  case 'toggle':return {...common,type:'toggle',open:common.open??true,title:readInline(parts[0]),blocks:parts.slice(1).map(child=>nodeToBlock(child,{usedIds}))};
  case 'divider':return {...common,type:'divider'};
  case 'codeBlock':return {...common,type:'codeBlock',language:common.language??'',text:node.textContent};
  case 'paragraph':case 'pageLead':return {...common,type:'paragraph',content:readInline(node)};
  case 'heading':case 'pageTitle':return {...common,type:'heading',level:node.type.name==='pageTitle'?2:node.attrs.level,content:readInline(node)};
  case 'bulletList':case 'orderedList':return {...common,type:'list',ordered:node.type.name==='orderedList',items:parts.map(item=>({...info(item),blocks:children(item).map(child=>nodeToBlock(child,{usedIds}))}))};
  case 'quote':return {...common,type:'quote',blocks:parts.map(child=>nodeToBlock(child,{usedIds}))};
  case 'procedure':return {...common,type:'procedure',steps:parts.map(step=>({...info(step),title:readInline(step.firstChild),blocks:children(step).slice(1).map(child=>nodeToBlock(child,{usedIds}))}))};
  case 'figure':return {...common,type:'figure',caption:readInline(node.firstChild)};
  case 'table':{const rows=getManualCoverLogicalRows(node,{usedIds}).map(row=>row.map(c=>({...info(c),content:readInline(c)})));return {...common,type:'table',headers:rows[0],rows:rows.slice(1)};}
  case 'callout':return {...common,type:'callout',title:readInline(parts[0]),blocks:parts.slice(1).map(child=>nodeToBlock(child,{usedIds}))};
  case 'mediaGroup':return {...common,type:'mediaGroup',figure:nodeToBlock(parts[0],{usedIds}),blocks:parts.slice(1).map(child=>nodeToBlock(child,{usedIds}))};
  default:throw new TypeError(`지원하지 않는 노드 ${node.type.name}`);
 }
}
export function documentFromState(state){
 const result={...structuredClone(state.doc.attrs.meta),pages:[]},covers=[],usedIds=[state.doc.attrs.meta.id];state.doc.descendants(node=>{if(node.attrs.id)usedIds.push(node.attrs.id);});
 state.doc.forEach(node=>{
  const parts=children(node);
  if(node.type.name==='cover'){const frame=parts.find(child=>child.type.name==='coverSectionFrame'),body=[];frame.forEach(child=>{if(child.type.name==='coverBody')body.push(...children(child));else body.push(child);});covers.push(restoreManualCover(info(node),{headerBlocks:parts.filter(child=>child!==frame).map(child=>nodeToBlock(child,{usedIds})),bodyBlocks:body.map(child=>nodeToBlock(child,{usedIds}))}));}
  else result.pages.push(restoreManualPage(info(node),parts.map(child=>releaseCoverProjection(nodeToBlock(child,{usedIds})))));
 });const coverOrder=state.doc.attrs.coverOrder||[],rank=new Map(coverOrder.map((id,index)=>[id,index]));covers.sort((a,b)=>(rank.get(a.id)??coverOrder.length)-(rank.get(b.id)??coverOrder.length));return validateManualDocument(withManualPageOrder(withManualDocumentCovers(result,covers),children(state.doc).map(node=>node.attrs.id)));
}
/** UI-only object tree containing projected roles and physical layout parents.
 * Storage and printing continue to use documentFromState's validated v2 DTO.
 */
export function getManualEditingDocument(state){
 const result=documentFromState(state);
 const usedIds=[state.doc.attrs.meta.id];state.doc.descendants(node=>{if(node.attrs.id)usedIds.push(node.attrs.id);});
 const editable=node=>['coverSectionFrame','coverBody'].includes(node.type.name)?{id:node.attrs.id,type:node.type.name,blocks:children(node).map(editable)}:nodeToBlock(node,{usedIds});
 result.pages=result.pages.map(page=>({...page,blocks:children(findManualObject(state,page.id).node).map(editable)}));
 return withManualDocumentCovers(result,getManualDocumentCovers(result).map(cover=>({...cover,metadata:[],blocks:children(findManualObject(state,cover.id).node).map(editable)})));
}
const guarded=command=>(state,dispatch,view)=>view?.composing?false:command(state,dispatch,view);
function tableInputAllowed(view){
 if(view?.composing||view?.editable===false)return false;
 const guard=view?.props?.manualTableSelectionEnabled;return typeof guard==='function'?guard(view)!==false:guard!==false;
}
const contiguousOnly=command=>guarded((state,dispatch,view)=>state.selection.manualSparseBlockSelection?false:command(state,dispatch,view));
const completeSelectionOnly=command=>guarded((state,dispatch,view)=>view?.editable===false||state.selection.manualIncompletePaginationSelection||state.selection.manualTableCellSelection&&!tableInputAllowed(view)?false:command(state,dispatch,view));
export function findManualObject(state,id){if(state.doc.attrs.meta.id===id)return {node:state.doc,pos:-1,parent:null,index:0};let found=null;state.doc.descendants((node,pos,parent,index)=>{if(node.attrs.id===id)found={node,pos,parent,index};});return found;}
function coverRole(node){const marker=getManualCoverProjection(node?.attrs?.meta?.extensions);return marker?.blockId===node?.attrs.id?marker:null;}
export function findManualPageRole(state,pageId,role){const page=findManualObject(state,pageId);if(page?.node.type.name!=='page')return null;let found=null;page.node.forEach((node,offset,index)=>{const marker=manualPageRole(node);if(marker?.pageId===pageId&&marker.role===role)found={node,pos:page.pos+1+offset,parent:page.node,index};});return found;}
export function findManualCoverRole(state,coverId,role){const cover=findManualObject(state,coverId);let found=null;if(cover?.node.type.name!=='cover')return null;cover.node.descendants((node,offset,parent,index)=>{const marker=coverRole(node);if(marker?.coverId===coverId&&marker.role===role)found={node,pos:cover.pos+1+offset,parent,index};});return found;}
function coverBodyTarget(found){if(found?.node.type.name!=='cover')return found;let body=null;found.node.descendants((node,offset,parent,index)=>{if(node.type.name==='coverBody')body={node,pos:found.pos+1+offset,parent,index};});return body;}
function parentObject(state,found){const $pos=state.doc.resolve(found.pos);return {node:found.parent,pos:found.pos-$pos.parentOffset-1};}
function coverIdAt(doc,pos){const $pos=doc.resolve(pos);for(let depth=$pos.depth;depth>0;depth--)if($pos.node(depth).type.name==='cover')return $pos.node(depth).attrs.id;return null;}
const ancestry=(state,name)=>{for(let d=state.selection.$from.depth;d>0;d--)if(state.selection.$from.node(d).type.name===name)return {node:state.selection.$from.node(d),pos:state.selection.$from.before(d)};return null;};
const identified=new Plugin({appendTransaction(transactions,old,state){if(!transactions.some(t=>t.docChanged))return null;const seen=new Set([state.doc.attrs.meta.id]);let tr=null;state.doc.descendants((node,pos)=>{if(!Object.hasOwn(node.attrs,'id'))return;let id=node.attrs.id;if(!id||seen.has(id)){id=newManualId();tr??=state.tr;tr.setNodeMarkup(pos,undefined,{...node.attrs,id});}seen.add(id);});return tr;}});
export const selectManualObject=(id,{text=true}={})=>guarded((state,dispatch)=>{const found=findManualObject(state,id);if(!found||found.pos<0)return false;if(dispatch){const target=text&&found.node.type.name==='cover'?findManualCoverRole(state,id,'title')||found:found,selection=text&&coverRole(target.node)?.role!=='logo'?Selection.findFrom(state.doc.resolve(target.pos+1),1,true):NodeSelection.create(state.doc,target.pos);if(!selection)return false;dispatch(state.tr.setSelection(selection).scrollIntoView());}return true;});
function pageContaining(state,found){
 if(found?.node.type.name==='page')return found;if(!found||found.pos<0)return null;
 const $pos=state.doc.resolve(found.pos+1);for(let depth=$pos.depth;depth>0;depth--)if($pos.node(depth).type.name==='page')return {node:$pos.node(depth),pos:$pos.before(depth)};return null;
}
/** Menu state and command share the same checks; disabled actions never dispatch. */
export function getManualPageTitleCommandState(state,{mode='insert',pageId,targetId,revision,readOnly=false,cancelled=false}={},view){
 const result={enabled:false,reason:null,selectedCurrent:false},fail=reason=>({...result,reason});
 if(revision!==undefined&&revision!==state.doc)return fail('stale');if(cancelled)return fail('cancelled');
 if(readOnly||view?.editable===false)return fail('read-only');if(view?.composing)return fail('composing');
 if(!['insert','turnInto','convert'].includes(mode))return fail('invalid-mode');
 if(state.selection.manualSparseBlockSelection||state.selection.manualIncompletePaginationSelection||state.selection.manualTableCellSelection||state.selection.manualBlockSelection&&state.selection.ids.length!==1||mode!=='insert'&&state.selection instanceof TextSelection&&state.selection.$from.parent!==state.selection.$to.parent)return fail('ineligible-selection');
 let target=targetId?findManualObject(state,targetId):state.selection instanceof NodeSelection?findManualObject(state,state.selection.node.attrs.id):findManualObject(state,state.selection.$from.parent.attrs.id);
 if(targetId&&!target)return fail('missing-target');
 if(target?.node.type.name==='cover'||coverRole(target?.node))return fail('no-page');
 const physical=pageId?findManualObject(state,pageId):pageContaining(state,target)||ancestry(state,'page');
 if(physical?.node.type.name!=='page')return fail('no-page');
 const group=paginationGroup(state.doc,physical.node.attrs.id),rootId=group?.[0].attrs.id,root=rootId&&findManualObject(state,rootId);if(root?.node.type.name!=='page')return fail('no-page');
 Object.assign(result,{rootPageId:rootId,physicalPageId:physical.node.attrs.id,...(target?{targetId:target.node.attrs.id}:{})});
 const title=findManualPageRole(state,rootId,'title');if(title){result.titleId=title.node.attrs.id;result.selectedCurrent=target?.node.attrs.id===title.node.attrs.id;return fail(result.selectedCurrent?'current-title':'title-exists');}
 if(manualPageRole(target?.node)?.derivedFrom)return fail('derived-title');
 if(mode!=='insert'){
  if(!target||!['paragraph','heading'].includes(target.node.type.name)||target.parent?.type.name!=='page'||coverRole(target.node)||manualPageRole(target.node))return fail('ineligible-text');
  if(!group.some(page=>page.attrs.id===target.parent.attrs.id))return fail('foreign-page');
  const marker=manualPaginationMarker(target.node.attrs.meta?.extensions,'block');let continued=false;state.doc.descendants(node=>{if(manualPaginationMarker(node.attrs.meta?.extensions,'block')?.rootBlockId===target.node.attrs.id)continued=true;});
  if(marker||continued)return fail('fragmented-text');
 }
 return {...result,enabled:true};
}
export const applyManualPageTitle=(options={})=>(state,dispatch,view)=>{
 const status=getManualPageTitleCommandState(state,options,view);if(!status.enabled)return false;if(!dispatch)return true;
 const mode=options.mode||'insert',target=mode==='insert'?null:findManualObject(state,status.targetId),root=findManualObject(state,status.rootPageId),used=new Set([state.doc.attrs.meta.id]);state.doc.descendants(node=>{if(node.attrs.id)used.add(node.attrs.id);});
 let id=target?.node.attrs.id;if(!id){id=newManualId();while(used.has(id))id=newManualId();}used.add(id);
 const content=target?.node.content||Fragment.empty,meta=withManualPageRole(target?.node.attrs.meta||{},root.node.attrs.id,'title',id,{originalInline:target?readInline(target.node):[],identityPinned:true}),title=manualSchema.nodes.pageTitle.create({id,meta},content),tr=closeHistory(state.tr);
 if(target)tr.delete(target.pos,target.pos+target.node.nodeSize);let liveRoot=findManualObject({doc:tr.doc},root.node.attrs.id);tr.insert(liveRoot.pos+1,title);
 for(const page of paginationGroup(state.doc,root.node.attrs.id).slice(1)){
  const live=findManualObject({doc:tr.doc},page.attrs.id);liveRoot=findManualObject({doc:tr.doc},root.node.attrs.id);const previous=manualPageParts(live.node,live.pos).title,next=manualContinuationTitle(liveRoot.node,page.attrs.id,{usedIds:[...used],...(previous?{id:previous.node.attrs.id}:{})});used.add(next.attrs.id);
  if(previous)tr.replaceWith(previous.pos,previous.pos+previous.node.nodeSize,next);else tr.insert(live.pos+1,next);
 }
 const selected=findManualObject({doc:tr.doc},id);tr.setSelection(TextSelection.create(tr.doc,selected.pos+1)).setStoredMarks(state.storedMarks);dispatch(tr.setMeta('manualPageTitle',{rootPageId:root.node.attrs.id,mode}).scrollIntoView());return true;
};
function coverInsertSurface(state,target){
 if(['cover','page'].includes(target?.node.type.name))return target;
 const $pos=target?.pos>=0?state.doc.resolve(target.pos+1):state.selection.$from;
 for(let depth=$pos.depth;depth>0;depth--)if(['cover','page'].includes($pos.node(depth).type.name))return {node:$pos.node(depth),pos:$pos.before(depth)};
 return null;
}
function completeCoverInsertGroup(state,group){
 if(!group?.length||group[0].type.name==='page'&&manualPaginationMarker(group[0].attrs.meta?.extensions,'page'))return false;
 const ids=new Set(),objects=new Map();for(const page of group){ids.add(page.attrs.id);page.descendants(node=>{if(node.attrs.id)ids.add(node.attrs.id);});}
 let valid=true;state.doc.descendants(node=>{if(node.attrs.id)objects.set(node.attrs.id,node);});
 state.doc.descendants(node=>{const page=manualPaginationMarker(node.attrs.meta?.extensions,'page'),block=manualPaginationMarker(node.attrs.meta?.extensions,'block');if(page?.rootPageId===group[0].attrs.id&&!ids.has(node.attrs.id))valid=false;if(block&&(ids.has(node.attrs.id)||ids.has(block.rootBlockId))&&(!ids.has(node.attrs.id)||!ids.has(block.rootBlockId)||objects.get(block.rootBlockId)?.type.name!==block.sourceType||block.rootBlockId===node.attrs.id))valid=false;});return valid;
}
/** This capability describes the same captured document and target as the
 * command. A logo chooser may open on canChoose, but insertion needs a variant. */
export function getManualCoverInsertCommandState(state,{role,coverId,pageId,targetId,revision,readOnly=false,cancelled=false,trigger,logoVariantId}={},view){
 const result={enabled:false,reason:null,selectedCurrent:false},fail=reason=>({...result,reason});
 if(revision!==undefined&&revision!==state.doc)return fail('stale');if(cancelled)return fail('cancelled');
 if(readOnly||view?.editable===false)return fail('read-only');if(view?.composing)return fail('composing');
 if(!MANUAL_COVER_ELEMENT_ROLES.includes(role))return fail('invalid-role');
 if(state.selection instanceof AllSelection||state.selection.manualSparseBlockSelection||state.selection.manualIncompletePaginationSelection||state.selection.manualTableCellSelection||state.selection.manualBlockSelection&&state.selection.ids.length!==1||state.selection instanceof TextSelection&&state.selection.$from.parent!==state.selection.$to.parent)return fail('ineligible-selection');
 const selectedId=state.selection.manualBlockSelection?state.selection.ids[0]:state.selection instanceof NodeSelection?state.selection.node.attrs.id:state.selection.$from.parent.attrs.id;
 const targetIdentity=targetId||selectedId,target=targetIdentity?findManualObject(state,targetIdentity):null,explicit=coverId||pageId;
 if(targetId&&!target)return fail('missing-target');
 let surface=explicit?findManualObject(state,explicit):coverInsertSurface(state,target);
 if(!surface||!['cover','page'].includes(surface.node.type.name))return fail('no-page');
 const physical=surface,group=paginationGroup(state.doc,surface.node.attrs.id),targetSurface=coverInsertSurface(state,target);
 if(target&&(!group||!group.some(page=>page.attrs.id===targetSurface?.node.attrs.id)))return fail('foreign-page');
 if(group?.[0].attrs.id!==surface.node.attrs.id)surface=findManualObject(state,group[0].attrs.id);
 Object.assign(result,{coverId:surface.node.attrs.id,physicalPageId:physical.node.attrs.id,pageIds:group?.map(page=>page.attrs.id)||[],targetId:target?.node.attrs.id,convertsPage:surface.node.type.name==='page'});
 if(surface.node.type.name==='page'){
  if(!completeCoverInsertGroup(state,group))return fail('incomplete-group');
 }else{
  const existing=findManualCoverRole(state,surface.node.attrs.id,role);
  if(existing){result.roleId=existing.node.attrs.id;result.selectedCurrent=target?.node.attrs.id===existing.node.attrs.id;return fail(result.selectedCurrent?'current-role':'role-exists');}
 }
 if(!completeCoverInsertGroup(state,group))return fail('incomplete-group');
 if(trigger){const live=getManualSlashTrigger(state);if(!live||['from','to','query','blockId'].some(key=>live[key]!==trigger[key])||!group.some(page=>page.attrs.id===coverInsertSurface(state,findManualObject(state,live.blockId))?.node.attrs.id))return fail('stale-trigger');}
 if(role==='logo'){
  if(logoVariantId===undefined)return {...fail('needs-choice'),choiceRequired:true,canChoose:true};
  if(!getManualBrandAsset(logoVariantId))return fail('invalid-logo');
 }
 return {...result,enabled:true};
}
/** Inserts only the requested role. The first role turns the current page into
 * a cover at the same position, preserving its ordinary blocks and identities. */
export const executeManualCoverInsert=(role,options={})=>(state,dispatch,view)=>{
 const status=getManualCoverInsertCommandState(state,{...options,role},view);if(!status.enabled)return false;if(!dispatch)return true;
 const tr=closeHistory(state.tr);if(options.trigger)tr.delete(options.trigger.from,options.trigger.to);
 const surface=findManualObject({doc:tr.doc},status.coverId),used=new Set([tr.doc.attrs.meta.id]);tr.doc.descendants(node=>{if(node.attrs.id)used.add(node.attrs.id);});
 const created=createManualCoverElement(status.coverId,role,{usedIds:[...used],logoVariantId:options.logoVariantId});
 let block=created.block;if(role==='logo')block={...block,...withManualFigureWidth({extensions:block.extensions},created.defaultWidthPx)};
 const element=blockToNode(block);
 if(status.convertsPage){
  const body=children(surface.node).map(ordinaryManualPageField),fresh=kind=>{const base=`manual-cover:${status.coverId}:layout:${kind}`;let id=base;for(let suffix=2;used.has(id);suffix++)id=`${base}:${suffix}`;used.add(id);return id;};
  const frame=manualSchema.nodes.coverSectionFrame.create({id:fresh('frame')},[...(role==='sectionTitle'?[element]:[]),manualSchema.nodes.coverBody.create({id:fresh('body')},body)]);
  const cover=manualSchema.nodes.cover.create(surface.node.attrs,[...(role==='sectionTitle'?[]:[element]),frame],surface.node.marks);
  tr.replaceWith(surface.pos,surface.pos+surface.node.nodeSize,cover);
 }else if(role==='sectionTitle'){
  let position=null;surface.node.descendants((node,offset)=>{if(node.type.name==='coverBody')position=surface.pos+1+offset;});
  if(position===null)return false;tr.insert(position,element);
 }else{
  const rank=MANUAL_COVER_ELEMENT_ROLES.indexOf(role);let position=surface.pos+1;
  for(const child of children(surface.node)){if(child.type.name==='coverSectionFrame'||coverRole(child)&&MANUAL_COVER_ELEMENT_ROLES.indexOf(coverRole(child).role)>rank)break;position+=child.nodeSize;}
  tr.insert(position,element);
 }
 const inserted=findManualObject({doc:tr.doc},element.attrs.id);if(!inserted)return false;
 const provenance=[];
 if(status.convertsPage)for(const pageId of status.pageIds.slice(1)){
  const tail=findManualObject({doc:tr.doc},pageId),content=[];if(!tail)return false;
  for(const child of children(tail.node)){
   const marker=manualPageRole(child);
   if(marker?.role==='title'&&marker.derivedFrom===status.coverId){provenance.push({id:child.attrs.id,type:child.type.name,reason:'cover-conversion:derived-title',attrs:structuredClone(child.attrs),content:child.content.toJSON()});const next=manualContinuationTitle(findManualObject({doc:tr.doc},status.coverId).node,pageId,{id:child.attrs.id});if(next)content.push(next);}
   else content.push(ordinaryManualPageField(child));
  }
  tr.replaceWith(tail.pos,tail.pos+tail.node.nodeSize,tail.node.copy(Fragment.fromArray(content)));
 }
 const liveCover=findManualObject({doc:tr.doc},status.coverId);tr.setNodeMarkup(liveCover.pos,undefined,{...liveCover.node.attrs,meta:withManualCoverFlowProvenance(liveCover.node.attrs.meta,{coverId:status.coverId,records:provenance})},liveCover.node.marks);
 const selected=findManualObject({doc:tr.doc},element.attrs.id);
 tr.setSelection(role==='logo'||role==='divider'?NodeSelection.create(tr.doc,selected.pos):Selection.findFrom(tr.doc.resolve(selected.pos+1),1,true));
 tr.setStoredMarks(state.storedMarks);tr.doc.check();dispatch(tr.setMeta('manualCoverInsert',{coverId:status.coverId,role,convertsPage:status.convertsPage}).scrollIntoView());return true;
};
const para=()=>({type:'paragraph',id:newManualId(),content:[]});
const step=()=>({id:newManualId(),title:[],blocks:[para()]});
function blankBlock(type,options={}){
 const id=newManualId();switch(type){
  case 'paragraph':return {...para(),...options};case 'heading':return {type,id,level:3,content:[],...options};
  case 'todo':return {type,id,checked:false,content:[],...options};case 'toggle':return {type,id,open:true,title:[],blocks:[para()],...options};case 'divider':return {type,id,...options};case 'codeBlock':return {type,id,language:'',text:'',...options};
  case 'list':return {type,id,ordered:false,items:[{id:newManualId(),blocks:[para()]}],...options};
  case 'procedure':return {type,id,start:1,steps:[step()],...options};
  case 'figure':return {type,id,asset:'',alt:'',caption:[],widthPreset:'full',...options,caption:typeof options.caption==='string'?plainInline(options.caption):options.caption||[]};
  case 'callout':return {type,id,title:[],tone:'signal',blocks:[para()],...options};
  case 'quote':return {type,id,blocks:[para()],...options};
  case 'mediaGroup':return {type,id,layout:'stacked',figure:blankBlock('figure'),blocks:[para()],...options};
  case 'table':{const columns=options.columns??2,rows=options.rows??2;if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<0||columns>50||rows>100)throw new TypeError('표 크기가 올바르지 않습니다.');const cells=()=>Array.from({length:columns},()=>({id:newManualId(),content:[]}));return {type,id,label:options.label||'',headers:cells(),rows:Array.from({length:rows},cells)};}
  default:throw new TypeError(`지원하지 않는 삽입 종류: ${type}`);
 }
}
function insertAtSelection(state,node){
 const {$from}=state.selection;
 if(state.selection instanceof NodeSelection){const pos=state.selection.to,$pos=state.doc.resolve(pos);if($pos.parent.canReplaceWith($pos.index(),$pos.index(),node.type))return pos;}
 for(let depth=$from.depth-1;depth>0;depth--){const parent=$from.node(depth),index=$from.index(depth);if(parent.canReplaceWith(index+1,index+1,node.type))return $from.posAtIndex(index+1,depth);}
 return null;
}
const insertParagraphInParent=(parent,index)=>(state,dispatch)=>{
 if(!parent||parent.pos<0||!Number.isInteger(index)||index<0||index>parent.node.childCount)return false;
 let pos=parent.pos+1;for(let i=0;i<index;i++)pos+=parent.node.child(i).nodeSize;
 const next=parent.node.maybeChild(index);
 if(next?.type.name==='paragraph'){if(dispatch)dispatch(state.tr.setSelection(TextSelection.create(state.doc,pos+1)).scrollIntoView());return true;}
 if(!parent.node.canReplaceWith(index,index,manualSchema.nodes.paragraph))return false;
 if(dispatch){const tr=state.tr.insert(pos,blockToNode(para()));tr.setSelection(TextSelection.create(tr.doc,pos+1));dispatch(tr.scrollIntoView());}return true;
};
export const insertParagraphAtGap=(parentId,index)=>guarded((state,dispatch)=>insertParagraphInParent(coverBodyTarget(findManualObject(state,parentId)),index)(state,dispatch));
export const ensureParagraphAfter=id=>guarded((state,dispatch)=>{
 const found=findManualObject(state,id);if(!found||found.pos<0)return false;
 if(['page','cover'].includes(found.node.type.name)){
  const target=coverBodyTarget(found),last=target.node.lastChild;
  if(last?.type.name==='paragraph'){if(dispatch)dispatch(state.tr.setSelection(TextSelection.create(state.doc,target.pos+target.node.nodeSize-2)).scrollIntoView());return true;}
  return insertParagraphInParent(target,target.node.childCount)(state,dispatch);
 }
 return insertParagraphInParent(parentObject(state,found),found.index+1)(state,dispatch);
});
const exitContainer=(state,dispatch)=>{
 const current=state.selection instanceof NodeSelection?{node:state.selection.node,pos:state.selection.from}:['callout','quote','figure','table','toggle','codeBlock'].map(type=>ancestry(state,type)).filter(Boolean).sort((a,b)=>b.pos-a.pos)[0];
 if(!current||!['callout','quote','figure','table','toggle','codeBlock','divider'].includes(current.node.type.name))return false;
 return ensureParagraphAfter(current.node.attrs.id)(state,dispatch);
};
const arrowOut=(state,dispatch,view)=>{
 if(state.selection.$from.parent.type.name==='tableCell')return false;
 if(!state.selection.empty)return false;
 const current=['callout','quote','figure','table','toggle','codeBlock'].map(type=>ancestry(state,type)).filter(Boolean).sort((a,b)=>b.pos-a.pos)[0];if(!current)return false;
 const end=Selection.findFrom(state.doc.resolve(current.pos+current.node.nodeSize-1),-1,true);
 if(state.selection.from!==end?.from||view&&!view.endOfTextblock('down'))return false;
 return exitContainer(state,dispatch);
};
export const insertManualBlock=(type,options={})=>guarded((state,dispatch)=>{
 if(type==='step')return appendManualStep()(state,dispatch);
 let node,pos;
 if(type==='page'){const page={id:newManualId(),title:typeof options.title==='string'?plainInline(options.title):options.title||[],blocks:[para()]};node=make('page',page,projectManualPage(page).blocks.map(blockToNode),['title','blocks']);const current=state.selection instanceof NodeSelection&&['page','cover'].includes(state.selection.node.type.name)?{node:state.selection.node,pos:state.selection.from}:ancestry(state,'page');pos=current?current.pos+current.node.nodeSize:state.doc.content.size;}
 else{let block;try{block=blankBlock(type,options);validateManualDocument({schemaVersion:2,id:newManualId(),title:'',pages:[{id:newManualId(),title:[],blocks:[block]}]});}catch{return false;}node=blockToNode(block);pos=insertAtSelection(state,node);}
 if(pos===null)return false;
 if(dispatch){const tr=state.tr.insert(pos,node);tr.setSelection(Selection.findFrom(tr.doc.resolve(pos+1),1,true)||NodeSelection.create(tr.doc,pos));dispatch(tr.scrollIntoView());}return true;
});
export const appendManualStep=id=>guarded((state,dispatch)=>{
 const current=id?findManualObject(state,id):ancestry(state,'step')||ancestry(state,'procedure');if(!current)return false;
 let pos;if(current.node.type.name==='step')pos=current.pos+current.node.nodeSize;else if(current.node.type.name==='procedure')pos=current.pos+current.node.nodeSize-1;else return false;
 if(dispatch){const s=step(),node=make('step',s,[manualSchema.nodes.stepTitle.create(),blockToNode(s.blocks[0])],['title','blocks']);const tr=state.tr.insert(pos,node);tr.setSelection(TextSelection.create(tr.doc,pos+2));dispatch(tr.scrollIntoView());}return true;
});
export const updateManualObject=(id,patch,{remove=[]}={})=>guarded((state,dispatch)=>{
 const found=findManualObject(state,id);if(!found||manualPageRole(found.node)?.derivedFrom)return false;
 const updateTr=()=>found.node.type.name==='figure'&&Object.hasOwn(patch,'widthPreset')?closeHistory(state.tr):state.tr;
 if(['id','type','schemaVersion','pages','blocks','steps','items','headers','rows','figure'].some(k=>Object.hasOwn(patch,k)))return false;
 // Validate a detached domain snapshot before changing either attributes or editable inline fields.
 const document=documentFromState(state);let target;
 const visit=value=>{if(!value||typeof value!=='object')return;if(value.id===id)target=value;for(const [key,child]of Object.entries(value))if(key!=='extensions'&&child&&typeof child==='object')Array.isArray(child)?child.forEach(visit):visit(child);};visit(document);
 if(!Array.isArray(remove)||remove.some(key=>!['crop','previewTitle','lead','lang','sectionTitle','logo'].includes(key)))return false;
 const controlAttributeOnly=found.node.type.name==='todo'&&!remove.length&&Object.keys(patch).length===1&&Object.hasOwn(patch,'checked')&&typeof patch.checked==='boolean';
 const attributesTr=updated=>{
  const unchanged=updated.type===found.node.type&&updated.attrs.id===found.node.attrs.id&&updated.content.eq(found.node.content)&&updated.marks.length===found.node.marks.length&&updated.marks.every((mark,index)=>mark.eq(found.node.marks[index]));
  // A boolean control changes only metadata. AttrStep's empty map keeps both
  // preceding and following typing out of this explicit action's history event.
  return controlAttributeOnly&&unchanged?updateTr().setNodeAttribute(found.pos,'meta',updated.attrs.meta):updateTr().setNodeMarkup(found.pos,undefined,updated.attrs,updated.marks);
 };
 if(!target){
  let block,updated;try{
   if(found.node.type.name==='tableCell'){block={...info(found.node),content:readInline(found.node)};for(const key of remove)delete block[key];Object.assign(block,structuredClone(patch));validateManualDocument({schemaVersion:2,id:newManualId(),title:'',pages:[{id:newManualId(),title:[],blocks:[{id:newManualId(),type:'table',label:'',headers:[block],rows:[]}]}]});updated=make('tableCell',block,textNodes(block.content),['content']);}
   else{block=nodeToBlock(found.node);for(const key of remove)delete block[key];Object.assign(block,structuredClone(patch));if(block.type==='figure'&&Object.hasOwn(patch,'widthPreset'))block=withoutManualFigureWidth(block);if(coverRole(found.node)?.role==='title'&&block.level!==1)block=withoutManualCoverRole(block);validateManualDocument({schemaVersion:2,id:newManualId(),title:'',pages:[{id:newManualId(),title:[],blocks:[block]}]});updated=blockToNode(block);}
  }catch{return false;}
  if(dispatch){const same=updated.type===found.node.type&&updated.content.eq(found.node.content),tr=same?attributesTr(updated):updateTr().replaceWith(found.pos,found.pos+found.node.nodeSize,updated);if(same){tr.setSelection(Selection.fromJSON(tr.doc,state.selection.toJSON()));tr.setStoredMarks(state.storedMarks);}dispatch(tr.scrollIntoView());}return true;
 }
 for(const key of remove)delete target[key];Object.assign(target,structuredClone(patch));if(target.type==='figure'&&Object.hasOwn(patch,'widthPreset')){const clean=withoutManualFigureWidth(target);if(Object.hasOwn(clean,'extensions'))target.extensions=clean.extensions;else delete target.extensions;}try{validateManualDocument(document);}catch{return false;}
 if(dispatch){const replacement=documentToNode(document);if(found.pos<0)dispatch(updateTr().setDocAttribute('meta',replacement.attrs.meta));else{let updated;replacement.descendants(node=>{if(node.attrs.id===id)updated=node;});const stableContent=updated.content.eq(found.node.content),tr=stableContent?attributesTr(updated):updateTr().replaceWith(found.pos,found.pos+found.node.nodeSize,updated);if(stableContent){tr.setSelection(Selection.fromJSON(tr.doc,state.selection.toJSON()));tr.setStoredMarks(state.storedMarks);}if(found.node.type.name==='toggle'&&patch.open===false&&state.selection.from>found.pos&&state.selection.to<found.pos+found.node.nodeSize)tr.setSelection(TextSelection.create(tr.doc,found.pos+2));dispatch(tr.scrollIntoView());}}return true;
});
export const deleteManualObject=id=>guarded((state,dispatch)=>{
 const found=findManualObject(state,id);if(!found||found.pos<0)return false;
 if(manualPageRole(found.node)?.derivedFrom)return false;
 const {node,pos,parent,index}=found;if(['page','cover'].includes(node.type.name)&&state.doc.childCount===1)return false;
 const removable=parent.canReplace(index,index+1),requiredParagraph=!removable&&node.type.name==='paragraph'&&['listItem','quote'].includes(parent.type.name)&&parent.canReplaceWith(index,index+1,node.type);
 let removeFrom=pos,removeTo=pos+node.nodeSize,removeParent=parent,removeIndex=index,replacement=null;
 if(!removable){
  if(requiredParagraph){if(!node.content.size)return false;replacement=node.copy(Fragment.empty);}
  else if(node.type.name==='listItem'&&['bulletList','orderedList'].includes(parent.type.name)&&parent.childCount===1){
   const $pos=state.doc.resolve(pos),depth=$pos.depth;if(depth<1)return false;
   removeFrom=$pos.before(depth);removeTo=removeFrom+parent.nodeSize;removeParent=$pos.node(depth-1);removeIndex=$pos.index(depth-1);
   if(!removeParent.canReplace(removeIndex,removeIndex+1)||['page','coverBody'].includes(removeParent.type.name)&&children(removeParent).every((child,i)=>i===removeIndex||['pageTitle','pageLead'].includes(child.type.name))){replacement=blockToNode(para());if(!removeParent.canReplaceWith(removeIndex,removeIndex+1,replacement.type))return false;}
  }else return false;
 }
 if(dispatch){const tr=closeHistory(state.tr);
  if(replacement){tr.replaceWith(removeFrom,removeTo,replacement);tr.setSelection(TextSelection.create(tr.doc,removeFrom+1)).setStoredMarks(state.storedMarks);}
  else{tr.delete(removeFrom,removeTo);if(removeParent.type.name==='page'&&removeParent.childCount===1){tr.insert(removeFrom,blockToNode(para()));tr.setSelection(TextSelection.create(tr.doc,removeFrom+1));}}
  tr.setMeta('manualExplicitDelete',true);dispatch(tr.scrollIntoView());}return true;
});
const deleteEmptyCalloutAtStart=(state,dispatch)=>{
 const {selection}=state,{$from}=selection;
 if(!(selection instanceof TextSelection)||!selection.empty||$from.parent.type.name!=='calloutTitle'||$from.parentOffset!==0||$from.parent.content.size)return false;
 const current=$from.node($from.depth-1);
 // Empty image or nested structure placeholders still carry their own content and identity.
 if(current.type.name!=='callout'||!children(current).slice(1).every(node=>node.type.name==='paragraph'&&!node.content.size))return false;
 const found=findManualObject(state,current.attrs.id);if(!found||!deleteManualObject(current.attrs.id)(state))return false;
 if(!dispatch)return true;
 const previous=found.parent.maybeChild(found.index-1),combined=closeHistory(state.tr);let working=state;
 const collect=tr=>{for(const step of tr.steps)combined.step(step);if(tr.getMeta('manualExplicitDelete'))combined.setMeta('manualExplicitDelete',true);working=working.apply(tr);};
 deleteManualObject(current.attrs.id)(working,collect);
 const caret=previous?.type.spec.group&&!['pageTitle','pageLead'].includes(previous.type.name)?Selection.findFrom(working.doc.resolve(found.pos),-1,true):null;
 if(caret&&caret.from>=found.pos-previous.nodeSize)working=working.apply(working.tr.setSelection(caret));
 else if(!insertParagraphInParent(parentObject(state,found),found.index)(working,collect))return false;
 combined.setSelection(Selection.fromJSON(combined.doc,working.selection.toJSON()));combined.setStoredMarks(state.storedMarks);
 combined.setMeta(manualCalloutFocusKey,{editingId:null,deletedTitleId:current.attrs.id});dispatch(combined.scrollIntoView());return true;
};
function reidentify(node){return copyManualNodes([node])[0];}
export const duplicateManualObject=id=>guarded((state,dispatch)=>{const found=findManualObject(state,id);if(!found||found.pos<0||found.node.type.name==='cover'||manualPageRole(found.node)?.derivedFrom||!found.parent.canReplaceWith(found.index+1,found.index+1,found.node.type))return false;if(dispatch){const pos=found.pos+found.node.nodeSize,tr=closeHistory(state.tr).insert(pos,reidentify(found.node));tr.setSelection(NodeSelection.create(tr.doc,pos));dispatch(tr.scrollIntoView());}return true;});
export const moveManualObject=(id,target)=>guarded((state,dispatch)=>{
 const found=findManualObject(state,id);if(!found||found.pos<0||manualPageRole(found.node)?.derivedFrom)return false;
 let destination,index;
 if(target.direction){destination={node:found.parent,pos:found.pos-state.doc.resolve(found.pos).parentOffset-1};index=found.index+(target.direction==='up'?-1:2);}
 else{const parent=findManualObject(state,target.parentId);if(target.coverHeader===true&&parent?.node.type.name!=='cover')return false;destination=target.coverHeader===true?parent:coverBodyTarget(parent);index=target.index;
  if(destination&&['cover','coverSectionFrame'].includes(destination.node.type.name)&&index===destination.node.childCount)index--;
 }
 if(!destination||!Number.isInteger(index)||index<0||index>destination.node.childCount)return false;
 let pos=destination.pos+1;for(let i=0;i<index;i++)pos+=destination.node.child(i).nodeSize;
 if(pos>=found.pos&&pos<=found.pos+found.node.nodeSize)return false;
 if(!found.parent.canReplace(found.index,found.index+1)||!destination.node.canReplaceWith(index,index,found.node.type))return false;
 if(dispatch){const tr=closeHistory(state.tr).delete(found.pos,found.pos+found.node.nodeSize),at=tr.mapping.map(pos);let moved=manualPageRole(found.node)&&destination.node.attrs.id!==manualPageRole(found.node).pageId?ordinaryManualPageField(found.node):found.node;if(coverRole(moved)&&coverIdAt(state.doc,destination.pos+1)!==coverRole(moved).coverId)moved=moved.type.create({...moved.attrs,meta:withoutManualCoverRole(moved.attrs.meta)},moved.content,moved.marks);tr.insert(at,moved);tr.setSelection(NodeSelection.create(tr.doc,at));dispatch(tr.scrollIntoView());}return true;
});
export const addManualTableRow=id=>guarded((state,dispatch,view)=>{const found=id?findManualObject(state,id):ancestry(state,'table');if(!found||found.node.type.name!=='table')return false;if(hasMergedManualCoverTable(found.node))return normalizeManualCoverTableCommand(state,dispatch,view,found.node.attrs.id,(inner,send)=>addManualTableRow(found.node.attrs.id)(inner,send,view));if(dispatch){const row=manualSchema.nodes.tableRow.create(null,Array.from({length:found.node.firstChild.childCount},(_,index)=>{const weight=readManualTableCellLayout(found.node.firstChild.child(index).attrs.meta?.extensions)?.columnWeight;return manualSchema.nodes.tableCell.create({id:newManualId(),meta:weight===undefined?{}:withManualTableCellLayout({}, {columnWeight:weight})});}));const pos=found.pos+found.node.nodeSize-1,tr=state.tr.insert(pos,row);tr.setSelection(TextSelection.create(tr.doc,pos+2));dispatch(tr.scrollIntoView());}return true;});
function manualTableDeleteCellCoordinates(state,table){
 const cellId=state.selection.headCellId||state.selection.$head.parent.type.name==='tableCell'&&state.selection.$head.parent.attrs.id;
 let result=null;table.forEach((row,_offset,rowIndex)=>{let column=0;row.forEach((cell,_offset,physicalIndex)=>{if(cell.attrs.id===cellId)result={row:rowIndex,column,physicalIndex,cellId};column+=cell.attrs.colspan;});});return result;
}
function manualTableCellAtColumn(row,column){
 let at=0,result=row.lastChild;row.forEach(cell=>{if(column>=at&&column<at+cell.attrs.colspan)result=cell;at+=cell.attrs.colspan;});return result;
}
function setManualTableDeleteCaret(tr,cellId,storedMarks){
 let pos=null;tr.doc.descendants((node,at)=>{if(node.type.name==='tableCell'&&node.attrs.id===cellId)pos=at;});
 if(pos!==null)tr.setSelection(TextSelection.create(tr.doc,pos+1)).setStoredMarks(storedMarks);
 return tr;
}
export const deleteManualTableRow=(id,index)=>guarded((state,dispatch,view)=>{
 const found=findManualObject(state,id);if(view?.editable===false||!found||found.node.type.name!=='table'||!Number.isInteger(index)||index<0||index>=found.node.childCount-1)return false;
 if(hasMergedManualCoverTable(found.node))return normalizeManualCoverTableCommand(state,dispatch,view,id,(inner,send)=>deleteManualTableRow(id,index)(inner,send,view));
 const deletedRow=index+1,coordinates=manualTableDeleteCellCoordinates(state,found.node),survivingRow=found.node.child(coordinates&&coordinates.row!==deletedRow?coordinates.row:deletedRow+1<found.node.childCount?deletedRow+1:deletedRow-1),cellId=coordinates&&coordinates.row!==deletedRow?coordinates.cellId:manualTableCellAtColumn(survivingRow,coordinates?.column??0).attrs.id;
 let pos=found.pos+1;for(let i=0;i<=index;i++)pos+=found.node.child(i).nodeSize;
 if(dispatch){const tr=state.tr.delete(pos,pos+found.node.child(deletedRow).nodeSize);dispatch(setManualTableDeleteCaret(tr,cellId,state.storedMarks).scrollIntoView());}return true;
});
export const addManualTableColumn=id=>guarded((state,dispatch,view)=>{
 const found=id?findManualObject(state,id):ancestry(state,'table');if(!found||found.node.type.name!=='table')return false;
 if(hasMergedManualCoverTable(found.node))return normalizeManualCoverTableCommand(state,dispatch,view,found.node.attrs.id,(inner,send)=>addManualTableColumn(found.node.attrs.id)(inner,send,view));
 if(dispatch){const positions=[];found.node.forEach((row,offset)=>positions.push({pos:found.pos+1+offset+row.nodeSize-1,layout:readManualTableCellLayout(row.lastChild.attrs.meta?.extensions)}));const tr=state.tr;
  for(const {pos,layout} of positions.toReversed()){const patch={...(layout?.columnWeight!==undefined?{columnWeight:layout.columnWeight}:{}),...(layout?.rowMinHeightPx!==undefined?{rowMinHeightPx:layout.rowMinHeightPx}:{})};tr.insert(pos,manualSchema.nodes.tableCell.create({id:newManualId(),meta:Object.keys(patch).length?withManualTableCellLayout({},patch):{}}));}
  tr.setSelection(TextSelection.create(tr.doc,positions[0].pos+1));dispatch(tr.scrollIntoView());
 }return true;
});
export const deleteManualTableColumn=(id,index)=>guarded((state,dispatch,view)=>{
 const found=findManualObject(state,id);if(view?.editable===false||!found||found.node.type.name!=='table'||!Number.isInteger(index)||index<0)return false;
 if(hasMergedManualCoverTable(found.node))return normalizeManualCoverTableCommand(state,dispatch,view,id,(inner,send)=>deleteManualTableColumn(id,index)(inner,send,view));
 if(index>=found.node.firstChild.childCount||found.node.firstChild.childCount===1)return false;
 if(dispatch){const coordinates=manualTableDeleteCellCoordinates(state,found.node),row=found.node.child(coordinates?.row??0),cellId=row.child(coordinates&&coordinates.physicalIndex!==index?coordinates.physicalIndex:index+1<row.childCount?index+1:index-1).attrs.id;const ranges=[];found.node.forEach((row,offset)=>{let pos=found.pos+2+offset;for(let i=0;i<index;i++)pos+=row.child(i).nodeSize;ranges.push({pos,size:row.child(index).nodeSize});});const tr=state.tr;for(const {pos,size}of ranges.toReversed())tr.delete(pos,pos+size);dispatch(setManualTableDeleteCaret(tr,cellId,state.storedMarks).scrollIntoView());}return true;
});
function editableSelection(state){
 // AllSelection spanning page wrappers becomes a range inside one page only.
 if(!(state.selection instanceof AllSelection))return state;
 const pages=children(state.doc).filter(n=>n.type.name==='page');if(pages.length!==1||children(state.doc).some(node=>node.type.name==='cover'))return null;
 const page=pages[0],parts=children(page).filter(n=>!['pageTitle','pageLead'].includes(n.type.name));if(!parts.length)return null;
 const start=manualPageParts(page,0).blocks[0]?.pos??1;
 const first=Selection.findFrom(state.doc.resolve(start),1,true),last=Selection.findFrom(state.doc.resolve(page.nodeSize-1),-1,true);
 return first&&last?state.apply(state.tr.setSelection(TextSelection.create(state.doc,first.from,last.to))):null;
}
const blockCommand=command=>contiguousOnly((state,dispatch,view)=>{const normalized=editableSelection(state);if(!normalized)return false;if(normalized===state)return command(state,dispatch,view);return command(normalized,dispatch?tr=>{const combined=state.tr;for(const step of tr.steps)combined.step(step);combined.setSelection(new AllSelection(combined.doc));dispatch(combined.scrollIntoView());}:undefined,view);});
const preservingBlockType=(type,options={})=>(state,dispatch)=>{
 const changes=[];state.doc.nodesBetween(state.selection.from,state.selection.to,(node,pos)=>{
  if(!['paragraph','heading','todo','codeBlock','pageTitle','pageLead'].includes(node.type.name)||node.type===type&&Object.entries(options).every(([key,value])=>node.attrs[key]===value))return;
  if(manualPageRole(node)?.derivedFrom)return;
  const at=state.doc.resolve(pos);if(at.parent.canReplaceWith(at.index(),at.index()+1,type))changes.push({pos,node});
 });
 if(!changes.length)return false;
 if(dispatch){const tr=closeHistory(state.tr);for(const {pos,node}of changes.toReversed()){const clean=withoutManualPageRole(withoutManualCoverRole(node.attrs.meta)),meta={...(clean.extensions?{extensions:clean.extensions}:{}),...(type.name==='todo'?{checked:node.attrs.meta.checked??false}:{}),...(type.name==='codeBlock'?{language:node.attrs.meta.language??''}:{})};const codeText=node.textBetween(0,node.content.size,'','\n');const content=type.name==='codeBlock'?(codeText?manualSchema.text(codeText):null):node.type.name==='codeBlock'?textNodes(plainInline(node.textContent)):node.content;tr.replaceWith(pos,pos+node.nodeSize,type.create({id:node.attrs.id,meta,...options},content));}tr.setSelection(Selection.fromJSON(tr.doc,state.selection.toJSON()));dispatch(tr.scrollIntoView());}return true;
};
const changeTextBlock=(type,options={})=>blockCommand((state,dispatch)=>{
 const {$from,$to}=state.selection;if(!['paragraph','heading','todo','codeBlock','pageTitle','pageLead'].includes($from.parent.type.name)||!['paragraph','heading','todo','codeBlock','pageTitle','pageLead'].includes($to.parent.type.name))return false;
 const list=ancestry(state,'bulletList')||ancestry(state,'orderedList');
 if(list){if($to.pos>list.pos+list.node.nodeSize-1)return false;let nested=false;list.node.descendants(n=>{if(n.type===manualSchema.nodes.bulletList||n.type===manualSchema.nodes.orderedList)nested=true;});if(nested)return false;let working=state;const combined=state.tr;const collect=tr=>{tr.steps.forEach(step=>combined.step(step));working=working.apply(tr);};if(!liftListItem(manualSchema.nodes.listItem)(working,collect))return false;preservingBlockType(manualSchema.nodes[type],options)(working,collect);if(dispatch){combined.setSelection(Selection.fromJSON(combined.doc,working.selection.toJSON()));dispatch(combined.scrollIntoView());}return true;}
 return preservingBlockType(manualSchema.nodes[type],options)(state,dispatch);
});
const changeList=type=>blockCommand((state,dispatch)=>{const current=ancestry(state,'bulletList')||ancestry(state,'orderedList');if(current){if(state.selection.to>current.pos+current.node.nodeSize-1)return false;if(current.node.type===manualSchema.nodes[type])return liftListItem(manualSchema.nodes.listItem)(state,dispatch);if(dispatch)dispatch(state.tr.setNodeMarkup(current.pos,manualSchema.nodes[type],{...current.node.attrs,meta:{...current.node.attrs.meta,...(type==='orderedList'?{start:1}:{})}}));return true;}if(['pageTitle','pageLead'].includes(state.selection.$from.parent.type.name)){let working=state;const combined=closeHistory(state.tr),collect=tr=>{tr.steps.forEach(step=>combined.step(step));working=working.apply(tr);};if(!changeTextBlock('paragraph')(working,collect))return false;if(!wrapInList(manualSchema.nodes[type],{id:newManualId(),meta:type==='orderedList'?{start:1}:{}})(working,collect))return false;if(dispatch){combined.setSelection(Selection.fromJSON(combined.doc,working.selection.toJSON()));dispatch(combined.scrollIntoView());}return true;}if(!['paragraph','heading'].includes(state.selection.$from.parent.type.name))return false;return wrapInList(manualSchema.nodes[type],{id:newManualId(),meta:type==='orderedList'?{start:1}:{}})(state,dispatch);});
const enterSpecial=(state,dispatch)=>{
 const {$from}=state.selection,name=$from.parent.type.name;
 if(state.selection instanceof NodeSelection)return ['pageTitle','pageLead'].includes(state.selection.node.type.name)?ensureParagraphAfter(state.selection.node.attrs.id)(state,dispatch):exitContainer(state,dispatch);
 if(state.selection.empty&&name==='paragraph'&&!$from.parent.content.size){const parent=$from.node($from.depth-1);if(['callout','quote','toggle'].includes(parent.type.name)&&$from.index($from.depth-1)===parent.childCount-1)return exitContainer(state,dispatch);}
 if(coverRole($from.parent)?.role==='title'){
  const current={node:$from.parent,pos:$from.before(),parent:$from.node($from.depth-1),index:$from.index($from.depth-1)};
  return ensureParagraphAfter(current.node.attrs.id)(state,dispatch);
 }
 if(name==='todo'){if(!$from.parent.content.size)return changeTextBlock('paragraph')(state,dispatch);const tr=state.tr.deleteSelection(),pos=tr.selection.from,types=[{type:manualSchema.nodes.todo,attrs:{id:newManualId(),meta:{checked:false}}}];if(!canSplit(tr.doc,pos,1,types))return false;if(dispatch){tr.split(pos,1,types);tr.setSelection(TextSelection.create(tr.doc,pos+2));dispatch(tr.scrollIntoView());}return true;}
 if(name==='tableCell'){if(dispatch)dispatch(state.tr.replaceSelectionWith(manualSchema.nodes.hardBreak.create()).scrollIntoView());return true;}
 if(['pageTitle','stepTitle','calloutTitle','coverTitle','figureCaption','toggleTitle'].includes(name)){
  const parent=$from.node($from.depth-1),index=$from.index($from.depth-1),end=$from.after();
  if(name==='figureCaption')return ensureParagraphAfter($from.node($from.depth-1).attrs.id)(state,dispatch);
  if(index+1<parent.childCount){if(dispatch)dispatch(state.tr.setSelection(Selection.findFrom(state.doc.resolve(end),1,true)).scrollIntoView());return true;}
  if(parent.canReplaceWith(index+1,index+1,manualSchema.nodes.paragraph)){if(dispatch){const tr=state.tr.insert(end,blockToNode(para()));tr.setSelection(TextSelection.create(tr.doc,end+1));dispatch(tr.scrollIntoView());}return true;}
 }
 if(coverRole($from.parent)?.role==='sectionTitle'&&state.selection.empty&&$from.parentOffset===$from.parent.content.size){
  const frame=$from.node($from.depth-1),body=frame.lastChild;if(body?.type.name==='coverBody')return insertParagraphInParent(findManualObject(state,body.attrs.id),0)(state,dispatch);
 }
 const current=ancestry(state,'step');if(current&&name==='paragraph'&&!$from.parent.content.size&&state.selection.empty&&$from.after()===current.pos+current.node.nodeSize-1)return appendManualStep(current.node.attrs.id)(state,dispatch);
 return false;
};
// The schema's first block is a pageTitle, so PM's generic splitBlock would
// create a title at paragraph/heading ends. Ordinary text continues as body.
const splitManualTextBlock=(state,dispatch)=>{
 const {selection}=state,{$from,$to}=selection,node=$from.parent;
 if(!(selection instanceof TextSelection)||$from.parent!==$to.parent||!['paragraph','heading','pageLead'].includes(node.type.name)||manualPageRole(node)?.derivedFrom)return false;
 const tr=state.tr.deleteSelection(),at=tr.selection.$from,current=at.parent,parent=at.node(at.depth-1),index=at.index(at.depth-1),paragraph=manualSchema.nodes.paragraph;
 if(!parent.canReplaceWith(index+1,index+1,paragraph))return false;
 if(at.parentOffset===0&&current.content.size){
  if(!parent.canReplaceWith(index,index,paragraph))return false;
  const blank=blockToNode(para());tr.insert(at.before(),blank);tr.setSelection(TextSelection.create(tr.doc,at.before()+blank.nodeSize+1));
 }else{
  const end=at.parentOffset===current.content.size,type=end||current.type.name==='pageLead'?paragraph:current.type;
  const attributes={...(type===current.type?current.attrs:{}),id:newManualId(),meta:end?{}:withoutManualPageRole(withoutManualCoverRole(current.attrs.meta))},types=[{type,attrs:attributes}];
  if(!canSplit(tr.doc,at.pos,1,types))return false;
  tr.split(at.pos,1,types);tr.setSelection(TextSelection.create(tr.doc,at.pos+2));
 }
 if(dispatch)dispatch(tr.scrollIntoView());return true;
};
const tableTab=back=>guarded((state,dispatch)=>{const table=ancestry(state,'table');if(!table||state.selection.$from.parent.type.name!=='tableCell')return false;const cells=[];table.node.descendants((node,pos)=>{if(node.type.name==='tableCell')cells.push(table.pos+1+pos+1);});const at=cells.indexOf(state.selection.$from.start()),next=cells[at+(back?-1:1)];if(next===undefined)return back?false:addManualTableRow(table.node.attrs.id)(state,dispatch);if(dispatch)dispatch(state.tr.setSelection(TextSelection.create(state.doc,next)).scrollIntoView());return true;});
function caretLinkRange(selection,mark){
 const {$from}=selection,active=mark.isInSet($from.marks());if(!active)return null;
 const segments=[];$from.parent.forEach((node,offset)=>segments.push({node,from:offset,to:offset+node.nodeSize}));
 let index=segments.findIndex(part=>part.from<=$from.parentOffset&&part.to>$from.parentOffset&&active.isInSet(part.node.marks));
 if(index<0)index=segments.findIndex(part=>part.to===$from.parentOffset&&active.isInSet(part.node.marks));
 if(index<0)return null;
 let left=index,right=index;
 while(left>0&&active.isInSet(segments[left-1].node.marks))left--;
 while(right+1<segments.length&&active.isInSet(segments[right+1].node.marks))right++;
 return {from:$from.start()+segments[left].from,to:$from.start()+segments[right].to};
}
export const setManualLink=href=>{
 if(href!==null&&!isPrototypeLinkSafe(href))throw new TypeError('안전한 링크 주소가 필요합니다.');
 return guarded((state,dispatch)=>{
  const {selection}=state,mark=manualSchema.marks.link;
  if(!toggleMark(mark)(state))return false;
  const ranges=selection.empty?[caretLinkRange(selection,mark)].filter(Boolean):selection.ranges.map(range=>({from:range.$from.pos,to:range.$to.pos}));
  if(dispatch){const tr=state.tr;
   for(const range of ranges){tr.removeMark(range.from,range.to,mark);if(href!==null)tr.addMark(range.from,range.to,mark.create({href}));}
   if(selection.empty)href===null?tr.removeStoredMark(mark):tr.addStoredMark(mark.create({href}));
   dispatch(tr);
  }return true;
 });
};
function pageSelectionRanges(state){
 if(state.selection.manualPaginationTextSelection)return state.selection.ranges.map(range=>({from:range.$from.pos,to:range.$to.pos}));
 if(state.selection.empty||state.selection.manualBlockSelection)return [];
 const ranges=[];state.doc.forEach((node,pos)=>{if(!['page','cover'].includes(node.type.name))return;const from=Math.max(state.selection.from,pos+1),to=Math.min(state.selection.to,pos+node.nodeSize-1);if(from>=to)return;
  const title=node.type.name==='cover'?findManualCoverRole(state,node.attrs.id,'title'):null;
  if(title&&from<title.pos+title.node.nodeSize&&to>title.pos){for(const range of [{from,to:Math.min(to,title.pos)},{from:Math.max(from,title.pos+1),to:Math.min(to,title.pos+title.node.nodeSize-1)},{from:Math.max(from,title.pos+title.node.nodeSize),to}])if(range.from<range.to)ranges.push(range);}
  else ranges.push({from,to});
 });
 return ranges.length>1||state.selection instanceof AllSelection?ranges:[];
}
export const replaceManualSelection=text=>guarded((state,dispatch)=>{
 const ranges=pageSelectionRanges(state);if(!ranges.length)return false;
 if(dispatch){const tr=state.tr;for(const {from,to}of ranges.toReversed())tr.delete(from,to);
  const at=tr.mapping.map(ranges[0].from,1),selection=Selection.findFrom(tr.doc.resolve(at),1,true)||Selection.atStart(tr.doc);tr.setSelection(selection);
  if(typeof text==='string'){if(text)tr.insertText(text);}else if(text)tr.replaceSelection(text);dispatch(tr.scrollIntoView());
 }return true;
});
const deletePageSelection=replaceManualSelection('');
export const setManualHeading=level=>{if(![1,2,3].includes(level))throw new TypeError('제목 단계는 1–3입니다.');return changeTextBlock('heading',{level});};
const codeIndent=back=>guarded((state,dispatch)=>{
 if(state.selection.manualSparseBlockSelection)return false;
 const {$from}=state.selection;if($from.parent.type.name!=='codeBlock')return false;
 if(back){const before=$from.parent.textBetween(Math.max(0,$from.parentOffset-2),$from.parentOffset);const count=before.endsWith('  ')?2:before.endsWith('\t')?1:0;if(!count)return false;if(dispatch)dispatch(state.tr.delete(state.selection.from-count,state.selection.from));}
 else if(dispatch)dispatch(state.tr.insertText('  '));return true;
});
const outdentStep=guarded((state,dispatch)=>{
 const {selection}=state;if(!selection.empty||selection.$from.parent.type.name!=='stepTitle')return false;
 const current=ancestry(state,'step'),procedure=ancestry(state,'procedure');if(!current||!procedure)return false;
 const found=findManualObject(state,procedure.node.attrs.id),steps=children(procedure.node),index=steps.indexOf(current.node);if(!found?.parent||index<0)return false;
 const before=steps.slice(0,index),after=steps.slice(index+1),meta=structuredClone(current.node.attrs.meta);
 if(!before.length&&!after.length){
  const extensions=meta.extensions||{};let key='outdentedProcedure',suffix=2;while(Object.hasOwn(extensions,key))key=`outdentedProcedure${suffix++}`;
  extensions[key]=info(procedure.node);meta.extensions=extensions;
 }
 const paragraph=manualSchema.nodes.paragraph.create({id:current.node.attrs.id,meta},current.node.firstChild.content),nodes=[];
 if(before.length)nodes.push(procedure.node.type.create(structuredClone(procedure.node.attrs),before));
 nodes.push(paragraph,...children(current.node).slice(1));
 if(after.length){const attributes=structuredClone(procedure.node.attrs);if(before.length)attributes.id=newManualId();attributes.meta.start=(attributes.meta.start??1)+index+1;nodes.push(procedure.node.type.create(attributes,after));}
 if(!found.parent.canReplace(found.index,found.index+1,Fragment.fromArray(nodes)))return false;
 if(dispatch){
  const tr=closeHistory(state.tr).replaceWith(procedure.pos,procedure.pos+procedure.node.nodeSize,nodes),at=procedure.pos+(before.length?nodes[0].nodeSize:0)+1+selection.$from.parentOffset;
  tr.setSelection(TextSelection.create(tr.doc,at));tr.setStoredMarks(state.storedMarks);dispatch(tr.scrollIntoView());
 }return true;
});
const deleteEmptyHeadingAtStart=(state,dispatch,view)=>{
 const {selection}=state,{$from}=selection,node=$from.parent;
 if(view?.composing||view?.editable===false||!(selection instanceof TextSelection)||!selection.empty||node.type.name!=='heading'||$from.parentOffset!==0||node.content.size)return false;
 if(view?.state&&view.state!==state)return true;
 // Cover roles and pagination fragments belong to their structural contracts.
 if(coverRole(node)?.role==='title'){
  // A cover title is a required projection. Backspace leaves it intact and
  // reaches the preceding block instead of trapping the caret in an empty title.
  const depth=$from.depth-1,parent=$from.node(depth),index=$from.index(depth),previous=parent.maybeChild(index-1);
  if(previous&&dispatch){
   const pos=$from.posAtIndex(index-1,depth),selection=previous.isTextblock?TextSelection.create(state.doc,pos+1+previous.content.size):NodeSelection.isSelectable(previous)?NodeSelection.create(state.doc,pos):Selection.findFrom(state.doc.resolve(pos+previous.nodeSize),-1,true);
   if(selection)dispatch(state.tr.setSelection(selection).setStoredMarks(state.storedMarks).scrollIntoView());
  }
  return true;
 }
 if(coverRole(node)||manualPaginationMarker(node.attrs.meta?.extensions,'block'))return true;
 let continued=false;state.doc.descendants(child=>{if(manualPaginationMarker(child.attrs.meta?.extensions,'block')?.rootBlockId===node.attrs.id)continued=true;});
 if(continued)return true;
 const depth=$from.depth-1,parent=$from.node(depth),index=$from.index(depth),paragraph=manualSchema.nodes.paragraph;
 if(!parent.canReplaceWith(index,index+1,paragraph))return true;
 if(dispatch){
  const pos=$from.before(),tr=closeHistory(state.tr).setNodeMarkup(pos,paragraph,{id:node.attrs.id,meta:structuredClone(node.attrs.meta)},node.marks);
  tr.setSelection(TextSelection.create(tr.doc,pos+1)).setStoredMarks(state.storedMarks);dispatch(tr.scrollIntoView());
 }
 return true;
};
const deleteEmptyStepAtStart=(state,dispatch,view)=>{
 const {selection}=state,{$from}=selection;
 if(view?.composing||view?.editable===false||!(selection instanceof TextSelection)||!selection.empty||$from.parent.type.name!=='stepTitle'||$from.parentOffset!==0||$from.parent.content.size)return false;
 const current=ancestry(state,'step'),procedure=ancestry(state,'procedure');if(!current||!procedure)return false;
 // A physical empty fragment is not necessarily a logically empty step. Do
 // not detach a pagination root or leave its continuation references orphaned.
 if(manualPaginationMarker(current.node.attrs.meta?.extensions,'block')||manualPaginationMarker(procedure.node.attrs.meta?.extensions,'block'))return false;
 let continued=false;state.doc.descendants(node=>{const marker=manualPaginationMarker(node.attrs.meta?.extensions,'block');if(marker&&(marker.rootBlockId===current.node.attrs.id||marker.rootBlockId===procedure.node.attrs.id))continued=true;});
 return continued?false:outdentStep(state,dispatch,view);
};
const indentList=contiguousOnly(sinkListItem(manualSchema.nodes.listItem)),outdentList=contiguousOnly(liftListItem(manualSchema.nodes.listItem));
const keepListFocus=state=>!!(ancestry(state,'bulletList')||ancestry(state,'orderedList'));
const boundaryBodyTypes=new Set(['paragraph','heading','todo','codeBlock']);
const boundaryTitleTypes=new Set(['pageTitle','pageLead','coverTitle','coverSection','calloutTitle','toggleTitle','stepTitle']);
const boundaryGraphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
function paginationGroup(doc,pageId){
 const groups=[];let group=null;
 doc.forEach(node=>{
  if(node.type.name==='cover'){group=[node];groups.push(group);return;}
  if(node.type.name!=='page'){group=null;return;}
  const marker=manualPaginationMarker(node.attrs.meta.extensions,'page');
  if(!group||marker?.rootPageId!==group[0].attrs.id){group=[];groups.push(group);}
  group.push(node);
 });
 return groups.find(group=>group.some(page=>page.attrs.id===pageId));
}
function pageBoundaryBody(node,back){
 if(boundaryBodyTypes.has(node.type.name))return node;
 // Cells, figures and other atomic/structural barriers are not ordinary paragraphs.
 if(!['page','callout','toggle','quote','procedure','step','bulletList','orderedList','listItem','mediaGroup'].includes(node.type.name))return null;
 const body=children(node).filter(child=>!boundaryTitleTypes.has(child.type.name));
 const edge=back?body[0]:body.at(-1);return edge?pageBoundaryBody(edge,back):null;
}
function protectedTitleBoundary(state,back){
 const {$from}=state.selection,index=$from.index($from.depth-1),parent=$from.node($from.depth-1);
 const adjacent=parent.maybeChild(index+(back?-1:1));
 return adjacent&&(boundaryTitleTypes.has(adjacent.type.name)||coverRole(adjacent)?.role==='title');
}
function preserveJoinedMetadata(left,right){
 const meta=structuredClone(left.attrs.meta);
 // Joining distinct authored paragraphs keeps the surviving ID and the removed
 // block's opaque data as provenance, following the existing outdent contract.
 if(Object.keys(right.attrs.meta||{}).length){
  const extensions=meta.extensions||{};let key='joinedManualBlock',suffix=2;
  while(Object.hasOwn(extensions,key))key=`joinedManualBlock${suffix++}`;
  extensions[key]={...info(right),type:right.type.name};meta.extensions=extensions;
 }
 return meta;
}
function joinBoundaryBodies(state,dispatch,back){
 const {$from}=state.selection,depth=$from.depth-1,parent=$from.node(depth),index=$from.index(depth);
 const left=parent.maybeChild(index+(back?-1:0)),right=parent.maybeChild(index+(back?0:1));
 if(!left||!right||!boundaryBodyTypes.has(left.type.name)||!boundaryBodyTypes.has(right.type.name)||!left.canAppend(right))return false;
 const leftIndex=index+(back?-1:0),pos=$from.posAtIndex(leftIndex,depth),merged=left.type.create({...left.attrs,meta:preserveJoinedMetadata(left,right)},left.content.append(right.content),left.marks);
 if(!parent.canReplaceWith(leftIndex,leftIndex+2,merged.type))return false;
 if(dispatch){const tr=state.tr.replaceWith(pos,pos+left.nodeSize+right.nodeSize,merged);tr.setSelection(TextSelection.create(tr.doc,pos+1+left.content.size));dispatch(tr);}
 return true;
}
function joinOtherBoundaryBodies(state,dispatch,back){
 let candidate=null;
 if(!(back?baseKeymap.Backspace:baseKeymap.Delete)(state,tr=>{candidate=tr;})||!candidate?.docChanged)return false;
 const titles=doc=>{const slots=[];doc.descendants((node,_pos,parent)=>{if(boundaryTitleTypes.has(node.type.name)||coverRole(node)?.role==='title')slots.push([parent.attrs.id,node.type.name,node.toJSON()]);});return JSON.stringify(slots);};
 // Reuse PM's list/body rules only when they neither absorb a title nor remove
 // any inline content. Structural/atomic barriers keep their existing safety.
 if(titles(state.doc)!==titles(candidate.doc)||state.doc.textBetween(0,state.doc.content.size,'','\n')!==candidate.doc.textBetween(0,candidate.doc.content.size,'','\n'))return false;
 const surviving=new Set();candidate.doc.descendants(node=>{if(node.attrs.id)surviving.add(node.attrs.id);});
 const removed=[];state.doc.descendants(node=>{if(node.attrs.id&&!surviving.has(node.attrs.id))removed.push({...info(node),type:node.type.name});});
 const target=candidate.selection.$from.parent;
 if(removed.length&&target.attrs.id){
  const meta=structuredClone(target.attrs.meta),extensions=meta.extensions||{};let key='joinedManualBlocks',suffix=2;
  while(Object.hasOwn(extensions,key))key=`joinedManualBlocks${suffix++}`;
  extensions[key]=removed;meta.extensions=extensions;
  candidate.setNodeMarkup(candidate.selection.$from.before(),undefined,{...target.attrs,meta});
 }
 if(dispatch)dispatch(candidate);return true;
}
// A generated page/title is layout, not a text boundary. At a layout edge, reuse
// the existing lossless pull/merge steps before deleting a logical grapheme or
// joining separate authored paragraphs. UI flow then measures this one edit.
const deleteManualBoundary=back=>(state,dispatch,view)=>{
 const {selection}=state,{$from}=selection;
 // Consume a stale boundary command so the base keymap cannot mutate a
 // document using selection coordinates from an obsolete editor state.
 if(view?.state&&view.state!==state)return true;
 if(view?.composing||view?.editable===false||!(selection instanceof TextSelection)||!selection.empty)return false;
 const edge=back?$from.parentOffset===0:$from.parentOffset===$from.parent.content.size;
 if(!edge)return false;
 if($from.parent.type.name==='tableCell')return true;
 if(!boundaryBodyTypes.has($from.parent.type.name))return false;
 const page=ancestry(state,'page'),group=page&&paginationGroup(state.doc,page.node.attrs.id),pageIndex=group?.findIndex(node=>node.attrs.id===page.node.attrs.id);
 const atPageEdge=page&&pageBoundaryBody(page.node,back)===$from.parent;
 const automaticEdge=atPageEdge&&group?.length>1&&(back?pageIndex>0:pageIndex<group.length-1);
 if(!automaticEdge){
  // An authored page title is an editable block. Empty body Backspace removes
  // its empty predecessor in one edit, without consuming the body or a page.
  // Generated continuation titles remain owned by pagination above.
  const depth=$from.depth-1,parent=$from.node(depth),index=$from.index(depth),previous=parent.maybeChild(index-1),role=manualPageRole(previous);
  if(back&&parent.type.name==='page'&&$from.parent.type.name==='paragraph'&&!$from.parent.content.size&&previous?.type.name==='pageTitle'&&role?.pageId===parent.attrs.id&&!role.derivedFrom){
   const pos=$from.posAtIndex(index-1,depth);
   if(previous.content.size){
    if(dispatch)dispatch(state.tr.setSelection(TextSelection.create(state.doc,pos+1+previous.content.size)).scrollIntoView());
    return true;
   }
   if(!parent.canReplace(index-1,index))return true;
   if(dispatch){
    const tr=closeHistory(state.tr),meta=structuredClone($from.parent.attrs.meta),extensions=meta.extensions||{};let key='removedManualPageTitle',suffix=2;
    while(Object.hasOwn(extensions,key))key=`removedManualPageTitle${suffix++}`;
    extensions[key]={...info(previous),type:previous.type.name};meta.extensions=extensions;
    tr.setNodeMarkup($from.before(),undefined,{...$from.parent.attrs,meta});
    tr.delete(pos,pos+previous.nodeSize);
    tr.setSelection(TextSelection.create(tr.doc,tr.mapping.map(selection.from))).setStoredMarks(state.storedMarks);
    tr.setMeta('manualExplicitDelete',true);dispatch(tr.scrollIntoView());
   }
   return true;
  }
  // Empty first step body is an editable continuation of its title. Keep
  // its identity and metadata, and move the caret without inventing an edit.
  if(back&&parent.type.name==='step'&&$from.parent.type.name==='paragraph'&&!$from.parent.content.size&&previous?.type.name==='stepTitle'){
   const pos=$from.posAtIndex(index-1,depth);
   if(dispatch)dispatch(state.tr.setSelection(TextSelection.create(state.doc,pos+1+previous.content.size)).setStoredMarks(state.storedMarks).scrollIntoView());
   return true;
  }
  if(protectedTitleBoundary(state,back))return true;
  // Ordinary authored bodies use the same lossless join as pagination edges.
  // Keep this edit separate from preceding typing and retain explicit marks.
  return joinBoundaryBodies(state,dispatch?tr=>dispatch(closeHistory(tr).setStoredMarks(state.storedMarks).scrollIntoView()):undefined,back);
 }
 let working=state;const combined=closeHistory(state.tr);
 const collect=tr=>{for(const step of tr.steps)combined.step(step);working=working.apply(tr);};
 const rootId=group[0].attrs.id;
 for(const continuation of group.slice(1)){
  let found=findManualObject(working,continuation.attrs.id);
  while(found){
   const block=children(found.node).find(node=>!['pageTitle','pageLead'].includes(node.type.name));
   const action=block?{type:'pull',pageId:rootId,nextPageId:found.node.attrs.id,blockId:block.attrs.id}:{type:'remove-empty',pageId:found.node.attrs.id};
   const tr=createManualPaginationTransaction(working,{status:'ready',doc:working.doc,action});
   if(!tr)return true;
   collect(tr);found=findManualObject(working,continuation.attrs.id);
  }
 }
 const cursor=working.selection.$from,offset=cursor.parentOffset,text=cursor.parent.textBetween(0,cursor.parent.content.size,'','\n');
 if(!boundaryBodyTypes.has(cursor.parent.type.name)||protectedTitleBoundary(working,back)&&(back?offset===0:offset===cursor.parent.content.size))return true;
 let changed=false;
 if(back?offset>0:offset<cursor.parent.content.size){
  const part=boundaryGraphemes.segment(text).containing(back?offset-1:offset);
  if(!part)return true;
  const from=cursor.start()+part.index,to=from+part.segment.length,tr=working.tr.delete(from,to);
  tr.setSelection(TextSelection.create(tr.doc,from));collect(tr);changed=true;
 }else changed=joinBoundaryBodies(working,collect,back)||joinOtherBoundaryBodies(working,collect,back);
 if(!changed)return true;
 combined.setSelection(Selection.fromJSON(combined.doc,working.selection.toJSON()));combined.setStoredMarks(state.storedMarks);
 combined.setMeta('manualExplicitDelete',true);
 if(dispatch)dispatch(combined.scrollIntoView());return true;
};
export const manualCommands=Object.freeze({
 setDividerStyle:setManualDividerStyle,
 paragraph:changeTextBlock('paragraph'),heading:setManualHeading(3),heading1:setManualHeading(1),heading2:setManualHeading(2),heading3:setManualHeading(3),todo:changeTextBlock('todo'),codeBlock:changeTextBlock('codeBlock'),bulletList:changeList('bulletList'),orderedList:changeList('orderedList'),
 strike:guarded(toggleMark(manualSchema.marks.strike)),underline:guarded(toggleMark(manualSchema.marks.underline)),strong:guarded(toggleMark(manualSchema.marks.strong)),emphasis:guarded(toggleMark(manualSchema.marks.emphasis)),code:guarded(toggleMark(manualSchema.marks.code)),
 undo:guarded(undo),redo:guarded(redo),selectAll:guarded(selectAll),exitBlock:guarded(exitContainer),arrowDown:guarded(chainCommands(manualTableArrowDown,arrowOut)),arrowLeft:guarded(manualTableArrowHorizontal(-1)),arrowRight:guarded(manualTableArrowHorizontal(1)),
 enter:completeSelectionOnly(chainCommands(enterSpecial,splitListItem(manualSchema.nodes.listItem),splitManualTextBlock,baseKeymap.Enter)),
 backspace:completeSelectionOnly(chainCommands(clearManualTableCells,undoDividerRuleFormatting,undoInputRule,deleteEmptyHeadingAtStart,deleteEmptyStepAtStart,deletePageSelection,deleteEmptyCalloutAtStart,deleteEmptyManualBlockAtStart,deleteEmptyManualToggleAtStart,deleteManualToggleTitleBackward,deleteManualBoundary(true),baseKeymap.Backspace)),deleteForward:completeSelectionOnly(chainCommands(clearManualTableCells,deletePageSelection,deleteManualBoundary(false),baseKeymap.Delete)),
 hardBreak:guarded((state,dispatch)=>{if(!state.selection.$from.parent.isTextblock)return false;if(dispatch)dispatch(state.selection.$from.parent.type.name==='codeBlock'?state.tr.insertText('\n').scrollIntoView():state.tr.replaceSelectionWith(manualSchema.nodes.hardBreak.create()).scrollIntoView());return true;}),
 indentList,outdentList,outdentStep,tab:contiguousOnly(chainCommands(codeIndent(false),tableTab(false),indentList,keepListFocus)),shiftTab:contiguousOnly(chainCommands(codeIndent(true),tableTab(true),outdentList,outdentStep,keepListFocus)),
});
export function getManualSlashTrigger(state,{composing=false}={}){
 const {selection}=state,node=selection.$from.parent;if(composing||!selection.empty||!['paragraph','pageLead','heading'].includes(node.type.name)||node.type.name==='heading'&&(coverRole(node)||manualPageRole(node)))return null;
 const from=selection.$from.start(),to=selection.from,typed=selection.$from.parent.textBetween(0,selection.$from.parentOffset,'','\n');
 if(!/^\/[^\n]{0,80}$/.test(typed)||state.doc.rangeHasMark(from,to,manualSchema.marks.link))return null;
 return {from,to,query:typed.slice(1),blockId:selection.$from.parent.attrs.id};
}
function convertWrapper(type,options={}){
 return (state,dispatch)=>{
  const {$from}=state.selection,current=$from.parent;
  if(!['paragraph','heading','todo','codeBlock','pageTitle','pageLead'].includes(current.type.name)||manualPageRole(current)?.derivedFrom)return false;
  const id=current.attrs.id,content=current.type.name==='codeBlock'?plainInline(current.textContent):readInline(current),extensions=withoutManualPageRole(withoutManualCoverRole(current.attrs.meta)).extensions;
  let block;
  if(type==='toggle')block=blankBlock(type,{...options,id,title:content});
  else if(type==='quote'||type==='callout')block=blankBlock(type,{...options,id,blocks:[{type:'paragraph',id:newManualId(),content}]});
  else return false;
  if(extensions)block.extensions=structuredClone(extensions);
  const node=blockToNode(block),pos=$from.before(),parent=$from.node($from.depth-1),index=$from.index($from.depth-1);
  if(!parent.canReplaceWith(index,index+1,node.type))return false;
  if(dispatch){const tr=state.tr.replaceWith(pos,pos+current.nodeSize,node);tr.setSelection(Selection.findFrom(tr.doc.resolve(pos+1),1,true));dispatch(tr);}return true;
 };
}
export const executeManualBlockCommand=(id,{trigger,targetId,attrs:options={},mode,pageId,revision,readOnly,cancelled}={})=>guarded((state,dispatch,view)=>{
 const titleMode=mode==='convert'||mode==='turnInto'?'turnInto':'insert';
 if(id==='pageTitle'&&!getManualPageTitleCommandState(state,{mode:titleMode,pageId,targetId,revision,readOnly,cancelled},view).enabled)return false;
 if(state.selection.manualSparseBlockSelection&&(!targetId||state.selection.ids.includes(targetId))&&['duplicate','delete','moveUp','moveDown','paragraph','heading','heading1','heading2','heading3','todo','codeBlock','bulletList','orderedList','quote','callout','toggle'].includes(id))return false;
 let working=state;const combined=closeHistory(state.tr);
 const collect=tr=>{for(const step of tr.steps)combined.step(step);if(tr.getMeta('manualExplicitDelete'))combined.setMeta('manualExplicitDelete',true);working=working.apply(tr);};
 if(trigger){const live=getManualSlashTrigger(state);if(!live||['from','to','query','blockId'].some(key=>live[key]!==trigger[key]))return false;collect(working.tr.delete(trigger.from,trigger.to));}
 if(targetId&&!selectManualObject(targetId,{text:mode!=='insert'})(working,collect))return false;
 let success=false;
 if(id==='pageTitle')success=applyManualPageTitle({mode:titleMode,pageId,targetId,readOnly,cancelled})(working,collect,view);
 else if(['duplicate','delete','moveUp','moveDown'].includes(id)){
  const target=targetId||working.selection.$from.parent.attrs.id;
  success=(id==='duplicate'?duplicateManualObject(target):id==='delete'?deleteManualObject(target):moveManualObject(target,{direction:id==='moveUp'?'up':'down'}))(working,collect);
 }else if(mode!=='insert'&&manualCommands[id]&&['paragraph','heading','heading1','heading2','heading3','todo','codeBlock','bulletList','orderedList'].includes(id)){
  if(['bulletList','orderedList'].includes(id)&&['heading','todo','codeBlock','pageTitle','pageLead'].includes(working.selection.$from.parent.type.name))manualCommands.paragraph(working,collect);
  success=manualCommands[id](working,collect,view);
  if(success&&id==='codeBlock'&&Object.hasOwn(options,'language'))success=updateManualObject(working.selection.$from.parent.attrs.id,{language:options.language})(working,collect);
  const name=working.selection.$from.parent.type.name;
  if(!success&&(['paragraph','todo','codeBlock'].includes(id)&&name===id||/^heading[123]?$/.test(id)&&name==='heading'))success=true;
 }else if(mode!=='insert'&&['quote','callout','toggle'].includes(id))success=convertWrapper(id,options)(working,collect);
 else{
  const current=working.selection.$from.parent;
  if(id!=='page'&&['paragraph','heading'].includes(current.type.name)&&!coverRole(current)&&!manualPageRole(current)&&!current.content.size&&working.selection.empty){
   const kind=/^heading[123]$/.test(id)?'heading':['bulletList','orderedList'].includes(id)?'list':id;const insertionOptions={...options,...(/^heading[123]$/.test(id)?{level:Number(id.at(-1))}:{}),...(['bulletList','orderedList'].includes(id)?{ordered:id==='orderedList'}:{})};let block;try{block=blankBlock(kind,insertionOptions);validateManualDocument({schemaVersion:2,id:newManualId(),title:'',pages:[{id:newManualId(),title:[],blocks:[block]}]});}catch{return false;}
   block.id=current.attrs.id;if(current.attrs.meta.extensions)block.extensions=structuredClone(current.attrs.meta.extensions);
   const node=blockToNode(block),pos=working.selection.$from.before(),parent=working.selection.$from.node(working.selection.$from.depth-1),index=working.selection.$from.index(working.selection.$from.depth-1);
   if(!parent.canReplaceWith(index,index+1,node.type))return false;
   const tr=working.tr.replaceWith(pos,pos+current.nodeSize,node);tr.setSelection(node.isAtom?NodeSelection.create(tr.doc,pos):Selection.findFrom(tr.doc.resolve(pos+1),1,true));collect(tr);success=true;
   if(node.isAtom)ensureParagraphAfter(block.id)(working,collect);
  }else{const kind=/^heading[123]$/.test(id)?'heading':['bulletList','orderedList'].includes(id)?'list':id;const insertionOptions={...options,...(/^heading[123]$/.test(id)?{level:Number(id.at(-1))}:{}),...(['bulletList','orderedList'].includes(id)?{ordered:id==='orderedList'}:{})};try{success=insertManualBlock(kind,insertionOptions)(working,collect);}catch{return false;}}
 }
 if(!success)return false;
 if(dispatch){combined.setSelection(Selection.fromJSON(combined.doc,working.selection.toJSON()));combined.setStoredMarks(working.storedMarks);dispatch(combined.scrollIntoView());}return true;
});
function finishInputRule(tr){
 const seen=new Set([tr.doc.attrs.meta.id]);tr.doc.descendants((node,pos)=>{if(!Object.hasOwn(node.attrs,'id'))return;const id=node.attrs.id&&!seen.has(node.attrs.id)?node.attrs.id:newManualId();if(id!==node.attrs.id)tr.setNodeMarkup(pos,undefined,{...node.attrs,id});seen.add(id);});return tr;
}
function prefixInputRule(pattern,resolve){
 return new InputRule(pattern,(state,match,from,to)=>{
  if(state.selection.$from.parent.type.name!=='paragraph'||state.doc.rangeHasMark(from,to,manualSchema.marks.link))return null;
  let working=state;const combined=closeHistory(state.tr),collect=tr=>{for(const step of tr.steps)combined.step(step);working=working.apply(tr);};
  collect(working.tr.delete(from,to));const {id,attrs:options={}}=resolve(match);
  if(!executeManualBlockCommand(id,{attrs:options})(working,collect))return null;
  if(id==='todo'&&options.checked)updateManualObject(working.selection.$from.parent.attrs.id,{checked:true})(working,collect);
  if(id==='orderedList'&&options.start){const list=ancestry(working,'orderedList');if(list)updateManualObject(list.node.attrs.id,{start:options.start})(working,collect);}
  combined.setSelection(Selection.fromJSON(combined.doc,working.selection.toJSON()));return finishInputRule(combined);
 },{inCodeMark:false});
}
const inlineInputRule=(pattern,type,bodyIndex=1,prefixIndex)=>new InputRule(pattern,(state,match,from,to)=>{
 if(!state.selection.$from.parent.type.allowsMarkType(manualSchema.marks[type]))return null;
 const prefix=prefixIndex?match[prefixIndex]:'',body=match[bodyIndex];
 const tr=closeHistory(state.tr).insertText(prefix+body,from,to);tr.addMark(from+prefix.length,from+prefix.length+body.length,manualSchema.marks[type].create());tr.removeStoredMark(manualSchema.marks[type]);return tr;
},{inCodeMark:false});
const dividerRuleHistoryKey=new PluginKey('manual-divider-inputrule');
const dividerRuleHistory=new Plugin({key:dividerRuleHistoryKey,state:{
 init:()=>[],apply(tr,records){const next=tr.getMeta('manualDividerInputRule'),all=next?[...records.filter(record=>record.id!==next.id),next].slice(-100):records;return all.filter(record=>{const found=findManualObject({doc:tr.doc},record.id);return found&&(found.node.type.name==='divider'||found.node.type.name==='paragraph'&&[record.prefix,record.literal].includes(found.node.textContent));});},
},appendTransaction(transactions,oldState,state){
 const historyChange=transactions.some(isHistoryTransaction),inputUndo=oldState.plugins.some(plugin=>plugin.spec.isInputRules&&plugin.getState(oldState)?.transform.getMeta('manualDividerInputRule'));if(!historyChange&&!inputUndo)return null;let tr=null;
 for(const record of dividerRuleHistoryKey.getState(oldState)||[]){const before=findManualObject(oldState,record.id),found=findManualObject({doc:tr?.doc||state.doc},record.id);if(before?.node.type.name!=='divider'||found?.node.type.name!=='paragraph')continue;
  if(historyChange&&found.node.textContent===record.prefix){tr??=state.tr;const pos=found.pos+1+found.node.content.size;tr.insert(pos,state.schema.text(record.pending,record.marks));tr.setSelection(TextSelection.create(tr.doc,pos+record.pending.length));}
  else if(inputUndo&&found.node.textContent===record.literal){const pos=found.pos+1+found.node.content.size;if(state.selection.from!==pos||!state.selection.empty){tr??=state.tr;tr.setSelection(TextSelection.create(tr.doc,pos));}}
 }return tr?.setMeta('addToHistory',false)||null;
}});
function undoDividerRuleFormatting(state,dispatch,view){const current=state.plugins.find(plugin=>plugin.spec.isInputRules&&plugin.getState(state)?.transform.getMeta('manualDividerInputRule'));return current?undo(state,dispatch,view):false;}
function dividerInputRule(){return new InputRule(/^--- ?$/,(state,match,from,to)=>{
 const selection=state.selection;if(!(selection instanceof TextSelection)||!selection.empty||selection.manualIncompletePaginationSelection)return null;
 const {$from}=selection,node=$from.parent;if(node.type.name!=='paragraph'||from!==$from.start()||to!==selection.to||$from.parentOffset!==node.content.size||node.content.size+1!==match[0].length||state.doc.rangeHasMark(from,to,manualSchema.marks.link))return null;
 const parent=$from.node($from.depth-1),index=$from.index($from.depth-1);if(!parent.canReplaceWith(index,index+1,manualSchema.nodes.divider)||manualPaginationMarker(node.attrs.meta.extensions,'block'))return null;
 let fragmented=false;state.doc.descendants(child=>{if(manualPaginationMarker(child.attrs.meta?.extensions,'block')?.rootBlockId===node.attrs.id)fragmented=true;});if(fragmented)return null;
 const pos=$from.before(),id=node.attrs.id,tr=closeHistory(state.tr).replaceWith(pos,pos+node.nodeSize,manualSchema.nodes.divider.create({id,meta:{...(node.attrs.meta.extensions?{extensions:structuredClone(node.attrs.meta.extensions)}:{})}}));
 tr.setSelection(NodeSelection.create(tr.doc,pos));let working=state.apply(tr);ensureParagraphAfter(id)(working,next=>{for(const step of next.steps)tr.step(step);working=working.apply(next);});tr.setSelection(Selection.fromJSON(tr.doc,working.selection.toJSON())).setStoredMarks(state.storedMarks);
 return finishInputRule(tr.setMeta('manualDividerInputRule',{id,prefix:node.textContent,literal:match[0],pending:match[0].slice(node.content.size),marks:state.storedMarks||$from.marks()}));
},{inCodeMark:false});}
function guardedManualInputRules(){const plugin=inputRules({rules:manualInputRules}),handle=plugin.props.handleTextInput;plugin.props.handleTextInput=(view,from,to,text)=>{const selection=view.state.selection;return view.composing||view.editable===false||!(selection instanceof TextSelection)||!selection.empty||from!==selection.from||to!==selection.to?false:handle(view,from,to,text);};return plugin;}
export const manualInputRules=[
 prefixInputRule(/^(#{1,3}) $/,m=>({id:'heading'+m[1].length})),
 prefixInputRule(/^[-*] $/,()=>({id:'bulletList'})),
 prefixInputRule(/^(\d+)\. $/,m=>({id:'orderedList',attrs:{start:Number(m[1])||1}})),
 prefixInputRule(/^\[([ xX]?)\] $/,m=>({id:'todo',attrs:{checked:/x/i.test(m[1])}})),
 prefixInputRule(/^> $/,()=>({id:'toggle'})),prefixInputRule(/^" $/,()=>({id:'quote'})),
 dividerInputRule(),prefixInputRule(/^```([^`\s]*) $/,m=>({id:'codeBlock',attrs:{language:m[1]}})),
 inlineInputRule(/\*\*([^*]+)\*\*$/,'strong'),inlineInputRule(/(^|[^*])\*([^*]+)\*$/,'emphasis',2,1),
 inlineInputRule(/`([^`]+)`$/,'code'),inlineInputRule(/~~([^~]+)~~$/,'strike'),
];
const imageBytes=source=>source.length/4*3-(source.endsWith('==')?2:source.endsWith('=')?1:0);
export function prepareManualClipboardAssets(incoming,resolveAsset=()=>null){
 validateAssets(incoming);let total=0;for(const source of Object.values(incoming))total+=imageBytes(source.split(',')[1]);
 if(total>50*1024*1024)throw new TypeError('붙여넣는 이미지의 합계는 50MB 이하여야 합니다.');
 const assets={},mapping={};
 for(const [key,source]of Object.entries(incoming)){
  const current=resolveAsset(key),extension=/^data:image\/(png|jpeg|webp);/.exec(source)[1];
  const next=current&&current!==source?`assets/${newManualId()}.${extension==='jpeg'?'jpg':extension}`:key;
  mapping[key]=next;assets[next]=source;
 }return {assets,mapping};
}
export function rekeyManualPastedAssets(slice,mapping){
 const clone=node=>{
  if(node.isText)return node;const attributes=structuredClone(node.attrs);
  if(node.type.name==='figure'&&mapping[attributes.meta.asset])attributes.meta.asset=mapping[attributes.meta.asset];
  if(node.type.name==='cover'&&mapping[attributes.meta.logo?.src])attributes.meta.logo.src=mapping[attributes.meta.logo.src];
  const logo=attributes.meta?.extensions?.clipboardContainer?.logo;if(logo&&mapping[logo.src])logo.src=mapping[logo.src];
  return node.type.create(attributes,children(node).map(clone),node.marks);
 };
 const nodes=[];slice.content.forEach(node=>nodes.push(clone(node)));return new Slice(Fragment.fromArray(nodes),slice.openStart,slice.openEnd);
}
function assetsInSlice(slice,resolveAsset){
 const assets={};slice.content.descendants(node=>{const key=node.type.name==='figure'?node.attrs.meta.asset:node.type.name==='cover'?node.attrs.meta.logo?.src:null;if(!key)return;const source=resolveAsset(key);if(typeof source==='string'&&source.startsWith('data:image/'))assets[key]=source;});return assets;
}
const pageProtection=new Plugin({filterTransaction(tr,state){
 if(tr.docChanged){const pages=children(tr.doc);if(!pages.some(node=>['page','cover'].includes(node.type.name))||new Set(pages.map(node=>node.attrs.id)).size!==pages.length)return false;}
 if(!tr.docChanged||tr.getMeta('manualExplicitDelete')||isHistoryTransaction(tr))return true;
 const before=children(state.doc).map(n=>n.attrs.id),after=new Set(children(tr.doc).map(n=>n.attrs.id));
 return before.every(id=>after.has(id));
}});
const keyboardOnly=command=>(state,dispatch,view)=>{if(view?.composing)return false;command(state,dispatch,view);return true;};
function manualKeymap(bindings){const handle=keydownHandler(bindings);return new Plugin({props:{handleKeyDown(view,event){return !(view.composing||event.isComposing||event.keyCode===229)&&handle(view,event);}}});}
const cellKey=command=>(state,dispatch,view)=>state.selection.manualTableCellSelection&&!tableInputAllowed(view)?true:command(state,dispatch,view);
function tableSelectionOptions(options){return {isEnabled:tableInputAllowed,isGestureBlocked:(view,event)=>{const guard=view.props.manualTableSelectionGestureBlocked;return typeof guard==='function'?!!guard(view,event):!!guard;},...options};}
function calloutFocusOptions(options){return {isEnabled:(view)=>{const guard=view?.props?.manualCalloutFocusEnabled;return typeof guard==='function'?guard(view)!==false:guard!==false;},...options};}
const pageFieldBindings=new Plugin({appendTransaction(transactions,_old,state){if(!transactions.some(tr=>tr.docChanged))return null;let tr=null;state.doc.descendants((node,pos,parent)=>{if(!['pageTitle','pageLead'].includes(node.type.name))return;const marker=manualPageRole(node);if(!marker||parent.type.name!=='page'||marker.pageId!==parent.attrs.id){tr??=state.tr;tr.replaceWith(pos,pos+node.nodeSize,ordinaryManualPageField(node));}});return tr;}});
const coverFocus=new Plugin({appendTransaction(transactions,_old,state){if(!transactions.some(tr=>tr.selectionSet||tr.docChanged)||!(state.selection instanceof TextSelection)||!state.selection.empty||state.selection.$from.parent.type.name!=='figureCaption')return null;const $from=state.selection.$from,node=$from.node($from.depth-1);return coverRole(node)?.role==='logo'?state.tr.setSelection(NodeSelection.create(state.doc,$from.before($from.depth-1))):null;}});
export function createManualState({document,doc,plugins=[],tableSelectionOptions:tableOptions,calloutFocusOptions:calloutOptions}={}){
 const model=documentToNode(document??doc??createEmptyManualDocument()),title=model.firstChild.type.name==='cover'?findManualCoverRole({doc:model},model.firstChild.attrs.id,'title'):null;
 return EditorState.create({schema:manualSchema,doc:model,...(title?{selection:TextSelection.create(model,title.pos+1)}:{}),plugins:[history(),pageProtection,identified,pageFieldBindings,coverFocus,manualTableSelectionPlugin(tableSelectionOptions(tableOptions)),...(!plugins.some(plugin=>plugin.key===manualCalloutFocusKey.key)?[manualCalloutFocusPlugin(calloutFocusOptions(calloutOptions))]:[]),guardedManualInputRules(),dividerRuleHistory,...plugins,manualKeymap({'Mod-z':manualCommands.undo,'Mod-Shift-z':manualCommands.redo,'Mod-y':manualCommands.redo,'Mod-b':manualCommands.strong,'Mod-i':manualCommands.emphasis,'Mod-u':keyboardOnly(manualCommands.underline),'Mod-Shift-s':keyboardOnly(manualCommands.strike),'Mod-e':keyboardOnly(manualCommands.code),Enter:cellKey(manualCommands.enter),'Mod-Enter':manualCommands.exitBlock,ArrowDown:manualCommands.arrowDown,ArrowLeft:manualCommands.arrowLeft,ArrowRight:manualCommands.arrowRight,Backspace:cellKey(manualCommands.backspace),Delete:cellKey(manualCommands.deleteForward),'Shift-Enter':manualCommands.hardBreak,Tab:manualCommands.tab,'Shift-Tab':manualCommands.shiftTab}),keymap(baseKeymap)]});
}
export function createManualView(element,{document,doc,onChange,resolveAsset=key=>key,nodeViews={},plugins=[],tableSelectionOptions:tableOptions,calloutFocusOptions:calloutOptions,onPasteAssets,onPasteError=()=>{}}={}){
 const figureView=(node,view,getPos)=>{
  const owner=element.ownerDocument,dom=owner.createElement('figure'),contentDOM=owner.createElement('div');
  let media=DOMSerializer.renderSpec(owner,manualFigureMediaSpec(node.attrs.meta,resolveAsset)).dom;
  dom.append(media,contentDOM);
  const update=current=>{
   if(current.type.name!=='figure')return false;
   dom.dataset.manualId=current.attrs.id;dom.dataset.manualNode='figure';dom.dataset.manualKind='figure';dom.dataset.width=current.attrs.meta.widthPreset;
   dom.classList.remove('lds-manual-figure--full','lds-manual-figure--reading','lds-manual-figure--compact');dom.classList.add('lds-manual-figure',`lds-manual-figure--${current.attrs.meta.widthPreset}`);
   const role=coverRole(current);dom.classList.toggle('manual-v2-cover-logo',role?.role==='logo');if(role)dom.dataset.manualCoverRole=role.role;else delete dom.dataset.manualCoverRole;
   const width=manualFigureWidthStyle(readManualFigureLayout(current.attrs.meta.extensions)?.widthPx);dom.style.width=width?.width||'';dom.style.maxWidth=width?.maxWidth||'';
   let position;try{position=getPos();}catch{}
   const parent=Number.isInteger(position)&&position>=0&&position<view.state.doc.content.size&&view.state.doc.nodeAt(position)===current?view.state.doc.resolve(position).parent:null;
   const defaultAlignment=readManualNodeSemanticKind(view.state,current,position)==='coverLogo'||parent?.type.name==='mediaGroup'&&current.attrs.meta.widthPreset==='full'?'left':'center';
   const alignment=resolveManualFigureAlignment(current.attrs.meta.extensions,{defaultAlignment}),alignmentStyle=manualFigureAlignmentStyle(alignment);
   dom.dataset.manualFigureAlignment=alignment;dom.style.marginLeft=alignmentStyle.marginLeft===0?'0px':alignmentStyle.marginLeft;dom.style.marginRight=alignmentStyle.marginRight===0?'0px':alignmentStyle.marginRight;
   const next=DOMSerializer.renderSpec(owner,manualFigureMediaSpec(current.attrs.meta,resolveAsset)).dom;media.replaceWith(next);media=next;return true;
  };
  update(node);return {dom,contentDOM,update,ignoreMutation:mutation=>mutation.type!=='selection'&&!contentDOM.contains(mutation.target)};
 };
 const coverView=node=>{
  const owner=element.ownerDocument,dom=owner.createElement('section'),contentDOM=owner.createElement('div');
  dom.className='lds-manual-cover';contentDOM.className='manual-v2-cover-content';dom.append(contentDOM);
  const update=current=>{if(current.type.name!=='cover')return false;dom.dataset.manualId=current.attrs.id;dom.dataset.manualNode='cover';dom.dataset.manualKind='cover';return true;};
  update(node);return {dom,contentDOM,update,ignoreMutation:mutation=>mutation.type!=='selection'&&!contentDOM.contains(mutation.target)};
 };
 const clipboardNodes={...DOMSerializer.nodesFromSchema(manualSchema)};
 for(const name of ['figure','cover']){const render=clipboardNodes[name];clipboardNodes[name]=node=>{
  const spec=render(node),key=name==='figure'?node.attrs.meta.asset:node.attrs.meta.logo?.src,source=key?resolveAsset(key):null;
  if(typeof source==='string'&&source.startsWith('data:image/')){validateAssets({[key]:source});spec[1]={...spec[1],'data-manual-asset-key':key,'data-manual-asset-bytes':source};}
  return spec;
 };}
 const blockIncompleteInput=view=>{if(!view.state.selection.manualIncompletePaginationSelection)return false;onPasteError(new TypeError('자동으로 나뉜 블록 전체를 선택한 뒤 내용을 바꿔 주세요.'));return true;};
 const copyGuard=(view,event)=>{if(event.type==='cut'&&blockIncompleteInput(view)){event.preventDefault();return true;}try{prepareManualClipboardAssets(assetsInSlice(view.state.selection.content(),resolveAsset));return false;}catch(error){event.preventDefault();onPasteError(error);return true;}};
 const paste=(view,event,slice)=>{
  if(view.composing||!view.editable||blockIncompleteInput(view))return true;
  if(view.state.selection.manualTableCellSelection){onPasteError(new TypeError('셀 범위 선택을 해제한 뒤 붙여넣어 주세요.'));return true;}
  try{
   const html=event.clipboardData?.getData('text/html');let embedded={};
   if(html){const template=element.ownerDocument.createElement('template');template.innerHTML=html;for(const node of template.content.querySelectorAll('[data-manual-asset-bytes]')){const key=node.getAttribute('data-manual-asset-key'),source=node.getAttribute('data-manual-asset-bytes');if(Object.hasOwn(embedded,key)&&embedded[key]!==source)throw new TypeError('복사한 이미지 이름이 충돌합니다.');Object.defineProperty(embedded,key,{value:source,enumerable:true,configurable:true});}}
   if(Object.keys(embedded).length){
    const prepared=prepareManualClipboardAssets(embedded,resolveAsset);
    if(!onPasteAssets)return true;const before=view.state,result=onPasteAssets(prepared.assets);if(result&&typeof result.then==='function')throw new TypeError('이미지 붙여넣기는 동기 콜백이 필요합니다.');if(result===false||view.state!==before||!view.editable||view.composing)return true;
    slice=rekeyManualPastedAssets(slice,prepared.mapping);
    if(!replaceManualSelection(slice)(view.state,view.dispatch,view))view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView().setMeta('uiEvent','paste'));return true;
   }
   if(!pageSelectionRanges(view.state).length)return false;return replaceManualSelection(slice)(view.state,view.dispatch,view);
  }catch(error){onPasteError(error);return true;}
 };
 return new EditorView(element,{state:createManualState({document,doc,plugins,tableSelectionOptions:tableOptions,calloutFocusOptions:calloutOptions}),nodeViews:{figure:figureView,cover:coverView,...nodeViews},clipboardSerializer:new DOMSerializer(clipboardNodes,DOMSerializer.marksFromSchema(manualSchema)),handleDOMEvents:{copy:copyGuard,cut:copyGuard},transformPasted:normalizeManualPastedSlice,attributes:{class:'manual-writing-content',role:'textbox','aria-label':'매뉴얼 본문','aria-multiline':'true'},dispatchTransaction(transaction){if(transaction.getMeta('uiEvent')==='cut'&&pageSelectionRanges(this.state).length){replaceManualSelection('')(this.state,this.dispatch,this);return;}const next=this.state.applyTransaction(transaction);this.updateState(next.state);onChange?.(next.state,this,transaction);},handleTextInput(view,_from,_to,text){if(view.state.selection.manualTableCellSelection)return !tableInputAllowed(view)||replaceManualTableCellText(text)(view.state,view.dispatch,view);return blockIncompleteInput(view)||replaceManualSelection(text)(view.state,view.dispatch,view);},handlePaste:paste,handleClick(_view,_pos,event){if(event.target.closest?.('a[href]')){event.preventDefault();return true;}return false;}});
}
