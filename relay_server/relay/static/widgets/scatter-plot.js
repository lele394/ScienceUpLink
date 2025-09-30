// This file defines the Scatter Plot widget, now capable of handling multiple datasets.

export default class ScatterPlotWidget {
    constructor(canvas, config) {
        // Dynamically create a dataset for each source in the config
        const datasets = config.dataSources.map(ds => ({
            label: ds.label,
            data: [], // Start with empty data
            // Use the custom color from the config, or a default
            backgroundColor: ds.color || 'rgba(150, 150, 150, 0.6)'
        }));

        this.chart = new Chart(canvas.getContext('2d'), {
            type: 'scatter',
            data: {
                // The datasets array is now dynamically generated
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { type: 'linear', position: 'bottom' },
                    y: { beginAtZero: false }
                }
            }
        });
    }

    // The update method now receives an ARRAY of data points,
    // one for each dataset.
    update(allData) {
        if (!allData || allData.length === 0) return;

        // Loop through the data and update each corresponding dataset
        allData.forEach((data, index) => {
            if (this.chart.data.datasets[index]) {
                this.chart.data.datasets[index].data = data;
            }
        });
        
        this.chart.update();
    }

    destroy() {
        this.chart.destroy();
    }
}