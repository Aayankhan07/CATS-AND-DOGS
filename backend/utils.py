import io
import numpy as np
from PIL import Image

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Decodes image bytes, resizes to 32x32, converts to RGB,
    normalizes pixels to [0, 1], and returns batch-expanded array.
    """
    # Open the image using Pillow
    img = Image.open(io.BytesIO(image_bytes))
    
    # Convert image to RGB (handles PNG transparency/grayscale)
    img = img.convert('RGB')
    
    # Resize to model input shape (32x32)
    img = img.resize((32, 32))
    
    # Convert to numpy array and scale to [0, 1]
    img_array = np.array(img) / 255.0
    
    # Expand dimensions for batch size of 1 -> shape: (1, 32, 32, 3)
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array
