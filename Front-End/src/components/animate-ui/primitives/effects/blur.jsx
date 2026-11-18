'use client';;
import * as React from 'react';
import { motion } from 'motion/react';

import { useIsInView } from '@/hooks/use-is-in-view';
import { Slot } from '@/components/animate-ui/primitives/animate/slot';

function Blur({
  ref,
  transition = { type: 'spring', stiffness: 200, damping: 20 },
  delay = 0,
  inView = false,
  inViewMargin = '0px',
  inViewOnce = true,
  initialBlur = 10,
  blur = 0,
  asChild = false,
  ...props
}) {
  const { ref: localRef, isInView } = useIsInView(
    ref,
    {
      inView,
      inViewOnce,
      inViewMargin,
    },
  );

  const Component = asChild ? Slot : motion.div;

  return (
    <Component
      ref={localRef}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      exit="hidden"
      variants={{
        hidden: { filter: `blur(${initialBlur}px)` },
        visible: { filter: `blur(${blur}px)` },
      }}
      transition={{
        ...transition,
        delay: (transition?.delay ?? 0) + delay / 1000,
      }}
      {...props}
    />
  );
}

function Blurs({
  children,
  delay = 0,
  holdDelay = 0,
  ...props
}) {
  const array = React.Children.toArray(children);

  return (
    <>
      {array.map((child, index) => (
        <Blur
          key={child.key ?? index}
          delay={delay + index * holdDelay}
          {...props}
        >
          {child}
        </Blur>
      ))}
    </>
  );
}

export { Blur, Blurs };
