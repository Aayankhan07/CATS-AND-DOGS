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
        body: JSON.stringify({ epochs, synthetic: false })
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
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>TensorFlow CNN Training Control</h3>
        <p className="card-desc">Trigger a training run of the 2D CNN on the local CIFAR-10 dataset (loaded from cifar-10-python.tar). The training set is balanced to contain 15,000 images total (5,000 Cats, 5,000 Dogs, and 5,000 Neither samples) resized to 32x32x3.</p>

        <form onSubmit={handleStartTraining} className="training-form">
          <div className="form-group">
            <label htmlFor="epochs-input" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Training Epochs</label>
            <div className="epoch-control-row">
              <input
                id="epochs-input"
                type="number"
                min="1"
                max="100"
                className="glass-input epochs-input"
                value={epochs}
                onChange={(e) => setEpochs(parseInt(e.target.value) || 5)}
                disabled={status.is_training}
                style={{ width: '80px', background: 'rgba(0,0,0,0.2)' }}
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
                      background: 'rgba(239, 68, 68, 0.15)', 
                      borderColor: 'rgba(239, 68, 68, 0.25)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      color: '#fca5a5',
                      flex: '0 0 auto',
                      padding: '0 16px',
                      cursor: 'pointer',
                      boxShadow: 'none'
                    }}
                  >
                    Stop
                  </button>
                </div>
              ) : (
                <button 
                  type="submit" 
                  className="glass-button start-train-btn"
                  style={{ flex: 1 }}
                >
                  Train Model
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="training-status-box" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--surface-border)', padding: '14px', borderRadius: '10px' }}>
          <div className="status-header-row">
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Status:</h4>
            <span className={`status-badge ${status.is_training ? 'badge-active' : 'badge-idle'}`} style={{
              fontSize: '0.65rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '4px',
              background: status.is_training ? 'rgba(14, 165, 233, 0.1)' : 'rgba(255,255,255,0.03)',
              color: status.is_training ? 'var(--primary)' : 'var(--text-muted)',
              border: status.is_training ? '1px solid rgba(14, 165, 233, 0.2)' : '1px solid var(--surface-border)'
            }}>
              {status.is_training ? 'TRAINING' : 'IDLE'}
            </span>
          </div>
          <p className="status-msg" style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#e2e8f0', marginTop: '6px' }}>
            "{status.status_message}"
          </p>
          
          {status.is_training && (
            <div className="progress-bar-row" style={{ marginTop: '8px' }}>
              <div className="progress-bar-bg" style={{ height: '5px', background: 'rgba(255,255,255,0.03)' }}>
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--primary), var(--dog))' }}
                />
              </div>
              <span className="progress-text" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {status.current_epoch} / {status.total_epochs} Epochs ({Math.round(progressPercent)}%)
              </span>
            </div>
          )}
        </div>

        <div className="train-metadata" style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '12px' }}>
          <div className="metadata-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>Dataset size (balanced):</span>
            <strong style={{ color: '#fff' }}>{status.dataset_size || 15000} images</strong>
          </div>
          <div className="metadata-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Input Image Resolution:</span>
            <strong style={{ color: '#fff' }}>32x32 (RGB)</strong>
          </div>
        </div>
      </div>

      {/* Metrics Graphs Card */}
      <div className="train-graphs glass-panel">
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>Real-time Metrics Curve</h3>
        <p className="card-desc">Visualize Keras categorical crossentropy training loss and validation accuracy scores across epochs.</p>
        
        {status.loss_history.length > 0 ? (
          <div className="graphs-grid">
            {/* Quick KPI blocks */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.12)', border: '1px solid var(--surface-border)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Best Loss</span>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f59e0b', marginTop: '2px' }}>
                  {Math.min(...status.loss_history).toFixed(4)}
                </div>
              </div>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.12)', border: '1px solid var(--surface-border)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Peak Accuracy</span>
                <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--dog)', marginTop: '2px' }}>
                  {`${Math.round(Math.max(...status.accuracy_history) * 100)}%`}
                </div>
              </div>
            </div>

            {/* Loss graph */}
            <div className="graph-box" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--surface-border)', padding: '12px', borderRadius: '10px' }}>
              <div className="graph-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Training Loss</h4>
                <span className="metric-display" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f59e0b' }}>Current: {getLatestMetric(status.loss_history)}</span>
              </div>
              <div className="svg-wrapper" style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.01)', marginTop: '6px' }}>
                <svg viewBox="0 0 500 150" className="chart-svg">
                  <defs>
                    <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid lines */}
                  <line x1="10" y1="10" x2="490" y2="10" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="10" y1="42.5" x2="490" y2="42.5" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="10" y1="75" x2="490" y2="75" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="10" y1="107.5" x2="490" y2="107.5" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="10" y1="140" x2="490" y2="140" stroke="rgba(255,255,255,0.08)" />
                  
                  {/* Chart Path Area */}
                  <path d={renderSVGArea(status.loss_history, 'loss')} fill="url(#lossGrad)" />
                  {/* Chart Path Line */}
                  <path d={renderSVGPath(status.loss_history, 'loss')} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                  
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
                    
                    const x = numPoints > 1 
                      ? padding + (idx / (numPoints - 1)) * chartW 
                      : padding + chartW / 2;
                    const y = padding + chartH - ((val - minVal) / range) * chartH;
                    
                    return (
                      <circle 
                        key={idx} 
                        cx={x} 
                        cy={y} 
                        r="3" 
                        fill="#f59e0b" 
                        stroke="#090d16" 
                        strokeWidth="1" 
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="graph-x-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Epoch 1</span>
                <span>Epoch {status.loss_history.length}</span>
              </div>
            </div>

            {/* Accuracy graph */}
            <div className="graph-box" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--surface-border)', padding: '12px', borderRadius: '10px' }}>
              <div className="graph-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Validation Accuracy (%)</h4>
                <span className="metric-display" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--dog)' }}>
                  Current: {typeof getLatestMetric(status.accuracy_history) === 'number' 
                    ? `${Math.round(getLatestMetric(status.accuracy_history) * 100)}%` 
                    : '-'}
                </span>
              </div>
              <div className="svg-wrapper" style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.01)', marginTop: '6px' }}>
                <svg viewBox="0 0 500 150" className="chart-svg">
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid lines */}
                  <line x1="10" y1="10" x2="490" y2="10" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="10" y1="42.5" x2="490" y2="42.5" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="10" y1="75" x2="490" y2="75" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="10" y1="107.5" x2="490" y2="107.5" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                  <line x1="10" y1="140" x2="490" y2="140" stroke="rgba(255,255,255,0.08)" />
                  
                  {/* Chart Path Area */}
                  <path d={renderSVGArea(status.accuracy_history, 'accuracy')} fill="url(#accGrad)" />
                  {/* Chart Path Line */}
                  <path d={renderSVGPath(status.accuracy_history, 'accuracy')} fill="none" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
                  
                  {/* Dots on points */}
                  {status.accuracy_history.map((val, idx) => {
                    const width = 500;
                    const height = 150;
                    const padding = 10;
                    const chartW = width - 2 * padding;
                    const chartH = height - 2 * padding;
                    const numPoints = status.accuracy_history.length;
                    
                    const x = numPoints > 1 
                      ? padding + (idx / (numPoints - 1)) * chartW 
                      : padding + chartW / 2;
                    const y = padding + chartH - val * chartH;
                    
                    return (
                      <circle 
                        key={idx} 
                        cx={x} 
                        cy={y} 
                        r="3" 
                        fill="#0d9488" 
                        stroke="#090d16" 
                        strokeWidth="1" 
                      />
                    );
                  })}
                </svg>
              </div>
              <div className="graph-x-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Epoch 1</span>
                <span>Epoch {status.accuracy_history.length}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-graphs" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.01)', padding: '14px', borderRadius: '50%', border: '1px dashed var(--surface-border)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
            </div>
            <p style={{ maxWidth: '280px' }}>Metrics plotting history is currently empty. Run model training to visualize real-time training progress curves.</p>
          </div>
        )}
      </div>
    </div>
  );
}
