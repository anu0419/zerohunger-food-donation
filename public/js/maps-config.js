// Google Maps configuration
const MAPS_API_KEY = 'AIzaSyBNLrJhOMz6idD05pzwk17mcLxJxX7hcCI'; // Replace with your actual API key

// Map type configuration
const USE_OPENSTREETMAP = true; // Set to false to use Google Maps instead

// OpenStreetMap configuration
const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 }; // Chennai coordinates
const DEFAULT_ZOOM = 12;

// OpenStreetMap marker styles
const OSM_STYLES = `
.org-marker-container {
  background: transparent;
}
.org-marker {
  width: 25px;
  height: 41px;
  background-image: url('https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png');
  background-size: contain;
  background-repeat: no-repeat;
  filter: hue-rotate(120deg);
}
.donor-marker-container {
  background: transparent;
}
.donor-marker {
  width: 25px;
  height: 41px;
  background-image: url('https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png');
  background-size: contain;
  background-repeat: no-repeat;
}
`;
