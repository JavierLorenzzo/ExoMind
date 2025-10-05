// Learn More page JavaScript functionality
class LearnMorePage {
  constructor() {
    this.init();
  }

  init() {
    this.setupScrollAnimations();
    this.setupMobileMenu();
    this.setupSmoothScroll();
    this.setupCounterAnimations();
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

    // Animate cards and sections
    const animatedElements = [
      '.advantage-card',
      '.step',
      '.metric-card',
      '.team-member',
      '.publication-card',
      '.section-header'
    ];

    animatedElements.forEach(selector => {
      document.querySelectorAll(selector).forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(element);
      });
    });
  }

  setupCounterAnimations() {
    const metricValues = document.querySelectorAll('.metric-value');
    const observerOptions = {
      threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateMetric(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    metricValues.forEach(metric => observer.observe(metric));
  }

  animateMetric(element) {
    const text = element.textContent;
    const isPercentage = text.includes('%');
    const isDecimal = text.includes('.');
    
    let target;
    if (isPercentage) {
      target = parseFloat(text.replace('%', ''));
    } else if (isDecimal) {
      target = parseFloat(text);
    } else {
      target = parseInt(text);
    }

    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      
      let displayValue;
      if (isDecimal) {
        displayValue = current.toFixed(1);
      } else {
        displayValue = Math.floor(current);
      }
      
      if (isPercentage) {
        element.textContent = displayValue + '%';
      } else {
        element.textContent = displayValue;
      }
    }, 16);
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

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }
}

// Enhanced interactions
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the learn more page controller
  new LearnMorePage();

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

  // Enhanced hover effects for cards
  document.querySelectorAll('.advantage-card, .metric-card, .team-member, .publication-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
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

// Add CSS for ripple effect (reuse from main page)
const style = document.createElement('style');
style.textContent = `
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
  }
`;
document.head.appendChild(style);