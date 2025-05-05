import { showNotification } from "./utils/ui-helpers.js";

let leafletMap;
let markerLayer = L.layerGroup();
let currentPositionMarker;
let mapInitialized = false;
const DEFAULT_LAT = 40.7128;
const DEFAULT_LNG = -74.006;
const DEFAULT_ZOOM = 12;
const USER_LOC_ZOOM = 14;

const baseSampleGyms = [
  {
    id: 1,
    name: "Fitness Zone",
    address: "123 Main St, Downtown",
    isOpen: true,
    rating: 4.7,
    features: ["24/7 Access", "Group Classes", "Pool"],
    imageUrl: "/assets/images/image1.jpeg",
    lat: 40.715,
    lng: -74.008,
  },
  {
    id: 2,
    name: "PowerFit Gym",
    address: "456 Oak Ave, Westside",
    isOpen: true,
    rating: 4.5,
    features: ["Group Classes", "Personal Training"],
    imageUrl: "/assets/images/image2.jpeg",
    lat: 40.718,
    lng: -74.015,
  },
  {
    id: 3,
    name: "Iron Works",
    address: "789 Steel Rd, Industrial",
    isOpen: false,
    rating: 4.8,
    features: ["24/7 Access", "Strength Focus"],
    imageUrl: "/assets/images/image3.webp",
    lat: 40.705,
    lng: -74.005,
  },
  {
    id: 4,
    name: "Community Wellness",
    address: "321 Park Ln, North Side",
    isOpen: true,
    rating: 4.2,
    features: ["Pool", "Group Classes"],
    imageUrl: "/assets/images/image4.webp",
    lat: 40.725,
    lng: -74.0,
  },
  {
    id: 5,
    name: "Elite Fitness Club",
    address: "555 High St, Financial",
    isOpen: true,
    rating: 4.9,
    features: ["24/7 Access", "Luxury", "Personal Training"],
    imageUrl: "/assets/images/image5.jpeg",
    lat: 40.708,
    lng: -74.011,
  },
  {
    id: 6,
    name: "Budget Gym",
    address: "111 Economy Rd, South Side",
    isOpen: true,
    rating: 3.8,
    features: ["Affordable"],
    imageUrl: "/assets/images/image6.jpg",
    lat: 40.699,
    lng: -74.002,
  },
];

let currentGymData = JSON.parse(JSON.stringify(baseSampleGyms));

const locationInput = document.getElementById("location-input");
const searchBtn = document.getElementById("search-btn");
const useMyLocationBtn = document.getElementById("use-my-location");
const openNowCheckbox = document.getElementById("open-now");
const hasClassesCheckbox = document.getElementById("has-classes");
const twentyFourHourCheckbox = document.getElementById("24-hours");
const radiusSelect = document.getElementById("radius");
const gymListContainer = document.getElementById("gym-list");
const mapElement = document.getElementById("map");

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!leafletMap) return Infinity;
  const point1 = L.latLng(lat1, lon1);
  const point2 = L.latLng(lat2, lon2);
  return leafletMap.distance(point1, point2) / 1000;
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    address
  )}&limit=1`;
  console.log("Geocoding URL:", url);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }
    const data = await response.json();
    if (data && data.length > 0) {
      console.log("Geocoding result:", data[0]);
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } else {
      console.log("Geocoding: No results found for", address);
      return null;
    }
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
}

function initializeLeafletMap(
  centerCoords = [DEFAULT_LAT, DEFAULT_LNG],
  zoomLevel = DEFAULT_ZOOM
) {
  if (mapInitialized || !mapElement) return;
  try {
    console.log(`Initializing map at ${centerCoords} zoom ${zoomLevel}`);
    leafletMap = L.map(mapElement).setView(centerCoords, zoomLevel);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(leafletMap);
    markerLayer.addTo(leafletMap);
    mapInitialized = true;
    console.log("Leaflet map initialized.");

    simulateFetchAndUpdateGyms(centerCoords[0], centerCoords[1]);
  } catch (error) {
    console.error("Error initializing Leaflet map:", error);
    if (mapElement)
      mapElement.innerHTML =
        '<p style="text-align:center; padding: 20px; color: red;">Could not load map.</p>';
  }
}

function updateMapMarkers(gymsToDisplay) {
  markerLayer.clearLayers();
  if (!leafletMap || gymsToDisplay.length === 0) return;
  let bounds = [];

  gymsToDisplay.forEach((gym) => {
    if (gym.lat && gym.lng) {
      const latLng = [gym.lat, gym.lng];
      const marker = L.marker(latLng);
      const popupContent = `<strong>${gym.name}</strong><p>${
        gym.address
      }</p><p>Rating: ${gym.rating || "N/A"} ⭐</p><p>${
        gym.isOpen ? "Open Now" : "Closed"
      }</p>`;
      marker.bindPopup(popupContent);
      marker.gymId = gym.id;
      markerLayer.addLayer(marker);
      bounds.push(latLng);
    }
  });
}

function panToMarker(gymId) {
  if (!leafletMap) return;
  markerLayer.eachLayer((marker) => {
    if (marker.gymId === gymId) {
      leafletMap.panTo(marker.getLatLng());
      marker.openPopup();
      return false;
    }
  });
}

function updateUserLocationMarker(lat, lng) {
  if (!leafletMap) return;
  const latLng = [lat, lng];
  if (currentPositionMarker) {
    currentPositionMarker.setLatLng(latLng);
  } else {
    currentPositionMarker = L.marker(latLng).addTo(leafletMap);
  }
  currentPositionMarker.bindPopup("<b>Your Location</b>").openPopup();

  leafletMap.setView(latLng, USER_LOC_ZOOM);
}

function simulateFetchAndUpdateGyms(searchLat, searchLng) {
  console.log(`Simulating gym fetch near ${searchLat}, ${searchLng}`);

  currentGymData = JSON.parse(JSON.stringify(baseSampleGyms));

  currentGymData.forEach((gym) => {
    gym.distance = calculateDistance(searchLat, searchLng, gym.lat, gym.lng);
  });

  currentGymData.sort((a, b) => a.distance - b.distance);

  console.log("Updated gym data with new distances:", currentGymData);

  filterAndDisplayGyms();
}

function displayGymList(gymsToDisplay) {
  if (!gymListContainer) return;
  gymListContainer.innerHTML = "";

  if (gymsToDisplay.length === 0) {
    gymListContainer.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><h3>No gyms found matching criteria</h3><p>Try adjusting filters or location.</p></div>`;
    return;
  }

  gymsToDisplay.forEach((gym) => {
    const gymCard = document.createElement("div");
    gymCard.className = "gym-card";
    gymCard.dataset.gymId = gym.id;

    const distanceText =
      gym.distance < 1
        ? `${(gym.distance * 1000).toFixed(0)} m`
        : `${gym.distance.toFixed(1)} km`;

    gymCard.innerHTML = `
            <div class="gym-image" style="background-image: url('${
              gym.imageUrl || "/assets/images/default-gym.jpg"
            }')"></div>
            <div class="gym-info">
                <div class="gym-name">${gym.name}${
      gym.rating ? `<span class="gym-rating">${gym.rating}</span>` : ""
    }</div>
                <div class="gym-address">${
                  gym.address
                } <span>(${distanceText})</span></div>
                <div class="gym-hours ${gym.isOpen ? "open" : "closed"}">${
      gym.isOpen ? "✓ Open Now" : "✗ Closed"
    }</div>
                ${
                  gym.features && gym.features.length > 0
                    ? `<div class="gym-features">${gym.features
                        .map((f) => `<span class="feature-tag">${f}</span>`)
                        .join("")}</div>`
                    : ""
                }
                <button class="btn btn-primary directions-btn" data-lat="${
                  gym.lat
                }" data-lng="${gym.lng}">Get Directions</button>
            </div>`;
    gymCard.addEventListener("click", (e) => {
      if (!e.target.classList.contains("directions-btn")) panToMarker(gym.id);
    });
    gymListContainer.appendChild(gymCard);
  });
}

function filterAndDisplayGyms() {
  if (!currentGymData) return;

  const openNow = openNowCheckbox?.checked;
  const hasClasses = hasClassesCheckbox?.checked;
  const has24HourAccess = twentyFourHourCheckbox?.checked;
  const maxDistance = radiusSelect ? parseInt(radiusSelect.value) / 1000 : 5;

  let filteredGyms = currentGymData.filter((gym) => {
    if (openNow && !gym.isOpen) return false;
    if (hasClasses && !gym.features.includes("Group Classes")) return false;
    if (has24HourAccess && !gym.features.includes("24/7 Access")) return false;

    if (gym.distance > maxDistance) return false;
    return true;
  });

  displayGymList(filteredGyms);
  updateMapMarkers(filteredGyms);
}

async function handleSearch() {
  const query = locationInput?.value.trim();
  if (!query) {
    showNotification("Please enter a location to search.", "info");
    return;
  }

  showNotification(`Searching for "${query}"...`, "info");
  if (gymListContainer)
    gymListContainer.innerHTML = `<div class="loading"><div class="spinner"></div><p>Geocoding location...</p></div>`;

  const coords = await geocodeAddress(query);

  if (coords) {
    showNotification("Location found. Finding nearby gyms...", "info");
    if (leafletMap) {
      leafletMap.setView([coords.lat, coords.lon], USER_LOC_ZOOM);
    } else {
      initializeLeafletMap([coords.lat, coords.lon], USER_LOC_ZOOM);
    }

    simulateFetchAndUpdateGyms(coords.lat, coords.lon);
  } else {
    showNotification(
      `Could not find coordinates for "${query}". Displaying default gyms.`,
      "error"
    );
    if (gymListContainer) gymListContainer.innerHTML = "";
  }
}

function handleLocationSearch() {
  if (navigator.geolocation) {
    showNotification("Getting your location...", "info");
    if (gymListContainer)
      gymListContainer.innerHTML = `<div class="loading"><div class="spinner"></div><p>Getting location...</p></div>`;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        console.log("User location found:", lat, lng);
        showNotification("Location found. Finding nearby gyms...", "success");

        if (!mapInitialized) {
          initializeLeafletMap([lat, lng], USER_LOC_ZOOM);
        } else {
          leafletMap.setView([lat, lng], USER_LOC_ZOOM);
        }
        updateUserLocationMarker(lat, lng);
        simulateFetchAndUpdateGyms(lat, lng);
      },
      (error) => {
        console.error("Geolocation error:", error);
        showNotification(`Error getting location: ${error.message}`, "error");
        if (gymListContainer) gymListContainer.innerHTML = "";

        if (!mapInitialized) initializeLeafletMap();
        else simulateFetchAndUpdateGyms(DEFAULT_LAT, DEFAULT_LNG);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    showNotification("Geolocation is not supported.", "error");
    if (!mapInitialized) initializeLeafletMap();
  }
}

function showDirections(lat, lng) {
  if (lat && lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
  } else {
    showNotification("Directions cannot be shown for this location.", "error");
  }
}

function initPage() {
  console.log("Initializing Gym Locator Page...");
  initializeLeafletMap();

  openNowCheckbox?.addEventListener("change", filterAndDisplayGyms);
  hasClassesCheckbox?.addEventListener("change", filterAndDisplayGyms);
  twentyFourHourCheckbox?.addEventListener("change", filterAndDisplayGyms);
  radiusSelect?.addEventListener("change", filterAndDisplayGyms);
  searchBtn?.addEventListener("click", handleSearch);
  useMyLocationBtn?.addEventListener("click", handleLocationSearch);
  locationInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  document.addEventListener("click", function (event) {
    if (event.target.classList.contains("directions-btn")) {
      const button = event.target;
      showDirections(button.dataset.lat, button.dataset.lng);
    }
  });

  console.log("Gym Locator event listeners attached.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage);
} else {
  initPage();
}
