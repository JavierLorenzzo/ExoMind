// Results page JavaScript functionality
class ExoplanetResults {
  constructor() {
    this.loadingState = document.getElementById('loading-state');
    this.resultsContent = document.getElementById('results-content');
    this.errorState = document.getElementById('error-state');
    this.parameterGrid = document.getElementById('parameter-grid');
    this.resultsStorageKey = 'exoai:lastPrediction';

    this.init();
  }

  init() {
    this.setupMobileMenu();
    this.setupEventListeners();
    this.loadResults();
  }

  setupEventListeners() {
    // Download results button
    const downloadBtn = document.getElementById('download-results');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.downloadResults();
      });
    }
  }

  async loadResults() {
    try {
      const stored = this.consumeStoredResults();
      if (stored) {
        this.displayResults(stored.prediction, stored.parameters);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const parameters = this.getParametersFromURL(urlParams);

      if (!parameters || Object.keys(parameters).length === 0) {
        window.location.href = 'predict.html';
        return;
      }

      this.showLoadingState();

      const requestStarted = performance.now();
      const prediction = await this.makePredictionAPICall(parameters);
      const durationMs = Math.max(0, performance.now() - requestStarted);
      const enrichedPrediction = {
        ...prediction,
        processingTimeMs: durationMs,
        processingTime: `${(durationMs / 1000).toFixed(2)}s`,
      };

      this.displayResults(enrichedPrediction, parameters);
    } catch (error) {
      console.error('Error loading results:', error);
      this.showErrorState('Failed to load prediction results. Please try again.');
    }
  }

  getParametersFromURL(urlParams) {
    const parameters = {};
    const paramNames = [
      'koi_period', 'koi_impact', 'koi_duration', 'koi_depth',
      'koi_prad', 'koi_teq', 'koi_insol', 'koi_model_snr',
      'koi_steff', 'koi_slogg', 'koi_srad', 'koi_kepmag'
    ];

    paramNames.forEach(param => {
      const value = urlParams.get(param);
      if (value !== null) {
        parameters[param] = parseFloat(value);
      }
    });

    return parameters;
  }

  consumeStoredResults() {
    try {
      const raw = sessionStorage.getItem(this.resultsStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      sessionStorage.removeItem(this.resultsStorageKey);

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      if (!parsed.prediction || !parsed.parameters) {
        return null;
      }

      if (parsed.generatedAt && typeof parsed.prediction === 'object') {
        parsed.prediction.generatedAt = parsed.generatedAt;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to read stored prediction results', error);
      sessionStorage.removeItem(this.resultsStorageKey);
      return null;
    }
  }

  buildQueryString(parameters) {
    const query = new URLSearchParams();

    Object.entries(parameters).forEach(([key, value]) => {
      if (Number.isFinite(value)) {
        query.append(key, value.toString());
      }
    });

    return query.toString();
  }

  async makePredictionAPICall(parameters) {
    const queryString = this.buildQueryString(parameters);
    const endpoint = queryString ? `/api/predict?${queryString}` : '/api/predict';
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });

      const bodyText = await response.text();
      let payload;
      try {
        payload = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        payload = bodyText;
      }

      if (!response.ok) {
        const detail = payload && typeof payload === 'object' ? (payload.error || payload.details || payload.detail) : payload;
        const message = detail ? `Prediction request failed: ${detail}` : `Prediction request failed with status ${response.status}`;
        throw new Error(message);
      }

      const probability = payload && typeof payload === 'object' ? Number(payload.proba_confirmed) : Number.NaN;

      if (!Number.isFinite(probability)) {
        throw new Error('Prediction response was not understood');
      }

      const toNumber = (value) => (Number.isFinite(value) ? value : 0);
      const confidence = Math.round(probability * 100);

      return {
        isExoplanet: probability >= 0.5,
        confidence,
        score: probability,
        details: {
          transitDepth: toNumber(parameters.koi_depth),
          orbitalPeriod: toNumber(parameters.koi_period),
          planetRadius: toNumber(parameters.koi_prad),
          stellarTemp: toNumber(parameters.koi_steff),
          signalToNoise: toNumber(parameters.koi_model_snr),
        },
      };
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('Prediction request timed out. Please try again.');
      }
      console.error('Prediction request failed', error);
      throw error instanceof Error ? error : new Error('Failed to make prediction API call');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  simulatePrediction(parameters) {
    // Simple heuristic-based simulation for demonstration
    let score = 0.5; // Base score
    
    // Adjust score based on parameters (simplified logic)
    if (parameters.koi_period > 10 && parameters.koi_period < 1000) score += 0.1;
    if (parameters.koi_depth > 100 && parameters.koi_depth < 10000) score += 0.15;
    if (parameters.koi_model_snr > 10) score += 0.1;
    if (parameters.koi_prad > 0.5 && parameters.koi_prad < 10) score += 0.1;
    if (parameters.koi_teq > 200 && parameters.koi_teq < 400) score += 0.05;
    if (parameters.koi_steff > 4000 && parameters.koi_steff < 7000) score += 0.1;
    
    // Add some randomness
    score += (Math.random() - 0.5) * 0.2;
    score = Math.max(0.1, Math.min(0.99, score));
    
    const isExoplanet = score > 0.5;
    const confidence = Math.round(score * 100);
    
    return {
      isExoplanet,
      confidence,
      score,
      processingTime: (Math.random() * 3 + 1).toFixed(1) + 's',
      modelVersion: 'Random Forest v2.1',
      timestamp: new Date().toISOString()
    };
  }

  showLoadingState() {
    this.loadingState.style.display = 'block';
    this.resultsContent.style.display = 'none';
    this.errorState.style.display = 'none';
  }

  showErrorState(message) {
    this.loadingState.style.display = 'none';
    this.resultsContent.style.display = 'none';
    this.errorState.style.display = 'block';
    
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  displayResults(prediction, parameters) {
    const { isExoplanet, confidence, processingTime } = prediction;
    const formattedConfidence = Number.isFinite(confidence) ? confidence : 0;
    const formattedProcessingTime = (typeof processingTime === 'string' && processingTime.trim().length > 0)
      ? processingTime
      : '—';

    // Hide loading, show results
    this.loadingState.style.display = 'none';
    this.resultsContent.style.display = 'block';
    this.errorState.style.display = 'none';
    
    // Update status
    const statusElement = document.getElementById('prediction-status');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');
    const classification = document.getElementById('classification');
    
    if (isExoplanet) {
      statusElement.className = 'prediction-status confirmed';
      statusIcon.textContent = '🪐';
      statusText.textContent = 'Confirmed Exoplanet';
      classification.textContent = 'Confirmed Exoplanet';
    } else {
      statusElement.className = 'prediction-status false-positive';
      statusIcon.textContent = '❌';
      statusText.textContent = 'False Positive';
      classification.textContent = 'False Positive';
    }
    
    // Update probability display
    const probabilityValue = document.getElementById('probability-value');
    const probabilityCircle = document.querySelector('.probability-circle');

    probabilityValue.textContent = formattedConfidence + '%';
    probabilityCircle.style.setProperty('--percentage', (formattedConfidence * 3.6) + 'deg');

    // Update processing time
    const processingTimeElement = document.getElementById('processing-time');
    if (processingTimeElement) {
      processingTimeElement.textContent = formattedProcessingTime;
    }

    // Display parameters
    this.displayParameters(parameters);

    // Store results for download
    this.currentResults = {
      prediction,
      parameters,
      timestamp: typeof prediction.generatedAt === 'string' ? prediction.generatedAt : new Date().toISOString()
    };
  }

  displayParameters(parameters) {
    const parameterLabels = {
      koi_period: 'Orbital Period (days)',
      koi_impact: 'Impact Parameter',
      koi_duration: 'Transit Duration (hours)',
      koi_depth: 'Transit Depth (ppm)',
      koi_prad: 'Planet Radius (Earth radii)',
      koi_teq: 'Equilibrium Temperature (K)',
      koi_insol: 'Insolation (Earth flux)',
      koi_model_snr: 'Signal-to-Noise Ratio',
      koi_steff: 'Stellar Temperature (K)',
      koi_slogg: 'Stellar Surface Gravity',
      koi_srad: 'Stellar Radius (Solar radii)',
      koi_kepmag: 'Kepler Magnitude'
    };

    this.parameterGrid.innerHTML = '';
    
    Object.entries(parameters).forEach(([key, value]) => {
      const parameterItem = document.createElement('div');
      parameterItem.className = 'parameter-item';
      
      parameterItem.innerHTML = `
        <span class="parameter-name">${parameterLabels[key] || key}</span>
        <span class="parameter-value">${value}</span>
      `;
      
      this.parameterGrid.appendChild(parameterItem);
    });
  }

  downloadResults() {
    if (!this.currentResults) {
      this.showNotification('No results to download', 'error');
      return;
    }

    const data = {
      ...this.currentResults,
      downloadedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exoplanet-prediction-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('Results downloaded successfully', 'success');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  setupMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
      });

      document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('active');
          navMenu.classList.remove('active');
        });
      });
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ExoplanetResults();

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
      navbar.style.background = 'rgba(15, 15, 35, 0.98)';
      navbar.style.backdropFilter = 'blur(20px)';
    } else {
      navbar.style.background = 'rgba(15, 15, 35, 0.95)';
      navbar.style.backdropFilter = 'blur(20px)';
    }
  });
});

// Add notification styles
const style = document.createElement('style');
style.textContent = `
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 400px;
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  .notification-success {
    background: var(--success-color);
  }
  
  .notification-error {
    background: var(--error-color);
  }
  
  .notification-warning {
    background: var(--warning-color);
  }
  
  .notification-info {
    background: var(--primary-color);
  }
  
  @media (max-width: 768px) {
    .nav-menu.active {
      display: flex;
      position: absolute;
      top: 70px;
      left: 0;
      width: 100%;
      background: rgba(15, 15, 35, 0.98);
      backdrop-filter: blur(20px);
      flex-direction: column;
      padding: 2rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .hamburger.active span:nth-child(1) {
      transform: rotate(-45deg) translate(-5px, 6px);
    }
    
    .hamburger.active span:nth-child(2) {
      opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
      transform: rotate(45deg) translate(-5px, -6px);
    }
    
    .notification {
      top: 10px;
      right: 10px;
      left: 10px;
      max-width: none;
    }
  }
`;
document.head.appendChild(style);
