import { createStore } from '../storage.mjs';
const root=process.argv[2], step=process.argv[3];
const store=await createStore({root,checkpoint:async point=>{if(point===step)process.exit(73);}});
const loaded=await store.load();
await store.save({expectedRevision:loaded.revision,document:{...loaded.document,title:'저장 후 제목'},sources:{reviewStatus:'in-review',extraNew:'preserved update'}});
process.exit(0);
