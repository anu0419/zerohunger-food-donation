/**
 * Maps Configuration
 * This file contains configuration settings for maps used throughout the application
 */

// Default center coordinates for Chennai
const CHENNAI_CENTER = {
  lat: 13.0827,
  lng: 80.2707
};

// Default zoom level for maps
const DEFAULT_ZOOM = 12;

// Map style configuration
const MAP_STYLES = {
  default: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
};

// Custom marker styles
const MARKER_STYLES = {
  donor: {
    className: 'donor-marker',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  },
  organization: {
    className: 'org-marker',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  }
};
