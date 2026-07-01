/**
 * dynamicPagePrompt — builds a context-aware prompt for dynamic React page generation.
 * Extracted from WebBuilder.tsx as part of Pass 5 decomposition.
 */

/**
 * Build a context-aware prompt for dynamic React page generation.
 * Called when user clicks a redirect-worthy button and the target page
 * doesn't exist in VFS yet. Output is a React/TSX component.
 */
export function buildDynamicPagePrompt(
  pageName: string,
  _pageContext: string,
  navLabel: string,
  mainPageCode: string,
  options?: {
    businessContext?: string | null;
    designProfile?: {
      dominantStyle?: string;
      industryHints?: string[];
    };
  }
): string {
  // Extract Tailwind class patterns from main page for consistency
  const colorMatch = mainPageCode.match(/(?:bg-|text-|from-|to-)([a-z]+-\d+)/g);
  const colors = colorMatch ? [...new Set(colorMatch)].slice(0, 10).join(', ') : 'blue, purple, gray';

  // Extract CSS variable usage
  const cssVarMatch = mainPageCode.match(/hsl\(var\(--[\w-]+\)\)/g);
  const cssVars = cssVarMatch ? [...new Set(cssVarMatch)].slice(0, 8).join(', ') : '';

  const pagePrompts: Record<string, string> = {
    checkout: `Create a checkout page component with:
- Order summary section with cart items and prices
- Shipping address form (name, email, address, city, state, zip)
- Payment section with card input fields
- Order total with subtotal, shipping, tax breakdown
- "Complete Purchase" button with onClick={() => alert('Order placed!')}
- Trust badges and secure payment icons
- Back to home link using Link from react-router-dom`,

    cart: `Create a shopping cart page component with:
- Cart items list with product images, names, quantities, prices
- Quantity adjusters (+/- buttons)
- Remove item buttons
- Subtotal calculation
- "Proceed to Checkout" link to /checkout
- "Continue Shopping" link back to /
- Empty cart state`,

    booking: `Create a booking/appointment page component with:
- Service selection cards
- Date picker calendar UI (use native date input)
- Available time slots grid
- Customer info form (name, email, phone)
- Special requests textarea
- "Confirm Booking" button with form submit handler
- Cancellation policy notice`,

    contact: `Create a contact page component with:
- Contact form (name, email, phone, subject, message) with useState
- Form validation and submit handler
- Business contact info section (address, phone, email, hours)
- Map placeholder
- Social media links`,

    services: `Create a services page component with:
- Hero section with services overview
- Individual service cards with icons, descriptions, pricing
- "Book Now" buttons linking to /booking
- Service comparison or FAQ section
- CTA to contact for custom quotes`,

    about: `Create an about page component with:
- Company story/mission section
- Team member profiles with photos and bios
- Company values or philosophy
- Timeline or milestones
- Awards/certifications section
- CTA to contact or learn more`,

    products: `Create a products catalog page component with:
- Product grid with images, names, prices using .map()
- Filter/sort controls using useState
- "Add to Cart" buttons
- Product quick view capability
- Pagination or load more
- Featured products section`,

    login: `Create a login page component with:
- Login form (email, password) with useState
- "Sign In" button with form submit handler
- "Forgot Password" link
- "Create Account" link to /signup
- Social login buttons (Google, Apple)
- Remember me checkbox`,

    signup: `Create a registration page component with:
- Signup form (name, email, password, confirm password) with useState
- Password strength indicator
- Terms & conditions checkbox
- "Create Account" button with form submit handler
- Already have account? Sign in link to /login
- Social signup options`,

    pricing: `Create a pricing page component with:
- 3 pricing tiers (Basic, Pro, Enterprise) as a data array
- Feature comparison table
- Toggle for monthly/yearly pricing using useState
- "Get Started" buttons
- FAQ about billing
- Money-back guarantee notice`,

    gallery: `Create a gallery/portfolio page component with:
- Masonry or grid image gallery
- Category filter tabs using useState
- Lightbox-style image viewing with useState
- Project descriptions
- Client testimonials
- CTA to inquire about projects`,
  };

  const specificPrompt = pagePrompts[pageName.toLowerCase()] ||
    `Create a complete ${navLabel || pageName} page component with relevant content, interactive elements using useState, and call-to-action buttons.`;

  return `🚀 CREATE A REACT PAGE COMPONENT: "${navLabel || pageName.toUpperCase()}"

This page is part of a multi-page React website using react-router-dom.
The user clicked "${navLabel}" from the main page.

${specificPrompt}

📋 CRITICAL REQUIREMENTS:

1. **REACT COMPONENT** — Export a default function component. Use React hooks (useState, useEffect) for interactivity.
2. **IMPORTS** — Only import from: 'react', 'react-router-dom' (Link, useNavigate). NO external UI libraries.
3. **TAILWIND CSS** — Use Tailwind utility classes for all styling. Use semantic CSS variables: hsl(var(--background)), hsl(var(--foreground)), hsl(var(--primary)), hsl(var(--primary-foreground)), hsl(var(--muted)), hsl(var(--muted-foreground)), hsl(var(--border)), hsl(var(--card)), hsl(var(--accent)).
4. **MATCH MAIN PAGE STYLING** — Use similar Tailwind classes: ${colors}${cssVars ? `\n   CSS vars found: ${cssVars}` : ''}
5. **NAVIGATION** — Include a header with <Link to="/"> for home and links to other pages.
6. **BACK BUTTON** — Include a prominent <Link to="/">← Back to Home</Link> in the header.
7. **REAL CONTENT** — Write actual text, not "Lorem ipsum" placeholders.
8. **RESPONSIVE** — Mobile-first with md: and lg: breakpoints.
9. **FOOTER** — Match the main page footer style.
10. **NO HTML DOCUMENTS** — Do NOT output <!DOCTYPE html> or <html> tags. This is a React component.
11. **INTENT WIRING** — Wire ALL interactive buttons with data-ut-intent attributes:
    - Contact/form buttons: data-ut-intent="contact.submit"
    - Booking buttons: data-ut-intent="booking.create"
    - Newsletter: data-ut-intent="newsletter.subscribe"
    - CTA buttons: data-ut-intent="cta.primary"
    - Quote requests: data-ut-intent="quote.request"
    - Forms: <form data-ut-intent="contact.submit">
    - Anchor links: <a href="#section" data-ut-intent="nav.anchor">

${options?.businessContext ? `📊 BUSINESS CONTEXT:\n${options.businessContext}` : ''}

${options?.designProfile?.dominantStyle ? `🎨 USER DESIGN PREFERENCES:
- Dominant Style: ${options.designProfile.dominantStyle}
- Industry: ${options.designProfile.industryHints?.join(', ') || 'general'}
Match the user's established design preferences.` : ''}

CONTEXT FROM MAIN PAGE (extract styling patterns):
${mainPageCode.substring(0, 2000)}

OUTPUT: A single React/TSX component file. No markdown fences, no explanations. Just the code starting with import statements.`;
}
