import * as vscode from 'vscode';

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {

	let timeout: NodeJS.Timeout | undefined = undefined;

	// create a decorator type that we use to decorate small numbers
	const smallNumberDecorationType = vscode.window.createTextEditorDecorationType({});

	let activeEditor = vscode.window.activeTextEditor;

  	function updateDecorations() {
		if (!activeEditor || ['css', 'scss', 'less', 'postcss'].indexOf(activeEditor.document.languageId) < 0) {
			return;
		}

		const document = activeEditor.document;
		const decorations: vscode.DecorationOptions[] = [];

		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			const regex = /(?:hsl\(|(--[\w-]+:\s*))?([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g;
     		const matches = line.text.matchAll(regex);
			
			for (const match of matches) {
				const [fullMatch, , h, s, l] = match;
            
				// Calculate the start position of the color values
				const valueStartIndex = match.index! + (fullMatch.length - `${h} ${s}% ${l}%`.length);
				const startPos = new vscode.Position(i, valueStartIndex);
				const endPos = new vscode.Position(i, valueStartIndex + `${h} ${s}% ${l}%`.length);
				const range = new vscode.Range(startPos, endPos);

				const hslColor = `hsl(${h}, ${s}%, ${l}%)`;
				const decorationType = vscode.window.createTextEditorDecorationType({
					backgroundColor: hslColor,
					borderRadius: '2px',
					color: determineTextColor(h as number, s as number, l as number), 
				});

				activeEditor.setDecorations(decorationType, [{ range }]);
				decorations.push({ range });
			}
		}

		// Apply hover decorations
		activeEditor.setDecorations(smallNumberDecorationType, decorations);
	}

	function determineTextColor(h: number, s: number, l: number) : 'black' | 'white' {
		// Transform in HEX
		const rgb = rgbToHex(h, s, l)

		// Calculate relative luminance according to WCAG 2.1
		const lum_black = 0
		const lum_white = 255
		const relative_lum = .2126 * rgb.r + .7152 * rgb.g + .0722 * rgb.b 

		// Calculate contrast ratio according to WCAG 2.1
		const contrast_white = (lum_white + 0.05) / (relative_lum + 0.05)
		const contrast_black =  (relative_lum + 0.05) / (lum_black + 0.05)

		return contrast_black > contrast_white ? 'black' : 'white'
	}

	function rgbToHex(h: number, s: number, l: number) : {r: number, g: number, b: number} {
		const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100)
		const x = c * (1 - Math.abs((h / 60) % 2 - 1))
		const m = l - c / 2

		let r = 0, g = 0, b = 0
		h %= 360 	// to catch h values larger than 360

		if (h < 60) {
			r = c; g = x; b = 0;
		} else if (60 <= h && h < 120) {
			r = x; g = c; b = 0;
		} else if (120 <= h && h < 180) {
			r = 0; g = c; b = x;
		} else if (180 <= h && h < 240) {
			r = 0; g = x; b = c;
		} else if (240 <= h && h < 300) {
			r = x; g = 0; b = c;
		} else if (300 <= h) {
			r = c; g = 0; b = x;
		}

		return { 
			r: Math.round((r + m) * 255), 
			g: Math.round((g + m) * 255), 
			b: Math.round((b + m) * 255) 
		}
	}

	function triggerUpdateDecorations(throttle = false) {
		if (timeout) {
			clearTimeout(timeout);
			timeout = undefined;
		}
		if (throttle) {
			timeout = setTimeout(updateDecorations, 500);
		} else {
			updateDecorations();
		}
	}

	if (activeEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(
		(editor) => {
			activeEditor = editor;
			if (editor) {
				triggerUpdateDecorations();
			}
		},
		null,
		context.subscriptions
	);

	vscode.workspace.onDidChangeTextDocument(
		(event) => {
			if (activeEditor && event.document === activeEditor.document) {
				triggerUpdateDecorations(true);
			}
		},
		null,
		context.subscriptions
	);
}
