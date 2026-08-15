export const REQUEST_STATUSES = ['NEW', 'MATCHED', 'REJECTED'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  NEW: 'Baru',
  MATCHED: 'Sudah dicocokkan',
  REJECTED: 'Ditolak',
};

export const STATUS_BADGE_VARIANTS: Record<
  RequestStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  NEW: 'secondary',
  MATCHED: 'default',
  REJECTED: 'destructive',
};

export const STATUS_OPTIONS = REQUEST_STATUSES.map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

export const isRequestStatus = (value: string): value is RequestStatus => {
  return (REQUEST_STATUSES as readonly string[]).includes(value);
};

export const statusLabel = (status: string): string => {
  return isRequestStatus(status) ? STATUS_LABELS[status] : status;
};

export const statusBadgeVariant = (status: string) => {
  return isRequestStatus(status) ? STATUS_BADGE_VARIANTS[status] : 'secondary';
};
