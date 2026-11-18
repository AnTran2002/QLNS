import * as React from 'react';

import {
  Progress as ProgressPrimitive,
  ProgressIndicator as ProgressIndicatorPrimitive,
} from '@/components/animate-ui/primitives/radix/progress';
import { cn } from '@/lib/utils';

function Progress({
  className,
  ...props
}) {
  return (
    <ProgressPrimitive
      className={cn(
        'bg-muted relative h-1.5 w-full overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      <ProgressIndicatorPrimitive className="bg-primary rounded-full h-full w-full flex-1" />
    </ProgressPrimitive>
  );
}

export { Progress };
