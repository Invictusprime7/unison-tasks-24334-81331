import React, { useState } from 'react';
import type { BaseSectionProps } from '../types';
import { hsl, hsla } from '../themeUtils';
import type { ThemeTokens } from '../types';

/* ── Booking Overlay ──────────────────────────────────────────────── */
const BookingOverlay: React.FC<{ open: boolean; onClose: () => void; theme: ThemeTokens }> = ({ open, onClose, theme }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: '', service: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fire booking intent via postMessage bridge
    window.parent?.postMessage?.({
      type: 'INTENT_TRIGGER',
      intent: 'booking.create',
      payload: { ...form },
    }, '*');
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    borderRadius: theme.radius,
    border: `1px solid ${hsla(theme.colors.border, 0.5)}`,
    background: hsl(theme.colors.background),
    color: hsl(theme.colors.foreground),
    fontFamily: theme.typography.bodyFont,
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '500',
    marginBottom: '0.25rem',
    color: hsl(theme.colors.mutedForeground),
    fontFamily: theme.typography.bodyFont,
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          margin: '1rem',
          background: hsl(theme.colors.card),
          color: hsl(theme.colors.cardForeground),
          borderRadius: theme.radius,
          border: `1px solid ${hsla(theme.colors.border, 0.3)}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${hsla(theme.colors.border, 0.3)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontFamily: theme.typography.headingFont, fontWeight: theme.typography.headingWeight }}>
            Book an Appointment
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: hsl(theme.colors.mutedForeground), fontSize: '1.25rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
              <h3 style={{ fontFamily: theme.typography.headingFont, margin: '0 0 0.5rem' }}>Booking Confirmed!</h3>
              <p style={{ color: hsl(theme.colors.mutedForeground), fontSize: '0.875rem', margin: 0 }}>We'll send a confirmation to {form.email}</p>
              <button
                onClick={onClose}
                style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem', background: hsl(theme.colors.primary), color: hsl(theme.colors.primaryForeground), border: 'none', borderRadius: theme.radius, cursor: 'pointer', fontFamily: theme.typography.bodyFont, fontWeight: '500' }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input required style={inputStyle} value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input required type="email" style={inputStyle} value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@email.com" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <label style={labelStyle}>Service</label>
                  <input style={inputStyle} value={form.service} onChange={(e) => setForm(f => ({ ...f, service: e.target.value }))} placeholder="e.g. Consultation" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input required type="date" style={inputStyle} value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Time *</label>
                  <input required type="time" style={inputStyle} value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special requests..." />
              </div>
              <button
                type="submit"
                style={{
                  marginTop: '0.25rem',
                  padding: '0.75rem',
                  background: hsl(theme.colors.primary),
                  color: hsl(theme.colors.primaryForeground),
                  border: 'none',
                  borderRadius: theme.radius,
                  cursor: 'pointer',
                  fontFamily: theme.typography.bodyFont,
                  fontWeight: '600',
                  fontSize: '0.875rem',
                }}
              >
                Confirm Booking
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Navbar Section ───────────────────────────────────────────────── */
export const NavbarSection: React.FC<BaseSectionProps<'navbar'>> = ({ section, theme }) => {
  const { brand, links = [], cta } = section.props;
  const [bookingOpen, setBookingOpen] = useState(false);

  const isBookingCta = cta?.intent === 'booking' || cta?.intent === 'booking.create' || /book/i.test(cta?.label || '');

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
        style={{
          background: hsla(theme.colors.background, 0.92),
          borderBottom: `1px solid ${hsla(theme.colors.border, 0.4)}`,
        }}
      >
        <div
          className="mx-auto flex items-center justify-between h-16 px-6"
          style={{ maxWidth: theme.containerWidth }}
        >
          <a
            href="#"
            className="text-lg font-semibold tracking-tight"
            style={{
              fontFamily: theme.typography.headingFont,
              color: hsl(theme.colors.foreground),
            }}
          >
            {brand}
          </a>

          <nav className="flex items-center gap-8">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.href}
                data-intent={link.intent}
                className="text-sm transition-colors hover:opacity-80"
                style={{
                  fontFamily: theme.typography.bodyFont,
                  color: hsl(theme.colors.mutedForeground),
                }}
              >
                {link.label}
              </a>
            ))}
            {cta && (
              <button
                onClick={() => {
                  if (isBookingCta) {
                    setBookingOpen(true);
                  } else if (cta.href) {
                    window.location.href = cta.href;
                  }
                }}
                data-intent={cta.intent}
                className="text-sm px-4 py-2 rounded-md transition-all hover:opacity-90"
                style={{
                  background: hsl(theme.colors.primary),
                  color: hsl(theme.colors.primaryForeground),
                  borderRadius: theme.radius,
                  fontFamily: theme.typography.bodyFont,
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {cta.label}
              </button>
            )}
          </nav>
        </div>
      </header>

      <BookingOverlay open={bookingOpen} onClose={() => setBookingOpen(false)} theme={theme} />
    </>
  );
};
