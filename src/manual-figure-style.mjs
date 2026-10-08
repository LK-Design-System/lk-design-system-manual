/** Width is persisted in unscaled CSS pixels and clamped by its content frame. */
export function manualFigureWidthStyle(widthPx){return Number.isFinite(widthPx)&&widthPx>0?{width:`${widthPx}px`,maxWidth:'100%'}:null;}
/** Alignment never changes authored width, crop or media aspect ratio. */
export function manualFigureAlignmentStyle(alignment='center'){
 return {marginLeft:alignment==='left'?0:'auto',marginRight:alignment==='right'?0:'auto'};
}
