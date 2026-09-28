import React from 'react';
import { Callout } from '@lk-design-system/lds-core/components/status/Callout';
import { createManualComponents } from './components.mjs';
export const { ManualDocument, ManualCover, ManualPage, ManualSectionTitle, ManualSteps, ManualFigure, ManualTable, ManualMetadata, ManualAddress, ManualCallout } = createManualComponents(React, Callout);
export { validateDocument } from './validate.mjs';
