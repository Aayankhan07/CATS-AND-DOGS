'use client';

import React, { useState } from 'react';
import ImageClassifier from '../components/ImageClassifier';
import TrainingProgress from '../components/TrainingProgress';

export default function Home() {
  const [activeTab, setActiveTab] = useState('playground'); // 'playground' | 'training'

  return (
    <div className="app-layout">
      {/* Top Header */}
      <header className="app-header glass-panel">
        <div className="logo-section">
          <span className="logo-icon">🧠</span>
          <div className="logo-text">
            <h1>CIFAR-10 CNN Classifier</h1>
            <p>Cat, Dog, or Neither?</p>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === 'playground' ? 'active' : ''}`}
            onClick={() => setActiveTab('playground')}
          >
            🖼 Classifier Playground
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'training' ? 'active' : ''}`}
            onClick={() => setActiveTab('training')}
          >
            ⚙️ Training Dashboard
          </button>
        </nav>
      </header>

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
  );
}
