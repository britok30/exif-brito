import type { CSSProperties, ReactNode } from 'react';

interface RevealProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Kept for call-site compatibility; text no longer animates in. */
  delay?: number;
  y?: number;
  once?: boolean;
}

/**
 * A plain block. Text no longer animates in: on a page of hundreds of tiles
 * any entrance tied to hydration arrives late and reads as a glitch, and one
 * tied to first paint competes with image decoding. Photographs reveal
 * themselves instead as they scroll into view (see photo/image-reveal).
 */
export function Reveal({ children, className, style }: RevealProps) {
  return <div className={className} style={style}>{children}</div>;
}
