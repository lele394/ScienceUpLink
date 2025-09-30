## **Developer Guide: How to Create an Experiment Module**

### **1. Overview**

An **Experiment Module** is the fundamental unit of work on the client side. It is a simple Python file that acts as a data provider. Its primary purpose is to receive a command from the Relay Server, perform some action (like generating data, reading a sensor, or running a calculation), and return a data payload.

These modules are loaded dynamically by the client, meaning you can add new functionality without ever restarting the main client process.

### **2. Core Concepts**

#### **The `handle(endpoint)` Function**

Every valid experiment module **must** contain a function with the following signature:

```python
def handle(endpoint: dict) -> dict:
```

*   This is the **single entry point** for all requests to your module.
*   The client's executor will call this function whenever the Relay Server sends a command destined for your module.

#### **The `endpoint` Argument**

The `endpoint` argument is a Python dictionary that contains the specifics of the command sent from the Web UI. It will always contain a `name` key, which you will use to decide what action to perform.

**Example:** If the `ui_config.json` sends a request for a `get_cos_line`, the `endpoint` dictionary passed to your `handle` function will look like this:

```python
# endpoint dictionary received by handle()
{
    "name": "get_cos_line",
    "points": "200" # Note: All parameters from the URL are initially strings
}
```

You should use an `if/elif/else` block on `endpoint.get("name")` to route the request to the correct logic within your module.

#### **The Return Value**

The `handle` function **must** return a Python dictionary that can be serialized to JSON. This dictionary is the raw data payload that will be sent back to the Web UI widget.

The keys you define in this return dictionary are what the widget's JavaScript will use.

**Example:** If your function returns:
```python
return {"points": [{"x": 0, "y": 1}, {"x": 1, "y": 0.5}]}
```
Then the corresponding widget in `ui_config.json` must specify `"dataKey": "points"` so the loader knows which piece of the payload to pass to the widget's `update()` method.

### **3. Module Skeleton Template**

Here is a well-commented skeleton file. Use this as the starting point for any new experiment module. Save it in the `experiment_client/modules/` directory with a descriptive name (e.g., `my_awesome_module.py`).

**File:** `experiment_client/modules/module_skeleton.py`

```python
# Import any standard Python libraries you need.
# Remember: No external 'pip' packages are available.
import random
import time

# --- Optional Module Metadata ---
# These are not required but are good practice for future features.
NAME = "Module Skeleton"
DESCRIPTION = "A template for creating new experiment modules."
VERSION = "1.0"

# --- Required `handle` Function ---
# This is the single entry point for all requests to this module.
def handle(endpoint: dict) -> dict:
    """
    Processes a command and returns a data payload.

    Args:
        endpoint (dict): A dictionary specifying the command.
                         Example: {"name": "endpoint_name", "param1": "value1"}

    Returns:
        dict: A JSON-serializable dictionary containing the data payload or an error.
    """
    # Get the name of the command to execute. Use .get() for safety.
    endpoint_name = endpoint.get("name")
    print(f"Module '{NAME}' received command: {endpoint_name}")

    # --- Endpoint Routing ---
    # Use an if/elif/else block to handle different endpoint names.

    if endpoint_name == "get_random_data":
        # It's good practice to wrap logic in its own function.
        return _handle_get_random_data(endpoint)

    elif endpoint_name == "get_time_data":
        return _handle_get_time_data(endpoint)
        
    else:
        # If the endpoint name is unknown, return a clear error message.
        # The Web UI can be designed to display these errors.
        return {"error": f"Unknown endpoint '{endpoint_name}' in module '{NAME}'"}

# --- Private Helper Functions for Each Endpoint ---
# This keeps the `handle` function clean and easy to read.

def _handle_get_random_data(endpoint: dict) -> dict:
    """Generates a list of random numbers."""
    try:
        # Parameters from the UI arrive as strings. Always cast them to the correct type.
        count = int(endpoint.get("count", 10))
    except (ValueError, TypeError):
        return {"error": "Invalid 'count' parameter. Must be an integer."}

    random_numbers = [random.random() for _ in range(count)]
    
    # This is the data payload. The key 'random_values' must match the widget's 'dataKey'.
    return {"random_values": random_numbers}


def _handle_get_time_data(endpoint: dict) -> dict:
    """Returns the current server time."""
    
    current_time = time.time()
    iso_format_time = time.ctime(current_time)
    
    # The payload can have multiple keys.
    return {
        "timestamp": current_time,
        "iso_8601": iso_format_time
    }

```

### **4. Step-by-Step Example: A CPU Load Simulator**

Let's create a new module that simulates a CPU load sensor.

**Step 1: Create the file**

Create a new file named `cpu_monitor.py` inside the `experiment_client/modules/` directory.

**Step 2: Write the module code**

Copy the skeleton and adapt it. Our module will have one endpoint, `get_load_history`, which returns a list of time-value pairs.

**File:** `experiment_client/modules/cpu_monitor.py`
```python
import time
import random

NAME = "CPU Monitor"
DESCRIPTION = "Simulates CPU load readings over time."
VERSION = "0.1"

def handle(endpoint: dict) -> dict:
    endpoint_name = endpoint.get("name")

    if endpoint_name == "get_load_history":
        return _get_load_history(endpoint)
    else:
        return {"error": f"Unknown endpoint '{endpoint_name}' in module '{NAME}'"}

def _get_load_history(endpoint: dict) -> dict:
    """Generates a fake time-series of CPU load data."""
    try:
        num_points = int(endpoint.get("points", 60)) # Default to 60 points
    except (ValueError, TypeError):
        return {"error": "Invalid 'points' parameter. Must be an integer."}

    readings = []
    current_time = time.time()
    
    # Generate points backward in time from now
    for i in range(num_points):
        # Simulate load: mostly low, with occasional spikes
        load = random.uniform(0.05, 0.2)
        if random.random() > 0.9:
            load = random.uniform(0.7, 0.95)
            
        timestamp = current_time - (num_points - i - 1)
        
        # Use 'x' and 'y' to be compatible with line/scatter plots
        readings.append({"x": timestamp, "y": load})

    return {"points": readings}
```

**Step 3: Connect it to the UI**

Now, add a new widget to `relay_server/ui_config.json` to visualize this data using our existing `line-plot` widget.

```json
      {
        "id": "widget-cpu-load",
        "title": "Simulated CPU Load",
        "type": "line-plot",
        "dataSources": [
          {
            "label": "CPU %",
            "color": "rgb(255, 159, 64)",
            "dataKey": "points",
            "source": {
              "clientId": "test-client-1",
              "experiment": "cpu_monitor",
              "endpoint": {
                "name": "get_load_history",
                "points": "120"
              }
            }
          }
        ],
        "refreshInterval": 2000
      }
```
**Done!** After restarting the relay server, a new orange line chart showing the simulated CPU load will appear on your dashboard.

### **5. Best Practices Checklist**

-   [ ] **One Module, One Responsibility:** A module should focus on a single domain (e.g., monitoring temperature, controlling a motor).
-   [ ] **Safe Parameter Handling:** Always use `.get("key", default_value)` to access endpoint parameters and wrap type conversions (`int()`, `float()`) in `try...except` blocks.
-   [ ] **Provide Error Payloads:** If something goes wrong, return a dictionary with an `"error"` key. Your front-end can be designed to display these messages in the widget.
-   [ ] **Keep it Stateless:** Modules should not store information between calls. Every `handle()` call should be independent. This makes the system more robust.
-   [ ] **Use Helper Functions:** Keep the main `handle()` function clean by delegating the actual work to private helper functions (e.g., `_get_load_history`).