import React from 'react';
import {createRoot} from 'react-dom/client';
import '@lk-design-system/lds-core/styles.css';
import '@lk-design-system/lds-theme/styles.css';
import {PrototypeEditor} from './PrototypeEditor.jsx';
createRoot(document.getElementById('prototype-root')).render(<PrototypeEditor/>);
