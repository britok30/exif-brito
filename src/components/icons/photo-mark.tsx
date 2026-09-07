import type { CSSProperties } from 'react';
import PhotoFilmIcon from './film-icon';
import { AppleIcon, LeicaIcon, NikonIcon } from './brand-icon';

interface PhotoMarkProps {
  make?: string;
  film?: string;
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const upper = (s?: string) => s?.toUpperCase() ?? '';

export function PhotoMark({ make, film, height = 16, className, style }: PhotoMarkProps) {
  const m = upper(make);

  if (m === 'FUJIFILM') {
    return (
      <PhotoFilmIcon
        film={film}
        make={make}
        height={height}
        className={className}
        style={style}
      />
    );
  }

  if (m === 'APPLE') {
    return <AppleIcon height={height} className={className} style={style} />;
  }

  if (m.includes('LEICA')) {
    return <LeicaIcon height={height} className={className} style={style} />;
  }

  if (m.includes('NIKON')) {
    return <NikonIcon height={height} className={className} style={style} />;
  }

  return null;
}
