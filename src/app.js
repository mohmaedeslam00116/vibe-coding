/**
 * Vibe Coding — Main Application Controller
 */

import { storage } from './services/storage.js'
import { createAPI, buildFileTree } from './services/opencode.js'
import { AVAILABLE_MODELS } from './services/opencode.js'
import { downloadProject, buildStandalonePreview } from './services/zip.js'
import { icons, getFileIcon } from './services/icons.js'

// ── State ──
const state = {
  view: 'landing',
  idea: storage.getLastIdea(),
  project: null,
  fileTree: null,
  activeFile: null,
  activeTab: 'editor',
  openTabs: [],
  apiKey: storage.getApiKey(),
  model: storage.getSettings().model || 'mimo-v2.5-free',
  useProxy: storage.getSettings().useProxy !== false,
  customEndpoint: storage.getSettings().customEndpoint || '',
  isGenerating: false,
  lastRequestTime: 0, // timestamp of last API request (for rate limiting)
  COOLDOWN_MS: 8000,  // 8 seconds between requests
  buildStages: [],
  logs: [],
  previewURL: null,
}

// ── Event bus ──
const bus = new EventTarget()

// ── DOM references ──
let $app

// ── Init ──
export async function init(root) {
  $app = root
  render()
}

// ── Render ──
function render() {
  $app.innerHTML = `
    ${renderHeader()}
    ${state.view === 'landing' ? renderLanding() : renderWorkspace()}
  `

  attachHeaderEvents()
  
  if (state.view === 'landing') {
    attachLandingEvents()
  } else {
    attachWorkspaceEvents()
  }
}

// ════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════

function renderHeader() {
  return `
    <header class="header">
      <a href="#" class="header-logo" data-action="home">
        <span style="color:var(--accent)">${icons.bolt}</span>
        Vibe Coding
      </a>
      <div class="header-actions">
        ${state.isGenerating ? `<div class="spinner spinner-sm"></div>` : ''}
        <button class="api-key-btn" data-action="api-key" data-tooltip="API Key">
          <span class="api-key-dot ${state.apiKey ? 'configured' : ''}"></span>
          ${state.apiKey ? 'Key Set' : 'Set API Key'}
        </button>
        ${state.view === 'workspace' ? `
          <button class="btn btn-ghost btn-sm" data-action="new-project">
            New Project
          </button>
        ` : ''}
      </div>
    </header>
  `
}

function attachHeaderEvents() {
  $app.querySelector('[data-action="home"]')?.addEventListener('click', (e) => {
    e.preventDefault()
    if (state.isGenerating) return
    state.view = 'landing'
    render()
  })

  $app.querySelector('[data-action="api-key"]')?.addEventListener('click', () => {
    showApiKeyModal()
  })

  $app.querySelector('[data-action="new-project"]')?.addEventListener('click', () => {
    if (state.isGenerating) return
    // Clean up preview URL
    if (state.previewURL) {
      URL.revokeObjectURL(state.previewURL)
      state.previewURL = null
    }
    state.view = 'landing'
    state.project = null
    state.fileTree = null
    state.activeFile = null
    state.openTabs = []
    state.buildStages = []
    state.logs = []
    render()
  })
}

// ════════════════════════════════════════════
// LANDING PAGE
// ════════════════════════════════════════════

function renderLanding() {
  return `
    <main class="landing">
      <div class="landing-content fade-in">
        <div class="landing-icon">
          ${icons.sparkles}
        </div>
        <h1>Turn ideas into code</h1>
        <p>Describe your software idea in natural language and get a complete, runnable project generated instantly by AI.</p>
        
        <form id="idea-form" class="idea-input-area">
          <textarea 
            id="idea-input"
            placeholder="e.g. Build a personal finance dashboard with charts, transaction history, and budget tracking..."
            rows="5"
            spellcheck="true"
          >${escapeHtml(state.idea)}</textarea>
          <div class="idea-input-footer">
            <span class="idea-hint">
              ${icons.terminal} Powered by OpenCode Zen
            </span>
            <button type="submit" class="btn btn-primary btn-lg" id="generate-btn">
              ${icons.rocket}
              Generate Project
            </button>
          </div>
        </form>
      </div>
    </main>
  `
}

function attachLandingEvents() {
  const form = $app.querySelector('#idea-form')
  const input = $app.querySelector('#idea-input')
  const btn = $app.querySelector('#generate-btn')

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const idea = input.value.trim()
      if (!idea) return

      if (!state.apiKey) {
        showToast('Please set your API key first', 'error')
        showApiKeyModal()
        return
      }

      // ⏱ Rate limit check: prevent rapid requests
      const now = Date.now()
      const timeSinceLast = now - state.lastRequestTime
      if (state.lastRequestTime > 0 && timeSinceLast < state.COOLDOWN_MS) {
        const waitSeconds = Math.ceil((state.COOLDOWN_MS - timeSinceLast) / 1000)
        showToast(`Please wait ${waitSeconds}s before next request (rate limit)`, 'warning')
        return
      }

      // Save idea
      state.idea = idea
      storage.setLastIdea(idea)

      // Initialize build state and transition to workspace
      state.view = 'workspace'
      state.isGenerating = true
      state.project = null
      state.fileTree = null
      state.activeFile = null
      state.openTabs = []
      state.buildStages = [
        { id: 'planning', label: 'Planning', description: 'Analyzing your idea', status: 'active' },
        { id: 'architecture', label: 'Architecture', description: 'Designing project structure', status: 'pending' },
        { id: 'generation', label: 'Code Generation', description: 'Writing source files', status: 'pending' },
        { id: 'validation', label: 'Validation', description: 'Checking generated code', status: 'pending' },
        { id: 'preview', label: 'Preview Build', description: 'Preparing preview', status: 'pending' },
        { id: 'complete', label: 'Complete', description: 'Ready to use', status: 'pending' },
      ]
      state.logs = [
        { type: 'info', text: 'Starting project generation...', time: getTimestamp() },
      ]

      // Render workspace with build panel
      render()

      await startGeneration(idea)
    })
  }
}

// ════════════════════════════════════════════
// WORKSPACE
// ════════════════════════════════════════════

function renderWorkspace() {
  return `
    <div class="workspace fade-in">
      ${renderSidebar()}
      <div class="main-content">
        <div class="tab-bar">
          <button class="tab-item ${state.activeTab === 'editor' ? 'active' : ''}" data-tab="editor">
            ${icons.code} Code
          </button>
          <button class="tab-item ${state.activeTab === 'preview' ? 'active' : ''}" data-tab="preview" ${state.previewURL ? '' : 'disabled'}>
            ${icons.eye} Preview
          </button>
        </div>
        ${state.activeTab === 'editor' ? renderEditor() : renderPreview()}
      </div>
      ${renderBuildPanel()}
    </div>
  `
}

function attachWorkspaceEvents() {
  // Tab switching
  $app.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      state.activeTab = tab.dataset.tab
      render()
    })
  })

  // File tree items
  $app.querySelectorAll('[data-file]').forEach(item => {
    item.addEventListener('click', () => {
      const path = item.dataset.file
      openFile(path)
    })
  })

  // Folder toggle
  $app.querySelectorAll('[data-toggle-folder]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      const path = item.dataset.toggleFolder
      toggleFolder(path)
    })
  })

  // Editor tabs
  $app.querySelectorAll('[data-editor-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const path = tab.dataset.editorTab
      state.activeFile = path
      render()
    })
  })

  // Close tab
  $app.querySelectorAll('[data-close-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const path = btn.dataset.closeTab
      closeTab(path)
    })
  })

  // Download button
  $app.querySelector('[data-action="download"]')?.addEventListener('click', async () => {
    if (!state.project) return
    try {
      await downloadProject(state.project)
      showToast('Project downloaded!', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  })

  // Restart build
  $app.querySelector('[data-action="restart"]')?.addEventListener('click', () => {
    state.view = 'landing'
    state.project = null
    state.fileTree = null
    state.activeFile = null
    state.openTabs = []
    state.buildStages = []
    state.logs = []
    render()
  })

  // Refresh preview
  $app.querySelector('[data-action="refresh-preview"]')?.addEventListener('click', () => {
    if (state.previewURL) {
      URL.revokeObjectURL(state.previewURL)
      state.previewURL = null
    }
    if (state.project) {
      try {
        const url = buildStandalonePreview(state.project)
        if (url) {
          state.previewURL = url
          render()
          showToast('Preview refreshed', 'success')
        }
      } catch (e) {
        showToast('Preview refresh failed', 'error')
      }
    }
  })

  // Open preview in new tab
  $app.querySelector('[data-action="open-preview"]')?.addEventListener('click', () => {
    if (state.previewURL) {
      window.open(state.previewURL, '_blank')
    }
  })
}

// ════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════

function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="sidebar-header">
        <span>Files</span>
        <span class="badge badge-accent">${state.project?.files?.length || 0}</span>
      </div>
      <div class="file-tree">
        ${state.fileTree ? renderTreeNodes(state.fileTree.children) : `
          <div class="empty-state" style="padding:var(--space-8)">
            <p>No files generated yet</p>
          </div>
        `}
      </div>
    </aside>
  `
}

function renderTreeNodes(children, depth = 0) {
  if (!children || children.length === 0) return ''
  
  return children.map(node => {
    const isActive = state.activeFile === node.path
    const isFolder = node.type === 'folder'
    const isExpanded = node._expanded !== false // default expanded
    
    if (isFolder) {
      return `
        <div style="padding-left: ${depth * 12}px">
          <div class="file-item ${isActive ? 'active' : ''}" data-toggle-folder="${node.path}">
            <span class="file-item-icon">
              ${isExpanded ? icons.chevronDown : icons.chevronRight}
            </span>
            <span class="file-item-icon">
              ${isExpanded ? icons.folderOpen : icons.folderClosed}
            </span>
            <span class="file-item-name">${node.name}</span>
          </div>
          ${isExpanded ? renderTreeNodes(node.children, depth + 1) : ''}
        </div>
      `
    }
    
    const icon = getFileIcon(node.name)
    return `
      <div style="padding-left: ${depth * 12 + 24}px">
        <div class="file-item ${isActive ? 'active' : ''}" data-file="${node.path}">
          <span class="file-item-icon">${icon}</span>
          <span class="file-item-name">${node.name}</span>
        </div>
      </div>
    `
  }).join('')
}

function toggleFolder(path) {
  const node = findNode(state.fileTree, path)
  if (node) {
    node._expanded = !node._expanded
    render()
  }
}

function findNode(tree, path) {
  if (!tree || !tree.children) return null
  for (const child of tree.children) {
    if (child.path === path) return child
    if (child.type === 'folder') {
      const found = findNode(child, path)
      if (found) return found
    }
  }
  return null
}

// ════════════════════════════════════════════
// EDITOR
// ════════════════════════════════════════════

function renderEditor() {
  const activeFileData = state.project?.files?.find(f => f.path === state.activeFile)

  return `
    <div class="editor-area">
      <div class="editor-tabs">
        ${state.openTabs.length === 0 ? `
          <span style="padding: var(--space-2) var(--space-4); font-size: var(--fs-xs); color: var(--text-tertiary);">
            No file selected
          </span>
        ` : state.openTabs.map(path => {
          const file = state.project?.files?.find(f => f.path === path)
          const name = file ? file.path.split('/').pop() : path
          const isActive = state.activeFile === path
          return `
            <div class="editor-tab ${isActive ? 'active' : ''}" data-editor-tab="${path}">
              <span>${getFileIcon(name)}</span>
              ${escapeHtml(name)}
              <span class="editor-tab-close" data-close-tab="${path}">${icons.x}</span>
            </div>
          `
        }).join('')}
      </div>
      <div class="editor-container" id="editor-container">
        ${activeFileData ? `
          <pre style="padding: var(--space-4); font-family: var(--font-mono); font-size: var(--fs-sm); line-height: 1.6; color: var(--text-primary); overflow: auto; height: 100%; white-space: pre-wrap; word-wrap: break-word; tab-size: 2;"><code>${escapeHtml(activeFileData.content)}</code></pre>
        ` : `
          <div class="empty-state">
            ${icons.code}
            <h3>Select a file</h3>
            <p>Click on a file in the sidebar to view its source code</p>
          </div>
        `}
      </div>
    </div>
  `
}

// ════════════════════════════════════════════
// PREVIEW TAB
// ════════════════════════════════════════════

function renderPreview() {
  return `
    <div class="preview-container" style="position:relative;">
      ${state.previewURL ? `
        <div class="preview-toolbar">
          <span class="preview-url">preview://${state.project?.name || 'project'}/index.html</span>
          <button class="btn btn-ghost btn-sm" data-action="refresh-preview" data-tooltip="Refresh">
            ${icons.refresh}
          </button>
          <button class="btn btn-ghost btn-sm" data-action="open-preview" data-tooltip="Open in new tab">
            ${icons.maximize}
          </button>
        </div>
        <iframe 
          src="${state.previewURL}" 
          class="preview-frame" 
          title="Project Preview"
          sandbox="allow-scripts allow-modals allow-same-origin"
        ></iframe>
      ` : `
        <div class="empty-state">
          ${icons.eye}
          <h3>Preview Unavailable</h3>
          <p>This project doesn't have a previewable HTML entry point. Download the ZIP to run it locally.</p>
        </div>
      `}
    </div>
  `
}

// ════════════════════════════════════════════
// BUILD PANEL
// ════════════════════════════════════════════

function renderBuildPanel() {
  const stages = state.buildStages
  const logs = state.logs

  return `
    <div class="build-panel" style="${state.activeTab === 'preview' ? 'display:none;' : ''}">
      <div class="build-header">
        <h3>${icons.terminal} Build Progress</h3>
        ${state.project ? `
          <button class="btn btn-ghost btn-sm" data-action="restart" data-tooltip="Start over">
            ${icons.refresh}
          </button>
        ` : ''}
      </div>
      <div class="build-stages">
        ${stages.length === 0 ? `
          <div class="empty-state" style="padding:var(--space-6);">
            <p>Enter your idea and generate a project to see build progress here.</p>
          </div>
        ` : stages.map(stage => `
          <div class="stage ${stage.status === 'active' ? 'active' : ''} ${stage.status === 'done' ? 'completed' : ''} ${stage.status === 'pending' ? 'stage-pending' : ''}">
            <div class="stage-indicator ${stage.status !== 'done' && stage.status !== 'error' && stage.status !== 'pending' ? 'progress' : stage.status}">
              ${stage.status === 'done' ? icons.check : stage.status === 'error' ? icons.x : stage.status === 'active' ? '' : ''}
            </div>
            <div class="stage-info">
              <div class="stage-name">${stage.label}</div>
              <div class="stage-desc">${stage.description || ''}</div>
              ${stage.error ? `<div class="build-error">${escapeHtml(stage.error)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="build-log" id="build-log">
        ${logs.length === 0 ? `
          <div class="log-entry">Waiting for build to start...</div>
        ` : logs.map(log => `
          <div class="log-entry ${log.type}">
            <span class="log-time">${log.time}</span>
            ${escapeHtml(log.text)}
          </div>
        `).join('')}
      </div>
      ${state.project ? `
        <div class="download-bar">
          <button class="btn btn-primary" data-action="download">
            ${icons.download} Download ZIP (${state.project.files.length} files)
          </button>
        </div>
      ` : ''}
    </div>
  `
}

// ════════════════════════════════════════════
// API KEY MODAL
// ════════════════════════════════════════════

function showApiKeyModal() {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal scale-in">
      <h2 class="modal-title">${icons.key} Settings</h2>
      <p class="modal-desc">
        Enter your OpenCode Zen API key. The key is stored only in your browser's local storage
        and is never sent to any server other than the API provider.
      </p>
      <div class="input-group">
        <label for="api-key-input">OpenCode Zen API Key</label>
        <input 
          id="api-key-input" 
          type="password" 
          placeholder="sk-..." 
          value="${escapeHtml(state.apiKey)}"
          autocomplete="off"
        >
      </div>
      <div style="margin-top: var(--space-4);">
        <div class="input-group">
          <label for="model-select">Model</label>
          <select id="model-select">
            <optgroup label="🔓 Free Models">
              ${AVAILABLE_MODELS.filter(m => m.cost === 'Free').map(m => `
                <option value="${m.id}" ${state.model === m.id ? 'selected' : ''}>
                  ${m.name} (${m.cost})
                </option>
              `).join('')}
            </optgroup>
            <optgroup label="💰 Paid Models">
              ${AVAILABLE_MODELS.filter(m => m.cost !== 'Free').map(m => `
                <option value="${m.id}" ${state.model === m.id ? 'selected' : ''}>
                  ${m.name} — ${m.cost}
                </option>
              `).join('')}
            </optgroup>
          </select>
        </div>
      </div>
      <div style="margin-top: var(--space-3);">
        <a href="https://opencode.ai/zen" target="_blank" rel="noopener" style="font-size: var(--fs-xs);">
          Get API key & see all models →
        </a>
      </div>
      <div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border);">
        <label style="display: flex; align-items: center; gap: var(--space-3); cursor: pointer; font-size: var(--fs-sm); color: var(--text-secondary);">
          <input type="checkbox" id="proxy-toggle" ${state.useProxy ? 'checked' : ''} style="width: auto; accent-color: var(--accent);">
          <span>Use CORS Proxy (Netlify Function — 10s timeout)</span>
        </label>
        <div id="proxy-warning" style="margin-top: var(--space-2); padding: var(--space-2) var(--space-3); background: rgba(245, 158, 11, 0.1); border-radius: var(--radius-sm); font-size: var(--fs-xs); color: var(--warning); line-height: 1.5; ${state.useProxy ? '' : 'display:none;'}">
          <strong>⚠️ مهلة 10 ثوانٍ فقط</strong> — قد لا تكفي للمشاريع الكبيرة. استخدم Cloudflare Worker للحصول على 30 ثانية + Stream حقيقي مجاناً.
        </div>
        <div id="endpoint-section" style="margin-top: var(--space-3); ${state.useProxy ? 'display:none;' : ''}">
          <div class="input-group">
            <label for="endpoint-input">Custom Proxy URL (Cloudflare Worker or other)</label>
            <input
              id="endpoint-input"
              type="url"
              placeholder="https://zen-proxy.your-name.workers.dev"
              value="${escapeHtml(state.customEndpoint)}"
            >
          </div>
          <div style="margin-top: var(--space-2); font-size: var(--fs-xs); color: var(--text-tertiary); line-height: 1.5;">
            انشر <code style="background: var(--elevated); padding: 1px 4px; border-radius: 3px;">cloudflare-worker.js</code> 
            في Cloudflare Workers والصق الرابط هنا. 
            <a href="#" id="show-cf-steps" style="color: var(--accent);">كيف؟</a>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="api-key-cancel">Cancel</button>
        <button class="btn btn-danger" id="api-key-clear" ${state.apiKey ? '' : 'disabled'}>Clear</button>
        <button class="btn btn-primary" id="api-key-save">Save</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  // Focus input
  const input = overlay.querySelector('#api-key-input')
  const modelSelect = overlay.querySelector('#model-select')
  const proxyToggle = overlay.querySelector('#proxy-toggle')
  const endpointSection = overlay.querySelector('#endpoint-section')
  const endpointInput = overlay.querySelector('#endpoint-input')
  const proxyWarning = overlay.querySelector('#proxy-warning')

  setTimeout(() => input.focus(), 100)

  // Proxy toggle — show/hide endpoint section
  proxyToggle.addEventListener('change', () => {
    if (proxyToggle.checked) {
      endpointSection.style.display = 'none'
      proxyWarning.style.display = ''
    } else {
      endpointSection.style.display = ''
      proxyWarning.style.display = 'none'
    }
  })

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay)
  })

  // Cancel
  overlay.querySelector('#api-key-cancel').addEventListener('click', () => closeModal(overlay))

  // Clear
  overlay.querySelector('#api-key-clear').addEventListener('click', () => {
    state.apiKey = ''
    storage.clearApiKey()
    closeModal(overlay)
    render()
    showToast('API key cleared', 'success')
  })

  // Save
  overlay.querySelector('#api-key-save').addEventListener('click', () => {
    const key = input.value.trim()
    if (!key) {
      showToast('Please enter a valid API key', 'error')
      return
    }
    const selectedModel = modelSelect.value
    const useProxy = proxyToggle.checked
    const customEndpoint = endpointInput?.value?.trim() || ''
    state.apiKey = key
    state.model = selectedModel
    state.useProxy = useProxy
    state.customEndpoint = customEndpoint
    storage.setApiKey(key)
    storage.setSettings({ ...storage.getSettings(), model: selectedModel, useProxy, customEndpoint })
    closeModal(overlay)
    render()
    showToast('Settings saved', 'success')
  })

  // Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      overlay.querySelector('#api-key-save').click()
    }
    if (e.key === 'Escape') {
      closeModal(overlay)
    }
  })
}

function closeModal(overlay) {
  overlay.classList.add('fade-in') // trigger fade
  setTimeout(() => overlay.remove(), 150)
}

// ════════════════════════════════════════════
// TOAST NOTIFICATION
// ════════════════════════════════════════════

let toastContainer = null

function showToast(message, type = 'info') {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'toast-container'
    document.body.appendChild(toastContainer)
  }

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = message

  toastContainer.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-8px)'
    toast.style.transition = 'all 0.3s ease'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// ════════════════════════════════════════════
// GENERATION ENGINE
// ════════════════════════════════════════════

async function startGeneration(idea) {
  state.isGenerating = true

  const api = createAPI(state.model, {
    useProxy: state.useProxy,
    endpoint: state.useProxy ? undefined : (state.customEndpoint || undefined),
  })
  api.setApiKey(state.apiKey)

  try {
    const project = await api.generateProject(idea, {
      onStage: (stageId) => {
        updateStage(stageId)
        render()
      },
      onLog: (type, text) => {
        state.logs.push({ type, text, time: getTimestamp() })
        render()
      },
      onProgress: (content) => {
        // Could update a progress indicator here
      },
      onComplete: (project) => {
        state.lastRequestTime = Date.now()
        onProjectComplete(project)
      },
      onError: (error) => {
        state.lastRequestTime = Date.now()
        state.isGenerating = false
        updateStage('complete', 'error', error.message)
        state.logs.push({ type: 'error', text: `Error: ${error.message}`, time: getTimestamp() })
        render()
      }
    })

  } catch (error) {
  state.isGenerating = false
  state.lastRequestTime = Date.now()
  state.buildStages = state.buildStages.map(s => 
      s.id === 'complete' ? { ...s, status: 'error', error: error.message } : s
    )
    state.logs.push({ type: 'error', text: `Generation failed: ${error.message}`, time: getTimestamp() })
    render()
  }
}

function onProjectComplete(project) {
  state.isGenerating = false
  state.project = project
  state.fileTree = buildFileTree(project.files)
  state.buildStages = state.buildStages.map(s => ({
    ...s,
    status: s.id === 'complete' ? 'done' : 
            s.id === 'preview' ? 'done' :
            s.status === 'active' ? 'done' : 
            s.status === 'pending' ? 'done' : s.status
  }))

  // Auto-open first file
  if (project.files.length > 0) {
    // Prefer opening index.html or main entry point
    const preferred = project.files.find(f => 
      f.path === 'index.html' || 
      f.path === 'src/App.jsx' ||
      f.path === 'src/App.tsx' ||
      f.path === 'src/index.js' ||
      f.path === 'src/index.ts' ||
      f.path === 'app.js' ||
      f.path === 'main.js'
    )
    openFile(preferred?.path || project.files[0].path)
  }

  // Build preview URL
  try {
    const url = buildStandalonePreview(project)
    if (url) {
      state.previewURL = url
      state.logs.push({ type: 'success', text: 'Preview ready!', time: getTimestamp() })
    }
  } catch (e) {
    state.logs.push({ type: 'warning', text: 'Preview build skipped: ' + e.message, time: getTimestamp() })
  }

  state.logs.push({ type: 'success', text: `Generated ${project.files.length} files`, time: getTimestamp() })
  state.logs.push({ type: 'info', text: 'Ready to explore and download!', time: getTimestamp() })
  updateStage('preview', 'done')
  
  render()
}

function updateStage(stageId, status = 'active', error = null) {
  state.buildStages = state.buildStages.map(s => {
    if (s.id === stageId) {
      return { ...s, status, error }
    }
    // Auto-advance: mark previous stages as done
    const stageOrder = ['planning', 'architecture', 'generation', 'validation', 'preview', 'complete']
    const currentIdx = stageOrder.indexOf(stageId)
    const thisIdx = stageOrder.indexOf(s.id)
    if (thisIdx < currentIdx && s.status === 'pending') {
      return { ...s, status: 'done' }
    }
    return s
  })
}

// ════════════════════════════════════════════
// FILE MANAGEMENT
// ════════════════════════════════════════════

function openFile(path) {
  if (!path || !state.project?.files?.find(f => f.path === path)) return

  state.activeFile = path

  // Add to open tabs if not already there
  if (!state.openTabs.includes(path)) {
    state.openTabs.push(path)
    // Limit open tabs
    if (state.openTabs.length > 8) {
      state.openTabs.shift()
    }
  }

  render()
}

function closeTab(path) {
  state.openTabs = state.openTabs.filter(t => t !== path)
  if (state.activeFile === path) {
    state.activeFile = state.openTabs[state.openTabs.length - 1] || null
  }
  render()
}

// ════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════

function getTimestamp() {
  const now = new Date()
  return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function escapeHtml(str) {
  if (!str) return ''
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
