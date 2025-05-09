import * as vscode from 'vscode'
import { getTextColorPrecise } from './utils'

// Constants for supported language IDs
const SUPPORTED_LANGUAGES = ['css', 'scss', 'less', 'postcss', 'tailwindcss']

// This method is called when VS Code is activated
export function activate(context: vscode.ExtensionContext) {
  let timeout: NodeJS.Timeout | undefined
  let activeEditor = vscode.window.activeTextEditor
  // Keep track of all decoration types
  let decorationTypes: vscode.TextEditorDecorationType[] = []

  function updateDecorations() {
    if (!activeEditor || !SUPPORTED_LANGUAGES.includes(activeEditor.document.languageId)) {
      return
    }

    // Clear all existing decorations
    decorationTypes.forEach(d => d.dispose())
    decorationTypes = []

    const document = activeEditor.document
    const decorations: vscode.DecorationOptions[] = []

    // Regular expression to match HSL color values and CSS custom properties
    const hslRegex = /(?:hsl\(|(--[\w-]+:\s*))?([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/g

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i)
      const matches = line.text.matchAll(hslRegex)

      for (const match of matches) {
        const [fullMatch, , h, s, l] = match

        // Calculate the start position of the color values
        const isCommaSeparated = fullMatch.includes(',')
        const valueStartIndex = match.index! + (fullMatch.length - (isCommaSeparated ? `${h}, ${s}%, ${l}%`.length : `${h} ${s}% ${l}%`.length))
        const startPos = new vscode.Position(i, valueStartIndex)
        const endPos = new vscode.Position(i, valueStartIndex + (isCommaSeparated ? `${h}, ${s}%, ${l}%`.length : `${h} ${s}% ${l}%`.length))
        const range = new vscode.Range(startPos, endPos)

        const hslColor = `hsl(${h}, ${s}%, ${l}%)`
        const decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: hslColor,
          borderRadius: '2px',
          color: getTextColorPrecise(Number(h), Number(s), Number(l)),
        })

        decorationTypes.push(decorationType) // Store the decoration type
        activeEditor.setDecorations(decorationType, [{ range }])
        decorations.push({ range })
      }
    }
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
