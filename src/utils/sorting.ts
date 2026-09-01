export const sortTextPtBr = (a: string, b: string) =>
  a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });

export const sortByLabelPtBr = <T>(items: T[], getLabel: (item: T) => string) =>
  [...items].sort((a, b) => sortTextPtBr(getLabel(a), getLabel(b)));

export const uniqueSortedTextPtBr = (items: string[]) =>
  Array.from(new Set(items)).sort(sortTextPtBr);
