<script setup lang="ts">
import type { CatalogQueryState, TaxonomyTerm } from '#shared/types/catalog'

interface Chip {
  key: string
  label: string
  facet: 'q' | 'categories' | 'specialties' | 'difficulty' | 'tags'
  value: string
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
  'remove': [chip: Chip]
  'clear-all': []
}>()

const { t } = useI18n()

function lookup(terms: TaxonomyTerm[], slug: string): string {
  return terms.find(t => t.slug === slug)?.name ?? slug
}

const chips = computed<Chip[]>(() => {
  const out: Chip[] = []
  if (props.state.q.trim() !== '') {
    out.push({
      key: `q:${props.state.q}`,
      label: `“${props.state.q}”`,
      facet: 'q',
      value: props.state.q
    })
  }
  for (const slug of props.state.categories) {
    out.push({
      key: `categories:${slug}`,
      label: lookup(props.termsByTaxonomy.vl_category, slug),
      facet: 'categories',
      value: slug
    })
  }
  for (const slug of props.state.specialties) {
    out.push({
      key: `specialties:${slug}`,
      label: lookup(props.termsByTaxonomy.vl_specialty, slug),
      facet: 'specialties',
      value: slug
    })
  }
  for (const slug of props.state.difficulty) {
    out.push({
      key: `difficulty:${slug}`,
      label: lookup(props.termsByTaxonomy.vl_difficulty, slug),
      facet: 'difficulty',
      value: slug
    })
  }
  for (const slug of props.state.tags) {
    out.push({
      key: `tags:${slug}`,
      label: lookup(props.termsByTaxonomy.vl_tag, slug),
      facet: 'tags',
      value: slug
    })
  }
  return out
})

const hasAny = computed(() => chips.value.length > 0)
</script>

<template>
  <div
    v-if="hasAny"
    class="flex flex-wrap items-center gap-2"
  >
    <UBadge
      v-for="chip in chips"
      :key="chip.key"
      color="neutral"
      variant="subtle"
      size="md"
      class="gap-1"
    >
      <span>{{ chip.label }}</span>
      <UButton
        :aria-label="chip.label"
        icon="i-lucide-x"
        color="neutral"
        variant="link"
        size="xs"
        :padded="false"
        @click="emit('remove', chip)"
      />
    </UBadge>
    <UButton
      variant="link"
      color="neutral"
      size="sm"
      :padded="false"
      @click="emit('clear-all')"
    >
      {{ t('catalog.filters.clear_all') }}
    </UButton>
  </div>
</template>
