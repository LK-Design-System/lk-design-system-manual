import React from 'react';
import { ManualPage, ManualSteps, ManualFigure, ManualTable, ManualMetadata, ManualAddress, ManualCallout, ManualQuote } from '../src/index.mjs';
import { PageFrame, sampleFigure, metadata } from './fixtures.jsx';
import documentListImage from './assets/document-list.jpg';

export default { title: 'LDS Manual/Components/문서 구성', decorators: [(Story, context) => context.parameters.manualOwnPage ? <Story /> : <PageFrame title={context.parameters.manualPageTitle}><Story /></PageFrame>], parameters: { docs: { description: { component: '공개 구성 요소를 원래 A4 본문 안에서 렌더링합니다. 섹션 제목 바는 페이지의 h2이며 본문 안에 반복하지 않습니다. 하위 소제목과 절차 제목은 h3로 구분합니다. Callout·Blockquote는 실제 LDS Core 0.4.3 구성 요소입니다.' } } } };
export const SectionTitle = {
  name: '섹션 제목',
  parameters: { manualOwnPage: true, docs: { description: { story: 'ManualPage의 title이 실제 ManualSectionTitle을 렌더링합니다. 네이비 섹션 제목 아래에 보조 소제목과 번호형 절차 제목을 배치한 예제입니다. 별도의 예제 프레임 제목 바를 중첩하지 않습니다.' } } },
  render: args => <main className="lds-manual" lang="ko"><ManualPage title={args.children} number={1} total={1}>
    <h3 className="lds-manual-subheading">목록 확인 안내</h3>
    <p>목록에서 확인할 항목을 선택하고 상세 화면의 내용을 확인합니다.</p>
    <ManualSteps items={[{ title: '항목 선택하기', text: '목록에서 확인할 항목을 선택합니다.' }, { title: '내용 확인하기', text: '상세 화면에서 제목과 내용을 확인합니다.' }]} />
  </ManualPage></main>,
  args: { children: '목록에서 항목 확인하기' }
};
export const Steps = { name: '단계', render: args => <ManualSteps {...args} />, args: { items: [{ title: '항목 선택하기', text: '목록에서 확인할 항목을 선택합니다.' }, { title: '내용 확인하기', text: '상세 화면에서 제목과 내용을 확인합니다.' }], start: 1 } };
export const ContinuedSteps = { ...Steps, name: '이어지는 단계 번호', args: { ...Steps.args, start: 3 } };
export const StepsWithFigure = { ...Steps, name: '단계와 화면', args: { items: [{ title: '상세 보기 선택하기', text: '확인할 항목의 「상세 보기」를 선택합니다.', figure: sampleFigure }], start: 1 } };
export const Figure = { name: '그림과 캡션', render: args => <ManualFigure {...args} />, args: sampleFigure, argTypes: { size: { control: 'select', options: ['full', 'reading', 'compact'] } } };
export const DocumentPreview = { ...Figure, name: '자료 프레임', args: { src: documentListImage, alt: '문서 제목·설명·작성 상태와 상세 보기 버튼이 있는 가상 문서 목록', caption: '각 문서 오른쪽의 「상세 보기」에서 내용을 확인합니다. 합성 화면 예제입니다.', size: 'reading', previewTitle: '문서 목록 화면' }, parameters: { manualPageTitle: '문서 목록에서 내용 확인하기', docs: { description: { story: '가상 화면 스토리의 실제 LDS Button·StatusBadge와 Theme 글꼴·토큰을 캡처했습니다. 이미지는 정적 자료이며, 실제 제품 화면이나 승인된 제품 동작이 아닙니다.' } } } };
export const CroppedFigure = { ...Figure, name: '원본 좌표 확대', args: { ...sampleFigure, crop: { x: 100, y: 110, width: 700, height: 350, sourceWidth: 960, sourceHeight: 500 }, caption: '가상 홈 화면의 목록 영역을 확대합니다. 전체 화면은 그림과 캡션 예시에서 확인합니다.' } };
export const Table = { name: '안내 표', render: args => <ManualTable {...args} />, args: { label: '목록 사용 방법', headers: ['기능', '사용 방법'], rows: [['상세 보기', '항목 오른쪽의 「상세 보기」를 선택합니다.'], ['목록으로 돌아가기', '상세 화면에서 「목록」을 선택합니다.']] } };
export const Metadata = { name: '문서 정보', render: args => <ManualMetadata {...args} />, args: { items: metadata } };
export const Address = { name: '주소·식별 문자열', render: args => <ManualAddress {...args} />, args: { value: 'https://example.invalid/manual' } };
export const Callout = { name: '보충 안내', render: args => <ManualCallout {...args} />, args: { title: '샘플 화면 안내', text: '이 화면은 가상 예제입니다. 실제 제품에서는 해당 제품의 승인된 버튼명과 동작을 확인합니다.', tone: 'signal' }, argTypes: { tone: { control: 'select', options: ['signal', 'positive', 'cautionary', 'negative', 'offline'] } } };
export const CalloutTones = { name: '안내의 의미별 상태', render: () => <>{[['signal', '보충 안내'], ['positive', '성공 안내'], ['cautionary', '주의 안내'], ['negative', '실패 안내'], ['offline', '연결 끊김 안내']].map(([tone, title]) => <ManualCallout key={tone} tone={tone} title={title} text="구성 요소의 의미별 상태를 확인하는 가상 문구입니다." />)}</> };
export const Quote = { name: '요청문·인용문', render: args => <ManualQuote {...args} />, args: { text: '확인한 구성으로 매뉴얼을 작성해 주세요.\n원본의 내용과 화면을 빠뜨리지 않았는지 확인해 주세요.' } };
