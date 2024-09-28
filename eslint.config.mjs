import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['**/playground/**', '**/out/**'],
  markdown: false,
  // formatters: true,
})
  .removeRules(
    'node/prefer-global/process',
  )
