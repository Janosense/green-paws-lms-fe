/**
 * Auth-state watcher for the quiz-attempt store.
 *
 * Mirrors `app/plugins/progress.ts`: no boot-time prefetch (quizzes are
 * lazy by slug), but on logout the in-memory cache is dropped so a fresh
 * login on the same machine never sees a stale attempt.
 *
 * @author Tymofii Synianskyi
 */
export default defineNuxtPlugin({
  name: 'vl-quiz-attempt',
  dependsOn: ['vl-auth'],
  setup() {
    const authStore = useAuthStore()
    const quizAttemptStore = useQuizAttemptStore()

    watch(
      () => authStore.isAuthenticated,
      (isAuthed, wasAuthed) => {
        if (!isAuthed && wasAuthed) {
          quizAttemptStore.clearAll()
        }
      }
    )
  }
})
