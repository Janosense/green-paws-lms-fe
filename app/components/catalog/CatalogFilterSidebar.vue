<script setup lang="ts">
import type { CatalogQueryState, TaxonomyTerm } from '#shared/types/catalog'
import { useDebounceFn } from '@vueuse/core'

type TaxonomySlug = 'vl_category' | 'vl_specialty' | 'vl_difficulty' | 'vl_tag'

const FACET_BY_TAXONOMY: Record<TaxonomySlug, keyof Pick<
  CatalogQueryState,
  'categories' | 'specialties' | 'difficulty' | 'tags'
>> = {
  vl_category: 'categories',
  vl_specialty: 'specialties',
  vl_difficulty: 'difficulty',
  vl_tag: 'tags'
}

const DIFFICULTY_ORDER: Record<string, number> = {
  basic: 0,
  advanced: 1,
  expert: 2
}

interface Props {
  state: CatalogQueryState
  termsByTaxonomy: {
    vl_category: TaxonomyTerm[]
    vl_specialty: TaxonomyTerm[]
    vl_difficulty: TaxonomyTerm[]
    vl_tag: TaxonomyTerm[]
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:q': [value: string]
  'commit:q': [value: string]
  'toggle-term': [taxonomy: TaxonomySlug, slug: string]
}>()

const { t } = useI18n()
const localQuery = ref(props.state.q)

watch(() => props.state.q, (next) => {
  if (next !== localQuery.value) {
    localQuery.value = next
  }
})

const pushDebounced = useDebounceFn((value: string) => {
  emit('update:q', value)
}, 300)

function onQueryInput(value: string) {
  localQuery.value = value
  pushDebounced(value)
}

function onQueryEnter() {
  emit('commit:q', localQuery.value)
}

function isSelected(taxonomy: TaxonomySlug, slug: string): boolean {
  const facet = FACET_BY_TAXONOMY[taxonomy]
  return props.state[facet].includes(slug)
}

function onToggle(taxonomy: TaxonomySlug, slug: string) {
  emit('toggle-term', taxonomy, slug)
}

interface RenderedTerm {
  slug: string
  name: string
  count: number
  depth: number
}

function flattenCategories(terms: TaxonomyTerm[]): RenderedTerm[] {
  const bySlug = new Map<string, TaxonomyTerm>()
  for (const term of terms) {
    bySlug.set(term.slug, term)
  }
  const childrenOf = new Map<string | null, TaxonomyTerm[]>()
  for (const term of terms) {
    const parent = term.parent_slug ?? null
    const list = childrenOf.get(parent) ?? []
    list.push(term)
    childrenOf.set(parent, list)
  }

  const out: RenderedTerm[] = []
  function walk(parent: string | null, depth: number) {
    const children = childrenOf.get(parent) ?? []
    const sorted = [...children].sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    for (const term of sorted) {
      out.push({ slug: term.slug, name: term.name, count: term.count, depth })
      walk(term.slug, depth + 1)
    }
  }
  walk(null, 0)
  // Defensively render any orphan whose declared parent is not in the list.
  for (const term of terms) {
    if (!out.some(r => r.slug === term.slug)) {
      out.push({ slug: term.slug, name: term.name, count: term.count, depth: 0 })
    }
  }
  return out
}

const categoryRows = computed(() => flattenCategories(props.termsByTaxonomy.vl_category))

const specialtyRows = computed<RenderedTerm[]>(() =>
  [...props.termsByTaxonomy.vl_specialty]
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    .map(t => ({ slug: t.slug, name: t.name, count: t.count, depth: 0 }))
)

const difficultyRows = computed<RenderedTerm[]>(() =>
  [...props.termsByTaxonomy.vl_difficulty]
    .sort((a, b) => {
      const ai = DIFFICULTY_ORDER[a.slug] ?? 99
      const bi = DIFFICULTY_ORDER[b.slug] ?? 99
      return ai - bi
    })
    .map(t => ({ slug: t.slug, name: t.name, count: t.count, depth: 0 }))
)

const tagRows = computed<RenderedTerm[]>(() =>
  [...props.termsByTaxonomy.vl_tag]
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    .map(t => ({ slug: t.slug, name: t.name, count: t.count, depth: 0 }))
)

interface Section {
  taxonomy: TaxonomySlug
  rows: RenderedTerm[]
}

const sections = computed<Section[]>(() => [
  { taxonomy: 'vl_category', rows: categoryRows.value },
  { taxonomy: 'vl_specialty', rows: specialtyRows.value },
  { taxonomy: 'vl_difficulty', rows: difficultyRows.value },
  { taxonomy: 'vl_tag', rows: tagRows.value }
])
</script>

<template>
  <div class="space-y-6">
    <UInput
      :model-value="localQuery"
      :placeholder="t('catalog.filters.search.placeholder')"
      icon="i-lucide-search"
      size="md"
      class="w-full"
      @update:model-value="onQueryInput"
      @keydown.enter.prevent="onQueryEnter"
    />

    <section
      v-for="section in sections"
      :key="section.taxonomy"
      class="space-y-3"
    >
      <h3 class="text-sm font-medium text-default">
        {{ t(`catalog.filters.taxonomies.${section.taxonomy}`) }}
      </h3>
      <p
        v-if="section.rows.length === 0"
        class="text-xs text-muted"
      >
        {{ t('catalog.filters.no_options') }}
      </p>
      <ul
        v-else
        class="space-y-2"
      >
        <li
          v-for="row in section.rows"
          :key="row.slug"
        >
          <UCheckbox
            :model-value="isSelected(section.taxonomy, row.slug)"
            :disabled="row.count === 0"
            :style="{ paddingLeft: row.depth > 0 ? `${row.depth * 16}px` : undefined }"
            @update:model-value="onToggle(section.taxonomy, row.slug)"
          >
            <template #label>
              <span class="text-sm">
                {{ row.name }}
                <span class="text-muted">· {{ row.count }}</span>
              </span>
            </template>
          </UCheckbox>
        </li>
      </ul>
    </section>
  </div>
</template>
