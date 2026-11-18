'use client';;
import * as React from 'react';
import { motion } from 'motion/react';

import { useIsInView } from '@/hooks/use-is-in-view';
import { Slot } from '@/components/animate-ui/primitives/animate/slot';

function Fade({
  ref,
  transition = { type: 'spring', stiffness: 200, damping: 20 },
  delay = 0,
  inView = false,
  inViewMargin = '0px',
  inViewOnce = true,
  initialOpacity = 0,
  opacity = 1,
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
        hidden: { opacity: initialOpacity },
        visible: { opacity },
      }}
      transition={{
        ...transition,
        delay: (transition?.delay ?? 0) + delay / 1000,
      }}
      {...props}
    />
  );
}

function Fades({
  children,
  delay = 0,
  holdDelay = 0,
  ...props
}) {
  const array = React.Children.toArray(children);

  return (
    <>
      {array.map((child, index) => (
        <Fade
          key={child.key ?? index}
          delay={delay + index * holdDelay}
          {...props}
        >
          {child}
        </Fade>
      ))}
    </>
  );
}

export { Fade, Fades };
