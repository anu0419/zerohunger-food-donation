# Google Maps Integration for Chennai Locations

## Implementation Overview
This plan outlines how to add Google Maps functionality for Chennai locations in the Food Donation app while preserving all existing functionality.

## Technical Requirements
- Google Maps JavaScript API key
- Geocoding API (to convert addresses to coordinates)
- Map integration in relevant pages

## Implementation Details

### 1. Set Up Google Maps API

#### 1.1 Get API Key
```javascript
// You'll need to obtain a Google Maps API key from the Google Cloud Console
// https://console.cloud.google.com/
// Enable both Maps JavaScript API and Geocoding API
```

#### 1.2 Create a Google Maps Config File
```javascript
// Create a new file: public/js/maps-config.js

const MAPS_API_KEY = 'YOUR_API_KEY';
const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 }; // Chennai coordinates
const DEFAULT_ZOOM = 12;
```

### 2. Add Google Maps to Layout Templates

#### 2.1 Add Google Maps API Script to Key Pages
Modify the relevant EJS templates to include the Google Maps API script in the head section:

```html
<!-- Add this to the <head> section of templates that need maps -->
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap" async defer></script>
<script src="/js/maps-config.js"></script>
<script src="/js/maps-utils.js"></script>
```

#### 2.2 Create Maps Utility Functions
```javascript
// Create a new file: public/js/maps-utils.js

// Initialize a map in the specified element
function initMap(elementId, position = CHENNAI_CENTER, zoom = DEFAULT_ZOOM) {
  const mapElement = document.getElementById(elementId);
  if (!mapElement) return null;
  
  const map = new google.maps.Map(mapElement, {
    center: position,
    zoom: zoom
  });
  
  return map;
}

// Add a marker to a map
function addMarker(map, position, title = '') {
  return new google.maps.Marker({
    position: position,
    map: map,
    title: title
  });
}

// Geocode an address to get coordinates
async function geocodeAddress(address) {
  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: address + ', Chennai, Tamil Nadu, India' }, (results, status) => {
      if (status === 'OK') {
        resolve(results[0].geometry.location);
      } else {
        reject(`Geocoding failed: ${status}`);
      }
    });
  });
}
```

### 3. Add Maps to Food Donation Forms

#### 3.1 Modify Food Donation Form Template
Add a map container to `views/food_donate_form.ejs` and `views/grocery_donate_form.ejs`:

```html
<!-- Add this after the address information -->
<h3 class="map-heading">Location:</h3>
<div id="donation-map" style="height: 300px; width: 100%; margin-bottom: 20px;"></div>

<script>
  // This will be called when Google Maps API is loaded
  function initMap() {
    // Initialize the map
    const map = initMap('donation-map');
    
    // Get address components from the page
    const street = "<%= don_details.street %>";
    const city = "<%= don_details.city %>";
    const district = "<%= don_details.dist %>";
    const state = "<%= don_details.state %>";
    const pincode = "<%= don_details.pincode %>";
    
    // Construct full address
    const fullAddress = `${street}, ${city}, ${district}, ${state}, ${pincode}`;
    
    // Geocode the address and add a marker
    geocodeAddress(fullAddress)
      .then(position => {
        // Recenter map on the geocoded position
        map.setCenter(position);
        
        // Add a marker
        addMarker(map, position, "Donation Location");
      })
      .catch(error => {
        console.error("Error geocoding address:", error);
        // If geocoding fails, just show the default Chennai map
      });
  }
</script>
```

### 4. Add Maps to Profile Pages

#### 4.1 Modify Donor Profile Template
Add map to `views/don_profile.ejs`:

```html
<!-- Add after the address section -->
<div id="profile-map" style="height: 300px; width: 100%; margin-top: 20px; margin-bottom: 20px;"></div>

<script>
  function initMap() {
    const map = initMap('profile-map');
    
    // Get address details
    const street = "<%= don_data.street %>";
    const city = "<%= don_data.city %>";
    const district = "<%= don_data.dist %>";
    const state = "<%= don_data.state %>";
    const pincode = "<%= don_data.pincode %>";
    
    // Construct full address
    const fullAddress = `${street}, ${city}, ${district}, ${state}, ${pincode}`;
    
    // Geocode and add marker
    geocodeAddress(fullAddress)
      .then(position => {
        map.setCenter(position);
        addMarker(map, position, "Your Location");
      })
      .catch(error => {
        console.error("Error geocoding address:", error);
      });
  }
</script>
```

#### 4.2 Modify Organization Profile Template
Similar addition to `views/org_profile.ejs` with appropriate variables.

### 5. Add Maps to Donation History Entries

#### 5.1 Modify Donation History Templates
Add map display to `views/don_history.ejs` and `views/org_history.ejs`:

```html
<!-- Add toggle button for each donation entry -->
<button class="show-map-btn" onclick="toggleMap('<%= dataArr.don_his_data[i].OrderId %>')">
  Show on Map
</button>

<!-- Add map container for each donation -->
<div id="map-<%= dataArr.don_his_data[i].OrderId %>" class="donation-map" style="display: none; height: 200px; width: 100%; margin-top: 10px;"></div>

<script>
  // Array to store map instances
  const maps = {};
  
  function toggleMap(orderId) {
    const mapContainer = document.getElementById(`map-${orderId}`);
    
    if (mapContainer.style.display === 'none') {
      mapContainer.style.display = 'block';
      
      // Initialize map if not already done
      if (!maps[orderId]) {
        // Get the address from the donation
        const address = "<%= dataArr.don_his_data[i].address %>";
        
        // Initialize map
        const map = new google.maps.Map(mapContainer, {
          center: CHENNAI_CENTER,
          zoom: DEFAULT_ZOOM
        });
        
        // Store the map instance
        maps[orderId] = map;
        
        // Geocode the address and add marker
        geocodeAddress(address)
          .then(position => {
            map.setCenter(position);
            addMarker(map, position, "Donation Location");
          })
          .catch(error => {
            console.error("Error geocoding address:", error);
          });
      }
    } else {
      mapContainer.style.display = 'none';
    }
  }
</script>
```

### 6. Update Server.js to Serve Static Files

Add middleware to serve static files if not already present:

```javascript
// Add to server.js where other middleware is configured
app.use(express.static('public'));
```

### 7. Add a Map View to Find Nearby Organizations

#### 7.1 Create a New View Template
Create `views/find_organizations.ejs`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Include standard headers, Bootstrap, etc. -->
  <title>Find Organizations in Chennai</title>
  <style>
    #organizations-map {
      height: 500px;
      width: 100%;
      margin: 20px 0;
    }
    .org-list {
      max-height: 400px;
      overflow-y: auto;
      padding: 15px;
      border: 1px solid #eee;
      border-radius: 5px;
    }
    .org-item {
      padding: 10px;
      margin-bottom: 10px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }
    .org-item:hover {
      background-color: #f5f5f5;
    }
  </style>
</head>
<body>
  <!-- Include standard navbar -->
  
  <div class="container" style="margin-top: 80px;">
    <h2>Find Organizations in Chennai</h2>
    
    <div id="organizations-map"></div>
    
    <div class="row">
      <div class="col-md-6">
        <h3>Organizations List</h3>
        <div class="org-list" id="org-list">
          <!-- Organizations will be loaded here -->
        </div>
      </div>
      <div class="col-md-6">
        <h3>Selected Organization</h3>
        <div id="org-details">
          <p>Select an organization to see details</p>
        </div>
      </div>
    </div>
  </div>

  <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap" async defer></script>
  <script src="/js/maps-config.js"></script>
  <script>
    let map;
    let markers = [];
    const organizations = <%= JSON.stringify(organizations) %>;
    
    function initMap() {
      // Initialize the map centered on Chennai
      map = new google.maps.Map(document.getElementById('organizations-map'), {
        center: CHENNAI_CENTER,
        zoom: 12
      });
      
      // Add markers for each organization
      displayOrganizations();
    }
    
    function displayOrganizations() {
      const orgList = document.getElementById('org-list');
      orgList.innerHTML = '';
      
      organizations.forEach(org => {
        // Geocode the org address
        const address = `${org.street}, ${org.city}, ${org.dist}, ${org.state}, ${org.pincode}`;
        
        geocodeAddress(address)
          .then(position => {
            // Add marker to map
            const marker = new google.maps.Marker({
              position: position,
              map: map,
              title: org.organization_name
            });
            
            // Store marker
            markers.push(marker);
            
            // Add info window
            const infoWindow = new google.maps.InfoWindow({
              content: `<h5>${org.organization_name}</h5><p>${address}</p>`
            });
            
            marker.addListener('click', () => {
              infoWindow.open(map, marker);
              showOrgDetails(org);
            });
            
            // Add organization to list
            const div = document.createElement('div');
            div.className = 'org-item';
            div.textContent = org.organization_name;
            div.addEventListener('click', () => {
              map.setCenter(position);
              map.setZoom(15);
              infoWindow.open(map, marker);
              showOrgDetails(org);
            });
            
            orgList.appendChild(div);
          })
          .catch(error => {
            console.error(`Error geocoding ${org.organization_name}:`, error);
          });
      });
    }
    
    function showOrgDetails(org) {
      const detailsDiv = document.getElementById('org-details');
      detailsDiv.innerHTML = `
        <h4>${org.organization_name}</h4>
        <p><strong>Contact:</strong> ${org.ph_no}</p>
        <p><strong>Email:</strong> ${org.email}</p>
        <p><strong>Address:</strong><br>
        ${org.street},<br>
        ${org.city}, ${org.dist},<br>
        ${org.state} - ${org.pincode}</p>
        <a href="/chat/${org.organization_name}" class="btn btn-primary">Chat with Organization</a>
        <a href="/donat_food?org=${org.organization_id}" class="btn btn-success">Donate Food</a>
      `;
    }
    
    // Geocode function (simplified version)
    async function geocodeAddress(address) {
      const geocoder = new google.maps.Geocoder();
      
      return new Promise((resolve, reject) => {
        geocoder.geocode({ address: address + ', Chennai, Tamil Nadu, India' }, (results, status) => {
          if (status === 'OK') {
            resolve(results[0].geometry.location);
          } else {
            reject(`Geocoding failed: ${status}`);
          }
        });
      });
    }
  </script>
</body>
</html>
```

#### 7.2 Add Route to Server.js

```javascript
// Add to server.js
app.get("/find-organizations", async (req, res) => {
  try {
    // Get all organizations
    const organizationsSnapshot = await db.collection("Organizations").get();
    const organizations = organizationsSnapshot.docs.map(doc => doc.data());
    
    res.render("find_organizations", { organizations });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).send("Error fetching organizations");
  }
});
```

#### 7.3 Add Navigation Link
Add a new link to the navbar in relevant templates:

```html
<li class="nav-item">
  <a class="nav-link active" aria-current="page" href="/find-organizations">Find Organizations</a>
</li>
```

## Testing Recommendations

1. Test on each relevant page to ensure maps load correctly
2. Verify geocoding works with addresses in Chennai
3. Ensure that the application works even if maps fail to load (graceful degradation)
4. Test on both desktop and mobile devices
5. Check for any JavaScript errors in the console
