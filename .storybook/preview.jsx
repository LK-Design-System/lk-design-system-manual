import React from 'react';
import '@lk-design-system/lds-core/styles.css';
import '@lk-design-system/lds-theme/styles.css';
import '../styles.css';
import './preview.css';

export default {
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    options: { storySort: { order: ['LDS Manual', ['시작하기', '데이터와 API', 'Templates', 'Components', 'Examples', 'Review States']] } },
    controls: { expanded: true },
    docs: { canvas: { sourceState: 'shown' } },
    a11y: { test: 'todo' },
  },
  decorators: [Story => <div className="manual-story-surface" data-theme="light" data-lds-theme="light"><Story /></div>],
};
