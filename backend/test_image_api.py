import os
import sys
import io

# Add project root to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import tensorflow as tf
from PIL import Image

from backend.utils import preprocess_image
from backend.model import build_cnn_model
from backend.train import run_training_sync

def test_image_preprocessing():
    print("Testing image preprocessing...")
    # Create a dummy image in memory using Pillow
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes = img_bytes.getvalue()
    
    # Process
    processed = preprocess_image(img_bytes)
    
    # Verify shape is (1, 32, 32, 3) and values are normalized [0, 1]
    assert processed.shape == (1, 32, 32, 3), f"Shape mismatch: {processed.shape}"
    assert processed.max() <= 1.0, f"Max value exceeds 1.0: {processed.max()}"
    assert processed.min() >= 0.0, f"Min value is below 0.0: {processed.min()}"
    print("OK: Image preprocessing test passed.")

def test_model_structure():
    print("Testing model structures and forward pass...")
    model = build_cnn_model()
    
    # Dummy input batch of shape (2, 32, 32, 3)
    dummy_input = np.random.rand(2, 32, 32, 3).astype(np.float32)
    predictions = model.predict(dummy_input, verbose=0)
    
    # Verify output shape is (2, 3)
    assert predictions.shape == (2, 3), f"Output shape mismatch: {predictions.shape}"
    print("OK: Model structures and forward pass test passed.")

def test_training_checkpoint():
    print("Testing fast 1-epoch Keras training sanity check...")
    temp_dir = "backend_temp_test_tf"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Create a small subset of fake data to train Keras model quickly for 1 epoch
    x_fake = np.random.rand(10, 32, 32, 3).astype(np.float32)
    y_fake = np.random.randint(0, 3, (10,)).astype(np.int32)
    
    try:
        model = build_cnn_model()
        model.fit(x_fake, y_fake, epochs=1, batch_size=2, verbose=0)
        
        # Save model
        save_path = os.path.join(temp_dir, "test_model.h5")
        model.save(save_path)
        
        assert os.path.exists(save_path), "Model was not saved!"
        print("OK: Training sanity check passed.")
    finally:
        # Cleanup
        if os.path.exists(temp_dir):
            for f in os.listdir(temp_dir):
                os.remove(os.path.join(temp_dir, f))
            os.rmdir(temp_dir)

if __name__ == "__main__":
    print("=== RUNNING TENSORFLOW BACKEND TESTS ===")
    try:
        test_image_preprocessing()
        test_model_structure()
        test_training_checkpoint()
        print("=== ALL TESTS COMPLETED SUCCESSFULLY ===")
        sys.exit(0)
    except AssertionError as e:
        print(f"Assertion failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error encountered: {e}")
        sys.exit(1)
