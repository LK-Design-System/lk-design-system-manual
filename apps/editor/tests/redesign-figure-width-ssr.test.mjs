import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createManualComponents} from '../../../src/components.mjs';
const runtime=process.env.LDS_FIGURE_TEST_RUNTIME||fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(path.join(runtime,'package.json')),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{ManualFigure}=createManualComponents(React,()=>null);
test('public ManualFigure SSR emits physical width/content clamp for plain and cropped images without changing media geometry or caption',()=>{
 const properties={src:'assets/synthetic.png',alt:'Synthetic',caption:'Caption',size:'reading',widthPx:241.5},plain=renderToStaticMarkup(React.createElement(ManualFigure,properties)),crop={x:5,y:8,width:150,height:90,sourceWidth:240,sourceHeight:180},cropped=renderToStaticMarkup(React.createElement(ManualFigure,{...properties,crop})),preset=renderToStaticMarkup(React.createElement(ManualFigure,{...properties,widthPx:undefined}));
 for(const html of [plain,cropped]){assert.match(html,/style="width:241\.5px;max-width:100%"/);assert.match(html,/>Caption<\/figcaption>/);assert.doesNotMatch(html,/style="[^"]*height:/);}assert.match(plain,/<img src="assets\/synthetic\.png" alt="Synthetic"/);assert.match(cropped,/viewBox="5 8 150 90"/);assert.match(cropped,/<image href="assets\/synthetic\.png" width="240" height="180"/);assert.doesNotMatch(preset,/style="width:/);
});
