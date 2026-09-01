
    (function() {
      'use strict';

      // Intersection Observer for scroll animations
      const observeElements = () => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-visible');
              observer.unobserve(entry.target); // Stop observing once animated
            }
          });
        }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
          observer.observe(el);
        });
      };

      // Carousel functionality
      function setupCarousel(carouselElementId) {
        const carousel = document.getElementById(carouselElementId);
        if (!carousel) return;

        const carouselInner = carousel.querySelector('.carousel-inner');
        const items = carousel.querySelectorAll('.carousel-item');
        const prevButton = carousel.querySelector('.carousel-button.prev');
        const nextButton = carousel.querySelector('.carousel-button.next');
        const dotsContainer = carousel.querySelector('.carousel-dots');

        let currentIndex = parseInt(carouselInner.dataset.currentSlide || '0');
        const totalItems = items.length;
        let autoSlideInterval;

        function updateCarousel() {
          carouselInner.style.transform = `translateX(-${currentIndex * 100}%)`;
          updateDots();
        }

        function createDots() {
          dotsContainer.innerHTML = ''; // Clear existing dots
          items.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.classList.add('carousel-dot');
            if (i === currentIndex) {
              dot.classList.add('active');
            }
            dot.addEventListener('click', () => {
              currentIndex = i;
              updateCarousel();
              resetAutoSlide();
            });
            dotsContainer.appendChild(dot);
          });
        }

        function updateDots() {
          const dots = dotsContainer.querySelectorAll('.carousel-dot');
          dots.forEach((dot, i) => {
            if (i === currentIndex) {
              dot.classList.add('active');
            } else {
              dot.classList.remove('active');
            }
          });
        }

        function showNext() {
          currentIndex = (currentIndex + 1) % totalItems;
          updateCarousel();
          resetAutoSlide();
        }

        function showPrev() {
          currentIndex = (currentIndex - 1 + totalItems) % totalItems;
          updateCarousel();
          resetAutoSlide();
        }

        function startAutoSlide() {
          autoSlideInterval = setInterval(showNext, 5000); // Change slide every 5 seconds
        }

        function resetAutoSlide() {
          clearInterval(autoSlideInterval);
          startAutoSlide();
        }

        // Event listeners
        prevButton.addEventListener('click', showPrev);
        nextButton.addEventListener('click', showNext);

        // Initialize
        createDots();
        updateCarousel(); // Initial rendering
        startAutoSlide(); // Start autoplay

        // Pause autoplay on hover
        carousel.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
        carousel.addEventListener('mouseleave', startAutoSlide);
      }

      // Run on DOM ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          observeElements();
          setupCarousel('hero-carousel'); // Initialize the hero carousel
        });
      } else {
        observeElements();
        setupCarousel('hero-carousel'); // Initialize the hero carousel
      }
    })();
  