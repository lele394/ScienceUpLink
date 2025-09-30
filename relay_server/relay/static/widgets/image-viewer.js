export default class ImageViewerWidget {
    // We don't need to define static css because the widget is simple.
    // However, we still need to fulfill the contract for the data key.
    // The widget sends a request when the button is pressed, NOT on a timer.
    // We still define a dataKey that is used when data eventually arrives.
    // For this interactive widget, the loader's update cycle is manually triggered.
    static dataKey = 'b64_image';

    constructor(canvas, config) {
        this.container = canvas.parentElement;
        canvas.remove();
        this.config = config; // Store config for later use in fetching data
        
        this.container.innerHTML = `
            <div style="padding: 10px;">
                <p><strong>Client:</strong> ${config.dataSources[0].source.clientId}</p>
                <input type="text" id="image-path-${config.id}" placeholder="Enter image path on client..." 
                       style="width: 70%; padding: 5px; margin-right: 10px;">
                <button id="image-query-btn-${config.id}" style="padding: 5px 10px;">Load Image</button>
                <hr style="margin-top: 10px;">
                <div id="image-display-${config.id}">
                    <p>No image loaded.</p>
                </div>
            </div>
        `;

        this.inputField = this.container.querySelector(`#image-path-${config.id}`);
        this.displayArea = this.container.querySelector(`#image-display-${config.id}`);
        this.queryButton = this.container.querySelector(`#image-query-btn-${config.id}`);

        // Set up the event listener for the button click
        this.queryButton.addEventListener('click', this.requestImage.bind(this));
        
        // Disable the automatic polling timer for this widget
        // We will manually trigger the request.
        this.originalInterval = config.refreshInterval;
    }

    // This method is called manually by the button click
    async requestImage() {
        const path = this.inputField.value.trim();
        if (!path) {
            this.displayArea.innerHTML = '<p style="color: red;">Please enter a file path.</p>';
            return;
        }

        // Disable button to prevent double-click
        this.queryButton.disabled = true;
        this.queryButton.textContent = 'Loading...';
        this.displayArea.innerHTML = '<p>Requesting image...</p>';

        // 1. Construct the URL based on the stored config and the user's path
        const ds = this.config.dataSources[0];
        const endpointParams = new URLSearchParams(ds.source.endpoint);
        endpointParams.set('path', path); // Add the user-specified path to the endpoint
        endpointParams.set('name', 'read_image'); // Ensure the endpoint name is correct
        
        const url = `/data?client_id=${ds.source.clientId}&experiment=${ds.source.experiment}&${endpointParams.toString()}`;

        try {
            // 2. Send the request to the relay
            const response = await fetch(url);
            const data = await response.json();

            // 3. Process and display the response
            this.update([data]); // Manually call update, passing data as an array

        } catch (error) {
            this.displayArea.innerHTML = `<p style="color: red;">Network Error: ${error.message}</p>`;
        } finally {
            this.queryButton.disabled = false;
            this.queryButton.textContent = 'Load Image';
        }
    }

    /**
     * The update method is called after a successful request (manual or automatic).
     * @param {Array<object>} allData - An array containing the single response payload.
     */
    update(allData) {
        const payload = allData[0];
        
        if (payload.error) {
            this.displayArea.innerHTML = `<p style="color: red;">Client Error: ${payload.error}</p>`;
            return;
        }

        // 1. Extract the Base64 data and MIME type
        const b64Data = payload.b64_image;
        const mimeType = payload.mime_type || 'application/octet-stream';
        const filename = payload.filename || 'image';

        if (!b64Data) {
            this.displayArea.innerHTML = `<p style="color: red;">Invalid response: No image data received.</p>`;
            return;
        }

        // 2. Construct the Data URL format: data:[<MIME-type>][;charset=<encoding>][;base64],<data>
        const dataUrl = `data:${mimeType};base64,${b64Data}`;

        // 3. Render the image in the display area
        this.displayArea.innerHTML = `
            <p>File: <strong>${filename}</strong></p>
            <img src="${dataUrl}" alt="${filename}" style="max-width: 100%; height: auto; border: 1px solid #ccc;">
        `;
    }

    destroy() {
        this.queryButton.removeEventListener('click', this.requestImage);
    }
}