export default class AdvancedPlotWidget {
    // We add a little CSS for the save button
    static css = `
        .adv-plot-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            /* This is a trick to make sure the h2 doesn't affect the button's position */
            margin-bottom: -2.5em; 
            padding-bottom: 0.5em;
        }
        .adv-plot-header h2 {
            margin-bottom: 0;
        }
        .adv-plot-save-btn {
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
        }
    `;

    constructor(canvas, config) {
        this.container = canvas.parentElement;
        this.config = config;

        // --- 1. Add the Save Button to the widget's header ---
        // We grab the existing h2 title element from the widget shell
        const titleElement = this.container.parentElement.querySelector('h2');
        titleElement.classList.add('adv-plot-title'); // Add a class for potential styling
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save as PNG';
        saveButton.className = 'adv-plot-save-btn';
        saveButton.addEventListener('click', () => this.saveChart());
        
        // Wrap the title and button in a new header div for proper alignment
        const header = document.createElement('div');
        header.className = 'adv-plot-header';
        titleElement.parentNode.insertBefore(header, titleElement);
        header.appendChild(titleElement);
        header.appendChild(saveButton);

        // --- 2. Read Axis Configuration from `chartOptions` ---
        const options = config.chartOptions || {};
        const xAxisOptions = options.xAxis || {};
        const yAxisOptions = options.yAxis || {};

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: xAxisOptions.type || 'linear', // Use 'linear' or 'logarithmic'
                    position: 'bottom',
                    title: {
                        display: !!xAxisOptions.title, // Only display if title exists
                        text: xAxisOptions.title || ''
                    }
                },
                y: {
                    type: yAxisOptions.type || 'linear',
                    title: {
                        display: !!yAxisOptions.title,
                        text: yAxisOptions.title || ''
                    }
                }
            },
            plugins: { /* ... existing plugins ... */ }
        };

        // --- 3. Build datasets (this logic is the same as before) ---
        const datasets = config.dataSources.map(ds => {
            switch (ds.type) {
                case 'line': return { type: 'line', label: ds.label, data: [], borderColor: ds.color, fill: false, tension: 0.1, pointRadius: 0 };
                case 'scatter': return { type: 'scatter', label: ds.label, data: [], backgroundColor: ds.color, pointRadius: 5, pointHoverRadius: 8 };
                default: return null;
            }
        }).filter(Boolean);

        // --- 4. Initialize the chart with the new dynamic options ---
        this.chart = new Chart(canvas, {
            data: { datasets: datasets },
            options: chartOptions
        });
    }

    // --- 5. Implement the saveChart method ---
    saveChart() {
        if (!this.chart) return;
        
        // Use the Chart.js built-in method to get a Base64 image
        const dataUrl = this.chart.toBase64Image('image/png');
        
        // Create a temporary link to trigger the download
        const link = document.createElement('a');
        link.href = dataUrl;
        
        // Create a filename from the widget title
        const filename = `${this.config.title.replace(/ /g, '_')}.png`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * The update method is identical to the previous version.
     */
    update(allData) {
        if (!allData || allData.length === 0) return;
        allData.forEach((data, index) => {
            if (this.chart.data.datasets[index]) {
                this.chart.data.datasets[index].data = data;
            }
        });
        this.chart.update('none');
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}