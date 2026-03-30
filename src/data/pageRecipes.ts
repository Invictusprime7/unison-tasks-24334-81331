import type { IndustryRecipeSet, NavItem, PageRecipe } from "../schemas/SiteGraph";
import type { Industry, IntentType } from "../schemas/BusinessBlueprint";

/**
 * =========================================
 * Industry Page Recipes
 * "Click nav → page exists with features"
 * =========================================
 * 
 * Each industry has:
 * - Default nav items (semantic, not cosmetic)
 * - Page recipes for each nav intent
 * - Required features and section sequences
 */

// ============================================
// HELPER: Common section recipes
// ============================================

const COMMON_SECTIONS = {
  hero: (intent: IntentType = "lead.capture") => ({
    type: "hero",
    order: 0,
    defaultProps: { variant: "split", showCta: true },
    intents: [intent],
  }),
  
  services: () => ({
    type: "services",
    order: 10,
    defaultProps: { variant: "grid", showPrices: true },
    intents: ["booking.create" as IntentType],
  }),
  
  testimonials: () => ({
    type: "testimonials",
    order: 20,
    defaultProps: { variant: "carousel" },
    intents: [],
  }),
  
  faq: () => ({
    type: "faq",
    order: 30,
    defaultProps: { variant: "accordion" },
    intents: [],
  }),
  
  contactForm: () => ({
    type: "contact",
    order: 40,
    defaultProps: { showMap: true, showHours: true },
    intents: ["contact.submit" as IntentType],
  }),
  
  ctaBanner: (intent: IntentType = "lead.capture") => ({
    type: "cta-banner",
    order: 50,
    defaultProps: { variant: "centered" },
    intents: [intent],
  }),
  
  newsletter: () => ({
    type: "newsletter",
    order: 60,
    defaultProps: { variant: "inline" },
    intents: ["newsletter.subscribe" as IntentType],
  }),
  
  footer: () => ({
    type: "footer",
    order: 100,
    defaultProps: { showSocial: true, showNewsletter: true },
    intents: [],
  }),
};

// ============================================
// SALON & SPA RECIPES
// ============================================

const salonNavItems: NavItem[] = [
  {
    navKey: "home",
    label: "Home",
    path: "/",
    pageIntent: "home",
    requiredFeatures: ["hero_section", "services_list", "testimonials", "newsletter_form"],
    boundIntents: ["booking.create", "newsletter.subscribe"],
    order: 0,
    visibility: "nav",
  },
  {
    navKey: "services",
    label: "Services",
    path: "/services",
    pageIntent: "services.browse",
    requiredFeatures: ["services_list", "pricing_table"],
    boundIntents: ["booking.create"],
    order: 1,
    visibility: "nav",
  },
  {
    navKey: "booking",
    label: "Book Now",
    path: "/book",
    pageIntent: "booking.start",
    requiredFeatures: ["service_picker", "staff_picker", "time_slots", "confirmation_flow"],
    boundIntents: ["booking.create"],
    order: 2,
    visibility: "nav",
  },
  {
    navKey: "team",
    label: "Our Team",
    path: "/team",
    pageIntent: "team.view",
    requiredFeatures: ["team_grid"],
    boundIntents: ["booking.create"],
    order: 3,
    visibility: "nav",
  },
  {
    navKey: "gallery",
    label: "Gallery",
    path: "/gallery",
    pageIntent: "gallery.view",
    requiredFeatures: ["gallery_grid"],
    boundIntents: [],
    order: 4,
    visibility: "nav",
  },
  {
    navKey: "contact",
    label: "Contact",
    path: "/contact",
    pageIntent: "contact.view",
    requiredFeatures: ["contact_form", "location_map", "business_hours"],
    boundIntents: ["contact.submit"],
    order: 5,
    visibility: "both",
  },
];

const salonRecipes: Record<string, PageRecipe> = {
  home: {
    id: "salon_home",
    name: "Salon Home Page",
    forIntent: "home",
    pageType: "home",
    providesFeatures: ["hero_section", "services_list", "testimonials", "newsletter_form", "social_proof"],
    sections: [
      COMMON_SECTIONS.hero("booking.create"),
      COMMON_SECTIONS.services(),
      COMMON_SECTIONS.testimonials(),
      { type: "stats", order: 25, defaultProps: { variant: "counter" }, intents: [] },
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.newsletter(),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["services", "testimonials"],
    requiredIntents: ["booking.create", "newsletter.subscribe"],
  },
  
  "booking.start": {
    id: "salon_booking",
    name: "Salon Booking Page",
    forIntent: "booking.start",
    pageType: "booking",
    providesFeatures: ["service_picker", "staff_picker", "time_slots", "confirmation_flow"],
    sections: [
      { type: "booking-hero", order: 0, defaultProps: { variant: "minimal" }, intents: [] },
      { type: "booking-flow", order: 10, defaultProps: { showStaffPicker: true, showDeposit: false }, intents: ["booking.create"] },
      COMMON_SECTIONS.faq(),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["services", "staff", "bookings", "availability"],
    requiredIntents: ["booking.create"],
    seoTemplate: {
      titlePattern: "Book Your Appointment | {{business_name}}",
      descriptionPattern: "Schedule your next appointment at {{business_name}}. Choose your service, stylist, and time.",
    },
  },
  
  "services.browse": {
    id: "salon_services",
    name: "Salon Services Page",
    forIntent: "services.browse",
    pageType: "services",
    providesFeatures: ["services_list", "pricing_table"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Our Services" }, intents: [] },
      { type: "services-full", order: 10, defaultProps: { showPrices: true, showDuration: true, groupByCategory: true }, intents: ["booking.create"] },
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["services"],
    requiredIntents: ["booking.create"],
  },
  
  "team.view": {
    id: "salon_team",
    name: "Salon Team Page",
    forIntent: "team.view",
    pageType: "about",
    providesFeatures: ["team_grid"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Meet Our Team" }, intents: [] },
      { type: "team-grid", order: 10, defaultProps: { showSpecialties: true, showBookButton: true }, intents: ["booking.create"] },
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["staff"],
    requiredIntents: ["booking.create"],
  },
  
  "gallery.view": {
    id: "salon_gallery",
    name: "Salon Gallery Page",
    forIntent: "gallery.view",
    pageType: "about",
    providesFeatures: ["gallery_grid"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Our Work" }, intents: [] },
      { type: "gallery-masonry", order: 10, defaultProps: { columns: 3, showLightbox: true }, intents: [] },
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: [],
    requiredIntents: [],
  },
  
  "contact.view": {
    id: "salon_contact",
    name: "Salon Contact Page",
    forIntent: "contact.view",
    pageType: "contact",
    providesFeatures: ["contact_form", "location_map", "business_hours", "phone_button"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Contact Us" }, intents: [] },
      { type: "contact-split", order: 10, defaultProps: { showMap: true, showHours: true, showPhone: true }, intents: ["contact.submit", "call.now"] },
      COMMON_SECTIONS.faq(),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: [],
    requiredIntents: ["contact.submit"],
  },
};

// ============================================
// RESTAURANT RECIPES
// ============================================

const restaurantNavItems: NavItem[] = [
  {
    navKey: "home",
    label: "Home",
    path: "/",
    pageIntent: "home",
    requiredFeatures: ["hero_section", "menu_items", "testimonials"],
    boundIntents: ["booking.create"],
    order: 0,
    visibility: "nav",
  },
  {
    navKey: "menu",
    label: "Menu",
    path: "/menu",
    pageIntent: "menu.view",
    requiredFeatures: ["menu_categories", "menu_items", "dietary_filters"],
    boundIntents: [],
    order: 1,
    visibility: "nav",
  },
  {
    navKey: "reservations",
    label: "Reservations",
    path: "/reservations",
    pageIntent: "booking.start",
    requiredFeatures: ["reservation_form", "calendar_view"],
    boundIntents: ["booking.create"],
    order: 2,
    visibility: "nav",
  },
  {
    navKey: "about",
    label: "About",
    path: "/about",
    pageIntent: "about.view",
    requiredFeatures: ["hero_section", "team_grid", "gallery_grid"],
    boundIntents: [],
    order: 3,
    visibility: "nav",
  },
  {
    navKey: "contact",
    label: "Contact",
    path: "/contact",
    pageIntent: "contact.view",
    requiredFeatures: ["contact_form", "location_map", "business_hours"],
    boundIntents: ["contact.submit"],
    order: 4,
    visibility: "both",
  },
];

const restaurantRecipes: Record<string, PageRecipe> = {
  home: {
    id: "restaurant_home",
    name: "Restaurant Home Page",
    forIntent: "home",
    pageType: "home",
    providesFeatures: ["hero_section", "menu_items", "testimonials", "newsletter_form"],
    sections: [
      COMMON_SECTIONS.hero("booking.create"),
      { type: "menu-featured", order: 10, defaultProps: { limit: 6, showCategories: true }, intents: [] },
      COMMON_SECTIONS.testimonials(),
      { type: "ambiance-gallery", order: 30, defaultProps: { variant: "carousel" }, intents: [] },
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["menu_items", "menu_categories"],
    requiredIntents: ["booking.create"],
  },
  
  "menu.view": {
    id: "restaurant_menu",
    name: "Restaurant Menu Page",
    forIntent: "menu.view",
    pageType: "menu",
    providesFeatures: ["menu_categories", "menu_items", "dietary_filters"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Our Menu" }, intents: [] },
      { type: "menu-full", order: 10, defaultProps: { groupByCategory: true, showDietary: true, showPrices: true }, intents: [] },
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["menu_items", "menu_categories"],
    requiredIntents: [],
  },
  
  "booking.start": {
    id: "restaurant_reservations",
    name: "Restaurant Reservations Page",
    forIntent: "booking.start",
    pageType: "booking",
    providesFeatures: ["reservation_form", "calendar_view", "confirmation_flow"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Make a Reservation" }, intents: [] },
      { type: "reservation-flow", order: 10, defaultProps: { showPartySize: true, showSpecialRequests: true }, intents: ["booking.create"] },
      { type: "location-info", order: 20, defaultProps: { showMap: true, showHours: true }, intents: [] },
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["bookings", "availability"],
    requiredIntents: ["booking.create"],
  },
  
  "about.view": {
    id: "restaurant_about",
    name: "Restaurant About Page",
    forIntent: "about.view",
    pageType: "about",
    providesFeatures: ["hero_section", "team_grid"],
    sections: [
      { type: "story-hero", order: 0, defaultProps: { variant: "image-left" }, intents: [] },
      { type: "team-grid", order: 10, defaultProps: { title: "Meet Our Chefs" }, intents: [] },
      { type: "values", order: 20, defaultProps: { variant: "icons" }, intents: [] },
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["staff"],
    requiredIntents: [],
  },
  
  "contact.view": {
    id: "restaurant_contact",
    name: "Restaurant Contact Page",
    forIntent: "contact.view",
    pageType: "contact",
    providesFeatures: ["contact_form", "location_map", "business_hours"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Visit Us" }, intents: [] },
      { type: "contact-split", order: 10, defaultProps: { showMap: true, showHours: true, showPhone: true }, intents: ["contact.submit"] },
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: [],
    requiredIntents: ["contact.submit"],
  },
};

// ============================================
// ECOMMERCE RECIPES
// ============================================

const ecommerceNavItems: NavItem[] = [
  {
    navKey: "home",
    label: "Home",
    path: "/",
    pageIntent: "home",
    requiredFeatures: ["hero_section", "product_grid", "testimonials"],
    boundIntents: ["shop.add_to_cart", "shop.buy_now"],
    order: 0,
    visibility: "nav",
  },
  {
    navKey: "shop",
    label: "Shop",
    path: "/shop",
    pageIntent: "shop.browse",
    requiredFeatures: ["product_grid"],
    boundIntents: ["shop.add_to_cart"],
    order: 1,
    visibility: "nav",
  },
  {
    navKey: "cart",
    label: "Cart",
    path: "/cart",
    pageIntent: "cart.view",
    requiredFeatures: ["cart_widget"],
    boundIntents: ["shop.checkout"],
    order: 2,
    visibility: "nav",
    icon: "shopping-cart",
  },
  {
    navKey: "about",
    label: "About",
    path: "/about",
    pageIntent: "about.view",
    requiredFeatures: ["hero_section"],
    boundIntents: [],
    order: 3,
    visibility: "nav",
  },
  {
    navKey: "contact",
    label: "Contact",
    path: "/contact",
    pageIntent: "contact.view",
    requiredFeatures: ["contact_form"],
    boundIntents: ["contact.submit"],
    order: 4,
    visibility: "both",
  },
];

const ecommerceRecipes: Record<string, PageRecipe> = {
  home: {
    id: "ecommerce_home",
    name: "Ecommerce Home Page",
    forIntent: "home",
    pageType: "home",
    providesFeatures: ["hero_section", "product_grid", "testimonials", "newsletter_form"],
    sections: [
      COMMON_SECTIONS.hero("shop.buy_now"),
      { type: "featured-products", order: 10, defaultProps: { limit: 8, showBadges: true }, intents: ["shop.add_to_cart"] },
      { type: "categories-grid", order: 20, defaultProps: { limit: 4 }, intents: [] },
      COMMON_SECTIONS.testimonials(),
      COMMON_SECTIONS.newsletter(),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["products", "categories"],
    requiredIntents: ["shop.add_to_cart", "newsletter.subscribe"],
  },
  
  "shop.browse": {
    id: "ecommerce_shop",
    name: "Ecommerce Shop Page",
    forIntent: "shop.browse",
    pageType: "shop",
    providesFeatures: ["product_grid"],
    sections: [
      { type: "shop-header", order: 0, defaultProps: { showFilters: true, showSort: true }, intents: [] },
      { type: "product-grid", order: 10, defaultProps: { columns: 4, showQuickView: true }, intents: ["shop.add_to_cart"] },
      { type: "pagination", order: 20, defaultProps: {}, intents: [] },
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["products", "categories"],
    requiredIntents: ["shop.add_to_cart"],
  },
  
  "cart.view": {
    id: "ecommerce_cart",
    name: "Ecommerce Cart Page",
    forIntent: "cart.view",
    pageType: "cart",
    providesFeatures: ["cart_widget"],
    sections: [
      { type: "cart-full", order: 0, defaultProps: { showThumbnails: true, showQuantity: true }, intents: ["shop.checkout"] },
      { type: "upsells", order: 10, defaultProps: { limit: 4 }, intents: ["shop.add_to_cart"] },
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["cart_items"],
    requiredIntents: ["shop.checkout"],
  },
  
  "about.view": {
    id: "ecommerce_about",
    name: "Ecommerce About Page",
    forIntent: "about.view",
    pageType: "about",
    providesFeatures: ["hero_section"],
    sections: [
      { type: "story-hero", order: 0, defaultProps: {}, intents: [] },
      { type: "values", order: 10, defaultProps: { variant: "icons" }, intents: [] },
      COMMON_SECTIONS.testimonials(),
      COMMON_SECTIONS.ctaBanner("shop.buy_now"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: [],
    requiredIntents: [],
  },
  
  "contact.view": {
    id: "ecommerce_contact",
    name: "Ecommerce Contact Page",
    forIntent: "contact.view",
    pageType: "contact",
    providesFeatures: ["contact_form"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Contact Us" }, intents: [] },
      COMMON_SECTIONS.contactForm(),
      COMMON_SECTIONS.faq(),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: [],
    requiredIntents: ["contact.submit"],
  },
};

// ============================================
// LOCAL SERVICE RECIPES (contractors, plumbers, etc.)
// ============================================

const localServiceNavItems: NavItem[] = [
  {
    navKey: "home",
    label: "Home",
    path: "/",
    pageIntent: "home",
    requiredFeatures: ["hero_section", "services_list", "testimonials", "social_proof"],
    boundIntents: ["lead.capture", "call.now"],
    order: 0,
    visibility: "nav",
  },
  {
    navKey: "services",
    label: "Services",
    path: "/services",
    pageIntent: "services.browse",
    requiredFeatures: ["services_list", "pricing_table"],
    boundIntents: ["lead.capture"],
    order: 1,
    visibility: "nav",
  },
  {
    navKey: "about",
    label: "About",
    path: "/about",
    pageIntent: "about.view",
    requiredFeatures: ["hero_section", "team_grid"],
    boundIntents: [],
    order: 2,
    visibility: "nav",
  },
  {
    navKey: "gallery",
    label: "Our Work",
    path: "/gallery",
    pageIntent: "gallery.view",
    requiredFeatures: ["gallery_grid"],
    boundIntents: [],
    order: 3,
    visibility: "nav",
  },
  {
    navKey: "contact",
    label: "Get a Quote",
    path: "/contact",
    pageIntent: "contact.view",
    requiredFeatures: ["contact_form", "location_map", "phone_button"],
    boundIntents: ["contact.submit", "call.now"],
    order: 4,
    visibility: "both",
  },
];

const localServiceRecipes: Record<string, PageRecipe> = {
  home: {
    id: "local_service_home",
    name: "Local Service Home Page",
    forIntent: "home",
    pageType: "home",
    providesFeatures: ["hero_section", "services_list", "testimonials", "social_proof", "stats_counter"],
    sections: [
      COMMON_SECTIONS.hero("lead.capture"),
      { type: "trust-badges", order: 5, defaultProps: { variant: "inline" }, intents: [] },
      COMMON_SECTIONS.services(),
      { type: "stats", order: 25, defaultProps: { variant: "counter" }, intents: [] },
      COMMON_SECTIONS.testimonials(),
      { type: "service-areas", order: 35, defaultProps: {}, intents: [] },
      COMMON_SECTIONS.ctaBanner("lead.capture"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["services"],
    requiredIntents: ["lead.capture", "contact.submit"],
  },
  
  "services.browse": {
    id: "local_service_services",
    name: "Local Service Services Page",
    forIntent: "services.browse",
    pageType: "services",
    providesFeatures: ["services_list", "pricing_table"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Our Services" }, intents: [] },
      { type: "services-detailed", order: 10, defaultProps: { showPrices: true, showCta: true }, intents: ["lead.capture"] },
      COMMON_SECTIONS.faq(),
      COMMON_SECTIONS.ctaBanner("lead.capture"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["services"],
    requiredIntents: ["lead.capture"],
  },
  
  "about.view": {
    id: "local_service_about",
    name: "Local Service About Page",
    forIntent: "about.view",
    pageType: "about",
    providesFeatures: ["hero_section", "team_grid"],
    sections: [
      { type: "story-hero", order: 0, defaultProps: {}, intents: [] },
      { type: "team-grid", order: 10, defaultProps: {}, intents: [] },
      { type: "certifications", order: 20, defaultProps: {}, intents: [] },
      COMMON_SECTIONS.ctaBanner("lead.capture"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["staff"],
    requiredIntents: [],
  },
  
  "gallery.view": {
    id: "local_service_gallery",
    name: "Local Service Gallery Page",
    forIntent: "gallery.view",
    pageType: "about",
    providesFeatures: ["gallery_grid"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Our Work" }, intents: [] },
      { type: "project-gallery", order: 10, defaultProps: { showBefore: true, showAfter: true }, intents: [] },
      COMMON_SECTIONS.ctaBanner("lead.capture"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: [],
    requiredIntents: [],
  },
  
  "contact.view": {
    id: "local_service_contact",
    name: "Local Service Contact Page",
    forIntent: "contact.view",
    pageType: "contact",
    providesFeatures: ["contact_form", "location_map", "phone_button"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Get a Free Quote" }, intents: [] },
      { type: "quote-form", order: 10, defaultProps: { showServicePicker: true }, intents: ["lead.capture"] },
      { type: "contact-info", order: 20, defaultProps: { showMap: true, showHours: true }, intents: ["call.now"] },
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: [],
    requiredIntents: ["lead.capture", "contact.submit"],
  },
};

// ============================================
// COACHING/CONSULTING RECIPES
// ============================================

const coachingNavItems: NavItem[] = [
  {
    navKey: "home",
    label: "Home",
    path: "/",
    pageIntent: "home",
    requiredFeatures: ["hero_section", "services_list", "testimonials"],
    boundIntents: ["booking.create", "lead.capture"],
    order: 0,
    visibility: "nav",
  },
  {
    navKey: "services",
    label: "Programs",
    path: "/programs",
    pageIntent: "services.browse",
    requiredFeatures: ["services_list", "pricing_table"],
    boundIntents: ["booking.create"],
    order: 1,
    visibility: "nav",
  },
  {
    navKey: "about",
    label: "About",
    path: "/about",
    pageIntent: "about.view",
    requiredFeatures: ["hero_section"],
    boundIntents: [],
    order: 2,
    visibility: "nav",
  },
  {
    navKey: "booking",
    label: "Book a Call",
    path: "/book",
    pageIntent: "booking.start",
    requiredFeatures: ["calendar_view", "time_slots"],
    boundIntents: ["booking.create"],
    order: 3,
    visibility: "nav",
  },
  {
    navKey: "contact",
    label: "Contact",
    path: "/contact",
    pageIntent: "contact.view",
    requiredFeatures: ["contact_form"],
    boundIntents: ["contact.submit"],
    order: 4,
    visibility: "footer",
  },
];

const coachingRecipes: Record<string, PageRecipe> = {
  home: {
    id: "coaching_home",
    name: "Coaching Home Page",
    forIntent: "home",
    pageType: "home",
    providesFeatures: ["hero_section", "services_list", "testimonials", "newsletter_form"],
    sections: [
      COMMON_SECTIONS.hero("booking.create"),
      { type: "pain-points", order: 5, defaultProps: {}, intents: [] },
      { type: "transformation", order: 10, defaultProps: {}, intents: [] },
      { type: "programs", order: 15, defaultProps: { limit: 3 }, intents: ["booking.create"] },
      COMMON_SECTIONS.testimonials(),
      { type: "about-preview", order: 30, defaultProps: {}, intents: [] },
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.newsletter(),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["services"],
    requiredIntents: ["booking.create", "newsletter.subscribe"],
  },
  
  "services.browse": {
    id: "coaching_programs",
    name: "Coaching Programs Page",
    forIntent: "services.browse",
    pageType: "services",
    providesFeatures: ["services_list", "pricing_table"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Programs & Services" }, intents: [] },
      { type: "programs-detailed", order: 10, defaultProps: { showOutcomes: true }, intents: ["booking.create"] },
      COMMON_SECTIONS.faq(),
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["services"],
    requiredIntents: ["booking.create"],
  },
  
  "booking.start": {
    id: "coaching_booking",
    name: "Coaching Booking Page",
    forIntent: "booking.start",
    pageType: "booking",
    providesFeatures: ["calendar_view", "time_slots", "confirmation_flow"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Book a Discovery Call" }, intents: [] },
      { type: "calendar-booking", order: 10, defaultProps: { duration: 30, showTimezone: true }, intents: ["booking.create"] },
      { type: "what-to-expect", order: 20, defaultProps: {}, intents: [] },
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: ["bookings", "availability"],
    requiredIntents: ["booking.create"],
  },
  
  "about.view": {
    id: "coaching_about",
    name: "Coaching About Page",
    forIntent: "about.view",
    pageType: "about",
    providesFeatures: ["hero_section"],
    sections: [
      { type: "bio-hero", order: 0, defaultProps: {}, intents: [] },
      { type: "credentials", order: 10, defaultProps: {}, intents: [] },
      { type: "philosophy", order: 20, defaultProps: {}, intents: [] },
      COMMON_SECTIONS.testimonials(),
      COMMON_SECTIONS.ctaBanner("booking.create"),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: [],
    requiredIntents: [],
  },
  
  "contact.view": {
    id: "coaching_contact",
    name: "Coaching Contact Page",
    forIntent: "contact.view",
    pageType: "contact",
    providesFeatures: ["contact_form"],
    sections: [
      { type: "page-header", order: 0, defaultProps: { title: "Get in Touch" }, intents: [] },
      COMMON_SECTIONS.contactForm(),
      COMMON_SECTIONS.footer(),
    ],
    requiredTables: [],
    requiredIntents: ["contact.submit"],
  },
};

// ============================================
// REGISTRY
// ============================================

export const industryRecipes: Record<Industry, IndustryRecipeSet> = {
  salon_spa: {
    industry: "salon_spa",
    defaultNavItems: salonNavItems,
    pageRecipes: salonRecipes,
    homeRecipeId: "home",
  },
  
  restaurant: {
    industry: "restaurant",
    defaultNavItems: restaurantNavItems,
    pageRecipes: restaurantRecipes,
    homeRecipeId: "home",
  },
  
  ecommerce: {
    industry: "ecommerce",
    defaultNavItems: ecommerceNavItems,
    pageRecipes: ecommerceRecipes,
    homeRecipeId: "home",
  },
  
  local_service: {
    industry: "local_service",
    defaultNavItems: localServiceNavItems,
    pageRecipes: localServiceRecipes,
    homeRecipeId: "home",
  },
  
  coaching_consulting: {
    industry: "coaching_consulting",
    defaultNavItems: coachingNavItems,
    pageRecipes: coachingRecipes,
    homeRecipeId: "home",
  },
  
  // Fallback to local_service for other industries
  creator_portfolio: {
    industry: "creator_portfolio",
    defaultNavItems: coachingNavItems.map(item => ({
      ...item,
      navKey: item.navKey === "services" ? "work" : item.navKey,
      label: item.label === "Programs" ? "Work" : item.label,
    })),
    pageRecipes: coachingRecipes,
    homeRecipeId: "home",
  },
  
  real_estate: {
    industry: "real_estate",
    defaultNavItems: localServiceNavItems.map(item => ({
      ...item,
      label: item.navKey === "gallery" ? "Listings" : item.label,
    })),
    pageRecipes: localServiceRecipes,
    homeRecipeId: "home",
  },
  
  nonprofit: {
    industry: "nonprofit",
    defaultNavItems: coachingNavItems.map(item => ({
      ...item,
      navKey: item.navKey === "services" ? "programs" : item.navKey,
      label: item.label === "Book a Call" ? "Get Involved" : item.label,
    })),
    pageRecipes: coachingRecipes,
    homeRecipeId: "home",
  },
  
  other: {
    industry: "other",
    defaultNavItems: localServiceNavItems,
    pageRecipes: localServiceRecipes,
    homeRecipeId: "home",
  },
};

// ============================================
// HELPERS
// ============================================

export function getIndustryRecipes(industry: Industry): IndustryRecipeSet {
  return industryRecipes[industry] || industryRecipes.other;
}

export function getPageRecipe(industry: Industry, pageIntent: string): PageRecipe | null {
  const recipes = getIndustryRecipes(industry);
  return recipes.pageRecipes[pageIntent] || null;
}

export function getNavItemsForIndustry(industry: Industry): NavItem[] {
  return getIndustryRecipes(industry).defaultNavItems;
}

/**
 * Find the appropriate recipe for a nav key
 */
export function getRecipeForNavKey(industry: Industry, navKey: string): PageRecipe | null {
  const recipes = getIndustryRecipes(industry);
  const navItem = recipes.defaultNavItems.find(item => item.navKey === navKey);
  
  if (!navItem) return null;
  
  return recipes.pageRecipes[navItem.pageIntent] || null;
}
