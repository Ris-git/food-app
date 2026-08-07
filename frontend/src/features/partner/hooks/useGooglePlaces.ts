import { useEffect, useRef, useState } from 'react';

export interface PlaceResult {
  formattedAddress: string;
  lat: number;
  lng: number;
}

export const useGooglePlaces = (
  inputRef: React.RefObject<HTMLInputElement | null>,
  onPlaceSelect: (place: PlaceResult) => void,
  apiKey?: string
) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    // If Google Maps JS SDK is already loaded globally
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      initAutocomplete();
      return;
    }

    // If API key is provided, load script dynamically
    if (apiKey) {
      const scriptId = 'google-maps-places-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.onload = () => {
          setIsLoaded(true);
          initAutocomplete();
        };
        document.head.appendChild(script);
      }
    }
  }, [apiKey]);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    if (!autocompleteRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place?.geometry?.location) {
          onPlaceSelect({
            formattedAddress: place.formatted_address || place.name || '',
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });

      autocompleteRef.current = autocomplete;
    }
  };

  return { isLoaded };
};

declare global {
  interface Window {
    google: any;
  }
}
