import type {
  CurriculumLessonNode,
  CurriculumResponse,
  CurriculumTopicNode
} from '#shared/types/learn'

/**
 * Phase 5.6 — pure helpers that walk a curriculum response in canonical
 * learning order to produce a flat list of leaves (lessons or topics) and
 * resolve prev/next neighbors for the lesson-player pagination + the
 * dashboard "Continue" deep-link.
 *
 * Mirrors the backend's `Learn/NextEntityResolver` algorithm conceptually,
 * not character-for-character: modules in `menu_order`, lessons within
 * each module in `menu_order`, then topics within each lesson in
 * `menu_order` when present (otherwise the lesson itself), and finally
 * orphan lessons.
 */

export type LearnLeaf
  = | {
    kind: 'lesson'
    lesson: CurriculumLessonNode
    lessonSlug: string
    courseSlug: string
  }
  | {
    kind: 'topic'
    lesson: CurriculumLessonNode
    topic: CurriculumTopicNode
    lessonSlug: string
    topicSlug: string
    courseSlug: string
  }

function emitLessonLeaves(
  lesson: CurriculumLessonNode,
  courseSlug: string,
  out: LearnLeaf[]
): void {
  if (lesson.has_topics && lesson.topics.length > 0) {
    const topics = [...lesson.topics].sort((a, b) => a.menu_order - b.menu_order)
    for (const topic of topics) {
      out.push({
        kind: 'topic',
        lesson,
        topic,
        lessonSlug: lesson.slug,
        topicSlug: topic.slug,
        courseSlug
      })
    }
    return
  }
  out.push({
    kind: 'lesson',
    lesson,
    lessonSlug: lesson.slug,
    courseSlug
  })
}

export function flattenCurriculum(curriculum: CurriculumResponse): LearnLeaf[] {
  const courseSlug = curriculum.course.slug
  const out: LearnLeaf[] = []

  const modules = [...curriculum.modules].sort((a, b) => a.menu_order - b.menu_order)
  for (const module of modules) {
    const lessons = [...module.lessons].sort((a, b) => a.menu_order - b.menu_order)
    for (const lesson of lessons) {
      emitLessonLeaves(lesson, courseSlug, out)
    }
  }

  const orphans = [...curriculum.orphan_lessons].sort((a, b) => a.menu_order - b.menu_order)
  for (const lesson of orphans) {
    emitLessonLeaves(lesson, courseSlug, out)
  }

  return out
}

export function leafToPath(leaf: LearnLeaf): string {
  if (leaf.kind === 'topic') {
    return `/learn/${leaf.lessonSlug}/${leaf.topicSlug}`
  }
  return `/learn/${leaf.lessonSlug}`
}

interface NeighborTriple {
  prev: LearnLeaf | null
  current: LearnLeaf | null
  next: LearnLeaf | null
}

function buildTriple(leaves: LearnLeaf[], index: number): NeighborTriple {
  if (index < 0) {
    return { prev: null, current: null, next: null }
  }
  return {
    prev: index > 0 ? leaves[index - 1] ?? null : null,
    current: leaves[index] ?? null,
    next: index < leaves.length - 1 ? leaves[index + 1] ?? null : null
  }
}

export function neighborsByLessonSlug(
  leaves: LearnLeaf[],
  lessonSlug: string
): NeighborTriple {
  const index = leaves.findIndex(
    leaf => leaf.kind === 'lesson' && leaf.lessonSlug === lessonSlug
  )
  return buildTriple(leaves, index)
}

export function neighborsByTopicSlug(
  leaves: LearnLeaf[],
  lessonSlug: string,
  topicSlug: string
): NeighborTriple {
  const index = leaves.findIndex(
    leaf =>
      leaf.kind === 'topic'
      && leaf.lessonSlug === lessonSlug
      && leaf.topicSlug === topicSlug
  )
  return buildTriple(leaves, index)
}

/**
 * Resolve the URL the dashboard "Continue" button should route to.
 *
 * Prefers the server-computed `next_entity` hint from the curriculum
 * response (Phase 5.2). Falls back to the first non-completed leaf when
 * the hint is unexpectedly absent. Returns null when nothing remains —
 * caller decides whether to land the user on the course page instead.
 */
export function continueUrl(curriculum: CurriculumResponse): string | null {
  const hint = curriculum.next_entity
  if (hint) {
    if (hint.type === 'topic') {
      return `/learn/${hint.lesson_slug}/${hint.slug}`
    }
    return `/learn/${hint.slug}`
  }

  const leaves = flattenCurriculum(curriculum)
  const next = leaves.find((leaf) => {
    const status
      = leaf.kind === 'topic' ? leaf.topic.progress.status : leaf.lesson.progress.status
    return status !== 'completed'
  })
  return next ? leafToPath(next) : null
}
