import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {imageDimensions,validateCropSource} from '../src/image-dimensions.mjs';

test('real decoded assets share crop coordinates with browser naturalWidth/Height',{
  skip: process.env.LDS_MANUAL_TEST_RUNTIME && process.env.LDS_MANUAL_TEST_BROWSER ? false : 'Set LDS_MANUAL_TEST_RUNTIME and LDS_MANUAL_TEST_BROWSER; no browser installation performed.'
},async()=>{
  const require=createRequire(path.resolve(process.env.LDS_MANUAL_TEST_RUNTIME,'package.json'));
  const {chromium}=require('playwright');
  const browser=await chromium.launch({headless:true,executablePath:process.env.LDS_MANUAL_TEST_BROWSER});
  try {
    const page=await browser.newPage(),dir=new URL('./fixtures/intrinsic/',import.meta.url);
    for(const name of (await fs.readdir(dir)).filter(n=>/\.(svg|jpg|png|webp)$/.test(n))) {
      const bytes=await fs.readFile(new URL(name,dir)),before=Buffer.from(bytes);
      const mime=name.endsWith('.svg')?'image/svg+xml':name.endsWith('.jpg')?'image/jpeg':name.endsWith('.png')?'image/png':'image/webp';
      const natural=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};},`data:${mime};base64,${bytes.toString('base64')}`);
      if (['viewbox-only.svg','percent.svg'].includes(name)) {
        assert.throws(()=>imageDimensions(bytes,mime),/intrinsic/,name);
        assert.throws(()=>validateCropSource({sourceWidth:natural.width,sourceHeight:natural.height},bytes,mime,name),/intrinsic/);
      } else {
        assert.deepEqual(imageDimensions(bytes,mime),natural,name);
        const crop={sourceWidth:natural.width,sourceHeight:natural.height},original={...crop};
        validateCropSource(crop,bytes,mime,name);assert.deepEqual(crop,original);
        assert.throws(()=>validateCropSource({...crop,sourceWidth:natural.width+1},bytes,mime,name),/do not match/,name);
        if (/orientation-[5-8]/.test(name)) assert.throws(()=>validateCropSource({sourceWidth:200,sourceHeight:100},bytes,mime,name),/do not match/);
      }
      assert.deepEqual(bytes,before,'asset bytes unchanged');
    }
  } finally {await browser.close();}
});
