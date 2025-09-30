import math
import random

# --- Module Metadata ---
NAME = "gaussian_heatmap"
DESCRIPTION = "Generates a 2D Gaussian heatmap."
VERSION = "0.1"

def gaussian_2d(x, y, sigma=0.5):
    """Calculates the value of a 2D Gaussian function."""
    return math.exp(-((x**2 + y**2) / (2 * (sigma+random.random()*0.5)**2)))

def handle(endpoint: dict) -> dict:
    """
    Generates a 2D matrix representing a heatmap.
    """
    try:
        size = int(endpoint.get("size", 20))
        if size <= 1:
            size = 2 # Prevent division by zero
    except (ValueError, TypeError):
        size = 20
        
    heatmap_data = []
    
    # Iterate through each cell of the matrix
    for i in range(size):
        row = []
        for j in range(size):
            # Convert grid indices (0 to size-1) to coordinates (-1.0 to 1.0)
            # This maps the center of the grid to (0,0)
            y = (i / (size - 1)) * 2 - 1
            x = (j / (size - 1)) * 2 - 1
            
            # Calculate the value and add it to the row
            value = gaussian_2d(x, y)
            row.append(value)
        heatmap_data.append(row)
        
    # The key "heatmap_data" will be used by our JavaScript renderer
    return {"heatmap_data": heatmap_data}