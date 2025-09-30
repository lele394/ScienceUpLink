## **Platform Architecture: A General Presentation**

### **1. High-Level Analogy: A Control Tower and Remote Agents**

At its core, the platform operates like an airport's **Air Traffic Control Tower** system:

*   **The Relay Server is the Control Tower:** It is the central, known hub. It doesn't perform the main work itself, but it knows about all the agents, communicates with them, and provides an interface for operators to issue commands.
*   **The Experiment Clients are the Airplanes (or Remote Agents):** They are the workers out in the field. Each client is a self-contained agent running on a remote machine. It establishes a persistent communication link with the Control Tower and waits for instructions.
*   **The Web UI is the Operator's Console:** This is the interactive dashboard used by a person (the "air traffic controller") to see the status of all agents and to dispatch specific commands to them.

The entire system is designed to provide centralized command, control, and visualization for a fleet of distributed, independent agents.

### **2. Core Design Philosophy**

The architecture is built on a few key principles:

*   **Zero External Dependencies:** The entire system relies **only on Python's standard library**. This makes deployment incredibly simple and robust. There is no need for `pip` or package managers on the client machines, eliminating a major source of potential issues.
*   **Extreme Modularity:** The system is designed to be extended without modifying its core components. Adding new client capabilities (Experiments) or new dashboard visualizations (Widgets) is achieved by simply adding new, independent files.
*   **Clear Separation of Concerns:** Each component has one job and does it well.
    *   The **Client** only runs experiments and returns data. It knows nothing about how the data is displayed.
    *   The **Relay** only routes messages and serves the UI. It knows nothing about the internal logic of the experiments.
    *   The **Web UI** only renders data based on a configuration. It knows nothing about the TCP communication.
*   **Configuration-Driven UI:** The dashboard is not hardcoded. Its entire layout, including which widgets to display, what data they need, and where to get it, is defined in a single, simple JSON configuration file (`ui_config.json`).

### **3. The Three Main Components**

#### **A. The Relay Server (The Central Hub)**

The Relay Server is the heart of the system. It has two "faces":

1.  **The User-Facing Side (HTTP Server):** This is a standard web server that:
    *   Serves the main `index.html` dashboard and its associated JavaScript and CSS files.
    *   Provides a simple REST-like API for the Web UI. The most important endpoints are:
        *   `/ui/config`: Provides the `ui_config.json` file that acts as the blueprint for the entire dashboard.
        *   `/data`: Acts as a generic data proxy. The Web UI sends requests here, and the Relay translates them into TCP commands for the appropriate client.

2.  **The Client-Facing Side (TCP Control Server):** This is a multi-threaded TCP server that:
    *   Listens for and accepts persistent connections from Experiment Clients.
    *   Maintains a **Client Registry**, keeping track of every connected client and its unique ID.
    *   Receives data requests from the HTTP side, wraps them in a length-prefixed JSON format, and sends them down the correct client's TCP socket.
    *   Receives JSON responses back from the clients, correlates them to the original request, and passes the result back to the HTTP side.

#### **B. The Experiment Client (The Remote Worker)**

The Experiment Client is a lightweight, long-running Python script deployed on each remote machine (e.g., a cluster node, a Raspberry Pi). Its lifecycle is simple:

1.  **Connect:** On startup, it connects to the Relay Server's TCP port and sends a "hello" message to register itself with a unique `client_id`. If the connection fails, it automatically retries.
2.  **Listen:** It enters an infinite loop, waiting for framed JSON commands to arrive over the TCP socket.
3.  **Execute:** When a command arrives, it:
    *   Looks at the `experiment` name specified in the command (e.g., `"line_trig"`).
    *   Dynamically loads the corresponding Python module (e.g., `line_trig.py`) from its local `modules/` directory using Python's `importlib`.
    *   Calls the mandatory `handle(endpoint)` function within that module.
    *   Captures the dictionary returned by the `handle` function.
4.  **Respond:** It wraps the result in a JSON response object, including the original request ID, and sends it back to the Relay over the same TCP socket.

#### **C. The Web UI (The Dynamic Dashboard)**

The user's web browser is the final component. It is designed to be a "thin" client that builds itself dynamically.

1.  **Bootstrap:** When the page loads, the primary `main.js` script first fetches the `/ui/config` file from the Relay.
2.  **Build Widgets:** It parses the JSON configuration and, for each widget entry, it:
    *   Creates a placeholder `div` in the HTML.
    *   Dynamically imports the widget's corresponding JavaScript module from the `/widgets/` directory (e.g., `line-plot.js`).
    *   Instantiates the widget's class, which handles the creation of a chart or table.
3.  **Poll for Data:** For each widget, it starts a timer (`setInterval`). On each tick, it:
    *   Looks at the widget's `dataSources` configuration.
    *   Makes one or more `fetch` requests to the Relay's generic `/data` endpoint.
    *   When the data arrives, it calls the `update()` method of the corresponding widget instance.
    *   The widget's `update()` method then re-renders the chart or table with the new data.

### **4. The Flow of Data: A Complete Walkthrough**

Let's trace a single data refresh for the "Combined Sine & Cosine Line" widget:

1.  **Browser:** A timer fires in the user's browser. The `main.js` loader sees that this widget needs two data sources (`get_cos_line` and `get_sin_line`).
2.  **Browser -> Relay (HTTP):** The browser sends two parallel HTTP `GET` requests to the Relay Server:
    *   `GET /data?client_id=test-client-1&experiment=line_trig&name=get_cos_line...`
    *   `GET /data?client_id=test-client-1&experiment=line_trig&name=get_sin_line...`
3.  **Relay (HTTP -> TCP):** The Relay's HTTP server receives these requests. For each one, it creates a JSON command object and passes it to its internal Dispatcher.
4.  **Relay -> Client (TCP):** The Dispatcher looks up `test-client-1` in its registry, finds the correct TCP socket, and sends two length-prefixed JSON commands down the stream.
5.  **Client:** The Experiment Client receives the two commands. For each one:
    *   It dynamically loads `line_trig.py`.
    *   It calls `handle()` with the appropriate `endpoint` dictionary.
    *   The `line_trig.py` module generates the sorted list of points.
    *   The client sends two JSON responses back up the TCP stream to the Relay.
6.  **Relay (TCP -> HTTP):** The Relay's TCP handler receives the responses. The Dispatcher correlates them with the waiting HTTP requests and releases the data.
7.  **Relay -> Browser (HTTP):** The Relay Server sends two HTTP responses back to the browser, each containing a JSON payload with the requested line points.
8.  **Browser:** The `Promise.all()` in `main.js` resolves. The loader calls the `update()` method of the `LinePlotWidget` instance, passing it an array containing both the cosine and sine data. The widget updates the Chart.js instance, and the user sees the refreshed lines on their screen.

This entire loop repeats every few seconds, providing a near-real-time view of the remote client's data.

### **5. Visual Architecture Diagram**

```
                  +-------------------------------------------------+
                  |                   USER'S BROWSER                |
                  |                                                 |
                  |  +------------------+      +------------------+ |
                  |  | main.js (Loader) |----->| widgets/*.js     | |
                  |  +------------------+      +------------------+ |
                  |         ^                                       |
                  |         | HTTP/S (Data & UI Config)             |
+-------------------------------------------------------------------------------------+
|                 |                                                 |                 |
|                 v                                                 v                 |
|       +----------------------------------------------------------------------+      |
|       |                           RELAY SERVER                               |      |
|       |                                                                      |      |
|       |  +------------------------+        +-----------------------------+   |      |
|       |  |   HTTP Server          |        |     TCP Control Server      |   |      |
|       |  | - Serves static files  |<------>| - Manages Client Registry   |   |      |
|       |  | - Handles /data proxy  |        | - Dispatches Commands       |   |      |
|       |  | - Serves /ui/config    |        | - Receives Responses        |   |      |
|       |  +------------------------+        +-----------------------------+   |      |
|       +----------------------------------------------------------------------+      |
|                                       ^                                             |
|                                       | Persistent, Framed JSON over TCP            |
|                                       v                                             |
|       +----------------------------------------------------------------------+      |
|       |                         EXPERIMENT CLIENT                            |      |
|       |                                                                      |      |
|       |  +------------------------+        +-----------------------------+   |      |
|       |  |   Connector            |<------>|      Module Executor        |   |      |
|       |  | - Connects to Relay    |        | - Dynamically loads modules |   |      |
|       |  | - Sends/Receives Frames|        | - Calls handle(endpoint)    |   |      |
|       |  +------------------------+        +-----------------------------+   |      |
|       |                                                |                     |      |
|       |                                                v                     |      |
|       |                                      +---------------------+         |      |
|       |                                      |  modules/*.py       |         |      |
|       |                                      +---------------------+         |      |
|       +----------------------------------------------------------------------+      |
|                                                                                     |
+-------------------------------------------------------------------------------------+
```