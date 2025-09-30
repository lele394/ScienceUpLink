export default class SystemMonitorWidget {
    static css = `
        .sys-monitor-container { display: flex; flex-direction: column; gap: 1em; font-family: monospace; font-size: 14px; }
        .sys-monitor-section { border: 1px solid #eee; padding: 0.5em; border-radius: 4px; }
        .sys-monitor-section h3 { margin: 0 0 0.5em 0; font-size: 1em; }
        .progress-bar { 
            position: relative; background-color: #e9ecef; border-radius: .25rem; 
            height: 20px; overflow: hidden;
        }
        .progress-bar-inner { 
            background-color: #0d6efd; height: 100%; transition: width 0.3s ease-in-out;
        }
        .progress-bar-text {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            color: #212529; font-size: 12px; font-weight: bold; text-shadow: 0 0 2px white; 
        }
        .cpu-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 8px;
        }
        .core-item { display: flex; align-items: center; gap: 8px; }
        .core-label { flex-basis: 45px; flex-shrink: 0; }
        .core-item .progress-bar { flex: 1; }
        .gpu-card { border-top: 1px solid #eee; padding-top: 0.5em; margin-top: 0.5em; }
        .io-text { display: flex; justify-content: space-around; }
        
        /* Generic styling for both history charts */
        .history-chart-container {
            position: relative;
            height: 120px;
            margin-bottom: 1em;
        }
    `;

    constructor(canvas, config) {
        this.container = canvas.parentElement;
        canvas.remove();

        // Add state properties for BOTH CPU and GPU history
        this.historySize = 50;
        this.cpuHistory = { labels: [], avg: [], min: [], max: [] };
        this.gpuHistory = { labels: [], util: [], vram: [] };

        // Update HTML to include containers and canvases for BOTH charts
        this.container.innerHTML = `
            <div class="sys-monitor-container">
                <div class="sys-monitor-section" id="cpu-section-${config.id}">
                    <h3>CPU</h3>
                    <div class="history-chart-container">
                        <canvas id="cpu-history-chart-${config.id}"></canvas>
                    </div>
                    <div class="cpu-grid"></div>
                </div>
                <div class="sys-monitor-section" id="ram-section-${config.id}"></div>
                <div class="sys-monitor-section" id="disk-section-${config.id}"></div>
                <div class="sys-monitor-section" id="gpu-section-${config.id}">
                    <h3>GPUs</h3>
                    <div class="history-chart-container">
                        <canvas id="gpu-history-chart-${config.id}"></canvas>
                    </div>
                    <div class="gpu-grid"></div>
                </div>
            </div>
        `;
        
        // Store references to dynamic parts
        this.cpuSection = this.container.querySelector(`#cpu-section-${config.id}`);
        this.cpuGrid = this.cpuSection.querySelector('.cpu-grid');
        this.ramSection = this.container.querySelector(`#ram-section-${config.id}`);
        this.diskSection = this.container.querySelector(`#disk-section-${config.id}`);
        this.gpuSection = this.container.querySelector(`#gpu-section-${config.id}`);
        this.gpuGrid = this.gpuSection.querySelector('.gpu-grid');

        // --- Initialize the CPU Chart instance ---
        const cpuChartCanvas = this.container.querySelector(`#cpu-history-chart-${config.id}`);
        this.cpuChart = new Chart(cpuChartCanvas, {
            type: 'line', data: { labels: [], datasets: [
                { label: 'Max', data: [], borderColor: 'rgb(255, 99, 132)', tension: 0.4 },
                { label: 'Avg', data: [], borderColor: 'rgb(54, 162, 235)', tension: 0.4 },
                { label: 'Min', data: [], borderColor: 'rgb(75, 192, 192)', tension: 0.4 }
            ]}, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } }, x: { ticks: { display: false } } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: {size: 10} } } }, elements: { point: { radius: 0 } } }
        });

        // --- Initialize the GPU Chart instance ---
        const gpuChartCanvas = this.container.querySelector(`#gpu-history-chart-${config.id}`);
        this.gpuChart = new Chart(gpuChartCanvas, {
            type: 'line', data: { labels: [], datasets: [
                { label: 'Util %', data: [], borderColor: 'rgb(153, 102, 255)', tension: 0.4 },
                { label: 'VRAM %', data: [], borderColor: 'rgb(255, 159, 64)', tension: 0.4 }
            ]}, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: { callback: (v) => v + '%' } }, x: { ticks: { display: false } } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: {size: 10} } } }, elements: { point: { radius: 0 } } }
        });
    }
    
    _createProgressBar(percentValue, textPrefix = null) {
        const displayText = textPrefix ? `${textPrefix} (${percentValue.toFixed(1)}%)` : `${percentValue.toFixed(1)}%`;
        return `<div class="progress-bar"><div class="progress-bar-inner" style="width: ${percentValue}%;"></div><div class="progress-bar-text">${displayText}</div></div>`;
    }
    
    _formatBytes(bytes) {
        if (bytes === 0) return '0 B/s';
        const k = 1024; const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    update(allData) {
        const metrics = allData[0];
        if (!metrics) return;

        // --- CPU History Calculation and Update ---
        const cpuUsages = metrics.cpu.cores.map(c => c.usage);
        if (cpuUsages.length > 0) {
            this.cpuHistory.avg.push(cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length);
            this.cpuHistory.min.push(Math.min(...cpuUsages));
            this.cpuHistory.max.push(Math.max(...cpuUsages));
            this.cpuHistory.labels.push(new Date().toLocaleTimeString());
            while (this.cpuHistory.labels.length > this.historySize) { Object.values(this.cpuHistory).forEach(arr => arr.shift()); }
            this.cpuChart.data.labels = this.cpuHistory.labels;
            [this.cpuChart.data.datasets[0].data, this.cpuChart.data.datasets[1].data, this.cpuChart.data.datasets[2].data] = [this.cpuHistory.max, this.cpuHistory.avg, this.cpuHistory.min];
            this.cpuChart.update('none');
        }

        // --- CPU Section Title and Bars ---
        let tempHtml = metrics.cpu.temperatures.length > 0 ? `<span>&nbsp;(Temp: ${metrics.cpu.temperatures[0].temp_c}°C)</span>` : '';
        this.cpuSection.querySelector('h3').innerHTML = `CPU ${tempHtml}`;
        this.cpuGrid.innerHTML = metrics.cpu.cores.map(core => `<div class="core-item"><span class="core-label">Core ${core.core}</span>${this._createProgressBar(core.usage)}</div>`).join('');

        // --- RAM Section ---
        const ram = metrics.ram;
        const ramPrefix = `${(ram.used_kb / 1024 / 1024).toFixed(2)}GB / ${(ram.total_kb / 1024 / 1024).toFixed(2)}GB`;
        this.ramSection.innerHTML = `<h3>Memory</h3>${this._createProgressBar(ram.usage_percent, ramPrefix)}`;

        // --- Disk I/O Section ---
        this.diskSection.innerHTML = `<h3>Disk I/O</h3><div class="io-text"><span>Read: ${this._formatBytes(metrics.disk.read_bytes_sec)}</span><span>Write: ${this._formatBytes(metrics.disk.write_bytes_sec)}</span></div>`;

        // --- GPU History and Bars ---
        if (metrics.gpus && metrics.gpus.length > 0) {
            this.gpuSection.style.display = 'block'; // Ensure section is visible
            // --- GPU History Calculation ---
            const avgUtil = metrics.gpus.reduce((sum, gpu) => sum + gpu.utilization_percent, 0) / metrics.gpus.length;
            const avgVram = metrics.gpus.reduce((sum, gpu) => sum + gpu.vram_usage_percent, 0) / metrics.gpus.length;
            this.gpuHistory.util.push(avgUtil);
            this.gpuHistory.vram.push(avgVram);
            this.gpuHistory.labels.push(new Date().toLocaleTimeString());
            while (this.gpuHistory.labels.length > this.historySize) { Object.values(this.gpuHistory).forEach(arr => arr.shift()); }
            this.gpuChart.data.labels = this.gpuHistory.labels;
            [this.gpuChart.data.datasets[0].data, this.gpuChart.data.datasets[1].data] = [this.gpuHistory.util, this.gpuHistory.vram];
            this.gpuChart.update('none');
            
            // --- GPU Bars ---
            this.gpuGrid.innerHTML = metrics.gpus.map(gpu => {
                const vramPrefix = `${gpu.vram_used_mb}MB / ${gpu.vram_total_mb}MB`;
                return `<div class="gpu-card"><strong>${gpu.id}: ${gpu.name}</strong><div>Util: ${this._createProgressBar(gpu.utilization_percent)}</div><div>VRAM: ${this._createProgressBar(gpu.vram_usage_percent, vramPrefix)}</div></div>`;
            }).join('');
        } else {
            // Hide the entire GPU section if no GPUs are detected
            this.gpuSection.style.display = 'none';
        }
    }
    
    destroy() {
        if (this.cpuChart) { this.cpuChart.destroy(); }
        if (this.gpuChart) { this.gpuChart.destroy(); }
        this.container.innerHTML = '';
    }
}