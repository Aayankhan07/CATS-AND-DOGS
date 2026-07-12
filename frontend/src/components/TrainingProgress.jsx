'use client';

import React, { useState, useEffect } from 'react';

export default function TrainingProgress() {
  const [status, setStatus] = useState({
    is_training: false,
    current_epoch: 0,
    total_epochs: 0,
    loss_history: [],
    accuracy_history: [],
    status_message: "Loading status...",
    dataset_size: 0
  });

  const [epochs, setEpochs] = useState(10);
  const [useSynthetic, setUseSynthetic] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/training-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch training status:", e);
    }
  };

  // Poll status
  useEffect(() => {
    fetchStatus();
    const intervalTime = status.is_training ? 1000 : 3000;
    const interval = setInterval(fetchStatus, intervalTime);
    return () => clearInterval(interval);
  }, [status.is_training]);

  const handleStartTraining = async (e) => {
    e.preventDefault();
    if (status.is_training) return;

    try {
      const res = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epochs, synthetic: useSynthetic })
      });
      if (res.ok) {
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to start training:", err);
    }
  };

  const handleStopTraining = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/stop-train', {
        method: 'POST'
      });
      if (res.ok) {
        fetchStatus();
      }
    } catch (err) {
      console.error("Failed to stop training:", err);
    }
  };

  // Helper to generate SVG path for history arrays
  const renderSVGPath = (history, type) => {
    if (history.length < 2) return '';
    const width = 500;
    const height = 150;
    const padding = 10;
    
    const chartW = width - 2 * padding;
    const chartH = height - 2 * padding;
    
    const numPoints = history.length;
    
    // Determine bounds
    let maxVal = 1.0;
    let minVal = 0.0;
    
    if (type === 'loss') {
      maxVal = Math.max(...history, 1.0);
      minVal = Math.min(...history, 0.0);
    }
    
    const range = maxVal - minVal || 1.0;
    
    return history.map((val, idx) => {
      const x = padding + (idx / (numPoints - 1)) * chartW;
      const y = padding + chartH - ((val - minVal) / range) * chartH;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Helper to render area fill under SVG line path
  const renderSVGArea = (history, type) => {
    if (history.length < 2) return '';
    const width = 500;
    const height = 150;
    const padding = 10;
    
    const chartW = width - 2 * padding;
    const chartH = height - 2 * padding;
    const numPoints = history.length;
    
    let maxVal = 1.0;
    let minVal = 0.0;
    
    if (type === 'loss') {
      maxVal = Math.max(...history, 1.0);
      minVal = Math.min(...history, 0.0);
    }
    
    const range = maxVal - minVal || 1.0;
    
    const points = history.map((val, idx) => {
      const x = padding + (idx / (numPoints - 1)) * chartW;
      const y = padding + chartH - ((val - minVal) / range) * chartH;
      return `${x},${y}`;
    });
    
    // Close shape along bottom
    const startX = padding;
    const endX = padding + chartW;
    const bottomY = padding + chartH;
    
    return `M ${startX} ${bottomY} L ${points.join(' L ')} L ${endX} ${bottomY} Z`;
  };

  const getLatestMetric = (history) => {
    if (!history || history.length === 0) return '-';
    return history[history.length - 1];
  };

  const progressPercent = status.total_epochs > 0 
    ? (status.current_epoch / status.total_epochs) * 100 
    : 0;

  return (
    <div className="trainer-container">
      {/* Run Controller Card */}
      <div className="train-controller glass-panel">
        <h3>TensorFlow CNN Training Control</h3>
        <p className="card-desc">Trigger a full training run of the 2D Convolutional Neural Network on the CIFAR-10 dataset. The training set is balanced to contain 15,000 images total (5,000 Cats, 5,000 Dogs, and 5,000 Neither samples) resized to 32x32x3.</p>

        <form onSubmit={handleStartTraining} className="training-form">
          <div className="form-group">
            <label htmlFor="epochs-input">Training Epochs</label>
            <div className="epoch-control-row">
              <input
                id="epochs-input"
                type="number"
                min="1"
                max="50"
                className="glass-input epochs-input"
                value={epochs}
                onChange={(e) => setEpochs(parseInt(e.target.value) || 5)}
                disabled={status.is_training}
              />
              {status.is_training ? (
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  <button 
                    type="button"
                    className="glass-button start-train-btn"
                    disabled
                    style={{ flex: 1, opacity: 0.6 }}
                  >
                    Training Active...
                  </button>
                  <button 
                    type="button"
                    onClick={handleStopTraining}
                    className="glass-button stop-train-btn"
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.25)', 
                      borderColor: 'rgba(239, 68, 68, 0.5)',
                      color: '#fca5a5',
                      flex: '0 0 auto',
                      padding: '0 16px',
                      cursor: 'pointer'
                    }}
                  >
                    Stop
                  </button>
                </div>
              ) : (
                <button 
                  type="submit" 
                  className="glass-button start-train-btn"
                >
                  Train Model
                </button>
              )}
            </div>
            
            <div className="synthetic-control" style={{ marginTop: '12px' }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                <input
                  type="checkbox"
                  checked={useSynthetic}
                  onChange={(e) => setUseSynthetic(e.target.checked)}
                  disabled={status.is_training}
                  style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                Use Synthetic Data (Instantly train in-memory without 170MB download)
              </label>
            </div>
          </div>
        </form>

        <div className="training-status-box">
          <div className="status-header-row">
            <h4>System Message:</h4>
            <span className={`status-badge ${status.is_training ? 'badge-active' : 'badge-idle'}`}>
              {status.is_training ? 'TRAINING' : 'IDLE'}
            </span>
          </div>
          <p className="status-msg" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
            "{status.status_message}"
          </p>
          
          {status.is_training && (
            <div className="progress-bar-row">
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="progress-text">{status.current_epoch} / {status.total_epochs} Epochs</span>
            </div>
          )}
        </div>

        <div className="train-metadata">
          <div className="metadata-row">
            <span>Dataset size (balanced):</span>
            <strong>{status.dataset_size || 15000} images</strong>
          </div>
          <div className="metadata-row">
            <span>Input Image Resolution:</span>
            <strong>32x32 (RGB)</strong>
          </div>
        </div>
      </div>

      {/* Metrics Graphs Card */}
      <div className="train-graphs glass-panel">
        <h3>Real-time Metrics Curve</h3>
        <p className="card-desc">Visualize Keras categorical crossentropy training loss and validation accuracy scores across epochs.</p>
        
        {status.loss_history.length > 0 ? (
          <div className="graphs-grid">
            {/* Loss graph */}
            <div className="graph-box">
              <div className="graph-header">
                <h4>Training Loss</h4>
                <span className="metric-display">Current: {getLatestMetric(status.loss_history)}</span>
              </div>
              <div className="svg-wrapper">
                <svg viewBox="0 0 500 150" className="chart-svg">
                  <defs>
                    <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid lines */}
                  <line x1="10" y1="10" x2="490" y2="10" stroke="rgba(255,255,255,0.05)" />
                  <line x1="10" y1="75" x2="490" y2="75" stroke="rgba(255,255,255,0.05)" />
                  <line x1="10" y1="140" x2="490" y2="140" stroke="rgba(255,255,255,0.1)" />
                  
                  {/* Chart Path Area */}
                  <path d={renderSVGArea(status.loss_history, 'loss')} fill="url(#lossGrad)" />
                  {/* Chart Path Line */}
                  <path d={renderSVGPath(status.loss_history, 'loss')} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Dots on points */}
                  {status.loss_history.map((val, idx) => {
                    const width = 500;
                    const height = 150;
                    const padding = 10;
                    const chartW = width - 2 * padding;
                    const chartH = height - 2 * padding;
                    const numPoints = status.loss_history.length;
                    const maxVal = Math.max(...status.loss_history, 1.0);
                    const minVal = Math.min(...status.loss_history, 0.0);
                    const range = maxVal - minVal || 1.0;
                    
                    const x = padding + (idx / (numPoints - 1)) * chartW;
                    const y = padding + chartH - ((val - minVal) / range) * chartH;
                    
                    return (
                      <circle 
                        key={idx} 
                        cx={x} 
                        cy={y} 
                        r="3.5" 
                        fill="#f59e0b" 
                        stroke="#07090e" 
                        strokeWidth="1.5" 
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="graph-x-labels">
                <span>Epoch 1</span>
                <span>Epoch {status.loss_history.length}</span>
              </div>
            </div>

            {/* Accuracy graph */}
            <div className="graph-box">
              <div className="graph-header">
                <h4>Validation Accuracy (%)</h4>
                <span className="metric-display" style={{color: 'var(--dog)'}}>
                  Current: {typeof getLatestMetric(status.accuracy_history) === 'number' 
                    ? `${Math.round(getLatestMetric(status.accuracy_history) * 100)}%` 
                    : '-'}
                </span>
              </div>
              <div className="svg-wrapper">
                <svg viewBox="0 0 500 150" className="chart-svg">
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid lines */}
                  <line x1="10" y1="10" x2="490" y2="10" stroke="rgba(255,255,255,0.05)" />
                  <line x1="10" y1="75" x2="490" y2="75" stroke="rgba(255,255,255,0.05)" />
                  <line x1="10" y1="140" x2="490" y2="140" stroke="rgba(255,255,255,0.1)" />
                  
                  {/* Chart Path Area */}
                  <path d={renderSVGArea(status.accuracy_history, 'accuracy')} fill="url(#accGrad)" />
                  {/* Chart Path Line */}
                  <path d={renderSVGPath(status.accuracy_history, 'accuracy')} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Dots on points */}
                  {status.accuracy_history.map((val, idx) => {
                    const width = 500;
                    const height = 150;
                    const padding = 10;
                    const chartW = width - 2 * padding;
                    const chartH = height - 2 * padding;
                    const numPoints = status.accuracy_history.length;
                    
                    const x = padding + (idx / (numPoints - 1)) * chartW;
                    const y = padding + chartH - val * chartH;
                    
                    return (
                      <circle 
                        key={idx} 
                        cx={x} 
                        cy={y} 
                        r="3.5" 
                        fill="#06b6d4" 
                        stroke="#07090e" 
                        strokeWidth="1.5" 
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="graph-x-labels">
                <span>Epoch 1</span>
                <span>Epoch {status.accuracy_history.length}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-graphs">
            <span className="empty-icon">📈</span>
            <p>Metrics plotting history is currently empty. Run model training to visualize real-time training progress curves.</p>
          </div>
        )}
      </div>
    </div>
  );
}
