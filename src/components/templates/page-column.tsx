import { cn } from '@/shared/utils';

export const PageColumn = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className="container mx-auto px-4">
      <div className={cn('mx-auto max-w-6xl', className)}>{children}</div>
    </div>
  );
};
