import * as vscode from 'vscode'

// Constants for supported language IDs
const SUPPORTED_LANGUAGES = ['css', 'scss', 'less', 'postcss', 'tailwindcss']

// This method is called when VS Code is activated
export function activate(context: vscode.ExtensionContext) {
  let timeout: NodeJS.Timeout | undefined
  let activeEditor = vscode.window.activeTextEditor

  // Decoration type for highlighting HSL color values
  const smallNumberDecorationType = vscode.window.createTextEditorDecorationType({})

  /**
   * Updates the color decorations in the active editor
   * Scans the document for HSL color values and applies background colors
   */
  function updateDecorations() {
    if (!activeEditor || !SUPPORTED_LANGUAGES.includes(activeEditor.document.languageId)) {
      return
    }

    const document = activeEditor.document
    const decorations: vscode.DecorationOptions[] = []

    // Regular expression to match HSL color values and CSS custom properties
    const hslRegex = /(?:hsl\(|(--[\w-]+:\s*))?([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i)
      const matches = line.text.matchAll(hslRegex)

      for (const match of matches) {
        const [fullMatch, , h, s, l] = match

        // Calculate the start position of the color values
        const valueStartIndex = match.index! + (fullMatch.length - `${h} ${s}% ${l}%`.length)
        const startPos = new vscode.Position(i, valueStartIndex)
        const endPos = new vscode.Position(i, valueStartIndex + `${h} ${s}% ${l}%`.length)
        const range = new vscode.Range(startPos, endPos)

        const hslColor = `hsl(${h}, ${s}%, ${l}%)`
        const decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: hslColor,
          borderRadius: '2px',
          color: getTextColorPrecise(Number(h), Number(s), Number(l)),
        })

        activeEditor.setDecorations(decorationType, [{ range }])
        decorations.push({ range })
      }
    }

    // Apply hover decorations
    activeEditor.setDecorations(smallNumberDecorationType, decorations)
  }

  /**
   * Converts HSL color values to RGB
   * @param h - Hue value (0-360)
   * @param s - Saturation value (0-100)
   * @param l - Lightness value (0-100)
   * @returns Array of [r, g, b] values (0-255)
   */
  function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360
    s /= 100
    l /= 100
    let r, g, b

    if (s === 0) {
      r = g = b = l
    }
    else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0)
          t += 1
        if (t > 1)
          t -= 1
        if (t < 1 / 6)
          return p + (q - p) * 6 * t
        if (t < 1 / 2)
          return q
        if (t < 2 / 3)
          return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
  }

  /**
   * Calculates the relative luminance of an RGB color
   * Uses the formula from WCAG 2.0
   */
  function getLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map((v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
  }

  /**
   * Determines the appropriate text color (black or white) based on background color
   * Uses HSL values to calculate contrast ratio
   */
  function getTextColorPrecise(h: number, s: number, l: number): string {
    const [r, g, b] = hslToRgb(h, s, l)
    const luminance = getLuminance(r, g, b)
    return luminance > 0.179 ? '#000000' : '#FFFFFF'
  }

  /**
   * Triggers the decoration update with optional throttling
   * @param throttle - Whether to delay the update for performance
   */
  function triggerUpdateDecorations(throttle = false) {
    if (timeout) {
      clearTimeout(timeout)
      timeout = undefined
    }
    if (throttle) {
      timeout = setTimeout(updateDecorations, 500)
    }
    else {
      updateDecorations()
    }
  }

  // Initialize decorations if there's an active editor
  if (activeEditor) {
    triggerUpdateDecorations()
  }

  // Register event handlers
  const subscriptions = [
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor
      if (editor) {
        triggerUpdateDecorations()
      }
    }),

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations(true)
      }
    }),
  ]

  // Add event handlers to extension subscriptions
  context.subscriptions.push(...subscriptions)
}
