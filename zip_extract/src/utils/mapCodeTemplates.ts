/**
 * Map code templates for AI Code Assistant
 * These templates generate integrated code that properly embeds maps into full websites
 */

export interface MapCodeTemplate {
  name: string;
  description: string;
  category: 'basic' | 'business' | 'interactive' | 'styled';
  htmlCode: string;
  jsCode: string;
  cssCode: string;
  reactCode: string;
}

export const mapCodeTemplates: MapCodeTemplate[] = [
  {
    name: 'Complete Landing Page with Integrated Map',
    description: 'Full responsive landing page with hero section and seamlessly integrated map',
    category: 'business',
    htmlCode: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visit Our Location</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <!-- Hero Section -->
    <section class="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div class="container mx-auto px-6 py-16">
            <div class="text-center">
                <h1 class="text-4xl md:text-6xl font-bold mb-6">Visit Our Location</h1>
                <p class="text-xl md:text-2xl mb-8 opacity-90">Discover our premium services in the heart of the city</p>
                <button onclick="document.getElementById('map-section').scrollIntoView({behavior:'smooth'})" class="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition duration-300">Find Us Now</button>
            </div>
        </div>
    </section>

    <!-- Services Grid -->
    <section class="py-16">
        <div class="container mx-auto px-6">
            <h2 class="text-3xl font-bold text-center mb-12 text-gray-800">Why Choose Us</h2>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="text-center p-6 bg-white rounded-lg shadow-lg">
                    <div class="text-4xl mb-4">🏢</div>
                    <h3 class="text-xl font-semibold mb-3">Prime Location</h3>
                    <p class="text-gray-600">Located in downtown for easy access</p>
                </div>
                <div class="text-center p-6 bg-white rounded-lg shadow-lg">
                    <div class="text-4xl mb-4">⭐</div>
                    <h3 class="text-xl font-semibold mb-3">Premium Service</h3>
                    <p class="text-gray-600">Award-winning customer service</p>
                </div>
                <div class="text-center p-6 bg-white rounded-lg shadow-lg">
                    <div class="text-4xl mb-4">🚗</div>
                    <h3 class="text-xl font-semibold mb-3">Easy Parking</h3>
                    <p class="text-gray-600">Convenient parking available</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Integrated Map Section -->
    <section class="py-16 bg-white" id="map-section">
        <div class="container mx-auto px-6">
            <div class="text-center mb-12">
                <h2 class="text-3xl font-bold mb-4 text-gray-800">Find Our Location</h2>
                <p class="text-gray-600 max-w-2xl mx-auto">We're conveniently located in downtown with easy access to transportation.</p>
            </div>
            
            <div class="grid lg:grid-cols-2 gap-12 items-start">
                <div class="order-2 lg:order-1">
                    <div id="map" class="w-full h-96 rounded-xl shadow-lg border-2 border-gray-200"></div>
                </div>
                
                <div class="order-1 lg:order-2 space-y-6">
                    <div class="bg-gray-50 p-6 rounded-xl">
                        <h3 class="text-xl font-semibold mb-4 text-gray-800">Contact Information</h3>
                        <div class="space-y-4">
                            <div class="flex items-center">
                                <span class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 text-blue-600">📍</span>
                                <div>
                                    <p class="font-medium text-gray-800">Address</p>
                                    <p class="text-gray-600">123 Main Street, New York, NY 10001</p>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <span class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4 text-green-600">📞</span>
                                <div>
                                    <p class="font-medium text-gray-800">Phone</p>
                                    <p class="text-gray-600">(555) 123-4567</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=40.7128,-74.0060', '_blank')" class="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300">Get Directions</button>
                </div>
            </div>
        </div>
    </section>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Dynamically load Leaflet
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
            
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = function() {
                // Initialize the map
                const map = L.map('map').setView([40.7128, -74.0060], 15);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                
                // Custom marker
                const businessIcon = L.divIcon({
                    html: '<div style="background: #2563eb; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"><div style="width: 12px; height: 12px; background: white; border-radius: 50%;"></div></div>',
                    className: 'custom-marker',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                
                L.marker([40.7128, -74.0060], { icon: businessIcon })
                    .addTo(map)
                    .bindPopup('<div style="text-align: center;"><h3>Our Location</h3><p>123 Main Street<br>New York, NY 10001</p></div>')
                    .openPopup();
            };
            document.head.appendChild(script);
        });
    </script>
</body>
</html>`,
    jsCode: `// Integrated Map JavaScript - Embeds seamlessly into any existing page
function addMapToPage(options = {}) {
    const config = {
        containerId: options.containerId || 'map',
        lat: options.lat || 40.7128,
        lng: options.lng || -74.0060,
        zoom: options.zoom || 15,
        title: options.title || 'Our Location',
        address: options.address || '123 Main Street, New York, NY 10001',
        ...options
    };

    // Create integrated map section if container doesn't exist
    if (!document.getElementById(config.containerId)) {
        const section = document.createElement('section');
        section.innerHTML = \`
            <div style="padding: 60px 20px; background: #f8fafc;">
                <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
                    <h2 style="font-size: 2.5rem; font-weight: bold; color: #1f2937; margin-bottom: 1rem;">\${config.title}</h2>
                    <p style="color: #6b7280; margin-bottom: 3rem;">Find us at our convenient location</p>
                    <div id="\${config.containerId}" style="height: 400px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin-bottom: 2rem;"></div>
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: inline-block;">
                        <h3 style="margin: 0 0 1rem 0; color: #1f2937;">Contact Information</h3>
                        <p style="margin: 0.5rem 0; color: #6b7280;">📍 \${config.address}</p>
                        <p style="margin: 0.5rem 0; color: #6b7280;">📞 (555) 123-4567</p>
                        <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=\${config.lat},\${config.lng}', '_blank')" style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 8px; margin-top: 1rem; cursor: pointer; font-weight: 600;">Get Directions</button>
                    </div>
                </div>
            </div>
        \`;
        document.body.appendChild(section);
    }

    // Load Leaflet and initialize map
    if (typeof L === 'undefined') {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => createIntegratedMap(config);
        document.head.appendChild(script);
    } else {
        createIntegratedMap(config);
    }
}

function createIntegratedMap(config) {
    const map = L.map(config.containerId).setView([config.lat, config.lng], config.zoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    const businessIcon = L.divIcon({
        html: '<div style="background: #2563eb; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div></div>',
        className: 'integrated-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    L.marker([config.lat, config.lng], { icon: businessIcon })
        .addTo(map)
        .bindPopup(\`<div style="text-align: center; font-family: system-ui, sans-serif;"><h3 style="margin: 0 0 8px 0;">\${config.title}</h3><p style="margin: 0; color: #666;">\${config.address}</p></div>\`)
        .openPopup();
    
    return map;
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => addMapToPage());
} else {
    addMapToPage();
}`,
    cssCode: `/* Integrated Map Styles - Seamlessly blends into any website */
.map-integrated-section {
    padding: 80px 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    text-align: center;
}

.map-container {
    max-width: 1200px;
    margin: 0 auto;
}

.map-title {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: bold;
    color: #1f2937;
    margin-bottom: 1rem;
}

.map-subtitle {
    color: #6b7280;
    font-size: 1.1rem;
    margin-bottom: 3rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

#map {
    height: 450px;
    width: 100%;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border: 3px solid white;
    margin-bottom: 2rem;
}

.map-info-card {
    background: white;
    padding: 2.5rem;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    display: inline-block;
    text-align: left;
    max-width: 400px;
}

.map-info-card h3 {
    margin: 0 0 1.5rem 0;
    color: #1f2937;
    font-size: 1.25rem;
    text-align: center;
}

.contact-item {
    display: flex;
    align-items: center;
    margin: 1rem 0;
    padding: 0.5rem 0;
}

.contact-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 1rem;
    font-size: 1.2rem;
}

.directions-btn {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 1.5rem;
    width: 100%;
}

.directions-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
}

/* Leaflet popup customization */
.leaflet-popup-content-wrapper {
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.leaflet-popup-tip {
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* Responsive design */
@media (max-width: 768px) {
    .map-integrated-section {
        padding: 60px 16px;
    }
    
    #map {
        height: 300px;
        border-radius: 12px;
    }
    
    .map-info-card {
        padding: 1.5rem;
        margin: 0 16px;
    }
    
    .directions-btn {
        padding: 12px 24px;
    }
}

@media (max-width: 480px) {
    .map-title {
        font-size: 2rem;
    }
    
    #map {
        height: 250px;
    }
}`,
    reactCode: `import React, { useEffect, useRef } from 'react';

interface BusinessMapPageProps {
  title?: string;
  address?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
}

const BusinessMapPage: React.FC<BusinessMapPageProps> = ({
  title = "Visit Our Location",
  address = "123 Main Street, New York, NY 10001",
  phone = "(555) 123-4567",
  lat = 40.7128,
  lng = -74.0060,
  zoom = 15
}) => {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const initMap = () => {
      if (typeof window !== 'undefined' && (window as any).L && mapRef.current) {
        const L = (window as any).L;
        const map = L.map(mapRef.current).setView([lat, lng], zoom);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        const businessIcon = L.divIcon({
          html: '<div style="background: #2563eb; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"><div style="width: 12px; height: 12px; background: white; border-radius: 50%;"></div></div>',
          className: 'custom-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        
        L.marker([lat, lng], { icon: businessIcon })
          .addTo(map)
          .bindPopup(\`<div style="text-align: center;"><h3>Our Location</h3><p>\${address}</p></div>\`)
          .openPopup();
      }
    };

    // Load Leaflet dynamically
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [lat, lng, zoom, address]);

  const scrollToMap = () => {
    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const getDirections = () => {
    window.open(\`https://www.google.com/maps/dir/?api=1&destination=\${lat},\${lng}\`, '_blank');
  };

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{title}</h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Discover our premium services in the heart of the city
            </p>
            <button 
              onClick={scrollToMap}
              className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition duration-300"
            >
              Find Us Now
            </button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Why Choose Us</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-lg shadow-lg">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-xl font-semibold mb-3">Prime Location</h3>
              <p className="text-gray-600">Located in downtown for easy access</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-lg">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="text-xl font-semibold mb-3">Premium Service</h3>
              <p className="text-gray-600">Award-winning customer service</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-lg">
              <div className="text-4xl mb-4">🚗</div>
              <h3 className="text-xl font-semibold mb-3">Easy Parking</h3>
              <p className="text-gray-600">Convenient parking available</p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrated Map Section */}
      <section className="py-16 bg-white" id="map-section">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">Find Our Location</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We're conveniently located in downtown with easy access to transportation.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="order-2 lg:order-1">
              <div 
                ref={mapRef}
                className="w-full h-96 rounded-xl shadow-lg border-2 border-gray-200"
              ></div>
            </div>
            
            <div className="order-1 lg:order-2 space-y-6">
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <span className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 text-blue-600">
                      📍
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">Address</p>
                      <p className="text-gray-600">{address}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4 text-green-600">
                      📞
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">Phone</p>
                      <p className="text-gray-600">{phone}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={getDirections}
                className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300"
              >
                Get Directions
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BusinessMapPage;`
  }
];

export const generateMapCode = (prompt: string): MapCodeTemplate | null => {
  const normalizedPrompt = prompt.toLowerCase();
  
  // For any map-related request, return the comprehensive integrated template
  if (normalizedPrompt.includes('map') || 
      normalizedPrompt.includes('location') || 
      normalizedPrompt.includes('contact') ||
      normalizedPrompt.includes('business') ||
      normalizedPrompt.includes('landing') ||
      normalizedPrompt.includes('website')) {
    return mapCodeTemplates[0]; // Complete integrated page
  }
  
  return mapCodeTemplates[0]; // Default to integrated template
};

export const getAllMapTemplates = (): MapCodeTemplate[] => {
  return mapCodeTemplates;
};