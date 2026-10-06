import React,{useState} from 'react';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { fromEditorJSON } from '../manual-adapter/index.mjs';

const labels = {paragraph:'본문',subheading:'하위 제목',address:'주소·식별자',list:'목록',steps:'절차',table:'표',callout:'보충 안내',help:'기존 보충 안내',columns:'화면과 설명',title:'제목',lang:'언어',cover:'표지',pages:'본문 페이지',blocks:'내용',lead:'도입 문장',sectionTitle:'표지 섹션 제목',logo:'로고',metadata:'문서 정보',label:'항목 이름',value:'값',text:'내용',items:'항목',start:'시작 번호',figure:'그림',src:'원본 경로',alt:'대체 텍스트',caption:'캡션',size:'그림 폭',previewTitle:'자료 프레임 이름',crop:'원본 좌표 확대',x:'왼쪽 좌표',y:'위쪽 좌표',width:'확대 폭',height:'확대 높이',sourceWidth:'원본 폭',sourceHeight:'원본 높이',headers:'표 머리글',rows:'표 행',quote:'요청문·인용',tone:'안내 의미',emphasis:'값 강조',labelEmphasis:'이름 강조'};
export function pathAtPosition(editor, position) {
  let result = null;
  const walk = (node, pos, path) => {
    if (pos === position) result = path;
    let offset=pos+1;
    node.forEach((child,_offset,index)=> {
      const next = node.type.name==='manualField' ? [...path,node.attrs.key] : node.type.name==='manualArray' ? [...path,index] : path;
      walk(child,offset,next);offset+=child.nodeSize;
    });
  };
  walk(editor.state.doc,-1,[]);
  return result;
}
function Field({node}) {
  const hidden=['schemaVersion','type'].includes(node.attrs.key);
  return <NodeViewWrapper className={`manual-editor-field${hidden?' manual-editor-constant':''}`} data-field={node.attrs.key}>
    <div contentEditable={false} className="manual-editor-field-label">{labels[node.attrs.key] || `${node.attrs.key} · 보존 필드`}</div><NodeViewContent />
  </NodeViewWrapper>;
}
function StringField({node}) {
  return <NodeViewWrapper className="manual-editor-string"><NodeViewContent as="div" data-placeholder="작성할 내용을 입력합니다" /></NodeViewWrapper>;
}
function ValueField({node,editor,getPos}) {
  const opaque=node.attrs.opaque;
  const value=node.attrs.value;
  const scalar=typeof value==='number'||typeof value==='boolean';
  function change(next) {
    if(!editor.isEditable||editor.view.composing)return;
    const path=pathAtPosition(editor,getPos());
    if(path) editor.commands.applyManualOperation({type:'set',path,value:next});
  }
  return <NodeViewWrapper contentEditable={false} className="manual-editor-scalar">
    {opaque ? <span>미지원 속성 보존 · 편집 잠금</span> : scalar ? typeof value==='boolean' ? <input aria-label="강조 여부" type="checkbox" checked={value} onChange={e=>change(e.target.checked)} /> : <input aria-label="숫자 속성" type="number" step="any" value={value} onChange={e=>{if(e.target.value!=='')change(Number(e.target.value));}} /> : <span>{String(value)}</span>}
  </NodeViewWrapper>;
}
function ObjectView({node,editor,getPos}) {
  const names={manualDocument:'문서 설정',manualCover:'표지',manualPage:'페이지',manualStep:'단계',manualFigure:'그림 속성',manualRecord:'항목'};
  const kind=node.content.content.find(n=>n.attrs.key==='type')?.firstChild?.attrs.value;
  return <NodeViewWrapper className={`manual-editor-object ${node.type.name}`}>
    <div contentEditable={false} className="manual-editor-object-label"><button onClick={()=>editor.emit('manualUiSelect',{path:pathAtPosition(editor,getPos())})}>{names[node.type.name]||labels[kind]||kind||'블록'} 속성</button></div><NodeViewContent />
  </NodeViewWrapper>;
}
function ArrayView({node,editor,getPos}) {
  const [position,setPosition]=useState(0),[destination,setDestination]=useState(0);
  const path=pathAtPosition(editor,getPos());
  const key=path?.at(-1);
  const count=node.childCount,index=Math.min(position,count),selectedIndex=Math.min(position,Math.max(0,count-1));
  const rowCells=typeof key==='number'&&path.at(-2)==='rows';
  function apply(op){if(editor.isEditable&&!editor.view.composing)editor.commands.applyManualOperation(op);}
  function tableChange(action){
    const document=fromEditorJSON(editor.getJSON(),{validate:false}).document,parent=path.slice(0,-1).reduce((v,k)=>v[k],document);
    if(!editor.isEditable||editor.view.composing)return;
    let chain=editor.chain();
    for(const [i,arrayPath]of [path,...parent.rows.map((_row,i)=>[...path.slice(0,-1),'rows',i])].entries()){
      const op=action==='insert'?{type:'insert',path:arrayPath,index,value:i===0?'새 열':'내용'}:action==='remove'?{type:'remove',path:arrayPath,index:selectedIndex}:{type:'move',fromPath:arrayPath,fromIndex:selectedIndex,toPath:arrayPath,toIndex:Math.min(destination,count-1)};
      chain=chain.applyManualOperation(op);
    }
    chain.run();
  }
  function insert(labeled=false) {
    const current=fromEditorJSON(editor.getJSON(),{validate:false}).document;
    const parent=path.slice(0,-1).reduce((v,k)=>v?.[k],current);
    if(key==='headers'){tableChange('insert');return;}
    const value=key==='pages'?{title:'새 과업',blocks:[{type:'paragraph',text:'내용을 작성합니다.'}]}:key==='blocks'?{type:'paragraph',text:'내용을 작성합니다.'}:key==='metadata'||labeled?{label:'항목',value:'내용',emphasis:false,labelEmphasis:false}:key==='rows'?Array.from({length:parent.headers.length},()=> '내용'):key==='items'&&parent.type==='steps'?{title:'새 단계',text:'수행할 행동을 작성합니다.'}:key==='items'? '새 항목':'새 내용';
    apply({type:'insert',path,index,value});
  }
  return <NodeViewWrapper className="manual-editor-array" data-array-path={'/'+(path||[]).join('/')}><NodeViewContent />{!rowCells&&<div contentEditable={false} className="manual-editor-array-tools">
    <label>삽입·선택 위치 <select value={index} onChange={e=>setPosition(Number(e.target.value))}>{Array.from({length:count+1},(_,i)=><option key={i} value={i}>{i+1}{i===count?' · 끝에 삽입':''}</option>)}</select></label>
    <button type="button" onClick={()=>insert()}>항목 추가</button>
    {key==='items'&&node.content.content.some(n=>n.type.name!=='manualStep')&&<button onClick={()=>insert(true)}>이름·값 항목 추가</button>}
    <button type="button" disabled={!count||key==='headers'&&count===1} onClick={()=>key==='headers'?tableChange('remove'):apply({type:'remove',path,index:selectedIndex})}>선택 항목 삭제</button>
    <label>항목 이동 위치 <select value={Math.min(destination,Math.max(0,count-1))} onChange={e=>setDestination(Number(e.target.value))}>{Array.from({length:count},(_,i)=><option key={i} value={i}>{i+1}</option>)}</select></label>
    <button disabled={count<2} onClick={()=>key==='headers'?tableChange('move'):apply({type:'move',fromPath:path,fromIndex:selectedIndex,toPath:path,toIndex:Math.min(destination,count-1)})}>선택 항목 이동</button>
  </div>}</NodeViewWrapper>;
}
export function withManualNodeViews(extensions) {
  const views={manualField:Field,manualString:StringField,manualValue:ValueField,manualArray:ArrayView};
  return extensions.map(extension=>extension.name==='doc'||extension.name==='text'||extension.name==='manualCommands'?extension:extension.extend({addNodeView(){return ReactNodeViewRenderer(views[this.name]||ObjectView);}}));
}
