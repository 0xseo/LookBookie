import type { Season } from '../types/clothing';

export type CollectionSort = 'createdDesc' | 'createdAsc' | 'nameAsc';
export type CollectionFilters = { seasons: Season[]; colors: string[]; dateFrom: string; dateTo: string; };
export const EMPTY_FILTERS: CollectionFilters = { seasons: [], colors: [], dateFrom: '', dateTo: '' };

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function dateSearchTerms(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return [value.slice(0, 10), `${year}.${month}.${day}`, `${year}/${month}/${day}`, `${year}${month}${day}`, `${year}년 ${Number(month)}월 ${Number(day)}일`].join(' ');
}

export function matchesCollectionFilters(filters: CollectionFilters, seasons: string[], colors: string[], date?: string) {
  return (!filters.seasons.length || filters.seasons.some((season) => seasons.includes(season)))
    && (!filters.colors.length || filters.colors.some((color) => colors.includes(color)))
    && (!date || !filters.dateFrom || date >= filters.dateFrom)
    && (!date || !filters.dateTo || date <= filters.dateTo);
}

export function compareCollection(sort: CollectionSort, left: { name: string; date: string; id: number | string; }, right: { name: string; date: string; id: number | string; }) {
  if (sort === 'nameAsc') return left.name.localeCompare(right.name, 'ko');
  const difference = left.date.localeCompare(right.date) || String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
  return sort === 'createdAsc' ? difference : -difference;
}
