import math
import random

# --- Module Metadata ---
NAME = "line_trig"
DESCRIPTION = "Generates a continuous line of points for sine and cosine functions."
VERSION = "0.1"

def handle(endpoint: dict) -> dict:
    """
    Generates an ordered list of {x, y} points for a line plot.
    """
    func_name = endpoint.get("name")
    try:
        num_points = int(endpoint.get("points", 100))
        # Add a new parameter for how many waves to show
        cycles = float(endpoint.get("cycles", 1.0))
    except (ValueError, TypeError):
        num_points = 100
        cycles = 1.0

    func = None
    if func_name == "get_cos_line":
        func = math.cos
    elif func_name == "get_sin_line":
        func = math.sin
    else:
        return {"error": f"Unknown endpoint name: {func_name}"}

    data_points = []
    # The total range for the x-axis (e.g., 2*pi for one full cycle)
    x_range = 2 * math.pi * cycles
    
    # Loop from 0 to num_points to generate sorted x-values
    for i in range(num_points):
        # Calculate x as a fraction of the total range
        x = (i / (num_points - 1)) * x_range
        # Add a small random jitter to the y-value to make it look dynamic on refresh
        y = func(x) + (random.random() - 0.5) * 0.1 
        
        data_points.append({"x": x, "y": y})
        
    # The data key is 'points', which our new widget will expect
    return {"points": data_points}