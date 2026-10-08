const command=(id,label,description,icon,keywords,kind,attrs={},options={})=>Object.freeze({
 id,label,description,icon,keywords:Object.freeze(keywords),kind,attrs:Object.freeze(attrs),
 type:'command',group:'기본 블록',operation:'convert',...options,
});

// IDs are shared by slash insertion, block conversion and the kernel dispatcher.
export const BLOCK_COMMANDS=Object.freeze([
 command('paragraph','본문','일반 텍스트를 작성합니다.','document-text',['text','paragraph','plain','문단','텍스트'],'paragraph'),
 command('pageTitle','페이지 제목','페이지의 제목을 추가하거나 본문을 페이지 제목으로 바꿉니다.','text-format',['page title','페이지 제목','쪽 제목'],'pageTitle'),
 command('heading1','제목 1','큰 제목으로 구분합니다.','text-format',['heading 1','h1','title','큰 제목'],'heading',{level:1}),
 command('heading2','제목 2','중간 제목으로 구분합니다.','text-format',['heading 2','h2','subtitle','중간 제목'],'heading',{level:2}),
 command('heading3','제목 3','작은 제목으로 구분합니다.','text-format',['heading 3','h3','subheading','소제목','작은 제목'],'heading',{level:3}),
 command('bulletList','글머리 목록','순서 없이 항목을 나열합니다.','list',['bullet','bullets','unordered list','ul','불릿'],'list',{ordered:false}),
 command('orderedList','번호 목록','항목에 순서대로 번호를 붙입니다.','list-ordered',['number','numbered list','ordered list','ol','순서'],'list',{ordered:true,start:1}),
 command('todo','할 일','체크박스로 완료를 표시합니다.','square-check',['todo','to do','task','check','checkbox','할일','체크박스'],'todo'),
 command('toggle','토글','접고 펼치는 내용 · 줄 처음에 > + 공백','chevron-right',['toggle','fold','collapse','접기','펼치기'],'toggle'),
 command('quote','인용','인용한 문구 · 줄 처음에 " + 공백','quote',['quote','quotation','blockquote'],'quote'),
 command('callout','콜아웃','보충 설명이나 주의사항을 표시합니다. 속성에서 종류를 변경할 수 있습니다.','circle-info',['callout','notice','info','콜아웃','안내','주의'],'callout',{tone:'signal'}),
 command('divider','구분선','내용 사이를 선으로 구분합니다.','line-horizontal',['divider','separator','horizontal rule','hr'],'divider',{}, {operation:'insert'}),
 command('codeBlock','코드 블록','여러 줄 코드 · 줄 처음에 백틱 3개 + 공백','code',['code','code block','pre','코드'],'codeBlock'),
 command('figure','이미지','그림이나 화면을 넣습니다.','image',['image','picture','photo','figure','그림','사진','스크린샷'],'figure',{}, {operation:'insert',needsInput:'image',group:'미디어'}),
 command('table','표','행과 열로 정보를 정리합니다.','column',['table','grid','표'],'table',{rows:2,columns:2}, {operation:'insert',group:'미디어'}),
 command('procedure','절차','단계별 행동과 설명을 작성합니다.','list-ordered',['procedure','steps','단계'],'procedure',{}, {operation:'insert',group:'매뉴얼'}),
 command('cover','표지 만들기','현재 위치에 로고·제목·문서 정보가 포함된 새 표지 템플릿을 추가합니다.','document',['cover','template','표지','표지 템플릿'],'cover',{}, {operation:'insert',group:'표지'}),
 command('coverLogo','로고','공식 LK Robotics 로고를 선택합니다.','image',['logo', 'brand', '로고', '표지'],'figure',{}, {operation:'insert',group:'표지'}),
 command('coverTitle','표지 제목','표지의 제목을 추가합니다.','text-format',['cover title', '표지 제목'],'heading',{}, {operation:'insert',group:'표지'}),
 command('coverMetadata','문서 정보','버전·작성일·기기·환경을 기록합니다.','column',['metadata', '문서 정보', '표지'],'table',{}, {operation:'insert',group:'표지'}),
 command('coverDivider','표지 구분선','표지 구성 사이에 선을 추가합니다.','line-horizontal',['cover divider', '표지 구분선'],'divider',{}, {operation:'insert',group:'표지'}),
 command('coverSectionTitle','표지 섹션 제목','표지 본문을 구분하는 제목을 추가합니다.','text-format',['section title', '표지 섹션', '준비사항'],'heading',{}, {operation:'insert',group:'표지'}),
 command('page','새 페이지','새 매뉴얼 페이지를 추가합니다.','document',['page','페이지'],'page',{}, {operation:'insert',group:'매뉴얼'}),
]);

export const BLOCK_ACTIONS=Object.freeze([
 Object.freeze({id:'turnInto',type:'action',label:'변경',icon:'text-format',keywords:Object.freeze(['convert','turn into','변환','유형','유형 변경']),group:'블록 작업'}),
 Object.freeze({id:'duplicate',type:'action',label:'복제',icon:'copy',keywords:Object.freeze(['duplicate','copy','복사']),group:'블록 작업'}),
 Object.freeze({id:'moveUp',type:'action',label:'위로 이동',icon:'arrow-up',keywords:Object.freeze(['move up','위']),group:'블록 작업'}),
 Object.freeze({id:'moveDown',type:'action',label:'아래로 이동',icon:'arrow-down',keywords:Object.freeze(['move down','아래']),group:'블록 작업'}),
 Object.freeze({id:'delete',type:'action',label:'삭제',icon:'trash',keywords:Object.freeze(['delete','remove','삭제']),group:'블록 작업',danger:true}),
]);

const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('en-US').trim().replace(/\s+/gu,' ');
export function filterBlockCommands(query='',{mode='slash',isEnabled=()=>true,enabledIds}={}){
 const source=mode==='block'?BLOCK_ACTIONS:mode==='turnInto'?BLOCK_COMMANDS.filter(item=>item.operation==='convert'):BLOCK_COMMANDS;
 const text=normalize(query).replace(/^\//u,'').trim(),tokens=text.split(' ').filter(Boolean);
 return source.map((item,index)=>{
  const label=normalize(item.label),aliases=[label,normalize(item.id),...item.keywords.map(normalize)];
  if(!tokens.every(token=>aliases.some(alias=>alias.includes(token))))return null;
  const rank=!text?3:aliases.includes(text)?0:aliases.some(alias=>alias.startsWith(text))?1:2;
  const disabled=enabledIds!==undefined&&!enabledIds.includes(item.id)||!isEnabled(item);
  return {item:{...item,disabled},rank,index};
 }).filter(Boolean).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(entry=>entry.item);
}
export const getBlockMenuItems=filterBlockCommands;
export const getBlockCommand=id=>BLOCK_COMMANDS.find(item=>item.id===id)||BLOCK_ACTIONS.find(item=>item.id===id)||null;
export function blockCommandOptionId(menuId,itemId){return `${menuId}-option-${encodeURIComponent(itemId)}`;}

// The owner may route EditorView key events here instead of using DOM capture.
// Returning null leaves typing, selection shortcuts and IME entirely with the editor.
export function getBlockMenuKeyAction(items,activeId,event,{composing=false}={}){
 if(composing||event.isComposing||event.keyCode===229||event.key==='Process'||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return null;
 if(event.key==='Escape')return {type:'close'};
 const enabled=items.filter(item=>!item.disabled);
 if(!enabled.length)return null;
 const at=enabled.findIndex(item=>item.id===activeId);
 if(event.key==='Enter')return {type:'choose',item:enabled[at<0?0:at]};
 if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return null;
 let index;
 if(event.key==='Home')index=0;
 else if(event.key==='End')index=enabled.length-1;
 else if(at<0)index=event.key==='ArrowUp'?enabled.length-1:0;
 else index=(at+(event.key==='ArrowUp'?-1:1)+enabled.length)%enabled.length;
 return {type:'move',activeId:enabled[index].id};
}

export function getBlockMenuViewport(surface){
 const viewport=surface.visualViewport;
 return {width:viewport?.width||surface.innerWidth,height:viewport?.height||surface.innerHeight,left:viewport?.offsetLeft||0,top:viewport?.offsetTop||0};
}
export function positionBlockCommandMenu(anchor,{width=320,height=360,viewportWidth=1280,viewportHeight=720,viewportLeft=0,viewportTop=0,margin=8,gap=6,placement='below',placementBounds,minimumWidth=54,minimumHeight=42}={}){
 const bounded=placementBounds!==undefined;
 if(bounded){
  if(!placementBounds)return null;
  const right=placementBounds.right??placementBounds.left+placementBounds.width,bottom=placementBounds.bottom??placementBounds.top+placementBounds.height;
  if(![placementBounds.left,placementBounds.top,right,bottom,viewportLeft,viewportTop,viewportWidth,viewportHeight,anchor.left,anchor.top,anchor.bottom??anchor.top].every(Number.isFinite))return null;
  const left=Math.max(placementBounds.left,viewportLeft),top=Math.max(placementBounds.top,viewportTop);
  const clipRight=Math.min(right,viewportLeft+viewportWidth),clipBottom=Math.min(bottom,viewportTop+viewportHeight);
  if(clipRight<=left||clipBottom<=top)return null;
  viewportLeft=left;viewportTop=top;viewportWidth=clipRight-left;viewportHeight=clipBottom-top;
  const anchorTop=Math.max(top,Math.min(anchor.top,clipBottom));
  anchor={left:Math.max(left,Math.min(anchor.left,clipRight)),top:anchorTop,bottom:Math.max(anchorTop,Math.min(anchor.bottom??anchor.top,clipBottom))};
 }
 const availableWidth=Math.max(0,viewportWidth-2*margin),actualWidth=Math.min(width,availableWidth);
 const left=Math.max(viewportLeft+margin,Math.min(anchor.left,viewportLeft+viewportWidth-margin-actualWidth));
 const below=Math.max(0,viewportTop+viewportHeight-margin-(anchor.bottom??anchor.top)-gap),above=Math.max(0,anchor.top-viewportTop-margin-gap);
 const placeAbove=placement==='above'?above>=height||below<height&&above>below:below<Math.min(height,160)&&above>below;
 const available=placeAbove?above:below,maxHeight=Math.min(height,available),top=placeAbove?anchor.top-gap-maxHeight:(anchor.bottom??anchor.top)+gap;
 if(bounded&&(actualWidth<minimumWidth||maxHeight<minimumHeight))return null;
 return {left,top:Math.max(viewportTop+margin,Math.min(top,viewportTop+viewportHeight-margin-maxHeight)),width:actualWidth,maxHeight};
}
