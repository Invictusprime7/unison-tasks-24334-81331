/**
 * IntentLink - Intent-Driven Link Component
 * 
 * Replaces raw <a href> tags in AI-generated code.
 * The runtime decides what the link actually does.
 * 
 * @example
 * // Instead of: <a href="/about">About</a>
 * // Generate:   <IntentLink intent="nav.goto" to="/about">About</IntentLink>
 * 
 * // Instead of: <a href="#pricing">Pricing</a>  
 * // Generate:   <IntentLink intent="nav.anchor" to="pricing">Pricing</IntentLink>
 * 
 * // Instead of: <button onclick="openCart()">Cart</button>
 * // Generate:   <IntentLink intent="cart.view">Cart</IntentLink>
 */

import React, { useCallback, forwardRef } from 'react';
import { usePreviewRuntimeSafe } from './usePreviewRuntime';

// ============================================================================
// Types
// ============================================================================

export interface IntentLinkProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
  /** The intent to execute when clicked */
  intent: string;
  /** Target path/anchor/url (depends on intent type) */
  to?: string;
  /** Additional payload for the intent */
  payload?: Record<string, unknown>;
  /** Render as button instead of anchor */
  asButton?: boolean;
  /** Button variant (if asButton) */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  /** Disabled state */
  disabled?: boolean;
  /** Children */
  children: React.ReactNode;
  /** Target for anchor links */
  target?: string;
  /** Rel for anchor links */
  rel?: string;
}

// ============================================================================
// Component
// ============================================================================

export const IntentLink = forwardRef<HTMLAnchorElement | HTMLButtonElement, IntentLinkProps>(
  ({ intent, to, payload = {}, asButton, variant, disabled, children, className, ...props }, ref) => {
    // Get runtime context (may be null if used outside PreviewRuntime)
    const runtime = usePreviewRuntimeSafe();
    
    const handleClick = useCallback(
      async (e: React.MouseEvent) => {
        if (disabled) return;
        
        // If no runtime, try to handle basic navigation
        if (!runtime) {
          if (intent === 'nav.goto' && to) {
            // Use hash navigation as fallback
            window.location.hash = to;
          } else if (intent === 'nav.anchor' && to) {
            const el = document.querySelector(`#${to}, [data-section="${to}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          } else if (intent === 'nav.external' && to) {
            window.open(to, '_blank');
          }
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        // Build payload based on intent type
        const fullPayload = { ...payload };
        
        if (to) {
          if (intent.startsWith('nav.')) {
            fullPayload.path = to;
            fullPayload.anchor = to;
            fullPayload.url = to;
          } else if (intent === 'overlay.open') {
            fullPayload.type = to;
          }
        }
        
        await runtime.executeIntent(intent, fullPayload);
      },
      [runtime, intent, to, payload, disabled]
    );
    
    // Build href for SEO/accessibility (doesn't actually navigate)
    const href = to 
      ? intent === 'nav.external' 
        ? to 
        : intent === 'nav.anchor'
          ? `#${to}`
          : `#${to}`
      : '#';
    
    // Style classes based on variant
    const variantClasses: Record<string, string> = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md',
      outline: 'border border-input bg-background hover:bg-accent px-4 py-2 rounded-md',
      ghost: 'hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md',
      link: 'text-primary underline-offset-4 hover:underline',
    };
    
    const baseClassName = [
      'inline-flex items-center justify-center transition-colors',
      disabled && 'opacity-50 pointer-events-none',
      variant && variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ');
    
    // Render as button if requested
    if (asButton) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={baseClassName}
          data-ut-intent={intent}
          data-ut-to={to}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {children}
        </button>
      );
    }
    
    // Render as anchor
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        onClick={handleClick}
        className={baseClassName}
        data-ut-intent={intent}
        data-ut-to={to}
        {...props}
      >
        {children}
      </a>
    );
  }
);

IntentLink.displayName = 'IntentLink';

// ============================================================================
// Utility Components (shortcuts for common intents)
// ============================================================================

/** Navigation link to a page */
export const NavLink: React.FC<Omit<IntentLinkProps, 'intent'> & { to: string }> = (props) => (
  <IntentLink intent="nav.goto" {...props} />
);

/** Anchor link to a section */
export const AnchorLink: React.FC<Omit<IntentLinkProps, 'intent'> & { to: string }> = (props) => (
  <IntentLink intent="nav.anchor" {...props} />
);

/** External link (opens in new tab) */
export const ExternalLink: React.FC<Omit<IntentLinkProps, 'intent'> & { to: string }> = (props) => (
  <IntentLink intent="nav.external" target="_blank" rel="noopener noreferrer" {...props} />
);

/** CTA button that opens an overlay */
export const CTAButton: React.FC<Omit<IntentLinkProps, 'intent' | 'asButton'> & { overlay: string }> = ({
  overlay,
  ...props
}) => <IntentLink intent="overlay.open" to={overlay} asButton {...props} />;

/** Add to cart button */
export const AddToCartButton: React.FC<
  Omit<IntentLinkProps, 'intent' | 'asButton'> & {
    productId: string;
    productName: string;
    price: number;
    quantity?: number;
  }
> = ({ productId, productName, price, quantity = 1, ...props }) => (
  <IntentLink
    intent="cart.add"
    asButton
    payload={{ productId, name: productName, price, quantity }}
    {...props}
  />
);

/** Sign in button */
export const SignInButton: React.FC<Omit<IntentLinkProps, 'intent' | 'asButton'>> = (props) => (
  <IntentLink intent="auth.signin" asButton {...props}>
    {props.children || 'Sign In'}
  </IntentLink>
);

/** Sign up button */
export const SignUpButton: React.FC<Omit<IntentLinkProps, 'intent' | 'asButton'>> = (props) => (
  <IntentLink intent="auth.signup" asButton {...props}>
    {props.children || 'Sign Up'}
  </IntentLink>
);

/** Book now button */
export const BookNowButton: React.FC<
  Omit<IntentLinkProps, 'intent' | 'asButton'> & { service?: string }
> = ({ service, ...props }) => (
  <IntentLink intent="booking.create" asButton payload={{ service }} {...props}>
    {props.children || 'Book Now'}
  </IntentLink>
);

export default IntentLink;
