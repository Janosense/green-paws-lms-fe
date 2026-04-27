import { z } from 'zod'

/**
 * Backend source of truth: VL\LMS\Auth\PasswordPolicy::DEFAULT_MIN_LENGTH (8),
 * overridable via the `vl_lms_min_password_length` filter. Keep in sync.
 */
export const MIN_PASSWORD_LENGTH = 8

/**
 * All error messages here are i18n keys, NOT user-facing strings. The form
 * layer is responsible for translating them via $t() at render time.
 */

export const loginSchema = z.object({
  email: z.string().min(1, { message: 'auth.errors.required_field' }).email({ message: 'auth.errors.invalid_email' }),
  password: z.string().min(1, { message: 'auth.errors.required_field' })
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: z.string().min(1, { message: 'auth.errors.required_field' }).email({ message: 'auth.errors.invalid_email' }),
  password: z.string().min(MIN_PASSWORD_LENGTH, { message: 'auth.errors.password_too_short' }),
  password_confirmation: z.string().min(1, { message: 'auth.errors.required_field' }),
  first_name: z.string().trim().min(1, { message: 'auth.errors.first_name_required' }),
  last_name: z.string().trim().min(1, { message: 'auth.errors.last_name_required' })
}).refine(values => values.password === values.password_confirmation, {
  message: 'auth.errors.passwords_do_not_match',
  path: ['password_confirmation']
})
export type RegisterFormValues = z.infer<typeof registerSchema>

export const requestPasswordResetSchema = z.object({
  email: z.string().min(1, { message: 'auth.errors.required_field' }).email({ message: 'auth.errors.invalid_email' })
})
export type RequestPasswordResetFormValues = z.infer<typeof requestPasswordResetSchema>

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1, { message: 'auth.errors.token_required' }),
  password: z.string().min(MIN_PASSWORD_LENGTH, { message: 'auth.errors.password_too_short' }),
  password_confirmation: z.string().min(1, { message: 'auth.errors.required_field' })
}).refine(values => values.password === values.password_confirmation, {
  message: 'auth.errors.passwords_do_not_match',
  path: ['password_confirmation']
})
export type ConfirmPasswordResetFormValues = z.infer<typeof confirmPasswordResetSchema>

export const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: 'auth.errors.token_required' })
})
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>

export const resendVerificationSchema = z.object({
  email: z.string().min(1, { message: 'auth.errors.required_field' }).email({ message: 'auth.errors.invalid_email' })
})
export type ResendVerificationFormValues = z.infer<typeof resendVerificationSchema>
