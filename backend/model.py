import tensorflow as tf
from tensorflow.keras import layers, models

def build_cnn_model():
    """
    Builds the CNN model architecture.
    Adapted from user's original code to classify 3 classes: Cat, Dog, Neither.
    """
    model = models.Sequential([
        layers.Input(shape=(32, 32, 3)),
        
        # Conv block 1
        layers.Conv2D(32, (3, 3), activation='relu', padding='same'),
        layers.MaxPooling2D((2, 2)),
        
        # Conv block 2
        layers.Conv2D(64, (3, 3), activation='relu', padding='same'),
        layers.MaxPooling2D((2, 2)),
        
        # Fully connected blocks
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dense(3, activation='softmax') # 0: Cat, 1: Dog, 2: Neither
    ])
    
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model
