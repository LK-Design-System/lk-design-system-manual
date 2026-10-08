import test from 'node:test';
import assert from 'node:assert/strict';
import {getOutlinePageDropTarget, installOutlinePageDrag} from '../src/redesign/outline-page-drag.mjs';

const groups = () => [
 {id: 'cover', kind: 'cover', fixed: true, rect: {top: 0, bottom: 40}},
 {id: 'a', rect: {top: 40, bottom: 100}},
 {id: 'b', rect: {top: 100, bottom: 160}},
 {id: 'c', rect: {top: 160, bottom: 220}}
];
const box = {left: 0, top: 0, right: 200, bottom: 240};
const drop = (sourceId, y, entries = groups(), x = 100) => getOutlinePageDropTarget({sourceId, point: {x, y}, groups: entries, bounds: box});

test('logical roots use before/after slots while explicitly fixed starts, source and outside bounds stay inert', () => {
 assert.equal(drop('cover', 200), null);
 assert.equal(drop('a', 70), null);
 assert.deepEqual(drop('a', 20), {targetId:'cover',edge:'before',anchor:{left:0,right:200,top:0,bottom:0}});
 assert.equal(drop('a', 200, groups(), 201), null);
 assert.equal(drop('a', 250), null);
 assert.deepEqual(drop('a', 180), {targetId: 'c', edge: 'before', anchor: {left: 0, right: 200, top: 160, bottom: 160}});
 assert.deepEqual(drop('a', 230), {targetId: 'c', edge: 'after', anchor: {left: 0, right: 200, top: 220, bottom: 220}});
 assert.equal(drop('a', 110).edge, 'after');
 assert.equal(drop('c', 150).targetId, 'b');
 assert.equal(drop('c', 150).edge, 'before');
 assert.equal(drop('c', 50).targetId, 'a');
});
test('body groups can move before an explicitly fixed first cover', () => {
 for (const sourceId of ['a', 'b', 'c']) {
  assert.deepEqual(drop(sourceId, 10), {targetId:'cover',edge:'before',anchor:{left:0,right:200,top:0,bottom:0}});
 }
 assert.equal(drop('cover', 10), null);
});
test('cover anchors and no-op slots use actual order when a cover follows or separates body groups', () => {
 const middle=[{id:'a',rect:{top:0,bottom:60}},{id:'cover',kind:'cover',rect:{top:60,bottom:100}},{id:'b',rect:{top:100,bottom:160}},{id:'c',rect:{top:160,bottom:220}}];
 assert.deepEqual(drop('b', 70, middle), {targetId:'cover',edge:'before',anchor:{left:0,right:200,top:60,bottom:60}});
 assert.deepEqual(drop('a', 70, middle), {targetId:'cover',edge:'after',anchor:{left:0,right:200,top:100,bottom:100}});
 assert.deepEqual(drop('a', 110, middle), {targetId:'b',edge:'before',anchor:{left:0,right:200,top:100,bottom:100}});
 const last=[{id:'a',rect:{top:0,bottom:60}},{id:'b',rect:{top:60,bottom:120}},{id:'cover',kind:'cover',fixed:true,rect:{top:120,bottom:160}}];
 assert.deepEqual(drop('a', 170, last), {targetId:'cover',edge:'after',anchor:{left:0,right:200,top:160,bottom:160}});
 assert.deepEqual(drop('b', 130, last), {targetId:'cover',edge:'after',anchor:{left:0,right:200,top:160,bottom:160}});
 assert.deepEqual(drop('b', 150, last), {targetId:'cover',edge:'after',anchor:{left:0,right:200,top:160,bottom:160}});
 assert.equal(drop('cover', 10, last), null);
});
test('an automatic-tail group can cross a cover using only its authored root identity', () => {
 const entries=[{id:'cover',kind:'cover',rect:{top:0,bottom:40}},{id:'root-with-tails',rect:{top:40,bottom:190}}];
 assert.deepEqual(drop('root-with-tails', 10, entries), {targetId:'cover',edge:'before',anchor:{left:0,right:200,top:0,bottom:0}});
 assert.equal(drop('physical-tail', 10, entries), null);
 assert.equal(drop('root-with-tails', 180, entries), null);
});
test('automatic tails remain part of their root rectangle and never become independent move IDs', () => {
 const entries = [{id: 'cover', fixed: true, rect: {top: 0, bottom: 40}}, {id: 'root-with-tails', rect: {top: 40, bottom: 190}}, {id: 'next-root', rect: {top: 190, bottom: 230}}];
 assert.equal(drop('root-with-tails', 180, entries), null);
 assert.deepEqual(drop('root-with-tails', 235, entries), {targetId: 'next-root', edge: 'after', anchor: {left: 0, right: 200, top: 230, bottom: 230}});
 assert.equal(drop('physical-tail', 235, entries), null);
});
test('invalid or stale geometry cannot produce a move', () => {
 assert.equal(drop('missing', 230), null);
 assert.equal(drop('a', 230, [...groups(), groups()[1]]), null);
 assert.equal(drop('a', 230, [{id: 'a', rect: {top: 100, bottom: 40}}]), null);
 assert.equal(getOutlinePageDropTarget({sourceId: 'a', point: {x: 10, y: 230}, groups: groups(), bounds: {...box, right: 0}}), null);
 const shifted = groups().map(group => ({...group, rect: {top: group.rect.top - 30, bottom: group.rect.bottom - 30}}));
 assert.equal(drop('a', 190, shifted).anchor.top, 190);
});

function eventTarget() {
 const listeners = new Map();
 return {
  listeners,
  addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(listener); },
  removeEventListener(name, listener) { listeners.get(name)?.delete(listener); if (!listeners.get(name)?.size) listeners.delete(name); },
  emit(name, options = {}) {
   const event = {button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: 100, clientY: 70, detail: 1, prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.stopped = true; }, ...options};
   for (const listener of [...(listeners.get(name) ?? [])]) listener(event);
   return event;
  }
 };
}
function harness({feedback, sessionChanged, activationMode} = {}) {
 const document = eventTarget(), surface = eventTarget(), frames = new Map();
 let frameId = 0, revision = {}, enabled = true, entries = groups(), captured = null, captureCalls = 0, releaseCalls = 0;
 surface.requestAnimationFrame = fn => { const id = ++frameId; frames.set(id, fn); return id; };
 surface.cancelAnimationFrame = id => frames.delete(id);
 document.defaultView = surface;
 const container = Object.assign(eventTarget(), {ownerDocument: document, scrollTop: 0, scrollHeight: 240, clientHeight: 240,
  contains: handle => handles.includes(handle), getBoundingClientRect: () => box});
 const handles = entries.map(group => ({dataset: {outlinePageHandle: group.id}, closest() { return this; },
  setPointerCapture(id) { captureCalls++; captured = id; }, releasePointerCapture(id) { releaseCalls++; captured = null; document.emit('lostpointercapture', {pointerId: id}); }}));
 const moves = [], feedbacks = [], sessions = [];
 const controller = installOutlinePageDrag({container, surface, activationMode, getGroups: () => entries.map(group => ({...group, rect: {top: group.rect.top - container.scrollTop, bottom: group.rect.bottom - container.scrollTop}})),
  getRevision: () => revision, canStart: () => enabled, onMove: move => moves.push(move), onFeedback: value => { feedbacks.push(value); feedback?.(value); }, onSessionChange: active => { sessions.push(active); sessionChanged?.(active); }});
 return {controller, container, document, surface, frames, moves, feedbacks, sessions, revision,
  down: (id = 'a', options = {}) => container.emit('pointerdown', {target: handles.find(handle => handle.dataset.outlinePageHandle === id), ...options}),
  move: (y, options = {}) => document.emit('pointermove', {clientY: y, ...options}),
  up: (y, options = {}) => document.emit('pointerup', {clientY: y, ...options}),
  flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
  changeRevision() { revision = {}; }, disable() { enabled = false; }, setGroups(value) { entries = value; }, captured: () => captured, captures: () => captureCalls, releases: () => releaseCalls};
}

test('a short gesture preserves native menu click and keyboard activation', () => {
 const h = harness(); h.down(); assert.equal(h.controller.isDragging(), true); h.move(73); h.up(73);
 assert.equal(h.controller.isDragging(), false); assert.equal(h.moves.length, 0); assert.equal(h.feedbacks.length, 0);
 assert.equal(h.container.emit('click').prevented, false);
 assert.equal(h.container.emit('click', {detail: 0}).prevented, false);
 h.controller.dispose();
});
test('an immediate move/up commits once before the first animation frame and suppresses only the pointer click', () => {
 const h = harness(); h.down(); h.move(230); h.up(230);
 assert.deepEqual(h.moves, [{sourceId: 'a', targetId: 'c', edge: 'after', revision: h.revision}]);
 assert.equal(h.frames.size, 0); assert.equal(h.captured(), null);
 h.up(230); assert.equal(h.moves.length, 1);
 assert.equal(h.container.emit('click', {detail: 0}).prevented, false);
 assert.equal(h.container.emit('click').prevented, true);
 assert.equal(h.container.emit('click').prevented, false);
 h.controller.dispose();
});
test('pointerup also detects a drag when no move event/frame was delivered', () => {
 const h = harness(); h.down(); h.up(230); assert.equal(h.moves.length, 1); h.controller.dispose();
});
test('foreign pointers and modified/cover starts cannot reorder', () => {
 const h = harness();
 for (const options of [{button: 2}, {ctrlKey: true}, {metaKey: true}, {altKey: true}, {shiftKey: true}, {isPrimary: false}]) { h.down('a', options); assert.equal(h.controller.isDragging(), false); }
 h.down('cover'); assert.equal(h.controller.isDragging(), false);
 h.down(); h.move(230, {pointerId: 2}); h.up(230, {pointerId: 2}); assert.equal(h.moves.length, 0); assert.equal(h.controller.isDragging(), true);
 h.up(230); assert.equal(h.moves.length, 1); h.controller.dispose();
});
for (const reason of ['pointercancel', 'lostpointercapture', 'Escape', 'blur', 'revision', 'disabled', 'removed source']) test(`${reason} cancels an active drag without changing page order`, () => {
 const h = harness(); h.down(); h.move(230);
 if (reason === 'Escape') assert.equal(h.document.emit('keydown', {key: 'Escape'}).prevented, true);
 else if (reason === 'blur') h.surface.emit('blur');
 else if (reason === 'revision') h.changeRevision();
 else if (reason === 'disabled') h.disable();
 else if (reason === 'removed source') h.setGroups(groups().filter(group => group.id !== 'a'));
 else h.document.emit(reason);
 h.up(230); h.flush(); assert.equal(h.moves.length, 0); assert.equal(h.controller.isDragging(), false); assert.equal(h.frames.size, 0);
 h.controller.dispose();
});
test('dropping outside the navigation cancels, and a new press clears a stale click suppression', () => {
 const h = harness(); h.down(); h.move(230); h.up(230, {clientX: 201}); assert.equal(h.moves.length, 0);
 h.down(); h.up(70); assert.equal(h.container.emit('click').prevented, false); h.controller.dispose();
});
test('drag feedback and drop use fresh geometry after nav scrolling', () => {
 const h = harness(); h.container.scrollHeight = 300; h.down(); h.move(180); h.container.scrollTop = 30; h.flush();
 assert.equal(h.feedbacks.at(-1).target.edge, 'after'); assert.equal(h.feedbacks.at(-1).target.anchor.top, 190);
 h.up(180); assert.equal(h.moves[0].edge, 'after'); assert.equal(h.feedbacks.at(-1), null); h.controller.dispose();
});
test('edge autoscroll advances live geometry, stops at the end and releases its animation frame', () => {
 const h = harness(); h.container.scrollHeight = 300; h.down(); h.move(238); h.flush();
 assert.ok(h.container.scrollTop > 0); assert.equal(h.frames.size, 1);
 for (let i = 0; i < 10 && h.frames.size; i++) h.flush();
 assert.equal(h.container.scrollTop, 60); assert.equal(h.frames.size, 0);
 h.up(238); assert.equal(h.moves.length, 1); h.controller.dispose();
});
test('dispose removes listeners/capture/frames and never calls feedback on a terminated owner', () => {
 let terminated = false;
 const h = harness({feedback() { assert.equal(terminated, false); }}); h.down(); h.move(230); terminated = true; h.controller.dispose();
 assert.equal(h.frames.size, 0); assert.equal(h.controller.isDragging(), false); assert.equal(h.captured(), null);
 for (const target of [h.container, h.document, h.surface]) assert.equal(target.listeners.size, 0);
 h.up(230); assert.equal(h.moves.length, 0);
});
test('short seeds notify pause and resumption even when no visual drag feedback was shown', () => {
 const h = harness(); h.down(); assert.deepEqual(h.sessions, [true]); h.up(70);
 assert.deepEqual(h.sessions, [true, false]); assert.equal(h.feedbacks.length, 0); h.up(70); assert.equal(h.sessions.length, 2);
 h.down(); h.document.emit('keydown', {key:'Escape'}); assert.deepEqual(h.sessions, [true, false, true, false]); h.controller.dispose();
});
test('cancellation clears the session before notifying its caller, while disposed owners receive no callbacks', () => {
 let h, terminated=false;
 h=harness({sessionChanged(active){assert.equal(terminated,false);assert.equal(h.controller.isDragging(),active);}});
 h.down(); h.document.emit('pointercancel'); assert.deepEqual(h.sessions,[true,false]);
 h.down(); h.move(230); terminated=true; h.controller.dispose(); assert.deepEqual(h.sessions,[true,false,true]);
 assert.equal(h.controller.isDragging(),false); assert.equal(h.frames.size,0);
});
test('a failing seed observer cancels capture and reports its error without moving a page', () => {
 const h=harness({sessionChanged(active){if(active)throw new Error('seed observer');}});
 assert.throws(()=>h.down(),/seed observer/);assert.equal(h.controller.isDragging(),false);assert.equal(h.captured(),null);
 assert.deepEqual(h.sessions,[true,false]);assert.equal(h.moves.length,0);assert.equal(h.frames.size,0);h.controller.dispose();
});
test('a failing completion observer still clears drag feedback and cannot commit a page move', () => {
 const h=harness({sessionChanged(active){if(!active)throw new Error('completion observer');}});
 h.down();h.move(230);h.flush();assert.throws(()=>h.up(230),/completion observer/);
 assert.equal(h.controller.isDragging(),false);assert.equal(h.captured(),null);assert.equal(h.feedbacks.at(-1),null);
 assert.equal(h.frames.size,0);assert.equal(h.moves.length,0);h.controller.dispose();
});
test('row mode leaves short navigation presses unprevented and uncaptured', () => {
 const h=harness({activationMode:'row'}),down=h.down(),move=h.move(73),up=h.up(73);
 for(const event of [down,move,up]){assert.equal(event.prevented,false);assert.equal(event.stopped,false);}
 assert.equal(h.captures(),0);assert.equal(h.releases(),0);assert.equal(h.captured(),null);
 assert.deepEqual(h.sessions,[true,false]);assert.equal(h.moves.length,0);
 assert.equal(h.container.emit('click').prevented,false);assert.equal(h.container.emit('click',{detail:0}).prevented,false);
 h.controller.dispose();
});
test('row mode captures only after the threshold and commits one drop while suppressing the pointer click', () => {
 const h=harness({activationMode:'row'});h.down();assert.equal(h.captures(),0);h.move(75);assert.equal(h.captures(),0);
 const move=h.move(230);assert.equal(move.prevented,true);assert.equal(move.stopped,true);assert.equal(h.captures(),1);
 h.move(231);assert.equal(h.captures(),1);const up=h.up(230);assert.equal(up.prevented,true);assert.equal(up.stopped,true);
 assert.deepEqual(h.moves,[{sourceId:'a',targetId:'c',edge:'after',revision:h.revision}]);assert.equal(h.releases(),1);assert.equal(h.captured(),null);
 assert.deepEqual(h.sessions,[true,false]);assert.equal(h.container.emit('click').prevented,true);assert.equal(h.container.emit('click').prevented,false);
 h.up(230);assert.equal(h.moves.length,1);h.controller.dispose();
});
test('row mode commits a body before cover once and leaves cover starts and stale revisions inert', () => {
 const h=harness({activationMode:'row'});h.down('cover');assert.equal(h.controller.isDragging(),false);
 h.down('b',{clientY:130});h.move(10);h.up(10);
 assert.deepEqual(h.moves,[{sourceId:'b',targetId:'cover',edge:'before',revision:h.revision}]);
 assert.deepEqual(h.sessions,[true,false]);assert.equal(h.captures(),1);assert.equal(h.releases(),1);assert.equal(h.container.emit('click').prevented,true);
 h.up(10);assert.equal(h.moves.length,1);h.controller.dispose();
 const stale=harness({activationMode:'row'});stale.down('b',{clientY:130});stale.move(10);stale.changeRevision();stale.up(10);
 assert.equal(stale.moves.length,0);assert.equal(stale.controller.isDragging(),false);assert.deepEqual(stale.sessions,[true,false]);stale.controller.dispose();
});
test('row mode checks pointerup distance even when no move event arrived', () => {
 const h=harness({activationMode:'row'});h.down();const up=h.up(230);
 assert.equal(up.prevented,true);assert.equal(h.moves.length,1);assert.equal(h.captures(),0);assert.equal(h.releases(),0);
 assert.equal(h.container.emit('click').prevented,true);h.controller.dispose();
});
test('row mode ignores the sibling menu and keeps cover and unavailable navigation presses intact', () => {
 const h=harness({activationMode:'row'});
 const sibling=h.down('a',{target:{closest:()=>null}}),cover=h.down('cover');h.disable();const unavailable=h.down();
 for(const event of [sibling,cover,unavailable])assert.equal(event.prevented,false);
 assert.equal(h.controller.isDragging(),false);assert.equal(h.captures(),0);assert.equal(h.sessions.length,0);
 assert.equal(h.container.emit('click').prevented,false);h.controller.dispose();
});
test('row mode does not seed touch or pen dragging and clears stale suppression for a new tap', () => {
 const h=harness({activationMode:'row'});h.down();h.move(230);h.document.emit('pointercancel');
 for(const pointerType of ['touch','pen']){
  const event=h.down('a',{pointerType});assert.equal(event.prevented,false);assert.equal(h.controller.isDragging(),false);
  assert.equal(h.container.emit('click').prevented,false);
 }
 assert.deepEqual(h.sessions,[true,false]);assert.equal(h.moves.length,0);h.controller.dispose();
});
test('row mode stale revisions cancel before capture or after activation without committing', () => {
 for(const activated of [false,true]){
  const h=harness({activationMode:'row'});h.down();if(activated)h.move(230);h.changeRevision();h.move(230);h.up(230);
  assert.equal(h.moves.length,0);assert.equal(h.controller.isDragging(),false);assert.equal(h.captured(),null);assert.equal(h.frames.size,0);
  assert.equal(h.captures(),activated?1:0);assert.equal(h.releases(),activated?1:0);assert.deepEqual(h.sessions,[true,false]);h.controller.dispose();
 }
});
test('row mode seed and active cancellations resume once and clear capture and frames', () => {
 for(const activated of [false,true])for(const reason of ['pointercancel','lostpointercapture','Escape','blur','disabled']){
  const h=harness({activationMode:'row'});h.down();if(activated)h.move(230);
  if(reason==='Escape')h.document.emit('keydown',{key:'Escape'});
  else if(reason==='blur')h.surface.emit('blur');
  else if(reason==='disabled'){h.disable();h.move(230);}
  else h.document.emit(reason);
  h.up(230);assert.equal(h.moves.length,0);assert.equal(h.controller.isDragging(),false);assert.equal(h.captured(),null);assert.equal(h.frames.size,0);
  assert.deepEqual(h.sessions,[true,false]);assert.equal(h.releases(),activated?1:0);h.controller.dispose();
 }
});
test('row mode disposal clears either seed or captured drag without reading a terminated observer', () => {
 for(const activated of [false,true]){
  let terminated=false;
  const h=harness({activationMode:'row',sessionChanged(){assert.equal(terminated,false);}});h.down();if(activated)h.move(230);terminated=true;h.controller.dispose();
  assert.equal(h.controller.isDragging(),false);assert.equal(h.captured(),null);assert.equal(h.frames.size,0);assert.deepEqual(h.sessions,[true]);
 }
});
test('row mode opt-in keeps the default handle press contract', () => {
 const h=harness(),down=h.down();assert.equal(down.prevented,true);assert.equal(down.stopped,true);assert.equal(h.captures(),1);
 h.up(70);assert.equal(h.releases(),1);assert.equal(h.container.emit('click').prevented,false);h.controller.dispose();
});
