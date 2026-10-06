import React from 'react';
import { ManualDocument, ManualAddress, ManualSteps } from '../src/index.mjs';
import { PageFrame, assetUrl } from './fixtures.jsx';

export default { title: 'LDS Manual/Review States/출력 전 확인', parameters: { docs: { description: { component: '내용이 길거나 자산이 없는 검토 상태입니다. 데이터 스키마 검사만으로 출력 완료를 판단하지 않으며, PDF 출력기는 넘침·누락 자산을 거부합니다.' } } } };
export const Overflow = { name: '본문 분량 초과', render: () => <><div className="manual-story-review" role="status"><p>검토 필요: 본문 영역을 넘기는 예시입니다. 단계 경계에서 쪽을 나눕니다.</p></div><PageFrame title="긴 절차 분리하기"><ManualSteps items={Array.from({ length: 18 }, (_, i) => ({ title: `${i + 1}번째 내용 확인하기`, text: '여러 절차를 한 쪽에 몰아 넣은 가상 예시입니다. 본문을 자동 축소하거나 넘친 내용을 숨기지 않습니다.' }))} /></PageFrame></> };
export const MissingAsset = { name: '그림 자산 누락', render: () => <><div className="manual-story-review" role="status"><p>검토 필요: 존재하지 않는 그림을 참조합니다. 원본 경로와 자산을 확인합니다.</p></div><ManualDocument document={{ schemaVersion: 1, title: '누락 자산 검토 예시', pages: [{ title: '그림의 원본 확인하기', blocks: [{ type: 'figure', src: assetUrl('examples/assets/missing-story-fixture.svg'), alt: '의도적으로 누락한 가상 예제 화면', caption: '누락된 자산을 찾아 바른 파일을 연결해야 합니다.' }] }] }} /></> };
export const LongContent = { name: '긴 주소와 줄바꿈', render: () => <PageFrame title="주소와 인용문 확인하기"><ManualAddress value="https://example.invalid/manual/products/sample-application/documentation/installation-and-usage/long-address-example" /><p>긴 문자열의 줄바꿈은 실제 A4 본문에서 확인합니다. 글자를 줄여 문제를 감추지 않습니다.</p></PageFrame> };
