export function stepBlockIndexes(page) {
  return (page?.blocks ?? []).flatMap((block, index) => block.type === 'steps' ? [index] : []);
}

export function normalizeStepTarget(page, preferred) {
  const choices = stepBlockIndexes(page);
  return choices.includes(preferred) ? preferred : choices[0] ?? null;
}

export function canSplitStepsAt(path) {
  return Array.isArray(path) && path.length === 4 && path[0] === 'pages'
    && Number.isInteger(path[1]) && path[2] === 'blocks' && Number.isInteger(path[3]);
}
