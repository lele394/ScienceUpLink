// This file defines the Line Plot widget, now capable of handling multiple datasets.

export default class LinePlotWidget {
    constructor(canvas, config) {
        // Dynamically create a dataset for each source in the config
        const datasets = config.dataSources.map(ds => ({
            label: ds.label,
            data: [], // Start with empty data
            fill: false,
            // Use the custom color from the config
            borderColor: ds.color || 'rgb(201, 203, 207)',
            tension: 0.1
        }));

        this.chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
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
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        });
    }

    // The update method now receives an ARRAY of data point arrays.
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