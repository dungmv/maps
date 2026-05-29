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
  startMarker.remove(null);
  startMarker.remove(null);
  if (polylineTracking) polylineTracking.remove(null);
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

map.on("click", function (event) {
  const { lat, lng } = event.latlng;
  let marker = null;
  let input = null;
  if (!startMarker._map) {
    marker = startMarker;
    input = document.getElementById("origin");
  } else if (!endMarker.map) {
    marker = endMarker;
    input = document.getElementById("destination");
  }

  if (marker) {
    marker.map = map;
    marker.position = event.latlng;
    input.value = `${lat},${lng}`;
    marker.on("click", function () {
      marker.map = null; // Remove marker when clicked
      input.value = ""; // Clear the input field
    });
  }
});
