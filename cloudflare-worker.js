/**
 * Cloudflare Worker: OpenCode Zen API Proxy
 * 
 * Deploy this to Cloudflare Workers for free (30s timeout, supports streaming).
 * 
 * Steps:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create application
 * 2. Copy this file's content
 * 3. Deploy
 * 4. Copy your Worker URL (e.g. https://zen-proxy.your-subdomain.workers.dev)
 * 5. Paste the URL into Vibe Coding Settings → Endpoint
 * 6. Uncheck "Use CORS Proxy" (the Worker handles CORS)
 */

const ZEN_BASE = 'https://opencode.ai/zen/v1'

// Allow any origin (the user's Netlify site or localhost)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders,
      })
    }

    try {
      const { apiKey, model, messages, temperature, max_tokens } = await request.json()

      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key is required' }), {
          status: 400,
          headers: corsHeaders,
        })
      }

      const modelPath = getModelPath(model)
      const apiUrl = `${ZEN_BASE}/${modelPath}`

      const upstreamResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: max_tokens ?? 16000,
          stream: true, // Cloudflare Workers support streaming!
        }),
      })

      if (!upstreamResponse.ok) {
        const errorText = await upstreamResponse.text().catch(() => '')
        let detail = errorText
        try { const p = JSON.parse(errorText); detail = p.error?.message || p.message || errorText } catch {}
        return new Response(JSON.stringify({ error: detail }), {
          status: upstreamResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Stream the SSE response directly to the browser
      // Cloudflare Workers support streaming ReadableStream natively!
      return new Response(upstreamResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })

    } catch (error) {
      return new Response(JSON.stringify({ error: `Proxy error: ${error.message}` }), {
        status: 502,
        headers: corsHeaders,
      })
    }
  },
}

function getModelPath(model) {
  const geminiModels = [
    'gemini-3.5-flash', 'gemini-3.1-pro', 'gemini-3-flash',
  ]
  const claudeModels = [
    // Claude
    'claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-opus-4-5', 'claude-opus-4-1',
    'claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-sonnet-4',
    'claude-haiku-4-5', 'claude-3-5-haiku',
    // Qwen (use Anthropic/messages endpoint)
    'qwen3.7-max', 'qwen3.7-plus', 'qwen3.6-plus', 'qwen3.5-plus',
  ]

  if (geminiModels.includes(model)) return `models/${model}`
  if (claudeModels.includes(model)) return 'messages'
  return 'chat/completions' // GPT, MiniMax, GLM, Kimi, DeepSeek, Grok, etc.
}
