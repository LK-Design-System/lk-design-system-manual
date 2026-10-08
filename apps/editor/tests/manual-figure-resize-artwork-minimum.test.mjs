import test from 'node:test';
import assert from 'node:assert/strict';
import {MANUAL_BRAND_ASSETS} from '../src/redesign/manual-brand-assets.mjs';
import {clampManualFigureResize,getManualFigureMinimumWidth,getManualFigureResizeLimits} from '../src/redesign/manual-figure-resize.mjs';

for(const brand of MANUAL_BRAND_ASSETS)test(`${brand.id}: artwork minimum survives the media surface inset`,()=>{
 const inset=brand.previewSurface==='navy'?16:0,ratio=brand.aspectRatio;
 const target={widthPx:132,heightPx:(132-inset)/ratio+inset,scale:1.25,maxWidthPx:500,maxHeightPx:1000,mediaInsetXPx:inset,mediaInsetYPx:inset,context:{asset:brand.asset}};
 const expected=brand.minimumWidthPx+inset;
 const resized=clampManualFigureResize({...target,deltaX:-1000});
 assert.equal(resized.widthPx,expected);
 assert(Math.abs((resized.heightPx-inset)-(brand.minimumWidthPx/ratio))<1e-10);
 assert.equal(clampManualFigureResize({...target,maxWidthPx:expected-0.01}),null);
 assert.equal(clampManualFigureResize({...target,maxHeightPx:brand.minimumWidthPx/ratio+inset-0.01}),null);
 const capped=clampManualFigureResize({...target,maxHeightPx:60,deltaX:1000});
 if(60>=brand.minimumWidthPx/ratio+inset){assert(capped.heightPx<=60+1e-10);assert(capped.widthPx-inset>=brand.minimumWidthPx);}
 else assert.equal(capped,null);
 assert.equal(getManualFigureResizeLimits(target).minWidthPx,expected);
});

test('ordinary and unknown external image keep the 32px floor',()=>{
 for(const asset of ['image.png','logo-inline-navy','https://synthetic.invalid/logo.svg']){
  assert.equal(getManualFigureMinimumWidth(asset,16),32);
  assert.equal(clampManualFigureResize({widthPx:132,heightPx:100,scale:1,maxWidthPx:500,maxHeightPx:1000,context:{asset},deltaX:-1000}).widthPx,32);
 }
});
