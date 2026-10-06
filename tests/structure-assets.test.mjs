import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validateDocument } from '../src/validate.mjs';
import { createManualComponents } from '../src/components.mjs';
import { imageDimensions, validateCropSource } from '../src/image-dimensions.mjs';

const doc = () => ({schemaVersion:1,title:'Document title',pages:[{title:'Task',blocks:[{type:'subheading',text:'Peer topic'},{type:'steps',items:[{title:'Action'}]},{type:'help',title:'Legacy help',text:'Advice'}]}]});
const React = {useId:()=> 'manual-title',createElement:(type,props,...children)=> typeof type === 'function' ? type({...props,children}) : ({type,props:props||{},children:children.flat(Infinity).filter(Boolean)})};
const Callout = ({title,headingLevel,children}) => React.createElement('aside',null,React.createElement(`h${headingLevel}`,null,title),children);
const components = createManualComponents(React,Callout,()=>null);
const flatten = tree => typeof tree === 'object' ? [tree,...tree.children.flatMap(flatten)] : [];

test('one named document h1 and peer body h3 topics, with or without cover',()=>{
  for (const withCover of [false,true]) {
    const d=doc();
    if(withCover) d.cover={title:'Distinct cover title',metadata:[{label:'Version',value:'1'}],sectionTitle:'Prepare',blocks:[{type:'paragraph',text:'Ready'}]};
    const before=JSON.stringify(d), tree=components.ManualDocument({document:validateDocument(d)}), nodes=flatten(tree);
    assert.equal(JSON.stringify(d),before,'no normalization or defaults injected');
    assert.equal(tree.props['aria-labelledby'],'manual-title');
    const h1=nodes.filter(n=>n.type==='h1');assert.equal(h1.length,1);assert.equal(h1[0].props.id,'manual-title');
    assert.equal(h1[0].children[0].type, undefined); // literal text, not another heading
    assert.equal(h1[0].children[0],withCover?'Distinct cover title':'Document title');
    assert.equal(Boolean(h1[0].props.style),!withCover);
    assert.equal(nodes.filter(n=>n.type==='h2').length,withCover?2:1);
    assert.equal(nodes.filter(n=>n.type==='h3').length,3);
    assert.equal(nodes.filter(n=>n.type==='ol').length,1);
    assert.equal(nodes.filter(n=>n.type==='fieldset').length,0);
  }
});

test('sectionTitle optional text is checked without adding defaults; unsupported nesting rejected',()=>{
  for(const value of ['', ' ', null, 7, {}, []]) {const d=doc();d.cover={title:'Cover',metadata:[{label:'v',value:'1'}],blocks:[{type:'paragraph',text:'Ready'}],sectionTitle:value};assert.throws(()=>validateDocument(d),/cover.sectionTitle/);}
  const d=doc();d.pages[0].blocks=[{type:'section',title:'Nested',blocks:[]}];assert.throws(()=>validateDocument(d),/unknown block type section/);
});

test('crop dimensions use intrinsic PNG/JPEG/WebP/SVG sources and preserve bytes',()=>{
  const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(200,16);png.writeUInt32BE(100,20);
  const jpeg=Buffer.from([255,216,255,192,0,8,8,0,100,0,200,0]);
  const webps=[];
  for(const tag of ['VP8X','VP8L','VP8 ']) {
    const size=tag==='VP8L'?5:10,b=Buffer.alloc(20+size+(size%2));b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WEBP',8);b.write(tag,12);b.writeUInt32LE(size,16);
    if(tag==='VP8X'){b.writeUIntLE(199,24,3);b.writeUIntLE(99,27,3);}
    if(tag==='VP8L'){b[20]=0x2f;b.writeUInt32LE(199|(99<<14),21);}
    if(tag==='VP8 '){Buffer.from([0x9d,1,0x2a]).copy(b,23);b.writeUInt16LE(200,26);b.writeUInt16LE(100,28);}
    webps.push([b,'image/webp']);
  }
  const svg=Buffer.from('<svg width="200" height="100" viewBox="0 0 200 100"></svg>');
  for(const [bytes,mime] of [[png,'image/png'],[jpeg,'image/jpeg'],...webps,[svg,'image/svg+xml']]) {
    const original=Buffer.from(bytes);assert.deepEqual(imageDimensions(bytes,mime),{width:200,height:100});
    validateCropSource({sourceWidth:200,sourceHeight:100},bytes,mime,'fixture');
    assert.throws(()=>validateCropSource({sourceWidth:201,sourceHeight:100},bytes,mime,'fixture'),/fixture:.*do not match/);
    assert.deepEqual(bytes,original);
  }
  assert.throws(()=>imageDimensions(Buffer.from('<svg viewBox="0 0 200 100"/>'),'image/svg+xml'),/intrinsic/);
  assert.throws(()=>imageDimensions(Buffer.from('broken'),'image/png'),/intrinsic/);
});

test('CLI rejects crop mismatch at figure, step and columns without overwriting existing HTML', {skip:process.env.LDS_MANUAL_TEST_RUNTIME?false:'Set LDS_MANUAL_TEST_RUNTIME'},async t=>{
  const dir=await fs.mkdtemp(path.join(path.resolve(process.env.LDS_MANUAL_TEST_OUTPUT||os.tmpdir()),'lds-manual-crop-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  await fs.writeFile(path.join(dir,'source.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100"/></svg>');
  const figure={src:'source.svg',alt:'Source',caption:'Detail',crop:{x:0,y:0,width:50,height:50,sourceWidth:201,sourceHeight:100}};
  const root=fileURLToPath(new URL('../',import.meta.url)),input=path.join(dir,'manual.json'),out=path.join(dir,'manual.html'),run=promisify(execFile);
  for(const block of [{type:'figure',...figure},{type:'steps',items:[{title:'Act',figure}]},{type:'columns',figure,blocks:[{type:'paragraph',text:'Details'}]}]) {
    const d=doc();d.pages[0].blocks=[block];await fs.writeFile(input,JSON.stringify(d));await fs.writeFile(out,'previous output');
    await assert.rejects(run(process.execPath,[path.join(root,'bin/lds-manual.mjs'),'build',input,'--runtime',process.env.LDS_MANUAL_TEST_RUNTIME,'--out',out]),e=>e.code===1 && /source.svg: crop source dimensions.*do not match/.test(e.stderr));
    assert.equal(await fs.readFile(out,'utf8'),'previous output');
  }
  const d=doc();d.pages[0].blocks=[{type:'figure',...figure,crop:{...figure.crop,sourceWidth:200}}];await fs.writeFile(input,JSON.stringify(d));
  await run(process.execPath,[path.join(root,'bin/lds-manual.mjs'),'build',input,'--runtime',process.env.LDS_MANUAL_TEST_RUNTIME,'--out',out]);
  assert.match(await fs.readFile(out,'utf8'),/<h1[^>]*>Document title<\/h1>/);
});
