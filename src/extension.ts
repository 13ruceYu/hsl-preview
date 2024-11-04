import * as vscode from 'vscode'

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
  let timeout: NodeJS.Timeout | undefined

  // create a decorator type that we use to decorate small numbers
  const smallNumberDecorationType = vscode.window.createTextEditorDecorationType({})

  let activeEditor = vscode.window.activeTextEditor

  function updateDecorations() {
    if (!activeEditor || !['css', 'scss', 'less', 'postcss', 'tailwindcss'].includes(activeEditor.document.languageId)) {
      return
    }

    const document = activeEditor.document
    const decorations: vscode.DecorationOptions[] = []

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i)
      const regex = /(?:hsl\(|(--[\w-]+:\s*))?([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g
      const matches = line.text.matchAll(regex)

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

  // Helper function: Convert HSL to RGB
  function hslToRgb(h: number, s: number, l: number) {
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

  // Helper function: Calculate relative luminance
  function getLuminance(r: number, g: number, b: number) {
    const a = [r, g, b].map((v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
  }

  function getTextColorPrecise(h: number, s: number, l: number) {
    const [r, g, b] = hslToRgb(h, s, l)
    const luminance = getLuminance(r, g, b)
    return luminance > 0.179 ? '#000000' : '#FFFFFF'
  }

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

  if (activeEditor) {
    triggerUpdateDecorations()
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor
      if (editor) {
        triggerUpdateDecorations()
      }
    },
    null,
    context.subscriptions,
  )

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations(true)
      }
    },
    null,
    context.subscriptions,
  )
}
