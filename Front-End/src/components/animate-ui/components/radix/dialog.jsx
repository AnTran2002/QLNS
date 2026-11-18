import * as React from 'react';
import { XIcon } from 'lucide-react';

import {
  Dialog as DialogPrimitive,
  DialogContent as DialogContentPrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogFooter as DialogFooterPrimitive,
  DialogHeader as DialogHeaderPrimitive,
  DialogTitle as DialogTitlePrimitive,
  DialogTrigger as DialogTriggerPrimitive,
  DialogPortal as DialogPortalPrimitive,
  DialogOverlay as DialogOverlayPrimitive,
  DialogClose as DialogClosePrimitive,
} from '@/components/animate-ui/primitives/radix/dialog';
import { cn } from '@/lib/utils';

function Dialog(props) {
  return <DialogPrimitive {...props} />;
}

function DialogTrigger(props) {
  return <DialogTriggerPrimitive {...props} />;
}

function DialogClose(props) {
  return <DialogClosePrimitive {...props} />;
}

function DialogOverlay({
  className,
  ...props
}) {
  return (
    <DialogOverlayPrimitive
      className={cn('fixed inset-0 z-50 bg-black/30 backdrop-blur-md dark:bg-black/60', className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}) {
  return (
    <DialogPortalPrimitive>
      <DialogOverlay />
      <DialogContentPrimitive
        className={cn(
          'bg-card text-card-foreground fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-5 rounded-[26px] border border-border/60 p-6 shadow-modal sm:max-w-lg sm:p-8',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClosePrimitive className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Đóng</span>
          </DialogClosePrimitive>
        )}
      </DialogContentPrimitive>
    </DialogPortalPrimitive>
  );
}

function DialogHeader({
  className,
  ...props
}) {
  return (
    <DialogHeaderPrimitive
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}) {
  return (
    <DialogFooterPrimitive
      className={cn(
        'flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}) {
  return (
    <DialogTitlePrimitive
      className={cn('text-[21px] leading-tight font-semibold tracking-[-0.02em] text-foreground', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}) {
  return (
    <DialogDescriptionPrimitive
      className={cn('text-muted-foreground text-[15px] leading-relaxed', className)}
      {...props}
    />
  );
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
