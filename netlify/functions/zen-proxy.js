/**
 * Netlify Function: OpenCode Zen API Proxy
 * 
 * Proxies API requests to OpenCode Zen, solving CORS issues.
 * The API key is forwarded in the request body but NEVER stored.
 * No database, no state, no logging of keys.
 */

const ZEN_BASE = 'https://opencode.ai/zen/v1'

// CORS headers — allow the Netlify site to call this function
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
    }
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

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Messages array is required' }),
      }
    }

    // Determine API path based on model
    const modelPath = getModelPath(model)
    const apiUrl = `${ZEN_BASE}/${modelPath}`

    const response = await fetch(apiUrl, {
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

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let detail = errorText
      try {
        const parsed = JSON.parse(errorText)
        detail = parsed.error?.message || parsed.message || errorText
      } catch {}
      
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `API error (${response.status}): ${detail}` }),
      }
    }

    // Return the streaming response as-is
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: response.body,
    }

  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `Proxy error: ${error.message}` }),
    }
  }
}

function getModelPath(model) {
  // Map model to correct API path
  const geminiModels = ['gemini-3-flash', 'gemini-3.5-flash', 'gemini-3.1-pro']
  const claudeModels = ['claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-sonnet-4', 
    'claude-haiku-4-5', 'claude-3-5-haiku',
    'claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-opus-4-5', 'claude-opus-4-1',
    'qwen3.7-max', 'qwen3.7-plus', 'qwen3.6-plus', 'qwen3.5-plus']

  if (geminiModels.includes(model)) {
    return `models/${model}`
  }
  if (claudeModels.includes(model)) {
    return 'messages'
  }
  // Default: OpenAI-compatible
  return 'chat/completions'
}
