# Manual 에디터 모델 계약과 구현 상태

상태: **adapter·명령·실제 ProseMirror history 구현 및 빠른 검사 통과**, 2026-10-05. 브라우저의 한글 IME 실입력, 최종 UI와 파일 host 통합은 별도 확인 대상이다. [실행 계획](manual-editor-plan.md)과 [준비도 점검](manual-editor-readiness.md)의 B 담당 구현 근거다.

## 구현 파일과 호출 방법

| 파일 | 책임 |
|---|---|
| [model-contract.mjs](../../apps/editor/src/editor/model-contract.mjs) | 계약 이름, domain 역할, 지원 블록, 필수 구조 필드, plain JSON 복사 |
| [adapter](../../apps/editor/src/manual-adapter/index.mjs) | Manual JSON↔Tiptap JSON, canonical/draft gate, 경로→node 위치 |
| [operations](../../apps/editor/src/manual-adapter/operations.mjs) | 순수 삽입·삭제·이동·분리·속성 변경과 미지원 필드 보호 |
| [custom nodes](../../apps/editor/src/editor/custom-nodes.mjs) | runtime을 주입받는 실제 Tiptap node extension factory |
| [commands](../../apps/editor/src/editor/commands.mjs) | 실제 transaction, 단일 history, 구조 보호, paste/IME 제한, 선택 경로 복원 |

모델 코드는 앱 안에 있으며 라이브러리 exports/dependencies와 분리한다.

```js
import { toEditorJSON, fromEditorJSON } from './manual-adapter/index.mjs';
import { createManualExtensions } from './editor/custom-nodes.mjs';
// imports resolve through the approved apps/editor runtime:
import { Node, Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { history, closeHistory, undo, redo } from '@tiptap/pm/history';

const content = toEditorJSON(manual, {
  sidecars: { 'sources.json': sources, 'copy-review.json': copyReview },
});
const extensions = createManualExtensions({
  Node, Extension, Plugin, PluginKey, TextSelection,
  history, closeHistory, undo, redo, onError, onUnsupportedPaste,
});
// Pass extensions and content to the actual Tiptap Editor/React binding.
// Do not add StarterKit/UndoRedo: manualCommands owns exactly one history plugin.
editor.commands.applyManualOperation({
  type: 'set', path: ['pages', 0, 'blocks', 0, 'text'], value: '수정한 본문',
});
editor.commands.manualUndo();
const { document, sidecars } = fromEditorJSON(editor.getJSON());
```

없는 sidecar는 property를 생략한다. `undefined`는 JSON이 아니므로 포함하지 않는다. C host의 `sources`/`copyReview` payload와 모델의 filename key를 호출자가 명시적으로 매핑한다. 모델은 내부 기록을 HTML에 렌더링하지 않으며 승인 상태·review hash를 자동 변경하지 않는다.

## 무손실 표현

최상위 `doc`의 attrs에는 `contract: lds-manual-editor/v1`과 sidecars가 있다. 그 아래 `manualDocument` 하나가 있다. document/cover/page/block/step/figure는 역할별 custom node, 기타 알려진 객체는 `manualRecord`, 배열은 `manualArray`로 표현한다. 객체 속성은 `manualField`의 key와 값 노드 하나로 표현한다.

편집 문자열은 `manualString(text*)`로 실제 Tiptap text content가 된다. marks는 허용하지 않고 줄바꿈을 문자열 그대로 유지한다. 숫자·boolean·type/schemaVersion은 `manualValue` atom에 저장한다. 모르는 object 필드는 같은 atom에 opaque JSON으로 보존하며 편집 화면에는 내부 내용을 풀어 출력하지 않는다. UI node view를 추가해도 이 값과 contentDOM을 보존해야 한다.

이 구조는 범용 HTML 편집 결과를 나중에 추측하여 Manual로 변환하지 않는다. cover/page, 혼합 list 플래그, steps.start와 선택 필드, table, columns, help 별칭, crop/alt/caption/previewTitle, 알 수 없는 추가 필드와 sidecar를 그대로 복원한다. 내부 선택용 ID를 Manual JSON에 주입하지 않는다. 현재 선택은 Manual 경로와 text offset으로 연결한다.

기본 `toEditorJSON`/`fromEditorJSON`은 기존 `validateDocument`까지 통과해야 한다. `{validate:false}`는 빈 text/빈 배열 등 미완성 초안용이다. 이 모드도 모르는 schemaVersion/block, 누락된 필수 구조 필드, 중첩 columns, 잘못된 node/field/marked text는 거부한다. 불러올 수 없는 원본은 host가 그대로 보관하고 제한 상태를 보여줘야 한다. adapter가 손실 변환을 반환하지 않는다.

`fromEditorJSON`의 반환은 새 복사본이다. ProseMirror `doc.toJSON()`의 attrs가 내부 객체 참조를 공유할 수 있으므로 외부 코드가 그 결과를 직접 변경해서는 안 된다. 변경은 명령이나 `structuredClone`한 독립 입력으로 수행한다.

## 편집 명령

경로는 Manual document를 루트로 한 key/index 배열이다. JSON pointer 문자열이나 임의 파일 경로가 아니다. 명령 전에 현재 문서에서 다시 계산하며 오래된 index를 비동기 작업 후 재사용하지 않는다.

| type | 인자 | 동작 |
|---|---|---|
| set | path, value | 알려진 속성 변경/선택 속성 추가. identity·unknown 필드 변경 거부. container 교체로 opaque 필드가 사라지면 거부 |
| unset | path | 선택 속성 제거. 필수 구조 속성을 없애면 거부. 배열 원소는 remove 사용 |
| insert | path, index, value | 배열 위치에 알려진 역할의 항목 추가 |
| remove | path, index | 배열 항목 전체 삭제. 비게 되면 draft로 유지하며 canonical 저장 차단 |
| move | fromPath, fromIndex, toPath, toIndex | 같은 역할 배열 간 전체 항목 이동. 목적 index는 제거 후 기준. ancestor를 자기 자식으로 이동하지 못함 |
| splitSteps | pageIndex, blockIndex, at, title, 선택 lead | 내부 step 경계에서 새 page 생성. 뒤의 steps와 이어지는 blocks를 새 page로 이동하고 start를 원래 start+at로 지정 |

이동은 별도 steps의 start를 자동으로 바꾸지 않는다. 사용자 의도에 따른 연결은 명시적 set 또는 splitSteps로 수행한다. 일반 구조 명령은 하나의 undo 단위이며 텍스트 입력도 같은 history를 사용한다. 페이지나 블록 자체 삭제는 사용자 명령으로 해당 전체 항목을 제거하는 것이므로 그 항목의 부가 필드도 함께 삭제된다. property 수정이 부가 필드를 조용히 버리는 것과 구별한다.

## Tiptap transaction과 history

승인된 앱 runtime의 `Node`, `Extension`, `@tiptap/pm/state`, `@tiptap/pm/history`를 주입한다. factory는 **history() 하나만 등록**한다. `@tiptap/extensions`의 UndoRedo나 StarterKit history를 추가로 등록하지 않는다.

순수 operation으로 다음 모델을 계산하고 실제 schema로 검사한 뒤, 한 transaction에서 구조화 content를 교체한다. PM의 부분 slice fitter가 서로 다른 domain field를 접합하지 않도록 전체 structured content를 교체하는 구현이다. `setContent`를 호출하거나 별도 React 속성 history를 만들지 않는다. 이동·분리 전후의 선택은 domain path로 재매핑하고 text offset을 보존한다. 선택한 항목을 삭제한 경우 PM의 유효한 인접 선택으로 이동한다.

구조 명령 전 `closeHistory`, 명령 후 history에 남지 않는 boundary transaction을 적용한다. 그래서 앞/뒤 텍스트 입력과 명령이 의도치 않게 한 undo 묶음이 되지 않는다. 실제 undo/redo transaction은 같은 history plugin으로 판별하고 구조 복원을 허용한다.

일반 입력 transaction은 문자열만 바꿀 수 있다. 필드/opaque 데이터 삭제·변경은 구조 보호 plugin이 차단한다. rich HTML paste·파일 paste/drop은 기본 차단하고 `onUnsupportedPaste`로 UI에 전달한다. UI가 원문과 경고를 보여준 후 plain text 또는 지원 자산 입력을 명시적으로 처리해야 한다. 순수 text paste는 같은 문자열 필드 안에서만 허용한다.

`view.composing` 중 구조·속성 명령과 undo/redo는 false를 반환한다. composition 중 문서를 교체하거나 focus를 바꾸지 않고, 오래된 경로를 자동 queue하지 않는다. compositionend 후 사용자가 명령을 다시 실행한다. 실제 OS 한글 IME의 입력·확정·focus 동작은 이 guard 검사와 별도로 확인해야 한다.

전체 content 교체는 현재 fixed-page MVP의 단순하고 검증 가능한 선택이다. 큰 문서에서 비용이 생길 수 있으므로 성능을 측정한 뒤 역할 경계가 보장되는 최소 subtree transaction으로 최적화할 수 있다. 현재 대규모 문서 성능을 검증했다고 주장하지 않는다.

## 검사 결과와 실패 수정

```bash
node --test tests/editor-model.test.mjs tests/editor-model-runtime.test.mjs
```

Windows, Node v24.18.0, 앱에 설치된 Tiptap Core/PM 3.31.4에서 **20/20 통과, skip 0**. 이 명령은 대상 model suite만 실행한다. runtime suite는 앱 dependency를 자동 설치하지 않는다.

- dependency 없는 13개: 모든 현행 필드와 shipped 예제 왕복, unknown/sidecar 보존, draft gate, 삽입/삭제/이동/분리/crop, 미지원·변조 입력, 프로토타입 이름 필드, opaque 손실 거부.
- 실제 runtime 7개: Tiptap `getSchema` 왕복, 구조·속성·crop 연속 8개 명령의 전체 undo/redo snapshot 일치, 입력/명령의 단일 history와 양쪽 경계, dry-run/IME guard, 일반 transaction의 구조 변경 거부, 빈 문자열 draft 복구, 이동/분리 후 caret과 undo.

첫 runtime 검사에는 두 실패가 있었다. 부분 slice 삽입·이동에서 domain 노드가 다른 필드에 끼워진 구현 문제는 위의 구조 transaction과 선택 복원으로 수정했다. 보호 검사에서는 test가 `doc.toJSON()`의 attrs를 직접 고쳐 원래 state를 먼저 변조하고 있었다. 입력을 독립 복사한 뒤 공격 transaction을 만들도록 고쳤으며 **원래 doc 참조가 그대로 보존되어야 한다는 assertion을 유지**했다. semantic equality로 검사를 약화하지 않았다.

전체 schema/history gate는 통과했지만 브라우저 EditorContent의 실제 한국어 조합·포커스, UI 명령 연결, 자산 원본 byte 보존·파일 복구, 최종 독립 HTML/PDF는 이 model 결과로 대체하지 않는다. 파일 host와 UI 담당의 결과가 들어오기 전 에디터 전체 완료로 표시하지 않는다.
