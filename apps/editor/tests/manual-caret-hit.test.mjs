import test from 'node:test';
import assert from 'node:assert/strict';
import {getManualOutsideCalloutTarget} from '../src/redesign/manual-caret-hit.mjs';

const rect=(left,top,right,bottom)=>({left,top,right,bottom});
const page={id:'page-a',rect:rect(100,100,700,900),contentRect:rect(160,160,640,820)};
const callout={id:'callout-a',parentId:page.id,rect:rect(160,220,640,340)};
const hit=(overrides={})=>getManualOutsideCalloutTarget({point:{x:670,y:260},page,target:{isPageBackground:true},callouts:[callout],...overrides});

test('right paper whitespace at the callout height targets its owning page child',()=>{
 assert.equal(hit(),'callout-a');
 assert.equal(hit({point:{x:650,y:260},target:{isContentBackground:true}}),'callout-a');
 assert.equal(hit({point:{x:640,y:260}}),null);
 assert.equal(hit({point:{x:640.01,y:260}}),'callout-a');
});
test('frame padding and nested colored frames never become outside whitespace',()=>{
 for(const point of [{x:161,y:221},{x:639,y:339},{x:400,y:260}])assert.equal(hit({point}),null);
 const outer={id:'outer',parentId:page.id,rect:rect(160,200,600,400)};
 const nested={id:'nested',parentId:outer.id,rect:rect(200,230,500,310)};
 assert.equal(hit({point:{x:550,y:260},callouts:[outer,nested]}),null);
 assert.equal(hit({point:{x:650,y:260},callouts:[outer,nested]}),'outer');
 assert.equal(hit({callouts:[nested]}),null);
});
test('page edges, footer, left rail and other vertical bands are excluded',()=>{
 for(const point of [{x:700,y:260},{x:701,y:260},{x:99,y:260},{x:150,y:260},{x:670,y:219},{x:670,y:340},{x:670,y:820},{x:670,y:901}])assert.equal(hit({point}),null);
 assert.equal(hit({callouts:[{...callout,parentId:'page-b'}]}),null);
 const nextPage={...page,id:'page-b',rect:rect(100,950,700,1750),contentRect:rect(160,1010,640,1670)};
 assert.equal(hit({page:nextPage}),null);
});
test('non-background hits and blocked interactions do not choose a callout',()=>{
 assert.equal(hit({target:{}}),null);
 assert.equal(hit({target:null}),null);
 assert.equal(hit({blocked:true}),null);
});
test('closest visible frame wins independently of candidate order without mutating input',()=>{
 const near={id:'near',parentId:page.id,rect:rect(400,230,660,330)};
 const hidden={id:'hidden',parentId:page.id,rect:rect(160,220,680,340),visible:false};
 const callouts=[callout,hidden,near],before=structuredClone(callouts);
 assert.equal(hit({callouts}),'near');
 assert.equal(hit({callouts:[near,hidden,callout]}),'near');
 assert.deepEqual(callouts,before);
 assert.equal(hit({callouts:[hidden]}),null);
});
test('client rectangles still work after horizontal scrolling and reject invalid geometry',()=>{
 const scrolledPage={id:page.id,rect:rect(-300,100,300,900),contentRect:rect(-240,160,240,820)};
 const scrolledCallout={...callout,rect:rect(-240,220,240,340)};
 assert.equal(hit({point:{x:270,y:260},page:scrolledPage,callouts:[scrolledCallout]}),'callout-a');
 assert.equal(hit({point:{x:NaN,y:260}}),null);
 assert.equal(hit({point:{x:670,y:Infinity}}),null);
 assert.equal(hit({page:{...page,contentRect:rect(160,160,640,160)}}),null);
 assert.equal(hit({callouts:[{...callout,rect:rect(160,220,160,340)}]}),null);
 assert.equal(hit({callouts:[{...callout,rect:rect(160,220,Infinity,340)}]}),null);
});
test('captured client geometry identifies the content background beside the public callout frame',()=>{
 const capturedPage={id:'captured-page',rect:rect(333.656,210.094,1127.344,1332.609),contentRect:rect(382.781,259.219,1078.219,1257)};
 const capturedCallout={id:'captured-callout',parentId:capturedPage.id,rect:rect(411.641,520.219,1062.219,606.219)};
 assert.equal(hit({point:{x:1070.219,y:563.219},page:capturedPage,target:{isContentBackground:true},callouts:[capturedCallout]}),'captured-callout');
 assert.equal(hit({point:{x:1061,y:563.219},page:capturedPage,target:{isContentBackground:true},callouts:[capturedCallout]}),null);
});
