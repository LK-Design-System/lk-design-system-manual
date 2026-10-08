import test from 'node:test';
import assert from 'node:assert/strict';
import {TextSelection} from '@tiptap/pm/state';
import {installOutlinePageDrag} from '../src/redesign/outline-page-drag.mjs';
import {createManualState,documentFromState,findManualObject,manualCommands} from '../src/redesign/manual-kernel.mjs';
import {getManualPageGroups,moveManualPageGroup} from '../src/redesign/manual-page-groups.mjs';
import {withManualPaginationMarker} from '../src/redesign/manual-pagination-meta.mjs';

const entries=()=>[
 {id:'cover',kind:'cover',rect:{top:0,bottom:40}},
 {id:'a',rect:{top:40,bottom:100}},
 {id:'b',rect:{top:100,bottom:160}},
 {id:'c',rect:{top:160,bottom:220}},
];
function event(options={}){return {key:'',button:0,pointerId:1,pointerType:'mouse',isPrimary:true,clientX:100,clientY:70,
 preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;},...options};}
function eventTarget(){const listeners=new Map();return {listeners,addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener(name,fn){listeners.get(name)?.delete(fn);if(!listeners.get(name)?.size)listeners.delete(name);},dispatch(name,e){for(const fn of [...listeners.get(name)||[]])fn(e);return e;}};}
function harness({getGroups,getRevision,onMove,onSessionChange,onFeedback}={}){
 const document=eventTarget(),surface=eventTarget(),frames=new Map(),handles=new Map();let revision={},enabled=true,groups=entries(),frameId=0;
 document.defaultView=surface;document.activeElement=null;
 surface.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};surface.cancelAnimationFrame=id=>frames.delete(id);
 const container=Object.assign(eventTarget(),{ownerDocument:document,scrollTop:0,scrollHeight:240,clientHeight:240,getBoundingClientRect:()=>({left:0,right:200,top:0,bottom:240}),contains:handle=>[...handles.values()].includes(handle)});
 const handle=id=>{if(!handles.has(id))handles.set(id,{dataset:{outlinePageHandle:id},isConnected:true,closest(){return this;},contains(value){return value===this;},focus(){document.activeElement=this;this.focuses=(this.focuses||0)+1;},setPointerCapture(){this.captured=true;},releasePointerCapture(){this.captured=false;}});return handles.get(id);};
 const moves=[],feedbacks=[],sessions=[];
 const controller=installOutlinePageDrag({container,surface,activationMode:'row',getGroups:getGroups||(()=>groups.map(group=>({...group,rect:{top:group.rect.top-container.scrollTop,bottom:group.rect.bottom-container.scrollTop}}))),getRevision:getRevision||(()=>revision),canStart:()=>enabled,onMove:move=>{moves.push(move);onMove?.(move);},onFeedback:value=>{feedbacks.push(value);onFeedback?.(value);},onSessionChange:active=>{sessions.push(active);onSessionChange?.(active);}});
 const key=(key,options={})=>{const e=event({key,target:document.activeElement,...options});document.dispatch('keydown',e);if(!e.stopped)container.dispatch('keydown',e);return e;};
 return {container,document,surface,frames,moves,feedbacks,sessions,controller,handle,key,revision,focus:id=>handle(id).focus(),release:(key,options={})=>container.dispatch('keyup',event({key,target:document.activeElement,...options})),press(key,options){const e=this.key(key,options);this.release(key);return e;},changeRevision(){revision={};},disable(){enabled=false;},setGroups(next){groups=next;},dispatch:(name,options={})=>container.dispatch(name,event({target:document.activeElement,...options}))};
}

test('focused Enter/Space pick up, arrow keys preview and confirmation commits once',()=>{
 for(const key of ['Enter',' ','Spacebar']){
  const h=harness();h.focus('a');const origin=h.document.activeElement;
  assert.equal(h.press(key).defaultPrevented,true);assert.equal(h.controller.isDragging(),true);assert.deepEqual(h.sessions,[true]);
  assert.equal(h.feedbacks.at(-1).keyboard,true);assert.equal(h.feedbacks.at(-1).target,null);assert.equal(h.moves.length,0);
  assert.equal(h.key('ArrowDown').defaultPrevented,true);assert.deepEqual(h.feedbacks.at(-1).target,{targetId:'c',edge:'before',anchor:{left:0,right:200,top:160,bottom:160}});assert.equal(h.moves.length,0);
  h.press(key);assert.deepEqual(h.moves,[{sourceId:'a',targetId:'c',edge:'before',revision:h.revision}]);assert.deepEqual(h.sessions,[true,false]);assert.equal(h.controller.isDragging(),false);assert.equal(h.feedbacks.at(-1),null);assert.equal(h.document.activeElement,origin);
  h.key('ArrowDown');assert.equal(h.moves.length,1);assert.equal(h.dispatch('click',{detail:0}).defaultPrevented,undefined);h.controller.dispose();
 }
});
test('native activation default and held-key repeats cannot navigate or double commit',()=>{
 const h=harness();h.focus('a');h.key(' ');assert.equal(h.dispatch('click').defaultPrevented,true);assert.equal(h.dispatch('click',{detail:0}).defaultPrevented,true);
 assert.equal(h.key(' ',{repeat:true}).defaultPrevented,true);assert.equal(h.moves.length,0);assert.equal(h.release(' ').defaultPrevented,true);
 h.key('ArrowDown');h.key('Enter');assert.equal(h.moves.length,1);assert.equal(h.dispatch('click',{detail:0}).defaultPrevented,true);assert.equal(h.key('Enter',{repeat:true}).defaultPrevented,true);assert.equal(h.moves.length,1);assert.equal(h.release('Enter').defaultPrevented,true);
 assert.equal(h.dispatch('click').defaultPrevented,undefined);h.controller.dispose();
});
test('focus leaving after commit clears the held activation marker without blocking later ordinary clicks',()=>{
 const h=harness();h.focus('a');h.press('Enter');h.key('ArrowDown');h.key('Enter');assert.equal(h.moves.length,1);
 const external={};h.document.activeElement=external;h.dispatch('focusout',{target:h.handle('a'),relatedTarget:external});h.release('Enter');assert.equal(h.dispatch('click',{target:h.handle('a'),detail:0}).defaultPrevented,undefined);assert.equal(h.document.activeElement,external);h.controller.dispose();
});
test('manual keyboard-preview scrolling refreshes the indicator without fighting the scroll or scheduling pointer RAF',()=>{
 const h=harness();h.container.scrollHeight=300;h.focus('a');h.press('Enter');h.key('ArrowDown');assert.equal(h.feedbacks.at(-1).target.anchor.top,160);
 h.container.scrollTop=30;h.dispatch('scroll');assert.equal(h.container.scrollTop,30);assert.equal(h.feedbacks.at(-1).target.anchor.top,130);assert.equal(h.feedbacks.at(-1).keyboard,true);assert.equal(h.frames.size,0);assert.equal(h.moves.length,0);h.key('Escape');h.controller.dispose();
});
test('cover sources, unfocused/sibling/modified/composing keys and unpicked arrows stay native',()=>{
 const h=harness();h.focus('cover');assert.equal(h.press('Enter').defaultPrevented,undefined);assert.equal(h.controller.isDragging(),false);
 h.focus('a');for(const flags of [{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true},{isComposing:true},{keyCode:229}])assert.equal(h.press('Enter',flags).defaultPrevented,undefined);
 assert.equal(h.key('ArrowDown').defaultPrevented,undefined);assert.equal(h.key('Enter',{target:h.handle('b')}).defaultPrevented,undefined);assert.equal(h.key('Enter',{target:{closest:()=>null}}).defaultPrevented,undefined);
 h.disable();assert.equal(h.press('Enter').defaultPrevented,undefined);assert.equal(h.sessions.length,0);h.controller.dispose();
});
test('keyboard slots include before-cover, after-cover and adjacent no-ops',()=>{
 const h=harness();h.focus('a');h.press('Enter');h.key('ArrowUp');assert.equal(h.feedbacks.at(-1).target.targetId,'cover');assert.equal(h.feedbacks.at(-1).target.edge,'before');h.key('ArrowUp');h.press('Enter');assert.equal(h.moves.length,1);assert.equal(h.moves[0].targetId,'cover');h.controller.dispose();
 const middle=harness();middle.setGroups([{id:'a',rect:{top:0,bottom:60}},{id:'cover',kind:'cover',rect:{top:60,bottom:100}},{id:'b',rect:{top:100,bottom:160}}]);middle.focus('a');middle.press(' ');middle.key('ArrowDown');assert.equal(middle.feedbacks.at(-1).target.targetId,'b');middle.press(' ');assert.equal(middle.moves[0].edge,'before');middle.controller.dispose();
 const noop=harness();noop.focus('b');noop.press('Enter');noop.key('ArrowUp');noop.key('ArrowDown');assert.equal(noop.feedbacks.at(-1).target,null);noop.press('Enter');assert.equal(noop.moves.length,0);assert.deepEqual(noop.sessions,[true,false]);noop.controller.dispose();
});
test('Escape cancels without a move and restores origin scroll/focus',()=>{
 const h=harness();h.container.scrollHeight=500;h.setGroups(entries().map((group,index)=>({...group,rect:{top:index*100,bottom:index*100+100}})));h.focus('a');const origin=h.document.activeElement;h.press('Enter');h.key('ArrowDown');h.key('ArrowDown');assert.ok(h.container.scrollTop>0);assert.equal(h.frames.size,0);
 assert.equal(h.key('Escape').defaultPrevented,true);assert.equal(h.container.scrollTop,0);assert.equal(h.document.activeElement,origin);assert.deepEqual(h.sessions,[true,false]);assert.equal(h.moves.length,0);assert.equal(h.controller.isDragging(),false);h.controller.dispose();
});
for(const reason of ['Tab','focusout','blur','revision','disabled','source removed','IME'])test(`${reason} cancels a keyboard preview with no document callback`,()=>{
 const h=harness();h.focus('a');h.press('Enter');h.key('ArrowDown');
 if(reason==='Tab')assert.equal(h.key('Tab',{shiftKey:true}).defaultPrevented,undefined);
 else if(reason==='focusout'){const external={};h.document.activeElement=external;h.dispatch('focusout',{target:h.handle('a'),relatedTarget:external});assert.equal(h.document.activeElement,external);}
 else if(reason==='blur')h.surface.dispatch('blur',event());
 else if(reason==='revision'){h.changeRevision();h.key('Enter');}
 else if(reason==='disabled'){h.disable();h.key('Enter');}
 else if(reason==='source removed'){h.setGroups(entries().filter(group=>group.id!=='a'));h.key('Enter');}
 else h.key('Enter',{isComposing:true});
 assert.equal(h.controller.isDragging(),false);assert.equal(h.moves.length,0);assert.equal(h.frames.size,0);assert.deepEqual(h.sessions,[true,false]);assert.equal(h.feedbacks.at(-1),null);h.controller.dispose();
});
test('pointer events and scroll RAF cannot mutate a keyboard session; a new press returns to pointer mode',()=>{
 const h=harness();h.focus('a');h.press('Enter');h.key('ArrowDown');h.document.dispatch('pointermove',event({clientY:230}));h.document.dispatch('pointerup',event({clientY:230}));h.document.dispatch('pointercancel',event());h.dispatch('scroll');assert.equal(h.controller.isDragging(),true);assert.equal(h.moves.length,0);assert.equal(h.frames.size,0);
 const press=h.dispatch('pointerdown');assert.equal(press.defaultPrevented,undefined);assert.deepEqual(h.sessions,[true,false,true]);h.document.dispatch('pointerup',event());assert.deepEqual(h.sessions,[true,false,true,false]);assert.equal(h.moves.length,0);assert.equal(h.dispatch('click').defaultPrevented,undefined);h.controller.dispose();
});
test('commit rechecks gates after resuming pagination and failing observers never commit',()=>{
 let h;h=harness({onSessionChange:active=>{if(!active)h.changeRevision();}});h.focus('a');h.press('Enter');h.key('ArrowDown');h.press('Enter');assert.equal(h.moves.length,0);h.controller.dispose();
 const failing=harness({onSessionChange:active=>{if(!active)throw new Error('resume');}});failing.focus('a');failing.press('Enter');failing.key('ArrowDown');assert.throws(()=>failing.key('Enter'),/resume/);assert.equal(failing.moves.length,0);assert.equal(failing.controller.isDragging(),false);assert.equal(failing.feedbacks.at(-1),null);failing.controller.dispose();
 const preview=harness({onFeedback:value=>{if(value?.target)throw new Error('preview');}});preview.focus('a');preview.press('Enter');assert.throws(()=>preview.key('ArrowDown'),/preview/);assert.equal(preview.controller.isDragging(),false);assert.deepEqual(preview.sessions,[true,false]);assert.equal(preview.moves.length,0);preview.controller.dispose();
});
test('keyboard disposal removes all listeners and calls no terminated observer',()=>{
 let terminated=false;const h=harness({onSessionChange:()=>assert.equal(terminated,false),onFeedback:()=>assert.equal(terminated,false)});h.focus('a');h.press('Enter');h.key('ArrowDown');terminated=true;h.controller.dispose();assert.equal(h.controller.isDragging(),false);assert.deepEqual(h.sessions,[true]);for(const target of [h.container,h.document,h.surface])assert.equal(target.listeners.size,0);h.key('Enter');assert.equal(h.moves.length,0);
});

test('actual PM keyboard drop moves root and automatic tail across cover with one Undo and mapped caret',()=>{
 const inline=text=>[{type:'text',text}],paragraph=(id,text)=>({id,type:'paragraph',content:inline(text)});
 const root={id:'a',title:inline('A'),blocks:[paragraph('a-body','AAA')],extensions:{vendor:{root:true}}};const tail={id:'a-tail',title:inline('A'),blocks:[paragraph('tail-body','TAIL')],...withManualPaginationMarker({}, {kind:'page',rootPageId:'a'})};const document={schemaVersion:2,id:'doc-keyboard',title:'Keyboard',cover:{id:'cover',title:inline('Cover'),metadata:[],blocks:[paragraph('cover-body','C')]},pages:[root,tail,{id:'b',title:inline('B'),blocks:[paragraph('b-body','BBB')]}]};
 let state=createManualState({document});const found=findManualObject(state,'tail-body');state=state.apply(state.tr.setSelection(TextSelection.create(state.doc,found.pos+2)));const before=state;let transactions=0;
 const h=harness({getRevision:()=>state.doc,getGroups:()=>getManualPageGroups(state.doc).map((group,index)=>({...group,rect:{top:index*70,bottom:index*70+70}})),onMove:payload=>{assert.equal(moveManualPageGroup(payload)(state,tr=>{transactions++;state=state.applyTransaction(tr).state;},{editable:true,composing:false}),true);}});h.focus('a');h.press('Enter');h.key('ArrowUp');assert.equal(state,before);assert.equal(transactions,0);h.press('Enter');assert.equal(transactions,1);assert.deepEqual(getManualPageGroups(state.doc).map(group=>group.id),['a','cover','b']);assert.deepEqual(getManualPageGroups(state.doc)[0].pageIds,['a','a-tail']);assert.equal(state.selection.$from.parent.attrs.id,'tail-body');assert.equal(state.selection.$from.parentOffset,1);assert.deepEqual(documentFromState(state).pages.slice(0,2),[root,tail]);
 const after=state;assert.equal(manualCommands.undo(state,tr=>{state=state.applyTransaction(tr).state;}),true);assert.ok(state.doc.eq(before.doc));assert.ok(state.selection.eq(before.selection));assert.equal(manualCommands.redo(state,tr=>{state=state.applyTransaction(tr).state;}),true);assert.ok(state.doc.eq(after.doc));assert.ok(state.selection.eq(after.selection));h.controller.dispose();
});
