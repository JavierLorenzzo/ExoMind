// Prediction page JavaScript functionality
class ExoplanetPredictor {
  constructor() {
    this.form = document.getElementById('prediction-form');
    this.resultsSection = document.getElementById('results-section');
    this.resultsContent = document.getElementById('results-content');
    this.predictBtn = document.getElementById('predict-btn');
    this.btnText = this.predictBtn.querySelector('.btn-text');
    this.btnLoading = this.predictBtn.querySelector('.btn-loading');
    this.resultsStorageKey = 'exoai:lastPrediction';

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupMobileMenu();
    this.setupScrollAnimations();
  }

  setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePrediction();
    });

    // Load example data
    document.getElementById('load-example').addEventListener('click', () => {
      this.loadExampleData();
    });

    // Clear form
    document.getElementById('clear-form').addEventListener('click', () => {
      this.clearForm();
    });

    // Input validation
    this.form.querySelectorAll('input').forEach(input => {
      input.addEventListener('blur', () => {
        this.validateInput(input);
      });
    });
  }

  loadExampleData() {
    // Example data for a confirmed exoplanet (Kepler-452b-like parameters)
    const exampleData = {
      koi_period: 384.84,
      koi_impact: 0.4,
      koi_duration: 10.5,
      koi_depth: 492,
      koi_prad: 1.63,
      koi_teq: 265,
      koi_insol: 1.04,
      koi_model_snr: 18.7,
      koi_steff: 5757,
      koi_slogg: 4.32,
      koi_srad: 1.11,
      koi_kepmag: 13.426
    };

    Object.entries(exampleData).forEach(([key, value]) => {
      const input = document.getElementById(key);
      if (input) {
        input.value = value;
        this.validateInput(input);
      }
    });

    // Show success message
    this.showNotification('Example data loaded successfully!', 'success');
  }

  clearForm() {
    this.form.reset();
    this.resultsSection.style.display = 'none';
    
    // Clear validation states
    this.form.querySelectorAll('.input-group').forEach(group => {
      group.classList.remove('error', 'success');
    });

    this.showNotification('Form cleared', 'info');
  }

  validateInput(input) {
    const group = input.closest('.input-group');
    const value = parseFloat(input.value);

    // Remove previous validation states
    group.classList.remove('error', 'success');

    if (input.value === '') {
      return;
    }

    if (isNaN(value)) {
      group.classList.add('error');
      return false;
    }

    // Basic range validation for some parameters
    const validationRules = {
      koi_period: { min: 0.1, max: 10000 },
      koi_impact: { min: 0, max: 2 },
      koi_duration: { min: 0.1, max: 100 },
      koi_depth: { min: 1, max: 100000 },
      koi_prad: { min: 0.1, max: 50 },
      koi_teq: { min: 100, max: 3000 },
      koi_insol: { min: 0.01, max: 1000 },
      koi_model_snr: { min: 1, max: 1000 },
      koi_steff: { min: 2000, max: 10000 },
      koi_slogg: { min: 2, max: 6 },
      koi_srad: { min: 0.1, max: 10 },
      koi_kepmag: { min: 5, max: 20 }
    };

    const rule = validationRules[input.name];
    if (rule && (value < rule.min || value > rule.max)) {
      group.classList.add('error');
      return false;
    }

    group.classList.add('success');
    return true;
  }

  async handlePrediction() {
    // Validate all inputs
    const inputs = this.form.querySelectorAll('input[required]');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateInput(input) || input.value === '') {
        isValid = false;
      }
    });

    if (!isValid) {
      this.showNotification('Please fill in all fields with valid values', 'error');
      return;
    }

    // Show loading state
    this.setLoadingState(true);
    const requestStarted = performance.now();

    try {
      // Get form data
      const formData = new FormData(this.form);
      const parameters = {};

      for (const [key, value] of formData.entries()) {
        parameters[key] = parseFloat(value);
      }

      const prediction = await this.makePredictionAPICall(parameters);
      const durationMs = Math.max(0, performance.now() - requestStarted);
      const enrichedPrediction = {
        ...prediction,
        processingTimeMs: durationMs,
        processingTime: `${(durationMs / 1000).toFixed(2)}s`,
      };
      this.displayResults(enrichedPrediction, parameters);
    } catch (error) {
      console.error('Prediction error:', error);
      const message = error instanceof Error ? error.message : 'An error occurred during prediction. Please try again.';
      this.showNotification(message, 'error');
    } finally {
      this.setLoadingState(false);
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
    // In real implementation, this would call your trained Random Forest model
    
    let score = 0.5; // Base score
    
    // Adjust score based on parameters (simplified logic)
    if (parameters.koi_period > 10 && parameters.koi_period < 1000) score += 0.1;
    if (parameters.koi_depth > 100 && parameters.koi_depth < 10000) score += 0.15;
    if (parameters.koi_model_snr > 10) score += 0.1;
    if (parameters.koi_prad > 0.5 && parameters.koi_prad < 10) score += 0.1;
    if (parameters.koi_teq > 200 && parameters.koi_teq < 400) score += 0.05;
    if (parameters.koi_steff > 4000 && parameters.koi_steff < 7000) score += 0.1;
    
    // Add some randomness to make it more realistic
    score += (Math.random() - 0.5) * 0.2;
    score = Math.max(0.1, Math.min(0.99, score));
    
    const isExoplanet = score > 0.5;
    const confidence = Math.round(score * 100);
    
    return {
      isExoplanet,
      confidence,
      score,
      details: {
        transitDepth: parameters.koi_depth,
        orbitalPeriod: parameters.koi_period,
        planetRadius: parameters.koi_prad,
        stellarTemp: parameters.koi_steff,
        signalToNoise: parameters.koi_model_snr
      }
    };
  }

  displayResults(prediction, parameters) {
    const payload = {
      prediction,
      parameters,
      generatedAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(this.resultsStorageKey, JSON.stringify(payload));

      const queryString = this.buildQueryString(parameters);
      const targetUrl = queryString ? `results.html?${queryString}` : 'results.html';
      window.location.href = targetUrl;
      return;
    } catch (error) {
      console.error('Redirect to results page failed', error);
      this.showNotification('Unable to open detailed results page, showing results here instead.', 'warning');
    }

    this.renderResultsInline(prediction);
  }

  renderResultsInline(prediction) {
    const { isExoplanet, confidence, details } = prediction;
    const fallbackDetails = {
      transitDepth: 0,
      orbitalPeriod: 0,
      planetRadius: 0,
      stellarTemp: 0,
      signalToNoise: 0,
      ...(details || {}),
    };

    const statusClass = isExoplanet ? 'confirmed' : 'false-positive';
    const statusText = isExoplanet ? 'Confirmed Exoplanet' : 'False Positive';
    const statusIcon = isExoplanet ? '🪐' : '❌';

    this.resultsContent.innerHTML = `
      <div class="prediction-result">
        <div class="prediction-status ${statusClass}">
          ${statusIcon} ${statusText}
        </div>
        <div class="confidence-score">${confidence}%</div>
        <div class="confidence-label">Confidence Score</div>
      </div>
      
      <div class="prediction-details">
        <div class="detail-item">
          <div class="detail-value">${fallbackDetails.transitDepth.toFixed(1)} ppm</div>
          <div class="detail-label">Transit Depth</div>
        </div>
        <div class="detail-item">
          <div class="detail-value">${fallbackDetails.orbitalPeriod.toFixed(2)} days</div>
          <div class="detail-label">Orbital Period</div>
        </div>
        <div class="detail-item">
          <div class="detail-value">${fallbackDetails.planetRadius.toFixed(2)} R⊕</div>
          <div class="detail-label">Planet Radius</div>
        </div>
        <div class="detail-item">
          <div class="detail-value">${fallbackDetails.stellarTemp.toFixed(0)} K</div>
          <div class="detail-label">Stellar Temperature</div>
        </div>
        <div class="detail-item">
          <div class="detail-value">${fallbackDetails.signalToNoise.toFixed(1)}</div>
          <div class="detail-label">Signal-to-Noise</div>
        </div>
      </div>
    `;

    this.resultsSection.style.display = 'block';
    this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const message = isExoplanet
      ? `Prediction complete! High confidence exoplanet detected (${confidence}%)`
      : `Prediction complete! Likely false positive (${confidence}% confidence)`;

    this.showNotification(message, isExoplanet ? 'success' : 'warning');
  }

  setLoadingState(loading) {
    if (loading) {
      this.predictBtn.disabled = true;
      this.btnText.style.display = 'none';
      this.btnLoading.style.display = 'flex';
    } else {
      this.predictBtn.disabled = false;
      this.btnText.style.display = 'inline';
      this.btnLoading.style.display = 'none';
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove notification
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

      // Close menu when clicking on a link
      document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('active');
          navMenu.classList.remove('active');
        });
      });
    }
  }

  setupScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    // Animate elements
    document.querySelectorAll('.parameter-group, .info-card').forEach((element, index) => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(30px)';
      element.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
      observer.observe(element);
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ExoplanetPredictor();

  // Add ripple effect to buttons
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      button.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

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
  
  .btn {
    position: relative;
    overflow: hidden;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
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
