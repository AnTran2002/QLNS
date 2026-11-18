import * as React from 'react';
import * as motion from 'motion/react-client';

import {
  AvatarGroup as AvatarGroupPrimitive,
  AvatarGroupTooltip as AvatarGroupTooltipPrimitive,
  AvatarGroupTooltipArrow as AvatarGroupTooltipArrowPrimitive,
} from '@/components/animate-ui/primitives/animate/avatar-group';
import { cn } from '@/lib/utils';

function AvatarGroup({
  className,
  invertOverlap = true,
  ...props
}) {
  return (
    <AvatarGroupPrimitive
      className={cn('h-10 -space-x-2.5', className)}
      invertOverlap={invertOverlap}
      {...props}
    />
  );
}

function AvatarGroupTooltip({
  className,
  children,
  layout = 'preserve-aspect',
  ...props
}) {
  return (
    <AvatarGroupTooltipPrimitive
      className={cn(
        'bg-foreground text-background z-50 w-fit rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-balance',
        className,
      )}
      {...props}
    >
      <motion.div layout={layout} className="overflow-hidden">
        {children}
      </motion.div>
      <AvatarGroupTooltipArrowPrimitive
        className="fill-foreground size-3 data-[side='bottom']:translate-y-[1px] data-[side='right']:translate-x-[1px] data-[side='left']:translate-x-[-1px] data-[side='top']:translate-y-[-1px]"
        tipRadius={2}
      />
    </AvatarGroupTooltipPrimitive>
  );
}

export { AvatarGroup, AvatarGroupTooltip };
