import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {manualTableTrailingDelta,positionManualTableTrailingControls,canCommitManualTableTrailingPreview,manualTableTrailingPreviewRects,startManualTableTrailingPreview} from '../src/redesign/manual-table-trailing-controls.mjs';

test('click adds one; axial drag counts grow and shrink without unbounded counts',()=>{
 assert.equal(manualTableTrailingDelta(0,40),1);assert.equal(manualTableTrailingDelta(4,40),1);assert.equal(manualTableTrailingDelta(5,40),1);assert.equal(manualTableTrailingDelta(-5,40),-1);assert.equal(manualTableTrailingDelta(125,40),3);assert.equal(manualTableTrailingDelta(-125,40),-3);assert.equal(manualTableTrailingDelta(10000,40),40);assert.equal(manualTableTrailingDelta(NaN,40),null);assert.equal(manualTableTrailingDelta(20,0),null);
});
test('a drag returned to its origin is a no-op while a stationary click still adds one',()=>{
 assert.equal(manualTableTrailingDelta(0,40,{dragged:false}),1);assert.equal(manualTableTrailingDelta(0,40,{dragged:true}),0);assert.equal(manualTableTrailingDelta(-4,40,{dragged:true}),0);assert.equal(manualTableTrailingDelta(80,40,{dragged:true}),2);
});
test('own session is established before first describe so stationary pointer and keyboard add exactly one',()=>{
 for(const input of ['stationary-pointer','keyboard']){
  const doc={},editor={editable:true,composing:false,state:{doc}},target={editor,revision:doc,generation:3},calls=[];let parentSession=null,dispatches=0;
  const initial={target,delta:1};
  const describe=(s,delta)=>{calls.push('describe');return {...s,delta,description:{enabled:parentSession?.target===s.target,needsConfirmation:false,beforeCount:2,afterCount:3}};};
  assert.equal(describe(initial,1).description.enabled,false);calls.length=0;
  const preview=startManualTableTrailingPreview(initial,{onStart:payload=>{calls.push('start');parentSession=payload;},describe});
  assert.deepEqual(calls,['start','describe'],input);assert.equal(preview.target,parentSession.target);assert.equal(preview.delta,1);
  if(canCommitManualTableTrailingPreview(preview,{editor,generation:3,enabled:parentSession.target===preview.target}))dispatches++;
  assert.equal(dispatches,1,input);assert.equal(preview.description.afterCount,3);
 }
});
test('own session rejected after start is paired with cleanup; capture failure never starts a session',()=>{
 const calls=[],target={revision:{},generation:3},callbacks={onStart:()=>calls.push('start'),describe:s=>({...s,description:{enabled:false,reason:'표가 변경되었습니다.'}}),onReject:s=>{assert.match(s.description.reason,/변경/);calls.push('end');}};
 assert.equal(startManualTableTrailingPreview(null,callbacks),null);assert.deepEqual(calls,[]);
 assert.equal(startManualTableTrailingPreview({target,delta:1},callbacks),null);assert.deepEqual(calls,['start','end']);
});
test('bottom/right strips stay outside document geometry and hide when clipped or overlapping content',()=>{
 const table={left:100,right:400,top:100,bottom:300},clip={left:0,right:500,top:0,bottom:500},before=structuredClone(table),bars=positionManualTableTrailingControls(table,clip);
 assert.deepEqual(table,before);assert.equal(bars.length,2);assert.deepEqual(bars[0],{mode:'row',left:100,right:400,top:302,bottom:314,width:300,height:12});assert.equal(bars[1].left,402);assert.equal(bars[1].height,200);
 assert.equal(positionManualTableTrailingControls(table,{...clip,right:410}).length,1);assert.equal(positionManualTableTrailingControls(table,clip,[{left:100,right:400,top:310,bottom:340}])[0].mode,'column');assert.deepEqual(positionManualTableTrailingControls(null,clip),[]);
});
test('destructive release requires the exact displayed preview and current editor, doc, generation and host guard',()=>{
 const doc={},editor={editable:true,composing:false,state:{doc}},session={target:{editor,revision:doc,generation:9},delta:-2,description:{enabled:true,needsConfirmation:true}},context={editor,generation:9,enabled:true};
 assert.equal(canCommitManualTableTrailingPreview(session,context),false);assert.equal(canCommitManualTableTrailingPreview(session,{...context,previewShown:true}),true);
 for(const patch of [{editor:{...editor}},{generation:10},{enabled:false}])assert.equal(canCommitManualTableTrailingPreview(session,{...context,previewShown:true,...patch}),false);
 editor.state.doc={};assert.equal(canCommitManualTableTrailingPreview(session,{...context,previewShown:true}),false);editor.state.doc=doc;editor.composing=true;assert.equal(canCommitManualTableTrailingPreview(session,{...context,previewShown:true}),false);editor.composing=false;editor.editable=false;assert.equal(canCommitManualTableTrailingPreview(session,{...context,previewShown:true}),false);editor.editable=true;
 assert.equal(canCommitManualTableTrailingPreview({...session,description:{enabled:true,needsConfirmation:false}},context),true);assert.equal(canCommitManualTableTrailingPreview({...session,delta:0},{...context,previewShown:true}),false);assert.equal(canCommitManualTableTrailingPreview(null,context),false);
});
test('preview regions identify trailing deletion and addition while preserving minimum one and bounded additions',()=>{
 const rect={left:100,right:300,top:50,bottom:150};assert.deepEqual(manualTableTrailingPreviewRects(rect,'row',-3,{unit:25,beforeCount:4}).at(-1),{left:100,top:75,width:200,height:25});assert.equal(manualTableTrailingPreviewRects(rect,'row',-100,{unit:25,beforeCount:4}).length,3);assert.deepEqual(manualTableTrailingPreviewRects(rect,'column',2,{unit:50,beforeCount:4})[0],{left:300,top:50,width:50,height:100});assert.equal(manualTableTrailingPreviewRects(rect,'row',100,{unit:25,beforeCount:4}).length,40);
});
test('public Core SSR trailing preview visibly describes content deletion and marks exact measured row bands',async()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),runtime=path.resolve(root,'../lk-design-system'),require=createRequire(path.join(runtime,'package.json')),{build}=require('esbuild');
 const result=await build({entryPoints:[path.join(root,'apps/editor/src/redesign/ManualTableTrailingControls.jsx')],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react-dom'],alias:{'@lk-design-system/lds-core/components/icon/Icon':path.join(runtime,'packages/core/src/components/icon/Icon.jsx'),'@lk-design-system/lds-core/components/buttons/Button':path.join(runtime,'packages/core/src/components/buttons/Button.jsx')}});
 const compiled={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,compiled,compiled.exports);const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const session={target:{mode:'row'},delta:-2,unit:40,rect:{left:100,right:300,top:50,bottom:150},clip:{left:0,right:500,top:0,bottom:400},actualRects:[{left:100,top:50,width:200,height:20},{left:100,top:70,width:200,height:30},{left:100,top:100,width:200,height:50}],description:{enabled:true,beforeCount:3,removesContent:true,needsConfirmation:true,previewText:'내용 있는 행 2개 삭제 • 놓으면 삭제'}};
 const html=renderToStaticMarkup(React.createElement(compiled.exports.ManualTableTrailingPreview,{session,position:{left:100,top:170,width:200}}));assert.ok(html.includes('내용 있는 행 2개 삭제 • 놓으면 삭제'));assert.equal((html.match(/data-removal="true"/g)||[]).length,2);assert.ok(html.includes('top:70px'));assert.ok(html.includes('height:50px'));assert.ok(html.includes('role="status"'));assert.ok(html.includes('data-destructive="true"'));
 const disabled=renderToStaticMarkup(React.createElement(compiled.exports.ManualTableTrailingPreview,{session:{...session,description:{enabled:false,reason:'문서 정보 표의 구조 변경은 지원하지 않습니다.'}},position:{left:10,top:10,width:120}}));assert.ok(disabled.includes('문서 정보 표의 구조 변경은 지원하지 않습니다.'));assert.ok(!disabled.includes('data-removal="true"'));
});
