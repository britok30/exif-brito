import type { CSSProperties } from 'react';

interface BrandIconProps {
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const Frame = ({
  width,
  height,
  className,
  style,
  label,
  children,
}: BrandIconProps & { width: number; label: string; children: React.ReactNode }) => (
  <svg
    className={className}
    style={style}
    aria-description={label}
    width={(width * (height ?? 16)) / 16}
    height={height ?? 16}
    viewBox={`0 0 ${width} 16`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {children}
  </svg>
);

// Stylized apple silhouette (round body + small leaf), drawn from scratch.
export function AppleIcon(props: BrandIconProps) {
  return (
    <Frame {...props} width={14} label="Apple">
      <path
        d="M9.4 4.7c.4-.5.7-1.2.6-1.9-.6 0-1.4.4-1.8.9-.4.4-.7 1.1-.6 1.7.7 0 1.4-.3 1.8-.7zM10.9 8.4c0-1.5 1.2-2.2 1.3-2.3-.7-1-1.8-1.2-2.2-1.2-.9-.1-1.8.5-2.3.5s-1.2-.5-2-.5c-1 0-2 .6-2.5 1.5C2.1 8.3 3 11 4 12.5c.5.7 1.1 1.5 1.9 1.5.8 0 1-.5 1.9-.5s1.1.5 1.9.5c.8 0 1.3-.7 1.8-1.4.6-.8.8-1.6.8-1.7-.1 0-1.5-.6-1.5-2.5z"
        fill="currentColor"
      />
    </Frame>
  );
}

// "L •" — Leica wordmark cue: a serif L beside the iconic dot.
export function LeicaIcon(props: BrandIconProps) {
  return (
    <Frame {...props} width={20} label="Leica">
      <path
        d="M2 3v10h6v-1.6H3.7V3H2z"
        fill="currentColor"
      />
      <circle cx="14.5" cy="8" r="3" fill="currentColor" />
    </Frame>
  );
}

// "N" inside a small badge — Nikon mark cue.
export function NikonIcon(props: BrandIconProps) {
  return (
    <Frame {...props} width={22} label="Nikon">
      <rect
        x="1"
        y="2.5"
        width="20"
        height="11"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M6 11V5h1.6l3.4 4V5h1.5v6h-1.6l-3.4-4v4H6zm9.5 0V5h1.6v6h-1.6z"
        fill="currentColor"
      />
    </Frame>
  );
}

// Generic "FUJI" stamp — used for Fuji photos with no recognized simulation.
export function FujiBadge(props: BrandIconProps) {
  return (
    <Frame {...props} width={26} label="Fujifilm">
      <rect
        x="1"
        y="2.5"
        width="24"
        height="11"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1"
      />
      <text
        x="13"
        y="11"
        textAnchor="middle"
        fontSize="6"
        fontFamily="serif"
        fontWeight="600"
        letterSpacing="0.6"
        fill="currentColor"
      >
        FUJI
      </text>
    </Frame>
  );
}
