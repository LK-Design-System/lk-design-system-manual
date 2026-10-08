import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NodeSelection} from '@tiptap/pm/state';
import {createManualState,documentFromState,findManualObject,findManualCoverRole,manualCommands,updateManualObject,duplicateManualObject} from '../src/redesign/manual-kernel.mjs';
import {readManualFigureLayout,resolveManualFigureAlignment,withManualFigureAlignment,withManualFigureWidth,withoutManualFigureWidth,setManualFigureAlignment,setManualFigureWidth,resetManualFigureWidth,manualFigureWidthStyle,manualFigureAlignmentStyle} from '../src/redesign/manual-figure-layout.mjs';
import {getManualFigureResizeBounds} from '../src/redesign/manual-figure-resize.mjs';
import {readManualNodeSemanticKind} from '../src/redesign/manual-semantic-labels.mjs';
import {encodeDocumentFile,decodeDocumentFile} from '../src/redesign/document-store.mjs';
const figure=()=>({type:'figure',id:'image',asset:'assets/image.png',alt:'Keep',caption:[{type:'text',text:'Caption',marks:[{type:'strong'}]}],widthPreset:'full',crop:{x:1,y:2,width:20,height:10,sourceWidth:40,sourceHeight:30},extensions:{vendor:{keep:1}}});
const paragraph={type:'paragraph',id:'body',content:[{type:'text',text:'Body'}]};
const fixture=()=>({schemaVersion:2,id:'doc',title:'',pages:[{id:'page',title:[],blocks:[figure(),paragraph]}]});
function h(document=fixture()){
 let state=createManualState({document}),count=0;const dispatch=tr=>{state=state.applyTransaction(tr).state;count++;};
 const view={get state(){return state;},editable:true,composing:false,props:{}};
 return {get state(){return state;},get document(){return documentFromState(state);},get count(){return count;},dispatch,view,run:(command,v=view)=>command(state,dispatch,v)};
}
test('alignment and width coexist without overwriting unknown packets or rewriting absent defaults',()=>{
 const source={extensions:{manualFigureLayout:{owner:'vendor',alignment:'right'},opaque:{future:true}}};
 const aligned=withManualFigureAlignment(source,'left'),sized=withManualFigureWidth(aligned,150);
 assert.equal(readManualFigureLayout(sized.extensions).key,'manualFigureLayout2');assert.equal(resolveManualFigureAlignment(sized.extensions),'left');
 assert.equal(readManualFigureLayout(sized.extensions).widthPx,150);assert.equal(resolveManualFigureAlignment(withoutManualFigureWidth(sized).extensions),'left');
 assert.deepEqual(sized.extensions.manualFigureLayout,source.extensions.manualFigureLayout);assert.deepEqual(sized.extensions.opaque,source.extensions.opaque);
 assert.deepEqual(source,{extensions:{manualFigureLayout:{owner:'vendor',alignment:'right'},opaque:{future:true}}});
 assert.equal(resolveManualFigureAlignment(undefined),'center');assert.equal(resolveManualFigureAlignment(undefined,{defaultAlignment:'left'}),'left');
 assert.equal(resolveManualFigureAlignment(sized.extensions,{defaultAlignment:'right'}),'left');
 const future=structuredClone(sized);future.extensions.manualFigureLayout2.version=2;assert.equal(resolveManualFigureAlignment(future.extensions),'center');
 const invalid=structuredClone(sized);invalid.extensions.manualFigureLayout2.alignment='future';assert.equal(resolveManualFigureAlignment(invalid.extensions),'center');assert.equal(invalid.extensions.manualFigureLayout2.alignment,'future');
});
for(const alignment of ['left','center','right'])test(`${alignment} commits once and preserves media, caption, selection, marks, codec and Undo/Redo`,()=>{
 const a=h(),found=findManualObject(a.state,'image');a.dispatch(a.state.tr.setSelection(NodeSelection.create(a.state.doc,found.pos)).setStoredMarks([a.state.schema.marks.emphasis.create()]));
 const before=a.state,source=a.document,count=a.count;
 assert.equal(setManualFigureAlignment({figureId:'image',alignment,revision:before.doc})(before),true);assert.equal(a.state,before);
 assert.equal(a.run(setManualFigureAlignment({figureId:'image',alignment,revision:before.doc})),true);assert.equal(a.count,count+1);
 const after=a.state,image=a.document.pages[0].blocks[0];assert.equal(resolveManualFigureAlignment(image.extensions),alignment);
 for(const key of ['id','asset','alt','caption','widthPreset','crop'])assert.deepEqual(image[key],source.pages[0].blocks[0][key]);
 assert.deepEqual(image.extensions.vendor,{keep:1});assert.deepEqual(a.document.pages[0].blocks[1],source.pages[0].blocks[1]);assert.ok(after.selection.eq(before.selection));assert.deepEqual(after.storedMarks,before.storedMarks);
 assert.deepEqual(documentFromState(createManualState({document:a.document})),a.document);assert.deepEqual(decodeDocumentFile(encodeDocumentFile({document:a.document,assets:{}})).document,a.document);
 assert.equal(a.run(setManualFigureAlignment({figureId:'image',alignment})),false);assert.equal(a.state,after);
 assert.equal(a.run(manualCommands.undo),true);assert.ok(a.state.doc.eq(before.doc));assert.ok(a.state.selection.eq(before.selection));
 assert.equal(a.run(manualCommands.redo),true);assert.ok(a.state.doc.eq(after.doc));assert.ok(a.state.selection.eq(after.selection));
});
test('width, preset, reset and duplication keep explicitly chosen alignment',()=>{
 const a=h();a.run(setManualFigureAlignment({figureId:'image',alignment:'right'}));
 a.run(setManualFigureWidth({figureId:'image',widthPx:120}));assert.equal(resolveManualFigureAlignment(a.document.pages[0].blocks[0].extensions),'right');
 a.run(resetManualFigureWidth({figureId:'image'}));assert.equal(resolveManualFigureAlignment(a.document.pages[0].blocks[0].extensions),'right');
 a.run(setManualFigureWidth({figureId:'image',widthPx:140}));a.run(updateManualObject('image',{widthPreset:'compact'}));
 assert.equal(readManualFigureLayout(a.document.pages[0].blocks[0].extensions).widthPx,undefined);assert.equal(resolveManualFigureAlignment(a.document.pages[0].blocks[0].extensions),'right');
 assert.equal(a.run(duplicateManualObject('image')),true);const images=a.document.pages[0].blocks.filter(block=>block.type==='figure');assert.equal(images.length,2);assert.notEqual(images[0].id,images[1].id);assert.equal(resolveManualFigureAlignment(images[1].extensions),'right');
});
for(const [label,options,view]of [
 ['invalid',{alignment:'future'}],['missing',{figureId:'missing'}],['nonfigure',{figureId:'body'}],['stale',{revision:{}}],['cancelled',{cancelled:true}],['readonly',{readOnly:true}],
 ['IME',{}, {composing:true}],['readonly view',{}, {editable:false}],['stale view',{}, {state:{}}],['host gate',{}, {props:{manualFigureResizeEnabled:false}}],['dynamic host gate',{}, {props:{manualFigureResizeEnabled:()=>false}}],
])test(`${label} alignment rejects without mutation or dispatch`,()=>{
 const a=h(),before=a.state,count=a.count;assert.equal(a.run(setManualFigureAlignment({figureId:'image',alignment:'right',...options}),view),false);assert.equal(a.state,before);assert.equal(a.count,count);
});
class Element{
 constructor(){this.dataset={};this.style={};this.classList={add(){},remove(){},toggle(){}};}
 append(){}replaceWith(){}contains(){return false;}
}
// Execute the actual figure NodeView callback; only its DOM/media surface is
// simulated. PM state and semantic role validation run unchanged.
const raw=readFileSync(new URL('../src/redesign/manual-kernel.mjs',import.meta.url),'utf8');
const callback=raw.slice(raw.indexOf(' const figureView='),raw.indexOf(' const coverView='));
const figureView=new Function('element','DOMSerializer','manualFigureMediaSpec','resolveAsset','coverRole','manualFigureWidthStyle','readManualFigureLayout','readManualNodeSemanticKind','resolveManualFigureAlignment','manualFigureAlignmentStyle',callback+'return figureView;')(
 {ownerDocument:{createElement:()=>new Element()}},{renderSpec:()=>({dom:new Element()})},()=>[],value=>value,()=>null,manualFigureWidthStyle,readManualFigureLayout,readManualNodeSemanticKind,resolveManualFigureAlignment,manualFigureAlignmentStyle);
function nodeView(a,found,getPos=()=>found.pos){return figureView(found.node,a.view,getPos);}
test('actual figure NodeView centers standalone, preserves group preset defaults, and applies explicit alignment',()=>{
 const a=h(),nv=nodeView(a,findManualObject(a.state,'image'));assert.equal(nv.dom.dataset.manualFigureAlignment,'center');assert.equal(nv.dom.style.marginLeft,'auto');assert.equal(nv.dom.style.marginRight,'auto');
 const before=a.state;a.run(setManualFigureAlignment({figureId:'image',alignment:'right'}));const found=findManualObject(a.state,'image');assert.equal(nv.update(found.node),true);assert.equal(nv.dom.style.marginLeft,'auto');assert.equal(nv.dom.style.marginRight,'0px');assert.ok(a.state.selection.eq(before.selection));
 for(const [preset,expected]of [['full','left'],['compact','center'],['reading','center']]){
  const document=fixture(),image=figure();image.widthPreset=preset;document.pages[0].blocks=[{type:'mediaGroup',id:'group',layout:'sideBySide',figure:image,blocks:[paragraph]}];
  const group=h(document);assert.equal(nodeView(group,findManualObject(group.state,'image')).dom.dataset.manualFigureAlignment,expected);
 }
});
test('actual cover logo default is left; forged role and stale positions cannot grant that default',()=>{
 const document=fixture();document.cover={id:'cover',title:[],metadata:[],logo:{src:'@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg',alt:'LK'},blocks:[]};
 const a=h(document),logo=findManualCoverRole(a.state,'cover','logo'),before=a.state;assert.equal(nodeView(a,logo).dom.dataset.manualFigureAlignment,'left');assert.equal(a.state,before);
 const forged=fixture();forged.pages[0].blocks[0].extensions=structuredClone(logo.node.attrs.meta.extensions);const b=h(forged);assert.equal(nodeView(b,findManualObject(b.state,'image')).dom.dataset.manualFigureAlignment,'center');
 assert.equal(nodeView(a,logo,()=>999999).dom.dataset.manualFigureAlignment,'center');
});
test('center/left/right resizing retains full available frame width despite computed automatic margins',()=>{
 const rect={width:800,top:100,bottom:700,height:600},parent={getBoundingClientRect:()=>rect},element={parentElement:parent,getBoundingClientRect:()=>({width:200,top:150,bottom:300,height:150})},media={getBoundingClientRect:()=>({width:200,height:100,top:150,bottom:250})},content={getBoundingClientRect:()=>rect},page={dataset:{},getBoundingClientRect:()=>({bottom:1000})};
 const styles=new Map([[parent,{paddingLeft:'20px',paddingRight:'20px'}],[element,{marginLeft:'100px',marginRight:'100px',marginBottom:'0px'}],[content,{}],[media,{}],[page,{paddingBottom:'40px',getPropertyValue:()=>''}]]);
 for(const alignment of ['left','center','right']){
  const fixed=alignment==='center'?0:100;
  const bounds=getManualFigureResizeBounds({element,media,content,page,scale:2,alignment,getComputedStyle:node=>styles.get(node)});
  assert.equal(bounds.maxWidthPx,360-fixed);assert.ok(bounds.maxHeightPx>0);
 }
 parent.dataset={manualNode:'mediaGroup',layout:'sideBySide'};styles.get(parent).gridTemplateColumns='180px 180px';
 assert.equal(getManualFigureResizeBounds({element,media,content,page,scale:2,alignment:'center',getComputedStyle:node=>styles.get(node)}).maxWidthPx,180);
 parent.dataset.layout='stacked';assert.equal(getManualFigureResizeBounds({element,media,content,page,scale:2,alignment:'center',getComputedStyle:node=>styles.get(node)}).maxWidthPx,360);
 assert.deepEqual(manualFigureAlignmentStyle('left'),{marginLeft:0,marginRight:'auto'});assert.deepEqual(manualFigureAlignmentStyle('right'),{marginLeft:'auto',marginRight:0});assert.deepEqual(manualFigureAlignmentStyle(),{marginLeft:'auto',marginRight:'auto'});
});
