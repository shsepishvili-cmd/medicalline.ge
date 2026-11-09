# VPS Worker Integration Contract

The web application creates a row in `public.ai_call_jobs` with `status: queued`. The VPS worker claims it through `claim_ai_call_job(worker_name)` and sends the following JSON to the existing telephony bridge.

## Universal bridge input

The bridge is generic. The website does not select a FinScan bridge, engineering bridge, or debt bridge. It creates a task and the bridge executes it according to `mode`.

```json
{
  "task": {
    "id": "uuid",
    "phone": "551xxxxxx",
    "caller_id": "+995322453821",
    "mode": "exact_message",
    "purpose": "debt_reminder",
    "instruction": "შეატყობინე 1250 ₾ დავალიანების შესახებ",
    "max_seconds": 180,
    "sms_after": false,
    "sms_text": null,
    "debt_details": {"amount": "1250", "due_date": "2026-09-01"}
  },
  "job": {
    "id": "uuid",
    "phone": "+9955xxxxxxx",
    "customer_name": "Clinic",
    "purpose": "sales",
    "mode": "exact_message",
    "script_text": "Provided message",
    "caller_id": "+995322453821",
    "max_seconds": 180,
    "campaign_id": null,
    "debt_details": null
  },
  "campaign": null,
  "knowledge": {
    "knowledge": [],
    "training": [],
    "corrections": []
  },
  "voice_policy": {
    "mode": "exact_message",
    "allowed_actions": ["greet", "read_script", "repeat_once", "end_call"],
    "forbidden_actions": ["improvise", "sell", "answer_unrelated_questions"]
  },
  "worker_name": "medical-line-ai-worker-1"
}
```

For `mode: exact_message`, the bridge must read only `task.instruction`, may greet, repeat once, and end the call. It must not improvise or sell.

For `mode: dialog`, `campaign` is required and contains objective, allowed topics, forbidden topics, knowledge scope, opening message, and max duration.

## Bridge response

```json
{
  "status": "completed",
  "outcome": "interested",
  "summary": "Customer asked for price and FOV.",
  "follow_up_date": "2026-09-01",
  "next_action": "manager callback",
  "follow_up_notes": "Callback requested",
  "duration_seconds": 138,
  "connected_seconds": 125,
  "customer_talk_seconds": 61,
  "ai_talk_seconds": 64,
  "silence_seconds": 13,
  "transcript": [
    {"speaker": "ai", "text": "...", "start": "2026-08-21T10:00:00Z", "end": "2026-08-21T10:00:04Z"},
    {"speaker": "customer", "text": "...", "start": "2026-08-21T10:00:05Z", "end": "2026-08-21T10:00:08Z"}
  ],
  "order": {
    "confirmed": false,
    "customer_name": null,
    "phone": null,
    "clinic": null,
    "city": null,
    "product": null,
    "quantity": null,
    "delivery_details": null,
    "confirmation_text": null
  }
}
```

## Supabase status updates

The worker updates `ai_call_jobs` as follows:

```text
queued -> dialing -> completed
queued -> dialing -> no_answer | busy | failed | cancelled
```

The worker writes `outcome`, `summary`, `follow_up_date`, structured `transcript`, duration metrics, `ended_at`, and `error_message` when applicable. A `queued` row must never be marked failed merely because this web workspace does not contain the external VPS telephony code.

## Inbound phone switch

The admin panel switch at `/admin/ai` controls `public.ai_operator_settings.calls_enabled`.
For outbound queued jobs, `claim_ai_call_job(worker_name)` already refuses to return
new jobs while the switch is off.

For inbound calls to the phone number, the Asterisk/bridge side must also check the
same switch before starting the AI assistant:

```http
GET https://medicalline.ge/api/ai-operator/status
```

Response:

```json
{
  "callsEnabled": false,
  "disabledReason": "Manual pause from admin panel",
  "updatedAt": "2026-08-28T07:17:57.089854+00:00"
}
```

If `callsEnabled` is `false`, the bridge must not start AudioSocket/Gemini and
should route the call to the normal/manual destination configured in Asterisk. If
`AI_OPERATOR_STATUS_TOKEN` is configured on Vercel, the bridge must send either
`Authorization: Bearer <token>` or `X-AI-Operator-Token: <token>`.
