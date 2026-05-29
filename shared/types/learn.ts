/**
 * Phase 5.4a wire-shape contracts for the learn subsystem.
 *
 * Mirrors the backend response shapes from Phase 5.1b
 * (`/vl/v1/learn/lessons/{slug}`, `/vl/v1/learn/topics/{slug}`) and
 * Phase 5.2 (`/vl/v1/learn/courses/{slug}/curriculum`).
 *
 * Block discriminated union mirrors the 11 backend block types from 5.1a.
 */

import type { ApiEnvelope } from './api'

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed'
export type EntityType = 'lesson' | 'topic' | 'module' | 'session'
export type SessionLifecycleStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'
export type VideoProvider = 'vimeo' | 'youtube' | 'file' | 'embed'

export interface ProgressShape {
  status: ProgressStatus
  position_seconds: number | null
  completed_at: string | null
}

export interface VideoShape {
  provider: VideoProvider
  url: string
  embed_url: string | null
  external_id: string | null
}

export interface CourseRef {
  id: number
  slug: string
  title: string
}

export interface ModuleRef {
  id: number
  slug: string
  title: string
}

export interface LessonRef {
  id: number
  slug: string
  title: string
}

export interface AttachmentShape {
  url: string
  name: string
  size: number
}

// --- block shapes ---

export interface ParagraphBlock { type: 'paragraph', html: string }
export interface HeadingBlock {
  type: 'heading'
  level: 2 | 3 | 4 | 5 | 6
  text: string
  anchor: string | null
}
export interface ListBlock { type: 'list', ordered: boolean, items: string[] }
export interface ImageBlock {
  type: 'image'
  url: string
  alt: string
  caption: string | null
  width: number | null
  height: number | null
}
export interface QuoteBlock { type: 'quote', html: string, citation: string | null }
export interface EmbedBlock {
  type: 'embed'
  provider: 'vimeo' | 'youtube' | 'other'
  url: string
  embed_url: string | null
}
export interface SeparatorBlock { type: 'separator' }
export interface CodeBlock { type: 'code', code: string, language: string | null }
export interface TableBlock {
  type: 'table'
  has_header: boolean
  has_footer: boolean
  head: string[][]
  body: string[][]
  foot: string[][]
}
export interface FileBlock {
  type: 'file'
  url: string
  name: string
  size: number | null
}
export interface HtmlFallbackBlock { type: 'html', html: string }

export type ContentBlock
  = | ParagraphBlock
    | HeadingBlock
    | ListBlock
    | ImageBlock
    | QuoteBlock
    | EmbedBlock
    | SeparatorBlock
    | CodeBlock
    | TableBlock
    | FileBlock
    | HtmlFallbackBlock

// --- lesson + topic detail responses ---

export interface TopicSummary {
  id: number
  slug: string
  title: string
  menu_order: number
  duration_seconds: number
}

export interface LessonResponse {
  id: number
  slug: string
  title: string
  course: CourseRef
  module: ModuleRef | null
  menu_order: number
  duration_seconds: number
  is_preview: boolean
  requires_completion: boolean
  video: VideoShape | null
  attachments: AttachmentShape[]
  content: { blocks: ContentBlock[] }
  topics: TopicSummary[]
  progress: ProgressShape
}

export interface TopicResponse {
  id: number
  slug: string
  title: string
  course: CourseRef
  module: ModuleRef | null
  lesson: LessonRef
  menu_order: number
  duration_seconds: number
  video: VideoShape | null
  content: { blocks: ContentBlock[] }
  progress: ProgressShape
}

// --- curriculum response ---

export interface EnrollmentBlock {
  status: 'active' | 'completed' | 'expired' | 'revoked'
  progress_pct: number
  enrolled_at: string
  completed_at: string | null
}

export interface CurriculumCourse {
  id: number
  slug: string
  title: string
  duration_seconds: number
  enrollment: EnrollmentBlock | null
}

export interface CurriculumTopicNode {
  id: number
  slug: string
  title: string
  menu_order: number
  duration_seconds: number
  progress: ProgressShape
}

export interface CurriculumLessonNode {
  id: number
  slug: string
  title: string
  menu_order: number
  duration_seconds: number
  is_preview: boolean
  requires_completion: boolean
  has_topics: boolean
  progress: ProgressShape
  topics: CurriculumTopicNode[]
  quizzes: CurriculumQuizNode[]
}

export interface CurriculumModuleNode {
  id: number
  slug: string
  title: string
  menu_order: number
  lessons: CurriculumLessonNode[]
  quizzes: CurriculumQuizNode[]
}

/**
 * Quiz status as surfaced to the curriculum rail. Distinct from
 * `ProgressStatus` (which is lesson/topic-shaped): a quiz can be `failed`
 * (every submitted attempt fell short) and is `passed` rather than
 * `completed`.
 */
export type QuizRailStatus = 'passed' | 'failed' | 'in_progress' | 'not_started'

/**
 * A `vl_quiz` attached to a course, module, lesson, or session via
 * `post_parent`. Surfaced as a tree leaf wherever attached. `status` and
 * `best_score_pct` reflect the current user's standing on the quiz.
 */
export interface CurriculumQuizNode {
  type: 'quiz'
  id: number
  slug: string
  title: string
  menu_order: number
  is_final_exam: boolean
  passing_threshold: number
  status: QuizRailStatus
  best_score_pct: number | null
}

/**
 * Phase 7.4: cohort courses surface their top-level `vl_session` posts as
 * curriculum-tree leaves alongside modules / orphan lessons. Self-paced
 * courses always emit an empty `sessions` list.
 */
export interface CurriculumSessionNode {
  type: 'session'
  id: number
  slug: string
  title: string
  session_number: number
  scheduled_start: string | null
  scheduled_end: string | null
  status: SessionLifecycleStatus
  is_completed: boolean
  join_url_path: string
  recording_url_path: string | null
  quizzes: CurriculumQuizNode[]
}

export type NextEntityHint
  = | { type: 'lesson', id: number, slug: string, lesson_slug: string }
    | { type: 'topic', id: number, slug: string, lesson_slug: string }
    | { type: 'session', id: number, slug: string, title: string, scheduled_start: string | null }
    | { type: 'quiz', id: number, slug: string }

export interface CurriculumResponse {
  course: CurriculumCourse
  modules: CurriculumModuleNode[]
  orphan_lessons: CurriculumLessonNode[]
  sessions: CurriculumSessionNode[]
  course_quizzes: CurriculumQuizNode[]
  next_entity: NextEntityHint | null
}

// --- session detail (Phase 7.4 — `GET /vl/v1/learn/sessions/{slug}`) ---

export interface SessionDetailSessionBlock {
  id: number
  slug: string
  title: string
  course_id: number
  course_slug: string
  session_number: number
  scheduled_start: string | null
  scheduled_end: string | null
  status: SessionLifecycleStatus
  materials: AttachmentShape[]
  recording_available_until: string | null
}

export interface SessionDetailComputedBlock {
  join_window_open: boolean
  join_opens_at: string | null
  join_closes_at: string | null
  recording_available: boolean
  is_past: boolean
  user_attended: boolean
}

export interface SessionDetailResponse {
  success: true
  session: SessionDetailSessionBlock
  computed: SessionDetailComputedBlock
}

export type LessonDetailResponse = ApiEnvelope<LessonResponse>
export type TopicDetailResponse = ApiEnvelope<TopicResponse>
export type CurriculumDetailResponse = ApiEnvelope<CurriculumResponse>
