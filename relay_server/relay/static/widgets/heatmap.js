// This file defines the Heatmap widget, updated for the multi-source architecture.

export default class HeatmapWidget {
    constructor(canvas, config) {
        // --- FIX #1: Access the config from the new dataSources array ---
        // The heatmap only uses the first data source, so we access it at index [0].
        // The path is now config -> dataSources -> [0] -> source -> endpoint.
        const firstDataSource = config.dataSources[0];
        this.size = parseInt(firstDataSource.source.endpoint.size) || 20;
        // --- END OF FIX #1 ---

        this.chart = new Chart(canvas.getContext('2d'), {
            type: 'matrix',
            data: {
                datasets: [{
                    label: config.title,
                    data: [],
                    width: (ctx) => {
                        if (!ctx.chart.chartArea) return 0;
                        return ctx.chart.chartArea.width / this.size;
                    },
                    height: (ctx) => {
                        if (!ctx.chart.chartArea) return 0;
                        return ctx.chart.chartArea.height / this.size;
                    },
                    backgroundColor: (ctx) => {
                        if (!ctx.raw) return 'transparent';
                        const value = ctx.raw.v;
                        const alpha = 0.2 + value * 0.8;
                        const hue = 240 * (1 - value);
                        return `hsla(${hue}, 80%, 50%, ${alpha})`;
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                if (!ctx.raw) return '';
                                return `Value: ${ctx.raw.v.toFixed(4)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { display: false }, grid: { display: false } },
                    y: { ticks: { display: false }, grid: { display: false } }
                }
            }
        });
    }

    // This method is required by the contract.
    update(allData) {
        // --- FIX #2: The loader now sends an array of results. ---
        // Since the heatmap only has one source, its data is the first element.
        const matrixData = allData[0];
        // --- END OF FIX #2 ---

        if (!matrixData || matrixData.length === 0) return;

        const transformedData = [];
        matrixData.forEach((row, y) => {
            row.forEach((value, x) => {
                transformedData.push({ x, y, v: value });
            });
        });
        this.chart.data.datasets[0].data = transformedData;
        this.chart.update();
    }

    destroy() {
        this.chart.destroy();
    }
}