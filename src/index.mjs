import React from 'react';
import { Callout } from '@lk-design-system/lds-core/components/status/Callout';
import { Blockquote } from '@lk-design-system/lds-core/components/content/Blockquote';
import { createManualComponents } from './components.mjs';
export const { ManualDocument, ManualCover, ManualPage, ManualSectionTitle, ManualDivider, ManualSteps, ManualFigure, ManualTable, ManualMetadata, ManualAddress, ManualCallout, ManualQuote } = createManualComponents(React, Callout, Blockquote);
export { validateDocument } from './validate.mjs';
