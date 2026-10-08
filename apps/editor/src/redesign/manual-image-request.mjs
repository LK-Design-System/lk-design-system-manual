// A chooser belongs to the document and insertion position that opened it.
export function captureManualImageRequest({generation,documentId,targetId=null,insertionAnchor=null}){
 return Object.freeze({generation,documentId,targetId,insertionAnchor});
}
export function isManualImageRequestCurrent(request,{generation,documentId}){
 return !!request&&request.generation===generation&&request.documentId===documentId;
}
