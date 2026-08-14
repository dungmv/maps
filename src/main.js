import "./style.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { decode, encode } from "@googlemaps/polyline-codec";
import maplibregl from "maplibre-gl";

const loading = document.getElementById("loading");

const map = new maplibregl.Map({
  container: "map",
  zoom: 15,
  center: [105.782771, 21.036809], // [lng, lat]
  style: "https://api.maptiler.com/maps/streets-v4/style.json?key=LNu5oxyjvsY5rNpPpzTR",
  attributionControl: true,
});

// Add zoom control (in the bottom-left corner, matching original Leaflet layout)
map.addControl(
  new maplibregl.NavigationControl({ showCompass: false }),
  "bottom-left",
);

const startMarker = new maplibregl.Marker({ color: "#2563eb" }); // Blue
const endMarker = new maplibregl.Marker({ color: "#ef4444" }); // Red
const infoWindow = new maplibregl.Popup({ closeOnClick: false });

/** @type {maplibregl.Marker[]} */
let pointMarkers = [];

const durationFormatter = new Intl.DurationFormat("en", {
  style: "long",
  units: ["hour", "minute", "second"],
});

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarToggleIcon = sidebarToggle.querySelector(".material-icons");

let isStartAdded = false;
let isEndAdded = false;
let activeTab = "polyline";

// Listeners for marker clicks to remove them (direction mode only)
startMarker.getElement().addEventListener("click", (e) => {
  e.stopPropagation();
  if (activeTab === "direction") {
    startMarker.remove();
    isStartAdded = false;
    const input = document.getElementById("origin");
    if (input) input.value = "";
  }
});

endMarker.getElement().addEventListener("click", (e) => {
  e.stopPropagation();
  if (activeTab === "direction") {
    endMarker.remove();
    isEndAdded = false;
    const input = document.getElementById("destination");
    if (input) input.value = "";
  }
});

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
    sidebar.classList.add("w-85");
  } else {
    sidebar.classList.add("w-0");
    sidebar.classList.remove("w-85");
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

// Calculate distance in meters between two coordinates [lng, lat] using Haversine formula
function distance(coord1, coord2) {
  const R = 6371000; // Earth radius in meters
  const lat1 = coord1[1];
  const lon1 = coord1[0];
  const lat2 = coord2[1];
  const lon2 = coord2[0];

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function drawTracking(encodedPolyline, startPoint, endPoint, distanceVal) {
  clearMap();
  startMarker.setLngLat([startPoint.lng, startPoint.lat]).addTo(map);
  isStartAdded = true;
  endMarker.setLngLat([endPoint.lng, endPoint.lat]).addTo(map);
  isEndAdded = true;

  // Decode the polyline
  const unescapedPoly = encodedPolyline.replace(/\\\\/g, "\\");
  const decodedPath = decode(unescapedPoly);
  const coordinates = decodedPath.map(([lat, lng]) => [lng, lat]);

  if (map.getSource("route")) {
    map.getSource("route").setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: coordinates,
      },
    });
  } else {
    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
      },
    });
    map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#2563eb",
        "line-width": 5,
        "line-opacity": 0.8,
      },
    });
  }

  // Zoom to fit bounds
  const bounds = new maplibregl.LngLatBounds();
  coordinates.forEach((coord) => bounds.extend(coord));
  map.fitBounds(bounds, { padding: 50 });

  // Add details info popup
  const centerLng = (startPoint.lng + endPoint.lng) / 2;
  const centerLat = (startPoint.lat + endPoint.lat) / 2;
  infoWindow.setHTML(distanceVal).setLngLat([centerLng, centerLat]).addTo(map);
}

function clearMap() {
  startMarker.remove();
  isStartAdded = false;
  endMarker.remove();
  isEndAdded = false;

  if (map.getLayer("route")) map.removeLayer("route");
  if (map.getSource("route")) map.removeSource("route");

  infoWindow.remove();

  pointMarkers.forEach((marker) => marker.remove());
  pointMarkers = [];
}

/**
 *
 * @param {string} point
 * @returns {{lat: number, lng: number}}
 */
function toLatLng(point) {
  const latlng = point.split(",");
  return { lat: parseFloat(latlng[0]), lng: parseFloat(latlng[1]) };
}

let selectedFormat = "latlng"; // "latlng" | "json" | "polyline"

function getSelectedPrecision() {
  const selectEl = document.getElementById("precision-select");
  return selectEl ? parseInt(selectEl.value, 10) : 5;
}

function updateFormatUI() {
  const formatLatlngBtn = document.getElementById("format-latlng");
  const formatJsonBtn = document.getElementById("format-json");
  const formatPolylineBtn = document.getElementById("format-polyline");
  const precisionContainer = document.getElementById("precision-option-container");
  const textarea = document.getElementById("polyline-coords");
  const hintEl = document.getElementById("polyline-format-hint");

  const allFormatBtns = [formatLatlngBtn, formatJsonBtn, formatPolylineBtn];
  allFormatBtns.forEach((btn) => {
    if (btn) {
      btn.className =
        "format-btn flex-1 rounded-lg py-1.5 px-1 text-center transition-all duration-200 cursor-pointer hover:text-slate-900 text-slate-600 font-medium";
    }
  });

  const activeBtnMap = {
    latlng: formatLatlngBtn,
    json: formatJsonBtn,
    polyline: formatPolylineBtn,
  };
  const activeBtn = activeBtnMap[selectedFormat];
  if (activeBtn) {
    activeBtn.className =
      "format-btn flex-1 rounded-lg py-1.5 px-1 text-center transition-all duration-200 cursor-pointer bg-white text-blue-600 font-semibold shadow-xs";
  }

  if (selectedFormat === "polyline") {
    if (precisionContainer) {
      precisionContainer.classList.remove("hidden");
      precisionContainer.classList.add("flex");
    }
  } else {
    if (precisionContainer) {
      precisionContainer.classList.add("hidden");
      precisionContainer.classList.remove("flex");
    }
  }

  if (textarea) {
    if (selectedFormat === "latlng") {
      textarea.placeholder = "21.036809,105.782771|21.037500,105.783500|...";
      if (hintEl) {
        hintEl.innerHTML = `<span class="font-semibold">Format:</span> lat,lng|lat,lng... Click directly on the map to add coordinates automatically.`;
      }
    } else if (selectedFormat === "json") {
      textarea.placeholder = `[{"lat": 21.036809, "lng": 105.782771},{"lat": 21.037500, "lng": 105.783500}]`;
      if (hintEl) {
        hintEl.innerHTML = `<span class="font-semibold">Format:</span> JSON Array [{"lat":21.036,"lng":105.78}]. Click directly on the map to add coordinates.`;
      }
    } else if (selectedFormat === "polyline") {
      textarea.placeholder = "_p~iF~ps|U_ulLnnqC_mqN...";
      if (hintEl) {
        hintEl.innerHTML = `<span class="font-semibold">Format:</span> Encoded Polyline (Precision ${getSelectedPrecision()}). Click directly on the map to add coordinates.`;
      }
    }
  }
}

// Attach format selection listeners
document.querySelectorAll(".format-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const fmt = btn.getAttribute("data-format");
    if (fmt && fmt !== selectedFormat) {
      selectedFormat = fmt;
      updateFormatUI();
    }
  });
});

const precisionSelect = document.getElementById("precision-select");
if (precisionSelect) {
  precisionSelect.addEventListener("change", () => updateFormatUI());
}

function parseCoordinates(coordsInput) {
  const trimmed = coordsInput.trim();
  if (!trimmed) return [];

  if (selectedFormat === "polyline") {
    const precision = getSelectedPrecision();
    try {
      const unescapedStr = trimmed.replace(/\\\\/g, "\\");
      const decodedPath = decode(unescapedStr, precision);
      if (Array.isArray(decodedPath) && decodedPath.length > 0) {
        return decodedPath.map(([lat, lng]) => ({ lat, lng }));
      }
    } catch (e) {
      console.error("Failed to decode polyline string:", e);
      alert(`Polyline Encode không hợp lệ với Precision ${precision}!`);
      return [];
    }
  } else if (selectedFormat === "json") {
    try {
      let parsed = null;
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        const jsonStyle = trimmed
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
          .replace(/'/g, '"');
        parsed = JSON.parse(jsonStyle);
      }

      if (Array.isArray(parsed)) {
        const path = [];
        for (const item of parsed) {
          if (item && typeof item === "object") {
            const lat = parseFloat(item.lat !== undefined ? item.lat : item.x);
            const lng = parseFloat(item.lng !== undefined ? item.lng : item.y);
            if (!isNaN(lat) && !isNaN(lng)) {
              path.push({ lat, lng });
            }
          }
        }
        if (path.length > 0) return path;
      }
    } catch (e) {
      console.error("Failed to parse JSON coordinates:", e);
    }
    alert('Dữ liệu JSON Array không hợp lệ! Ví dụ: [{"lat": 21.036, "lng": 105.78}]');
    return [];
  } else if (selectedFormat === "latlng") {
    const points = trimmed
      .split(/[|\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    const path = [];

    for (const p of points) {
      const parts = p.split(",");
      if (parts.length === 2) {
        const lat = parseFloat(parts[0].trim());
        const lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          path.push({ lat, lng });
        }
      }
    }
    if (path.length > 0) return path;
    alert("Dữ liệu lat,lng|lat,lng không hợp lệ!");
    return [];
  }

  return [];
}

function appendCoordinateToInput(textarea, lat, lng) {
  const val = textarea.value.trim();
  const formattedLat = parseFloat(lat.toFixed(6));
  const formattedLng = parseFloat(lng.toFixed(6));
  const formattedCoord = `${formattedLat},${formattedLng}`;

  if (selectedFormat === "latlng") {
    if (!val) {
      textarea.value = formattedCoord;
      return;
    }
    if (/[|\n]$/.test(val)) {
      textarea.value = val + formattedCoord;
    } else {
      if (val.includes("\n")) {
        textarea.value = val + "\n" + formattedCoord;
      } else {
        textarea.value = val + "|" + formattedCoord;
      }
    }
  } else if (selectedFormat === "json") {
    if (!val) {
      textarea.value = JSON.stringify(
        [{ lat: formattedLat, lng: formattedLng }],
        null,
        2
      );
      return;
    }

    try {
      let parsed = null;
      try {
        parsed = JSON.parse(val);
      } catch (e) {
        const jsonStyle = val
          .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
          .replace(/'/g, '"');
        parsed = JSON.parse(jsonStyle);
      }
      if (Array.isArray(parsed)) {
        let useXY = false;
        if (parsed.length > 0 && parsed[0]) {
          if (parsed[0].x !== undefined || parsed[0].y !== undefined) {
            useXY = true;
          }
        }
        const newItem = useXY
          ? { x: formattedLat, y: formattedLng }
          : { lat: formattedLat, lng: formattedLng };
        parsed.push(newItem);
        textarea.value = JSON.stringify(parsed, null, 2);
        return;
      }
    } catch (e) {
      // fallback
    }

    textarea.value = JSON.stringify(
      [{ lat: formattedLat, lng: formattedLng }],
      null,
      2
    );
  } else if (selectedFormat === "polyline") {
    const precision = getSelectedPrecision();
    let coords = [];
    if (val) {
      try {
        const unescapedVal = val.replace(/\\\\/g, "\\");
        const decoded = decode(unescapedVal, precision);
        if (Array.isArray(decoded)) {
          coords = decoded;
        }
      } catch (e) {
        // start new polyline
      }
    }
    coords.push([formattedLat, formattedLng]);
    textarea.value = encode(coords, precision);
  }
}

const tabDirection = document.getElementById("tab-direction");
const tabPolyline = document.getElementById("tab-polyline");
const contentDirection = document.getElementById("content-direction");
const contentPolyline = document.getElementById("content-polyline");

function switchTab(tab) {
  activeTab = tab;
  if (tab === "direction") {
    tabDirection.classList.add(
      "bg-white",
      "text-blue-600",
      "shadow-sm",
      "font-semibold",
    );
    tabDirection.classList.remove(
      "text-slate-600",
      "hover:text-slate-900",
      "font-medium",
    );

    tabPolyline.classList.remove(
      "bg-white",
      "text-blue-600",
      "shadow-sm",
      "font-semibold",
    );
    tabPolyline.classList.add(
      "text-slate-600",
      "hover:text-slate-900",
      "font-medium",
    );

    contentDirection.classList.remove("hidden");
    contentPolyline.classList.add("hidden");
  } else {
    tabPolyline.classList.add(
      "bg-white",
      "text-blue-600",
      "shadow-sm",
      "font-semibold",
    );
    tabPolyline.classList.remove(
      "text-slate-600",
      "hover:text-slate-900",
      "font-medium",
    );

    tabDirection.classList.remove(
      "bg-white",
      "text-blue-600",
      "shadow-sm",
      "font-semibold",
    );
    tabDirection.classList.add(
      "text-slate-600",
      "hover:text-slate-900",
      "font-medium",
    );

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
      const distanceVal = response.routes[0].legs[0].distance.text;
      drawTracking(polyline, startPoint, endPoint, distanceVal);

      // render route choices into #routes
      const routesDiv = document.getElementById("routes");
      routesDiv.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
          <div class="flex items-center gap-1.5">
            <span class="material-icons text-blue-600 text-base">directions</span>
            <h3 class="text-xs font-bold text-slate-900">Route Suggestions</h3>
          </div>
          <button id="close-routes" type="button" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md p-0.5 transition cursor-pointer flex items-center justify-center">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>
        <div id="routes-list" class="space-y-1.5"></div>
      `;
      routesDiv.style.display = "block";

      const routesList = document.getElementById("routes-list");
      document.getElementById("close-routes").addEventListener("click", () => {
        routesDiv.style.display = "none";
        clearMap();
      });

      response.routes.forEach((route, idx) => {
        const id = Math.random().toString(36).slice(2, 9);
        const wrapper = document.createElement("div");
        wrapper.className = "flex items-center space-x-2 py-0.5";

        const input = document.createElement("input");
        input.type = "radio";
        input.id = id;
        input.name = "route";
        input.value = idx;
        input.className =
          "w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 border-slate-300";
        if (idx === 0) input.checked = true;

        const label = document.createElement("label");
        label.htmlFor = id;
        label.className =
          "text-[11px] font-medium text-slate-700 cursor-pointer hover:text-slate-900 leading-tight";
        const summary = summarizeRoute(route);
        label.textContent =
          `${route.summary} | ${summary.totalDistanceText}, ${summary.totalDurationText}` ||
          `Route ${idx + 1}`;

        wrapper.appendChild(input);
        wrapper.appendChild(label);
        routesList.appendChild(wrapper);

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

// Point drawing listener
document
  .getElementById("btn_draw_point")
  .addEventListener("click", function () {
    const coordsInput = document.getElementById("polyline-coords").value.trim();
    if (!coordsInput) {
      alert("Vui lòng nhập danh sách toạ độ!");
      return;
    }

    const points = parseCoordinates(coordsInput);

    if (points.length < 1) {
      alert("Vui lòng nhập ít nhất 1 toạ độ hợp lệ theo kiểu dữ liệu đã chọn!");
      return;
    }

    clearMap();

    pointMarkers = points.map((point, index) => {
      const el = document.createElement("div");
      el.className = "point-circle-marker";
      el.innerHTML = String(index + 1);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([point.lng, point.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `Point ${index + 1}<br>${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`,
          ),
        )
        .addTo(map);

      return marker;
    });

    let totalDistanceM = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDistanceM += distance(
        [points[i].lng, points[i].lat],
        [points[i + 1].lng, points[i + 1].lat],
      );
    }
    const distanceText = `${(totalDistanceM / 1000).toFixed(2)} km`;

    if (points.length === 1) {
      map.setCenter([points[0].lng, points[0].lat]);
      map.setZoom(Math.max(map.getZoom(), 15));
    } else {
      const bounds = new maplibregl.LngLatBounds();
      points.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 50 });
    }

    const routesDiv = document.getElementById("routes");
    routesDiv.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
      <div class="flex items-center gap-1.5">
        <span class="material-icons text-blue-600 text-base">add_location</span>
        <h3 class="text-xs font-bold text-slate-900">Point</h3>
      </div>
      <button id="close-routes" type="button" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md p-0.5 transition cursor-pointer flex items-center justify-center">
        <span class="material-icons text-sm">close</span>
      </button>
    </div>
    <div class="grid grid-cols-2 gap-2 text-[11px]">
      <div class="flex flex-col bg-slate-50/60 p-1.5 rounded-lg border border-slate-100">
        <span class="text-slate-400 font-medium leading-none">Points</span>
        <span class="text-slate-800 font-bold mt-1">${points.length}</span>
      </div>
      <div class="flex flex-col bg-slate-50/60 p-1.5 rounded-lg border border-slate-100">
        <span class="text-slate-400 font-medium leading-none">Distance</span>
        <span class="text-blue-600 font-bold mt-1">${distanceText}</span>
      </div>
    </div>
  `;
    routesDiv.style.display = "block";

    document.getElementById("close-routes").addEventListener("click", () => {
      routesDiv.style.display = "none";
      clearMap();
    });
  });

// Polyline drawing listener
document.getElementById("btn_draw").addEventListener("click", function () {
  const coordsInput = document.getElementById("polyline-coords").value.trim();
  if (!coordsInput) {
    alert("Vui lòng nhập danh sách toạ độ!");
    return;
  }

  const path = parseCoordinates(coordsInput);

  if (path.length < 2) {
    alert("Vui lòng nhập ít nhất 2 toạ độ hợp lệ theo kiểu dữ liệu đã chọn!");
    return;
  }

  clearMap();

  const startPoint = path[0];
  const endPoint = path[path.length - 1];

  startMarker.setLngLat([startPoint.lng, startPoint.lat]).addTo(map);
  isStartAdded = true;
  endMarker.setLngLat([endPoint.lng, endPoint.lat]).addTo(map);
  isEndAdded = true;

  const coordinates = path.map((p) => [p.lng, p.lat]);

  if (map.getSource("route")) {
    map.getSource("route").setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: coordinates,
      },
    });
  } else {
    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
      },
    });
    map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#2563eb",
        "line-width": 5,
        "line-opacity": 0.8,
      },
    });
  }

  // Calculate total distance dynamically
  let totalDistanceM = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDistanceM += distance(
      [path[i].lng, path[i].lat],
      [path[i + 1].lng, path[i + 1].lat],
    );
  }
  const distanceText = `${(totalDistanceM / 1000).toFixed(2)} km`;

  const bounds = new maplibregl.LngLatBounds();
  coordinates.forEach((coord) => bounds.extend(coord));
  map.fitBounds(bounds, { padding: 50 });

  // Show details in #routes panel with close button
  const routesDiv = document.getElementById("routes");
  routesDiv.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
      <div class="flex items-center gap-1.5">
        <span class="material-icons text-emerald-600 text-base">info</span>
        <h3 class="text-xs font-bold text-slate-900">Polyline</h3>
      </div>
      <button id="close-routes" type="button" class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md p-0.5 transition cursor-pointer flex items-center justify-center">
        <span class="material-icons text-sm">close</span>
      </button>
    </div>
    <div class="grid grid-cols-2 gap-2 text-[11px]">
      <div class="flex flex-col bg-slate-50/60 p-1.5 rounded-lg border border-slate-100">
        <span class="text-slate-400 font-medium leading-none">Points</span>
        <span class="text-slate-800 font-bold mt-1">${path.length}</span>
      </div>
      <div class="flex flex-col bg-slate-50/60 p-1.5 rounded-lg border border-slate-100">
        <span class="text-slate-400 font-medium leading-none">Distance</span>
        <span class="text-emerald-600 font-bold mt-1">${distanceText}</span>
      </div>
    </div>
  `;
  routesDiv.style.display = "block";

  document.getElementById("close-routes").addEventListener("click", () => {
    routesDiv.style.display = "none";
    clearMap();
  });
});

// Map click listener
map.on("click", function (event) {
  const { lng, lat } = event.lngLat;

  if (activeTab === "direction") {
    let marker = null;
    let input = null;

    if (!isStartAdded) {
      marker = startMarker;
      input = document.getElementById("origin");
      isStartAdded = true;
    } else if (!isEndAdded) {
      marker = endMarker;
      input = document.getElementById("destination");
      isEndAdded = true;
    }

    if (marker) {
      marker.setLngLat([lng, lat]).addTo(map);
      input.value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    }
  } else if (activeTab === "polyline") {
    const textarea = document.getElementById("polyline-coords");
    appendCoordinateToInput(textarea, lat, lng);
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

  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      closeModal();
    }
  });
}
