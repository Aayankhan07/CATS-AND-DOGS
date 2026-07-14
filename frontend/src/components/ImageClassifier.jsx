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
                  style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5', boxShadow: 'none' }}
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
              style={{ padding: '40px 20px' }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden-file-input" 
                onChange={handleFileChange}
                accept="image/*"
              />
              <div style={{ background: 'rgba(14, 165, 233, 0.05)', border: '1px solid rgba(14, 165, 233, 0.15)', padding: '12px', borderRadius: '50%', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="upload-icon" style={{ fontSize: '1.6rem', margin: 0 }}>📤</span>
              </div>
              <p className="upload-title" style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>Drag & Drop Image here</p>
              <p className="upload-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>or click to browse from files</p>
              <p className="upload-constraints" style={{ fontSize: '0.7rem', opacity: 0.6 }}>Supports PNG, JPG, JPEG (will be resized to 32x32)</p>
            </div>
          )}

          {error && (
            <div className="status-banner banner-error animate-fade-in" style={{ marginTop: '16px' }}>
              {error}
            </div>
          )}

          {/* Sample Gallery */}
          <div className="samples-gallery">
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Or select a test image:</h4>
            <div className="samples-grid">
              {SAMPLES.map((sample, idx) => (
                <button 
                  key={idx} 
                  className="sample-card glass-panel"
                  onClick={() => handleSampleSelect(sample.url)}
                  disabled={loading}
                  style={{ background: 'rgba(0,0,0,0.12)' }}
                >
                  <img src={sample.url} alt={sample.name} className="sample-thumbnail" />
                  <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{sample.name}</span>
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
            <div className="prediction-focus" style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
              {/* Circular Gauge */}
              <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  {/* Background track */}
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    fill="transparent"
                    stroke="rgba(255, 255, 255, 0.03)"
                    strokeWidth="6"
                  />
                  {/* Active track */}
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    fill="transparent"
                    stroke={getClassColor(result.prediction)}
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 64}
                    strokeDashoffset={2 * Math.PI * 64 - (result.confidence * 2 * Math.PI * 64)}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                </svg>
                
                {/* Text centered inside the gauge */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '160px',
                  height: '160px',
                  display: 'flex',
                  flex-direction: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{getEmoji(result.prediction)}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff', marginTop: '4px' }}>
                    {result.prediction}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: getClassColor(result.prediction) }}>
                    {Math.round(result.confidence * 100)}% Match
                  </span>
                </div>
              </div>
            </div>

            <div className="prob-list">
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Model Class Scores</h4>
              
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
            
            {/* Terminal-style Inference Logs */}
            <div className="terminal-panel" style={{ marginTop: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              <div className="terminal-header" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.02)', padding: '5px 12px', borderBottom: '1px solid var(--surface-border)' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444' }}></span>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b' }}></span>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '4px', fontFamily: 'monospace' }}>cifar10_inference.sh</span>
              </div>
              <div style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.7rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <span style={{ color: 'var(--primary)' }}>$</span> python classify.py --input={result.filename}<br />
                <span style={{ color: '#64748b' }}>[INFO] Loaded CIFAR-10 model (TensorFlow/Keras H5)</span><br />
                <span style={{ color: '#64748b' }}>[INFO] Preprocessed image matrix (32x32x3)</span><br />
                <span style={{ color: '#10b981' }}>[SUCCESS] Prediction: {result.prediction} ({Math.round(result.confidence * 100)}% match)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-analysis">
            <div style={{ background: 'rgba(255,255,255,0.01)', padding: '14px', borderRadius: '50%', border: '1px dashed var(--surface-border)', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="empty-icon" style={{ fontSize: '1.8rem', opacity: 0.6, margin: 0 }}>🖼</span>
            </div>
            {loading ? (
              <p>Analyzing image structure and predicting classes in TensorFlow... Please wait.</p>
            ) : (
              <p style={{ maxWidth: '280px' }}>Upload a custom image or click a sample to see the TensorFlow CNN classification scores and probabilities here.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
