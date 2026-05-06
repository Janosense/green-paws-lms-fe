<script setup lang="ts">
import type { CodeBlock } from '#shared/types/learn'
import type { HighlighterCore } from 'shiki/core'

const props = defineProps<{ block: CodeBlock }>()

const ALLOWED_LANGUAGES = new Set([
  'javascript',
  'typescript',
  'html',
  'css',
  'json',
  'python',
  'php',
  'bash',
  'markdown',
  'sql'
])

const colorMode = useColorMode()
const currentTheme = computed(() => colorMode.value === 'dark' ? 'github-dark' : 'github-light')

const html = ref<string>('')
const highlighter = shallowRef<HighlighterCore | null>(null)

const resolvedLanguage = computed(() => {
  const raw = (props.block.language ?? '').toLowerCase()
  return ALLOWED_LANGUAGES.has(raw) ? raw : 'plaintext'
})

async function loadHighlighter(): Promise<void> {
  if (highlighter.value) return

  try {
    const { createHighlighterCore } = await import('shiki/core')
    const { createOnigurumaEngine } = await import('shiki/engine/oniguruma')

    highlighter.value = await createHighlighterCore({
      themes: [
        import('shiki/themes/github-light.mjs'),
        import('shiki/themes/github-dark.mjs')
      ],
      langs: [
        import('shiki/langs/javascript.mjs'),
        import('shiki/langs/typescript.mjs'),
        import('shiki/langs/html.mjs'),
        import('shiki/langs/css.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/python.mjs'),
        import('shiki/langs/php.mjs'),
        import('shiki/langs/bash.mjs'),
        import('shiki/langs/markdown.mjs'),
        import('shiki/langs/sql.mjs')
      ],
      engine: createOnigurumaEngine(import('shiki/wasm'))
    })
  } catch {
    // Highlighter failed to load — leave html empty so the SSR fallback
    // <pre> renders instead. Phase 9.7: do not block lesson rendering on
    // a failed code-highlighter bundle.
    highlighter.value = null
  }
}

function render(): void {
  if (!highlighter.value) return
  try {
    html.value = highlighter.value.codeToHtml(props.block.code, {
      lang: resolvedLanguage.value,
      theme: currentTheme.value
    })
  } catch {
    html.value = ''
  }
}

onMounted(async () => {
  await loadHighlighter()
  render()
})

watch(currentTheme, () => {
  render()
})

watch(() => props.block.code, () => {
  render()
})
</script>

<template>
  <div class="rounded-lg border border-default bg-elevated overflow-hidden my-2">
    <div
      v-if="block.language"
      class="px-4 py-2 border-b border-default bg-default"
    >
      <span class="text-xs font-mono text-muted uppercase tracking-wider">{{ block.language }}</span>
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -- Shiki output is library-generated; library is trusted. -->
    <div
      v-if="html"
      class="vl-shiki text-sm leading-relaxed"
      v-html="html"
    />
    <pre
      v-else
      class="p-4 overflow-x-auto"
    ><code class="font-mono text-sm leading-relaxed">{{ block.code }}</code></pre>
  </div>
</template>

<style scoped>
.vl-shiki :deep(pre) {
  padding: 1rem;
  overflow-x: auto;
  margin: 0;
  background: transparent !important;
}

.vl-shiki :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  background: transparent !important;
}
</style>
