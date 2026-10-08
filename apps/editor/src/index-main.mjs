import {startManualEntry} from './manual-entry-policy.mjs';
// A host-injected blocking bootstrap receiver executes before this module.
startManualEntry({location:window.location,session:globalThis.__LDS_MANUAL_SESSION,loadLegacy:()=>import('./main.jsx')});
