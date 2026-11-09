const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'AI_CALL_BRIDGE_URL']
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`)
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const workerName = process.env.WORKER_NAME || `worker-${process.pid}`
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 3000)
const bridgeUrl = process.env.AI_CALL_BRIDGE_URL
const bridgeToken = process.env.AI_CALL_BRIDGE_TOKEN
const orderCreateUrl = process.env.AI_ORDER_CREATE_URL
const orderCreateToken = process.env.AI_ORDER_CREATE_TOKEN
let warnedMissingOperatorStatus = false

function headers() {
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' }
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } })
  const body = await response.text()
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${body}`)
  return body ? JSON.parse(body) : null
}

async function claimJob() {
  const result = await supabaseRequest('/rest/v1/rpc/claim_ai_call_job', { method: 'POST', body: JSON.stringify({ worker_name: workerName }) })
  return Array.isArray(result) ? result[0] : null
}

async function loadOperatorStatus() {
  try {
    const result = await supabaseRequest('/rest/v1/rpc/get_ai_operator_status', { method: 'POST', body: '{}' })
    const status = Array.isArray(result) ? result[0] : result
    return status || { calls_enabled: true }
  } catch (error) {
    if (!warnedMissingOperatorStatus) {
      warnedMissingOperatorStatus = true
      console.warn('AI operator status RPC is unavailable; continuing until the master switch migration is applied.', error)
    }
    return { calls_enabled: true }
  }
}

async function updateJob(id, patch) {
  await supabaseRequest(`/rest/v1/ai_call_jobs?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) })
}

async function insertRow(table, row) {
  await supabaseRequest(`/rest/v1/${table}`, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) })
}

async function createConfirmedOrder(order, context) {
  if (!orderCreateUrl) throw new Error('AI_ORDER_CREATE_URL is not configured')
  const response = await fetch(orderCreateUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(orderCreateToken ? { Authorization: `Bearer ${orderCreateToken}` } : {}) }, body: JSON.stringify({ source: 'ai_voice_agent', source_call: context.id, confirmed: true, customer_name: order.customer_name || context.customer_name || null, phone: order.phone || context.phone, clinic: order.clinic || null, city: order.city || null, product: order.product || null, quantity: order.quantity || null, delivery_details: order.delivery_details || null, confirmation_text: order.confirmation_text || null }) })
  if (!response.ok) throw new Error(`Order API ${response.status}: ${await response.text()}`)
}

async function loadJobContext(id) {
  const rows = await supabaseRequest(`/rest/v1/ai_call_jobs?id=eq.${encodeURIComponent(id)}&select=*,campaign:ai_campaigns(*)`)
  return Array.isArray(rows) ? rows[0] : null
}

async function loadKnowledgeContext() {
  const [knowledge, training, corrections] = await Promise.all([
    supabaseRequest('/rest/v1/ai_knowledge_items?select=*&active=eq.true&status=eq.ACTIVE&order=priority.desc&limit=500'),
    supabaseRequest('/rest/v1/ai_training_examples?select=*&active=eq.true&order=priority.desc&limit=300'),
    supabaseRequest('/rest/v1/ai_agent_corrections?select=question,correct_answer,status&status=in.(approved,applied)&order=created_at.desc&limit=300'),
  ])
  const now = Date.now()
  return {
    knowledge: (knowledge || []).filter(item => (!item.valid_from || new Date(item.valid_from).getTime() <= now) && (!item.valid_until || new Date(item.valid_until).getTime() >= now)),
    training: training || [],
    corrections: corrections || [],
  }
}

async function processJob(job) {
  const context = await loadJobContext(job.id)
  if (!context) throw new Error('Call job context could not be loaded')
  if (context.mode === 'dialog' && (!context.campaign || context.campaign.active !== true)) {
    throw new Error('Active campaign is required for AI dialogue jobs')
  }
  const knowledgeContext = await loadKnowledgeContext()
  const voicePolicy = context.mode === 'exact_message'
    ? { mode: 'exact_message', allowed_actions: ['greet', 'read_script', 'repeat_once', 'end_call'], forbidden_actions: ['improvise', 'sell', 'answer_unrelated_questions'] }
    : { mode: 'dialog', allowed_actions: ['campaign_scope_only', 'escalate'], forbidden_actions: ['use_general_ai_knowledge', 'invent_company_facts', 'discuss_forbidden_topics'] }
  const response = await fetch(bridgeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(bridgeToken ? { Authorization: `Bearer ${bridgeToken}` } : {}) },
    body: JSON.stringify({
      task: { id: context.id, phone: context.phone, caller_id: context.caller_id, mode: context.mode, purpose: context.purpose, instruction: context.script_text, max_seconds: context.max_seconds, sms_after: context.sms_after, sms_text: context.sms_text, debt_details: context.debt_details || null },
      job: context,
      campaign: context.campaign || null,
      knowledge: knowledgeContext,
      voice_policy: voicePolicy,
      worker_name: workerName,
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || `Bridge ${response.status}`)
  await updateJob(job.id, { status: result.status || 'completed', outcome: result.outcome || null, transcript: result.transcript || null, summary: result.summary || null, follow_up_date: result.follow_up_date || null, ended_at: result.ended_at || new Date().toISOString(), duration_seconds: result.duration_seconds || null, connected_seconds: result.connected_seconds || null, customer_talk_seconds: result.customer_talk_seconds || null, ai_talk_seconds: result.ai_talk_seconds || null, silence_seconds: result.silence_seconds || null })
  if (result.follow_up_date) {
    try { await insertRow('ai_followups', { customer: context.customer_name || null, phone: context.phone, source_call: context.id, reason: result.next_action || result.summary || 'Post-call follow-up', due_at: new Date(result.follow_up_date).toISOString(), priority: 'normal', status: 'pending', notes: result.follow_up_notes || null }) } catch (error) { console.error(`Follow-up creation failed for ${context.id}`, error) }
  }
  if (context.purpose === 'debt_reminder' && (result.outcome || context.debt_details)) {
    try { await insertRow('ai_debt_reminders', { customer: context.customer_name || null, phone: context.phone, amount: context.debt_details?.amount || null, document_number: context.debt_details?.document_number || null, due_date: context.debt_details?.due_date || null, note: context.debt_details?.note || null, source_call: context.id, outcome: result.outcome || null, follow_up_date: result.follow_up_date || null, status: result.outcome === 'no_answer' ? 'pending' : 'completed' }) } catch (error) { console.error(`Debt reminder persistence failed for ${context.id}`, error) }
  }
  if (result.order?.confirmed === true) {
    try { await createConfirmedOrder(result.order, context) } catch (error) { console.error(`Confirmed order API call failed for ${context.id}`, error) }
  }
}

async function run() {
  console.log(`AI call worker ${workerName} started`)
  while (true) {
    try {
      const operatorStatus = await loadOperatorStatus()
      if (operatorStatus.calls_enabled === false) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
        continue
      }
      const job = await claimJob()
      if (job) {
        console.log(`Processing call job ${job.id}`)
        try { await processJob(job) } catch (error) { await updateJob(job.id, { status: 'failed', error_message: error instanceof Error ? error.message : String(error), ended_at: new Date().toISOString() }); console.error(error) }
      } else {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
      }
    } catch (error) {
      console.error(error)
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
  }
}

run().catch(error => { console.error(error); process.exitCode = 1 })
