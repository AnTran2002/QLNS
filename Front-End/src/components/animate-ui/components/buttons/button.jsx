'use client';
import * as React from 'react';
import { cva } from 'class-variance-authority';

import { Button as ButtonPrimitive } from '@/components/animate-ui/primitives/buttons/button';
import { cn } from '@/lib/utils';

/**
 * Nút theo DESIGN.md (Apple): pill xanh cho hành động chính, pill viền cho hành động phụ,
 * nút tối "utility" cho thao tác gọn. Nhấn → scale 0.96 (micro-interaction toàn hệ thống).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal tracking-[-0.01em] transition-[color,background-color,border-color,box-shadow,opacity] duration-200 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background select-none",
  {
    variants: {
      variant: {
        default: 'rounded-full bg-primary text-primary-foreground hover:bg-primary-hover',
        outline: 'rounded-full border border-link text-link hover:bg-link/8',
        secondary: 'rounded-full bg-muted text-foreground hover:bg-accent',
        ghost: 'rounded-full text-foreground hover:bg-muted',
        dark: 'rounded-full bg-foreground text-background hover:opacity-85',
        onTile: 'rounded-full bg-white/12 text-white hover:bg-white/20',
        destructive: 'rounded-full bg-destructive text-white hover:opacity-90',
        link: 'text-link underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 text-[15px] has-[>svg]:px-4',
        sm: 'h-8 gap-1.5 px-3.5 text-[13px] has-[>svg]:px-3',
        lg: 'h-12 px-7 text-[17px]',
        icon: 'size-9 rounded-full',
        'icon-sm': 'size-8 rounded-full',
        'icon-lg': 'size-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({ className, variant, size, hoverScale = 1, tapScale = 0.96, ...props }) {
  return (
    <ButtonPrimitive
      hoverScale={hoverScale}
      tapScale={tapScale}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
