const HANDLE = '[data-outline-page-handle]';
const DRAG_DISTANCE = 6;

function rectangle(value) {
 if (!value) return null;
 const {left, top} = value;
 const right = value.right ?? left + value.width;
 const bottom = value.bottom ?? top + value.height;
 return [left, top, right, bottom].every(Number.isFinite) && right > left && bottom > top
  ? {left, top, right, bottom} : null;
}

function validGroups(groups) {
 if (!Array.isArray(groups)) return false;
 const ids = new Set();
 return groups.every(group => {
  if (!group || typeof group.id !== 'string' || !group.id || ids.has(group.id)) return false;
  ids.add(group.id);
  return Number.isFinite(group.rect?.top) && Number.isFinite(group.rect?.bottom) && group.rect.bottom > group.rect.top;
 });
}

const fixed = group => group.fixed;
const contains = (point, bounds) => point && Number.isFinite(point.x) && Number.isFinite(point.y)
 && point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;

// Each entry is one logical page: its manual root and consecutive automatic tails.
// The caller owns grouping and the model command; this helper only chooses a slot.
export function getOutlinePageDropTarget({point, groups, sourceId, bounds}) {
 const box = rectangle(bounds);
 if (!box || !contains(point, box) || !validGroups(groups)) return null;
 const source = groups.find(group => group.id === sourceId);
 if (!source || fixed(source)) return null;
 if (point.y >= source.rect.top && point.y <= source.rect.bottom) return null;
 // Explicitly fixed groups remain ordered drop anchors.
 const candidates = groups.filter(group => group !== source);
 if (!candidates.length) return null;
 const sourceIndex = groups.indexOf(source);
 // A neighboring page is a swap destination across its whole row. Otherwise
 // the upper half of the next row (or lower half of the previous row) is an
 // invisible no-op, making the same row drop behave differently by direction.
 const neighbor = candidates.find(group => Math.abs(groups.indexOf(group) - sourceIndex) === 1 && point.y >= group.rect.top && point.y <= group.rect.bottom);
 const before = candidates.find(group => point.y < (group.rect.top + group.rect.bottom) / 2);
 const target = neighbor ?? before ?? candidates.at(-1);
 const edge = neighbor ? groups.indexOf(neighbor) < sourceIndex ? 'before' : 'after' : before ? 'before' : 'after';
 const slot = groups.indexOf(target) + (edge === 'after' ? 1 : 0);
 if (slot - (sourceIndex < slot ? 1 : 0) === sourceIndex) return null;
 const y = Math.max(box.top, Math.min(box.bottom, target.rect[edge === 'before' ? 'top' : 'bottom']));
 return {targetId: target.id, edge, anchor: {left: box.left, right: box.right, top: y, bottom: y}};
}

export function installOutlinePageDrag({container, getGroups, getBounds, getRevision, canStart = () => true, onMove, onFeedback = () => {}, onSessionChange = () => {}, activationMode = 'handle', surface = container.ownerDocument.defaultView}) {
 const document = container.ownerDocument;
 const rowMode = activationMode === 'row';
 let alive = true, session = null, frame = null, suppressClick = false, keyboardActivation = null;
 const bounds = () => rectangle(getBounds ? getBounds() : container.getBoundingClientRect());
 const valid = current => alive && current === session && canStart(current.sourceId)
  && Object.is(getRevision(), current.revision);
 const cancelFrame = () => {
  if (frame !== null) surface.cancelAnimationFrame(frame);
  frame = null;
 };
 const capture = current => {
  if (current.captured || typeof current.handle.setPointerCapture !== 'function') return;
  try { current.handle.setPointerCapture(current.pointerId); current.captured = true; } catch {}
 };
 const finish = (feedback = true) => {
  const current = session;
  if (!current) return;
  session = null;
  cancelFrame();
  if (current.started && !current.keyboard) suppressClick = true;
  // Clear state first: releasing capture can synchronously emit lostpointercapture.
  try { if (current.captured) current.handle.releasePointerCapture?.(current.pointerId); } catch {}
  try { if (alive) onSessionChange(false); }
  finally { if (alive && feedback && current.started) onFeedback(null); }
 };
 const startIfMoved = current => {
  const dx = current.point.x - current.start.x, dy = current.point.y - current.start.y;
  if (dx * dx + dy * dy >= DRAG_DISTANCE * DRAG_DISTANCE) current.started = true;
 };
 const targetAt = current => getOutlinePageDropTarget({point: current.point, groups: getGroups(), sourceId: current.sourceId, bounds: bounds()});
 const schedule = () => {
  if (!alive || frame !== null || !session?.started || session.keyboard) return;
  frame = surface.requestAnimationFrame(refresh);
 };
 const refresh = () => {
  frame = null;
  const current = session;
  if (!current || current.keyboard) return;
  if (!valid(current)) { finish(); return; }
  const box = bounds();
  let scrolled = false;
  if (box && contains(current.point, box) && [container.scrollTop, container.scrollHeight, container.clientHeight].every(Number.isFinite)) {
   const zone = Math.min(28, (box.bottom - box.top) / 2);
   const velocity = current.point.y < box.top + zone ? -12 * (1 - (current.point.y - box.top) / zone)
    : current.point.y > box.bottom - zone ? 12 * (1 - (box.bottom - current.point.y) / zone) : 0;
   const previous = container.scrollTop;
   if (velocity) container.scrollTop = Math.max(0, Math.min(previous + velocity, Math.max(0, container.scrollHeight - container.clientHeight)));
   scrolled = Math.abs(container.scrollTop - previous) > .01;
  }
  if (!valid(current)) { finish(); return; }
  onFeedback({dragging: true, sourceId: current.sourceId, target: targetAt(current), point: {...current.point}});
  if (scrolled) schedule();
 };
 const pointOf = event => ({x: event.clientX, y: event.clientY});
 const down = event => {
  if (session?.keyboard) finish();
  keyboardActivation = null;
  if (!alive || session || event.button !== 0 || event.isPrimary === false || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  suppressClick = false;
  if (rowMode && event.pointerType !== 'mouse') return;
  const handle = event.target?.closest?.(HANDLE);
  if (!handle || !container.contains(handle)) return;
  const sourceId = handle.dataset.outlinePageHandle, groups = getGroups(), point = pointOf(event);
  if (!validGroups(groups) || !groups.some(group => group.id === sourceId && !fixed(group)) || !canStart(sourceId) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  session = {sourceId, handle, pointerId: event.pointerId, revision: getRevision(), start: point, point, started: false, captured: false};
  // Row activation preserves native navigation until this becomes a drag.
  if (!rowMode) { event.preventDefault(); event.stopPropagation(); capture(session); }
  try { onSessionChange(true); }
  catch (error) { try { finish(); } finally { throw error; } }
 };
 const move = event => {
  const current = session;
  if (!current || current.keyboard || event.pointerId !== current.pointerId) return;
  if (!valid(current)) { finish(); return; }
  current.point = pointOf(event);
  if (![current.point.x, current.point.y].every(Number.isFinite)) { finish(); return; }
  startIfMoved(current);
  if (current.started) {
   if (rowMode) { capture(current); event.stopPropagation(); }
   event.preventDefault(); schedule();
  }
 };
 const up = event => {
  const current = session;
  if (!current || current.keyboard || event.pointerId !== current.pointerId) return;
  if (!valid(current)) { finish(); return; }
  current.point = pointOf(event);
  startIfMoved(current);
  const target = current.started ? targetAt(current) : null;
  if (current.started) { event.preventDefault(); if (rowMode) event.stopPropagation(); }
  finish();
  if (alive && target && canStart(current.sourceId) && Object.is(getRevision(), current.revision)) {
   onMove({sourceId: current.sourceId, targetId: target.targetId, edge: target.edge, revision: current.revision});
  }
 };
 const cancel = event => { if (session && !session.keyboard && event.pointerId === session.pointerId) finish(); };
 const restoreKeyboardFocus = (current, restoreScroll = false) => {
  if (!alive || !container.contains(current.handle) || current.handle.isConnected === false) return;
  if (restoreScroll && Number.isFinite(current.scrollTop)) container.scrollTop = current.scrollTop;
  current.handle.focus?.({preventScroll:true});
 };
 const escape = event => {
  if (session && event.key === 'Escape' && !event.isComposing && event.keyCode !== 229) {
   const current = session;
   event.preventDefault(); event.stopPropagation();
   try { finish(); } finally { if (current.keyboard) restoreKeyboardFocus(current, true); }
  }
 };
 const blur = () => { keyboardActivation = null; finish(); };
 const activationKey = key => key === 'Enter' ? 'Enter' : key === ' ' || key === 'Spacebar' ? 'Space' : null;
 const keyboardGroups = current => {
  if (!valid(current) || !container.contains(current.handle) || current.handle.isConnected === false) return null;
  const groups = getGroups();
  if (!validGroups(groups) || groups.length !== current.groupIds.length || groups.some((group,index) => group.id !== current.groupIds[index])) return null;
  const source = groups.find(group => group.id === current.sourceId);
  return source && !fixed(source) ? groups : null;
 };
 const keyboardTarget = (current, groups) => {
  const box = bounds(), sourceIndex = groups.findIndex(group => group.id === current.sourceId);
  if (!box || current.slot === sourceIndex) return null;
  const candidates = groups.filter(group => group.id !== current.sourceId);
  const target = candidates[current.slot] ?? candidates.at(-1);
  if (!target) return null;
  const edge = current.slot < candidates.length ? 'before' : 'after';
  const y = Math.max(box.top, Math.min(box.bottom, target.rect[edge === 'before' ? 'top' : 'bottom']));
  return {targetId:target.id,edge,anchor:{left:box.left,right:box.right,top:y,bottom:y}};
 };
 const previewKeyboard = (current, reveal = true) => {
  if (!current?.keyboard) return;
  let groups = keyboardGroups(current);
  if (!groups) { finish(); return; }
  let target = keyboardTarget(current, groups);
  const box = bounds(), group = target && groups.find(group => group.id === target.targetId);
  if (reveal && box && group && [container.scrollTop,container.scrollHeight,container.clientHeight].every(Number.isFinite)) {
   const y = group.rect[target.edge === 'before' ? 'top' : 'bottom'];
   const delta = y < box.top ? y - box.top : y > box.bottom ? y - box.bottom : 0;
   if (delta) {
    container.scrollTop = Math.max(0,Math.min(container.scrollTop + delta,Math.max(0,container.scrollHeight - container.clientHeight)));
    groups = keyboardGroups(current);
    if (!groups) { finish(); return; }
    target = keyboardTarget(current, groups);
   }
  }
  try { onFeedback({dragging:true,keyboard:true,sourceId:current.sourceId,target}); }
  catch (error) { try { finish(); } finally { throw error; } }
 };
 const keydown = event => {
  if (!alive || event.defaultPrevented || session && !session.keyboard) return;
  if (event.isComposing || event.keyCode === 229 || event.key === 'Process') { if (session?.keyboard) finish(); return; }
  if (session?.keyboard && event.key === 'Tab') { finish(); keyboardActivation = null; return; }
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const handle = event.target?.closest?.(HANDLE), key = activationKey(event.key);
  if (!handle || !container.contains(handle) || document.activeElement !== handle || session && session.handle !== handle) return;
  const current = session;
  const groups = current ? keyboardGroups(current) : null;
  if (current && !groups) { finish(); return; }
  if (!key && (!current || !['ArrowUp','ArrowDown'].includes(event.key))) return;
  if (key && keyboardActivation?.handle === handle && keyboardActivation.key === key) {
   event.preventDefault(); event.stopPropagation(); return;
  }
  if (!current) {
   if (!key || event.repeat) return;
   const groups = getGroups(), sourceId = handle.dataset.outlinePageHandle;
   const sourceIndex = Array.isArray(groups) ? groups.findIndex(group => group.id === sourceId && !fixed(group)) : -1;
   if (!validGroups(groups) || sourceIndex < 0 || !canStart(sourceId) || !bounds()) return;
   suppressClick = false;
   session = {keyboard:true,started:true,sourceId,handle,revision:getRevision(),slot:sourceIndex,groupIds:groups.map(group => group.id),scrollTop:container.scrollTop};
   keyboardActivation = {handle,key};
   event.preventDefault(); event.stopPropagation();
   try { onSessionChange(true); previewKeyboard(session); }
   catch (error) { try { finish(); } finally { throw error; } }
   return;
  }
  event.preventDefault(); event.stopPropagation();
  if (!key) {
   current.slot = Math.max(0,Math.min(current.slot + (event.key === 'ArrowUp' ? -1 : 1),current.groupIds.length - 1));
   previewKeyboard(current);
   return;
  }
  if (event.repeat || keyboardActivation?.handle === handle && keyboardActivation.key === key) return;
  keyboardActivation = {handle,key};
  const target = keyboardTarget(current, groups);
  try {
   finish();
   if (alive && target && canStart(current.sourceId) && Object.is(getRevision(),current.revision)) {
    onMove({sourceId:current.sourceId,targetId:target.targetId,edge:target.edge,revision:current.revision});
   }
  } finally {
   restoreKeyboardFocus(current);
   if (alive && document.activeElement === handle && container.contains(handle)) keyboardActivation = {handle,key};
  }
 };
 const keyup = event => {
  if (!keyboardActivation || activationKey(event.key) !== keyboardActivation.key || event.target?.closest?.(HANDLE) !== keyboardActivation.handle) return;
  event.preventDefault(); event.stopPropagation(); keyboardActivation = null;
 };
 const focusout = event => {
  const leaves = handle => (event.target === handle || handle.contains?.(event.target)) && event.relatedTarget !== handle && !handle.contains?.(event.relatedTarget);
  if (keyboardActivation && leaves(keyboardActivation.handle)) keyboardActivation = null;
  if (session?.keyboard && leaves(session.handle)) finish();
 };
 const scroll = () => { if (session?.keyboard) previewKeyboard(session,false); else schedule(); };
 const click = event => {
  if (keyboardActivation && event.target?.closest?.(HANDLE) === keyboardActivation.handle) {
   event.preventDefault();
   if (event.stopImmediatePropagation) event.stopImmediatePropagation(); else event.stopPropagation();
   return;
  }
  if (!suppressClick || event.detail === 0) return;
  suppressClick = false;
  event.preventDefault();
  if (event.stopImmediatePropagation) event.stopImmediatePropagation(); else event.stopPropagation();
 };
 const bindings = [
  [container, 'pointerdown', down, false], [container, 'click', click, true], [container, 'scroll', scroll, false],
  [container, 'keydown', keydown, true], [container, 'keyup', keyup, true], [container, 'focusout', focusout, false],
  [document, 'pointermove', move, true], [document, 'pointerup', up, true],
  [document, 'pointercancel', cancel, true], [document, 'lostpointercapture', cancel, true],
  [document, 'keydown', escape, true], [surface, 'blur', blur, false]
 ];
 bindings.forEach(([target, name, listener, capture]) => target.addEventListener(name, listener, capture));
 return {
  // Pause pagination from pointerdown so the captured logical group remains stable.
  isDragging: () => session !== null,
  dispose() {
   alive = false;
   keyboardActivation = null;
   finish(false);
   cancelFrame();
   bindings.forEach(([target, name, listener, capture]) => target.removeEventListener(name, listener, capture));
  }
 };
}
