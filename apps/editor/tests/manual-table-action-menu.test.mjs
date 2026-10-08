import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getManualTableActionMenuItems,positionManualTableActionMenu,isManualTableMenuTargetCurrent,nextManualTableActionIndex,manualTableActionItemId} from '../src/redesign/manual-table-action-menu.mjs';

test('short menu exposes directional row/column actions and no unsupported header, color or search command',()=>{
 for(const mode of ['row','column']){const items=getManualTableActionMenuItems(mode,()=>({enabled:true}));assert.deepEqual(items.map(i=>i.id),['insert-before','insert-after','duplicate','clear','delete']);assert.equal(items.at(-1).danger,true);assert.ok(items.every(i=>!i.disabled));assert.match(items[0].label,mode==='row'?/위/:/왼쪽/);assert.match(items[1].label,mode==='row'?/아래/:/오른쪽/);}
 assert.deepEqual(getManualTableActionMenuItems('unknown'),[]);
});
test('availability reasons remain accessible on disabled actions and failures fail closed',()=>{
 const items=getManualTableActionMenuItems('row',id=>{if(id==='clear')return {enabled:true};if(id==='duplicate')throw new Error('stale');return {enabled:false,reason:'문서 정보 표의 구조 변경은 지원하지 않습니다.'};});
 assert.equal(items[3].disabled,false);assert.ok(items.filter(i=>i.disabled).every(i=>i.reason));assert.match(items[0].reason,/문서 정보/);assert.match(items[2].reason,/확인/);
});
test('arrow and Home/End navigation visits disabled items and wraps through all visible commands',()=>{
 const items=getManualTableActionMenuItems('row',id=>({enabled:['insert-before','clear'].includes(id)}));
 assert.equal(nextManualTableActionIndex(items,-1,'ArrowDown'),0);assert.equal(nextManualTableActionIndex(items,0,'ArrowDown'),1);assert.equal(nextManualTableActionIndex(items,0,'ArrowUp'),4);assert.equal(nextManualTableActionIndex(items,4,'ArrowDown'),0);assert.equal(nextManualTableActionIndex(items,3,'Home'),0);assert.equal(nextManualTableActionIndex(items,0,'End'),4);
 const disabled=getManualTableActionMenuItems('row');for(const key of ['ArrowDown','Home'])assert.equal(nextManualTableActionIndex(disabled,-1,key),0);for(const key of ['ArrowUp','End'])assert.equal(nextManualTableActionIndex(disabled,-1,key),4);assert.equal(nextManualTableActionIndex([],0,'ArrowDown'),-1);
});
test('target pin rejects document/generation/editor/readonly/composition/host changes and survives selection-only state changes',()=>{
 const revision={},editor={state:{doc:revision},editable:true,composing:false},target={editor,revision,generation:4};
 assert.equal(isManualTableMenuTargetCurrent(target,{editor,generation:4}),true);editor.state={doc:revision,selection:{newCaret:true}};assert.equal(isManualTableMenuTargetCurrent(target,{editor,generation:4}),true);
 for(const context of [{editor:{...editor},generation:4},{editor,generation:5},{editor,generation:4,enabled:false}])assert.equal(isManualTableMenuTargetCurrent(target,context),false);
 editor.editable=false;assert.equal(isManualTableMenuTargetCurrent(target,{editor,generation:4}),false);editor.editable=true;editor.composing=true;assert.equal(isManualTableMenuTargetCurrent(target,{editor,generation:4}),false);editor.composing=false;editor.state.doc={};assert.equal(isManualTableMenuTargetCurrent(target,{editor,generation:4}),false);
});
test('menu placement stays within the narrow viewport and chooses space above a low row grip',()=>{
 const viewport={left:10,top:20,width:260,height:400},p=positionManualTableActionMenu({left:245,top:380,bottom:404},viewport);
 assert.ok(p.left>=18);assert.ok(p.left+p.width<=262);assert.ok(p.top>=28);assert.ok(p.top+p.maxHeight<=412);assert.ok(p.top<380);
 for(const width of [120,140,180]){const narrow=positionManualTableActionMenu({left:width-15,top:50,bottom:74},{left:0,top:0,width,height:400});assert.equal(narrow.width,width-16);assert.ok(narrow.left+narrow.width<=width-8);}
 assert.equal(positionManualTableActionMenu({left:10,top:10,bottom:34},{left:0,top:0,width:60,height:100}),null);
});

// Compile only this changed JSX and its public Core dependencies in memory.
// This is SSR/source coverage, not browser focus or pointer acceptance.
test('public Core SSR menu links active item IDs, disabled reasons and destructive affordance without an input',async()=>{
 const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),runtime=path.resolve(root,'../lk-design-system');
 const runtimeRequire=createRequire(path.join(runtime,'package.json')),{build}=runtimeRequire('esbuild');
 const result=await build({entryPoints:[path.join(root,'apps/editor/src/redesign/ManualTableSelectionControls.jsx')],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react-dom','react-dom/server'],alias:{'@lk-design-system/lds-core/components/icon/Icon':path.join(runtime,'packages/core/src/components/icon/Icon.jsx'),'@lk-design-system/lds-core/components/buttons/Button':path.join(runtime,'packages/core/src/components/buttons/Button.jsx')}});
 const compiled={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(runtimeRequire,compiled,compiled.exports);
 const React=runtimeRequire('react'),{renderToStaticMarkup}=runtimeRequire('react-dom/server'),items=getManualTableActionMenuItems('row',id=>id==='duplicate'?{enabled:false,reason:'표가 변경되었습니다.'}:{enabled:true});
 const html=renderToStaticMarkup(React.createElement(compiled.exports.ManualTableActionMenu,{menuId:'table-menu',target:{mode:'row'},items,activeIndex:0,position:{left:20,top:30,width:216,maxHeight:206}}));
 assert.ok(html.includes(`aria-activedescendant="${manualTableActionItemId('table-menu','insert-before')}"`));assert.equal((html.match(/role="menuitem"/g)||[]).length,5);assert.ok(html.includes('aria-disabled="true"'));assert.ok(html.includes('표가 변경되었습니다.'));assert.ok(html.includes('data-danger="true"'));assert.ok(!html.includes('<input'));assert.ok(!html.includes('autofocus'));assert.ok(!html.includes('Header row'));assert.ok(html.includes('role="separator"'));
 assert.ok(html.includes('height:auto'));assert.ok(html.includes('white-space:normal'));assert.ok(!html.includes('<small'));assert.ok(html.includes('aria-description="표가 변경되었습니다."'));assert.ok(html.includes('data-slot="content"'));const contentStyle=html.match(/data-slot="content"[^>]*style="([^"]+)"/)[1];for(const declaration of ['width:100%','min-width:0','justify-content:flex-start','gap:10px','white-space:normal'])assert.ok(contentStyle.includes(declaration),declaration);assert.ok(html.includes('box-sizing:border-box'));
 const disabledHTML=renderToStaticMarkup(React.createElement(compiled.exports.ManualTableActionMenu,{menuId:'disabled-menu',target:{mode:'row'},items,activeIndex:2,keyboard:true,position:{left:20,top:30,width:216,maxHeight:206}}));
 assert.ok(disabledHTML.includes('aria-activedescendant="disabled-menu-action-duplicate"'));assert.ok(disabledHTML.includes('aria-describedby="disabled-menu-active-reason"'));assert.ok(disabledHTML.includes('id="disabled-menu-active-reason"'));assert.ok(disabledHTML.includes('role="status"'));assert.ok(disabledHTML.includes('aria-live="polite"'));assert.equal((disabledHTML.match(/class="manual-table-action-reason"/g)||[]).length,1);assert.ok(!/\sdisabled=""/.test(disabledHTML));assert.ok(!html.includes('class="manual-table-action-reason"'));
 const metadataItems=getManualTableActionMenuItems('row',id=>id==='clear'?{enabled:true}:{enabled:false,hidden:true,reason:'Fixed metadata structure'}),metadataPosition=positionManualTableActionMenu({left:20,top:30,bottom:54},{left:0,top:0,width:400,height:400},metadataItems),metadataHTML=renderToStaticMarkup(React.createElement(compiled.exports.ManualTableActionMenu,{menuId:'metadata-menu',target:{mode:'row'},items:metadataItems,activeIndex:0,position:metadataPosition}));assert.equal((metadataHTML.match(/role="menuitem"/g)||[]).length,1);assert.ok(metadataHTML.includes('행 내용 비우기'));assert.ok(metadataHTML.includes('max-height:50px'));assert.ok(!metadataHTML.includes('Fixed metadata structure'));assert.ok(!metadataHTML.includes('role="separator"'));assert.ok(metadataHTML.includes('aria-activedescendant="metadata-menu-action-clear"'));

 const geometry=compiled.exports.positionManualTableSelectionControls({left:120,right:240,top:120,bottom:160},{left:120,right:240,top:100,bottom:160},{left:0,right:400,top:0,bottom:400});assert.equal(geometry.find(i=>i.mode==='row').left,92);assert.equal(geometry.find(i=>i.mode==='column').top,84);
 const covered=compiled.exports.positionManualTableSelectionControls({left:120,right:240,top:120,bottom:160},{left:120,right:240,top:100,bottom:160},{left:0,right:400,top:0,bottom:400},[{left:140,right:220,top:85,bottom:99}]);assert.ok(!covered.some(i=>i.mode==='column'));
 for(const [kind,gap] of [['paragraph',16],['title',24],['callout',16],['metadata',24],['first-table',100]]){const controls=compiled.exports.positionManualTableSelectionControls({left:120,right:240,top:100,bottom:140},{left:120,right:240,top:100,bottom:140},{left:0,right:400,top:0,bottom:400},gap===100?[]:[{left:100,right:260,top:20,bottom:100-gap}]);assert.ok(controls.some(i=>i.mode==='column'),kind);}
});

test('explicit keyboard modality limits the active cue to an item while the composite panel suppresses Core focus outline',async()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),runtime=path.resolve(root,'../lk-design-system'),require=createRequire(path.join(runtime,'package.json')),{build}=require('esbuild');
 const result=await build({entryPoints:[path.join(root,'apps/editor/src/redesign/ManualTableSelectionControls.jsx')],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react-dom'],alias:{'@lk-design-system/lds-core/components/icon/Icon':path.join(runtime,'packages/core/src/components/icon/Icon.jsx'),'@lk-design-system/lds-core/components/buttons/Button':path.join(runtime,'packages/core/src/components/buttons/Button.jsx')}});
 const compiled={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,compiled,compiled.exports);const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),props={menuId:'modality',target:{mode:'column'},items:getManualTableActionMenuItems('column',()=>({enabled:true})),activeIndex:3,position:{left:10,top:20,width:140}};
 const pointer=renderToStaticMarkup(React.createElement(compiled.exports.ManualTableActionMenu,props)),keyboard=renderToStaticMarkup(React.createElement(compiled.exports.ManualTableActionMenu,{...props,keyboard:true}));
 assert.ok(!pointer.includes('data-keyboard="true"'));assert.ok(keyboard.includes('data-keyboard="true"'));for(const html of [pointer,keyboard]){assert.ok(html.includes('--lds-focus-outline:none'));assert.ok(html.includes('outline:none'));assert.ok(html.includes('aria-activedescendant="modality-action-clear"'));assert.equal((html.match(/data-current="true"/g)||[]).length,1);}
 const {readFile}=await import('node:fs/promises'),css=await readFile(path.join(root,'apps/editor/src/redesign/manual-table-action-menu.css'),'utf8');
 assert.match(css,/\.manual-table-action-menu:focus-visible\{outline:none\}/);assert.match(css,/\.manual-table-action-menu\[data-keyboard=true\] button\.manual-table-action-item\[data-current=true\]\{outline:/);assert.match(css,/@media \(forced-colors:active\).*\[data-keyboard=true\].*outline:2px solid Highlight/);assert.ok(!css.includes('!important'));assert.ok(pointer.includes('background:var(--manual-table-action-item-background,transparent)'));assert.match(css,/:is\(:hover,\[data-current=true\]\)\{--manual-table-action-item-background:var\(--component-menu-item-hover-bg\)\}/);
});

// Metadata restrictions are a capability, not a comparison against localized copy.
test('explicit hidden capability removes unsupported actions and shrinks to one supported command',()=>{
 for(const mode of ['row','column']){
  const items=getManualTableActionMenuItems(mode,id=>id==='clear'?{enabled:true}:{enabled:false,hidden:true,reason:'Fixed structure'});
  assert.deepEqual(items.map(item=>item.id),['clear']);assert.equal(items[0].label,mode==='row'?'행 내용 비우기':'열 내용 비우기');
  for(const key of ['ArrowDown','ArrowUp','Home','End'])assert.equal(nextManualTableActionIndex(items,-1,key),0);
  const position=positionManualTableActionMenu({left:20,top:50,bottom:74},{left:0,top:0,width:400,height:400},items);
  assert.equal(position.maxHeight,50);assert.ok(position.top+position.maxHeight<=392);
 }
});
test('menu CSS permits vertical scrolling and constrains Core content and wrapping labels without horizontal scroll',async()=>{
 const {readFile}=await import('node:fs/promises');const css=await readFile(new URL('../src/redesign/manual-table-action-menu.css',import.meta.url),'utf8');
 assert.match(css,/overflow-x:hidden;overflow-y:auto/);assert.match(css,/\[data-slot=content\]>span:last-child\{flex:1;min-width:0;white-space:normal;overflow-wrap:anywhere/);assert.match(css,/manual-table-action-reason.*overflow-wrap:anywhere/);assert.match(css,/\[aria-disabled=true\]\{opacity:1;color:var\(--color-semantic-label-disable\)\}/);assert.match(css,/\[data-keyboard=true\] button\.manual-table-action-item\[data-current=true\]\{outline:/);
});
