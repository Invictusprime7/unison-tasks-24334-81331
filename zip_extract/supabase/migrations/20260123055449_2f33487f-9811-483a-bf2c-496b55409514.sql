-- Add per-business notification settings for booking confirmations
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS notification_email text,
ADD COLUMN IF NOT EXISTS notification_phone text;

-- Optional: quick lookup index for admin UX
CREATE INDEX IF NOT EXISTS idx_businesses_notification_email ON public.businesses (notification_email);
CREATE INDEX IF NOT EXISTS idx_businesses_notification_phone ON public.businesses (notification_phone);