import React from 'react';

interface ArabicTextProps {
  children: React.ReactNode;
}

export const ArabicText = ({ children }: ArabicTextProps) => {
  return (
    <span
      dir="rtl"
      lang="ar"
      className="block text-right text-xl leading-loose my-3"
      style={{
        fontFamily: "'Noto Naskh Arabic', 'Times New Roman', serif",
        color: 'var(--color-gold)',
      }}
    >
      {children}
    </span>
  );
};

type CalloutType = 'tip' | 'warning' | 'info';

interface CalloutProps {
  type?: CalloutType;
  children: React.ReactNode;
}

const calloutConfig: Record<CalloutType, { icon: string; borderColor: string }> = {
  tip: { icon: '💡', borderColor: 'border-green-500' },
  warning: { icon: '⚠️', borderColor: 'border-yellow-500' },
  info: { icon: 'ℹ️', borderColor: 'border-blue-500' },
};

export const Callout = ({ type = 'info', children }: CalloutProps) => {
  const config = calloutConfig[type];
  return (
    <div
      className={`border-l-4 ${config.borderColor} pl-4 py-2 my-4 rounded-r`}
      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
    >
      <span className="mr-2">{config.icon}</span>
      {children}
    </div>
  );
};

const MDXComponents = { ArabicText, Callout };
export default MDXComponents;
