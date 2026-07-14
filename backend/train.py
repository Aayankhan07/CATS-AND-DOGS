import os
import json
import threading
import numpy as np
import tensorflow as tf
from tensorflow.keras import callbacks
from backend.model import build_cnn_model

# Global dictionary to store training progress
TRAINING_STATUS = {
    "is_training": False,
    "current_epoch": 0,
    "total_epochs": 0,
    "loss_history": [],
    "accuracy_history": [],
    "status_message": "Not training",
    "dataset_size": 0,
    "should_stop": False
}

# Lock to prevent concurrent training runs
training_lock = threading.Lock()

class ProgressCallback(callbacks.Callback):
    def __init__(self, total_epochs):
        super(ProgressCallback, self).__init__()
        self.total_epochs = total_epochs

    def on_batch_end(self, batch, logs=None):
        global TRAINING_STATUS
        if TRAINING_STATUS.get("should_stop", False):
            self.model.stop_training = True

    def on_epoch_end(self, epoch, logs=None):
        global TRAINING_STATUS
        if TRAINING_STATUS.get("should_stop", False):
            self.model.stop_training = True
            TRAINING_STATUS["status_message"] = "Training stopped by user."
            return
            
        epoch_num = epoch + 1
        logs = logs or {}
        
        loss = logs.get('loss', 0.0)
        val_acc = logs.get('val_accuracy', 0.0)
        
        TRAINING_STATUS["current_epoch"] = epoch_num
        TRAINING_STATUS["loss_history"].append(round(float(loss), 4))
        TRAINING_STATUS["accuracy_history"].append(round(float(val_acc), 4))
        TRAINING_STATUS["status_message"] = (
            f"Epoch {epoch_num}/{self.total_epochs} completed. "
            f"Loss: {loss:.4f} - Val Acc: {val_acc:.4f}"
        )

def download_cifar10_with_progress():
    global TRAINING_STATUS
    import urllib.request
    import os
    import shutil
    
    url = "https://www.cs.toronto.edu/~kriz/cifar-10-python.tar.gz"
    dest_dir = os.path.expanduser("~/.keras/datasets")
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, "cifar-10-batches-py.tar.gz")
    
    # Expected size in bytes
    expected_size = 170498071
    
    # 1. Check if it's already in the Keras dataset cache
    if os.path.exists(dest_path) and os.path.getsize(dest_path) == expected_size:
        return
        
    # 2. Check if a local copy exists in the repository
    local_repo_paths = [
        "backend/cifar-10-batches-py.tar.gz",
        "cifar-10-batches-py.tar.gz"
    ]
    for local_path in local_repo_paths:
        if os.path.exists(local_path) and os.path.getsize(local_path) == expected_size:
            TRAINING_STATUS["status_message"] = f"Found local copy at {local_path}. Copying to cache..."
            shutil.copy(local_path, dest_path)
            return
        
    TRAINING_STATUS["status_message"] = "Connecting to CIFAR-10 download server..."
    
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        total_size = int(response.info().get('Content-Length', expected_size))
        downloaded = 0
        chunk_size = 1024 * 128
        
        temp_dest_path = dest_path + ".tmp"
        with open(temp_dest_path, 'wb') as f:
            while True:
                if TRAINING_STATUS.get("should_stop", False):
                    f.close()
                    if os.path.exists(temp_dest_path):
                        try:
                            os.remove(temp_dest_path)
                        except:
                            pass
                    raise Exception("Download stopped by user.")
                    
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                
                percent = (downloaded / total_size) * 100
                dl_mb = downloaded / (1024 * 1024)
                total_mb = total_size / (1024 * 1024)
                
                TRAINING_STATUS["status_message"] = (
                    f"Downloading CIFAR-10 dataset (~170MB): "
                    f"{percent:.1f}% ({dl_mb:.1f} MB / {total_mb:.1f} MB)..."
                )
                
        if os.path.exists(dest_path):
            os.remove(dest_path)
        os.rename(temp_dest_path, dest_path)

def run_training_sync(epochs=10, batch_size=64, base_dir="backend", use_synthetic=False):
    """
    Downloads CIFAR-10, filters classes, runs TensorFlow CNN training,
    saves the model weights, and updates global TRAINING_STATUS.
    """
    global TRAINING_STATUS
    
    TRAINING_STATUS["is_training"] = True
    TRAINING_STATUS["should_stop"] = False
    TRAINING_STATUS["current_epoch"] = 0
    TRAINING_STATUS["total_epochs"] = epochs
    TRAINING_STATUS["loss_history"] = []
    TRAINING_STATUS["accuracy_history"] = []
    
    try:
        if use_synthetic:
            TRAINING_STATUS["status_message"] = "Generating synthetic dataset in memory..."
            np.random.seed(42)
            # Generate 300 synthetic images of 32x32x3
            x_train = np.random.random((300, 32, 32, 3)).astype(np.float32)
            y_train = np.random.randint(0, 3, size=(300,)).astype(np.int32)
            
            x_test = np.random.random((60, 32, 32, 3)).astype(np.float32)
            y_test = np.random.randint(0, 3, size=(60,)).astype(np.int32)
        else:
            # Download CIFAR-10 with custom live progress bar
            download_cifar10_with_progress()
            
            TRAINING_STATUS["status_message"] = "Loading downloaded dataset..."
            (train_images, train_labels), (test_images, test_labels) = tf.keras.datasets.cifar10.load_data()

            TRAINING_STATUS["status_message"] = "Preprocessing and balancing dataset..."
            
            # Flatten label dimensions
            train_labels_flat = train_labels.flatten()
            test_labels_flat = test_labels.flatten()
            
            # Filter indices: Cat=3, Dog=5, Neither=anything else
            cat_train_idx = np.where(train_labels_flat == 3)[0]
            dog_train_idx = np.where(train_labels_flat == 5)[0]
            neither_train_idx = np.where((train_labels_flat != 3) & (train_labels_flat != 5))[0]
            
            # Balance dataset to 5,000 samples per class
            np.random.seed(42)
            sampled_neither_train_idx = np.random.choice(neither_train_idx, len(cat_train_idx), replace=False)
            
            # Combine training data
            train_idx = np.concatenate([cat_train_idx, dog_train_idx, sampled_neither_train_idx])
            np.random.shuffle(train_idx)
            
            x_train = train_images[train_idx] / 255.0
            y_train_raw = train_labels_flat[train_idx]
            
            # Map labels: Cat (3) -> 0, Dog (5) -> 1, Neither -> 2
            y_train = np.zeros_like(y_train_raw)
            y_train[y_train_raw == 3] = 0
            y_train[y_train_raw == 5] = 1
            y_train[(y_train_raw != 3) & (y_train_raw != 5)] = 2
            
            # Filter validation data (balance to 1,000 samples per class)
            cat_test_idx = np.where(test_labels_flat == 3)[0]
            dog_test_idx = np.where(test_labels_flat == 5)[0]
            neither_test_idx = np.where((test_labels_flat != 3) & (test_labels_flat != 5))[0]
            sampled_neither_test_idx = np.random.choice(neither_test_idx, len(cat_test_idx), replace=False)
            
            # Combine test data
            test_idx = np.concatenate([cat_test_idx, dog_test_idx, sampled_neither_test_idx])
            np.random.shuffle(test_idx)
            
            x_test = test_images[test_idx] / 255.0
            y_test_raw = test_labels_flat[test_idx]
            
            y_test = np.zeros_like(y_test_raw)
            y_test[y_test_raw == 3] = 0
            y_test[y_test_raw == 5] = 1
            y_test[(y_test_raw != 3) & (y_test_raw != 5)] = 2
            
        TRAINING_STATUS["dataset_size"] = len(x_train)
        TRAINING_STATUS["status_message"] = "Initializing model..."
        
        # Build and train model
        model = build_cnn_model()
        
        progress_cb = ProgressCallback(epochs)
        
        TRAINING_STATUS["status_message"] = "Training model..."
        model.fit(
            x_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(x_test, y_test),
            callbacks=[progress_cb],
            verbose=1
        )
        
        # Save model
        os.makedirs(base_dir, exist_ok=True)
        model.save(os.path.join(base_dir, "cifar_model.h5"))
        
        TRAINING_STATUS["status_message"] = "Model trained successfully and saved!"
        
    except Exception as e:
        TRAINING_STATUS["status_message"] = f"Training failed: {str(e)}"
        print(f"Error during training: {str(e)}")
    finally:
        TRAINING_STATUS["is_training"] = False

def start_training_async(epochs=10, use_synthetic=False, base_dir="backend"):
    """
    Starts training thread in background.
    """
    global training_lock
    if training_lock.acquire(blocking=False):
        def thread_target():
            try:
                run_training_sync(epochs=epochs, use_synthetic=use_synthetic, base_dir=base_dir)
            finally:
                training_lock.release()
                
        t = threading.Thread(target=thread_target)
        t.start()
        return True
    return False

