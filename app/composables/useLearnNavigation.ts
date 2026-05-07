import type {
  CurriculumLessonNode,
  CurriculumResponse,
  CurriculumSessionNode,
  CurriculumTopicNode
} from '#shared/types/learn'

/**
 * Phase 5.6 + 7.6 — pure helpers that walk a curriculum response in
 * canonical learning order to produce a flat list of leaves
 * (lessons / topics / cohort sessions) and resolve prev/next neighbors
 * for the lesson-player pagination + the dashboard "Continue" deep-link.
 *
 * Mirrors the backend's `Learn/NextEntityResolver` algorithm conceptually,
 * not character-for-character: modules in `menu_order`, lessons within
 * each module in `menu_order`, then topics within each lesson in
 * `menu_order` when present (otherwise the lesson itself), then orphan
 * lessons, and finally — for cohort courses — top-level session leaves
 * in `_vl_session_scheduled_start ASC` (already pre-sorted by the
 * backend transformer; we keep their incoming order).
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
  | {
    kind: 'session'
    session: CurriculumSessionNode
    sessionSlug: string
    courseSlug: string
  }

function emitLessonLeaves(
  lesson: CurriculumLessonNode,
  courseSlug: string,
  out: LearnLeaf[]
): void {
  // Always emit the lesson itself as a leaf so prev/next pagination treats
  // the lesson page as a real station — the curriculum rail already lists
  // the lesson page above its topics, and skipping it here used to make the
  // "next" button on the previous lesson jump straight into the first
  // topic, bypassing the new lesson's overview entirely.
  out.push({
    kind: 'lesson',
    lesson,
    lessonSlug: lesson.slug,
    courseSlug
  })
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
  }
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

  // Phase 7.4 backend pre-sorts sessions by `scheduled_start ASC`; preserve.
  for (const session of curriculum.sessions) {
    out.push({
      kind: 'session',
      session,
      sessionSlug: session.slug,
      courseSlug
    })
  }

  return out
}

export function leafToPath(leaf: LearnLeaf): string {
  switch (leaf.kind) {
    case 'topic':
      return `/learn/${leaf.lessonSlug}/${leaf.topicSlug}`
    case 'lesson':
      return `/learn/${leaf.lessonSlug}`
    case 'session':
      return `/learn/sessions/${leaf.sessionSlug}`
  }
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

export function neighborsBySessionSlug(
  leaves: LearnLeaf[],
  sessionSlug: string
): NeighborTriple {
  const index = leaves.findIndex(
    leaf => leaf.kind === 'session' && leaf.sessionSlug === sessionSlug
  )
  return buildTriple(leaves, index)
}

/**
 * Resolve the URL the dashboard "Continue" button should route to.
 *
 * For a fresh enrollment (`progress_pct === 0`) we land on the first
 * canonical leaf — which, thanks to `flattenCurriculum` always emitting
 * the lesson page before its topics, is the lesson page itself rather
 * than its first topic. This keeps the entry point consistent with the
 * curriculum rail and the prev/next pagination.
 *
 * Once any progress exists, prefer the server-computed `next_entity`
 * hint (Phase 5.2 + 7.4 session arm) so the learner resumes exactly
 * where they left off. Falls back to the first non-completed leaf when
 * the hint is unexpectedly absent; returns null when nothing remains.
 */
export function continueUrl(curriculum: CurriculumResponse): string | null {
  const leaves = flattenCurriculum(curriculum)

  const notStarted = (curriculum.course.enrollment?.progress_pct ?? 0) === 0
  if (notStarted) {
    const firstLeaf = leaves[0]
    if (firstLeaf) {
      return leafToPath(firstLeaf)
    }
  }

  const hint = curriculum.next_entity
  if (hint) {
    switch (hint.type) {
      case 'topic':
        return `/learn/${hint.lesson_slug}/${hint.slug}`
      case 'lesson':
        return `/learn/${hint.slug}`
      case 'session':
        return `/learn/sessions/${hint.slug}`
    }
  }

  const next = leaves.find((leaf) => {
    switch (leaf.kind) {
      case 'topic':
        return leaf.topic.progress.status !== 'completed'
      case 'lesson':
        return leaf.lesson.progress.status !== 'completed'
      case 'session':
        return !leaf.session.is_completed
    }
  })
  return next ? leafToPath(next) : null
}
