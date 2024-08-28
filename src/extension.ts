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
          color: Number(l) > 50 ? 'black' : 'white',
				});

				activeEditor.setDecorations(decorationType, [{ range }]);
				decorations.push({ range });
			}
		}

		// Apply hover decorations
		activeEditor.setDecorations(smallNumberDecorationType, decorations);
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
