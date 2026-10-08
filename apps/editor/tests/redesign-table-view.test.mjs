import test from 'node:test';
import assert from 'node:assert/strict';
import {createManualState,findManualObject,findManualCoverRole,documentFromState} from '../src/redesign/manual-kernel.mjs';
import {setManualTableColumnWidths,setManualTableRowHeight,withManualTableCellLayout} from '../src/redesign/manual-table-layout.mjs';
import {createManualTableNodeView,applyManualTableRowLayout} from '../src/redesign/manual-table-view.mjs';
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attrs={};}
 append(...items){for(const item of items){item.remove();item.parent=this;this.children.push(item);}}
 insertBefore(item,before){item.remove();item.parent=this;this.children.splice(this.children.indexOf(before),0,item);}
 replaceChildren(...items){for(const child of this.children)child.parent=null;this.children=[];this.append(...items);}
 remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
 contains(item){return item===this||this.children.some(child=>child.contains(item));}
 setAttribute(key,value){this.attrs[key]=value;}
}
const owner={createElement:tag=>new Element(tag)},cell=id=>({id,content:[]}),doc=()=>({schemaVersion:2,id:'doc',title:'',pages:[{id:'page',title:[],blocks:[{id:'table',type:'table',label:'Table',headers:[cell('h1'),cell('h2')],rows:[[cell('c1'),cell('c2')]]}]}]});
test('actual table view owns its colgroup outside a stable PM tbody and rereads persisted weights',()=>{
 let state=createManualState({document:doc()});const dispatch=tr=>{state=state.applyTransaction(tr).state;},table=()=>findManualObject(state,'table').node,view=createManualTableNodeView(table(),owner),body=view.contentDOM,tableDOM=view.dom.children[0];assert.equal(body.tagName,'TBODY');assert.equal(tableDOM.attrs['aria-label'],'Table');assert.deepEqual(tableDOM.children,[body]);
 setManualTableColumnWidths({tableId:'table',columnWeights:[2,3]})(state,dispatch);assert.equal(view.update(table()),true);assert.equal(view.contentDOM,body);assert.equal(tableDOM.children[0].tagName,'COLGROUP');assert.ok(tableDOM.children[0].children.every((col,index)=>Math.abs(parseFloat(col.style.width)-[40,60][index])<1e-9));assert.equal(tableDOM.children[1],body);
 assert.equal(view.ignoreMutation({type:'attributes',target:tableDOM.children[0].children[0]}),true);assert.equal(view.ignoreMutation({type:'childList',target:body}),false);assert.equal(view.ignoreMutation({type:'selection',target:tableDOM}),false);
 const reloaded=createManualState({document:documentFromState(state)}),reloadedView=createManualTableNodeView(findManualObject(reloaded,'table').node,owner);assert.ok(reloadedView.dom.children[0].children[0].children.every((col,index)=>Math.abs(parseFloat(col.style.width)-[40,60][index])<1e-9));assert.equal(view.update(reloaded.doc.firstChild),false);
});
test('row renderer applies stored height as table minimum and removes it when absent',()=>{
 let state=createManualState({document:doc()});const dispatch=tr=>{state=state.applyTransaction(tr).state;},row=new Element('tr');setManualTableRowHeight({tableId:'table',rowIndex:1,rowMinHeightPx:77})(state,dispatch);applyManualTableRowLayout(row,findManualObject(state,'table').node.child(1));assert.equal(row.style.height,'77px');assert.equal(row.style.overflow,undefined);applyManualTableRowLayout(row,findManualObject(createManualState({document:doc()}),'table').node.child(1));assert.equal(row.style.height,'');
});
test('actual metadata table view owns only its LDS frame and leaves the divider to its independent block',()=>{
 const d=doc();d.cover={id:'cover',title:[],metadata:[{id:'entry',label:[{type:'text',text:'Version'}],value:[]}],blocks:[]};const state=createManualState({document:d}),metadata=findManualCoverRole(state,'cover','metadata').node,view=createManualTableNodeView(metadata,owner);assert.equal(view.dom.dataset.manualCoverRole,'metadata');assert.equal(view.dom.className,'manual-v2-cover-metadata');assert.equal(view.dom.children[0].className,'lds-manual-table-frame lds-manual-meta');assert.equal(view.dom.children.length,1);assert.equal(view.dom.children.some(child=>child.tagName==='HR'),false);assert.equal(view.dom.children[0].children[0].children[0],view.contentDOM);assert.equal(view.ignoreMutation({type:'attributes',target:view.dom.children[0]}),true);assert.equal(view.ignoreMutation({type:'childList',target:view.contentDOM}),false);assert.equal(view.update(metadata),true);assert.equal(view.dom.children.length,1);
});
test('explicit column weights use fixed layout and removing weights restores the original auto layout',()=>{
 const plain=findManualObject(createManualState({document:doc()}),'table').node,view=createManualTableNodeView(plain,owner),table=view.dom.children[0];assert.equal(table.style.tableLayout,'');assert.equal(table.children.length,1);const headers=[];plain.firstChild.forEach((cell,_pos,index)=>headers.push(cell.type.create({...cell.attrs,meta:withManualTableCellLayout(cell.attrs.meta,{columnWeight:[1,4][index]})},cell.content)));const weighted=plain.type.create(plain.attrs,[plain.firstChild.copy(plain.firstChild.content.constructor.fromArray(headers)),plain.child(1)]);assert.equal(view.update(weighted),true);assert.equal(table.style.tableLayout,'fixed');assert.equal(table.children[0].tagName,'COLGROUP');assert.deepEqual(table.children[0].children.map(col=>parseFloat(col.style.width)),[20,80]);assert.equal(view.update(plain),true);assert.equal(table.style.tableLayout,'');assert.deepEqual(table.children,[view.contentDOM]);
});
test('foreign column weight namespaces and row-height-only tables retain default auto layout',()=>{
 for(const extensions of [{manualTableLayout:{owner:'vendor',version:1,kind:'cell-layout',columnWeight:4}},withManualTableCellLayout({}, {rowMinHeightPx:60}).extensions]){const d=doc();d.pages[0].blocks[0].headers[0].extensions=extensions;const table=createManualTableNodeView(findManualObject(createManualState({document:d}),'table').node,owner).dom.children[0];assert.equal(table.style.tableLayout,'');assert.equal(table.children[0].tagName,'TBODY');}
});
