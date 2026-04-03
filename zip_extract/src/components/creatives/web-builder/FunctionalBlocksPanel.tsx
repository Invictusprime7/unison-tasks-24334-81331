import React from 'react';
import { Calendar, ShoppingCart, CreditCard, MapPin, Image, Package, Clock, Star, Mail, Globe, Zap, Users, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface FunctionalBlock {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'leads' | 'booking' | 'ecommerce' | 'media' | 'payment' | 'contact';
  htmlTemplate: string;
  intent?: string; // Intent router integration
  pack?: 'leads' | 'booking' | 'auth'; // Which pack this belongs to
}

// Intent-based functional blocks that use the runtime/intentRouter
const intentBlocks: FunctionalBlock[] = [
  {
    id: 'intent-contact-form',
    name: 'Contact Form (Live)',
    description: 'Lead capture with real-time submission to CRM',
    icon: <Mail className="w-5 h-5" />,
    category: 'leads',
    intent: 'contact.submit',
    pack: 'leads',
    htmlTemplate: `<section data-component="intent-contact-form" data-intent="contact.submit" data-business-id="{{businessId}}" class="w-full py-12 px-4">
  <div class="max-w-xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-bold text-foreground mb-2">Get In Touch</h2>
      <p class="text-muted-foreground">We'd love to hear from you!</p>
    </div>
    <form data-intent-form="contact.submit" class="bg-card rounded-2xl p-8 shadow-lg border space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-foreground mb-2 block">Name *</label>
          <input type="text" name="name" required placeholder="Your name" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
        </div>
        <div>
          <label class="text-sm font-medium text-foreground mb-2 block">Phone</label>
          <input type="tel" name="phone" placeholder="(555) 123-4567" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
        </div>
      </div>
      <div>
        <label class="text-sm font-medium text-foreground mb-2 block">Email *</label>
        <input type="email" name="email" required placeholder="your@email.com" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
      </div>
      <div>
        <label class="text-sm font-medium text-foreground mb-2 block">Message *</label>
        <textarea name="message" rows="4" required placeholder="How can we help?" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"></textarea>
      </div>
      <button type="submit" data-intent-trigger="contact.submit" class="w-full bg-primary text-primary-foreground py-4 px-6 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        Send Message
      </button>
    </form>
  </div>
</section>`
  },
  {
    id: 'intent-newsletter',
    name: 'Newsletter Signup (Live)',
    description: 'Email capture with automatic list subscription',
    icon: <Bell className="w-5 h-5" />,
    category: 'leads',
    intent: 'newsletter.subscribe',
    pack: 'leads',
    htmlTemplate: `<section data-component="intent-newsletter" data-intent="newsletter.subscribe" data-business-id="{{businessId}}" class="w-full py-16 px-4 bg-gradient-to-br from-primary/5 to-primary/10">
  <div class="max-w-2xl mx-auto text-center">
    <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
      <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"></path></svg>
    </div>
    <h2 class="text-3xl font-bold text-foreground mb-3">Stay Updated</h2>
    <p class="text-muted-foreground mb-8 max-w-md mx-auto">Get the latest news, tips, and exclusive offers delivered straight to your inbox.</p>
    <form data-intent-form="newsletter.subscribe" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input type="email" name="email" required placeholder="Enter your email" class="flex-1 px-5 py-4 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-center sm:text-left" />
      <button type="submit" data-intent-trigger="newsletter.subscribe" class="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 whitespace-nowrap">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
        Subscribe
      </button>
    </form>
    <p class="text-xs text-muted-foreground mt-4">No spam, unsubscribe anytime.</p>
  </div>
</section>`
  },
  {
    id: 'intent-waitlist',
    name: 'Waitlist Signup (Live)',
    description: 'Collect early access signups with urgency',
    icon: <Users className="w-5 h-5" />,
    category: 'leads',
    intent: 'join.waitlist',
    pack: 'leads',
    htmlTemplate: `<section data-component="intent-waitlist" data-intent="join.waitlist" data-business-id="{{businessId}}" class="w-full py-20 px-4 bg-gradient-to-br from-violet-600/10 via-background to-fuchsia-600/10">
  <div class="max-w-xl mx-auto text-center">
    <span class="inline-block bg-violet-500/20 text-violet-600 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">🚀 Coming Soon</span>
    <h1 class="text-4xl md:text-5xl font-bold text-foreground mb-4">Be the First to Know</h1>
    <p class="text-lg text-muted-foreground mb-8">Join our exclusive waitlist and get early access when we launch.</p>
    <form data-intent-form="join.waitlist" class="space-y-4 max-w-sm mx-auto">
      <input type="text" name="name" placeholder="Your name" class="w-full px-5 py-4 bg-background border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all" />
      <input type="email" name="email" required placeholder="Your email" class="w-full px-5 py-4 bg-background border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all" />
      <button type="submit" data-intent-trigger="join.waitlist" class="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 px-6 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        Join the Waitlist
      </button>
    </form>
    <div class="flex items-center justify-center gap-2 mt-6">
      <div class="flex -space-x-2">
        <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold border-2 border-background">JD</div>
        <div class="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold border-2 border-background">SK</div>
        <div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold border-2 border-background">MW</div>
      </div>
      <p class="text-sm text-muted-foreground">Join 1,200+ others on the waitlist</p>
    </div>
  </div>
</section>`
  },
  {
    id: 'intent-booking',
    name: 'Booking Form (Live)',
    description: 'Full appointment scheduler with slots',
    icon: <Calendar className="w-5 h-5" />,
    category: 'booking',
    intent: 'booking.create',
    pack: 'booking',
    htmlTemplate: `<section data-component="intent-booking" data-intent="booking.create" data-business-id="{{businessId}}" class="w-full max-w-lg mx-auto my-8">
  <div class="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 shadow-lg border border-primary/20">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
        <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
      <div>
        <h3 class="text-xl font-bold text-foreground">Book Your Appointment</h3>
        <p class="text-sm text-muted-foreground">Choose a service and time that works for you</p>
      </div>
    </div>
    <form data-intent-form="booking.create" class="space-y-4">
      <div>
        <label class="text-sm font-medium text-foreground mb-2 block">Service *</label>
        <select name="serviceId" required class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all">
          <option value="">Select a service</option>
          <option value="consultation">Consultation (30 min) - $50</option>
          <option value="full-session">Full Session (60 min) - $100</option>
          <option value="premium">Premium Package (90 min) - $150</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-foreground mb-2 block">Date *</label>
          <input type="date" name="date" required class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
        </div>
        <div>
          <label class="text-sm font-medium text-foreground mb-2 block">Time *</label>
          <select name="time" required class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all">
            <option value="">Select time</option>
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
          </select>
        </div>
      </div>
      <div>
        <label class="text-sm font-medium text-foreground mb-2 block">Your Name *</label>
        <input type="text" name="customerName" required placeholder="Full name" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
      </div>
      <div>
        <label class="text-sm font-medium text-foreground mb-2 block">Email *</label>
        <input type="email" name="customerEmail" required placeholder="your@email.com" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
      </div>
      <button type="submit" data-intent-trigger="booking.create" class="w-full mt-6 bg-primary text-primary-foreground py-4 px-6 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        Confirm Booking
      </button>
    </form>
  </div>
</section>`
  },
];

const functionalBlocks: FunctionalBlock[] = [
  {
    id: 'booking-widget',
    name: 'Appointment Scheduler',
    description: 'Full booking system with date/time selection',
    icon: <Calendar className="w-5 h-5" />,
    category: 'booking',
    htmlTemplate: `<section data-component="booking-widget" data-service-name="Consultation" data-duration="60" class="w-full max-w-lg mx-auto my-8">
  <div class="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 shadow-lg border border-primary/20">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
        <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
      <div>
        <h3 class="text-xl font-bold text-foreground">Schedule Appointment</h3>
        <p class="text-sm text-muted-foreground">Choose your preferred date & time</p>
      </div>
    </div>
    <div class="space-y-4">
      <div class="grid grid-cols-7 gap-1 p-3 bg-background rounded-xl">
        <span class="text-xs text-center text-muted-foreground font-medium">S</span>
        <span class="text-xs text-center text-muted-foreground font-medium">M</span>
        <span class="text-xs text-center text-muted-foreground font-medium">T</span>
        <span class="text-xs text-center text-muted-foreground font-medium">W</span>
        <span class="text-xs text-center text-muted-foreground font-medium">T</span>
        <span class="text-xs text-center text-muted-foreground font-medium">F</span>
        <span class="text-xs text-center text-muted-foreground font-medium">S</span>
        <span class="text-xs text-center py-1.5 text-muted-foreground">1</span>
        <span class="text-xs text-center py-1.5">2</span>
        <span class="text-xs text-center py-1.5">3</span>
        <span class="text-xs text-center py-1.5 bg-primary text-primary-foreground rounded-lg font-medium">4</span>
        <span class="text-xs text-center py-1.5">5</span>
        <span class="text-xs text-center py-1.5">6</span>
        <span class="text-xs text-center py-1.5 text-muted-foreground">7</span>
      </div>
      <div class="flex gap-2 flex-wrap">
        <span class="px-3 py-2 text-xs rounded-lg bg-background border hover:border-primary cursor-pointer transition-colors">9:00 AM</span>
        <span class="px-3 py-2 text-xs rounded-lg bg-primary text-primary-foreground">10:00 AM</span>
        <span class="px-3 py-2 text-xs rounded-lg bg-background border hover:border-primary cursor-pointer transition-colors">11:00 AM</span>
        <span class="px-3 py-2 text-xs rounded-lg bg-background border hover:border-primary cursor-pointer transition-colors">2:00 PM</span>
      </div>
    </div>
    <button class="w-full mt-6 bg-primary text-primary-foreground py-3 px-6 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
      Confirm Booking
    </button>
  </div>
</section>`
  },
  {
    id: 'product-grid',
    name: 'Product Showcase',
    description: 'E-commerce product grid with cart',
    icon: <Package className="w-5 h-5" />,
    category: 'ecommerce',
    htmlTemplate: `<section data-component="product-grid" class="w-full py-12 px-4">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-3xl font-bold text-foreground mb-2">Featured Products</h2>
      <p class="text-muted-foreground">Discover our best-selling items</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div data-component="product-card" data-product-id="1" class="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border">
        <div class="aspect-square bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
          <div class="absolute inset-0 flex items-center justify-center"><span class="text-4xl">📦</span></div>
          <div class="absolute top-3 left-3"><span class="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">NEW</span></div>
        </div>
        <div class="p-5">
          <div class="flex items-center gap-1 mb-2">
            <svg class="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <svg class="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <svg class="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <svg class="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <svg class="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span class="text-xs text-muted-foreground ml-1">(128)</span>
          </div>
          <h3 class="font-semibold text-foreground mb-1">Premium Product</h3>
          <p class="text-sm text-muted-foreground mb-3">High-quality crafted item</p>
          <div class="flex items-center justify-between">
            <div><span class="text-xl font-bold text-primary">$49.99</span><span class="text-sm text-muted-foreground line-through ml-2">$79.99</span></div>
            <button class="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              Add
            </button>
          </div>
        </div>
      </div>
      <div data-component="product-card" data-product-id="2" class="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border">
        <div class="aspect-square bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
          <div class="absolute inset-0 flex items-center justify-center"><span class="text-4xl">🎁</span></div>
          <div class="absolute top-3 left-3"><span class="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">SALE</span></div>
        </div>
        <div class="p-5">
          <h3 class="font-semibold text-foreground mb-1">Special Edition</h3>
          <p class="text-sm text-muted-foreground mb-3">Limited time offer</p>
          <div class="flex items-center justify-between">
            <div><span class="text-xl font-bold text-primary">$29.99</span><span class="text-sm text-muted-foreground line-through ml-2">$59.99</span></div>
            <button class="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              Add
            </button>
          </div>
        </div>
      </div>
      <div data-component="product-card" data-product-id="3" class="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border">
        <div class="aspect-square bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
          <div class="absolute inset-0 flex items-center justify-center"><span class="text-4xl">✨</span></div>
        </div>
        <div class="p-5">
          <h3 class="font-semibold text-foreground mb-1">Best Seller</h3>
          <p class="text-sm text-muted-foreground mb-3">Customer favorite</p>
          <div class="flex items-center justify-between">
            <span class="text-xl font-bold text-primary">$39.99</span>
            <button class="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`
  },
  {
    id: 'shopping-cart',
    name: 'Floating Cart',
    description: 'Fixed position cart button',
    icon: <ShoppingCart className="w-5 h-5" />,
    category: 'ecommerce',
    htmlTemplate: `<div data-component="shopping-cart" class="fixed top-4 right-4 z-50">
  <button class="relative p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:opacity-90 transition-all hover:scale-105">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
    <span class="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">3</span>
  </button>
</div>`
  },
  {
    id: 'payment-section',
    name: 'Checkout Payment',
    description: 'Secure payment form with card input',
    icon: <CreditCard className="w-5 h-5" />,
    category: 'payment',
    htmlTemplate: `<section data-component="payment-section" data-amount="99.99" class="w-full max-w-md mx-auto my-8">
  <div class="bg-card rounded-2xl p-8 shadow-lg border">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
      </div>
      <div>
        <h3 class="text-xl font-bold text-foreground">Secure Checkout</h3>
        <p class="text-sm text-muted-foreground">Your payment is encrypted</p>
      </div>
    </div>
    <div class="space-y-4">
      <div class="bg-muted/50 rounded-xl p-4 flex justify-between items-center">
        <span class="text-muted-foreground">Order Total</span>
        <span class="text-2xl font-bold text-foreground">$99.99</span>
      </div>
      <div>
        <label class="text-sm font-medium text-foreground mb-2 block">Card Number</label>
        <input type="text" placeholder="4242 4242 4242 4242" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-foreground mb-2 block">Expiry</label>
          <input type="text" placeholder="MM/YY" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
        </div>
        <div>
          <label class="text-sm font-medium text-foreground mb-2 block">CVC</label>
          <input type="text" placeholder="123" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
        </div>
      </div>
    </div>
    <button class="w-full mt-6 bg-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
      Pay $99.99
    </button>
    <p class="text-xs text-center text-muted-foreground mt-4">Secured by SSL encryption</p>
  </div>
</section>`
  },
  {
    id: 'location-map',
    name: 'Location Map',
    description: 'Interactive OpenStreetMap with marker',
    icon: <MapPin className="w-5 h-5" />,
    category: 'media',
    htmlTemplate: `<section data-component="openstreetmap" data-lat="40.7128" data-lng="-74.0060" data-title="Our Location" class="w-full my-8">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-foreground mb-2">Find Us Here</h2>
      <p class="text-muted-foreground">Visit our location or get directions</p>
    </div>
    <div class="rounded-2xl overflow-hidden shadow-lg border">
      <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-74.02,40.70,-73.99,40.72&layer=mapnik&marker=40.7128,-74.0060" class="w-full h-80 border-0" loading="lazy" title="Location Map"></iframe>
      <div class="bg-card p-4 flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
          <div>
            <p class="font-medium text-foreground">123 Business Street</p>
            <p class="text-sm text-muted-foreground">New York, NY 10001</p>
          </div>
        </div>
        <a href="https://www.openstreetmap.org/directions?to=40.7128,-74.0060" target="_blank" class="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
          Get Directions
        </a>
      </div>
    </div>
  </div>
</section>`
  },
  {
    id: 'contact-form',
    name: 'Contact Form',
    description: 'Lead capture with validation',
    icon: <Mail className="w-5 h-5" />,
    category: 'contact',
    htmlTemplate: `<section data-component="contact-form" class="w-full py-12 px-4">
  <div class="max-w-xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-bold text-foreground mb-2">Get In Touch</h2>
      <p class="text-muted-foreground">We'd love to hear from you!</p>
    </div>
    <form class="bg-card rounded-2xl p-8 shadow-lg border space-y-6">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-foreground mb-2 block">First Name</label>
          <input type="text" placeholder="John" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
        </div>
        <div>
          <label class="text-sm font-medium text-foreground mb-2 block">Last Name</label>
          <input type="text" placeholder="Doe" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
        </div>
      </div>
      <div>
        <label class="text-sm font-medium text-foreground mb-2 block">Email Address</label>
        <input type="email" placeholder="john@example.com" class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all" />
      </div>
      <div>
        <label class="text-sm font-medium text-foreground mb-2 block">Message</label>
        <textarea rows="4" placeholder="Tell us how we can help..." class="w-full px-4 py-3 bg-background border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"></textarea>
      </div>
      <button type="submit" class="w-full bg-primary text-primary-foreground py-4 px-6 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
        Send Message
      </button>
    </form>
  </div>
</section>`
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    description: 'Customer reviews section',
    icon: <Star className="w-5 h-5" />,
    category: 'media',
    htmlTemplate: `<section data-component="testimonials" class="w-full py-12 px-4 bg-muted/30">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-3xl font-bold text-foreground mb-2">What Our Customers Say</h2>
      <p class="text-muted-foreground">Trusted by thousands of satisfied customers</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-card rounded-2xl p-6 shadow-md border">
        <div class="flex gap-1 mb-4">
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <p class="text-foreground mb-4">"Absolutely amazing service! The team went above and beyond."</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">JD</div>
          <div>
            <p class="font-medium text-foreground">John Doe</p>
            <p class="text-sm text-muted-foreground">CEO, TechCorp</p>
          </div>
        </div>
      </div>
      <div class="bg-card rounded-2xl p-6 shadow-md border">
        <div class="flex gap-1 mb-4">
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <p class="text-foreground mb-4">"The best investment we've made. Results exceeded expectations!"</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center font-bold">SJ</div>
          <div>
            <p class="font-medium text-foreground">Sarah Johnson</p>
            <p class="text-sm text-muted-foreground">Founder, StartupXYZ</p>
          </div>
        </div>
      </div>
      <div class="bg-card rounded-2xl p-6 shadow-md border">
        <div class="flex gap-1 mb-4">
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <svg class="w-5 h-5 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <p class="text-foreground mb-4">"Professional, reliable, and incredibly talented. Highly recommend!"</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold">MW</div>
          <div>
            <p class="font-medium text-foreground">Mike Wilson</p>
            <p class="text-sm text-muted-foreground">Director, AgencyPro</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`
  },
  {
    id: 'hero-cta',
    name: 'Hero CTA',
    description: 'Conversion-focused hero section',
    icon: <Globe className="w-5 h-5" />,
    category: 'contact',
    htmlTemplate: `<section data-component="hero-cta" class="w-full py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
  <div class="max-w-4xl mx-auto text-center">
    <span class="inline-block bg-primary/20 text-primary px-4 py-1 rounded-full text-sm font-medium mb-6">🚀 Launch Special - 50% Off</span>
    <h1 class="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">Build Something<br/><span class="text-primary">Amazing</span> Today</h1>
    <p class="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">Join thousands of satisfied customers who transformed their ideas into reality.</p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button class="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-all hover:scale-105 shadow-lg">Get Started Free</button>
      <button class="bg-background border-2 border-primary text-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/10 transition-all">Watch Demo</button>
    </div>
    <div class="flex items-center justify-center gap-8 mt-12 flex-wrap">
      <div class="text-center"><p class="text-3xl font-bold text-foreground">10K+</p><p class="text-sm text-muted-foreground">Happy Customers</p></div>
      <div class="w-px h-12 bg-border hidden sm:block"></div>
      <div class="text-center"><p class="text-3xl font-bold text-foreground">4.9★</p><p class="text-sm text-muted-foreground">User Rating</p></div>
      <div class="w-px h-12 bg-border hidden sm:block"></div>
      <div class="text-center"><p class="text-3xl font-bold text-foreground">99%</p><p class="text-sm text-muted-foreground">Satisfaction</p></div>
    </div>
  </div>
</section>`
  }
];

// Combine intent blocks with static blocks
const allBlocks = [...intentBlocks, ...functionalBlocks];

interface FunctionalBlocksPanelProps {
  onInsertBlock: (html: string) => void;
}

export const FunctionalBlocksPanel: React.FC<FunctionalBlocksPanelProps> = ({ onInsertBlock }) => {
  const categories = [
    { id: 'leads', label: 'Lead Capture (Live)', icon: <Zap className="w-4 h-4" />, color: 'bg-green-500/10 text-green-600', badge: 'LIVE' },
    { id: 'booking', label: 'Booking & Calendar', icon: <Calendar className="w-4 h-4" />, color: 'bg-blue-500/10 text-blue-600', badge: 'LIVE' },
    { id: 'ecommerce', label: 'E-Commerce', icon: <ShoppingCart className="w-4 h-4" />, color: 'bg-purple-500/10 text-purple-600' },
    { id: 'payment', label: 'Payments', icon: <CreditCard className="w-4 h-4" />, color: 'bg-emerald-500/10 text-emerald-600' },
    { id: 'media', label: 'Media & Social', icon: <Image className="w-4 h-4" />, color: 'bg-orange-500/10 text-orange-600' },
    { id: 'contact', label: 'CTA & Landing', icon: <Globe className="w-4 h-4" />, color: 'bg-pink-500/10 text-pink-600' }
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Zap className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground mb-1">Live Interactive Components</p>
              <p className="text-xs text-muted-foreground">Components marked "LIVE" connect to your backend and process real leads, bookings, and payments when published.</p>
            </div>
          </div>
        </div>

        {categories.map(category => {
          const categoryBlocks = allBlocks.filter(b => b.category === category.id);
          if (categoryBlocks.length === 0) return null;

          return (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${category.color} w-fit`}>
                  {category.icon}
                  <span className="text-xs font-semibold">{category.label}</span>
                </div>
                {category.badge && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-700 border-green-500/30">
                    {category.badge}
                  </Badge>
                )}
              </div>
              <div className="grid gap-2">
                {categoryBlocks.map(block => (
                  <Card 
                    key={block.id}
                    className="cursor-pointer group hover:border-primary/50 hover:shadow-md transition-all duration-200 overflow-hidden"
                    onClick={() => onInsertBlock(block.htmlTemplate)}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center gap-3 p-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:scale-110 transition-transform">
                          {block.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{block.name}</p>
                            {block.intent && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-700">
                                LIVE
                              </Badge>
                            )}
                            {block.pack && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {block.pack}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{block.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 border">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground mb-1">AI Pack Installation</p>
              <p className="text-xs text-muted-foreground">Ask the AI to "install leads pack" or "wire the contact form" to automatically configure your backend.</p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};