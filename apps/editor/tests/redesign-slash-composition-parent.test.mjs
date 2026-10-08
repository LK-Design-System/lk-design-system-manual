import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {TextSelection} from '@tiptap/pm/state';
import {installManualSlashCompositionChoice} from '../src/redesign/manual-slash-composition-choice.mjs';
import {createEmptyManualDocument} from '../src/redesign/manual-v2.mjs';
import {createManualState,documentFromState,getManualEditingDocument,findManualObject,findManualPageRole,getManualSlashTrigger,getManualCoverInsertCommandState,executeManualCoverInsert,executeManualBlockCommand,manualCommands,findManualCoverRole} from '../src/redesign/manual-kernel.mjs';
import {filterBlockCommands,getBlockMenuItems} from '../src/redesign/block-command-catalog.mjs';
import {getManualPageGroups} from '../src/redesign/manual-page-groups.mjs';
import {getManualBrandAsset} from '../src/redesign/manual-brand-assets.mjs';
import {withManualFigureWidth} from '../src/redesign/manual-figure-layout.mjs';
import {insertManualPageTemplate,configureManualCoverTemplate,createManualPageTemplate} from '../src/redesign/manual-page-templates.mjs';
const {installManualCompositionCompletion}=await import(process.env.LDS_COMPOSITION_HELPER||new URL('../src/redesign/manual-composition.mjs',import.meta.url));
const require=createRequire(new URL('../../../../lk-design-system/package.json',import.meta.url)),{parse}=require('@babel/parser');
const source=readFileSync(new URL('../src/redesign/ManualEditor.jsx',import.meta.url),'utf8');let effectCode,finishedCode,closeModalCode,menuItemsCode,pendingChoiceEffect;const functions=[];
const wanted=new Set(['slashCompositionChoiceEnabled','slashCompositionItemEnabled','completeSlashCompositionChoice','coverInsertReasonDescription','blockMenuSelection','objects','coverGestureBlocked','logoMenuState','coverInsertAction','blockAction','coverElementState','coverElementAction','openLogoPicker','chooseLogo','chooseBlock','command','handleEditorKey']);
function walk(node){
 if(!node||typeof node!=='object')return;
 if(node.type==='FunctionDeclaration'&&wanted.has(node.id?.name))functions.push(source.slice(node.start,node.end));
 if(node.type==='VariableDeclarator'&&node.id?.name==='baseMenuItems')menuItemsCode=source.slice(node.init.start,node.init.end);
 if(node.type==='VariableDeclarator'&&node.id?.name==='closeModal')closeModalCode=source.slice(node.init.start,node.init.end);
 if(node.type==='CallExpression'&&node.callee?.name==='useEffect'&&node.arguments[0]?.type==='ArrowFunctionExpression'){
  const code=source.slice(node.arguments[0].start,node.arguments[0].end);if(code.includes('const trigger=getManualSlashTrigger(editor.state'))effectCode=code;if(code.includes('const request=menu?.pendingCompositionChoice'))pendingChoiceEffect=code;
 }
 if(node.type==='CallExpression'&&node.callee?.name==='installManualCompositionCompletion'){
  const property=node.arguments[0].properties.find(property=>property.key?.name==='onFinished');finishedCode=source.slice(property.value.start,property.value.end);
 }
 for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
}
walk(parse(source,{sourceType:'module',plugins:['jsx']}));assert.ok(effectCode&&finishedCode);
function harness({lead=false,cover=false,coverBody=false,pendingDOM=false}={}){
 const document=createEmptyManualDocument();if(cover||coverBody)document.cover=createManualPageTemplate('cover');if(lead)document.pages[0].lead=[{type:'text',text:'x'}];
 let state=createManualState({document}),transactions=0;const dispatch=tr=>{state=state.applyTransaction(tr).state;transactions++;};
 const target=coverBody?findManualObject(state,document.cover.blocks[0].items[0].blocks[0].id):lead?findManualPageRole(state,document.pages[0].id,'lead'):findManualObject(state,document.pages[0].blocks[0].id);
 dispatch(state.tr.setSelection(TextSelection.create(state.doc,target.pos+1)));if(lead)dispatch(state.tr.delete(target.pos+1,target.pos+2));
 const editor={get state(){return state;},dispatch,dom:new EventTarget(),composing:false,editable:true,coordsAtPos:()=>({left:300,top:160,bottom:184})};
 const create=new Function('editor','getManualSlashTrigger','getManualCoverInsertCommandState','executeManualCoverInsert','getManualBrandAsset','executeManualBlockCommand','withManualFigureWidth','insertManualPageTemplate','configureManualCoverTemplate','getBlockMenuItems','getManualPageGroups',`let menu=null,modal=null,version=0,saves=0,renderedItems=[];const slashCompositionChoice={current:null};const view={current:editor},menuRef={current:null},dismissedSlash={current:null},generation={current:1},uiApi={current:{queueSave(){saves++;}}};const coverRoles={coverLogo:'logo',coverTitle:'title',coverMetadata:'metadata',coverDivider:'divider',coverSectionTitle:'sectionTitle'};function addedPageOwner(){return null;}const menuPage=false,menuMulti=false,ready=true,busy=false,printRequested=false,disabled=false,replacementBusy=false,window={getSelection:()=>null};const replacing={current:false},replacementSaving={current:false},printing={current:false};const figureResizeSession={current:null},tableUISession={current:null},tableResizeSession={current:null},ownOutlineSelectSession={current:null},marginDrag={current:null},dragController={current:null},outlineDragController={current:null},marqueeController={current:null};function can(action){try{return !!editor.state&&!disabled&&!replacementBusy&&!!action(editor.state);}catch{return false;}}function setMenu(next){menu=typeof next==='function'?next(menu):next;menuRef.current=menu;}function setModal(value){modal=value;}function setBubble(){}function setNotice(){}function scheduleFocus(){}${functions.join('\n')}const effect=${effectCode};function render(){const compactMenu=false,menuMulti=false,menuPage=false,pageTitleState={enabled:false},pageTitleDescription='',pageGroups=getManualPageGroups(editor.state.doc);renderedItems=${menuItemsCode};}function setCompositionVersion(next){version=next(version);effect();render();}const onFinished=${finishedCode},closeModal=${closeModalCode};return {setPendingChoice(driver){slashCompositionChoice.current=driver;},completePending(){const menuItems=renderedItems;(${pendingChoiceEffect})();},slashCompositionChoiceEnabled,slashCompositionItemEnabled,completeSlashCompositionChoice,objects,render,get renderedItems(){return renderedItems;},get items(){const compactMenu=false,menuMulti=false,menuPage=false,pageTitleState={enabled:false},pageTitleDescription='',pageGroups=getManualPageGroups(editor.state.doc);return ${menuItemsCode};},effect,onFinished,coverInsertAction,chooseBlock,chooseLogo,closeModal,handleEditorKey,get menu(){return menu;},get modal(){return modal;},get version(){return version;},get saves(){return saves;}};`);
 const parent=create(editor,getManualSlashTrigger,getManualCoverInsertCommandState,executeManualCoverInsert,getManualBrandAsset,executeManualBlockCommand,withManualFigureWidth,insertManualPageTemplate,configureManualCoverTemplate,getBlockMenuItems,getManualPageGroups),timers=new Map();let serial=0,now=0,microtaskSkipped=false;parent.render();
 const schedule=(fn,delay)=>{timers.set(++serial,{fn,at:now+delay});return serial;};
 if(pendingDOM)editor.dom.addEventListener('compositionend',()=>{editor.composing=false;queueMicrotask(()=>{microtaskSkipped=true;});schedule(()=>editor.dispatch(editor.state.tr.insertText('지')),20);});
 const completion=installManualCompositionCompletion({editor,getEditor:()=>editor,getGeneration:()=>1,onFinished:parent.onFinished,setTimer:schedule,clearTimer:id=>timers.delete(id)});
 const fire=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(({fn})=>fn());};const advance=ms=>{now+=ms;for(const [id,{fn,at}] of [...timers])if(at<=now){timers.delete(id);fn();}};
 return {source:document,get microtaskSkipped(){return microtaskSkipped;},selectBody(){const page=documentFromState(state).pages.find(page=>page.id===document.pages[0].id),body=findManualObject(state,page.blocks.find(block=>block.type==='paragraph')?.id||document.pages[0].blocks[0].id);dispatch(state.tr.setSelection(TextSelection.create(state.doc,body.pos+1)));parent.effect();},editor,parent,timers,fire,advance,completion,get transactions(){return transactions;},type(text){dispatch(state.tr.insertText(text));parent.effect();parent.render();},end(){editor.dom.dispatchEvent(new Event('compositionend'));}};
}
test('actual Parent slash effect opens Korean logo query in a blank paragraph with an enabled picker action',()=>{
 const h=harness();try{
  h.type('/로고');assert.equal(h.parent.menu.mode,'slash');assert.equal(h.parent.menu.query,'로고');
  const logo=filterBlockCommands(h.parent.menu.query)[0];assert.equal(logo.id,'coverLogo');
  const choice=getManualCoverInsertCommandState(h.editor.state,{role:'logo',revision:h.editor.state.doc,trigger:h.parent.menu.trigger},h.editor);assert.equal(choice.canChoose,true);
 }finally{h.completion.dispose();}
});
for(const lead of [false,true])test(`${lead?'page lead':'paragraph'} Korean IME keeps the actual Parent menu visible, blocks actions, then permits logo choice after completion`,()=>{
 const h=harness({lead});try{
  h.editor.composing=true;h.type('/로고');assert.equal(h.parent.menu?.query,'로고');assert.equal(filterBlockCommands(h.parent.menu.query)[0].id,'coverLogo');
  const state=h.editor.state,count=h.transactions;h.parent.chooseBlock({id:'coverLogo'});assert.equal(h.parent.modal,null);assert.equal(h.parent.handleEditorKey({key:'Enter',isComposing:true}),false);assert.equal(h.transactions,count);assert.equal(h.editor.state,state);
  h.editor.composing=false;h.end();h.fire();assert.equal(h.editor.state,state);assert.equal(h.transactions,count);assert.equal(h.parent.version,1);
  h.parent.chooseBlock({id:'coverLogo'});assert.equal(h.parent.modal?.kind,'brandLogo');assert.equal(h.transactions,count);h.parent.closeModal();assert.equal(h.parent.modal,null);assert.equal(h.editor.state,state);
  h.parent.effect();h.parent.chooseBlock({id:'coverLogo'});assert.equal(h.parent.chooseLogo('mark-navy'),true);assert.equal(h.transactions,count+1);
  const document=documentFromState(h.editor.state);assert.equal(document.cover,undefined);assert.equal(document.pages.length,1);assert.ok(document.pages[0].blocks.some(block=>block.type==='figure'&&block.asset===getManualBrandAsset('mark-navy').asset));assert.ok(!JSON.stringify(document).includes('/로고'));assert.equal(h.parent.modal,null);
 }finally{h.completion.dispose();}
});
test('cover template is the first Korean result and actual Parent inserts fresh full templates with one Undo each',()=>{
 const h=harness();try{
  h.type('/표지');const item=filterBlockCommands(h.parent.menu.query)[0];assert.equal(item.id,'cover');assert.equal(item.label,'표지 만들기');
  const before=h.editor.state,count=h.transactions,pageId=h.source.pages[0].id;h.parent.chooseBlock(item);assert.equal(h.transactions,count+1);
  const document=documentFromState(h.editor.state);assert.ok(document.cover.logo);assert.equal(document.cover.metadata.length,4);assert.ok(document.cover.sectionTitle.length);assert.equal(document.pages[0].id,pageId);assert.equal(h.editor.state.doc.firstChild.type.name,'cover');assert.ok(!JSON.stringify(document).includes('/표지'));
  const after=h.editor.state;assert.equal(manualCommands.undo(h.editor.state,h.editor.dispatch,h.editor),true);assert.ok(h.editor.state.doc.eq(before.doc));assert.equal(manualCommands.redo(h.editor.state,h.editor.dispatch,h.editor),true);assert.ok(h.editor.state.doc.eq(after.doc));
  h.selectBody();h.type('/표지');const existing=h.editor.state,attempts=h.transactions;h.parent.chooseBlock(filterBlockCommands('표지')[0]);assert.equal(h.transactions,attempts+1);assert.equal(h.editor.state.doc.childCount,existing.doc.childCount+1);assert.equal(h.editor.state.selection.$from.node(1).type.name,'cover');
 }finally{h.completion.dispose();}
});
test('ordinary body logos remain independent when a cover already exists and repeated choices preserve the cover',()=>{
 const h=harness({cover:true});try{
  const cover=structuredClone(documentFromState(h.editor.state).cover),pageId=h.source.pages[0].id;
  for(const variant of ['mark-navy','mark-white']){
   h.selectBody();h.type('/로고');h.parent.chooseBlock({id:'coverLogo'});assert.equal(h.parent.modal?.kind,'brandLogo');assert.equal(h.parent.chooseLogo(variant),true);
   assert.equal(manualCommands.enter(h.editor.state,h.editor.dispatch,h.editor),true);
  }
  const document=documentFromState(h.editor.state);assert.deepEqual(document.cover,cover);assert.equal(document.pages[0].id,pageId);assert.equal(document.pages[0].blocks.filter(block=>block.type==='figure').length,2);
 }finally{h.completion.dispose();}
});
test('a cover with an existing role logo permits a separate ordinary logo without replacing the role',()=>{
 const h=harness({coverBody:true});try{
  const role=findManualCoverRole(h.editor.state,h.source.cover.id,'logo'),before=role.node;
  h.type('/로고');h.parent.chooseBlock({id:'coverLogo'});assert.equal(h.parent.modal?.kind,'brandLogo');assert.equal(h.parent.chooseLogo('mark-white'),true);
  assert.ok(findManualCoverRole(h.editor.state,h.source.cover.id,'logo').node.eq(before));let figures=0;h.editor.state.doc.descendants(node=>{if(node.type.name==='figure')figures++;});assert.equal(figures,2);
 }finally{h.completion.dispose();}
});

test('cover configuration action is disabled during composition then enabled after completion and stale selection remains blocked',()=>{
 const h=harness({cover:true});try{
  h.editor.composing=true;h.type('/표지');assert.equal(h.parent.coverInsertAction()(h.editor.state),false);
  h.editor.composing=false;h.end();h.fire();assert.equal(h.parent.coverInsertAction()(h.editor.state),true);
  const action=h.parent.coverInsertAction();h.editor.dispatch(h.editor.state.tr.setSelection(TextSelection.create(h.editor.state.doc,h.editor.state.selection.from-1)));assert.equal(action(h.editor.state),false);
 }finally{h.completion.dispose();}
});

test('actual rendered menu keeps fresh-cover insertion available when a cover exists after composition',()=>{
 const h=harness({cover:true});try{
  h.editor.composing=true;h.type('/표지');const blocked=h.parent.items.find(item=>item.id==='cover');assert.equal(blocked.disabled,true);assert.equal(blocked.label,'표지 만들기');assert.ok(blocked.description.includes('현재 위치'));
  h.editor.composing=false;h.end();h.fire();assert.equal(h.parent.items.find(item=>item.id==='cover').disabled,false);
  const before=h.editor.state,cover=before.doc.firstChild;h.parent.chooseBlock({id:'cover'});assert.ok(h.editor.state.doc.firstChild.eq(cover));assert.equal(h.editor.state.doc.childCount,before.doc.childCount+1);assert.ok(!JSON.stringify(documentFromState(h.editor.state)).includes('/표지'));
  assert.equal(manualCommands.undo(h.editor.state,h.editor.dispatch,h.editor),true);assert.ok(h.editor.state.doc.eq(before.doc));assert.ok(h.editor.state.selection.eq(before.selection));
 }finally{h.completion.dispose();}
});

test('actual Parent object index recognizes all independent cover templates for outline and block menus',()=>{
 const h=harness({cover:true});try{
  h.type('/표지');h.parent.chooseBlock({id:'cover'});const doc=getManualEditingDocument(h.editor.state),index=h.parent.objects(doc);let count=0;
  h.editor.state.doc.forEach(node=>{if(node.type.name==='cover'){count++;assert.equal(index.get(node.attrs.id)?.type,'cover');}});assert.equal(count,2);
 }finally{h.completion.dispose();}
});

test('actual rendered Korean cover option becomes enabled at the first PM settlement tick without a PM transaction',()=>{
 const h=harness({cover:true});try{
  h.editor.composing=true;h.type('/표지');const blocked=h.parent.renderedItems.find(item=>item.id==='cover');assert.equal(blocked.disabled,true);
  const before=h.editor.state,count=h.transactions;h.parent.chooseBlock(blocked);assert.equal(h.transactions,count);assert.equal(h.parent.handleEditorKey({key:'Enter',isComposing:true}),false);
  // Public PM compositionend updates composing synchronously; React still has
  // the previous rendered list until onFinished forces an independent render.
  h.editor.composing=false;h.end();assert.equal(h.parent.renderedItems.find(item=>item.id==='cover').disabled,true);assert.equal(h.transactions,count);
  h.advance(0);assert.equal(h.parent.renderedItems.find(item=>item.id==='cover').disabled,true);h.advance(19);assert.equal(h.parent.renderedItems.find(item=>item.id==='cover').disabled,true);h.advance(1);const enabled=h.parent.renderedItems.find(item=>item.id==='cover');assert.equal(enabled.disabled,false,'the first PM settlement tick must refresh the disabled rendered option');assert.equal(h.parent.version,1);assert.equal(h.editor.state,before);assert.equal(h.transactions,count);
  h.parent.chooseBlock(enabled);assert.equal(h.transactions,count+1);assert.equal(h.editor.state.doc.childCount,before.doc.childCount+1);assert.ok(h.editor.state.doc.firstChild.eq(before.doc.firstChild));
 }finally{h.completion.dispose();}
});

test('PM settlement-tick Parent completion observes PM microtask final text and later PM revision invalidates its captured menu',async()=>{
 const h=harness();try{
  h.editor.composing=true;h.type('/표지 ');const before=h.editor.state,count=h.transactions;assert.equal(h.parent.renderedItems.find(item=>item.id==='cover').disabled,true);
  h.editor.composing=false;h.end();queueMicrotask(()=>h.editor.dispatch(h.editor.state.tr.delete(h.editor.state.selection.from-1,h.editor.state.selection.from)));await Promise.resolve();
  assert.equal(h.transactions,count+1);const committed=h.editor.state;assert.notEqual(committed,before);assert.equal(h.parent.menu.query,'표지 ');
  h.advance(19);assert.equal(h.parent.menu.query,'표지 ');h.advance(1);assert.equal(h.parent.menu.query,'표지');assert.equal(h.parent.renderedItems.find(item=>item.id==='cover').disabled,false);assert.equal(h.transactions,count+1,'completion must refresh without automatically inserting a cover');assert.equal(documentFromState(committed).cover,undefined);
  // A later PM endComposition transaction changes this same public state.
  // No transaction/render has propagated to Parent yet, so its captured
  // slash action must fail closed until the ordinary effect refreshes it.
  h.advance(20);h.editor.dispatch(h.editor.state.tr.insertText(' '));const later=h.editor.state,laterCount=h.transactions;
  h.parent.chooseBlock(h.parent.renderedItems.find(item=>item.id==='cover'));assert.equal(h.transactions,laterCount);assert.equal(h.editor.state,later);assert.equal(documentFromState(later).cover,undefined);
  h.parent.effect();h.parent.render();assert.equal(h.parent.menu.trigger.to,getManualSlashTrigger(later).to);
 }finally{h.completion.dispose();}
});

test('PM scheduled 20ms force-flush commits final Korean syllable before Parent completion enables its captured option',async()=>{
 const h=harness({pendingDOM:true});try{
  h.editor.composing=true;h.type('/표');const before=h.editor.state,count=h.transactions;assert.equal(h.parent.renderedItems.find(item=>item.id==='cover').disabled,true);
  h.end();await Promise.resolve();assert.equal(h.microtaskSkipped,true,'simulated early DOMObserver flush returns while its scheduled flush is pending');assert.equal(h.editor.state,before);
  for(const ms of [0,19]){h.advance(ms);assert.equal(h.parent.renderedItems.find(item=>item.id==='cover').disabled,true);assert.equal(h.transactions,count);assert.equal(h.parent.menu.query,'표');}
  h.advance(1);assert.equal(h.transactions,count+1,'only the earlier public PM settlement transaction committed');assert.equal(h.parent.menu.query,'표지');assert.equal(h.parent.menu.trigger.to,getManualSlashTrigger(h.editor.state).to);assert.equal(h.parent.renderedItems.find(item=>item.id==='cover').disabled,false);assert.equal(documentFromState(h.editor.state).cover,undefined);
  h.parent.chooseBlock(h.parent.renderedItems.find(item=>item.id==='cover'));assert.equal(h.transactions,count+2);assert.ok(documentFromState(h.editor.state).cover);
 }finally{h.completion.dispose();}
});

test('completion refresh cannot enable a cover action after the editor becomes readonly',()=>{
 const h=harness();try{
  h.editor.composing=true;h.type('/표지');h.editor.composing=false;h.end();h.editor.editable=false;const before=h.editor.state,count=h.transactions;
  h.advance(20);assert.equal(h.parent.renderedItems.find(item=>item.id==='cover').disabled,true);h.parent.chooseBlock({id:'cover'});assert.equal(h.editor.state,before);assert.equal(h.transactions,count);
 }finally{h.completion.dispose();}
});


for(const order of ['click-first','settle-first'])test(`actual Parent ${order} pending request executes strict cover choice only after both click and settlement`,()=>{
 const h=harness(),surface=new EventTarget();surface.activeElement=null;h.editor.dom.isConnected=true;
 const button={isConnected:true,ownerDocument:surface},helper=installManualSlashCompositionChoice({editor:h.editor,getEditor:()=>h.editor,getGeneration:()=>1,getMenu:()=>h.parent.menu,isEnabled:editor=>h.parent.slashCompositionChoiceEnabled(editor),surface,onReady:request=>h.parent.completeSlashCompositionChoice(request)});h.parent.setPendingChoice(helper);
 try{
  h.editor.composing=true;h.type('/표지');const before=h.editor.state,count=h.transactions,item=h.parent.items.find(item=>item.id==='cover');assert.equal(item.disabled,true);assert.equal(h.parent.slashCompositionItemEnabled(item),true);assert.equal(helper.request({...item,compositionChoice:true},button),true);assert.equal(h.transactions,count);surface.activeElement=button;
  h.parent.chooseBlock(item);assert.equal(h.transactions,count);if(order==='click-first')helper.confirm(item,button);h.editor.composing=false;h.end();assert.equal(h.transactions,count);h.fire();assert.equal(h.transactions,count);if(order==='settle-first'){assert.equal(h.parent.menu.pendingCompositionChoice,undefined);helper.confirm(item,button);}assert.equal(h.parent.menu.pendingCompositionChoice.itemId,'cover');assert.equal(h.parent.items.find(item=>item.id==='cover').disabled,false);
  h.parent.completePending();assert.equal(h.transactions,count+1);assert.ok(documentFromState(h.editor.state).cover);assert.ok(!JSON.stringify(documentFromState(h.editor.state)).includes('/표지'));assert.equal(h.parent.menu,null);
  manualCommands.undo(h.editor.state,h.editor.dispatch,h.editor);assert.ok(h.editor.state.doc.eq(before.doc));assert.ok(h.editor.state.selection.eq(before.selection));
 }finally{helper.dispose();h.completion.dispose();}
});

test('actual Parent final pending effect cancels a stale document instead of executing its item',()=>{
 const h=harness(),surface=new EventTarget();h.editor.dom.isConnected=true;const button={isConnected:true,ownerDocument:surface};surface.activeElement=button;
 const helper=installManualSlashCompositionChoice({editor:h.editor,getEditor:()=>h.editor,getGeneration:()=>1,getMenu:()=>h.parent.menu,isEnabled:editor=>h.parent.slashCompositionChoiceEnabled(editor),surface,onReady:request=>h.parent.completeSlashCompositionChoice(request)});h.parent.setPendingChoice(helper);
 try{h.editor.composing=true;h.type('/표지');const item=h.parent.items.find(item=>item.id==='cover');helper.request({...item,compositionChoice:true},button);h.editor.composing=false;h.end();h.fire();helper.confirm(item,button);h.editor.dispatch(h.editor.state.tr.insertText('X'));const before=h.editor.state,count=h.transactions;h.parent.completePending();assert.equal(h.transactions,count);assert.ok(h.editor.state===before);assert.equal(documentFromState(h.editor.state).cover,undefined);}finally{helper.dispose();h.completion.dispose();}
});

test('actual Parent down/settle/release-outside leaves the document untouched',()=>{
 const h=harness(),surface=new EventTarget();h.editor.dom.isConnected=true;const button={isConnected:true,ownerDocument:surface};surface.activeElement=button;
 const helper=installManualSlashCompositionChoice({editor:h.editor,getEditor:()=>h.editor,getGeneration:()=>1,getMenu:()=>h.parent.menu,isEnabled:editor=>h.parent.slashCompositionChoiceEnabled(editor),surface,onReady:request=>h.parent.completeSlashCompositionChoice(request)});h.parent.setPendingChoice(helper);
 try{h.editor.composing=true;h.type('/표지');const item=h.parent.items.find(item=>item.id==='cover'),before=h.editor.state,count=h.transactions;helper.request({...item,compositionChoice:true},button);h.editor.composing=false;h.end();h.fire();surface.dispatchEvent(new Event('pointerup'));h.parent.completePending();assert.equal(h.transactions,count);assert.ok(h.editor.state===before);assert.equal(documentFromState(h.editor.state).cover,undefined);assert.equal(helper.pending,null);}finally{helper.dispose();h.completion.dispose();}
});
