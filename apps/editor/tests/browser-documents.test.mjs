import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeBrowserFile,imageData} from '../src/ui/browser-documents.mjs';
import {canvasDocument} from '../src/ui/canvas-document.mjs';

test('portable browser files retain source, sidecars and embedded images',()=>{
 const document={schemaVersion:1,title:'테스트',pages:[]}, assets={'assets/test.png':'data:image/png;base64,AA=='};
 assert.deepEqual(decodeBrowserFile(document),{document,assets:{},sidecars:{}});
 const bundle={format:'lds-manual-browser/v1',document,assets,sidecars:{review:{kept:true}}};
 const {format,...expected}=bundle;
 assert.deepEqual(decodeBrowserFile(JSON.parse(JSON.stringify(bundle))),expected);
 for(const source of ['https://example.invalid/a.png','javascript:alert(1)','data:image/svg+xml;base64,AA=='])assert.throws(()=>decodeBrowserFile({...bundle,assets:{test:source}}));
 assert.throws(()=>decodeBrowserFile({...bundle,assets:[]}));
});
test('image import rejects unsupported and oversized files before reading',async()=>{
 await assert.rejects(imageData({type:'image/svg+xml',size:1}));
 await assert.rejects(imageData({type:'image/png',size:21*1024*1024}));
});
test('draft canvas keeps empty editing slots without mutating source or fixing validation silently',()=>{
 const source={pages:[{title:'',lead:'',blocks:[{type:'callout',title:'',text:''},{type:'steps',items:[{title:'',text:'',figure:{src:'test.png',caption:''}}]}]}]};
 const before=structuredClone(source), rendered=canvasDocument(source);
 assert.deepEqual(source,before);
 assert.equal(rendered.pages[0].title,'');
 assert.ok(rendered.pages[0].blocks[0].title);
 assert.ok(rendered.pages[0].blocks[1].items[0].text);
 assert.ok(rendered.pages[0].blocks[1].items[0].figure.caption);
});

test('an absent step description gets only a canvas slot; opening it cannot change the saved draft',()=>{
 const source={pages:[{title:'절차',blocks:[{type:'steps',items:[{title:'설명 없음'},{title:'빈 설명',text:''}]}]}]};
 const before=structuredClone(source),rendered=canvasDocument(source);
 assert.deepEqual(source,before);
 assert.equal(Object.hasOwn(source.pages[0].blocks[0].items[0],'text'),false);
 assert.equal(rendered.pages[0].blocks[0].items[0].text,rendered.pages[0].blocks[0].items[1].text);
});
