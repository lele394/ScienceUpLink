export default class ImageViewerWidget {
    // The constructor and requestImage methods remain the same as before.
    constructor(canvas, config) {
        this.container = canvas.parentElement;
        canvas.remove();
        this.config = config;
        
        this.container.innerHTML = `
            <div style="padding: 10px;">
                <p><strong>Client:</strong> ${config.dataSources[0].source.clientId}</p>
                <input type="text" id="image-path-${config.id}" placeholder="Enter file path on client..." 
                       style="width: 70%; padding: 5px; margin-right: 10px;">
                <button id="image-query-btn-${config.id}" style="padding: 5px 10px;">Load File</button>
                <hr style="margin-top: 10px;">
                <div id="image-display-${config.id}">
                    <p>No file loaded.</p>
                </div>
            </div>
        `;

        this.inputField = this.container.querySelector(`#image-path-${config.id}`);
        this.displayArea = this.container.querySelector(`#image-display-${config.id}`);
        this.queryButton = this.container.querySelector(`#image-query-btn-${config.id}`);

        this.queryButton.addEventListener('click', this.requestImage.bind(this));
    }

    async requestImage() {
        const path = this.inputField.value.trim();
        if (!path) {
            this.displayArea.innerHTML = '<p style="color: red;">Please enter a file path.</p>';
            return;
        }

        this.queryButton.disabled = true;
        this.queryButton.textContent = 'Loading...';
        this.displayArea.innerHTML = '<p>Requesting file...</p>';

        const ds = this.config.dataSources[0];
        const endpointParams = new URLSearchParams(ds.source.endpoint);
        endpointParams.set('path', path);
        endpointParams.set('name', 'read_image');
        
        const url = `/data?client_id=${ds.source.clientId}&experiment=${ds.source.experiment}&${endpointParams.toString()}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            this.update([data]);

        } catch (error) {
            this.displayArea.innerHTML = `<p style="color: red;">Network Error: ${error.message}</p>`;
        } finally {
            this.queryButton.disabled = false;
            this.queryButton.textContent = 'Load File';
        }
    }

    /**
     * The update method is now smarter. It checks the MIME type and either
     * displays the image OR triggers a download.
     */
    update(allData) {
        const payload = allData[0];
        
        if (payload.error) {
            this.displayArea.innerHTML = `<p style="color: red;">Client Error: ${payload.error}</p>`;
            return;
        }

        const b64Data = payload.b64_image;
        const mimeType = payload.mime_type || 'application/octet-stream';
        // Provide a default filename if the backend doesn't
        const filename = payload.filename || 'downloaded_file';

        if (!b64Data) {
            this.displayArea.innerHTML = `<p style="color: red;">Invalid response: No data received.</p>`;
            return;
        }

        const dataUrl = `data:${mimeType};base64,${b64Data}`;

        // --- THIS IS THE NEW LOGIC ---
        // If it's a generic file type, trigger a download.
        if (mimeType === 'application/octet-stream') {
            // 1. Create a temporary anchor element in memory
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename; // This attribute triggers the download

            // 2. Append to body, click it, and then remove it for cleanup
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 3. Provide user feedback in the widget area
            this.displayArea.innerHTML = `
                <p>Download initiated for: <strong>${filename}</strong></p>
                <p><small>(If the download didn't start, check your browser's security or pop-up settings.)</small></p>
            `;
        } else {
            // Otherwise, it's a known image type, so display it.
            // This is the original logic.
            this.displayArea.innerHTML = `
                <p>File: <strong>${filename}</strong></p>
                <img src="${dataUrl}" alt="${filename}" style="max-width: 100%; height: auto; border: 1px solid #ccc;">
            `;
        }
        // --- END OF NEW LOGIC ---
    }

    destroy() {
        this.queryButton.removeEventListener('click', this.requestImage);
    }
}