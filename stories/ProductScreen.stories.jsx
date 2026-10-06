import React from 'react';
import { ExampleProductScreen } from './ExampleProductScreen.jsx';

export default { title: 'LDS Manual/Components/가상 화면', tags: ['!autodocs'], parameters: { docs: { description: { component: '자료 프레임 이미지의 원본입니다. 실제 LDS Core Button·StatusBadge와 Theme 토큰을 사용한 합성 화면이며 실제 제품의 동작·문구 승인을 의미하지 않습니다.' } } } };
export const DocumentList = { name: '자료 프레임의 원본 화면', render: () => <ExampleProductScreen /> };
