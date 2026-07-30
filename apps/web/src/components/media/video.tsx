'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface VideoProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'poster'> {
  src: string;
  /** Required — reserves the video's visual space before playback (no layout shift) and gives
   * users something meaningful before the first frame decodes. */
  poster: string;
  aspectRatio?: string;
}

/**
 * Lazy by construction: `src` is only assigned once the element enters
 * the viewport (IntersectionObserver-gated), so the browser never starts
 * fetching video bytes for below-the-fold content — `preload="none"`
 * alone only defers preloading, it doesn't defer the network request
 * that follows from render.
 */
function Video({ src, poster, aspectRatio, className, controls = true, ...props }: VideoProps) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      poster={poster}
      src={inView ? src : undefined}
      preload="none"
      controls={controls}
      className={cn('h-full w-full', className)}
      style={aspectRatio ? { aspectRatio } : undefined}
      {...props}
    />
  );
}

export { Video };
