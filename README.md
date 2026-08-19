# Map Tracking - Route & Polyline Visualizer

An interactive map application designed to visualize routes (Directions) and draw custom connected coordinates (Polylines) directly on a MapLibre GL JS map.

---

## Core Features

### 1. Route Planning & Visualization (Direction)
* **Origin & Destination Input:** Allows quick input of coordinates in `latitude,longitude` format.
* **Waypoints Support:** Supports adding intermediate points along the route by listing coordinates separated by a vertical bar `|` (e.g., `lat1,lng1|lat2,lng2`).
* **Multiple Route Suggestions:**
  * Queries the Map Service API for routing options.
  * Displays a list of suggested routes with details: total distance (km) and estimated travel duration (hours, minutes, seconds).
  * Uses radio buttons to switch between route suggestions and dynamically redraw the selected path on the map.
* **Automatic Screen Fit (Fit Bounds):** Automatically adjusts map zoom and center to display the entire route optimally.

### 2. Custom Polyline Drawing (Polyline)
* **Coordinate List Area:**
  * Supports inputting coordinates in the `lat,lng|lat,lng...` format or placing each coordinate on a new line.
  * Parses and draws a line connecting all entered coordinates.
* **Dynamic Stats Calculation:**
  * Counts the total number of points in the path.
  * Computes and displays the total path distance in kilometers (km) in real-time.

### 3. Direct Map Interactions
* **Click-to-Select Coordinates (Direction Tab):** Clicking the map automatically populates the *Origin* field (if empty) or the *Destination* field (if the origin is already set) and adds a marker.
* **Quick Marker Removal:** Click directly on an Origin or Destination marker to remove it from the map and clear its input field.
* **Clear Map State:** Clear button on the info panel resets the map, removing markers and polylines to start fresh.

### 4. Map Server Settings
* **Custom Map Service URL:** A settings modal allows users to change the base URL of the Directions API (defaults to `http://localhost:8080/`).
* **High Flexibility:** Seamlessly connect to different custom map engines and routing servers without modifying the source code.

### 5. Modern Responsive UI/UX
* **Tab-Based Interface:** Clean switching between the "Direction" and "Polyline" tools.
* **Collapsible Sidebar:** The left control panel can be collapsed/expanded to maximize the map view.
* **Loading Overlay:** Visual spinner indicating network queries to the Directions API.
* **Smart Info Panels:** Clean floating widgets and popups displaying real-time metrics.
