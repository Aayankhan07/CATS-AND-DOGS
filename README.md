# CIFAR-10 Image CNN Classifier (Cat, Dog, or Neither)

A full-stack, real-time image classification application that predicts whether an uploaded image is a **Cat**, a **Dog**, or **Neither** (e.g., airplanes, cars, ships, frogs, etc.). 

The project features a **FastAPI backend** running a **TensorFlow/Keras 2D CNN** (Convolutional Neural Network) trained on the **CIFAR-10 dataset**, paired with a premium, glassmorphic **Next.js (React) frontend**.

---

## Features

*   **Drag-and-Drop Playground:** Drag and drop any image (PNG, JPG, JPEG) or browse files. The frontend resizes the image and presents real-time classification scores and percentages.
*   **Demo Image Gallery:** Click pre-loaded sample images (Cat, Dog, and Airplane) to immediately test prediction accuracy without downloading local files.
*   **Balanced Neither Classification:** The training pipeline filters CIFAR-10 (original class 3 for Cat, class 5 for Dog) and samples a balanced set of 5,000 images from other classes (planes, ships, frogs) to train the model to output a robust "Neither" class.
*   **Interactive Training Dashboard:** Control and trigger model training directly from the UI. Visualize loss and validation accuracy curves dynamically through a custom **real-time SVG chart** that updates epoch-by-epoch.
*   **Unified Bootstrapping Script:** Single command launcher (`run_app.bat`) that handles virtual environment creation, Python 3.12 environment checking, TensorFlow/pip installations, and starts both dev servers concurrently.

---

## Directory Structure

```text
cats-and-dogs/
├── backend/
│   ├── app.py                # FastAPI server entry point and endpoint routes
│   ├── model.py              # TensorFlow/Keras 2D CNN architecture
│   ├── train.py              # CIFAR-10 downloader, balancer, and background trainer
│   ├── utils.py              # Pillow image preprocessing and normalization
│   ├── requirements.txt      # Python requirements (TensorFlow, FastAPI, NumPy, Pillow)
│   └── test_image_api.py     # Automated unit and integration tests
├── frontend/
│   ├── package.json          # Node dependencies
│   ├── next.config.mjs       # Next.js configurations & API proxy rewrites
│   └── src/
│       ├── app/
│       │   ├── layout.js     # Page metadata & Outfit Google Font loading
│       │   ├── globals.css   # Glassmorphic layout styles and theme colors
│       │   └── page.js       # Main dashboard layout
│       └── components/
│           ├── ImageClassifier.jsx # Drag-and-drop prediction workspace
│           └── TrainingProgress.jsx # Training controller & live SVG chart
├── run_app.bat               # Windows bootstrapper script
└── README.md                 # Project documentation
```

---

## Tech Stack

*   **Frontend:** Next.js (App Router), React, Vanilla CSS (Premium Dark Mode Glassmorphism)
*   **Backend:** FastAPI, Uvicorn, TensorFlow, Keras, NumPy, Pillow (PIL)
*   **ML Dataset:** CIFAR-10 (via Keras datasets)

---

## Quick Start Guide

### Prerequisites
*   **Python 3.12:** TensorFlow is supported on Python 3.12. (The launcher will automatically configure your `venv` to bind to Python 3.12).
*   **Node.js & npm:** For compiling Next.js pages.

### Launching the Application
Double-click the **`run_app.bat`** file in the root directory (or run it via Command Prompt / PowerShell):
```cmd
run_app.bat
```

The bootstrapper script will automatically:
1.  Verify Python and Node.js environments.
2.  Set up a local virtual environment (`venv`) using Python 3.12.
3.  Install TensorFlow, FastAPI, and other dependencies.
4.  Launch the FastAPI server on **`http://127.0.0.1:8000`** in a separate window.
5.  Launch the Next.js frontend on **`http://localhost:3000`** in another window.

Once completed, open your browser and navigate to **`http://localhost:3000`**.

> [!NOTE]
> On the very first startup, if no saved weights are found, the FastAPI backend will run a fast 1-epoch Keras training block to generate a base weights file (`backend/cifar_model.h5`) so that the playground is instantly ready for use.

---

## Automated Verification Tests

To verify that image resizing, Keras CNN layers, and training checkpoints are functional:
1.  Activate the virtual environment:
    ```cmd
    .\venv\Scripts\activate
    ```
2.  Run the automated test suite:
    ```cmd
    python backend/test_image_api.py
    ```

You should see:
```text
=== RUNNING TENSORFLOW BACKEND TESTS ===
Testing image preprocessing...
OK: Image preprocessing test passed.
Testing model structure and forward pass...
OK: Model structures and forward pass test passed.
Testing fast 1-epoch Keras training sanity check...
OK: Training sanity check passed.
=== ALL TESTS COMPLETED SUCCESSFULLY ===
```
