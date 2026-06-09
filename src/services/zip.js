/**
 * ZIP service — Download project as ZIP archive
 */

import JSZip from 'jszip'

/**
 * Create and download a ZIP archive of the generated project
 * @param {Object} project - The project object with files array
 * @param {string} project.name - Project name
 * @param {Array} project.files - Array of {path, content} objects
 */
export async function downloadProject(project) {
  if (!project || !project.files || project.files.length === 0) {
    throw new Error('No files to download')
  }

  const zip = new JSZip()

  // Add each file to the ZIP
  project.files.forEach(file => {
    // Normalize path separators
    const normalizedPath = file.path.replace(/\\/g, '/')
    zip.file(normalizedPath, file.content)
  })

  // Generate the ZIP blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  })

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`

  // Trigger download
  document.body.appendChild(link)
  link.click()

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Build a preview URL from the project's index.html
 * @param {Object} project 
 * @returns {string|null} Blob URL for preview
 */
export function buildPreviewURL(project) {
  const indexFile = project.files.find(f => 
    f.path === 'index.html' || 
    f.path.endsWith('/index.html') ||
    f.path.endsWith('/index.htm')
  )

  if (!indexFile) return null

  // Find supporting files (CSS, JS) and inline them for standalone preview
  // For simplicity, return the HTML as a blob URL
  const html = indexFile.content
  const blob = new Blob([html], { type: 'text/html' })
  return URL.createObjectURL(blob)
}

/**
 * Build a complete preview with all resources
 * More robust than simple blob URL - handles relative imports
 */
export function buildStandalonePreview(project) {
  const indexFile = project.files.find(f => 
    f.path === 'index.html' || 
    f.path.endsWith('/index.html')
  )

  if (!indexFile) return null

  let html = indexFile.content

  // If there are CSS files, inline them
  const cssFiles = project.files.filter(f => 
    f.path.endsWith('.css') && !f.path.includes('node_modules')
  )

  cssFiles.forEach(cssFile => {
    const linkRegex = new RegExp(
      `<link[^>]*href=["']${escapeRegExp(cssFile.path)}["'][^>]*>`,
      'gi'
    )
    html = html.replace(linkRegex, (match) => {
      return `<style>/* ${cssFile.path} */\n${cssFile.content}\n</style>`
    })
  })

  // If there are JS files, inline them (simple approach)
  const jsFiles = project.files.filter(f => 
    f.path.endsWith('.js') || f.path.endsWith('.mjs')
  )

  jsFiles.forEach(jsFile => {
    const scriptRegex = new RegExp(
      `<script[^>]*src=["']${escapeRegExp(jsFile.path)}["'][^>]*>(.*?)</script>`,
      'gi'
    )
    html = html.replace(scriptRegex, '')
  })

  // Add all JS at end (simplified - works for basic projects)
  jsFiles.forEach(jsFile => {
    html = html.replace('</body>', `<script>/* ${jsFile.path} */\n${jsFile.content}\n</script>\n</body>`)
  })

  const blob = new Blob([html], { type: 'text/html' })
  return URL.createObjectURL(blob)
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
