import {getManualCoverProjection,isManualCoverProjectionBlock} from './manual-cover-legacy-projection.mjs';

const labels={document:'문서',page:'페이지',cover:'표지',pageTitle:'페이지 제목',pageLead:'소개문',coverLogo:'표지 로고',coverTitle:'표지 제목',coverMetadata:'문서 정보',coverSectionTitle:'섹션 제목',paragraph:'본문',heading1:'제목 1',heading2:'제목 2',heading3:'제목 3',heading:'제목',bulletList:'글머리 목록',orderedList:'번호 목록',list:'목록',listItem:'목록 항목',procedure:'절차',step:'단계',stepTitle:'단계 제목',figure:'이미지',figureCaption:'캡션',table:'표',tableCell:'표 셀',cell:'표 셀',callout:'콜아웃',calloutTitle:'콜아웃 제목',quote:'인용',mediaGroup:'이미지와 설명',todo:'할 일',toggle:'토글',toggleTitle:'토글 제목',codeBlock:'코드 블록',divider:'구분선'};
const coverKinds={logo:'coverLogo',title:'coverTitle',metadata:'coverMetadata',sectionTitle:'coverSectionTitle',divider:'divider'};
const eligible=(node,role)=>role==='title'?node.type.name==='heading'&&node.attrs.level===1:role==='sectionTitle'?node.type.name==='heading'&&node.attrs.level===2:node.type.name===({logo:'figure',metadata:'table',divider:'divider'})[role];

function boundCoverRole(state,node,pos){
 if(!state?.doc)return null;
 const marker=getManualCoverProjection(node.attrs?.meta?.extensions);
 const block={...node.attrs?.meta,id:node.attrs?.id,type:node.type.name,...(node.type.name==='heading'?{level:node.attrs.level}:{}),...(node.type.name==='figure'?{caption:node.firstChild?.content.size?[{}]:[]}:{})};
 if(!marker||marker.blockId!==node.attrs.id||!eligible(node,marker.role)||!isManualCoverProjectionBlock(block,marker.role)||!Number.isInteger(pos)||pos<0||pos>=state?.doc.content.size||state.doc.nodeAt(pos)!==node)return null;
 const location=state.doc.resolve(pos);
 for(let depth=location.depth;depth>0;depth--){const parent=location.node(depth);if(parent.type.name==='cover')return parent.attrs.id===marker.coverId?marker.role:null;}
 return null;
}
// Display roles are projections of the current document, never untrusted metadata labels.
export function readManualNodeSemanticKind(state,node,pos){
 if(!node)return null;
 const role=boundCoverRole(state,node,pos);
 return role?coverKinds[role]:node.type.name==='heading'?`heading${node.attrs.level||3}`:node.type.name;
}
export function readManualObjectSemanticKind(state,id){return readManualSemanticLabel(state,{id})?.kind??null;}

export function manualSemanticLabel(kind){
 if(kind==='selected:blocks')return '여러 블록 선택';
 if(kind==='selected:cells')return '표 셀 선택';
 const selected=typeof kind==='string'&&kind.startsWith('selected:'),name=labels[selected?kind.slice(9):kind];
 return name?`${name}${selected?' 선택':''}`:'선택한 내용';
}

export function readManualSemanticLabel(state,{id,node,pos}={}){
 if(!state)return null;
 if(id){node=null;state.doc.descendants((candidate,position)=>{if(candidate.attrs.id===id){node=candidate;pos=position;return false;}});}
 if(!node||!Number.isInteger(pos)||pos<0||pos>=state.doc.content.size||state.doc.nodeAt(pos)!==node)return null;
 const kind=readManualNodeSemanticKind(state,node,pos),role=boundCoverRole(state,node,pos);
 return {kind,label:manualSemanticLabel(kind),...(role?{coverRole:role}:{})};
}
