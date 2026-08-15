import type { RawSearchParams } from './admin-requests-query';

export const ADMIN_REQUESTS_PATH = '/admin/community-requests';

const FILTER_KEYS = ['status', 'q', 'dup'] as const;

export const buildAdminRequestsHref = (
  current: RawSearchParams,
  overrides: Partial<Record<'status' | 'q' | 'dup' | 'page', string | null>> = {},
): string => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }

  const touchesFilter = FILTER_KEYS.some((key) => key in overrides);
  if (touchesFilter && !('page' in overrides)) {
    params.delete('page');
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  if (params.get('page') === '1') params.delete('page');

  const query = params.toString();
  return query ? `${ADMIN_REQUESTS_PATH}?${query}` : ADMIN_REQUESTS_PATH;
};
