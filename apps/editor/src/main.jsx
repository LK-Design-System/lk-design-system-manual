import {EditorButton as Button} from './ui/EditorButton.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useEditor,EditorContent} from '@tiptap/react';
import {Node,Extension} from '@tiptap/core';
import {Plugin,PluginKey,TextSelection} from '@tiptap/pm/state';
import {history,closeHistory,undo,redo} from '@tiptap/pm/history';
import {createManualExtensions} from './editor/custom-nodes.mjs';
import {toEditorJSON,fromEditorJSON,findEditorNode} from './manual-adapter/index.mjs';
import {withManualNodeViews,pathAtPosition,FocusedContent} from './editor/ui-node-views.jsx';
import {replaceManualText} from './editor/direct-edit.mjs';
import {planCanvasMove} from './editor/canvas-move.mjs';
import {planCanvasDelete} from './editor/canvas-delete.mjs';
import {planCanvasKey,applyCanvasPlan,setCanvasSelection,canvasSelection} from './editor/canvas-commands.mjs';
import {saveBrowserDocument,listBrowserDocuments,decodeBrowserFile,imageData} from './ui/browser-documents.mjs';
import {BrowserLibrary} from './ui/BrowserLibrary.jsx';
import {EditorShell} from './ui/EditorShell.jsx';
import {A4Preview} from './ui/A4Preview.jsx';
import {Properties} from './ui/Properties.jsx';
import {ReviewPanel} from './ui/ReviewPanel.jsx';
import {OutputDetails} from './ui/OutputDetails.jsx';
import {ReplaceProtection} from './ui/ReplaceProtection.jsx';
import {collectFigures,validateBrowserAssets,normalizePath} from './ui/asset-validation.mjs';
import {canSplitStepsAt} from './ui/step-controls.mjs';
import '@lk-design-system/lds-core/styles.css';
import '@lk-design-system/lds-theme/styles.css';
import './ui/editor-content.css';
const demo={schemaVersion:1,title:'매뉴얼 작성 예제',lang:'ko',pages:[{title:'목록에서 항목 확인하기',blocks:[{type:'paragraph',text:'목록에서 확인할 항목을 선택합니다.'},{type:'subheading',text:'목록 확인 안내'},{type:'steps',start:1,items:[{title:'항목 선택하기',text:'목록에서 확인할 항목을 선택합니다.'},{title:'내용 확인하기',text:'상세 화면에서 제목과 내용을 확인합니다.'}]},{type:'callout',title:'작성 팁',text:'이 문서에서 글을 선택하고 내용을 바꿔 보세요.',tone:'signal'}]}]};
const templates={paragraph:{type:'paragraph',text:''},subheading:{type:'subheading',text:''},address:{type:'address',value:'example.invalid'},quote:{type:'quote',text:'인용할 내용을 작성합니다.'},list:{type:'list',items:['']},steps:{type:'steps',start:1,items:[{title:'',text:''}]},figure:{type:'figure',src:'assets/screen.png',alt:'화면 설명',caption:'그림 설명'},table:{type:'table',label:'안내 표',headers:['항목','설명'],rows:[['항목','설명']]},callout:{type:'callout',title:'보충 안내',text:'필요한 안내를 작성합니다.',tone:'signal'},columns:{type:'columns',figure:{src:'assets/screen.png',alt:'화면 설명',caption:'그림 설명'},blocks:[{type:'paragraph',text:'화면을 설명합니다.'}]}};
const parsePath=path=>path.split('/').filter(Boolean).map(key=>/^\d+$/.test(key)?Number(key):key);
const at=(document,path)=>path.reduce((value,key)=>value?.[key],document);
function placementCurrent(document,record){const paths=[];function blocks(items,path){items.forEach((block,i)=>{const p=`${path}[${i}]`;if(['callout','help'].includes(block.type))paths.push(p);if(block.type==='columns')blocks(block.blocks,p+'.blocks');});}if(document.cover)blocks(document.cover.blocks,'cover.blocks');document.pages.forEach((page,i)=>blocks(page.blocks,`pages[${i}].blocks`));return paths.every(path=>record?.placementReview?.some(row=>row.id===path&&['KEEP','MOVE'].includes(row.decision)&&['role','relatedAction','placement','reason'].every(key=>row[key]?.trim())));}
function App(){
  const [editorInput,setEditorInput]=useState(()=>toEditorJSON(demo));
  const autoLoaded=useRef(false);
  const [snapshot,setSnapshot]=useState({document:demo,sidecars:{}});
  const [revision,setRevision]=useState(0),[savedRevision,setSavedRevision]=useState(0);
  const [valid,setValid]=useState({document:demo,revision:0});
  const [candidate,setCandidate]=useState({document:demo,revision:0});
  const [issues,setIssues]=useState([]),[selected,setSelected]=useState('/pages/0');
  const [assetIssues,setAssetIssues]=useState([]),[assetsChecking,setAssetsChecking]=useState(false);
  const [validationAuthority,setValidationAuthority]=useState('host 미연결');
  const [replacement,setReplacement]=useState(null),[conflict,setConflict]=useState(false),[loadFailure,setLoadFailure]=useState(null);
  const [jobs,setJobs]=useState([]);
  const loadSequence=useRef(0),assetCache=useRef({}),assetValidation=useRef(null);
  const selecting=useRef(false),replacementDraft=useRef(null);
  const [serverError,setServerError]=useState(null);
  const [notice,setNotice]=useState('글을 눌러 바로 입력하세요. Enter는 다음 문단, Shift+Enter는 줄바꿈입니다.');
  const [hostState,setHostState]=useState(null),[busy,setBusy]=useState(false),[output,setOutput]=useState(null);
  const [dirty,setDirty]=useState(false);const savedDocument=useRef(JSON.stringify(demo));
  const [assetUrls,setAssetUrls]=useState({});
  const [exportFormat,setExportFormat]=useState('html'),[exportMode,setExportMode]=useState('draft');
  const [layout,setLayout]=useState(null);
  const seq=useRef(0),session=useRef(globalThis.__LDS_MANUAL_SESSION?.token||new URLSearchParams(location.hash.slice(1)).get('token'));
  const [paste,setPaste]=useState(null);
  const [selectionRequest,setSelectionRequest]=useState(0);
  const [previewZoom,setPreviewZoom]=useState(()=>window.matchMedia('(max-width:600px)').matches?'write':'fit');
  const [focusRequest,setFocusRequest]=useState(null),[printRequest,setPrintRequest]=useState(0),[library,setLibrary]=useState(null);
  const canvasFlush=useRef(()=>Promise.resolve());
  const browserId=useRef(crypto.randomUUID()),browserInit=useRef(false),imagePicker=useRef(null),imageTarget=useRef(null),lastEdit=useRef(null);
  const [browserReady,setBrowserReady]=useState(false);
  useEffect(()=>{if(session.current)window.history.replaceState(null,'',location.pathname+location.search);},[]);
  const runtime=useRef({Node,Extension,Plugin,PluginKey,TextSelection,history,closeHistory,undo,redo,onError:error=>setNotice(error.message),onUnsupportedPaste:event=>{const text=event.clipboardData?.getData('text/plain');setPaste(text??'');setNotice('서식이나 파일 붙여넣기는 지원하지 않습니다. 일반 텍스트로 넣을지 선택해 주세요.');}});
  const editor=useEditor({extensions:withManualNodeViews(createManualExtensions(runtime.current)),content:editorInput,onUpdate:({editor})=>{
    const next=fromEditorJSON(editor.getJSON(),{validate:false});
    setSnapshot(next);setDirty(JSON.stringify(next.document)!==savedDocument.current);const current=++seq.current;setRevision(current);
    try{const validated=fromEditorJSON(editor.getJSON());setCandidate({document:validated.document,revision:current});setIssues([]);}catch(error){setIssues([{path:normalizePath(error.message.split(':')[0]),message:error.message}]);}
  }},[editorInput]);
  function restoreBrowser(record){
    const json=toEditorJSON(record.document,{sidecars:record.sidecars||{},validate:false});
    browserId.current=record.id||crypto.randomUUID();assetCache.current=record.assets||{};setAssetUrls(assetCache.current);
    setEditorInput(json);setSnapshot({document:record.document,sidecars:json.attrs.sidecars});setSelected('/pages/0');
    savedDocument.current=JSON.stringify(record.document);setDirty(false);const current=++seq.current;setRevision(current);setSavedRevision(current);
    try{fromEditorJSON(json);setCandidate({document:record.document,revision:current});setIssues([]);}catch(error){setIssues([{path:'/',message:error.message}]);}
    setLibrary(null);setNotice('이 브라우저에 저장된 문서를 열었습니다.');
  }
  useEffect(()=>{if(!editor||browserInit.current)return;browserInit.current=true;if(session.current){setBrowserReady(true);return;}
    listBrowserDocuments().then(records=>{if(records.length&&seq.current===0)restoreBrowser(records[0]);}).catch(error=>setNotice('브라우저 저장을 읽을 수 없습니다. '+error.message)).finally(()=>setBrowserReady(true));
  },[editor]);
  async function saveLocal(){
    if(!editor)return false;try{await canvasFlush.current();}catch(error){setNotice(error.message);return false;}const version=seq.current;setBusy(true);
    try{const value=fromEditorJSON(editor.getJSON(),{validate:false});await saveBrowserDocument({id:browserId.current,savedAt:Date.now(),...value,assets:assetCache.current});
      savedDocument.current=JSON.stringify(value.document);setSavedRevision(version);if(seq.current===version)setDirty(false);setNotice('이 브라우저에 저장했습니다. 이미지도 함께 보관됩니다.');return true;
    }catch(error){setNotice('브라우저에 저장하지 못했습니다. 문서 파일을 내려받아 보관하세요. '+error.message);return false;}finally{setBusy(false);}
  }
  async function openLocal(){try{await canvasFlush.current();}catch(error){setNotice(error.message);return;}if(JSON.stringify(fromEditorJSON(editor.getJSON(),{validate:false}).document)!==savedDocument.current&&!await saveLocal())return;try{setLibrary(await listBrowserDocuments());}catch(error){setNotice(error.message);}}
  async function importLocal(file){try{if(file.size>50*1024*1024)throw new Error('50MB 이하의 문서 파일을 선택하세요.');const record=decodeBrowserFile(JSON.parse(await file.text()));toEditorJSON(record.document,{sidecars:record.sidecars,validate:false});restoreBrowser(record);savedDocument.current=null;setDirty(true);setNotice('문서 파일을 열었습니다. 저장을 누르면 이 브라우저에 보관됩니다.');}catch(error){return error instanceof SyntaxError?'문서 파일을 읽을 수 없습니다. JSON 형식의 문서 파일을 선택하세요.':error.message;}}
  async function newLocal(){try{await canvasFlush.current();}catch(error){setNotice(error.message);return;}if(JSON.stringify(fromEditorJSON(editor.getJSON(),{validate:false}).document)!==savedDocument.current&&!await saveLocal())return;restoreBrowser({document:{schemaVersion:1,title:'새 매뉴얼',lang:'ko',pages:[{title:'시작하기',blocks:[{type:'paragraph',text:''}]}]},assets:{},sidecars:{}});savedDocument.current=null;setDirty(true);setNotice('문서에서 글을 눌러 바로 작성하세요.');}
  async function downloadBrowser(){try{await canvasFlush.current();}catch(error){setNotice(error.message);return;}const value=fromEditorJSON(editor.getJSON(),{validate:false});const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify({format:'lds-manual-browser/v1',...value,assets:assetCache.current},null,2)],{type:'application/json'}));link.download='manual-document.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
  function focusCanvas(point){if(point)setFocusRequest({path:'/'+point.path.join('/'),offset:point.offset||0,revision:seq.current,id:crypto.randomUUID()});}
  async function toolbarHistory(redo){try{await canvasFlush.current();canvasHistory(redo);}catch(error){setNotice(error.message);}}
  function canvasHistory(redo){
    redo?editor.commands.manualRedo():editor.commands.manualUndo();
    focusCanvas(canvasSelection(editor));
  }
  async function appendContent(path){
    try{await canvasFlush.current();}catch(error){setNotice(error.message);return;}
    const parts=parsePath(path),current=fromEditorJSON(editor.getJSON(),{validate:false}).document;
    if(parts.at(-2)==='items'&&at(current,parts.slice(0,-2))?.type==='steps'){
      const index=parts.at(-1)+1;
      if(operation({type:'insert',path:parts.slice(0,-1),index,value:{title:'',text:''}}))focusCanvas({path:[...parts.slice(0,-1),index,'title']});
    }
  }
  async function insertImage(file,path=selected){
    try{await canvasFlush.current();}catch(error){setNotice(error.message);return;}
    setBusy(true);
    try{
      const data=await imageData(file);const image=new Image();image.src=data;await image.decode();
      let src=`assets/${crypto.randomUUID()}.${file.type==='image/jpeg'?'jpg':file.type.split('/')[1]}`;
      if(session.current){const result=await request('/api/assets',{expectedRevision:hostState.revision,name:file.name,bytesBase64:data.split(',')[1]});src=result.src;setHostState(await request('/api/document'));}
      assetCache.current={...assetCache.current,[src]:data};setAssetUrls(assetCache.current);
      const parts=parsePath(path||selected),current=fromEditorJSON(editor.getJSON(),{validate:false}).document,item=at(current,parts);
      const figure={src,alt:file.name||'스크린샷',caption:'화면 설명을 입력하세요.',size:'compact'};
      if(item?.src){operation({type:'set',path:[...parts,'src'],value:src});}
      else if(parts.at(-2)==='items'&&at(current,parts.slice(0,-2))?.type==='steps')operation({type:'set',path:[...parts,'figure'],value:figure});
      else{const page=parts[0]==='cover'?['cover']:['pages',Number(parts[1])||0],blocks=parts.at(-2)==='blocks'?parts.slice(0,-1):[...page,'blocks'];const index=parts.at(-2)==='blocks'?parts.at(-1)+1:at(current,blocks).length;operation({type:'insert',path:blocks,index,value:{type:'figure',...figure}});}
      setNotice('이미지를 넣었습니다. 그림 아래에서 설명을 바로 입력하세요.');
    }catch(error){setNotice(error.message);}finally{setBusy(false);}
  }
  function canvasAction(message){
    if(busy||loadFailure||replacement||!browserReady)return;
    try{
      if(message.kind==='element-select'){
        setSelected(message.path);
        selecting.current=true;
        try{
          const found=findEditorNode(editor.getJSON(),parsePath(message.path));let position=null;
          editor.state.doc.nodesBetween(found.pos,found.pos+found.size,(node,pos)=>{if(position===null&&node.type.name==='manualString')position=pos+1;});
          if(position!==null)editor.commands.setTextSelection(position);
        }finally{selecting.current=false;}
        return;
      }
      if(message.kind==='delete-element'){
        if(message.revision!==seq.current){setNotice('문서가 갱신되어 삭제하지 않았습니다. 요소를 다시 선택해 주세요.');return;}
        const plan=planCanvasDelete(fromEditorJSON(editor.getJSON(),{validate:false}).document,message.path);
        if(plan&&operation(plan.operation)){
          setSelected(plan.path);setFocusRequest({path:plan.path,handle:plan.handle,element:!plan.handle,revision:seq.current,id:crypto.randomUUID()});
          setNotice('선택한 요소를 삭제했습니다. 실행 취소로 복원할 수 있습니다.');
        }
        return;
      }
      if(message.kind==='canvas-select'){if(message.path)setSelected(message.path);return;}
      if(message.kind==='edit-start'){lastEdit.current=null;return;}
      if(message.kind==='text'||message.kind==='caret'){
        selecting.current=true;
        try{
          const path=parsePath(message.path);
          if(message.kind==='text'){
            const current=fromEditorJSON(editor.getJSON(),{validate:false}).document;
            if(at(current,path)===undefined&&message.text)operation({type:'set',path,value:message.text});
            else if(at(current,path)!==undefined)replaceManualText(editor,path,message.text,{TextSelection,closeHistory},lastEdit.current!==message.path);
            lastEdit.current=message.path;
          }
          if(Number.isInteger(message.start)&&at(fromEditorJSON(editor.getJSON(),{validate:false}).document,path)!==undefined)setCanvasSelection(editor,path,message.start,message.end,{TextSelection});
        }finally{selecting.current=false;}return;
      }
      if(message.kind==='move'){
        if(message.revision!==seq.current){setNotice('문서가 갱신되어 이동하지 않았습니다. 새 위치를 확인한 뒤 다시 끌어 주세요.');return;}
        const current=fromEditorJSON(editor.getJSON(),{validate:false}).document;
        const plan=planCanvasMove(current,message.path,message.collection,message.gap);
        if(plan&&operation(plan.operation)){setSelected(plan.path);setFocusRequest({path:plan.path,handle:true,revision:seq.current,id:crypto.randomUUID()});setNotice('내용을 이동했습니다. 실행 취소로 되돌릴 수 있습니다.');}
        return;
      }
      if(message.kind==='key'){
        const path=parsePath(message.path),current=fromEditorJSON(editor.getJSON(),{validate:false}).document;
        const plan=planCanvasKey(current,{...message,path});
        if(plan&&applyCanvasPlan(editor,plan,runtime.current))focusCanvas(plan.focus);
        else focusCanvas({path,offset:message.start});
        return;
      }
      if(message.kind==='notice'){setNotice(message.message);return;}
      if(message.kind==='save'){session.current?save():saveLocal();return;}
      if(message.kind==='history'){canvasHistory(message.redo);return;}
      if(message.kind==='empty-page'){const path=[...parsePath(message.path),'blocks'];if(operation({type:'insert',path,index:0,value:{type:'paragraph',text:''}}))focusCanvas({path:[...path,0,'text']});return;}
      if(message.kind==='append'){appendContent(message.path,message.offset);return;}
      if(message.kind==='image'){insertImage(message.file,message.path);return;}
      if(message.kind==='pick-image'){imageTarget.current=message.path;imagePicker.current.click();}
    }catch(error){setNotice(error.message);}
  }
  async function request(path,body,signal){
    if(!session.current)throw new Error('선택한 문서 host에 연결되지 않았습니다.');
    const response=await fetch(path,{signal,method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.current}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const value=await response.json();if(!response.ok){const error=new Error(value.message||value.error?.message||`요청 실패 ${response.status}`);error.details=value.error?.details;error.code=value.error?.code;error.status=response.status;throw error;}return value;
  }
  async function load(){
    const generation=++loadSequence.current;let loaded;
    setBusy(true);
    try{loaded=await request('/api/document');
      const json=toEditorJSON(loaded.document,{sidecars:{'sources.json':loaded.sources,'copy-review.json':loaded.copyReview},validate:false});
      const urls={};for(const asset of loaded.validation?.assets||[]){if(urls[asset.src])continue;const response=await fetch(`/api/asset?src=${encodeURIComponent(asset.src)}`,{headers:{Authorization:`Bearer ${session.current}`}});if(response.ok)urls[asset.src]=URL.createObjectURL(await response.blob());}
      if(generation!==loadSequence.current)return false;
      assetCache.current=urls;assetValidation.current=null;setAssetUrls(urls);setLoadFailure(null);setConflict(false);setServerError(null);setReplacement(null);
      setEditorInput(json);setSnapshot({document:loaded.document,sidecars:json.attrs.sidecars});setHostState(loaded);savedDocument.current=JSON.stringify(loaded.document);setDirty(false);
      const current=++seq.current;setRevision(current);setSavedRevision(current);
      setAssetIssues((loaded.validation?.errors||[]).filter(issue=>issue.code!=='SCHEMA'));
      try{fromEditorJSON(json);setCandidate({document:loaded.document,revision:current});setIssues((loaded.validation?.errors||[]).filter(issue=>issue.code==='SCHEMA'));}catch(error){setIssues([{path:normalizePath(error.message.split(':')[0]),message:error.message}]);}
      setNotice('문서를 불러왔습니다. 기존 검토와 승인 이력은 현재 편집 승인으로 자동 변경하지 않습니다.');
      refreshJobs();return true;
    }catch(error){if(generation===loadSequence.current){setLoadFailure({title:loaded?.document?.title||'현재 host의 문서',reason:error.message});setHostState(null);setNotice('선택한 문서를 편집할 수 없습니다. 원본은 보존되고 이전 유효 미리보기와 편집 대상은 구별됩니다.');}return false;}finally{if(generation===loadSequence.current)setBusy(false);}
  }
  useEffect(()=>{
    const controller=new AbortController();
    if(!session.current){
      const missing=collectFigures(candidate.document).filter(f=>f.src!=='@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg'&&!assetCache.current[f.src]);
      if(missing.length){setAssetsChecking(false);setAssetIssues(missing.map(f=>({path:normalizePath(f.path),message:'그림을 선택해 이미지를 넣어 주세요.'})));return;}
      setAssetsChecking(true);
      validateBrowserAssets(candidate.document,{urls:assetCache.current,signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;setAssetIssues(result.errors);if(!result.errors.length)setValid(candidate);}).catch(error=>{if(error.name!=='AbortError')reportError(error);}).finally(()=>{if(!controller.signal.aborted)setAssetsChecking(false);});
      return()=>controller.abort();
    }
    if(!hostState||loadFailure)return;
    const key=JSON.stringify({diskRevision:hostState?.revision,figures:collectFigures(candidate.document).map(({src,crop,path})=>({src,crop,path}))});
    setAssetsChecking(true);
    (async()=>{
      const response=await request('/api/validate',{expectedRevision:hostState.revision,document:candidate.document},controller.signal);
      const authoritative=response.validation;setValidationAuthority('현재 host · schema/원본/crop 검사');
      if(!authoritative||!Array.isArray(authoritative.errors))throw new Error('현재 host의 검증 계약을 확인합니다. 서버 재시작이 필요할 수 있습니다.');
      if(!authoritative.valid)return {errors:authoritative.errors,urls:assetCache.current};
      if(assetValidation.current?.key===key&&!assetValidation.current.errors.length)return {errors:[],urls:assetCache.current};
      return validateBrowserAssets(candidate.document,{token:session.current,urls:assetCache.current,signal:controller.signal});
    })().then(result=>{if(controller.signal.aborted)return;assetCache.current=result.urls;assetValidation.current={key,errors:result.errors};setAssetUrls(old=>JSON.stringify(old)===JSON.stringify(result.urls)?old:result.urls);setAssetIssues(result.errors.filter(issue=>issue.code!=='SCHEMA'));if(result.errors.some(issue=>issue.code==='SCHEMA'))setIssues(result.errors.filter(issue=>issue.code==='SCHEMA'));if(!result.errors.length)setValid(candidate);}).catch(error=>{if(error.name!=='AbortError'){setAssetIssues([{path:'/',message:error.message}]);if(error.status===409)reportError(error);}}).finally(()=>{if(!controller.signal.aborted)setAssetsChecking(false);});
    return()=>controller.abort();
  },[candidate,hostState?.revision,loadFailure,assetUrls]);
  useEffect(()=>{if(editor&&session.current&&!autoLoaded.current){autoLoaded.current=true;load();}},[editor]);
  function select(path){
    path=normalizePath(path);
    // Asset errors point at src/crop fields; keep the owning figure's correction controls available.
    const figure=collectFigures(snapshot.document).find(value=>{const owner=normalizePath(value.path);return path===owner||path.startsWith(owner+'/');});
    if(figure)path=normalizePath(figure.path);
    setSelected(path);setSelectionRequest(value=>value+1);
    selecting.current=true;try{const found=findEditorNode(editor.getJSON(),parsePath(path));let position=null;editor.state.doc.descendants((node,pos)=>{if(position===null&&node.type.name==="manualString"&&pos>=found.pos&&pos<found.pos+found.size)position=pos+1;});if(position!==null)editor.commands.setTextSelection(position);editor.commands.focus();}catch(error){setNotice(error.message);}finally{selecting.current=false;}
  }
  useEffect(()=>{if(!editor)return;const choose=({path})=>select('/'+path.join('/'));editor.on('manualUiSelect',choose);return()=>editor.off('manualUiSelect',choose);},[editor]);
  function syncSelection(){if(selecting.current)return;const from=editor.state.selection.$from;for(let depth=from.depth;depth>0;depth--){if(['manualBlock','manualStep','manualFigure','manualPage','manualCover','manualDocument','manualRecord'].includes(from.node(depth).type.name)){const path=pathAtPosition(editor,from.before(depth));if(path){const next='/'+path.join('/');if(!selected.includes('/blocks/')||!(next===selected||next.startsWith(selected+'/')))setSelected(next);}break;}}}
  useEffect(()=>{if(!editor)return;editor.on('selectionUpdate',syncSelection);return()=>editor.off('selectionUpdate',syncSelection);},[editor,selected]);
  useEffect(()=>{const protect=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[dirty]);
  useEffect(()=>{if(editor)editor.setEditable(!busy&&!loadFailure&&!replacement,false);},[editor,busy,loadFailure,replacement]);
  useEffect(()=>{const key=event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();if(!busy&&!replacement&&!loadFailure&&browserReady&&!event.isComposing)(session.current?save():saveLocal());}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
  function operation(operation){if(busy||loadFailure||replacement)return false;if(editor.view.composing){setNotice('한글 조합을 마친 뒤 다시 실행해 주세요.');return false;}return editor.commands.applyManualOperation(operation);}
  async function addBlock(type='paragraph'){try{await canvasFlush.current();}catch(error){setNotice(error.message);return;}if(type==='figure'){imageTarget.current=selected;imagePicker.current.click();return;}const path=parsePath(selected);const page=path[0]==='cover'?['cover']:['pages',Number(path[1])||0];let blocksPath=[...page,'blocks'];let index=at(snapshot.document,blocksPath)?.length;if(selectedObject?.type==='columns'){blocksPath=[...path,'blocks'];index=selectedObject.blocks.length;}else if(path.at(-2)==='blocks'){blocksPath=path.slice(0,-1);index=path.at(-1)+1;}if(at(snapshot.document,blocksPath)&&operation({type:'insert',path:blocksPath,index,value:structuredClone(templates[type])})){const added=[...blocksPath,index];setSelected('/'+added.join('/'));const field={paragraph:['text'],subheading:['text'],address:['value'],callout:['title'],list:['items',0],steps:['items',0,'title'],table:['headers',0]}[type];if(field)focusCanvas({path:[...added,...field]});else select('/'+added.join('/'));}}
  function move(delta){const path=parsePath(selected);const index=path.at(-1);const parent=path.slice(0,-1);const list=at(snapshot.document,parent);if(!Array.isArray(list)||!Number.isInteger(index)||index+delta<0||index+delta>=list.length)return; if(operation({type:'move',fromPath:parent,fromIndex:index,toPath:parent,toIndex:index+delta}))select('/'+[...parent,index+delta].join('/'));}
  function drop(from,to){const source=parsePath(from),target=parsePath(to);if(!Number.isInteger(source.at(-1))||!Number.isInteger(target.at(-1))||source.at(-2)!==target.at(-2))return;const fromPath=source.slice(0,-1),toPath=target.slice(0,-1),fromIndex=source.at(-1),toIndex=target.at(-1);if(operation({type:'move',fromPath,fromIndex,toPath,toIndex}))select('/'+[...toPath,toIndex].join('/'));}
  function reportError(error){setNotice(error.message);setServerError({message:error.message,code:error.code,status:error.status,details:error.details});if(error.status===409)setConflict(true);if(Array.isArray(error.details)){const detail=error.details.filter(value=>value&&typeof value==='object'&&typeof value.message==='string');if(detail.length){setIssues(detail.filter(issue=>issue.code==='SCHEMA'));setAssetIssues(detail.filter(issue=>issue.code!=='SCHEMA'));assetValidation.current={key:JSON.stringify({diskRevision:hostState?.revision,figures:collectFigures(candidate.document).map(({src,crop,path})=>({src,crop,path}))}),errors:detail};}}}
  async function save(draft=false){try{await canvasFlush.current();}catch(error){setNotice(error.message);return false;}setBusy(true);try{const value=fromEditorJSON(editor.getJSON(),{validate:!draft});const result=await request(draft?'/api/draft':'/api/save',{expectedRevision:hostState.revision,document:value.document,...(draft?{editorState:{selected}}:{})});if(!draft){setHostState(result);setAssetIssues(result.validation?.errors?.filter(issue=>issue.code!=='SCHEMA')||[]);setSavedRevision(revision);savedDocument.current=JSON.stringify(value.document);setDirty(false);setConflict(false);}else setHostState(old=>({...old,draft:{baseRevision:old.revision,document:value.document,editorState:{selected}}}));setNotice(draft?'미완성 초안을 정본과 별도로 보관했습니다.':'정본 저장 완료');return true;}catch(error){reportError(error);return false;}finally{setBusy(false);}}
  function restoreDraft(draft=hostState.draft){try{const json=toEditorJSON(draft.document,{sidecars:editorInput.attrs.sidecars,validate:false});setEditorInput(json);setSnapshot({document:draft.document,sidecars:json.attrs.sidecars});setRevision(++seq.current);setDirty(JSON.stringify(draft.document)!==savedDocument.current);setSelected(draft.editorState?.selected||'/pages/0');try{fromEditorJSON(json);setCandidate({document:draft.document,revision:seq.current});setIssues([]);}catch(error){setIssues([{path:normalizePath(error.message.split(':')[0]),message:error.message}]);}setReplacement(null);setNotice('보관 초안을 복원했습니다. 정본은 아직 바뀌지 않았습니다.');}catch(error){reportError(error);}}
  function requestReplacement(kind){if(busy||replacement)return;if(dirty||kind==='draft'&&hostState.draft.baseRevision!==hostState.revision){replacementDraft.current=kind==='draft'?structuredClone(hostState.draft):null;setReplacement(kind);}else if(kind==='draft')restoreDraft();else load();}
  function continueReplacement(){if(replacement==='draft')restoreDraft(replacementDraft.current);else load();}
  function downloadDraft(){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(fromEditorJSON(editor.getJSON(),{validate:false}).document,null,2)],{type:'application/json'}));link.download='manual-editor-draft.json';link.click();URL.revokeObjectURL(link.href);}
  function applyProperties(value){if(busy||loadFailure||replacement||editor.view.composing)return;const path=parsePath(selected),previous=at(snapshot.document,path);let chain=editor.chain();for(const key of new Set([...Object.keys(previous),...Object.keys(value)])){if(JSON.stringify(previous[key])===JSON.stringify(value[key]))continue;chain=chain.applyManualOperation(key in value?{type:'set',path:[...path,key],value:value[key]}:{type:'unset',path:[...path,key]});}chain.run();}
  async function saveReview(record){setBusy(true);try{const value=fromEditorJSON(editor.getJSON());const result=await request('/api/save',{expectedRevision:hostState.revision,document:value.document,copyReview:record});setHostState(result);await refreshJobs();}catch(error){reportError(error);throw error;}finally{setBusy(false);}}
  function moveTo(pageIndex,targetIndex,stepsTarget){const path=parsePath(selected),parent=path.slice(0,-1),index=path.at(-1);if(!Number.isInteger(index)||!['blocks','items'].includes(parent.at(-1)))return;let target=['pages',pageIndex,'blocks'];if(parent.at(-1)==='items'){const blockIndex=stepsTarget;if(snapshot.document.pages[pageIndex].blocks[blockIndex]?.type!=='steps'){setNotice('단계를 옮길 페이지에 절차 블록이 필요합니다.');return;}target.push(blockIndex,'items');}const list=at(snapshot.document,target);const destination=Math.max(0,Math.min(targetIndex??list.length,list.length-(JSON.stringify(parent)===JSON.stringify(target)?1:0)));if(operation({type:'move',fromPath:parent,fromIndex:index,toPath:target,toIndex:destination}))select('/'+[...target,destination].join('/'));}
  async function refreshJobs(){try{const result=await request('/api/exports');setJobs(result.jobs);setOutput(old=>old?result.jobs.find(job=>job.jobId===old.jobId)||old:null);}catch(error){reportError(error);}}
  async function exportDocument(){if(exportMode==='reviewed'&&(!hostState?.review?.copy?.current||!placementCurrent(snapshot.document,hostState?.copyReview))){setNotice('현재 문서의 배치 검토가 미완료입니다. 문구 최신성과 배치 근거를 각각 검토합니다.');return;}setBusy(true);try{const job=await request('/api/exports',{expectedRevision:hostState.revision,format:exportFormat,mode:exportMode});setOutput({...job,format:exportFormat,mode:exportMode});setNotice(`현재 저장 리비전의 ${exportMode==='draft'?'초안':'검토 후'} ${exportFormat.toUpperCase()} 생성 중`);}catch(error){reportError(error);}finally{setBusy(false);}}
  async function importAsset(file){const target=parsePath(selected);setBusy(true);try{const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const result=await request('/api/assets',{expectedRevision:hostState.revision,name:file.name,bytesBase64:btoa(binary)});setHostState(await request('/api/document'));assetCache.current={...assetCache.current,[result.src]:URL.createObjectURL(file)};assetValidation.current=null;setAssetUrls(assetCache.current);editor.commands.applyManualOperation({type:'set',path:[...target,'src'],value:result.src});await refreshJobs();setNotice('원본 바이트를 문서 자산으로 보관했습니다. 대체 텍스트·캡션·확대 좌표를 확인합니다.');}catch(error){reportError(error);}finally{setBusy(false);}}
  async function openArtifact(url){try{const response=await fetch(url,{headers:{Authorization:`Bearer ${session.current}`}});if(!response.ok)throw new Error('출력 파일을 열 수 없습니다.');window.open(URL.createObjectURL(await response.blob()),'_blank','noopener');}catch(error){setNotice(error.message);}}
  async function visualReview(record){try{await request('/api/visual-review',{expectedRevision:hostState.revision,...record});setNotice('동일 리비전 출력의 시각 검토를 기록했습니다. 제품 승인과는 별개입니다.');}catch(error){setNotice(error.message);}}
  useEffect(()=>{if(!output?.jobId||!['running','queued'].includes(output.state))return;let cancelled=false,inFlight=false;const controller=new AbortController();const timer=setInterval(async()=>{if(inFlight)return;inFlight=true;try{const status=await request(`/api/exports/${output.jobId}`,undefined,controller.signal);if(!cancelled){setOutput(status);if(!['running','queued'].includes(status.state))refreshJobs();}}catch(error){if(!cancelled){setOutput({...output,state:'failed'});reportError(error);}}finally{inFlight=false;}},1500);return()=>{cancelled=true;controller.abort();clearInterval(timer);};},[output?.jobId,output?.state]);
  useEffect(()=>{if(hostState)refreshJobs();},[hostState?.revision]);
  const selectedObject=at(snapshot.document,parsePath(selected));
  const validation=[...issues,...assetIssues,...(assetsChecking?[{path:'/',message:'원본 자산 검사 중'}]:[]),...(loadFailure?[{path:'/',message:loadFailure.reason}]:[])];
  const reviewIssues=[...validation,...(layout?.mode==='a4'&&layout.revision===revision?layout.pages.flatMap(page=>page.issues?.length?page.issues:page.overflow?[{path:page.path,message:'페이지 분량이 A4를 초과합니다.'}]:[]):[])].filter((issue,index,all)=>all.findIndex(other=>other.path===issue.path&&other.message===issue.message)===index);
  return <><input ref={imagePicker} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={e=>{if(e.target.files?.[0])insertImage(e.target.files[0],imageTarget.current);e.target.value='';}}/>{library&&<BrowserLibrary records={library} onOpen={restoreBrowser} onClose={()=>setLibrary(null)} onImport={importLocal}/>}<ReplaceProtection busy={busy} kind={replacement} conflict={conflict} draftMismatch={replacement==='draft'&&hostState?.draft?.baseRevision!==hostState?.revision} onSave={async()=>{if(await save())continueReplacement();}} onDraft={async()=>{if(await save(true))continueReplacement();}} onDiscard={continueReplacement} onCancel={()=>setReplacement(null)} onDownload={downloadDraft}/><EditorShell previewZoom={previewZoom} onPreviewZoom={value=>{setPreviewZoom(value);setLayout(null);}} selectionRequest={selectionRequest} interactionLocked={!!replacement} document={snapshot.document} selectedPath={selected} onSelect={select} revision={revision} savedRevision={savedRevision} validation={validation} reviewIssues={reviewIssues} isDirty={dirty} notice={notice} busy={busy||!browserReady||!!loadFailure||!!replacement}
    reviewStatus={dirty?'변경 후 재검토 필요':hostState?.review?.copy?.current?'현재 문구 기록 일치 · 배치 판단은 별도 확인':'문구 검토 기록 없음 또는 오래됨'} outputStatus={output?`${output.mode==='reviewed'?'검토 후':'초안'} ${output.format?.toUpperCase()||''} · ${output.state||'대기'} · 출력 리비전 ${output.revision?.slice(0,8)} · ${output.state==='succeeded'&&output.current&&!dirty&&output.revision===hostState?.revision?'현재 출력':'현재 출력으로 확인되지 않음'}`:undefined}
    canUndo={!!editor&&undo(editor.state)} canRedo={!!editor&&redo(editor.state)} onUndo={()=>toolbarHistory(false)} onRedo={()=>toolbarHistory(true)}
    connected={!!session.current} localMode={!session.current} onNew={!session.current?newLocal:undefined} onPrint={!session.current?async()=>{try{await canvasFlush.current();fromEditorJSON(editor.getJSON());if(valid.revision!==seq.current){setNotice('문서 배치를 확인한 뒤 다시 인쇄를 눌러 주세요.');return;}setPrintRequest(value=>value+1);setNotice('브라우저 인쇄를 요청했습니다. 인쇄창이 뜨지 않으면 일반 브라우저에서 문서 파일을 열어 출력하세요.');}catch(error){setNotice(error.message);}}:undefined} printDisabled={validation.length>0||valid.revision!==revision||!layout||layout.mode!=='a4'||layout.revision!==revision||layout.pages.some(page=>page.overflow||page.missingImages.length)} onNavigate={path=>setSelected(path)} onPickImage={()=>{imageTarget.current=selected;imagePicker.current.click();}} onDownload={session.current?downloadDraft:downloadBrowser} onAddPage={()=>{const index=snapshot.document.pages.length;if(operation({type:'insert',path:['pages'],index,value:{title:'새 페이지',blocks:[{type:'paragraph',text:''}]}}))select(`/pages/${index}`);}}
    onLoad={session.current?()=>requestReplacement('load'):openLocal} onSave={session.current?(hostState?()=>save():undefined):saveLocal} onDraft={hostState?()=>save(true):undefined} onOutput={hostState?exportDocument:undefined}
    onRestoreDraft={hostState?.draft?()=>requestReplacement('draft'):undefined}
    onDrop={drop} onMove={move} onDelete={()=>{const path=parsePath(selected);const parent=path.slice(0,-1),index=path.at(-1);if(Number.isInteger(index)&&!(parent[0]==='pages'&&parent.length===1&&snapshot.document.pages.length===1)&&operation({type:'remove',path:parent,index}))select(parent.length===1?`/pages/${Math.max(0,index-1)}`:'/'+parent.slice(0,-1).join('/'));}} onAdd={addBlock} onAppendStep={selectedObject?.type==='steps'?()=>appendContent(selected+'/items/'+(selectedObject.items.length-1)):parsePath(selected).at(-2)==='items'&&at(snapshot.document,parsePath(selected).slice(0,-2))?.type==='steps'?()=>appendContent(selected):undefined}

    editor={<>{selectedObject?.src&&assetUrls[selectedObject.src]&&<img className="manual-editor-selected-image" src={assetUrls[selectedObject.src]} alt="선택한 그림"/>}{selectedObject?.src&&<label className="manual-editor-import-image">이미지 선택 <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e=>{if(e.target.files?.[0])insertImage(e.target.files[0],selected);}}/></label>}{paste!==null&&<div role="alert"><p>일반 텍스트만 입력할까요? 원본은 클립보드에 유지됩니다.</p><Button variant="primary" onClick={()=>{editor.commands.insertContent({type:'text',text:paste});setPaste(null);}}>일반 텍스트 입력</Button><Button onClick={()=>setPaste(null)}>취소</Button></div>}<FocusedContent.Provider value={{selected:parsePath(selected),advanced:false}}><EditorContent editor={editor}/></FocusedContent.Provider></>}
    properties={<Properties value={selectedObject} assetUrl={assetUrls[selectedObject?.src]} onImport={file=>insertImage(file,selected)} movingStep={parsePath(selected).at(-2)==='items'&&at(snapshot.document,parsePath(selected).slice(0,-2))?.type==='steps'} destinations={['blocks','items'].includes(parsePath(selected).at(-2))&&(parsePath(selected).at(-2)==='blocks'||at(snapshot.document,parsePath(selected).slice(0,-2))?.type==='steps')?snapshot.document.pages:[]} onMoveTo={moveTo} splitSupported={canSplitStepsAt(parsePath(selected))} onSplit={at=>{const path=parsePath(selected);if(canSplitStepsAt(path))operation({type:'splitSteps',pageIndex:path[1],blockIndex:path[3],at,title:'이어지는 과업'});}} onApply={applyProperties} onUnset={key=>operation({type:'unset',path:[...parsePath(selected),key]})}/>}
    review={<>{!hostState&&<p>파일 메뉴의 인쇄 / PDF로 출력하고, 저장으로 이 브라우저에 보관하세요. 다른 컴퓨터에서 이어 쓸 때는 파일 메뉴에서 문서 파일을 내려받으세요. 폴더 저장과 검토 기록은 문서 폴더 연결이 필요합니다.</p>}{hostState&&<div><label>출력 형식 <select value={exportFormat} onChange={e=>setExportFormat(e.target.value)}><option value="html">HTML</option><option value="pdf">PDF</option></select></label><label>출력 상태 <select value={exportMode} onChange={e=>setExportMode(e.target.value)}><option value="draft">초안</option><option value="reviewed">검토 후</option></select></label></div>}<p>자산 검증: {validationAuthority} · 배치 검토: {dirty?'변경 후 재검토 필요':hostState?.review?.copy?.current&&placementCurrent(snapshot.document,hostState?.copyReview)?'필수 배치 기록 작성됨 · 의미는 검토자 근거 확인':'미검토 또는 확인 필요'}</p>{loadFailure&&<p role="alert">불러오기 실패: {loadFailure.title} · 이전 편집 내용은 잠겨 있습니다.<Button onClick={load}>다시 읽기</Button></p>}{serverError&&<details><summary>서버 오류 원본 · {serverError.code||serverError.status}</summary><pre>{JSON.stringify(serverError.details??serverError.message,null,2)}</pre></details>}<ReviewPanel document={snapshot.document} sourceDocument={hostState?.document} existing={hostState?.copyReview} serverReview={hostState?.review} onSave={saveReview} onLocate={select} disabled={!hostState||dirty||busy||validation.length>0}/>{hostState&&<OutputDetails job={output} jobs={jobs} expectedRevision={hostState?.revision} dirty={dirty} onSelect={setOutput} onRefresh={refreshJobs} onOpen={openArtifact} onReview={visualReview}/>}</>}
    preview={<A4Preview zoom={previewZoom} onZoomChange={value=>{setPreviewZoom(value);setLayout(null);}} document={snapshot.document} revision={revision} currentRevision={loadFailure?-1:revision} locked={busy||!browserReady||!!loadFailure||!!replacement} assetUrls={assetUrls} onLayout={setLayout} selectedPath={selected} onSelect={select} onAction={canvasAction} focusRequest={focusRequest} printRequest={printRequest} onBridge={bridge=>{canvasFlush.current=bridge.flush;}}/>}/></>
}
createRoot(document.getElementById('editor-root')).render(<App/>);
