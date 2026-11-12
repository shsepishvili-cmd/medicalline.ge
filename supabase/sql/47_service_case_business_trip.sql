-- Warranty service cases: business trip / field visit tracking.

ALTER TABLE public.service_cases
ADD COLUMN IF NOT EXISTS business_trip_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.service_cases
ADD COLUMN IF NOT EXISTS business_trip_details TEXT;
