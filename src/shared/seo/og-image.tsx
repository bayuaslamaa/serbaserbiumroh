import { ImageResponse } from 'next/og';

import { SITE_NAME } from './config';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const BG = '#0b1c12';
const GOLD = '#c9a84c';
const MUTED = '#9ab39e';

const fit = (title: string, max = 90): string => {
  const clean = title.trim();
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

export const renderOgImage = (title: string, eyebrow?: string) => {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: BG,
        padding: '72px 80px',
        borderLeft: `16px solid ${GOLD}`,
      }}
    >
      {eyebrow ? (
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: MUTED,
          }}
        >
          {eyebrow}
        </div>
      ) : (
        <div style={{ display: 'flex' }} />
      )}

      <div
        style={{
          display: 'flex',
          fontSize: 64,
          lineHeight: 1.15,
          fontWeight: 700,
          color: GOLD,
        }}
      >
        {fit(title)}
      </div>

      <div style={{ display: 'flex', fontSize: 30, color: MUTED }}>{SITE_NAME}</div>
    </div>,
    OG_SIZE,
  );
};
