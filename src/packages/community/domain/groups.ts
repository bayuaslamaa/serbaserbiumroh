export type SsuGroup = {
  id: string;
  label: string;
  url: string;
  isNewest: boolean;
  activeMembers30d?: number;
};

const ACTIVITY_SNAPSHOT = {
  label: '31 Juli 2026',
  figures: {
    'ssu-1': 169,
    'ssu-2': 156,
    'ssu-3': 147,
    'ssu-4': 310,
  } as Record<string, number | undefined>,
};

export const SSU_GROUPS: SsuGroup[] = [
  {
    id: 'ssu-5',
    label: 'SSU V',
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_5 ?? '',
    isNewest: true,
  },
  {
    id: 'ssu-1',
    label: 'SSU I',
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_1 ?? '',
    isNewest: false,
  },
  {
    id: 'ssu-2',
    label: 'SSU II',
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_2 ?? '',
    isNewest: false,
  },
  {
    id: 'ssu-3',
    label: 'SSU III',
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_3 ?? '',
    isNewest: false,
  },
  {
    id: 'ssu-4',
    label: 'SSU IV',
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_4 ?? '',
    isNewest: false,
  },
].map((group) => ({ ...group, activeMembers30d: ACTIVITY_SNAPSHOT.figures[group.id] }));

export const STATS_SNAPSHOT_LABEL = ACTIVITY_SNAPSHOT.label;

export const hasAnyGroupUrl = (groups: SsuGroup[]) => {
  return groups.some((group) => group.url.trim().length > 0);
};
