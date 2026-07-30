import NextImage, { type ImageProps as NextImageProps } from 'next/image';

import { cn } from '@/lib/utils';

export interface ImageProps extends Omit<NextImageProps, 'placeholder'> {
  /** `width/height` string (e.g. '16/9', '1/1', '4/3') — reserves layout space, preventing CLS,
   * without requiring the caller to compute pixel width/height themselves. Ignored if `fill` is
   * false and explicit `width`/`height` are both provided. */
  aspectRatio?: string;
  /** Defaults to 'blur' when `blurDataURL` is supplied, 'empty' otherwise — next/image already
   * requires `blurDataURL` for the blur placeholder, this just picks the right mode for you. */
}

/**
 * Wraps `next/image` — which already handles AVIF/WebP, responsive
 * `srcset`, and lazy-below-fold loading per `docs/architecture/
 * optimization.md`'s own guidance — adding only a standardized
 * aspect-ratio contract on top. Nothing here duplicates what next/image
 * already does natively.
 */
function Image({ aspectRatio, className, style, blurDataURL, fill, ...props }: ImageProps) {
  const wrapperStyle = aspectRatio ? { aspectRatio, position: 'relative' as const } : undefined;

  const img = (
    <NextImage
      fill={fill ?? Boolean(aspectRatio)}
      placeholder={blurDataURL ? 'blur' : 'empty'}
      blurDataURL={blurDataURL}
      className={cn(aspectRatio && 'object-cover', className)}
      style={style}
      {...props}
    />
  );

  if (aspectRatio) {
    return <div style={wrapperStyle}>{img}</div>;
  }

  return img;
}

export { Image };
