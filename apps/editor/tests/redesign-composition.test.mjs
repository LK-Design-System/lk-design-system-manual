import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {installManualCompositionCompletion}=await import(process.env.LDS_COMPOSITION_HELPER||new URL('../src/redesign/manual-composition.mjs',import.meta.url));

function harness(){
 const editor={dom:new EventTarget(),composing:true,state:{doc:{text:'/안내'}}},timers=new Map();let generation=1,current=editor,serial=0,saved=0,refreshed=0,now=0;
 const queueSave=()=>{if(!editor.composing)saved++;};
 // PM's earlier listener ends composition without changing this document/state.
 editor.dom.addEventListener('compositionend',()=>{editor.composing=false;});
 const completion=installManualCompositionCompletion({editor,getEditor:()=>current,getGeneration:()=>generation,onFinished:()=>{queueSave();refreshed++;},setTimer:(fn,delay)=>{timers.set(++serial,{fn,at:now+delay});return serial;},clearTimer:id=>timers.delete(id)});
 const fire=()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(({fn})=>fn());};
 const advance=ms=>{now+=ms;for(const [id,{fn,at}] of [...timers])if(at<=now){timers.delete(id);fn();}};
 return {advance,editor,timers,completion,queueSave,fire,end:()=>editor.dom.dispatchEvent(new Event('compositionend')),replace:()=>generation++,unmount:()=>current=null,counts:()=>({saved,refreshed})};
}
test('composition completion retries a skipped save and refreshes slash UI without another transaction',()=>{
 const h=harness(),state=h.editor.state;h.queueSave();assert.deepEqual(h.counts(),{saved:0,refreshed:0});
 h.end();h.fire();assert.equal(h.editor.state,state);assert.deepEqual(h.counts(),{saved:1,refreshed:1});h.completion.dispose();
});
test('a replaced document or destroyed view cannot receive a stale composition callback',()=>{
 for(const change of ['replace','unmount']){const h=harness();h.end();h[change]();h.fire();assert.deepEqual(h.counts(),{saved:0,refreshed:0});h.completion.dispose();}
 const h=harness();h.end();h.completion.dispose();assert.equal(h.timers.size,0);h.end();h.fire();assert.deepEqual(h.counts(),{saved:0,refreshed:0});
});
test('a new composition is left alone and its own completion schedules one fresh retry',()=>{
 const h=harness();h.end();h.editor.composing=true;h.fire();assert.deepEqual(h.counts(),{saved:0,refreshed:0});
 h.end();h.end();assert.equal(h.timers.size,1);h.fire();assert.deepEqual(h.counts(),{saved:1,refreshed:1});h.completion.dispose();
});

test('default completion refresh runs at the first PM 20ms settlement tick and does not wait another 100ms',()=>{
 const h=harness(),state=h.editor.state;h.end();assert.deepEqual(h.counts(),{saved:0,refreshed:0});h.advance(0);assert.deepEqual(h.counts(),{saved:0,refreshed:0});h.advance(19);assert.deepEqual(h.counts(),{saved:0,refreshed:0});h.advance(1);assert.deepEqual(h.counts(),{saved:1,refreshed:1});assert.equal(h.editor.state,state);h.completion.dispose();
});
test('restarting composition before the PM settlement tick suppresses the old callback',()=>{
 const h=harness();h.end();h.editor.composing=true;h.editor.dom.dispatchEvent(new Event('compositionstart'));h.advance(20);assert.deepEqual(h.counts(),{saved:0,refreshed:0});
 h.end();h.advance(0);assert.deepEqual(h.counts(),{saved:0,refreshed:0});h.advance(19);assert.deepEqual(h.counts(),{saved:0,refreshed:0});h.advance(1);assert.deepEqual(h.counts(),{saved:1,refreshed:1});h.completion.dispose();
});

test('settlement-tick completion cannot refresh a replaced generation or detached current editor',()=>{
 for(const change of ['replace','unmount']){const h=harness();h.end();h[change]();h.advance(0);assert.deepEqual(h.counts(),{saved:0,refreshed:0});h.fire();assert.deepEqual(h.counts(),{saved:0,refreshed:0});h.completion.dispose();}
});

test('installed PM queues a 20ms composition settlement and an early observer flush can return while pending',()=>{
 const pm=readFileSync(new URL('../node_modules/prosemirror-view/dist/index.js',import.meta.url),'utf8');
 assert.match(pm,/editHandlers\.compositionend[\s\S]*?view\.input\.composing = false[\s\S]*?Promise\.resolve\(\)\.then\(\(\) => view\.domObserver\.flush\(\)\)[\s\S]*?scheduleComposeEnd\(view, 20\)/);
 assert.match(pm,/function endComposition\(view[^)]*\)\s*\{[\s\S]*?view\.domObserver\.forceFlush\(\)/);
 assert.match(pm,/flush\(\)\s*\{\s*let \{ view \} = this;\s*if \(!view\.docView \|\| this\.flushingSoon > -1\)\s*return/);
});
