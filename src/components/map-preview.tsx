interface MapPreviewProps {
  latitude: number;
  longitude: number;
  zoom?: number;
}

export function MapPreview({ latitude, longitude, zoom = 14 }: MapPreviewProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const src = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${latitude},${longitude}&zoom=${zoom}&maptype=roadmap`;

  return (
    <div className="overflow-hidden border border-foreground/20">
      <iframe
        src={src}
        title="Map"
        className="aspect-video w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
