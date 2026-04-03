/**
 * @deprecated This file contains examples of deprecated patterns.
 * 
 * DO NOT USE THESE PATTERNS IN PRODUCTION CODE.
 * 
 * Instead, use:
 * - src/runtime/intentRouter.ts for intent-based routing
 * - supabase/functions/builder-actions for pack installation
 * - supabase/functions/create-lead for lead creation
 * - supabase/functions/create-booking for booking management
 * - Supabase Auth for authentication
 * 
 * SECURITY WARNING: The patterns shown here attempted to use service role keys
 * in frontend code, which is a critical security vulnerability.
 */

import { supabase } from "@/integrations/supabase/client";
import { handleIntent, INTENT_PACKS, AVAILABLE_INTENTS } from "@/runtime/intentRouter";
import IntentAPI from "@/api/adminApi";

console.error(
  '[DEPRECATED] serverUsageExamples.ts contains deprecated patterns. ' +
  'See src/runtime/intentRouter.ts for the new architecture.'
);

/**
 * NEW RECOMMENDED PATTERNS
 * These examples show the correct way to use the new architecture
 */

// ========================
// Intent Router Examples
// ========================

/**
 * Example: Submit a contact form
 */
export async function exampleContactFormSubmission() {
  const result = await handleIntent('contact.submit', {
    businessId: 'your-business-id',
    name: 'John Doe',
    email: 'john@example.com',
    message: 'I want to learn more about your services',
    source: 'contact_page'
  });

  if (result.success) {
    console.log('Lead created:', result.data);
  } else {
    console.error('Error:', result.error);
  }
}

/**
 * Example: Create a booking
 */
export async function exampleBookingCreation() {
  const result = await handleIntent('booking.create', {
    businessId: 'your-business-id',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    serviceId: 'service-uuid',
    startsAt: new Date().toISOString(),
  });

  if (result.success) {
    console.log('Booking confirmed:', result.data);
  } else {
    console.error('Booking failed:', result.error);
  }
}

/**
 * Example: User authentication
 */
export async function exampleUserAuthentication() {
  // Sign up
  const signUpResult = await handleIntent('auth.signup', {
    email: 'user@example.com',
    password: 'securePassword123'
  });

  // Sign in
  const signInResult = await handleIntent('auth.signin', {
    email: 'user@example.com',
    password: 'securePassword123'
  });

  // Sign out
  const signOutResult = await handleIntent('auth.signout', {});
}

// ========================
// Builder Actions Examples
// ========================

/**
 * Example: Install packs for a new project
 */
export async function exampleInstallPacks() {
  // Install leads pack
  await IntentAPI.installPack('leads', 'your-business-id');
  
  // Install booking pack
  await IntentAPI.installPack('booking', 'your-business-id');
  
  // Install auth pack (uses Supabase Auth, no tables needed)
  await IntentAPI.installPack('auth', 'your-business-id');
}

/**
 * Example: Wire a button to an intent
 */
export async function exampleWireButton() {
  await IntentAPI.wireButton(
    'button:contains("Book Now")',
    'booking.create',
    { serviceId: '{{state.selectedServiceId}}' }
  );
}

/**
 * Example: Check installed packs
 */
export async function exampleGetPackStatus() {
  const status = await IntentAPI.getPackStatus();
  console.log('Installed packs:', status);
}

// ========================
// Direct Supabase Usage (for non-intent operations)
// ========================

/**
 * Example: Query data using anon key (with RLS)
 */
export async function exampleDirectQuery() {
  // This is safe - uses anon key and respects RLS
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Query error:', error);
  } else {
    console.log('Leads:', leads);
  }
}

/**
 * Example: File upload using Supabase Storage
 */
export async function exampleFileUpload(file: File) {
  const fileName = `${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('user-files')
    .upload(fileName, file);

  if (error) {
    console.error('Upload error:', error);
  } else {
    console.log('Uploaded:', data);
  }
}

// ========================
// List available intents
// ========================

export function listAvailableIntents() {
  console.log('Available Intents:', AVAILABLE_INTENTS);
  console.log('Intent Packs:', INTENT_PACKS);
}

// Export for reference
export { handleIntent, INTENT_PACKS, AVAILABLE_INTENTS, IntentAPI };
