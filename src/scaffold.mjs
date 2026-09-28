import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDocument } from './validate.mjs';
const packageRoot = fileURLToPath(new URL('../', import.meta.url));

export async function scaffold(destination, { title = '제품 사용 매뉴얼', version = '0.1' } = {}) {
  if (typeof title !== 'string' || !title.trim() || typeof version !== 'string' || !version.trim()) throw new Error('Title and document version must not be empty.');
  const date = new Date().toISOString().slice(0, 10);
  const doc = validateDocument({
    schemaVersion: 1, title, lang: 'ko',
    cover: {
      title,
      logo: { src: '@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg', alt: 'LK ROBOTICS' },
      metadata: [
        { label: '문서 버전', value: version }, { label: '작성일', value: date },
        { label: '적용 환경', value: '작성 중' }, { label: '검토 상태', value: '초안' }
      ],
      blocks: [
        { type: 'list', items: [{ label: '준비물', value: '제품에 필요한 기기와 계정으로 바꿉니다.' }] },
        { type: 'callout', title: '초안 안내', text: '이 문서는 작성용 초안입니다. 예제 화면과 문구를 제품에서 확인한 내용으로 바꾼 뒤 배포합니다.' }
      ]
    },
    pages: [{ title: '첫 번째 작업 안내', lead: '사용자가 완료할 작업을 한 문장으로 설명합니다.', blocks: [
      { type: 'steps', items: [{ title: '사용자 행동 입력', text: '화면에서 무엇을 선택하고 어떤 결과를 확인하는지 적습니다.',
        figure: { src: 'assets/sample.svg', alt: '실제 화면으로 교체할 가상 로그인 화면', caption: '제품 스크린샷으로 교체하고 중요한 위치를 설명합니다.', size: 'reading' } }] }
    ]}]
  });
  const provenance = {
    schemaVersion: 1, document: 'manual.json', reviewStatus: 'draft', verifiedProductVersion: null,
    sources: [],
    assets: [{ path: 'assets/sample.svg', origin: 'LDS Manual synthetic starter', capturedAt: null, productVersion: null, permission: 'synthetic', notes: 'Replace with an approved product screenshot.' }],
    reviews: []
  };
  // Exclusive mkdir: an existing destination, even empty or a symlink, is never overwritten.
  await fs.mkdir(destination);
  await fs.mkdir(path.join(destination, 'assets'));
  await fs.copyFile(path.join(packageRoot, 'examples/assets/login.svg'), path.join(destination, 'assets/sample.svg'));
  await fs.writeFile(path.join(destination, 'manual.json'), JSON.stringify(doc, null, 2) + '\n', { flag: 'wx' });
  await fs.writeFile(path.join(destination, 'sources.json'), JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' });
  await fs.writeFile(path.join(destination, '.gitignore'), 'output/\nsources.json\n', { flag: 'wx' });
  return destination;
}
