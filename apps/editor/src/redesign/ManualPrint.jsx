import React,{useEffect,useRef} from 'react';
import {Callout} from '@lk-design-system/lds-core/components/status/Callout';
import {Blockquote} from '@lk-design-system/lds-core/components/content/Blockquote';
import {ManualPage,ManualFigure,ManualMetadata,ManualSectionTitle,ManualDivider} from '../../../../src/index.mjs';
import '../../../../styles.css';
import {resolveManualAsset} from './manual-brand-asset-urls.mjs';
import {getManualBrandRenderAttributes} from './manual-brand-render.mjs';
import {getOrderedPageEntries,getManualDocumentCovers} from './manual-page-order.mjs';
import {projectManualPage,getManualPageProjection} from './manual-page-projection.mjs';
import {projectManualCover,getManualCoverProjection} from './manual-cover-legacy-projection.mjs';
import {getManualTableLayout} from './manual-table-layout.mjs';
import {readManualFigureLayout,manualFigureWidthStyle,manualFigureAlignmentStyle,resolveManualFigureAlignment} from './manual-figure-layout.mjs';
import {resolveManualDividerStyle} from './manual-divider-style.mjs';
import {hasVisibleManualCalloutTitle} from '../../../../src/manual-callout-content.mjs';

export const inlineText=runs=>(runs||[]).map(run=>run.type==='hardBreak'?'\n':run.text||'').join('');
export function Inline({content=[]}) {
  return content.map((run,index)=>{
    if(run.type==='hardBreak')return <br key={index}/>;
    let text=run.text;
    for(const mark of run.marks||[]){
      if(mark.type==='strong')text=<strong>{text}</strong>;
      if(mark.type==='emphasis')text=<em>{text}</em>;
      if(mark.type==='strike')text=<s>{text}</s>;
      if(mark.type==='underline')text=<u>{text}</u>;
      if(mark.type==='code')text=<code>{text}</code>;
      if(mark.type==='link')text=<a href={mark.href} rel="noopener noreferrer">{text}</a>;
    }
    return <React.Fragment key={index}>{text}</React.Fragment>;
  });
}
function Blocks({blocks=[],assets,pageId,figureDefaultAlignment='center'}) {
  return blocks.map(block=>{
    const content=children=><Inline content={children}/>;
    let body;
    const marker=getManualPageProjection(block.extensions),pageRole=marker&&marker.blockId===block.id&&marker.pageId===pageId?marker.role:null,emptyPageTitle=pageRole==='title'&&block.type==='heading'&&block.level===2&&!inlineText(block.content).trim();
    if(pageRole==='title'&&block.type==='heading'&&block.level===2)body=emptyPageTitle?null:<h2 className="lds-manual-section-title" data-manual-page-role="title">{content(block.content)}</h2>;
    else if(pageRole==='lead'&&block.type==='paragraph')body=<p className="lds-manual-lead" data-manual-page-role="lead">{content(block.content)}</p>;
    else switch(block.type){
      case 'paragraph':body=<p>{content(block.content)}</p>;break;
      case 'heading':{const Heading=`h${block.level||3}`;body=<Heading className={`lds-manual-subheading manual-v2-heading${block.level||3}`}>{content(block.content)}</Heading>;break;}
      case 'todo':body=<div className="manual-v2-todo" data-checked={String(block.checked)}><input type="checkbox" checked={block.checked} readOnly tabIndex={-1} aria-label="완료 표시"/><p>{content(block.content)}</p></div>;break;
      case 'toggle':body=<section className="manual-v2-toggle" data-open={String(block.open)}><span className="manual-v2-toggle-button" aria-hidden="true">{block.open?'▾':'▸'}</span><div><p className="manual-v2-toggle-title">{content(block.title)}</p>{block.open&&<Blocks blocks={block.blocks} assets={assets}/>}</div></section>;break;
      case 'divider':body=<ManualDivider variant={resolveManualDividerStyle(block.extensions)}/>;break;
      case 'codeBlock':body=<div className="manual-v2-code-block" data-language={block.language}><pre><code>{block.text}</code></pre></div>;break;
      case 'quote':body=<div className="lds-manual-quote"><Blockquote radius="body"><Blocks blocks={block.blocks} assets={assets}/></Blockquote></div>;break;
      case 'list':{const List=block.ordered?'ol':'ul';body=<List start={block.ordered?block.start||1:undefined}>{block.items.map(item=><li key={item.id} id={item.id}><Blocks blocks={item.blocks} assets={assets}/></li>)}</List>;break;}
      case 'procedure':body=<ol className="lds-manual-steps" start={block.start}>{block.steps.map((step,index)=><li key={step.id} className="lds-manual-step" id={step.id} data-print-id={step.id}><div className="lds-manual-step-label"><span aria-hidden="true">{block.start+index}.</span><div><h3>{content(step.title)}</h3></div></div><div className="manual-v2-print-step-body"><Blocks blocks={step.blocks} assets={assets}/></div></li>)}</ol>;break;
      case 'figure':body=resolveManualAsset(block.asset,assets)?<ManualFigure src={resolveManualAsset(block.asset,assets)} alt={block.alt} caption={block.caption.length?content(block.caption):null} size={block.widthPreset} alignment={resolveManualFigureAlignment(block.extensions,{defaultAlignment:figureDefaultAlignment})} widthPx={readManualFigureLayout(block.extensions)?.widthPx} crop={block.crop} previewTitle={block.previewTitle}/>:<p className="manual-v2-missing-image" role="img" aria-label={block.alt||'이미지 없음'}>이미지를 불러올 수 없습니다.</p>;break;
      case 'table':{
        const layout=getManualTableLayout(block),rowStyle=index=>layout.rowMinHeightsPx[index]===null?undefined:{height:layout.rowMinHeightsPx[index]};
        body=<div className="lds-manual-table-frame"><table aria-label={block.label||'표'} style={layout.hasColumnWeights?{tableLayout:'fixed'}:undefined}>
          {layout.hasColumnWeights&&<colgroup>{layout.columnPercentages.map((width,index)=><col key={index} style={{width:`${width}%`}}/>)}</colgroup>}
          <thead><tr style={rowStyle(0)}>{block.headers.map(cell=><th id={cell.id} key={cell.id} scope="col">{content(cell.content)}</th>)}</tr></thead>
          <tbody>{block.rows.map((row,index)=><tr key={index} style={rowStyle(index+1)}>{row.map(cell=><td id={cell.id} key={cell.id}>{content(cell.content)}</td>)}</tr>)}</tbody>
        </table></div>;break;
      }
      case 'callout':body=<div className="lds-manual-callout" data-manual-callout-visible-title={String(hasVisibleManualCalloutTitle(block.title))}><Callout tone={block.tone} variant="bordered" radius="body" density="compact"><div data-manual-callout-content data-manual-callout-visible-title={String(hasVisibleManualCalloutTitle(block.title))}>{hasVisibleManualCalloutTitle(block.title)&&<h3 className="lds-manual-callout-title">{content(block.title)}</h3>}<Blocks blocks={block.blocks} assets={assets}/></div></Callout></div>;break;
      case 'mediaGroup':body=<div className={block.layout==='sideBySide'?'lds-manual-columns':'manual-v2-media-stack'}><Blocks blocks={[block.figure]} assets={assets} figureDefaultAlignment={block.figure.widthPreset==='compact'||block.figure.widthPreset==='reading'?'center':'left'}/><div><Blocks blocks={block.blocks} assets={assets}/></div></div>;break;
      default:body=<p>지원하지 않는 내용입니다.</p>;
    }
    return <div key={block.id} id={block.id} data-print-id={block.id} data-manual-page-role={emptyPageTitle?'title':undefined} className="manual-v2-print-block" {...(block.type==='figure'?getManualBrandRenderAttributes(block.asset):{})}>{body}</div>;
  });
}
function collectPrintIds(value,ids=[]){
  if(!value||typeof value!=='object')return ids;
  if(typeof value.id==='string')ids.push(value.id);
  for(const [key,child]of Object.entries(value))if(key!=='extensions')collectPrintIds(child,ids);
  return ids;
}
function PrintCover({cover,assets,usedIds=[]}) {
  const projected=projectManualCover(cover,{usedIds});
  const roleOf=block=>{const marker=getManualCoverProjection(block.extensions);return marker&&marker.blockId===block.id&&marker.coverId===cover.id?marker.role:null;};
  const render=block=>{
    const role=roleOf(block);let body;
    if(role==='logo')body=<img className="lds-manual-logo" {...getManualBrandRenderAttributes(block.asset)} style={{...manualFigureWidthStyle(readManualFigureLayout(block.extensions)?.widthPx),...manualFigureAlignmentStyle(resolveManualFigureAlignment(block.extensions,{defaultAlignment:'left'}))}} src={resolveManualAsset(block.asset,assets)} alt={block.alt}/>;
    else if(role==='title')body=<h1 className="manual-v2-cover-title" data-manual-cover-role="title"><Inline content={block.content}/></h1>;
    else if(role==='metadata'&&getManualCoverProjection(block.extensions)?.editableTable===true)return <Blocks key={block.id} blocks={[block]} assets={assets}/>;
    else if(role==='metadata')body=<ManualMetadata rowMinHeightsPx={getManualTableLayout(block).rowMinHeightsPx} items={(cover.metadata||[]).map(item=>({label:<span id={item.id} data-print-id={item.id}><Inline content={item.label}/></span>,value:<Inline content={item.value}/>}))}/>;
    else if(role==='divider')body=<ManualDivider cover variant={resolveManualDividerStyle(block.extensions,{cover:true})}/>;
    else if(role==='sectionTitle')body=<ManualSectionTitle data-manual-cover-role="sectionTitle"><Inline content={block.content}/></ManualSectionTitle>;
    else return <Blocks key={block.id} blocks={[block]} assets={assets}/>;
    return <div key={block.id} id={block.id} data-print-id={block.id}>{body}</div>;
  };
  const body=[...projected.bodyBlocks],prefix=roleOf(body[0]||{})==='sectionTitle'?body.shift():null;
  return <>
    {projected.headerBlocks.map(render)}
    <div className="lds-manual-section">{prefix&&render(prefix)}<div className="lds-manual-section-body">{body.map(render)}</div></div>
  </>;
}
function contentIssues(document,assets) {
  const issues=[];
  if(!document.title.trim())issues.push({id:document.id,message:'문서 제목을 입력하세요.'});
  const scan=blocks=>{for(const block of blocks){
    if(block.type==='figure'){
      if(!resolveManualAsset(block.asset,assets))issues.push({id:block.id,message:'이미지를 다시 넣어 주세요.'});
      if(!block.alt.trim())issues.push({id:block.id,message:'이미지 대체 설명을 입력하세요.'});
    }
    if(block.type==='procedure')for(const step of block.steps){if(!inlineText(step.title).trim())issues.push({id:step.id,message:'단계 제목을 입력하세요.'});scan(step.blocks);}
    if(block.blocks)scan(block.blocks);
    if(block.figure)scan([block.figure]);
    if(block.type==='list')block.items.forEach(item=>scan(item.blocks));
  }};
  for(const page of document.pages)scan(projectManualPage(page,{usedIds:collectPrintIds(document)}).blocks);
  for(const cover of getManualDocumentCovers(document))scan(cover.blocks);
  return issues;
}
export function ManualPrint({document:manual,assets,onIssues}) {
  const root=useRef(null);
  useEffect(()=>{
    let cancelled=false;
    onIssues(null);
    async function measure(){
      await window.document.fonts.ready;
      await Promise.all([...root.current.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});})));
      await new Promise(requestAnimationFrame);
      if(cancelled)return;
      const issues=contentIssues(manual,assets);
      for(const page of root.current.querySelectorAll('.lds-manual-page')){
        const area=page.querySelector('.lds-manual-content'),bounds=area.getBoundingClientRect();
        const overflow=[...area.querySelectorAll('[data-print-id],h2,p,table,img')].find(el=>{const rect=el.getBoundingClientRect();return (rect.width>0||rect.height>0)&&(rect.bottom>bounds.bottom+1||rect.right>bounds.right+1);});
        if(overflow||area.scrollHeight>area.clientHeight+1)issues.push({id:overflow?.closest('[data-print-id]')?.dataset.printId||page.closest('[data-page-id]')?.dataset.pageId,message:`${page.dataset.manualPage}쪽의 내용이 A4 영역을 벗어납니다. 페이지를 나누거나 내용을 줄여 주세요.`});
      }
      for(const image of root.current.querySelectorAll('img'))if(!image.naturalWidth)issues.push({id:image.closest('[data-print-id]')?.dataset.printId,message:'이미지 파일을 읽을 수 없습니다.'});
      onIssues(issues);
    }
    measure();return()=>{cancelled=true;};
  },[manual,assets,onIssues]);
  const pages=getOrderedPageEntries(manual),covers=new Set(getManualDocumentCovers(manual)),usedIds=collectPrintIds(manual);
  return <div className="manual-v2-print" aria-hidden="true" inert><div className="manual-v2-print-pages lds-manual" ref={root}>
    {pages.map((page,index)=><div key={page.id} id={page.id} data-page-id={page.id}><ManualPage ordered={!covers.has(page)} number={index+1} total={pages.length} cover={covers.has(page)}>
      {covers.has(page)?<PrintCover cover={page} assets={assets} usedIds={usedIds}/>:<div className="manual-v2-print-page-content"><Blocks blocks={projectManualPage(page,{usedIds}).blocks} assets={assets} pageId={page.id}/></div>}
    </ManualPage></div>)}
  </div></div>;
}
