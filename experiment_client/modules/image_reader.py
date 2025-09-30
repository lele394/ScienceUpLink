import os
import base64
import time

# --- Module Metadata ---
NAME = "Image Reader"
DESCRIPTION = "Reads and transmits an image file via Base64 encoding."
VERSION = "1.0"

def handle(endpoint: dict) -> dict:
    """
    Reads an image file from the path in the endpoint, encodes it to Base64,
    and returns the result.
    """
    endpoint_name = endpoint.get("name")
    if endpoint_name != "read_image":
        return {"error": f"Unknown endpoint '{endpoint_name}'"}

    # The file path is provided by the user via the widget's field
    file_path = endpoint.get("path")
    if not file_path:
        return {"error": "Parameter 'path' is missing."}

    # --- Security Check: Simple path validation ---
    # Prevent reading arbitrary files outside a permitted directory (optional, but wise)
    # For this example, we trust the path for simplicity.
    
    try:
        # 1. Open the file in binary mode ('rb')
        with open(file_path, 'rb') as f:
            image_bytes = f.read()
        
        # 2. Base64 Encode the binary data
        encoded_string = base64.b64encode(image_bytes).decode('utf-8')
        
        # 3. Determine the MIME type (simple heuristic)
        # This is required for the browser's Data URL format (data:image/jpeg;base64,...)
        if file_path.lower().endswith(('.jpg', '.jpeg')):
            mime_type = 'image/jpeg'
        elif file_path.lower().endswith('.png'):
            mime_type = 'image/png'
        elif file_path.lower().endswith('.gif'):
            mime_type = 'image/gif'
        else:
            # Default to Octet-Stream if type is unknown
            mime_type = 'application/octet-stream'

        # The key "b64_image" is the data payload key for the widget
        return {
            "b64_image": encoded_string,
            "mime_type": mime_type,
            "filename": os.path.basename(file_path),
            "timestamp": time.time()
        }

    except FileNotFoundError:
        return {"error": f"File not found: {file_path}"}
    except Exception as e:
        return {"error": f"An error occurred during file processing: {str(e)}"}