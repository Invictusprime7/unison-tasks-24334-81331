/**
 * Testimonials Variant: Spotlight
 * One dominant quote with supporting proof beneath.
 */

import React from 'react';
import type { BaseSectionProps } from '../../types';
import { TestimonialsFrame, TestimonialCard, normalizeTestimonials } from './TestimonialsFrame';

export const TestimonialsSpotlight: React.FC<BaseSectionProps<'testimonials'>> = ({ section, theme }) => {
  const items = normalizeTestimonials(section.props.items);
  const [featured, ...rest] = items;
  if (!featured) return null;

  return (
    <TestimonialsFrame
      variantId="testimonials:spotlight"
      theme={theme}
      headline={section.props.headline}
      subheadline={section.props.subheadline}
      surface="muted"
    >
      <TestimonialCard item={featured} theme={theme} emphasis className="mx-auto max-w-3xl text-center" />
      {rest.length > 0 && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {rest.slice(0, 4).map((item, i) => (
            <TestimonialCard key={i} item={item} theme={theme} />
          ))}
        </div>
      )}
    </TestimonialsFrame>
  );
};
