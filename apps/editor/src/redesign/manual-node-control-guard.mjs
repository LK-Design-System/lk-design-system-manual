// Reuse the editor's shared gesture gate for direct NodeView controls too.
export function manualNodeControlAllowed(view,event={},dom){
 if(!view?.editable||view.composing||event.defaultPrevented||event.isComposing||event.keyCode===229||dom?.isConnected===false)return false;
 const guard=view.props?.manualTableSelectionGestureBlocked;
 if(typeof guard==='function'?guard(view,event):guard){event.preventDefault?.();return false;}
 return true;
}
