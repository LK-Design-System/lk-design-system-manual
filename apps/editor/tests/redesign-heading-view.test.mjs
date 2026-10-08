import test from 'node:test';
import assert from 'node:assert/strict';
import {createManualState,findManualCoverRole} from '../src/redesign/manual-kernel.mjs';
import {createManualHeadingNodeView} from '../src/redesign/manual-heading-view.mjs';
const owner={createElement:tag=>({tagName:tag.toUpperCase(),dataset:{},className:''})};
function model(){return createManualState({document:{schemaVersion:2,id:'doc',title:'',cover:{id:'cover',title:[{type:'text',text:'Title'}],metadata:[],sectionTitle:[{type:'text',text:'Preparation'}],blocks:[]},pages:[{id:'page',title:[],blocks:[]}]}});}
for(const [role,tag,className]of [['title','H1','manual-v2-cover-title'],['sectionTitle','H2','lds-manual-section-title']])test(`actual app ${role} heading view retains its cover role and avoids generic heading overrides`,()=>{
 const node=findManualCoverRole(model(),'cover',role).node,view=createManualHeadingNodeView(node,owner);assert.equal(view.dom.tagName,tag);assert.equal(view.dom.className,className);assert.equal(view.dom.dataset.manualCoverRole,role);assert.equal(view.dom.dataset.manualId,node.attrs.id);assert.equal(view.contentDOM,view.dom);assert.equal(view.update(node),true);assert.equal(view.dom.className.includes('manual-v2-heading'),false);
});
test('duplicated or released heading roles render as ordinary headings and clear stale DOM role attributes',()=>{
 const node=findManualCoverRole(model(),'cover','sectionTitle').node,view=createManualHeadingNodeView(node,owner),clone=node.type.create({...node.attrs,id:'clone'},node.content);assert.equal(view.update(clone),true);assert.equal(view.dom.className,'lds-manual-subheading manual-v2-heading2');assert.equal(view.dom.dataset.manualCoverRole,undefined);const restored=node.type.create(node.attrs,node.content);assert.equal(view.update(restored),true);assert.equal(view.dom.dataset.manualCoverRole,'sectionTitle');assert.equal(view.update(node.type.create({...node.attrs,level:3},node.content)),false);
});
