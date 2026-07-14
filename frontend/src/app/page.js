'use client';

import React, { useState, useEffect } from 'react';
import ImageClassifier from '../components/ImageClassifier';
import TrainingProgress from '../components/TrainingProgress';

export default function Home() {
  const [activeTab, setActiveTab] = useState('playground'); // 'playground' | 'training'
  const [isOnline, setIsOnline] = useState(null); // null = checking, true = online, false = offline

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/training-status');
      setIsOnline(res.ok);
    } catch (e) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout-wrapper">
      {/* Top Header */}
      <header className="app-header">
        <div className="logo-section">
          <span className="logo-icon">🧠</span>
          <div className="logo-text">
            <h1>CIFAR-10 CNN Classifier</h1>
            <p>Cat, Dog, or Neither?</p>
          </div>
        </div>
        
        {/* Navigation Tabs & Health status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="api-health-badge">
            <span className={`health-dot ${isOnline === true ? 'online' : isOnline === false ? 'offline' : 'checking'}`}></span>
            <span className="health-text">
              {isOnline === true ? 'FastAPI Online' : isOnline === false ? 'FastAPI Offline' : 'Connecting...'}
            </span>
          </div>

          <nav className="nav-tabs">
            <button 
              className={`nav-tab-btn ${activeTab === 'playground' ? 'active' : ''}`}
              onClick={() => setActiveTab('playground')}
            >
              🖼 Playground
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === 'training' ? 'active' : ''}`}
              onClick={() => setActiveTab('training')}
            >
              ⚙️ Dashboard
            </button>
          </nav>
        </div>
      </header>

      <div className="app-layout">
        {/* Main Content Area */}
        <main className="main-content">
          {activeTab === 'playground' && <ImageClassifier />}
          {activeTab === 'training' && <TrainingProgress />}
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <p>Built with ⚡ TensorFlow, FastAPI, and Next.js</p>
        </footer>
      </div>
    </div>
  );
}
