export default class RadialCoreMonitorWidget {
    constructor(canvas, config) {
        this.container = canvas.parentElement;
        this.config = config;
        
        // --- NEW: Read the mode from the config, default to 'classical' ---
        this.mode = config.mode || 'classical';

        let chartType, chartData, chartOptions;

        const baseColors = [
            'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
            'rgba(99, 255, 132, 0.7)', 'rgba(162, 54, 235, 0.7)'
        ];

        // --- NEW: Configure chart based on mode ---
        switch (this.mode) {
            case 'line': // Spider graph
                chartType = 'radar';
                chartData = {
                    labels: [], datasets: [{
                        label: 'Core Usage', data: [],
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        pointRadius: 0 // Hide points for a clean line
                    }]
                };
                chartOptions = { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { backdropColor: 'rgba(255,255,255,0.75)', callback: (v) => v + '%' } } }, plugins: { legend: { display: false } } };
                break;
            
            case 'classical':
            default: // Polar area chart
                chartType = 'radar';
                chartData = {
                    labels: [], datasets: [{
                        label: 'Core Usage', data: [],
                        backgroundColor: baseColors, borderWidth: 1
                    }]
                };
                chartOptions = { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { backdropColor: 'rgba(255,255,255,0.75)', callback: (v) => v + '%' } } }, plugins: { legend: { display: false } } };
                break;
        }

        // Initialize the chart with the selected configuration
        this.chart = new Chart(canvas, {
            type: chartType,
            data: chartData,
            options: chartOptions
        });
    }

    update(allData) {
        const metrics = allData[0];
        if (!metrics || !metrics.cpu || !metrics.cpu.cores) return;

        const coresData = metrics.cpu.cores.sort((a, b) => a.core - b.core);
        const numCores = coresData.length;

        // --- NEW: Transform data based on the mode ---
        switch (this.mode) {
            case 'line':
            case 'classical':
                this.chart.data.labels = coresData.map(core => `Core ${core.core}`);
                this.chart.data.datasets[0].data = coresData.map(core => core.usage);
                break;
        }

        this.chart.update('none');
    }

    destroy() {
        if (this.chart) this.chart.destroy();
    }
}