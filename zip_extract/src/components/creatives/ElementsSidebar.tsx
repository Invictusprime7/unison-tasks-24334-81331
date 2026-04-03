/**
 * Elements Sidebar - Drag & Drop Component Library
 * Industry-leading web builder interface inspired by Webflow, Framer, Wix
 * Users can drag components onto the canvas for visual web building
 */

import React, { useState } from 'react';
import { 
  Menu, 
  Layers, 
  Type, 
  Image, 
  Video, 
  Square, 
  Grid3x3,
  Layout,
  Navigation,
  Users,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Star,
  Heart,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Monitor,
  Globe,
  Zap,
  Award,
  Target,
  TrendingUp,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AIImageGeneratorDialog } from './AIImageGeneratorDialog';

export interface WebElement {
  id: string;
  name: string;
  category: ElementCategory;
  icon: React.ReactNode;
  description: string;
  htmlTemplate: string;
  thumbnail?: string;
  tags: string[];
  isPro?: boolean;
}

export type ElementCategory = 
  | 'navigation'
  | 'sections'
  | 'content'
  | 'media'
  | 'forms'
  | 'social'
  | 'buttons'
  | 'cards'
  | 'layouts'
  | 'icons';

interface ElementsSidebarProps {
  onElementDragStart?: (element: WebElement) => void;
  onElementDragEnd?: () => void;
  onElementClick?: (element: WebElement) => void;
  onAIImageGenerated?: (imageUrl: string, metadata?: Record<string, unknown>) => void;
}

const ELEMENT_LIBRARY: WebElement[] = [
  // NAVIGATION COMPONENTS
  {
    id: 'nav-floating',
    name: 'Floating Navigation',
    category: 'navigation',
    icon: <Navigation className="w-5 h-5" />,
    description: 'Fixed navigation bar with blur background',
    tags: ['navbar', 'fixed', 'sticky', 'header'],
    htmlTemplate: `<nav class="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/90 shadow-lg">
  <div class="container mx-auto px-6 py-4 flex items-center justify-between">
    <a href="#" class="text-2xl font-bold">Logo</a>
    <div class="hidden md:flex space-x-8">
      <a href="#" class="hover:text-blue-600">Home</a>
      <a href="#" class="hover:text-blue-600">About</a>
      <a href="#" class="hover:text-blue-600">Services</a>
      <a href="#" class="hover:text-blue-600">Contact</a>
    </div>
    <button class="px-6 py-2 bg-blue-600 text-white rounded-lg">Get Started</button>
  </div>
</nav>`
  },
  {
    id: 'nav-sidebar',
    name: 'Sidebar Menu',
    category: 'navigation',
    icon: <Menu className="w-5 h-5" />,
    description: 'Vertical sidebar navigation',
    tags: ['sidebar', 'vertical', 'menu'],
    htmlTemplate: `<aside class="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white p-6">
  <div class="mb-8">
    <h2 class="text-2xl font-bold">Menu</h2>
  </div>
  <nav class="space-y-2">
    <a href="#" class="block py-3 px-4 rounded-lg hover:bg-gray-800">Dashboard</a>
    <a href="#" class="block py-3 px-4 rounded-lg hover:bg-gray-800">Projects</a>
    <a href="#" class="block py-3 px-4 rounded-lg hover:bg-gray-800">Team</a>
    <a href="#" class="block py-3 px-4 rounded-lg hover:bg-gray-800">Settings</a>
  </nav>
</aside>`
  },
  {
    id: 'nav-tabs',
    name: 'Tab Navigation',
    category: 'navigation',
    icon: <Layers className="w-5 h-5" />,
    description: 'Horizontal tab navigation',
    tags: ['tabs', 'horizontal', 'switcher'],
    htmlTemplate: `<div class="border-b border-gray-200">
  <nav class="flex space-x-8">
    <button class="py-4 px-1 border-b-2 border-blue-600 font-semibold text-blue-600">Overview</button>
    <button class="py-4 px-1 border-b-2 border-transparent hover:border-gray-300">Analytics</button>
    <button class="py-4 px-1 border-b-2 border-transparent hover:border-gray-300">Reports</button>
    <button class="py-4 px-1 border-b-2 border-transparent hover:border-gray-300">Settings</button>
  </nav>
</div>`
  },

  // SECTION COMPONENTS
  {
    id: 'section-hero-fullscreen',
    name: 'Hero - Fullscreen',
    category: 'sections',
    icon: <Layout className="w-5 h-5" />,
    description: 'Full-height hero section with centered content',
    tags: ['hero', 'fullscreen', 'landing', 'banner'],
    htmlTemplate: `<section class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 text-white text-center">
  <div class="max-w-4xl px-6">
    <h1 class="text-6xl font-bold mb-6">Transform Your Digital Presence</h1>
    <p class="text-2xl mb-8 opacity-90">Professional solutions for modern businesses</p>
    <div class="flex gap-4 justify-center">
      <button class="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold hover:scale-105 transition">Get Started</button>
      <button class="px-8 py-4 border-2 border-white rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition">Learn More</button>
    </div>
  </div>
</section>`
  },
  {
    id: 'section-features-grid',
    name: 'Features Grid',
    category: 'sections',
    icon: <Grid3x3 className="w-5 h-5" />,
    description: '3-column feature grid with icons',
    tags: ['features', 'grid', 'services'],
    htmlTemplate: `<section class="py-24 bg-gray-50">
  <div class="container mx-auto px-6 max-w-7xl">
    <h2 class="text-5xl font-bold text-center mb-16">Powerful Features</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
        <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <h3 class="text-2xl font-bold mb-4">Lightning Fast</h3>
        <p class="text-gray-600">Optimized performance for instant loading</p>
      </div>
      <div class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
        <div class="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h3 class="text-2xl font-bold mb-4">Secure</h3>
        <p class="text-gray-600">Enterprise-grade security</p>
      </div>
      <div class="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
        <div class="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mb-6">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>
        </div>
        <h3 class="text-2xl font-bold mb-4">Responsive</h3>
        <p class="text-gray-600">Perfect on any device</p>
      </div>
    </div>
  </div>
</section>`
  },
  {
    id: 'section-cta',
    name: 'Call to Action',
    category: 'sections',
    icon: <Target className="w-5 h-5" />,
    description: 'Conversion-focused CTA section',
    tags: ['cta', 'conversion', 'action'],
    htmlTemplate: `<section class="py-24 bg-blue-600 text-white text-center">
  <div class="container mx-auto px-6 max-w-4xl">
    <h2 class="text-5xl font-bold mb-6">Ready to Get Started?</h2>
    <p class="text-2xl mb-8 opacity-90">Join thousands of satisfied customers</p>
    <button class="px-10 py-5 bg-white text-blue-600 rounded-lg font-bold text-lg hover:scale-105 transition shadow-xl">Start Free Trial</button>
  </div>
</section>`
  },
  {
    id: 'section-testimonials',
    name: 'Testimonials',
    category: 'sections',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Customer testimonial cards',
    tags: ['testimonials', 'reviews', 'social proof'],
    htmlTemplate: `<section class="py-24 bg-white">
  <div class="container mx-auto px-6 max-w-7xl">
    <h2 class="text-5xl font-bold text-center mb-16">What Clients Say</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="bg-gray-50 p-8 rounded-2xl">
        <div class="flex mb-4">
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
        </div>
        <p class="text-gray-700 mb-6">"Outstanding service! Exceeded all expectations."</p>
        <div class="flex items-center">
          <div class="w-12 h-12 rounded-full bg-blue-600"></div>
          <div class="ml-4">
            <p class="font-bold">Sarah Johnson</p>
            <p class="text-sm text-gray-600">CEO, TechCorp</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`
  },

  // SOCIAL MEDIA ICONS
  {
    id: 'social-facebook',
    name: 'Facebook Icon',
    category: 'social',
    icon: <Facebook className="w-5 h-5" />,
    description: 'Facebook social media link',
    tags: ['social', 'facebook', 'icon'],
    htmlTemplate: `<a href="#" class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition">
  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
</a>`
  },
  {
    id: 'social-twitter',
    name: 'Twitter/X Icon',
    category: 'social',
    icon: <Twitter className="w-5 h-5" />,
    description: 'Twitter social media link',
    tags: ['social', 'twitter', 'x', 'icon'],
    htmlTemplate: `<a href="#" class="w-10 h-10 bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition">
  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
</a>`
  },
  {
    id: 'social-instagram',
    name: 'Instagram Icon',
    category: 'social',
    icon: <Instagram className="w-5 h-5" />,
    description: 'Instagram social media link',
    tags: ['social', 'instagram', 'icon'],
    htmlTemplate: `<a href="#" class="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-600 rounded-full flex items-center justify-center hover:opacity-90 transition">
  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
</a>`
  },
  {
    id: 'social-linkedin',
    name: 'LinkedIn Icon',
    category: 'social',
    icon: <Linkedin className="w-5 h-5" />,
    description: 'LinkedIn social media link',
    tags: ['social', 'linkedin', 'icon'],
    htmlTemplate: `<a href="#" class="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center hover:bg-blue-800 transition">
  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
</a>`
  },
  {
    id: 'social-youtube',
    name: 'YouTube Icon',
    category: 'social',
    icon: <Youtube className="w-5 h-5" />,
    description: 'YouTube social media link',
    tags: ['social', 'youtube', 'video', 'icon'],
    htmlTemplate: `<a href="#" class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition">
  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
</a>`
  },
  {
    id: 'social-github',
    name: 'GitHub Icon',
    category: 'social',
    icon: <Github className="w-5 h-5" />,
    description: 'GitHub social media link',
    tags: ['social', 'github', 'developer', 'icon'],
    htmlTemplate: `<a href="#" class="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition">
  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
</a>`
  },

  // FORM ELEMENTS
  {
    id: 'form-contact',
    name: 'Contact Form',
    category: 'forms',
    icon: <Mail className="w-5 h-5" />,
    description: 'Complete contact form with validation',
    tags: ['form', 'contact', 'email', 'input'],
    htmlTemplate: `<form class="bg-white p-10 rounded-2xl shadow-xl max-w-2xl">
  <h3 class="text-3xl font-bold mb-8">Get In Touch</h3>
  <div class="space-y-6">
    <div>
      <label class="block text-sm font-semibold mb-2">Name</label>
      <input type="text" placeholder="John Doe" class="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" required />
    </div>
    <div>
      <label class="block text-sm font-semibold mb-2">Email</label>
      <input type="email" placeholder="john@example.com" class="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" required />
    </div>
    <div>
      <label class="block text-sm font-semibold mb-2">Message</label>
      <textarea rows="4" placeholder="Your message..." class="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" required></textarea>
    </div>
    <button type="submit" class="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Send Message</button>
  </div>
</form>`
  },

  // CONTENT ELEMENTS
  {
    id: 'content-heading',
    name: 'Heading',
    category: 'content',
    icon: <Type className="w-5 h-5" />,
    description: 'Large heading text',
    tags: ['text', 'heading', 'title', 'h1'],
    htmlTemplate: `<h1 class="text-6xl font-bold text-gray-900">Heading Text</h1>`
  },
  {
    id: 'content-paragraph',
    name: 'Paragraph',
    category: 'content',
    icon: <Type className="w-5 h-5" />,
    description: 'Body text paragraph',
    tags: ['text', 'paragraph', 'content'],
    htmlTemplate: `<p class="text-lg text-gray-700 leading-relaxed">This is a paragraph of text. You can edit this content to match your needs.</p>`
  },
  {
    id: 'content-image',
    name: 'Image',
    category: 'media',
    icon: <Image className="w-5 h-5" />,
    description: 'Responsive image',
    tags: ['image', 'photo', 'picture'],
    htmlTemplate: `<img src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800" alt="Description" class="w-full h-auto rounded-2xl shadow-lg" />`
  },
  {
    id: 'ai-image-placeholder',
    name: 'AI Image',
    category: 'media',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Generate image with AI',
    tags: ['ai', 'image', 'generate', 'artificial intelligence'],
    isPro: true,
    htmlTemplate: `<div class="relative w-full aspect-video bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl shadow-lg flex items-center justify-center border-2 border-dashed border-purple-500/50">
  <div class="text-center p-8">
    <svg class="w-16 h-16 mx-auto mb-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    </svg>
    <p class="text-lg font-semibold text-purple-600 mb-2">Click "Generate AI Image" to replace this</p>
    <p class="text-sm text-gray-600">Use the AI Image Generator button above to create custom images</p>
  </div>
</div>`
  },
  {
    id: 'responsive-image',
    name: 'Responsive Image',
    category: 'media',
    icon: <Image className="w-5 h-5" />,
    description: 'Fully responsive image with srcset',
    tags: ['image', 'responsive', 'srcset', 'performance', 'lazy'],
    htmlTemplate: `<picture class="block w-full">
  <source media="(min-width: 1024px)" srcset="https://picsum.photos/1920/1080" />
  <source media="(min-width: 768px)" srcset="https://picsum.photos/1024/768" />
  <img 
    src="https://picsum.photos/640/480" 
    alt="Responsive image"
    loading="lazy"
    class="w-full h-auto rounded-2xl shadow-2xl object-cover"
    style="aspect-ratio: 16/9;"
  />
</picture>`
  },
  {
    id: 'image-with-caption',
    name: 'Image with Caption',
    category: 'media',
    icon: <Image className="w-5 h-5" />,
    description: 'Image with styled caption overlay',
    tags: ['image', 'caption', 'overlay', 'text'],
    htmlTemplate: `<figure class="relative group overflow-hidden rounded-2xl shadow-2xl">
  <img 
    src="https://picsum.photos/800/600" 
    alt="Featured image"
    loading="lazy"
    class="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
  />
  <figcaption class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
    <h3 class="text-2xl font-bold mb-2">Image Caption</h3>
    <p class="text-sm opacity-90">Add your description here</p>
  </figcaption>
</figure>`
  },
  {
    id: 'image-gallery-grid',
    name: 'Image Gallery',
    category: 'media',
    icon: <Grid3x3 className="w-5 h-5" />,
    description: 'Responsive image gallery with hover effects',
    tags: ['gallery', 'grid', 'images', 'portfolio'],
    htmlTemplate: `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  <div class="relative group overflow-hidden rounded-lg shadow-lg cursor-pointer">
    <img src="https://picsum.photos/400/300?random=1" alt="Gallery 1" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
      <span class="text-white text-lg font-semibold">View Image</span>
    </div>
  </div>
  <div class="relative group overflow-hidden rounded-lg shadow-lg cursor-pointer">
    <img src="https://picsum.photos/400/300?random=2" alt="Gallery 2" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
      <span class="text-white text-lg font-semibold">View Image</span>
    </div>
  </div>
  <div class="relative group overflow-hidden rounded-lg shadow-lg cursor-pointer">
    <img src="https://picsum.photos/400/300?random=3" alt="Gallery 3" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
      <span class="text-white text-lg font-semibold">View Image</span>
    </div>
  </div>
  <div class="relative group overflow-hidden rounded-lg shadow-lg cursor-pointer">
    <img src="https://picsum.photos/400/300?random=4" alt="Gallery 4" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
      <span class="text-white text-lg font-semibold">View Image</span>
    </div>
  </div>
</div>`
  },
  {
    id: 'parallax-image',
    name: 'Parallax Image',
    category: 'media',
    icon: <Layers className="w-5 h-5" />,
    description: 'Image with parallax scroll effect',
    tags: ['parallax', 'scroll', 'effect', 'animation'],
    htmlTemplate: `<div class="relative h-96 overflow-hidden rounded-2xl shadow-2xl" data-parallax="true">
  <img 
    src="https://picsum.photos/1920/1080" 
    alt="Parallax background"
    loading="lazy"
    class="absolute inset-0 w-full h-full object-cover parallax-image"
  />
  <div class="relative z-10 h-full flex items-center justify-center">
    <div class="text-center text-white p-8 bg-black/30 backdrop-blur-sm rounded-2xl">
      <h2 class="text-4xl font-bold mb-4">Parallax Effect</h2>
      <p class="text-lg">Scroll to see the magic</p>
    </div>
  </div>
</div>
<script>
(function() {
  window.addEventListener('scroll', function() {
    const parallaxElements = document.querySelectorAll('[data-parallax="true"] .parallax-image');
    parallaxElements.forEach(img => {
      const rect = img.parentElement.getBoundingClientRect();
      const scrolled = window.pageYOffset;
      const rate = (rect.top + scrolled) * -0.3;
      img.style.transform = 'translateY(' + rate + 'px)';
    });
  });
})();
</script>`
  },
  {
    id: 'content-video',
    name: 'Video',
    category: 'media',
    icon: <Video className="w-5 h-5" />,
    description: 'Embedded video player',
    tags: ['video', 'media', 'youtube'],
    htmlTemplate: `<div class="aspect-video rounded-2xl overflow-hidden shadow-lg">
  <iframe class="w-full h-full" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>
</div>`
  },

  // BUTTON ELEMENTS
  {
    id: 'button-primary',
    name: 'Primary Button',
    category: 'buttons',
    icon: <Square className="w-5 h-5" />,
    description: 'Primary action button',
    tags: ['button', 'cta', 'action'],
    htmlTemplate: `<button class="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 hover:scale-105 transition shadow-lg">Click Me</button>`
  },
  {
    id: 'button-secondary',
    name: 'Secondary Button',
    category: 'buttons',
    icon: <Square className="w-5 h-5" />,
    description: 'Secondary action button',
    tags: ['button', 'outline', 'secondary'],
    htmlTemplate: `<button class="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-600 hover:text-white transition">Learn More</button>`
  },
  {
    id: 'button-gradient',
    name: 'Gradient Button',
    category: 'buttons',
    icon: <Square className="w-5 h-5" />,
    description: 'Gradient background button',
    tags: ['button', 'gradient', 'colorful'],
    isPro: true,
    htmlTemplate: `<button class="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition shadow-xl">Get Started</button>`
  },
];

export const ElementsSidebar: React.FC<ElementsSidebarProps> = ({
  onElementDragStart,
  onElementDragEnd,
  onElementClick,
  onAIImageGenerated
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ElementCategory | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<ElementCategory>>(
    new Set(['navigation', 'sections', 'social'])
  );
  const [showAIImageDialog, setShowAIImageDialog] = useState(false);

  const categories: { id: ElementCategory | 'all'; name: string; icon: React.ReactNode }[] = [
    { id: 'all', name: 'All Elements', icon: <Layers className="w-4 h-4" /> },
    { id: 'navigation', name: 'Navigation', icon: <Navigation className="w-4 h-4" /> },
    { id: 'sections', name: 'Sections', icon: <Layout className="w-4 h-4" /> },
    { id: 'social', name: 'Social Media', icon: <Heart className="w-4 h-4" /> },
    { id: 'content', name: 'Content', icon: <Type className="w-4 h-4" /> },
    { id: 'media', name: 'Media', icon: <Image className="w-4 h-4" /> },
    { id: 'forms', name: 'Forms', icon: <Mail className="w-4 h-4" /> },
    { id: 'buttons', name: 'Buttons', icon: <Square className="w-4 h-4" /> },
  ];

  const filteredElements = ELEMENT_LIBRARY.filter(element => {
    const matchesSearch = element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          element.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || element.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedElements = filteredElements.reduce((acc, element) => {
    if (!acc[element.category]) {
      acc[element.category] = [];
    }
    acc[element.category].push(element);
    return acc;
  }, {} as Record<ElementCategory, WebElement[]>);

  const toggleCategory = (category: ElementCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, element: WebElement) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(element));
    e.dataTransfer.setData('text/html', element.htmlTemplate);
    onElementDragStart?.(element);
  };

  const handleDragEnd = () => {
    onElementDragEnd?.();
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Elements
        </h2>
        
        {/* Search */}
        <Input
          type="text"
          placeholder="Search elements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-3 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
        />

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent border border-border'
              }`}
            >
              {category.icon}
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* AI Image Generator Button */}
        <button
          onClick={() => setShowAIImageDialog(true)}
          className="mt-3 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate AI Image</span>
        </button>
      </div>

      {/* Elements List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          
          {selectedCategory === 'all' ? (
            // Show grouped by category
            Object.entries(groupedElements).map(([category, elements]) => (
              <div key={category} className="space-y-2">
                <button
                  onClick={() => toggleCategory(category as ElementCategory)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-foreground hover:text-primary transition"
                >
                  <span className="capitalize">{category}</span>
                  {expandedCategories.has(category as ElementCategory) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {expandedCategories.has(category as ElementCategory) && (
                  <div className="space-y-2 pl-2">
                    {elements.map(element => (
                      <ElementCard
                        key={element.id}
                        element={element}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onClick={onElementClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            // Show flat list for specific category
            <div className="space-y-2">
              {filteredElements.map(element => (
                <ElementCard
                  key={element.id}
                  element={element}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onClick={onElementClick}
                />
              ))}
            </div>
          )}

          {filteredElements.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No elements found</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Try a different search</p>
            </div>
          )}

        </div>
      </ScrollArea>

      {/* Footer Tip */}
      <div className="p-4 border-t border-border bg-secondary">
        <p className="text-xs text-secondary-foreground flex items-start gap-2">
          <GripVertical className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
          <span>Drag elements onto the canvas to add them to your page</span>
        </p>
      </div>

      {/* AI Image Generator Dialog */}
      <AIImageGeneratorDialog
        isOpen={showAIImageDialog}
        onClose={() => setShowAIImageDialog(false)}
        onImageGenerated={(imageUrl, metadata) => {
          onAIImageGenerated?.(imageUrl, { prompt: metadata });
        }}
      />

    </div>
  );
};

interface ElementCardProps {
  element: WebElement;
  onDragStart: (e: React.DragEvent, element: WebElement) => void;
  onDragEnd: () => void;
  onClick?: (element: WebElement) => void;
}

const ElementCard: React.FC<ElementCardProps> = ({ element, onDragStart, onDragEnd, onClick }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, element)}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.(element)}
      className="group relative bg-card border border-border rounded-lg p-3 hover:border-primary transition cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
          {element.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground truncate">
              {element.name}
            </h4>
            {element.isPro && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">PRO</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {element.description}
          </p>
        </div>
      </div>

      {/* Drag Indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default ElementsSidebar;
