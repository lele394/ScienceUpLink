## **Developer Guide: How to Create a Web UI Widget**

### **1. Overview**

A **Widget** is a self-contained JavaScript module responsible for visualizing a specific type of data on the dashboard. It's the front-end counterpart to an Experiment Module. Its job is to take a raw data payload and render it as a chart, a table, a log, or any other visual element.

The system is designed to be fully modular. The main application (`main.js`) acts as a "loader" that dynamically imports and manages widgets based on the central `ui_config.json` file. To add a new visualization type, you only need to create a new widget module and update the configuration; you never need to change the loader itself.

### **2. Core Concepts**

#### **Dynamic Loading**

The `main.js` loader reads the `widgets` array from `ui_config.json`. For each entry, it looks at the `"type"` property (e.g., `"line-plot"`) and constructs a path to the corresponding JavaScript file (e.g., `./widgets/line-plot.js`). It then uses JavaScript's dynamic `import()` statement to load your module on the fly.

This means your file **must** be named to match the `type` you define in the configuration.

#### **The Widget "Contract" (The API)**

For the loader to successfully manage your widget, your JavaScript file **must** adhere to a specific structure, or "contract."

1.  **File Location:** All widget modules must be placed in the `relay_server/relay/static/widgets/` directory.
2.  **File Naming:** The filename must be `[type].js`, where `[type]` is the exact string you will use in the `ui_config.json` (e.g., `"type": "key-value"` requires a file named `key-value.js`).
3.  **Class Structure:** The file must export a single default JavaScript class.
    ```javascript
    export default class MyWidgetName {
        // ... implementation ...
    }
    ```4.  **`constructor(canvas, config)`:** The class must have a constructor that accepts two arguments, which the loader will provide:
    *   `canvas`: An HTML `<canvas>` element inside the widget's container. You can use this for chart-based widgets or ignore it for HTML-based ones.
    *   `config`: The full configuration object for this specific widget from `ui_config.json`. This is incredibly useful for accessing custom parameters, titles, and the `dataSources` array.
5.  **`update(allData)`:** The class must have an `update` method.
    *   The loader calls this method every time it fetches fresh data from the server.
    *   `allData` is always an **array** of data payloads, corresponding to the `dataSources` array in your config. If your widget has one source, you'll get an array with one element (e.g., `[ { ... } ]`). If it has two, you'll get two elements `[ { ... }, { ... } ]`. Your `update` logic must handle this array.

### **3. Widget Skeleton Template**

Use this file as the starting point for any new widget. Save it in the `relay_server/relay/static/widgets/` directory with a new name (e.g., `my-new-widget.js`).

**File:** `relay_server/relay/static/widgets/widget_skeleton.js`

```javascript
// This file defines a new widget.
// It must export a default class that follows the widget "contract".

export default class WidgetSkeleton {
    /**
     * The constructor is called once when the widget is first loaded.
     * @param {HTMLCanvasElement} canvas - The canvas element for drawing. Can be ignored.
     * @param {object} config - The full widget configuration from ui_config.json.
     */
    constructor(canvas, config) {
        // Store the canvas's parent container for adding custom HTML elements.
        this.container = canvas.parentElement;
        
        // It's good practice to clear the default canvas if you won't use it.
        canvas.remove();

        // You can access the widget's title from the config.
        console.log(`Initializing widget: ${config.title}`);

        // --- SETUP YOUR WIDGET'S INITIAL STATE AND HTML HERE ---
        // For example, create a placeholder message.
        this.container.innerHTML = `<p>Waiting for data...</p>`;
    }

    /**
     * The update method is called by the loader on every refresh interval.
     * @param {Array<object>} allData - An array of data payloads from the server.
     *                                  Each element corresponds to a dataSource.
     */
    update(allData) {
        // A safety check is always a good idea.
        if (!allData || allData.length === 0) {
            this.container.innerHTML = `<p style="color: orange;">No data received.</p>`;
            return;
        }

        // --- RENDER YOUR WIDGET USING THE NEW DATA HERE ---

        // Example for a widget with a single data source:
        const singlePayload = allData[0];
        
        // 1. Clear the previous content. This is very important!
        this.container.innerHTML = ''; 

        // 2. Create and append your new HTML elements.
        const preformattedText = document.createElement('pre');
        preformattedText.textContent = JSON.stringify(singlePayload, null, 2);
        this.container.appendChild(preformattedText);

        // For a widget with multiple data sources, you would loop through `allData`.
    }

    /**
     * Optional: The loader does not currently use this, but it's good practice
     * for future features like dynamically removing widgets.
     */
    destroy() {
        // Clean up any event listeners, timers, or other resources.
        console.log("Destroying widget.");
        this.container.innerHTML = '';
    }
}
```

### **4. Step-by-Step Example: A "Key-Value" Widget**

Let's build a new widget that displays a dictionary as a simple two-column table.

#### **Step 1: The Experiment Module**

First, create an experiment that returns data in a simple key-value format.

**File:** `experiment_client/modules/system_status.py`
```python
import random
import platform

NAME = "System Status"
DESCRIPTION = "Returns a dictionary of system properties."
VERSION = "1.0"

# Keep track of a fake request count
_request_count = 0

def handle(endpoint: dict) -> dict:
    global _request_count
    endpoint_name = endpoint.get("name")

    if endpoint_name == "get_status":
        _request_count += 1
        status_data = {
            "Node": platform.node(),
            "Platform": platform.system(),
            "Request Count": _request_count,
            "Load Average": f"{random.uniform(0.1, 2.5):.2f}",
            "Memory Free (GB)": f"{random.uniform(4.0, 16.0):.2f}"
        }
        return {"status_data": status_data}
    else:
        return {"error": f"Unknown endpoint '{endpoint_name}'"}
```

#### **Step 2: The Widget Module**

Next, create the JavaScript module that knows how to render this data.

**File:** `relay_server/relay/static/widgets/key-value.js`
```javascript
export default class KeyValueWidget {
    constructor(canvas, config) {
        this.container = canvas.parentElement;
        canvas.remove(); // We don't need the canvas for this widget.

        // Create the table structure once.
        this.table = document.createElement('table');
        this.table.style.width = '100%';
        this.container.appendChild(this.table);
    }

    update(allData) {
        // This widget only expects one data source.
        const data = allData[0];

        if (!data) {
            this.table.innerHTML = `<tr><td>No data</td></tr>`;
            return;
        }

        // 1. Clear previous table rows
        this.table.innerHTML = '';

        // 2. Create new rows from the key-value data
        for (const [key, value] of Object.entries(data)) {
            const row = this.table.insertRow();
            const keyCell = row.insertCell();
            const valueCell = row.insertCell();

            keyCell.textContent = key;
            keyCell.style.fontWeight = 'bold';
            valueCell.textContent = value;
        }
    }
}
```

#### **Step 3: Update the Configuration**

Finally, connect the experiment to the new widget in `ui_config.json`. Add this to your `widgets` array.

**File:** `relay_server/ui_config.json`
```json
      {
        "id": "widget-system-status",
        "title": "System Status",
        "type": "key-value",
        "dataSources": [
          {
            "dataKey": "status_data",
            "source": {
              "clientId": "test-client-1",
              "experiment": "system_status",
              "endpoint": { "name": "get_status" }
            }
          }
        ],
        "refreshInterval": 1500
      }
```

**Done!** After restarting the relay server and doing a hard refresh of the browser, you will see a new "System Status" widget displaying a neatly formatted table that updates every 1.5 seconds.