-- Allow telephony bridges to read the AI operator switch through the public status endpoint.
-- This exposes only on/off status, not call content or customer data.

REVOKE ALL ON FUNCTION public.get_ai_operator_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ai_operator_status() TO anon, authenticated, service_role;
