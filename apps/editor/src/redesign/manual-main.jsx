import React from 'react';
import {createRoot} from 'react-dom/client';
import '@lk-design-system/lds-core/styles.css';
import '@lk-design-system/lds-theme/styles.css';
import {ManualEditor} from './ManualEditor.jsx';
createRoot(document.getElementById('manual-root')).render(<ManualEditor/>);
