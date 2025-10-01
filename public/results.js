// Results page JavaScript functionality
class ExoplanetResults {
  constructor() {
    this.loadingState = document.getElementById('loading-state');
    this.resultsContent = document.getElementById('results-content');
    this.errorState = document.getElementById('error-state');
    this.parameterGrid = document.getElementById('parameter-grid');
    
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
      // Get parameters from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const parameters = this.getParametersFromURL(urlParams);
      
      if (!parameters || Object.keys(parameters).length === 0) {
        // If no parameters, redirect to predict page
        window.location.href = 'predict.html';
        return;
      }

      // Show loading state
      this.showLoadingState();

      // Make API call (placeholder for now)
      const prediction = await this.makePredictionAPICall(parameters);
      
      // Display results
      this.displayResults(prediction, parameters);
      
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

  async makePredictionAPICall(parameters) {
    // Placeholder API call - replace with actual endpoint
    const API_ENDPOINT = 'https://api.exoai.space/predict'; // Placeholder URL
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, return simulated results
      // In production, replace this with actual API call:
      /*
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify(parameters)
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      return await response.json();
      */
      
      // Simulated prediction logic
      return this.simulatePrediction(parameters);
      
    } catch (error) {
      console.error('API call failed:', error);
      throw new Error('Failed to get prediction from API');
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
    
    probabilityValue.textContent = confidence + '%';
    probabilityCircle.style.setProperty('--percentage', (confidence * 3.6) + 'deg');
    
    // Update processing time
    const processingTimeElement = document.getElementById('processing-time');
    if (processingTimeElement) {
      processingTimeElement.textContent = processingTime;
    }
    
    // Display parameters
    this.displayParameters(parameters);
    
    // Store results for download
    this.currentResults = {
      prediction,
      parameters,
      timestamp: new Date().toISOString()
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