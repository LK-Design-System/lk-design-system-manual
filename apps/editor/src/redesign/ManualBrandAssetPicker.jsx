import React from 'react';
import {Button} from '@lk-design-system/lds-core/components/buttons/Button';
import {MANUAL_BRAND_ASSETS} from './manual-brand-assets.mjs';
import {resolveManualAsset} from './manual-brand-asset-urls.mjs';
import './manual-brand-asset-picker.css';

// The parent owns the pinned insertion request and cancellation. Opening this
// picker creates no document node; only a finite registry ID leaves this view.
export function ManualBrandAssetPicker({onChoose,disabled=false,value}){
 const unavailable=disabled||typeof onChoose!=='function';
 return <div className="manual-brand-asset-picker" role="group" aria-label="로고 선택">
  {MANUAL_BRAND_ASSETS.map(asset=><Button key={asset.id} type="button" variant="ghost" disabled={unavailable}
   aria-label={asset.label} aria-pressed={value===asset.id||value===asset.asset}
   onClick={()=>{if(!unavailable)onChoose(asset.id);}}
   styles={{root:{display:'flex',flexDirection:'column',alignItems:'stretch',justifyContent:'flex-start',gap:'var(--space-2)',height:'auto',minHeight:40,minWidth:0,width:'100%',boxSizing:'border-box',padding:'var(--space-3)',whiteSpace:'normal',textAlign:'left',...(value===asset.id||value===asset.asset?{background:'var(--color-semantic-primary-surface-normal)',border:'1px solid var(--color-semantic-primary-normal)',boxShadow:'inset 0 0 0 1px var(--color-semantic-primary-normal)'}:{})},content:{display:'grid',gridTemplateColumns:'minmax(0,1fr)',alignItems:'stretch',justifyContent:'stretch',width:'100%',minWidth:0}}}>
   <span className="manual-brand-asset-card-content">
   <span className="manual-brand-asset-preview" data-surface={asset.previewSurface}>
    <img src={resolveManualAsset(asset.asset)} alt={asset.alt+' · '+asset.label}/>
   </span>
   <span className="manual-brand-asset-label">{asset.label}</span>
   <span className="manual-brand-asset-purpose">{asset.tone==='white'?'남색 배경용':asset.family==='corporateSquare'?'법인명 포함':'밝은 배경용'}</span>
   </span>
  </Button>)}
 </div>;
}
