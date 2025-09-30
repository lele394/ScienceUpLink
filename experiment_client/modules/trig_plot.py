import random
import math

# --- Module Metadata ---
NAME = "trig_plot"
DESCRIPTION = "Generates data points for sine and cosine functions."
VERSION = "0.1"

def handle(endpoint: dict) -> dict:
    """
    Generates plot data based on the requested function.
    """
    name = endpoint.get("name")
    num_points = int(endpoint.get("points", 50))
    
    data_points = []
    
    func = None
    if name == "get_cos_data":
        func = math.cos
    elif name == "get_sin_data":
        func = math.sin
    else:
        return {"error": f"Unknown endpoint name: {name}"}

    for _ in range(num_points):
        x = random.uniform(-1.0, 1.0)
        y = func(x * math.pi) # Scale x to show a full wave
        data_points.append({"x": x, "y": y})
        
    return {"points": data_points}