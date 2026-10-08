import React, { useState, useRef, useEffect } from 'react';
import {EditorButton as Button} from './EditorButton.jsx';
import {EditorMenuBar} from './EditorMenuBar.jsx';
import './editor-shell.css';

export const blockNames = { paragraph:'본문', subheading:'소제목', address:'주소', quote:'인용문', list:'목록', steps:'절차', figure:'그림', table:'표', callout:'안내', help:'안내', columns:'화면과 설명' };
// Content and undo remain in Tiptap. The shell only arranges the working surfaces.
export function EditorShell({ previewZoom,onPreviewZoom,document, selectedPath, onSelect, editor, properties, preview,
  revision, savedRevision, validation = [], reviewIssues=validation, reviewStatus = '미확인', outputStatus,
  busy = false, isDirty, canUndo = false, canRedo = false, onUndo, onRedo, onSave, onDraft,
  onLoad, onOutput, onMove, onAdd, onAppendStep, onAddPage, onDelete, onRestoreDraft, onDownload, onDrop,
  interactionLocked=false, review, notice, connected=false, selectionRequest=0, localMode=false, onNew, onPrint, printDisabled=false, onPickImage, onNavigate }) {
  const [view, setView] = useState('preview');
  const [inspectorOpen,setInspectorOpen]=useState(false);
  const [panel, setPanel] = useState(null);
  const [outlineOpen,setOutlineOpen]=useState(()=>!window.matchMedia('(max-width:600px)').matches);
  const dialog=useRef(null), dragged=useRef(null);
  useEffect(()=>{if(selectionRequest){setView('edit');setInspectorOpen(true);setPanel(null);}},[selectionRequest]);
  useEffect(()=>{if(panel)dialog.current?.showModal();else dialog.current?.close();},[panel]);
  const dirty = isDirty ?? revision !== savedRevision;
  const pageEntries = [
    ...(document?.cover ? [{ path:'/cover', title:document.cover.title, page:document.cover }] : []),
    ...(document?.pages ?? []).map((page,i)=>({path:`/pages/${i}`,title:page.title,page}))
  ];
  const selectedPage=pageEntries.find(entry=>selectedPath===entry.path||selectedPath.startsWith(entry.path+'/'));
  const selectedValue=selectedPath.split('/').filter(Boolean).reduce((v,key)=>v?.[key],document);
  const selectionName=selectedPath==='/'?'문서 제목':selectedPath===selectedPage?.path?'페이지 제목':blockNames[selectedValue?.type]||(selectedValue&&typeof selectedValue==='object'&&'src' in selectedValue?'그림':selectedValue?.label!==undefined?'항목':selectedPath.includes('/items/')?'단계':'내용');
  const blocked=validation.length>0;
  const path=selectedPath.split('/').filter(Boolean), index=Number(path.at(-1));
  const siblings=path.slice(0,-1).reduce((v,key)=>v?.[key],document);
  const sortable=Array.isArray(siblings)&&/^\d+$/.test(path.at(-1)||'');
  const removable=sortable&&!(path.length===2&&path[0]==='pages'&&siblings.length===1);
  const choose=path=>{if(window.matchMedia('(max-width:600px)').matches)setOutlineOpen(false);if(path!=='/'&&onNavigate){onNavigate(path);return;}onSelect(path);setView('edit');setInspectorOpen(true);};
  const dragProps=path=>({draggable:!busy,onDragStart:()=>{dragged.current=path;},onDragEnd:()=>{dragged.current=null;},onDragOver:event=>{if(dragged.current)event.preventDefault();},onDrop:event=>{event.preventDefault();if(dragged.current&&!busy)onDrop?.(dragged.current,path);dragged.current=null;}});
  const menus=[
    {label:'파일',items:[
      ...(onNew?[{label:'새 문서',onClick:onNew,disabled:busy}]:[]),
      ...(onLoad?[{label:'열기…',onClick:onLoad,disabled:busy}]:[]),
      {label:'저장',shortcut:'Ctrl / ⌘ S',onClick:onSave,disabled:busy||!onSave||(connected&&blocked)},
      ...(onDraft?[{label:'초안 복구 저장',onClick:onDraft,disabled:busy}]:[]),
      ...(onRestoreDraft?[{label:'보관 초안 복원',onClick:onRestoreDraft,disabled:busy}]:[]),
      {divider:true},{label:'문서 파일 내려받기',onClick:onDownload,disabled:busy||!onDownload},
      ...(onPrint?[{label:'인쇄 / PDF…',onClick:onPrint,disabled:busy||printDisabled,description:printDisabled?'A4 보기에서 문서 오류와 분량을 확인하세요.':undefined}]:[]),
      ...(onOutput?[{label:'내보내기…',onClick:()=>setPanel('output'),disabled:busy}]:[]),
    ]},
    {label:'편집',items:[
      {label:'실행 취소',shortcut:'Ctrl / ⌘ Z',onClick:onUndo,disabled:busy||!canUndo},
      {label:'다시 실행',shortcut:'Ctrl / ⌘ Shift Z',onClick:onRedo,disabled:busy||!canRedo},
      {divider:true},{label:'문서 제목 변경',onClick:()=>choose('/'),disabled:busy},
      {label:'선택한 내용 위로 이동',onClick:()=>onMove(-1),disabled:busy||!onMove||!sortable||index===0},
      {label:'선택한 내용 아래로 이동',onClick:()=>onMove(1),disabled:busy||!onMove||!sortable||index===siblings.length-1},
      {label:'선택한 내용 삭제',danger:true,onClick:onDelete,disabled:busy||!onDelete||!removable},
    ]},
    {label:'보기',items:[
      {label:'페이지 목록',variant:'checkbox',checked:outlineOpen,onClick:()=>setOutlineOpen(value=>!value)},
      {label:'선택 항목 속성',variant:'checkbox',checked:inspectorOpen,onClick:()=>{setInspectorOpen(value=>!value);setView('edit');}},
      {divider:true},
      ...[['write','작성 보기'],['fit','A4 맞춤'],['1','100%']].map(([value,label])=>({label,variant:'radio',checked:previewZoom===value,onClick:()=>onPreviewZoom(value)})),
      {divider:true},{label:reviewIssues.length?`확인할 문제 (${reviewIssues.length})`:'문서 검토',onClick:()=>setPanel('review')},
    ]},
    {label:'삽입',items:[
      {label:'페이지',onClick:onAddPage,disabled:busy||!onAddPage},{divider:true},
      ...Object.entries(blockNames).filter(([type])=>type!=='help').map(([type,label])=>({label:type==='figure'?'이미지…':label,onClick:type==='figure'?onPickImage:()=>onAdd(type),disabled:busy||!onAdd})),
      ...(onAppendStep?[{divider:true},{label:'다음 단계',onClick:onAppendStep,disabled:busy}]:[]),
    ]},
  ];
  return <div className="manual-editor-shell" data-view={view} data-inspector={inspectorOpen} data-outline={outlineOpen} inert={interactionLocked}>
    <header className="manual-editor-header">
      <button className="manual-editor-pages-toggle" aria-expanded={outlineOpen} onClick={()=>setOutlineOpen(value=>!value)}>페이지</button><span className="manual-editor-wordmark">Manual<span> / LDS</span></span>
      <button className="manual-editor-document-title" onClick={()=>choose('/')} title={document?.title+" · 문서 제목 변경"}>{document?.title || '제목 없는 매뉴얼'}</button>
      <span className="manual-editor-save-state" role="status">{dirty?'변경됨':connected?'저장됨':savedRevision===0?'저장 전':'브라우저 저장됨'}</span>
      <EditorMenuBar menus={menus} locked={busy||interactionLocked}/>
    </header>
    <div className="manual-editor-quick-tools" role="group" aria-label="자주 쓰는 편집 도구">
      <Button size="sm" variant="ghost" iconOnly aria-label="실행 취소" title="실행 취소 (Ctrl / ⌘ Z)" onClick={onUndo} disabled={busy||!canUndo}><span aria-hidden="true">↶</span></Button>
      <Button size="sm" variant="ghost" iconOnly aria-label="다시 실행" title="다시 실행 (Ctrl / ⌘ Shift Z)" onClick={onRedo} disabled={busy||!canRedo}><span aria-hidden="true">↷</span></Button>
      <span className="manual-editor-tool-divider" aria-hidden="true"/>
      <Button size="sm" variant="primary" onClick={onSave} disabled={busy||!onSave||(connected&&blocked)} title="저장 (Ctrl / ⌘ S)">저장</Button>
      <Button size="sm" variant="ghost" onClick={onPickImage} disabled={busy||!onPickImage}>이미지 넣기</Button>
      <span className="manual-editor-tool-context">{selectedPage?`${pageEntries.indexOf(selectedPage)+1}쪽`:'문서'}</span>
    </div>
    <div className="manual-editor-workspace">
      <nav className="manual-editor-outline" aria-label="문서 개요">
        <div className="manual-editor-section-heading"><h2>페이지</h2><span>{pageEntries.length}</span></div>
        {pageEntries.map(({path,title,page},pageIndex)=><section key={path} className={selectedPage?.path===path?'is-active':''}>
          <button {...dragProps(path)} className="manual-editor-page-link" title={title} data-path={path} aria-current={selectedPath===path?'true':undefined} onClick={()=>choose(path)}>
            <span className="manual-editor-page-thumbnail" aria-hidden="true"><strong>{String(pageIndex+1).padStart(2,'0')}</strong></span>
            <span><span className="manual-editor-page-title">{title||'제목 미작성'}</span><small>{path==='/cover'?'표지':`${page.blocks?.length??0}개 내용`}</small></span>
          </button>
          {selectedPage?.path===path&&<ol>{(page.blocks??[]).map((block,i)=>{const blockPath=`${path}/blocks/${i}`;const activeStep=block.type==='steps'&&selectedPath.startsWith(blockPath+'/items/')?Number(selectedPath.slice((blockPath+'/items/').length).split('/')[0])+1:null;return <li key={blockPath}>
            <button {...dragProps(blockPath)} data-path={blockPath} aria-current={selectedPath===blockPath||selectedPath.startsWith(blockPath+'/')?'true':undefined} onClick={()=>choose(blockPath)}><span>{blockNames[block.type]||'내용'}</span>{activeStep?`${activeStep}단계 · ${block.items[activeStep-1]?.title||'제목 미작성'}`:blockLabel(block)}</button>
          </li>;})}</ol>}
        </section>)}
        <p className="manual-editor-outline-hint">페이지를 끌어 순서를 바꿀 수 있습니다.</p>
      </nav>
      <section className="manual-editor-preview-pane" aria-label="A4 미리보기">
        {preview}
      </section>
      <section className="manual-editor-edit-pane" aria-label="블록 편집" inert={busy||undefined}>
        <div className="manual-editor-section-heading"><h2>{selectionName} 속성</h2><button className="manual-editor-pane-close" onClick={()=>{setView('preview');setInspectorOpen(false);}}>닫기</button></div>
        <p className="manual-editor-edit-hint">입력하면 문서에 바로 반영됩니다.</p>
        {editor}
        {properties&&<details className="manual-editor-properties" aria-label="선택 속성" open={selectedValue?.src&&validation.some(issue=>issue.path===selectedPath||issue.path?.startsWith(selectedPath+'/'))||undefined}><summary>세부 설정</summary>{properties}</details>}

        {selectedPath!=='/'&&<div className="manual-editor-block-actions" aria-label="선택한 블록 구성"><button onClick={()=>onMove(-1)} disabled={busy||!onMove||!sortable||index===0}>위로 이동</button><button onClick={()=>onMove(1)} disabled={busy||!onMove||!sortable||index===siblings.length-1}>아래로 이동</button><button className="manual-editor-destructive" onClick={onDelete} disabled={busy||!onDelete||!removable}>삭제</button></div>}
      </section>
    </div>
    <footer className="manual-editor-statusbar"><span>{connected?'폴더에 연결됨':'저장 위치: 이 브라우저'}</span><p className="manual-editor-notice" role="status">{notice}</p>{reviewIssues.length>0&&<button onClick={()=>setPanel('review')}>{reviewIssues.length}개 확인 필요</button>}</footer>
    <dialog ref={dialog} className="manual-editor-review-dialog" aria-labelledby="manual-review-heading" onCancel={()=>setPanel(null)} onClick={event=>{if(event.target===dialog.current)setPanel(null);}}>
      <div className="manual-editor-section-heading"><h2 id="manual-review-heading">{panel==='output'?'내보내기':'문서 검토'}</h2><Button size="sm" variant="ghost" onClick={()=>setPanel(null)}>닫기</Button></div>
      <aside className="manual-editor-review" aria-label="검토 및 출력 상태"><p>문구 검토: {reviewStatus} · {outputStatus||'아직 출력하지 않았습니다.'}</p>
        {onOutput&&<Button size="sm" variant="primary" onClick={onOutput} disabled={busy||blocked||dirty}>출력</Button>}{review}
        {reviewIssues.length>0&&<><h2>확인할 내용</h2><ul>{reviewIssues.map((issue,i)=><li key={i}><button onClick={()=>{onSelect(issue.path);setPanel(null);}}>{issue.path?.startsWith('/pages/')?`${Number(issue.path.split('/')[2])+1+(document.cover?1:0)}쪽 · `:issue.path?.startsWith('/cover')?'표지 · ':''}{issue.message}</button></li>)}</ul></>}
      </aside>
    </dialog>
  </div>;
}
function blockLabel(block){return block.title||block.text?.split('\n')[0]||block.caption||block.label||block.value||block.items?.[0]?.title||'내용 작성';}
