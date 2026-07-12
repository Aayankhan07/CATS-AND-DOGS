import os
import tensorflow as tf
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from backend.utils import preprocess_image
from backend.train import (
    TRAINING_STATUS,
    start_training_async,
    run_training_sync
)

app = FastAPI(title="CIFAR-10 Cat vs Dog vs Neither Classifier API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model = None

def load_global_model():
    global model
    model_path = "backend/cifar_model.h5"
    if os.path.exists(model_path):
        try:
            model = tf.keras.models.load_model(model_path)
            print("Successfully loaded CIFAR-10 Keras model.")
            return True
        except Exception as e:
            print(f"Failed to load model: {e}")
            model = None
    return False

@app.on_event("startup")
def startup_event():
    model_path = "backend/cifar_model.h5"
    # If model weights do not exist, run a fast 1-epoch training on startup to generate them in the background
    if not os.path.exists(model_path):
        print("Model file not found. Initiating background startup training...")
        start_training_async(epochs=1, base_dir="backend")
        
        # Start a reload watcher thread
        def reload_watcher():
            import time
            while TRAINING_STATUS["is_training"]:
                time.sleep(1)
            load_global_model()
            
        import threading
        threading.Thread(target=reload_watcher).start()
    else:
        load_global_model()


class TrainRequest(BaseModel):
    epochs: int = 10
    synthetic: bool = False

@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    global model
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")
        
    # Reload model if missing
    if model is None:
        success = load_global_model()
        if not success:
            raise HTTPException(
                status_code=503,
                detail="Model is not ready. Please run training first."
            )
            
    try:
        # Read image bytes
        contents = await file.read()
        
        # Preprocess
        img_array = preprocess_image(contents)
        
        # Inference
        probs = model.predict(img_array)[0]
        
        # Class mapping
        class_labels = ["Cat", "Dog", "Neither"]
        pred_class_idx = int(probs.argmax())
        pred_label = class_labels[pred_class_idx]
        confidence = float(probs[pred_class_idx])
        
        return {
            "filename": file.filename,
            "prediction": pred_label,
            "class_index": pred_class_idx,
            "confidence": round(confidence, 4),
            "probabilities": {
                "cat": round(float(probs[0]), 4),
                "dog": round(float(probs[1]), 4),
                "neither": round(float(probs[2]), 4)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

@app.post("/api/train")
def train_model(request: TrainRequest):
    if TRAINING_STATUS["is_training"]:
        return {"message": "Training is already in progress.", "success": False}
        
    started = start_training_async(epochs=request.epochs, use_synthetic=request.synthetic, base_dir="backend")
    
    # Reload model callback when training completes
    def reload_watcher():
        import time
        while TRAINING_STATUS["is_training"]:
            time.sleep(1)
        load_global_model()
        
    import threading
    threading.Thread(target=reload_watcher).start()
    
    return {
        "message": "Training started in background.",
        "success": started
    }

@app.get("/api/training-status")
def get_training_status():
    return TRAINING_STATUS

@app.post("/api/stop-train")
def stop_train_model():
    global TRAINING_STATUS
    if TRAINING_STATUS["is_training"]:
        TRAINING_STATUS["should_stop"] = True
        return {"message": "Stop signal sent.", "success": True}
    return {"message": "No active training process to stop.", "success": False}

