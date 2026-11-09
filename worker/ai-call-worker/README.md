# Medical Line AI Call Worker

This process runs on the DigitalOcean VPS. It polls Supabase for queued `ai_call_jobs`, atomically claims one job, and sends it to one universal dynamic Asterisk/AudioSocket bridge.

The worker never runs in the browser and never requires a Windows PC to remain online. Keep `SUPABASE_SERVICE_ROLE_KEY` and `AI_CALL_BRIDGE_TOKEN` only in the VPS environment.

## AI calling master switch

Outbound AI calls are controlled by `public.ai_operator_settings.calls_enabled`.
The admin panel at `/admin/ai` can turn the assistant on or off. When it is off,
the worker keeps running but does not claim new `queued` call jobs, so the phone
number can be used normally for manual calling.

Apply `supabase/sql/46_ai_operator_master_switch.sql` before relying on this
switch in production. The migration also updates `claim_ai_call_job()` so the
database refuses to hand out new calls while AI calling is disabled.

## Run locally on the VPS

```bash
cp .env.example .env
node --env-file=.env index.mjs
```

`AI_CALL_BRIDGE_URL` is the single universal bridge endpoint. It receives the task JSON and dynamically executes `exact_message` or campaign-scoped `ai_dialogue`; it does not need separate FinScan, engineering, debt, or notification bridges. The existing VPS bridge starts the Asterisk call, connects AudioSocket/Gemini, and returns structured call results. This worker does not rebuild or control Asterisk.

`ai_agent_orders` is read-only in this environment. A confirmed order is sent to `AI_ORDER_CREATE_URL`, which must be the existing order creation API or the underlying `order_portal_orders` flow. The worker never inserts into the view.
