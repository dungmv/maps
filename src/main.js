import "./style.css";
import "leaflet/dist/leaflet.css";
import { decode } from "@googlemaps/polyline-codec";
import L, {
  Map,
  TileLayer,
  Marker,
  Popup,
  LatLng,
  Polyline,
  Control,
} from "leaflet";

/** @type {Polyline} */
let polylineTracking = null;
const loading = document.getElementById("loading");

const map = new Map("map", {
  zoom: 15,
  center: [21.036809, 105.782771],
  zoomControl: false,
});
const tl = new TileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}",
  { foo: "bar" },
);
tl.addTo(map);

const cz = new Control.Zoom({ position: "bottomleft" });
cz.addTo(map);

const startMarker = new Marker({ lat: 21.029245, lng: 105.777964 });
const endMarker = new Marker({ lat: 21.036809, lng: 105.782771 });
const infoWindow = new Popup();
const durationFormatter = new Intl.DurationFormat("en", {
  style: "long",
  units: ["hour", "minute", "second"],
});

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarToggleIcon = sidebarToggle.querySelector(".material-icons");

function updateSidebarButton(isOpen) {
  sidebarToggleIcon.textContent = isOpen ? "chevron_left" : "menu";
  sidebarToggle.setAttribute(
    "aria-label",
    isOpen ? "Close sidebar" : "Open sidebar",
  );
}

sidebarToggle.addEventListener("click", () => {
  const isClosed = sidebar.classList.contains("w-0");
  if (isClosed) {
    sidebar.classList.remove("w-0");
    sidebar.classList.add("w-[340px]");
  } else {
    sidebar.classList.add("w-0");
    sidebar.classList.remove("w-[340px]");
  }
  updateSidebarButton(isClosed);
});

updateSidebarButton(true);

function formatDuration(seconds) {
  return durationFormatter.format({ seconds });
}

function summarizeRoute(route) {
  const legs = route.legs;

  const total = legs.reduce(
    (acc, leg) => ({
      distance: acc.distance + leg.distance.value, // meters
      duration: acc.duration + leg.duration.value, // seconds
    }),
    { distance: 0, duration: 0 },
  );

  return {
    totalDistanceM: total.distance,
    totalDistanceKm: (total.distance / 1000).toFixed(1),
    totalDurationSec: total.duration,
    totalDurationText: formatDuration(total.duration),
    totalDistanceText: `${(total.distance / 1000).toFixed(1)} km`,
    legs: legs.map((leg, i) => ({
      index: i,
      from: leg.start_address,
      to: leg.end_address,
      distance: leg.distance.text,
      duration: leg.duration.text,
    })),
  };
}

function drawTracking(encodedPolyline, startPoint, endPoint, distance) {
  clearMap();
  startMarker.setLatLng(startPoint).addTo(map);
  endMarker.setLatLng(endPoint).addTo(map);

  // Decode the polyline
  const decodedPath = decode(encodedPolyline);
  polylineTracking = new Polyline(decodedPath, { color: "blue" });
  polylineTracking.addTo(map);

  // set center map
  const centerPoint = new LatLng(
    parseFloat((startPoint.lat + endPoint.lat) / 2),
    parseFloat((startPoint.lng + endPoint.lng) / 2),
  );

  map.fitBounds(polylineTracking.getBounds());

  infoWindow.setContent(distance);
  infoWindow.setLatLng(centerPoint);
  infoWindow.openOn(map);
}

function clearMap() {
  startMarker.remove();
  endMarker.remove();
  if (polylineTracking) polylineTracking.remove();
  polylineTracking = null;
}

/**
 *
 * @param {string} point
 * @returns
 */
function toLatLng(point) {
  const latlng = point.split(",");
  return new LatLng(parseFloat(latlng[0]), parseFloat(latlng[1]));
}

// Active Tab State
let activeTab = "direction";

const tabDirection = document.getElementById("tab-direction");
const tabPolyline = document.getElementById("tab-polyline");
const contentDirection = document.getElementById("content-direction");
const contentPolyline = document.getElementById("content-polyline");

function switchTab(tab) {
  activeTab = tab;
  if (tab === "direction") {
    // Direction Tab Button Active Styles
    tabDirection.classList.add("bg-white", "text-blue-600", "shadow-sm", "font-semibold");
    tabDirection.classList.remove("text-slate-600", "hover:text-slate-900", "font-medium");
    
    // Polyline Tab Button Inactive Styles
    tabPolyline.classList.remove("bg-white", "text-blue-600", "shadow-sm", "font-semibold");
    tabPolyline.classList.add("text-slate-600", "hover:text-slate-900", "font-medium");
    
    // Show/Hide Content
    contentDirection.classList.remove("hidden");
    contentPolyline.classList.add("hidden");
  } else {
    // Polyline Tab Button Active Styles
    tabPolyline.classList.add("bg-white", "text-blue-600", "shadow-sm", "font-semibold");
    tabPolyline.classList.remove("text-slate-600", "hover:text-slate-900", "font-medium");
    
    // Direction Tab Button Inactive Styles
    tabDirection.classList.remove("bg-white", "text-blue-600", "shadow-sm", "font-semibold");
    tabDirection.classList.add("text-slate-600", "hover:text-slate-900", "font-medium");
    
    // Show/Hide Content
    contentPolyline.classList.remove("hidden");
    contentDirection.classList.add("hidden");
  }
}

tabDirection.addEventListener("click", () => switchTab("direction"));
tabPolyline.addEventListener("click", () => switchTab("polyline"));

// Direction search listener
document.getElementById("btn_search").addEventListener("click", function () {
  loading.style.display = "flex";
  const mapUrl = document.getElementById("map-url").value;
  const officeId = document.getElementById("office-id").value;
  const origin = document.getElementById("origin").value.replace(/\s+/g, "");
  const waypoints = document
    .getElementById("waypoints")
    .value.replace(/\s+/g, "");
  const destination = document
    .getElementById("destination")
    .value.replace(/\s+/g, "");

  const url = new URL(`${mapUrl}/maps/api/directions/json`);
  url.searchParams.append("origin", origin);
  url.searchParams.append("destination", destination);
  url.searchParams.append("waypoints", waypoints);

  fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Office-Id": officeId,
    },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((response) => {
      const startPoint = toLatLng(origin);
      const endPoint = toLatLng(destination);

      const polyline = response.routes[0].overview_polyline.points;
      const distance = response.routes[0].legs[0].distance.text;
      drawTracking(polyline, startPoint, endPoint, distance);
      // render route choices into #routes
      const routesDiv = document.getElementById("routes");
      // clear previous entries
      routesDiv.innerHTML = "";
      routesDiv.style.display = "block";

      response.routes.forEach((route, idx) => {
        const id = Math.random().toString(36).slice(2, 9);
        const wrapper = document.createElement("div");
        wrapper.className = "flex items-center space-x-2";

        const input = document.createElement("input");
        input.type = "radio";
        input.id = id;
        input.name = "route";
        input.value = idx;
        input.className = "w-4 h-4";
        if (idx === 0) input.checked = true; // default first

        const label = document.createElement("label");
        label.htmlFor = id;
        label.className = "text-sm font-medium cursor-pointer";
        // use route.summary if available, otherwise fall back to index
        const summary = summarizeRoute(route);
        label.textContent =
          `${route.summary} | ${summary.totalDistanceText}, ${summary.totalDurationText}` ||
          `Route ${idx + 1}`;

        wrapper.appendChild(input);
        wrapper.appendChild(label);
        routesDiv.appendChild(wrapper);

        // when radio selection changes, redraw that route
        input.addEventListener("change", () => {
          if (input.checked) {
            const poly =
              route.overview_polyline && route.overview_polyline.points;
            if (poly) {
              drawTracking(
                poly,
                startPoint,
                endPoint,
                summary.totalDistanceText,
              );
            }
          }
        });
      });
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      loading.style.display = "none";
    });
});

// Polyline drawing listener
document.getElementById("btn_draw").addEventListener("click", function () {
  const coordsInput = document.getElementById("polyline-coords").value.trim();
  if (!coordsInput) {
    alert("Vui lòng nhập danh sách toạ độ!");
    return;
  }

  // Parse coords split by | or newlines
  const points = coordsInput.split(/[|\n]+/).map(p => p.trim()).filter(Boolean);
  const path = [];
  
  for (const p of points) {
    const parts = p.split(",");
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        path.push(new LatLng(lat, lng));
      }
    }
  }

  if (path.length < 2) {
    alert("Vui lòng nhập ít nhất 2 toạ độ hợp lệ (định dạng: lat,lng|lat,lng...)");
    return;
  }

  clearMap();

  const startPoint = path[0];
  const endPoint = path[path.length - 1];

  startMarker.setLatLng(startPoint).addTo(map);
  endMarker.setLatLng(endPoint).addTo(map);

  polylineTracking = new Polyline(path, { color: "#2563eb", weight: 5, opacity: 0.8 });
  polylineTracking.addTo(map);

  // Calculate total distance dynamically
  let totalDistanceM = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDistanceM += path[i].distanceTo(path[i + 1]);
  }
  const distanceText = `${(totalDistanceM / 1000).toFixed(2)} km`;

  const bounds = polylineTracking.getBounds();
  map.fitBounds(bounds);

  const infoContent = `
    <div class="p-1 font-sans">
      <h3 class="text-sm font-bold text-slate-800 border-b border-slate-100 pb-1 mb-1.5 flex items-center gap-1">
        <span class="material-icons text-emerald-600 text-sm">gesture</span> Polyline Path
      </h3>
      <p class="text-xs text-slate-600 flex justify-between gap-4">
        <span>Total Points:</span> <strong class="text-slate-800">${path.length}</strong>
      </p>
      <p class="text-xs text-slate-600 flex justify-between gap-4 mt-0.5">
        <span>Distance:</span> <strong class="text-emerald-600 font-bold">${distanceText}</strong>
      </p>
    </div>
  `;

  infoWindow.setContent(infoContent);
  infoWindow.setLatLng(bounds.getCenter());
  infoWindow.openOn(map);
});

// Map click listener
map.on("click", function (event) {
  const { lat, lng } = event.latlng;
  
  if (activeTab === "direction") {
    let marker = null;
    let input = null;
    
    if (!startMarker._map) {
      marker = startMarker;
      input = document.getElementById("origin");
    } else if (!endMarker._map) {
      marker = endMarker;
      input = document.getElementById("destination");
    }

    if (marker) {
      marker.setLatLng(event.latlng).addTo(map);
      input.value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      marker.on("click", function () {
        marker.remove();
        input.value = "";
      });
    }
  } else if (activeTab === "polyline") {
    const textarea = document.getElementById("polyline-coords");
    const val = textarea.value.trim();
    const formattedCoord = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    if (val) {
      if (/[|\n]$/.test(val)) {
        textarea.value = val + formattedCoord;
      } else {
        textarea.value = val + "|" + formattedCoord;
      }
    } else {
      textarea.value = formattedCoord;
    }
  }
});

// Settings Modal logic
const settingsModal = document.getElementById("settings-modal");
const btnSettings = document.getElementById("btn_settings");
const closeSettings = document.getElementById("close-settings");
const saveSettings = document.getElementById("save-settings");

if (btnSettings && settingsModal && closeSettings && saveSettings) {
  const openModal = () => {
    settingsModal.classList.remove("hidden");
    settingsModal.classList.add("flex");
  };

  const closeModal = () => {
    settingsModal.classList.add("hidden");
    settingsModal.classList.remove("flex");
  };

  btnSettings.addEventListener("click", openModal);
  closeSettings.addEventListener("click", closeModal);
  saveSettings.addEventListener("click", closeModal);

  // Close modal when clicking outside of the modal dialog box
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      closeModal();
    }
  });
}
