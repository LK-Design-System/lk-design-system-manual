import React, {useEffect, useRef, useState} from 'react';
import {Button} from '@lk-design-system/lds-core/components/buttons/Button';
import {createPrototypeView, prototypeCommands} from './prototype-kernel.mjs';
import './prototype.css';

function Arrow({redo=false}) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={redo?{transform:'scaleX(-1)'}:undefined}><path d="M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12" transform="translate(0 -2)"/></svg>;
}
function blockKind(state) {
  if(!state)return 'paragraph';
  if(state.selection.$from.depth===0){
    const kinds=new Set();state.doc.nodesBetween(state.selection.from,state.selection.to,node=>{kinds.add(['paragraph','heading','bulletList','orderedList'].includes(node.type.name)?node.type.name:'mixed');return false;});
    return kinds.size===1?[...kinds][0]:'mixed';
  }
  for(let depth=state.selection.$from.depth;depth>0;depth--){
    const name=state.selection.$from.node(depth).type.name;
    if(name==='bullet_list'||name==='bulletList')return 'bulletList';
    if(name==='ordered_list'||name==='orderedList')return 'orderedList';
  }
  return state.selection.$from.parent.type.name==='heading'?'heading':'paragraph';
}
function markActive(state, name) {
  if(!state)return false;
  const type=state.schema.marks[name]||(name==='emphasis'?state.schema.marks.em:null);
  if(!type)return false;
  return state.selection.empty?!!type.isInSet(state.storedMarks||state.selection.$from.marks()):state.doc.rangeHasMark(state.selection.from,state.selection.to,type);
}
function Tool({command,label,children,pressed,enabled,run}) {
  return <Button size="sm" variant="ghost" iconOnly aria-label={label} aria-pressed={pressed} title={label} disabled={!enabled(command)} styles={{root:{border:'none',...(pressed?{background:'var(--color-semantic-background-band)',color:'var(--color-semantic-primary-normal)'}:{})}}} onMouseDown={event=>event.preventDefault()} onClick={()=>run(command)}>{children}</Button>;
}
export function PrototypeEditor() {
  const mount=useRef(null), view=useRef(null), initial=useRef(null), dirty=useRef(false);
  const [,refresh]=useState(0),[notice,setNotice]=useState('');
  useEffect(()=>{
    const editor=createPrototypeView(mount.current,{onChange:state=>{
      dirty.current=initial.current?!state.doc.eq(initial.current):false;
      refresh(value=>value+1);
    }});
    view.current=editor;initial.current=editor.state.doc;
    editor.setProps({attributes:{...editor.props.attributes,'aria-label':'시험 문서 본문','aria-describedby':'prototype-help'}});
    refresh(value=>value+1);
    const protect=event=>{if(dirty.current){event.preventDefault();event.returnValue='';}};
    const save=event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();setNotice('이 시험 화면은 저장을 지원하지 않습니다. 필요한 내용은 복사해 보관하세요.');}};
    window.addEventListener('beforeunload',protect);window.addEventListener('keydown',save);
    return ()=>{window.removeEventListener('beforeunload',protect);window.removeEventListener('keydown',save);editor.destroy();view.current=null;};
  },[]);
  const state=view.current?.state;
  function run(name) {
    const editor=view.current;
    if(!editor||editor.composing)return;
    if(prototypeCommands[name](editor.state,editor.dispatch,editor)){setNotice('');editor.focus();}
  }
  const enabled=name=>!!state&&prototypeCommands[name](state);
  return <div className="manual-prototype">
    <header className="manual-prototype-header">
      <div><strong>Manual</strong><span>입력 시험</span></div>
      <a href="./manual.html">매뉴얼 작성</a>
    </header>
    <aside className="manual-prototype-warning" aria-label="시험 화면 안내"><strong>저장되지 않는 실험 화면입니다.</strong><span>새로고침하거나 닫으면 작성한 내용이 사라집니다.</span></aside>
    <div className="manual-prototype-tools" role="group" aria-label="본문 서식">
      <Tool enabled={enabled} run={run} command="undo" label="실행 취소 (Ctrl / ⌘ Z)"><Arrow/></Tool>
      <Tool enabled={enabled} run={run} command="redo" label="다시 실행 (Ctrl / ⌘ Shift Z)"><Arrow redo/></Tool>
      <span className="manual-prototype-divider" aria-hidden="true"/>
      <label className="manual-prototype-block-type"><span className="manual-prototype-sr">문단 종류</span><select aria-label="문단 종류" value={blockKind(state)} disabled={!state} onChange={event=>run(event.target.value)}>{blockKind(state)==='mixed'&&<option value="mixed" disabled>여러 문단 종류</option>}<option value="paragraph" disabled={!!state&&!enabled('paragraph')&&blockKind(state)!=='paragraph'}>본문</option><option value="heading" disabled={!!state&&!enabled('heading')&&blockKind(state)!=='heading'}>소제목</option><option value="bulletList" disabled={!!state&&!enabled('bulletList')&&blockKind(state)!=='bulletList'}>글머리 목록</option><option value="orderedList" disabled={!!state&&!enabled('orderedList')&&blockKind(state)!=='orderedList'}>번호 목록</option></select></label>
      <span className="manual-prototype-divider" aria-hidden="true"/>
      <Tool enabled={enabled} run={run} command="strong" label="굵게 (Ctrl / ⌘ B)" pressed={markActive(state,'strong')}><strong aria-hidden="true">B</strong></Tool>
      <Tool enabled={enabled} run={run} command="emphasis" label="기울임 (Ctrl / ⌘ I)" pressed={markActive(state,'emphasis')}><em aria-hidden="true">I</em></Tool>
    </div>
    <main className="manual-prototype-writing" aria-label="문서 작성" onClick={event=>{if(!view.current?.dom.contains(event.target))view.current?.focus();}}>
      <div ref={mount} className="manual-prototype-editor"/>
    </main>
    <footer className="manual-prototype-footer"><span id="prototype-help">Enter 문단 추가 · Shift+Enter 줄바꿈</span><span role="status">{notice}</span></footer>
  </div>;
}
