import * as assert from 'assert'
import * as vscode from 'vscode'
import { hslToRgb, getTextColorPrecise } from '../utils'

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.')

	test('HSL to RGB conversion', () => {
		assert.deepStrictEqual(hslToRgb(0, 100, 50), [255, 0, 0]) // Red
		assert.deepStrictEqual(hslToRgb(120, 100, 50), [0, 255, 0]) // Green
		assert.deepStrictEqual(hslToRgb(240, 100, 50), [0, 0, 255]) // Blue
		assert.deepStrictEqual(hslToRgb(0, 0, 50), [128, 128, 128]) // Gray
	})

	test('Text color calculation', () => {
		assert.strictEqual(getTextColorPrecise(13, 100, 10), '#FFFFFF')
		assert.strictEqual(getTextColorPrecise(163, 100, 7), '#FFFFFF')
		assert.strictEqual(getTextColorPrecise(255, 100, 100), '#000000') // white background
		assert.strictEqual(getTextColorPrecise(255, 0, 0), '#FFFFFF') // black background
	})

	test('HSL regex matching', () => {
		const hslRegex = /(?:hsl\(|(--[\w-]+:\s*))?([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/g
		const testString = `
			hsl(0, 100%, 50%);
			--custom-color: 120 100% 50%;
			hsl(240, 50%, 50%);
		`
		const matches = [...testString.matchAll(hslRegex)]
		assert.strictEqual(matches.length, 3)
		assert.deepStrictEqual(matches[0].slice(2, 5), ['0', '100', '50'])
		assert.deepStrictEqual(matches[1].slice(2, 5), ['120', '100', '50'])
		assert.deepStrictEqual(matches[2].slice(2, 5), ['240', '50', '50'])
	})
})
