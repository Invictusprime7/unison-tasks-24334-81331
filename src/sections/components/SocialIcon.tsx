import React from 'react';
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Github,
  Twitch,
  Dribbble,
  Figma,
  Globe,
} from 'lucide-react';

/**
 * SocialIcon — renders a brand glyph for a given platform name.
 * Falls back to a generic globe when the platform is unknown.
 *
 * Uses inline SVG for TikTok / Pinterest / X (Twitter rebrand) since
 * lucide-react does not ship those marks.
 */
export interface SocialIconProps {
  platform: string;
  size?: number;
  className?: string;
  color?: string;
}

const TikTokSvg: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.94a4.85 4.85 0 0 1-1.84-.25z" />
  </svg>
);

const PinterestSvg: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M12 0a12 12 0 0 0-4.37 23.17c-.06-.94-.11-2.38.02-3.4.12-.93 1.27-5.93 1.27-5.93s-.32-.65-.32-1.6c0-1.5.87-2.62 1.95-2.62.92 0 1.36.69 1.36 1.51 0 .92-.59 2.3-.89 3.58-.25 1.07.54 1.95 1.6 1.95 1.92 0 3.4-2.03 3.4-4.95 0-2.59-1.86-4.4-4.52-4.4-3.08 0-4.89 2.31-4.89 4.7 0 .93.36 1.93.81 2.47.09.11.1.2.07.32-.08.34-.27 1.07-.31 1.22-.05.2-.16.24-.37.15-1.38-.64-2.25-2.66-2.25-4.28 0-3.49 2.53-6.69 7.3-6.69 3.83 0 6.81 2.73 6.81 6.38 0 3.81-2.4 6.87-5.74 6.87-1.12 0-2.18-.58-2.54-1.27 0 0-.55 2.11-.69 2.62-.25.96-.93 2.17-1.39 2.9A12 12 0 1 0 12 0z" />
  </svg>
);

const XSvg: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M18.244 2H21l-6.52 7.45L22 22h-6.83l-4.79-6.27L4.8 22H2l6.97-7.97L2 2h6.91l4.34 5.75L18.24 2zm-1.2 18h1.66L7.05 4H5.27l11.77 16z" />
  </svg>
);

export const SocialIcon: React.FC<SocialIconProps> = ({
  platform,
  size = 18,
  className,
  color = 'currentColor',
}) => {
  const key = (platform || '').toLowerCase().trim();
  const props = { size, className, color, 'aria-hidden': true } as const;

  switch (key) {
    case 'instagram':
    case 'ig':
      return <Instagram {...props} />;
    case 'facebook':
    case 'fb':
    case 'meta':
      return <Facebook {...props} />;
    case 'twitter':
      return <Twitter {...props} />;
    case 'x':
    case 'x.com':
      return <span className={className}><XSvg size={size} color={color} /></span>;
    case 'linkedin':
    case 'in':
      return <Linkedin {...props} />;
    case 'youtube':
    case 'yt':
      return <Youtube {...props} />;
    case 'github':
    case 'gh':
      return <Github {...props} />;
    case 'twitch':
      return <Twitch {...props} />;
    case 'dribbble':
      return <Dribbble {...props} />;
    case 'figma':
      return <Figma {...props} />;
    case 'tiktok':
      return <span className={className}><TikTokSvg size={size} color={color} /></span>;
    case 'pinterest':
      return <span className={className}><PinterestSvg size={size} color={color} /></span>;
    default:
      return <Globe {...props} />;
  }
};

export const socialAriaLabel = (platform: string): string => {
  const key = (platform || '').toLowerCase().trim();
  if (!key) return 'Social link';
  return `Visit our ${key.charAt(0).toUpperCase()}${key.slice(1)} page`;
};
