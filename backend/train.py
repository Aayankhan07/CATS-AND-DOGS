import os
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



def load_cifar10_locally(archive_path):
    import tarfile
    import pickle
    import numpy as np
    
    dest_dir = os.path.expanduser("~/.keras/datasets")
    os.makedirs(dest_dir, exist_ok=True)
    
    with tarfile.open(archive_path, 'r') as tar:
        tar.extractall(path=dest_dir)
        
    extracted_dir = os.path.join(dest_dir, "cifar-10-batches-py")
    if not os.path.exists(extracted_dir):
        for name in os.listdir(dest_dir):
            if "cifar-10" in name and os.path.isdir(os.path.join(dest_dir, name)):
                extracted_dir = os.path.join(dest_dir, name)
                break
                
    def load_batch_file(filepath):
        with open(filepath, 'rb') as f:
            d = pickle.load(f, encoding='bytes')
            data = d[b'data']
            labels = d[b'labels'] if b'labels' in d else d[b'fine_labels']
            data = data.reshape(len(data), 3, 32, 32).transpose(0, 2, 3, 1)
            labels = np.array(labels, dtype=np.int32)
            return data, labels
            
    x_train_list = []
    y_train_list = []
    for i in range(1, 6):
        batch_path = os.path.join(extracted_dir, f"data_batch_{i}")
        x, y = load_batch_file(batch_path)
        x_train_list.append(x)
        y_train_list.append(y)
        
    x_train = np.concatenate(x_train_list, axis=0)
    y_train = np.concatenate(y_train_list, axis=0)
    
    test_batch_path = os.path.join(extracted_dir, "test_batch")
    x_test, y_test = load_batch_file(test_batch_path)
    
    return (x_train, y_train), (x_test, y_test)

def run_training_sync(epochs=10, batch_size=64, base_dir="backend"):
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
        # Always load from the local cifar-10-python.tar archive
        local_archive = None
        for path_candidate in ["cifar-10-python.tar", "backend/cifar-10-python.tar"]:
            if os.path.exists(path_candidate) and os.path.getsize(path_candidate) == 170498071:
                local_archive = path_candidate
                break
        
        if not local_archive:
            raise Exception("Dataset archive 'cifar-10-python.tar' (size: 170498071 bytes) not found in the workspace root directory.")
            
        TRAINING_STATUS["status_message"] = f"Loading local dataset {local_archive}..."
        (train_images, train_labels), (test_images, test_labels) = load_cifar10_locally(local_archive)

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

def start_training_async(epochs=10, base_dir="backend"):
    """
    Starts training thread in background.
    """
    global training_lock
    if training_lock.acquire(blocking=False):
        def thread_target():
            try:
                run_training_sync(epochs=epochs, base_dir=base_dir)
            finally:
                training_lock.release()
                
        t = threading.Thread(target=thread_target)
        t.start()
        return True
    return False

