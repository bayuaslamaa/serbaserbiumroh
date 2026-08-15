import { cn } from '@/shared/utils';

export const FullBleed = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  return (
    <div
      className={cn('relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen', className)}
      style={style}
    >
      {children}
    </div>
  );
};
