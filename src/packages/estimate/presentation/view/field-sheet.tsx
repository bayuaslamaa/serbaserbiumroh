'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/molecules/dialog';
import { cn } from '@/shared/utils';

interface FieldSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  disableOutsideClose?: boolean;
}

const FIELD_SHEET_BODY_CLASS = 'field-sheet-body';

export const FieldSheet = ({
  open,
  onOpenChange,
  title,
  children,
  disableOutsideClose,
}: FieldSheetProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'left-0 right-0 top-auto bottom-0 translate-x-0 translate-y-0',
          'max-w-none w-full rounded-t-2xl rounded-b-none border-b-0',
          'sm:rounded-t-2xl sm:rounded-b-none',
          'max-h-[85vh] overflow-y-auto',
        )}
        onPointerDownOutside={(event) => {
          if (disableOutsideClose) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (disableOutsideClose) event.preventDefault();
        }}
      >
        <DialogTitle
          className="text-sm font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          {title}
        </DialogTitle>
        <div className={FIELD_SHEET_BODY_CLASS}>{children}</div>
      </DialogContent>
    </Dialog>
  );
};
