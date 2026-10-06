import React, { useState,useRef } from 'react';
import './editor-shell.css';

// The editor slot is an actual Tiptap EditorContent supplied by the integration.
// This shell never keeps editable Manual content or a second undo stack.
export function EditorShell({ document, selectedPath, onSelect, editor, properties, preview,
  revision, savedRevision, validation = [], reviewStatus = '미확인', outputStatus,
  busy = false, isDirty, canUndo = false, canRedo = false, onUndo, onRedo, onSave, onDraft,
  onLoad, onOutput, onMove, onAdd, onDelete, onRestoreDraft, onDrop,interactionLocked=false,review, notice }) {
  const [view, setView] = useState('edit');
  const dragged=useRef(null);
  const dragProps=path=>({draggable:!busy,onDragStart:()=>{dragged.current=path;},onDragEnd:()=>{dragged.current=null;},onDragOver:event=>{if(dragged.current)event.preventDefault();},onDrop:event=>{event.preventDefault();if(dragged.current&&!busy)onDrop?.(dragged.current,path);dragged.current=null;}});
  const dirty = isDirty ?? revision !== savedRevision;
  const pageEntries = [
    ...(document?.cover ? [{ path: '/cover', title: document.cover.title, page: document.cover }] : []),
    ...(document?.pages ?? []).map((page, i) => ({ path: `/pages/${i}`, title: page.title, page }))
  ];
  const blocked = validation.length > 0;
  return <div className="manual-editor-shell" data-view={view} inert={interactionLocked}>
    <header className="manual-editor-header">
      <div><p className="manual-editor-eyebrow">LDS Manual · 로컬 저작</p><h1>{document?.title || '문서 열기'}</h1></div>
      <p className="manual-editor-save-state" role="status">{dirty ? '저장하지 않은 변경' : '저장 상태 일치'} · 편집 {revision ?? '—'}</p>
      <div className="manual-editor-actions">
        <button onClick={onLoad} disabled={busy || !onLoad}>열기</button>
        <button onClick={onUndo} disabled={busy || !canUndo}>실행 취소</button>
        <button onClick={onRedo} disabled={busy || !canRedo}>다시 실행</button>
        <button onClick={onDraft} disabled={busy || !onDraft}>초안 복구 저장</button>
        {onRestoreDraft&&<button onClick={onRestoreDraft} disabled={busy}>보관 초안 복원</button>}
        <button onClick={onSave} disabled={busy || blocked || !onSave}>정본 저장</button>
        <button onClick={onOutput} disabled={busy || blocked || dirty || !onOutput}>출력</button>
      </div>
    </header>
    {notice && <p className="manual-editor-notice" role="status">{notice}</p>}
    <nav className="manual-editor-view-switch" aria-label="작업 화면">
      <button aria-pressed={view === 'edit'} onClick={() => setView('edit')}>편집</button>
      <button aria-pressed={view === 'preview'} onClick={() => setView('preview')}>A4 미리보기</button>
    </nav>
    <div className="manual-editor-workspace">
      <nav className="manual-editor-outline" aria-label="문서 개요">
        <h2>문서 개요</h2>
        {pageEntries.map(({ path, title, page }, pageIndex) => <section key={path}>
          <button {...dragProps(path)} className="manual-editor-page-link" aria-current={selectedPath === path ? 'true' : undefined} onClick={() => onSelect(path)}>{String(pageIndex + 1).padStart(2, '0')} · {title || '제목 미작성'}</button>
          <ol>{(page.blocks ?? []).map((block, i) => {
            const blockPath = `${path}/blocks/${i}`;
            return <li key={blockPath}><button {...dragProps(blockPath)} aria-current={selectedPath === blockPath ? 'true' : undefined} onClick={() => onSelect(blockPath)}>{blockLabel(block)} <span>{block.type}</span></button></li>;
          })}</ol>
        </section>)}
      </nav>
      <section className="manual-editor-edit-pane" aria-label="블록 편집">
        <div className="manual-editor-block-actions" aria-label="선택한 블록 구성">
          <button onClick={onAdd} disabled={busy || !onAdd}>블록 추가</button>
          <button onClick={() => onMove(-1)} disabled={busy || !selectedPath || !onMove}>위로 이동</button>
          <button onClick={() => onMove(1)} disabled={busy || !selectedPath || !onMove}>아래로 이동</button>
          <button onClick={onDelete} disabled={busy || !selectedPath || !onDelete}>삭제</button>
        </div>
        {editor || <p role="status">Tiptap 편집 런타임 연결 대기</p>}
        {properties && <section className="manual-editor-properties" aria-label="선택 속성"><h2>속성</h2>{properties}</section>}
      </section>
      <section className="manual-editor-preview-pane" aria-label="A4 미리보기"><h2>A4 미리보기</h2>{preview}</section>
    </div>
    <aside className="manual-editor-review" aria-label="검토 및 출력 상태">
      <p>문구 검토: {reviewStatus} · {outputStatus || '현재 리비전 출력 없음'}</p>
      {review}
      {blocked && <><h2>현재 내용 미완성 · 정본 저장과 출력 제한</h2><ul>{validation.map((issue, i) => <li key={i}><button onClick={() => onSelect(issue.path)}>{issue.message}</button></li>)}</ul></>}
    </aside>
  </div>;
}
function blockLabel(block) {
  return block.title || block.text?.split('\n')[0] || block.caption || block.label || block.value || block.items?.[0]?.title || '구성 요소';
}
