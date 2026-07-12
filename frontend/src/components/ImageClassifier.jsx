'use client';

import React, { useState, useRef } from 'react';

const SAMPLES = [
  {
    name: 'Cat 🐱',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=128&q=80',
    type: 'cat'
  },
  {
    name: 'Dog 🐶',
    url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=128&q=80',
    type: 'dog'
  },
  {
    name: 'Airplane (Neither) 🌐',
    url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=128&q=80',
    type: 'neither'
  }
];

export default function ImageClassifier() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setupFile(file);
    }
  };

  const setupFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Selected file must be an image.');
      return;
    }
    setError('');
    setResult(null);
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setupFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleClear = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    setError('');
  };

  const classifyFile = async (fileToUpload) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Inference failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to the backend server. Make sure the model is trained.');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleSelect = async (url) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "sample.jpg", { type: "image/jpeg" });
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      
      // Classify immediately
      await classifyFile(file);
    } catch (e) {
      setError("Failed to fetch sample image. Check internet connection.");
      setLoading(false);
    }
  };

  const getEmoji = (pred) => {
    if (pred === 'Cat') return '🐱';
    if (pred === 'Dog') return '🐶';
    return '🌐';
  };

  const getClassColor = (pred) => {
    if (pred === 'Cat') return 'var(--cat)';
    if (pred === 'Dog') return 'var(--dog)';
    return 'var(--neither)';
  };

  const getClassGlow = (pred) => {
    if (pred === 'Cat') return 'var(--cat-glow)';
    if (pred === 'Dog') return 'var(--dog-glow)';
    return 'var(--neither-glow)';
  };

  return (
    <div className="classifier-container">
      {/* Upload Zone Panel */}
      <div className="chat-section glass-panel" style={{ height: 'auto', minHeight: '520px' }}>
        <div className="chat-header">
          <div className="chat-indicator"></div>
          <h3>Prediction Playground</h3>
        </div>

        <div className="upload-workspace">
          {imagePreview ? (
            <div className="preview-container animate-fade-in">
              <img src={imagePreview} alt="Upload Preview" className="upload-image-preview" />
              <div className="preview-action-row">
                <button 
                  onClick={handleClear} 
                  className="glass-button clear-btn"
                  disabled={loading}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', boxShadow: 'none' }}
                >
                  Clear
                </button>
                <button 
                  onClick={() => classifyFile()} 
                  className="glass-button classify-btn"
                  disabled={loading}
                >
                  {loading ? 'Analyzing...' : 'Classify Image'}
                </button>
              </div>
            </div>
          ) : (
            <div 
              className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden-file-input" 
                onChange={handleFileChange}
                accept="image/*"
              />
              <span className="upload-icon">📤</span>
              <p className="upload-title">Drag & Drop Image here</p>
              <p className="upload-subtitle">or click to browse from files</p>
              <p className="upload-constraints">Supports PNG, JPG, JPEG (will be resized to 32x32)</p>
            </div>
          )}

          {error && (
            <div className="status-banner banner-error animate-fade-in" style={{ marginTop: '16px' }}>
              {error}
            </div>
          )}

          {/* Sample Gallery */}
          <div className="samples-gallery">
            <h4>Or choose a demo image to test instantly:</h4>
            <div className="samples-grid">
              {SAMPLES.map((sample, idx) => (
                <button 
                  key={idx} 
                  className="sample-card glass-panel"
                  onClick={() => handleSampleSelect(sample.url)}
                  disabled={loading}
                >
                  <img src={sample.url} alt={sample.name} className="sample-thumbnail" />
                  <span>{sample.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Details Panel */}
      <div className="analysis-panel glass-panel" style={{ height: 'auto', minHeight: '520px' }}>
        <h3>Classification Result</h3>
        {result ? (
          <div className="analysis-content animate-fade-in">
            <div className="prediction-focus">
              <div 
                className="focus-circle"
                style={{
                  borderColor: getClassColor(result.prediction),
                  boxShadow: `0 0 30px ${getClassGlow(result.prediction)}`
                }}
              >
                <span className="focus-emoji">{getEmoji(result.prediction)}</span>
                <span className="focus-title">{result.prediction}</span>
                <span className="focus-percentage">{Math.round(result.confidence * 100)}%</span>
              </div>
            </div>

            <div className="prob-list">
              <h4>Model Class Scores</h4>
              
              <div className="prob-bar-row">
                <div className="prob-labels">
                  <span>Cat 🐱</span>
                  <span>{Math.round(result.probabilities.cat * 100)}%</span>
                </div>
                <div className="prob-bar-container">
                  <div 
                    className="prob-bar-fill fill-cat" 
                    style={{ width: `${result.probabilities.cat * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="prob-bar-row">
                <div className="prob-labels">
                  <span>Dog 🐶</span>
                  <span>{Math.round(result.probabilities.dog * 100)}%</span>
                </div>
                <div className="prob-bar-container">
                  <div 
                    className="prob-bar-fill fill-dog" 
                    style={{ width: `${result.probabilities.dog * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="prob-bar-row">
                <div className="prob-labels">
                  <span>Neither 🌐</span>
                  <span>{Math.round(result.probabilities.neither * 100)}%</span>
                </div>
                <div className="prob-bar-container">
                  <div 
                    className="prob-bar-fill fill-neither" 
                    style={{ width: `${result.probabilities.neither * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="model-details-alert">
              <p>
                <strong>CNN Inference Log:</strong> Image resized to 32x32 and classified using Keras weights trained on CIFAR-10.
              </p>
            </div>
          </div>
        ) : (
          <div className="empty-analysis">
            <span className="empty-icon">🖼</span>
            {loading ? (
              <p>Analyzing image structure and predicting classes in TensorFlow... Please wait.</p>
            ) : (
              <p>Upload a custom image or click a sample to see the TensorFlow CNN classification scores and probabilities here.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
