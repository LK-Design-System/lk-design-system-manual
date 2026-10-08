import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,TextSelection} from '@tiptap/pm/state';
import {TableMap} from '@tiptap/pm/tables';
import {createManualState,manualSchema,documentFromState,findManualCoverRole,findManualObject} from '../src/redesign/manual-kernel.mjs';
import {manualTableSelectionPlugin,selectManualTableCells} from '../src/redesign/manual-table-selection.mjs';
const names=['top-left','top-right','bottom-left','bottom-right'],attributes=(...corners)=>Object.fromEntries(corners.map(name=>['data-manual-table-corner-'+name,'true']));
const cell=id=>({id,content:[{type:'text',text:id}]});
function h(document){const plugin=manualTableSelectionPlugin();let state=EditorState.create({schema:manualSchema,doc:createManualState({document}).doc,plugins:[plugin]});const dispatch=tr=>state=state.applyTransaction(tr).state;return {plugin,get state(){return state;},dispatch,choose:(a,b=a)=>selectManualTableCells(a,b)(state,dispatch),decorations:()=>plugin.props.decorations(state)};}
function decorated(a){const result={};for(const decoration of a.decorations().find()){const node=a.state.doc.nodeAt(decoration.from),attrs={...decoration.type.attrs};assert.equal(attrs.class,'manual-table-cell-selected');delete attrs.class;result[node.attrs.id]=attrs;}return result;}
function fixture(){return {schemaVersion:2,id:'doc',title:'Synthetic',pages:[{id:'page',title:[],blocks:[{id:'table',type:'table',label:'Synthetic',headers:[cell('a'),cell('b'),cell('c')],rows:[[cell('d'),cell('e'),cell('f')],[cell('g'),cell('h'),cell('i')]]}]}]};}
test('rectangular selection marks only physical table corner cells and keeps interior selection class unchanged',()=>{
 const a=h(fixture()),before=a.state.doc,source=documentFromState(a.state);assert.equal(a.choose('a','i'),true);assert.deepEqual(decorated(a),{a:attributes('top-left'),b:{},c:attributes('top-right'),d:{},e:{},f:{},g:attributes('bottom-left'),h:{},i:attributes('bottom-right')});assert.ok(a.state.doc.eq(before));assert.deepEqual(documentFromState(a.state),source);assert.equal(a.choose('e'),true);assert.deepEqual(decorated(a),{e:{}});assert.equal(a.choose('c'),true);assert.deepEqual(decorated(a),{c:attributes('top-right')});
});
test('actual odd metadata grid assigns both row corners to label/value cells across the three-column span',()=>{
 const document=fixture();document.cover={id:'cover',title:[],metadata:[{id:'entry',label:[],value:[]}],blocks:[]};const a=h(document),table=findManualCoverRole(a.state,'cover','metadata').node,label=table.firstChild.firstChild,value=table.firstChild.lastChild;assert.equal(table.firstChild.childCount,2);assert.equal(value.attrs.colspan,3);assert.equal(TableMap.get(table).width,4);const before=documentFromState(a.state);assert.equal(a.choose(label.attrs.id,value.attrs.id),true);assert.deepEqual(decorated(a),{[label.attrs.id]:attributes('top-left','bottom-left'),[value.attrs.id]:attributes('top-right','bottom-right')});assert.deepEqual(documentFromState(a.state),before);
});
test('rowspan and a single colspan cell receive every physical corner they occupy without duplicate decorations',()=>{
 const a=h(fixture()),found=findManualObject(a.state,'table'),schema=manualSchema,c=(id,span={})=>schema.nodes.tableCell.create({id,meta:{},...span},schema.text(id)),row=cells=>schema.nodes.tableRow.create(null,cells),table=rows=>schema.nodes.table.create({id:'table',meta:{label:'Synthetic'}},rows);
 a.dispatch(a.state.tr.replaceWith(found.pos,found.pos+found.node.nodeSize,table([row([c('left',{rowspan:2}),c('top-right')]),row([c('bottom-right')])])));assert.equal(a.choose('left','bottom-right'),true);assert.deepEqual(decorated(a),{left:attributes('top-left','bottom-left'),'top-right':attributes('top-right'),'bottom-right':attributes('bottom-right')});
 const current=findManualObject(a.state,'table');a.dispatch(a.state.tr.replaceWith(current.pos,current.pos+current.node.nodeSize,table([row([c('all',{colspan:3})])])));assert.equal(a.choose('all'),true);assert.deepEqual(decorated(a),{all:attributes(...names)});assert.equal(a.decorations().find().length,1);
});
test('corner flags disappear with cell selection and never enter stored DTO or the underlying node attributes',()=>{
 const a=h(fixture()),source=documentFromState(a.state);assert.equal(a.decorations(),null);assert.equal(a.choose('a','i'),true);assert.doesNotMatch(JSON.stringify(a.state.doc.toJSON()),/data-manual-table-corner|manual-table-cell-selected/);assert.deepEqual(documentFromState(a.state),source);const cell=findManualObject(a.state,'e');a.dispatch(a.state.tr.setSelection(TextSelection.create(a.state.doc,cell.pos+1)));assert.equal(a.decorations(),null);assert.deepEqual(documentFromState(a.state),source);
});
