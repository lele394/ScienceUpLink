import time
import subprocess
import re
from collections import namedtuple

# --- Module Metadata ---
NAME = "System Monitor"
DESCRIPTION = "Provides detailed system metrics like CPU, RAM, I/O, and GPU usage."
VERSION = "1.0"

# --- State for calculating deltas ---
# This is a rare case where we need state between calls to calculate rates (e.g., usage %).
_previous_cpu_times = {}
_previous_disk_stats = {}

# --- Helper Functions ---

def _get_cpu_usage():
    """Calculates per-core CPU usage by comparing /proc/stat over time."""
    global _previous_cpu_times
    current_cpu_times = {}
    
    try:
        with open('/proc/stat', 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        return {"error": "/proc/stat not found (not Linux?)"}

    # Core usage
    cores_usage = []
    for line in lines:
        if line.startswith('cpu') and line[3].isdigit():
            parts = line.split()
            cpu_id = parts[0]
            
            user = int(parts[1])
            nice = int(parts[2])
            system = int(parts[3])
            idle = int(parts[4])
            iowait = int(parts[5])
            irq = int(parts[6])
            softirq = int(parts[7])
            
            idle_time = idle + iowait
            non_idle_time = user + nice + system + irq + softirq
            total_time = idle_time + non_idle_time
            
            current_cpu_times[cpu_id] = (total_time, idle_time)
            
            if cpu_id in _previous_cpu_times:
                prev_total, prev_idle = _previous_cpu_times[cpu_id]
                
                total_delta = total_time - prev_total
                idle_delta = idle_time - prev_idle
                
                usage = 0
                if total_delta > 0:
                    usage = (total_delta - idle_delta) / total_delta * 100
                
                cores_usage.append({'core': int(cpu_id[3:]), 'usage': round(usage, 2)})

    _previous_cpu_times = current_cpu_times
    
    # Temperature (best effort)
    temps = []
    try:
        # A common path for CPU package temperature
        with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
            temp_milli_c = int(f.read().strip())
            temps.append({'name': 'CPU Package', 'temp_c': round(temp_milli_c / 1000, 1)})
    except (FileNotFoundError, IndexError):
        pass # No temperature sensors found

    return {"cores": cores_usage, "temperatures": temps}

def _get_ram_usage():
    """Parses /proc/meminfo for memory statistics."""
    try:
        with open('/proc/meminfo', 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        return {"error": "/proc/meminfo not found"}
        
    mem_info = {line.split(':')[0]: int(line.split(':')[1].strip().split()[0]) for line in lines}
    
    total = mem_info.get('MemTotal', 0)
    free = mem_info.get('MemFree', 0)
    buffers = mem_info.get('Buffers', 0)
    cache = mem_info.get('Cached', 0)
    
    used = total - free - buffers - cache
    
    return {
        'total_kb': total,
        'used_kb': used,
        'free_kb': total - used, # More intuitive 'free'
        'usage_percent': round(used / total * 100, 2) if total > 0 else 0
    }

def _get_disk_io():
    """Calculates disk I/O rates by comparing /proc/diskstats over time."""
    global _previous_disk_stats
    current_disk_stats = {}
    
    try:
        with open('/proc/diskstats', 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        return {}

    total_read_bytes = 0
    total_write_bytes = 0

    for line in lines:
        parts = line.split()
        dev_name = parts[2]
        # Filter for common main block devices, ignore partitions/loops
        if dev_name.startswith(('sd', 'hd', 'vd', 'nvme')):
            # sectors read (col 5) and written (col 9)
            # sector size is typically 512 bytes
            reads_completed = int(parts[3])
            bytes_read = int(parts[5]) * 512
            writes_completed = int(parts[7])
            bytes_written = int(parts[9]) * 512
            
            current_disk_stats[dev_name] = (bytes_read, bytes_written, time.time())
            
            total_read_bytes += bytes_read
            total_write_bytes += bytes_written

    read_rate = 0
    write_rate = 0
    if _previous_disk_stats:
        prev_read, prev_write, prev_time = _previous_disk_stats.get("total", (0, 0, 0))
        time_delta = time.time() - prev_time
        if time_delta > 0:
            read_rate = (total_read_bytes - prev_read) / time_delta
            write_rate = (total_write_bytes - prev_write) / time_delta
            
    _previous_disk_stats["total"] = (total_read_bytes, total_write_bytes, time.time())
    
    return {
        'read_bytes_sec': round(read_rate, 2),
        'write_bytes_sec': round(write_rate, 2)
    }

def _get_gpu_usage():
    """Calls nvidia-smi to get GPU statistics. Returns empty list if it fails."""
    gpus = []
    try:
        # Use CSV format for easy parsing
        query = "index,name,utilization.gpu,memory.total,memory.used"
        result = subprocess.run(
            ['nvidia-smi', f'--query-gpu={query}', '--format=csv,noheader,nounits'],
            capture_output=True, text=True, check=True
        )
        
        for line in result.stdout.strip().split('\n'):
            parts = line.split(', ')
            if len(parts) == 5:
                gpus.append({
                    'id': int(parts[0]),
                    'name': parts[1],
                    'utilization_percent': float(parts[2]),
                    'vram_total_mb': int(parts[3]),
                    'vram_used_mb': int(parts[4]),
                    'vram_usage_percent': round(int(parts[4]) / int(parts[3]) * 100, 2) if int(parts[3]) > 0 else 0
                })
    except (FileNotFoundError, subprocess.CalledProcessError):
        # nvidia-smi not found or failed, just return no GPUs
        return []
    return gpus

# --- Main Handle Function ---

def handle(endpoint: dict) -> dict:
    endpoint_name = endpoint.get("name")

    if endpoint_name == "get_metrics":
        all_metrics = {
            "cpu": _get_cpu_usage(),
            "ram": _get_ram_usage(),
            "disk": _get_disk_io(),
            "gpus": _get_gpu_usage(),
            "timestamp": time.time()
        }
        return {"system_metrics": all_metrics}
    else:
        return {"error": f"Unknown endpoint '{endpoint_name}'"}