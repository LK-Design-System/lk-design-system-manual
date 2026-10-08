import test from 'node:test';
import assert from 'node:assert/strict';
import {createManualComponents} from '../src/components.mjs';
const React={createElement:(type,props,...children)=>({type,props,children})},Callout=()=>{};
const {ManualCallout}=createManualComponents(React,Callout);
test('body-only Manual callout forwards an absent title to the public Core Callout',()=>{
 for(const title of [undefined,'','  ']){const frame=ManualCallout({title,text:'Body'}),core=frame.children[0];assert.equal(core.type,Callout);assert.equal(core.props.title,undefined);assert.deepEqual(core.children,['Body']);assert.equal(core.props.density,'compact');}
});
test('nonempty text and React titles stay unchanged in the Manual Core adapter',()=>{
 const node={type:'span',props:{children:'Heading'}};
 for(const title of ['Heading',node])assert.equal(ManualCallout({title,text:'Body'}).children[0].props.title,title);
});
