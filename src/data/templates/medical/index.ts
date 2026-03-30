/**
 * Medical / Healthcare Premium Templates
 * 
 * Features:
 * - Services with patient-focused messaging
 * - Provider profiles/team section
 * - Patient intake/appointment form
 * - Insurance information
 * - HIPAA-friendly design patterns
 * - Industry-specific color palette (teal/cyan)
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const MEDICAL_STYLES = `
<style>
${ADVANCED_CSS}

/* Medical-specific overrides */
.gradient-text {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-primary {
  background: linear-gradient(135deg, #0891b2, #0e7490);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #0e7490, #155e75);
}

.card-highlight::before {
  background: linear-gradient(135deg, #06b6d415, #0891b215);
}

.badge-primary {
  background: linear-gradient(135deg, #06b6d420, #0891b220);
  border-color: #06b6d440;
}

.text-accent {
  color: #06b6d4;
}

/* Provider card */
.provider-card {
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.provider-card:hover {
  transform: translateY(-4px);
}

.provider-card .credentials {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.credential-badge {
  padding: 0.25rem 0.5rem;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 0.25rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #06b6d4;
}

/* Service feature list */
.service-features {
  display: grid;
  gap: 0.75rem;
}

.service-feature {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255,255,255,0.02);
  border-radius: 0.5rem;
}

.feature-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #06b6d420, #0891b220);
  border-radius: 0.5rem;
  font-size: 1rem;
  flex-shrink: 0;
}

/* Trust indicators */
.trust-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(6, 182, 212, 0.05);
  border: 1px solid rgba(6, 182, 212, 0.1);
  border-radius: 0.5rem;
}

/* Appointment form */
.appointment-form {
  position: relative;
}

.appointment-form::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #06b6d4, #0891b2);
  border-radius: 1rem 1rem 0 0;
}
</style>
`;

const medicalClinic = `
${MEDICAL_STYLES}
<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold tracking-tight">Vitality<span class="text-cyan-400">+</span></a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#services" class="nav-link">Services</a>
      <a href="#providers" class="nav-link">Our Team</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#insurance" class="nav-link">Insurance</a>
    </div>
    <div class="flex items-center gap-4">
      <a href="tel:555-123-4567" class="hidden md:flex items-center gap-2 text-sm font-medium">
        <span>📞</span> (555) 123-4567
      </a>
      <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="booking.create">
        Book Appointment
      </button>
    </div>
  </div>
</nav>

<!-- Hero Section -->
<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1920&q=80" alt="" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50"></div>
  </div>
  
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">
        <span class="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
        Accepting New Patients
      </span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">
        Compassionate Care for Your <span class="gradient-text">Whole Family</span>
      </h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">
        Expert primary care, preventive services, and specialized treatments. We're here to help you live your healthiest life.
      </p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">
          Schedule Appointment
        </button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#services"}'>
          View Services
        </button>
      </div>
      
      <!-- Trust indicators -->
      <div class="flex flex-wrap gap-4 mt-12 animate-fade-in-up stagger-4">
        <div class="trust-indicator">
          <span class="text-cyan-400">✓</span>
          <span class="text-sm">Same-Day Appointments</span>
        </div>
        <div class="trust-indicator">
          <span class="text-cyan-400">✓</span>
          <span class="text-sm">Telehealth Available</span>
        </div>
        <div class="trust-indicator">
          <span class="text-cyan-400">✓</span>
          <span class="text-sm">Most Insurance Accepted</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Services Section -->
<section id="services" class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="services">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-cyan-400">What We Offer</span>
      <h2 class="headline-lg mt-4">Our Services</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Comprehensive healthcare services for patients of all ages.</p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-2xl mb-6">🩺</div>
        <h3 class="text-xl font-bold mb-3">Primary Care</h3>
        <p class="body-md mb-4">Annual checkups, preventive care, and management of chronic conditions.</p>
        <ul class="service-features">
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Annual wellness exams</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Chronic disease management</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Immunizations</span>
          </li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-2xl mb-6">👨‍👩‍👧‍👦</div>
        <h3 class="text-xl font-bold mb-3">Family Medicine</h3>
        <p class="body-md mb-4">Care for every member of your family, from newborns to seniors.</p>
        <ul class="service-features">
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Pediatric care</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Women's health</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Geriatric care</span>
          </li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-2xl mb-6">🏃</div>
        <h3 class="text-xl font-bold mb-3">Sports Medicine</h3>
        <p class="body-md mb-4">Injury treatment, prevention, and performance optimization.</p>
        <ul class="service-features">
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Injury evaluation</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Physical therapy</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Sports physicals</span>
          </li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-2xl mb-6">💊</div>
        <h3 class="text-xl font-bold mb-3">Urgent Care</h3>
        <p class="body-md mb-4">Walk-in care for non-emergency conditions when you need it.</p>
        <ul class="service-features">
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Same-day visits</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Minor injury treatment</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Illness care</span>
          </li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-2xl mb-6">🧠</div>
        <h3 class="text-xl font-bold mb-3">Mental Health</h3>
        <p class="body-md mb-4">Comprehensive mental health support and counseling services.</p>
        <ul class="service-features">
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Depression & anxiety</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Therapy sessions</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Medication management</span>
          </li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-2xl mb-6">📱</div>
        <h3 class="text-xl font-bold mb-3">Telehealth</h3>
        <p class="body-md mb-4">Virtual visits from the comfort of your home.</p>
        <ul class="service-features">
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Video consultations</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Prescription refills</span>
          </li>
          <li class="service-feature">
            <span class="feature-icon">✓</span>
            <span class="text-sm">Follow-up visits</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- Providers Section -->
<section id="providers" class="section-spacing" data-ut-section="team">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-cyan-400">Meet Your Care Team</span>
      <h2 class="headline-lg mt-4">Our Providers</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Experienced, board-certified physicians dedicated to your health.</p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="provider-card card" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-6">
          <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        </div>
        <h3 class="text-xl font-bold">Dr. Sarah Mitchell</h3>
        <p class="text-cyan-400 text-sm mb-2">Family Medicine</p>
        <p class="body-md mb-4">15+ years of experience in primary and family care.</p>
        <div class="credentials">
          <span class="credential-badge">MD</span>
          <span class="credential-badge">Board Certified</span>
          <span class="credential-badge">ABFM</span>
        </div>
        <button class="mt-4 btn-ghost text-cyan-400 w-full" data-ut-intent="booking.create" data-payload='{"provider":"dr-mitchell"}'>
          Book with Dr. Mitchell →
        </button>
      </div>
      
      <div class="provider-card card" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-6">
          <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        </div>
        <h3 class="text-xl font-bold">Dr. James Chen</h3>
        <p class="text-cyan-400 text-sm mb-2">Internal Medicine</p>
        <p class="body-md mb-4">Specializing in chronic disease management and preventive care.</p>
        <div class="credentials">
          <span class="credential-badge">MD, PhD</span>
          <span class="credential-badge">Board Certified</span>
        </div>
        <button class="mt-4 btn-ghost text-cyan-400 w-full" data-ut-intent="booking.create" data-payload='{"provider":"dr-chen"}'>
          Book with Dr. Chen →
        </button>
      </div>
      
      <div class="provider-card card" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-6">
          <img src="https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        </div>
        <h3 class="text-xl font-bold">Dr. Maria Rodriguez</h3>
        <p class="text-cyan-400 text-sm mb-2">Pediatrics</p>
        <p class="body-md mb-4">Caring for children from newborns through adolescence.</p>
        <div class="credentials">
          <span class="credential-badge">MD</span>
          <span class="credential-badge">AAP Fellow</span>
          <span class="credential-badge">PALS</span>
        </div>
        <button class="mt-4 btn-ghost text-cyan-400 w-full" data-ut-intent="booking.create" data-payload='{"provider":"dr-rodriguez"}'>
          Book with Dr. Rodriguez →
        </button>
      </div>
    </div>
  </div>
</section>

<!-- Appointment Form Section -->
<section class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="appointment_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-cyan-400">Get Started</span>
      <h2 class="headline-lg mt-4 mb-4">Book Your Appointment</h2>
      <p class="body-md">Schedule a visit with one of our providers today.</p>
    </div>
    
    <form class="glass-card appointment-form p-8 space-y-6" data-reveal data-ut-intent="booking.create">
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">First Name</label>
          <input type="text" name="first_name" class="input" placeholder="First name" required/>
        </div>
        <div>
          <label class="block caption mb-2">Last Name</label>
          <input type="text" name="last_name" class="input" placeholder="Last name" required/>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Email</label>
          <input type="email" name="email" class="input" placeholder="you@email.com" required/>
        </div>
        <div>
          <label class="block caption mb-2">Phone</label>
          <input type="tel" name="phone" class="input" placeholder="(555) 123-4567" required/>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Appointment Type</label>
          <select name="appointment_type" class="input" required>
            <option value="">Select type</option>
            <option value="new-patient">New Patient Visit</option>
            <option value="annual">Annual Wellness Exam</option>
            <option value="followup">Follow-up Visit</option>
            <option value="urgent">Urgent Care</option>
            <option value="telehealth">Telehealth Visit</option>
          </select>
        </div>
        <div>
          <label class="block caption mb-2">Preferred Provider</label>
          <select name="provider" class="input">
            <option value="">No preference</option>
            <option value="dr-mitchell">Dr. Sarah Mitchell</option>
            <option value="dr-chen">Dr. James Chen</option>
            <option value="dr-rodriguez">Dr. Maria Rodriguez</option>
          </select>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Preferred Date</label>
          <input type="date" name="date" class="input" required/>
        </div>
        <div>
          <label class="block caption mb-2">Preferred Time</label>
          <select name="time" class="input" required>
            <option value="">Select time</option>
            <option value="morning">Morning (8am - 12pm)</option>
            <option value="afternoon">Afternoon (12pm - 5pm)</option>
            <option value="any">Any Available</option>
          </select>
        </div>
      </div>
      
      <div>
        <label class="block caption mb-2">Reason for Visit</label>
        <textarea name="reason" class="input" rows="3" placeholder="Briefly describe the reason for your visit..."></textarea>
      </div>
      
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">
        Request Appointment
      </button>
      
      <p class="text-center caption">
        We'll confirm your appointment within 24 hours.
      </p>
    </form>
  </div>
</section>

<!-- Insurance Section -->
<section id="insurance" class="section-spacing" data-ut-section="insurance_info">
  <div class="container-wide">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-cyan-400">Payment Options</span>
        <h2 class="headline-lg mt-4 mb-6">Insurance & Payment</h2>
        <p class="body-lg mb-6">
          We accept most major insurance plans and offer flexible payment options for those without coverage.
        </p>
        
        <div class="space-y-4 mb-8">
          <div class="flex items-center gap-3">
            <span class="text-cyan-400 text-xl">✓</span>
            <span>Most major PPO and HMO plans accepted</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-cyan-400 text-xl">✓</span>
            <span>Medicare and Medicaid accepted</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-cyan-400 text-xl">✓</span>
            <span>Flexible self-pay rates available</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-cyan-400 text-xl">✓</span>
            <span>Payment plans for larger balances</span>
          </div>
        </div>
        
        <button class="btn-secondary" data-ut-intent="contact.submit">
          Verify Your Insurance →
        </button>
      </div>
      
      <div class="glass-card p-8" data-reveal>
        <h3 class="text-xl font-bold mb-6">Accepted Insurance</h3>
        <div class="grid grid-cols-2 gap-4 text-sm text-white/70">
          <div>• Aetna</div>
          <div>• Blue Cross Blue Shield</div>
          <div>• Cigna</div>
          <div>• United Healthcare</div>
          <div>• Humana</div>
          <div>• Kaiser Permanente</div>
          <div>• Medicare</div>
          <div>• Medicaid</div>
          <div>• Tricare</div>
          <div>• And many more...</div>
        </div>
        <p class="caption mt-6">
          Not sure if we accept your plan? Call us at (555) 123-4567 and we'll verify your coverage.
        </p>
      </div>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div class="md:col-span-2">
        <h3 class="text-xl font-bold mb-4">Vitality<span class="text-cyan-400">+</span></h3>
        <p class="body-md mb-6 max-w-sm">Comprehensive healthcare for your whole family. Accepting new patients.</p>
        <div class="flex items-center gap-4 mb-6">
          <span class="text-2xl">📞</span>
          <div>
            <div class="caption">Call Us</div>
            <a href="tel:555-123-4567" class="text-xl font-bold text-cyan-400">(555) 123-4567</a>
          </div>
        </div>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Services</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-cyan-400 transition">Primary Care</a></li>
          <li><a href="#" class="hover:text-cyan-400 transition">Family Medicine</a></li>
          <li><a href="#" class="hover:text-cyan-400 transition">Urgent Care</a></li>
          <li><a href="#" class="hover:text-cyan-400 transition">Telehealth</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Hours</h4>
        <ul class="space-y-3 text-white/60">
          <li>Mon-Fri: 8am - 6pm</li>
          <li>Saturday: 9am - 2pm</li>
          <li>Sunday: Closed</li>
          <li class="pt-2">
            <span class="text-cyan-400">Urgent Care:</span><br/>
            Extended hours available
          </li>
        </ul>
      </div>
    </div>
    
    <div class="divider mb-8"></div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
      <p>© 2024 Vitality+ Medical Center. All rights reserved.</p>
      <div class="flex gap-6">
        <a href="#" class="hover:text-white transition">Privacy Policy</a>
        <a href="#" class="hover:text-white transition">Patient Rights</a>
        <a href="#" class="hover:text-white transition">HIPAA Notice</a>
      </div>
    </div>
  </div>
</footer>

${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// EXPORTS
// ============================================================================

export const medicalTemplates: LayoutTemplate[] = [
  {
    id: 'medical-clinic-premium',
    name: 'Medical Clinic Premium',
    category: 'contractor', // Using contractor as fallback since medical isn't in LayoutCategory
    description: 'Modern healthcare clinic with provider profiles and patient intake',
    systemType: 'booking',
    systemName: 'Patient Appointment System',
    tags: ['medical', 'healthcare', 'clinic', 'doctor', 'premium'],
    code: wrapInHtmlDoc(medicalClinic, 'Vitality+ Medical Center'),
  },
];

export default medicalTemplates;
