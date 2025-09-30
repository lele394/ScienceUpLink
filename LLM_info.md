Of course. This is an excellent idea. Creating a master "briefing document" is the best way to ensure consistent and accurate results from any LLM.

This document is written for a Large Language Model. It is explicit, structured, and provides complete, self-contained examples and templates.

---

## **LLM Briefing Document: Platform for Modular Monitoring**

### **1. System Overview**

You are an expert developer for a modular monitoring platform. The platform has three main components:

1.  **The Relay Server:** A central Python server that acts as a message broker and serves the web UI. You will not modify this.
2.  **The Experiment Client:** A remote Python agent that runs on monitored machines. It executes tasks defined by **Experiment Modules**.
3.  **The Web UI:** A dynamic web dashboard that is built from a JSON configuration file. The visual components are called **Widgets**.

Your primary task is to generate three types of files:
*   **Experiment Modules (.py):** Python files that define what data a client can provide.
*   **Web UI Widgets (.js):** JavaScript modules that define how to visualize data.
*   **Dashboards (.json):** JSON files that define the layout and data sources for a dashboard.

**Key Constraint:** The Experiment Client runs with a standard Python installation **only**. No external libraries (`pip`, `psutil`, etc.) are available. All code in Experiment Modules must use the Python standard library.

---

### **2. How to Create an Experiment Module (`.py`)**

An Experiment Module is a Python file that provides data.

#### **2.1. File Location**

All Experiment Module files **MUST** be placed in the `experiment_client/modules/` directory. The filename is the module's identifier (e.g., `cpu_monitor.py`).

#### **2.2. Core Contract**

*   The file **MUST** contain a function with the exact signature: `handle(endpoint: dict) -> dict`. This is the single entry point.
*   The `handle` function **MUST** return a JSON-serializable Python dictionary.

#### **2.3. The `handle` Function in Detail**

*   **`endpoint` (Argument):** A dictionary passed from the Relay. It contains the specifics of the data request.
    *   `endpoint['name']`: A string that specifies which action to perform within the module. You **MUST** use this to route logic (e.g., via an `if/elif/else` block).
    *   Other keys are parameters from the dashboard configuration (e.g., `endpoint['points']`). **All parameter values will be strings** and must be cast to the correct type (e.g., `int()`).
*   **Return Value (dict):** The data payload for the widget.
    *   The keys of this dictionary are critical. They are used by the corresponding widget to extract the data. For example, if you return `{'points': [...]}` the widget must be configured to look for the `points` key.
    *   If an error occurs, you **MUST** return a dictionary containing an `"error"` key, for example: `{'error': 'Invalid parameter specified.'}`.

#### **2.4. Experiment Module Skeleton**

Use this skeleton as the starting point for all new Experiment Modules.

```python
# experiment_client/modules/module_skeleton.py

# Import any required Python standard libraries
import random
import time

# --- Optional Module Metadata ---
NAME = "Module Skeleton"
DESCRIPTION = "A template for creating new experiment modules."
VERSION = "1.0"

# --- Required `handle` Function ---
def handle(endpoint: dict) -> dict:
    """
    Processes a command and returns a data payload.
    """
    endpoint_name = endpoint.get("name")

    if endpoint_name == "get_some_data":
        return _handle_get_some_data(endpoint)
    elif endpoint_name == "get_other_data":
        return _handle_get_other_data(endpoint)
    else:
        # If the endpoint name is unknown, ALWAYS return an error payload.
        return {"error": f"Unknown endpoint '{endpoint_name}' in module '{NAME}'"}

# --- Private Helper Functions for Each Endpoint ---

def _handle_get_some_data(endpoint: dict) -> dict:
    """Generates some data."""
    try:
        # Parameters from the UI arrive as strings. ALWAYS cast them safely.
        count = int(endpoint.get("count", 5))
    except (ValueError, TypeError):
        return {"error": "Invalid 'count' parameter. Must be an integer."}

    data_list = [random.random() for _ in range(count)]
    
    # The key "my_data" is the data payload key.
    return {"my_data": data_list}

def _handle_get_other_data(endpoint: dict) -> dict:
    """Generates some other data."""
    return {"info": "This is another endpoint.", "timestamp": time.time()}

```

---

### **3. How to Create a Web UI Widget (`.js`)**

A Widget is a JavaScript module that visualizes data.

#### **3.1. File Location**

All Widget module files **MUST** be placed in the `relay_server/relay/static/widgets/` directory.

#### **3.2. Core Contract**

*   The filename **MUST** be `[type].js`, where `[type]` is the identifier used in the dashboard JSON (e.g., a `"type": "key-value"` requires a `key-value.js` file).
*   The file **MUST** `export default class ...`.
*   The class **MUST** have a `constructor(canvas, config)`.
*   The class **MUST** have an `update(allData)` method.
*   The class can optionally provide its own styles via a `static css` property.

#### **3.3. The Widget Class in Detail**

*   **`static css` (Optional Property):** A multi-line string (using backticks `` ` ``) containing all CSS rules required by the widget. The loader will automatically and idempotently inject this into the page.
*   **`constructor(canvas, config)`:** Called once when the widget is created.
    *   `canvas`: The `<canvas>` element provided for chart-based widgets. If your widget is HTML-based, you **MUST** get its parent container (`canvas.parentElement`) and then remove the canvas (`canvas.remove()`).
    *   `config`: The full widget configuration object from the dashboard JSON. Use this to get titles, parameters, and the `dataSources` array for setup.
*   **`update(allData)`:** Called on every data refresh.
    *   `allData`: This is **ALWAYS an array** of data payloads.
        *   If the widget has one data source, `allData` will be an array with one element (e.g., `[ {'points': ...} ]`). You must access it via `allData`.
        *   If the widget has multiple sources, `allData` will contain multiple elements, in the same order as the `dataSources` array in the config.

#### **3.4. Widget Skeleton**

Use this skeleton as the starting point for all new Widgets.

```javascript
// relay_server/relay/static/widgets/widget_skeleton.js

export default class WidgetSkeleton {
    // Optional: Define all CSS rules needed for this widget here.
    static css = `
        .skeleton-container {
            padding: 10px;
            font-family: monospace;
            color: #333;
        }
        .skeleton-item {
            border-bottom: 1px dotted #ccc;
        }
    `;

    /**
     * The constructor is called once when the widget is first loaded.
     */
    constructor(canvas, config) {
        // For HTML-based widgets, get the parent and remove the canvas.
        this.container = canvas.parentElement;
        canvas.remove();

        // Perform initial one-time setup of the widget's HTML structure.
        this.container.innerHTML = `<div class="skeleton-container">Waiting for data...</div>`;
        this.dataContainer = this.container.querySelector('.skeleton-container');
    }

    /**
     * The update method is called by the loader on every refresh interval.
     * @param {Array<object>} allData - An array of data payloads.
     */
    update(allData) {
        // The loader always sends an array. Access the first payload for single-source widgets.
        const payload = allData;

        if (!payload) {
            this.dataContainer.textContent = 'No data received.';
            return;
        }
        
        // Always clear previous content before rendering new data.
        this.dataContainer.innerHTML = ''; 

        // Build and render the new view.
        for (const [key, value] of Object.entries(payload)) {
            const item = document.createElement('div');
            item.className = 'skeleton-item';
            item.textContent = `${key}: ${JSON.stringify(value)}`;
            this.dataContainer.appendChild(item);
        }
    }

    /**
     * Optional: Cleanup logic.
     */
    destroy() {
        // Destroy any charts, timers, or event listeners.
        this.container.innerHTML = '';
    }
}
```

---

### **4. How to Create a Dashboard (`.json`)**

A Dashboard is a JSON file that defines the entire UI layout.

#### **4.1. File Location**

All Dashboard files **MUST** be placed in the `relay_server/dashboards/` directory.

#### **4.2. Core Schema**

*   The file **MUST** be a valid JSON object.
*   The root object **MUST** contain:
    *   `"dashboard_name"`: A user-friendly string that appears in the dashboard selection dropdown.
    *   `"dashboard"`: An object containing the dashboard's structure.
*   The `"dashboard"` object **MUST** contain:
    *   `"title"`: A string displayed as the main title of the page.
    *   `"widgets"`: An array of widget configuration objects.
*   Each **widget object** in the array **MUST** contain:
    *   `"id"`: A unique string identifier for the widget (e.g., `"widget-cpu-load"`).
    *   `"title"`: The string displayed at the top of the widget.
    *   `"type"`: The identifier of the widget module to load (e.g., `"key-value"`). This **MUST** match a `[type].js` file in the `widgets/` directory.
    *   `"dataSources"`: An array of data source objects.
    *   `"refreshInterval"`: An integer number of milliseconds for the refresh rate.
*   Each **data source object** in the `dataSources` array **MUST** contain:
    *   `"dataKey"`: The string key to extract from the Experiment Module's returned dictionary (e.g., `"points"`, `"status_data"`).
    *   `"source"`: An object defining the data endpoint.
    *   `"label"` (optional): A string for the chart legend.
    *   `"color"` (optional): A string (hex or `rgb()`) for the chart color.
*   The `"source"` object **MUST** contain:
    *   `"clientId"`: The ID of the client to send the command to.
    *   `"experiment"`: The filename of the Experiment Module (without `.py`).
    *   `"endpoint"`: An object of key-value string pairs to be passed to the `handle` function. It **MUST** include a `"name"` key.

#### **4.3. Dashboard Skeleton**

```json
{
  "dashboard_name": "My Custom Dashboard",
  "dashboard": {
    "title": "Monitoring Dashboard for Custom Tasks",
    "widgets": [
      {
        "id": "widget-unique-id-1",
        "title": "My First Widget",
        "type": "widget-file-name",
        "refreshInterval": 2000,
        "dataSources": [
          {
            "label": "Dataset A",
            "color": "#FF6384",
            "dataKey": "key_from_python_module",
            "source": {
              "clientId": "test-client-1",
              "experiment": "python_module_name",
              "endpoint": {
                "name": "endpoint_name_in_handle",
                "param1": "value1"
              }
            }
          }
        ]
      }
    ]
  }
}
```

### **5. End-to-End Example: `system_status`**

This example shows how all three files work together.

**1. The Experiment Module (`system_status.py`)**
*   Returns a dictionary with a key `"status_data"`.

```python
# experiment_client/modules/system_status.py
import platform

def handle(endpoint: dict) -> dict:
    if endpoint.get("name") == "get_status":
        status_data = { "Node": platform.node(), "Platform": platform.system() }
        return {"status_data": status_data}
    return {"error": "Unknown endpoint"}
```

**2. The Widget (`key-value.js`)**
*   Named `key-value.js` to match the `"type"` in the dashboard.
*   Renders a dictionary into an HTML table.

```javascript
// relay_server/relay/static/widgets/key-value.js
export default class KeyValueWidget {
    constructor(canvas, config) {
        this.container = canvas.parentElement;
        canvas.remove();
        this.table = document.createElement('table');
        this.table.style.width = '100%';
        this.container.appendChild(this.table);
    }
    update(allData) {
        const data = allData; // Access the first (and only) payload
        this.table.innerHTML = '';
        if (!data) return;
        for (const [key, value] of Object.entries(data)) {
            const row = this.table.insertRow();
            row.insertCell().textContent = key;
            row.insertCell().textContent = value;
        }
    }
}
```

**3. The Dashboard (`my_dashboard.json`)**
*   Connects the two. `"type": "key-value"` loads the JS widget. The `dataSource` points to the Python module and specifies the correct `"dataKey": "status_data"`.

```json
{
  "dashboard_name": "System Status Dashboard",
  "dashboard": {
    "title": "Live System Status",
    "widgets": [
      {
        "id": "widget-system-status",
        "title": "Client Machine Status",
        "type": "key-value",
        "refreshInterval": 5000,
        "dataSources": [
          {
            "dataKey": "status_data",
            "source": {
              "clientId": "test-client-1",
              "experiment": "system_status",
              "endpoint": { "name": "get_status" }
            }
          }
        ]
      }
    ]
  }
}
```