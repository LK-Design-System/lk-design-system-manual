import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createManualComponents} from '../../../src/components.mjs';
const runtime=process.env.LDS_LOGO_TEST_RUNTIME||fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(path.join(runtime,'package.json')),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{ManualCover}=createManualComponents(React,()=>null);
test('public ManualCover optional logo width uses the same physical style as figures, leaving default logo markup and source unchanged',()=>{
 const cover={logo:{src:'assets/logo.png',alt:'Synthetic logo'},title:'Title',metadata:[],blocks:[]},render=logoWidthPx=>renderToStaticMarkup(React.createElement(ManualCover,{cover,number:1,total:2,logoWidthPx})),custom=render(235.5),original=render(),invalid=render(-1);assert.match(custom,/<img class="lds-manual-logo" src="assets\/logo.png" alt="Synthetic logo" style="width:235\.5px;max-width:100%"/);assert.match(original,/<img class="lds-manual-logo" src="assets\/logo.png" alt="Synthetic logo"\/>/);assert.equal(invalid,original);assert.doesNotMatch(custom,/style="[^"]*height:/);assert.match(custom,/>Title<\/h1>/);
});
