// OpenStreetMap utilities for Food Donation app

// Initialize an OpenStreetMap in the specified element
function initOpenStreetMap(elementId, position = CHENNAI_CENTER, zoom = DEFAULT_ZOOM) {
  const mapElement = document.getElementById(elementId);
  if (!mapElement) return null;
  
  // Create the map with Leaflet
  const map = L.map(elementId).setView([position.lat, position.lng], zoom);
  
  // Add the OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);
  
  return map;
}

// Add a marker to an OpenStreetMap
function addOsmMarker(map, position, title = '', isOrganization = false) {
  if (!map) return null;
  
  // Use different marker colors for organizations vs donors
  const markerIcon = isOrganization ? 
    L.divIcon({
      html: `<div class="org-marker" title="${title}"></div>`,
      className: 'org-marker-container',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    }) : 
    L.divIcon({
      html: `<div class="donor-marker" title="${title}"></div>`,
      className: 'donor-marker-container',
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });
  
  const marker = L.marker([position.lat, position.lng], {
    icon: markerIcon,
    title: title
  }).addTo(map);
  
  // Add popup with title
  if (title) {
    marker.bindPopup(title);
  }
  
  return marker;
}

// Geocode an address to get coordinates using Nominatim (OpenStreetMap's geocoding service)
async function geocodeAddressOsm(address) {
  if (!address) return null;
  
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Chennai, Tamil Nadu, India')}`);
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    } else {
      console.error(`Geocoding failed for address "${address}": No results`);
      throw new Error('Geocoding failed: No results');
    }
  } catch (error) {
    console.error(`Geocoding failed for address "${address}":`, error);
    throw error;
  }
}
