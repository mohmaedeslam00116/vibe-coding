/**
 * Netlify Function: OpenCode Zen API Proxy
 * 
 * Proxies API requests to OpenCode Zen, solving CORS issues.
 * The API key is forwarded in the request body but NEVER stored.
 * No database, no state, no logging of keys.
 * 
 * Buffers the SSE stream and returns it as a single response
 * (Netlify Functions don't support streaming ReadableStream)
 */

const ZEN_BASE = 'https://opencode.ai/zen/v1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { apiKey, model, messages, temperature, max_tokens } = JSON.parse(event.body)

    if (!apiKey) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'API key is required' }),
      }
    }

    const modelPath = getModelPath(model)
    const apiUrl = `${ZEN_BASE}/${modelPath}`

    // Log the request (without the API key)
    console.log(`Proxying to: ${apiUrl}`)
    console.log(`Model: ${model}, Messages: ${messages.length}`)

    const upstreamResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 16000,
        stream: true,
      }),
    })

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text().catch(() => '')
      let detail = errorText
      try {
        const parsed = JSON.parse(errorText)
        detail = parsed.error?.message || parsed.message || errorText
      } catch {}
      
      console.error(`Upstream error ${upstreamResponse.status}: ${detail}`)
      return {
        statusCode: upstreamResponse.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: detail || `Upstream returned ${upstreamResponse.status}` }),
      }
    }

    // Buffer the streaming response (Netlify Functions don't support streaming body)
    const chunks = []
    const reader = upstreamResponse.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(typeof value === 'string' ? value : decoder.decode(value, { stream: true }))
    }
    // Flush decoder
    chunks.push(decoder.decode())

    const body = chunks.join('')

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: body,
    }

  } catch (error) {
    console.error(`Proxy caught error: ${error.message}`, error.stack)
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: `Proxy error: ${error.message}`,
        detail: error.stack?.split('\n').slice(0, 3).join(' | '),
      }),
    }
  }
}

function getModelPath(model) {
  const geminiModels = ['gemini-3-flash', 'gemini-3.5-flash', 'gemini-3.1-pro']
  const claudeModels = [
    'claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-sonnet-4',
    'claude-haiku-4-5', 'claude-3-5-haiku',
    'claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-opus-4-5', 'claude-opus-4-1',
    'qwen3.7-max', 'qwen3.7-plus', 'qwen3.6-plus', 'qwen3.5-plus',
  ]

  if (geminiModels.includes(model)) return `models/${model}`
  if (claudeModels.includes(model)) return 'messages'
  return 'chat/completions'
}
