interface MapPreviewProps {
  latitude: number;
  longitude: number;
  label: string;
  zoom?: number;
}

/**
 * Where a photograph was taken, to the neighbourhood rather than the doorstep:
 * coordinates are rounded to two decimals (about a kilometre) before they leave
 * the server, so a public page never pinpoints a private place.
 */
export function MapPreview({ latitude, longitude, label, zoom = 12 }: MapPreviewProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const q = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const src = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${q}&zoom=${zoom}&maptype=roadmap`;

  return (
    <div className="photo-map">
      <iframe src={src} title={`Map near ${label}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
    </div>
  );
}
