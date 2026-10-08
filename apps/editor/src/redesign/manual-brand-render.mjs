import {getManualBrandAssetByKey} from './manual-brand-assets.mjs';

// Presentation only: preserve the official asset key and its original artwork.
export function getManualBrandRenderAttributes(key){
 return getManualBrandAssetByKey(key)?.tone==='white'?{'data-manual-brand-surface':'navy'}:{};
}
