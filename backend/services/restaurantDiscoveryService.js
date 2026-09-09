const hasUsableCoordinates = (coordinates) => (
  Array.isArray(coordinates)
  && coordinates.length === 2
  && coordinates.every(Number.isFinite)
  && !(coordinates[0] === 0 && coordinates[1] === 0)
);

const distanceBetweenKm = (origin, destination) => {
  if (!hasUsableCoordinates(origin) || !hasUsableCoordinates(destination)) return null;
  const radians = (degrees) => degrees * (Math.PI / 180);
  const [originLongitude, originLatitude] = origin;
  const [destinationLongitude, destinationLatitude] = destination;
  const latitudeDelta = radians(destinationLatitude - originLatitude);
  const longitudeDelta = radians(destinationLongitude - originLongitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(originLatitude)) * Math.cos(radians(destinationLatitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return Number((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

const priceLevelForAverage = (averagePrice) => {
  if (!Number.isFinite(averagePrice)) return null;
  if (averagePrice <= 200) return 1;
  if (averagePrice <= 400) return 2;
  return 3;
};

const estimatedDeliveryMinutes = (distanceKm) => (
  distanceKm === null ? 30 : Math.min(60, Math.max(20, Math.round(20 + distanceKm * 4)))
);

module.exports = { distanceBetweenKm, estimatedDeliveryMinutes, priceLevelForAverage };
