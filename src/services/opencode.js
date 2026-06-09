/**
 * OpenCode Zen API integration
 *
 * Connects to any OpenAI-compatible chat API endpoint.
 * Default: OpenCode Zen endpoint.
 * User provides their own API key.
 */

const DEFAULT_ENDPOINT = '/zen/v1'
const DEFAULT_MODEL = 'mimo-v2.5-free'

const AVAILABLE_MODELS = [
  // ── 🔓 Free Models ──
  { id: 'mimo-v2.5-free', name: 'MiMo-V2.5 Free', cost: 'Free', endpoint: 'chat/completions' },
  { id: 'nemotron-3-ultra-free', name: 'Nemotron 3 Ultra Free', cost: 'Free', endpoint: 'chat/completions' },
  { id: 'deepseek-v4-flash-free', name: 'DeepSeek V4 Flash Free', cost: 'Free', endpoint: 'chat/completions' },
  { id: 'big-pickle', name: 'Big Pickle', cost: 'Free', endpoint: 'chat/completions' },
  // ── OpenAI / GPT ──
  { id: 'gpt-5.5', name: 'GPT 5.5', cost: '$5.00/$30.00', endpoint: 'chat/completions' },
  { id: 'gpt-5.5-pro', name: 'GPT 5.5 Pro', cost: '$30.00/$180.00', endpoint: 'chat/completions' },
  { id: 'gpt-5.4', name: 'GPT 5.4', cost: '$2.50/$15.00', endpoint: 'chat/completions' },
  { id: 'gpt-5.4-pro', name: 'GPT 5.4 Pro', cost: '$30.00/$180.00', endpoint: 'chat/completions' },
  { id: 'gpt-5.4-mini', name: 'GPT 5.4 Mini', cost: '$0.75/$4.50', endpoint: 'chat/completions' },
  { id: 'gpt-5.4-nano', name: 'GPT 5.4 Nano', cost: '$0.20/$1.25', endpoint: 'chat/completions' },
  { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex', cost: '$1.75/$14.00', endpoint: 'chat/completions' },
  { id: 'gpt-5.3-codex-spark', name: 'GPT 5.3 Codex Spark', cost: '$1.75/$14.00', endpoint: 'chat/completions' },
  { id: 'gpt-5.2', name: 'GPT 5.2', cost: '$1.75/$14.00', endpoint: 'chat/completions' },
  { id: 'gpt-5.2-codex', name: 'GPT 5.2 Codex', cost: '$1.75/$14.00', endpoint: 'chat/completions' },
  { id: 'gpt-5.1', name: 'GPT 5.1', cost: '$1.07/$8.50', endpoint: 'chat/completions' },
  { id: 'gpt-5.1-codex', name: 'GPT 5.1 Codex', cost: '$1.07/$8.50', endpoint: 'chat/completions' },
  { id: 'gpt-5.1-codex-max', name: 'GPT 5.1 Codex Max', cost: '$1.25/$10.00', endpoint: 'chat/completions' },
  { id: 'gpt-5.1-codex-mini', name: 'GPT 5.1 Codex Mini', cost: '$0.25/$2.00', endpoint: 'chat/completions' },
  { id: 'gpt-5', name: 'GPT 5', cost: '$1.07/$8.50', endpoint: 'chat/completions' },
  { id: 'gpt-5-codex', name: 'GPT 5 Codex', cost: '$1.07/$8.50', endpoint: 'chat/completions' },
  { id: 'gpt-5-nano', name: 'GPT 5 Nano', cost: '$0.05/$0.40', endpoint: 'chat/completions' },
  // ── Anthropic / Claude ──
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', cost: '$5.00/$25.00', endpoint: 'messages' },
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', cost: '$5.00/$25.00', endpoint: 'messages' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', cost: '$5.00/$25.00', endpoint: 'messages' },
  { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', cost: '$5.00/$25.00', endpoint: 'messages' },
  { id: 'claude-opus-4-1', name: 'Claude Opus 4.1', cost: '$15.00/$75.00', endpoint: 'messages' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', cost: '$3.00/$15.00', endpoint: 'messages' },
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', cost: '$3.00/$15.00 (≤200K)', endpoint: 'messages' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', cost: '$3.00/$15.00 (≤200K)', endpoint: 'messages' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', cost: '$1.00/$5.00', endpoint: 'messages' },
  { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', cost: '$?/?', endpoint: 'messages' },
  // ── Google / Gemini ──
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', cost: '$1.50/$9.00', endpoint: 'gemini-3.5-flash' },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', cost: '$2.00/$12.00 (≤200K)', endpoint: 'gemini-3.1-pro' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', cost: '$0.50/$3.00', endpoint: 'gemini-3-flash' },
  // ── Qwen (Anthropic/messages endpoint) ──
  { id: 'qwen3.7-max', name: 'Qwen3.7 Max', cost: '$2.50/$7.50', endpoint: 'messages' },
  { id: 'qwen3.7-plus', name: 'Qwen3.7 Plus', cost: '$0.40/$1.60', endpoint: 'messages' },
  { id: 'qwen3.6-plus', name: 'Qwen3.6 Plus', cost: '$0.50/$3.00', endpoint: 'messages' },
  { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus', cost: '$0.20/$1.20', endpoint: 'messages' },
  // ── Other OpenAI-compatible ──
  { id: 'minimax-m2.7', name: 'MiniMax M2.7', cost: '$0.30/$1.20', endpoint: 'chat/completions' },
  { id: 'minimax-m2.5', name: 'MiniMax M2.5', cost: '$0.30/$1.20', endpoint: 'chat/completions' },
  { id: 'glm-5.1', name: 'GLM 5.1', cost: '$1.40/$4.40', endpoint: 'chat/completions' },
  { id: 'glm-5', name: 'GLM 5', cost: '$1.00/$3.20', endpoint: 'chat/completions' },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', cost: '$0.60/$3.00', endpoint: 'chat/completions' },
  { id: 'kimi-k2.6', name: 'Kimi K2.6', cost: '$0.95/$4.00', endpoint: 'chat/completions' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', cost: '$0.14/$0.28', endpoint: 'chat/completions' },
  { id: 'grok-build-0.1', name: 'Grok Build 0.1', cost: '$1.00/$2.00', endpoint: 'chat/completions' },
]

export { AVAILABLE_MODELS }

export class OpenCodeAPI {
  constructor(options = {}) {
    this.endpoint = options.endpoint || DEFAULT_ENDPOINT
    this.model = options.model || DEFAULT_MODEL
    this.apiKey = options.apiKey || ''
  }

  setApiKey(key) {
    this.apiKey = key
  }

  /**
   * Generate a complete project from a natural language description
   */
  async generateProject(idea, callbacks = {}) {
    const { onProgress, onStage, onLog, onComplete, onError } = callbacks

    if (!this.apiKey) {
      throw new Error('API key not configured. Please add your API key in settings.')
    }

    onLog?.('info', 'Analyzing your idea...')
    onLog?.('info', `Using model: ${this.model}`)

    const systemPrompt = this._buildSystemPrompt()
    const userPrompt = this._buildProjectPrompt(idea)

    const modelInfo = AVAILABLE_MODELS.find(m => m.id === this.model)
    const apiPath = modelInfo?.endpoint || 'chat/completions'
    const apiUrl = `${this.endpoint}/${apiPath}`.replace(/\/+/g, '/')

    onLog?.('info', `Connecting via Netlify CDN proxy...`)

    try {
      onStage?.('planning')
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 16000,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        let detail = ''
        try {
          const parsed = JSON.parse(errorBody)
          detail = parsed.error?.message || parsed.message || errorBody
        } catch {
          detail = errorBody || response.statusText
        }
        throw new Error(`API error (${response.status}): ${detail}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let inCodeBlock = false
      let codeBlockBuffer = ''
      let codeBlockLang = ''

      const EMITTED_STAGES = {
        'architecture': false,
        'generation': false,
        'validation': false,
      }

      onStage?.('architecture')
      onLog?.('info', 'Designing project architecture...')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ''
            
            if (!content) continue

            fullContent += content

            // Detect stage transitions based on content markers
            if (!EMITTED_STAGES.architecture && 
                (fullContent.includes('```') || fullContent.includes('architecture') || fullContent.includes('Project Structure'))) {
              EMITTED_STAGES.architecture = true
              if (fullContent.includes('```')) {
                onStage?.('generation')
                onLog?.('info', 'Generating source code...')
              }
            }
            if (!EMITTED_STAGES.generation && 
                (fullContent.match(/```[\w]*\n/g)?.length >= 2)) {
              EMITTED_STAGES.generation = true
            }
            if (!EMITTED_STAGES.validation &&
                (fullContent.includes('README') || fullContent.includes('package.json') || 
                 fullContent.match(/```/g)?.length >= 6)) {
              EMITTED_STAGES.validation = true
              onStage?.('validation')
              onLog?.('info', 'Validating generated project...')
            }

            // Track code blocks for progress
            for (const char of content) {
              if (char === '`') {
                // Simplified tracking - works for most cases
              }
            }

            // Progress callback with current content
            onProgress?.(fullContent)

          } catch (e) {
            // Skip malformed SSE lines
          }
        }
      }

      onLog?.('success', 'Code generation complete!')
      onLog?.('info', 'Processing file structure...')

      // Parse the generated content into project files
      const project = this._parseProject(fullContent)

      if (!project || project.files.length === 0) {
        throw new Error('No files could be extracted from the response. The model may not have generated code in the expected format.')
      }

      onLog?.('success', `Extracted ${project.files.length} files`)
      onLog?.('info', `Project: ${project.name}`)
      onStage?.('preview')
      onLog?.('info', 'Preparing preview...')

      onComplete?.(project)

      return project

    } catch (error) {
      // Improve network error messages
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        error = new Error(
          `Cannot connect to the API at ${this.endpoint}. ` +
          `Verify the endpoint URL and API key. If the API does not allow browser requests (CORS), ` +
          `you may need a proxy or a different provider.`
        )
      }
      onError?.(error)
      throw error
    }
  }

  /**
   * Parse AI response into a structured project with files
   */
  _parseProject(content) {
    const project = {
      name: 'Generated Project',
      description: '',
      files: [],
    }

    // Extract project name from first heading
    const nameMatch = content.match(/# ([^\n]+)/)
    if (nameMatch) {
      project.name = nameMatch[1].trim().replace(/[^a-zA-Z0-9_-\s]/g, '').trim()
    }

    // Extract all code blocks with file paths
    // Pattern: ```language:path/to/file or ```path/to/file or ```language\n...content...
    const codeBlockRegex = /```(\w*:?[^\n]*)\n([\s\S]*?)```/g
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const header = match[1].trim()
      let code = match[2].trim()
      let filePath = ''
      let language = ''

      // Try to extract file path from header
      if (header.includes(':')) {
        const parts = header.split(':')
        language = parts[0]
        filePath = parts.slice(1).join(':').trim()
      } else if (header.includes('/') || header.includes('\\') || header.includes('.')) {
        filePath = header.trim()
        language = this._extractLangFromPath(filePath)
      } else {
        language = header
        filePath = this._guessFilePath(language, code)
      }

      // Clean up the file path
      filePath = filePath.replace(/^['"]|['"]$/g, '').trim()

      // Skip if no valid path or content is empty
      if (!filePath || !code) continue

      // Skip obviously non-file headers
      if (filePath.match(/^(bash|shell|sh|console|terminal|output|json|text|plain)$/i)) {
        // Check if it looks like a directory listing or command output
        if (code.split('\n').length <= 3 || !code.includes('\n')) {
          // Could be a terminal command — check if it looks like structured content
          const hasFilePatterns = code.includes('├') || code.includes('─') || code.includes('│')
          if (!hasFilePatterns) continue
        }
      }

      // If the code looks like a terminal listing (tree output), skip
      if (code.match(/^[├└│]/m) && !code.includes('function') && !code.includes('import') && !code.includes('const ')) {
        continue
      }

      project.files.push({
        path: filePath,
        language: language || this._extractLangFromPath(filePath),
        content: code,
      })
    }

    return project
  }

  _extractLangFromPath(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const extMap = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'toml': 'toml',
      'sh': 'bash',
      'bash': 'bash',
      'svg': 'xml',
      'xml': 'xml',
      'env': 'dotenv',
      'gitignore': 'gitignore',
    }
    return extMap[ext] || ''
  }

  _guessFilePath(language, code) {
    // Try to guess file path from content patterns
    if (language === 'html' || language === 'htm') return 'index.html'
    if (language === 'css') return 'style.css'
    if (language === 'javascript' || language === 'js') return 'script.js'
    if (language === 'typescript' || language === 'ts') return 'src/index.ts'
    if (language === 'jsx') return 'src/App.jsx'
    if (language === 'tsx') return 'src/App.tsx'
    if (language === 'python' || language === 'py') return 'main.py'
    if (language === 'json') {
      if (code.includes('"dependencies"') || code.includes('"scripts"')) return 'package.json'
      if (code.includes('"compilerOptions"')) return 'tsconfig.json'
      return 'data.json'
    }
    if (language === 'yaml' || language === 'yml') {
      if (code.includes('version') && code.includes('services')) return 'docker-compose.yml'
      return 'config.yaml'
    }
    if (language === 'markdown' || language === 'md') return 'README.md'
    if (language === 'bash' || language === 'sh') return 'setup.sh'
    return `file.${language}`
  }

  /**
   * Build the system prompt that sets the coding context
   */
  _buildSystemPrompt() {
    return `You are an expert software engineer and full-stack developer. Your task is to generate complete, production-ready project codebases based on user descriptions.

**IMPORTANT RULES:**

1. **Generate COMPLETE files** — every file must have full, working code. No placeholders, no "// TODO", no "... (rest of the code)". The user needs to run the project immediately.

2. **Structure your output** — use markdown code blocks with file paths. Format:
   \`\`\`language:path/to/file
   // complete source code
   \`\`\`

3. **Include all necessary files**:
   - package.json or equivalent config
   - Build/config files (vite.config.js, tsconfig.json, etc.)
   - Source files
   - HTML entry point (for web projects)
   - README.md with setup instructions
   - .gitignore

4. **Generate modern, clean code**:
   - Use modern ES modules/imports
   - Follow best practices for the framework/stack
   - Include error handling
   - Make it responsive and accessible (for web projects)

5. **Choose the right stack** based on the project description:
   - Web apps: Use vanilla JS + Vite, or React + Vite for complex UIs
   - APIs: Use Node.js + Express
   - CLIs: Use Node.js with proper argument handling
   - Static sites: HTML + CSS + vanilla JS

6. **Start with a clear overview** of the project structure, then generate each file.

7. **Keep it runnable** — the user should be able to npm install && npm run dev (or equivalent) and see something working.`
  }

  /**
   * Build the project prompt from user's idea
   */
  _buildProjectPrompt(idea) {
    return `Generate a complete, runnable project for the following idea:

"${idea}"

Please output:
1. A brief project overview
2. The full project structure as a tree
3. Complete source code for EVERY file using the format \`\`\`language:path/to/file

Make it a complete, working project with no placeholders or TODO comments. The user should be able to run it immediately.`
  }
}

/**
 * Parse file tree from project files
 */
export function buildFileTree(files) {
  const root = { name: 'project', type: 'folder', children: [], path: '', _expanded: true }

  files.forEach(file => {
    const parts = file.path.split('/')
    let current = root

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1
      const currentPath = parts.slice(0, index + 1).join('/')

      if (isLast) {
        // It's a file
        const existing = current.children.find(c => c.name === part)
        if (!existing) {
          current.children.push({
            name: part,
            type: 'file',
            path: currentPath,
            fileData: file,
          })
        }
      } else {
        // It's a folder
        let folder = current.children.find(c => c.name === part && c.type === 'folder')
        if (!folder) {
          folder = { name: part, type: 'folder', children: [], path: currentPath, _expanded: true }
          current.children.push(folder)
        }
        current = folder
      }
    })
  })

  return root
}

/**
 * Create an API instance with the given model
 */
export function createAPI(model) {
  return new OpenCodeAPI({ model })
}
