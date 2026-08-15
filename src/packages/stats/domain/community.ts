export const COMMUNITY_SIZE = '4.500+';
export const PILGRIMS_HELPED = '3.500+';

export const VISITOR_BASELINE_OFFSET = 100;

export const formatVisitorCount = (rawCount: number | null): string | null => {
  if (rawCount === null) return null;

  return (rawCount + VISITOR_BASELINE_OFFSET).toLocaleString('id-ID');
};
