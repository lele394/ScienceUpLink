// A map to hold the live instances of our widget classes
let widgetInstances = {};
let activeTimers = [];

// --- Main Application Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    const selector = document.getElementById('dashboard-selector');
    
    // 1. Populate the dropdown with available dashboards
    const dashboards = await populateDropdown(selector);
    if (dashboards.length === 0) {
        document.getElementById('dashboard-title').innerText = "No dashboards found.";
        return;
    }
    
    // 2. Determine which dashboard to load initially
    const urlParams = new URLSearchParams(window.location.search);
    const requestedDashboard = urlParams.get('dashboard');
    const initialDashboard = dashboards.find(d => d.filename === requestedDashboard) || dashboards[0];
    
    // 3. Set the dropdown to the correct initial value and load it
    selector.value = initialDashboard.filename;
    loadDashboard(initialDashboard.filename);

    // 4. Add event listener for future changes
    selector.addEventListener('change', (event) => {
        const selectedFile = event.target.value;
        // Update URL for shareability without reloading the page
        const newUrl = `${window.location.pathname}?dashboard=${selectedFile}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        loadDashboard(selectedFile);
    });
}

async function populateDropdown(selector) {
    try {
        const response = await fetch('/dashboards/list');
        const dashboards = await response.json();
        selector.innerHTML = '';
        dashboards.forEach(db => {
            const option = document.createElement('option');
            option.value = db.filename;
            option.textContent = db.name;
            selector.appendChild(option);
        });
        return dashboards;
    } catch (error) {
        console.error("Failed to fetch dashboard list:", error);
        return [];
    }
}

async function loadDashboard(filename) {
    // --- PRE-LOAD CLEANUP ---
    // 1. Clear all active refresh timers from the previous dashboard
    activeTimers.forEach(timer => clearInterval(timer));
    activeTimers = [];
    
    // 2. Destroy old Chart.js instances to prevent memory leaks
    Object.values(widgetInstances).forEach(widget => {
        if (widget && typeof widget.destroy === 'function') {
            widget.destroy();
        }
    });
    widgetInstances = {};

    // 3. Clear the HTML container
    document.getElementById('widget-container').innerHTML = '<h2>Loading Dashboard...</h2>';
    
    try {
        const response = await fetch(`/dashboards/config?name=${filename}`);
        const config = await response.json();
        
        document.getElementById('dashboard-title').innerText = config.dashboard.title;
        const container = document.getElementById('widget-container');
        container.innerHTML = '';

        for (const widgetConfig of config.dashboard.widgets) {
            await initializeWidget(container, widgetConfig);
        }
    } catch (error) {
        console.error(`Failed to load dashboard ${filename}:`, error);
        document.getElementById('widget-container').innerHTML = `<h2 style="color: red;">Error loading dashboard.</h2>`;
    }
}

function initializeWidget(container, config) {
    // Create the widget's main container div
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'widget';
    widgetDiv.id = config.id; // It's also good practice to add the ID here

    // --- THIS IS THE MISSING LINE THAT FIXES EVERYTHING ---
    // This creates the title, the content area, and the canvas INSIDE the widget div.
    widgetDiv.innerHTML = `<h2>${config.title}</h2><div class="content"><canvas></canvas></div>`;
    // --- END OF FIX ---

    // Now, add the fully constructed widget to the page
    container.appendChild(widgetDiv);

    // The rest of the function can now proceed, because the necessary elements exist
    return import(`./widgets/${config.type}.js`)
        .then(({ default: WidgetClass }) => {
            // CSS injection logic can go here (as it was before)
            if (WidgetClass.css) {
                const styleId = `widget-style-${config.type}`;
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = WidgetClass.css;
                    document.head.appendChild(style);
                }
            }

            // This will now successfully find the canvas
            const canvas = widgetDiv.querySelector('canvas');
            widgetInstances[config.id] = new WidgetClass(canvas, config);
            
            fetchAndUpdateWidget(config); // Initial fetch
            const timer = setInterval(() => fetchAndUpdateWidget(config), config.refreshInterval);
            activeTimers.push(timer); // Store timer for cleanup
        })
        .catch(error => {
            console.error(`Failed to load module for widget type "${config.type}":`, error);
            // This will now successfully find the content div to display the error
            const contentDiv = widgetDiv.querySelector('.content');
            if(contentDiv) {
                contentDiv.innerHTML = `<p style="color: red;">Error: Could not load widget type '${config.type}'.</p>`;
            }
        });
}

async function fetchAndUpdateWidget(config) {
    // 1. Create an array of fetch promises, one for each data source
    const promises = config.dataSources.map(ds => {
        const endpointParams = new URLSearchParams(ds.source.endpoint).toString();
        const url = `/data?client_id=${ds.source.clientId}&experiment=${ds.source.experiment}&${endpointParams}`;
        return fetch(url).then(res => {
            if (!res.ok) throw new Error(`Server error for ${ds.label || config.id}: ${res.status}`);
            return res.json();
        });
    });

    try {
        // 2. Execute all fetch requests in parallel and wait for them all to complete
        const allData = await Promise.all(promises);

        const widget = widgetInstances[config.id];
        if (widget) {
            // 3. Create the payload for the widget's update method
            const updatePayload = allData.map((data, index) => {
                const dataSourceConfig = config.dataSources[index];
                const dataKey = dataSourceConfig.dataKey;
                
                if (data.error) throw new Error(`Client error for ${dataSourceConfig.label}: ${data.error}`);
                if (data[dataKey] === undefined) throw new Error(`Data key "${dataKey}" not found in response.`);

                return data[dataKey];
            });

            // 4. Pass the array of data results to the widget
            widget.update(updatePayload);
        }
    } catch (error) {
        console.error(`Failed to update widget ${config.id}:`, error.message);
    }
}