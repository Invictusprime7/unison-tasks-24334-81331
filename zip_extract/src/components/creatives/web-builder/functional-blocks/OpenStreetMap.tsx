import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OpenStreetMapProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  zoom?: number;
  height?: string;
  showMarker?: boolean;
  markerTitle?: string;
  interactive?: boolean;
}

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  latitude = 40.7128,
  longitude = -74.0060,
  address,
  zoom = 15,
  height = '300px',
  showMarker = true,
  markerTitle = 'Location',
  interactive = true
}) => {
  const mapRef = useRef<HTMLIFrameElement>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [coords, setCoords] = useState({ lat: latitude, lng: longitude });

  // Geocode address to coordinates if address is provided
  useEffect(() => {
    if (address) {
      const geocodeAddress = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
          );
          const data = await response.json();
          if (data && data[0]) {
            setCoords({
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            });
          }
        } catch (error) {
          console.error('Geocoding error:', error);
        }
      };
      geocodeAddress();
    } else {
      setCoords({ lat: latitude, lng: longitude });
    }
  }, [address, latitude, longitude]);

  const handleZoomIn = () => {
    setCurrentZoom(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setCurrentZoom(prev => Math.max(prev - 1, 1));
  };

  const handleOpenDirections = () => {
    const url = `https://www.openstreetmap.org/directions?from=&to=${coords.lat},${coords.lng}`;
    window.open(url, '_blank');
  };

  // Build OpenStreetMap embed URL with marker
  const mapUrl = showMarker
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01},${coords.lat - 0.01},${coords.lng + 0.01},${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lng}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.02 / currentZoom},${coords.lat - 0.02 / currentZoom},${coords.lng + 0.02 / currentZoom},${coords.lat + 0.02 / currentZoom}&layer=mapnik`;

  return (
    <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
      <iframe
        ref={mapRef}
        src={mapUrl}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="OpenStreetMap"
      />
      
      {interactive && (
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-background/90 backdrop-blur-sm"
            onClick={handleZoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-background/90 backdrop-blur-sm"
            onClick={handleZoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-background/90 backdrop-blur-sm"
            onClick={handleOpenDirections}
          >
            <Navigation className="w-4 h-4" />
          </Button>
        </div>
      )}

      {markerTitle && (
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-3 py-1.5 flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-red-500" />
          <span className="font-medium">{markerTitle}</span>
        </div>
      )}

      <a 
        href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=${currentZoom}/${coords.lat}/${coords.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 text-xs text-muted-foreground hover:underline bg-background/90 backdrop-blur-sm rounded px-2 py-1"
      >
        View larger map
      </a>
    </div>
  );
};
