import React, { useState } from 'react';
import { Button, StatusBadge } from '@lk-design-system/lds-core';
import './example-product-screen.css';

// Synthetic content only. Capture this component for the document-preview image.
export function ExampleProductScreen() {
  const [selected, setSelected] = useState(null);
  const items = [
    { id: 'DOC-001', title: '앱 시작 안내', description: '로그인과 첫 화면 확인', status: '검토 중', tone: 'signal' },
    { id: 'DOC-002', title: '항목 확인 안내', description: '목록에서 상세 내용 확인', status: '작성 중', tone: 'offline' },
  ];
  return <section className="manual-example-screen" aria-label="LDS로 구성한 가상 문서 목록">
    <header className="manual-example-screen__header">
      <div><p className="manual-example-screen__context">가상 앱 · 합성 화면 예제</p><h2>문서 목록</h2></div>
      <p className="manual-example-screen__count">문서 2개</p>
    </header>
    <table aria-label="가상 문서 목록">
      <thead><tr><th scope="col">문서</th><th scope="col">작성 상태</th><th scope="col">내용 확인</th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id}>
        <td><p className="manual-example-screen__title">{item.title}</p><p className="manual-example-screen__description">{item.description}</p><p className="manual-example-screen__id">{item.id}</p></td>
        <td><StatusBadge tone={item.tone}>{item.status}</StatusBadge></td>
        <td><Button variant="secondary" size="sm" onClick={() => setSelected(item)}>상세 보기</Button></td>
      </tr>)}</tbody>
    </table>
    {selected && <p className="manual-example-screen__result" role="status">{selected.title} · {selected.description}</p>}
  </section>;
}
