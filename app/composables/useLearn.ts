import type { LessonDetailResponse, TopicDetailResponse } from '#shared/types/learn'

/**
 * Phase 5.4a — declarative SSR-integrated fetchers for the learn subsystem.
 *
 * Both helpers wrap `useApiFetch` so the lesson/topic pages participate in
 * the SSR payload and SWR cache. The auth header is attached by the shared
 * interceptor in `useApi.ts`; no extra wiring is needed here.
 */

export function useLearnLesson(slug: MaybeRefOrGetter<string>) {
  return useApiFetch<LessonDetailResponse>(
    () => `/vl/v1/learn/lessons/${toValue(slug)}`
  )
}

export function useLearnTopic(
  lessonSlug: MaybeRefOrGetter<string>,
  topicSlug: MaybeRefOrGetter<string>
) {
  // Topic slugs are globally unique on the backend, but we include the
  // lesson slug in the cache key so a future move to lesson-scoped slugs
  // doesn't accidentally serve stale data across siblings.
  const cacheKey = computed(() => `learn-topic-${toValue(lessonSlug)}-${toValue(topicSlug)}`)
  return useApiFetch<TopicDetailResponse>(
    () => `/vl/v1/learn/topics/${toValue(topicSlug)}`,
    {
      key: cacheKey.value
    }
  )
}
