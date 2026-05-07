import { z } from 'zod'

/**
 * Backend source of truth: VL\LMS\Auth\PasswordPolicy::DEFAULT_MIN_LENGTH (8),
 * overridable via the `vl_lms_min_password_length` filter. Keep in sync.
 */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Schemas are built per-render via factory functions so Zod messages are
 * already-resolved i18n strings by the time `UForm` renders them. The form
 * layer (`UForm` + `UFormField`) prints `message` verbatim, so embedding
 * raw keys here would surface keys like `auth.errors.first_name_required`
 * to the user.
 */
type Translator = (key: string, named?: Record<string, unknown>) => string

export const buildLoginSchema = (t: Translator) => z.object({
  email: z.string()
    .min(1, { message: t('auth.errors.required_field') })
    .email({ message: t('auth.errors.invalid_email') }),
  password: z.string().min(1, { message: t('auth.errors.required_field') })
})
export type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>

export const buildRegisterSchema = (t: Translator) => z.object({
  email: z.string()
    .min(1, { message: t('auth.errors.required_field') })
    .email({ message: t('auth.errors.invalid_email') }),
  password: z.string().min(MIN_PASSWORD_LENGTH, {
    message: t('auth.errors.password_too_short', { min: MIN_PASSWORD_LENGTH })
  }),
  password_confirmation: z.string().min(1, { message: t('auth.errors.required_field') }),
  first_name: z.string().trim().min(1, { message: t('auth.errors.first_name_required') }),
  last_name: z.string().trim().min(1, { message: t('auth.errors.last_name_required') })
}).refine(values => values.password === values.password_confirmation, {
  message: t('auth.errors.passwords_do_not_match'),
  path: ['password_confirmation']
})
export type RegisterFormValues = z.infer<ReturnType<typeof buildRegisterSchema>>

export const buildRequestPasswordResetSchema = (t: Translator) => z.object({
  email: z.string()
    .min(1, { message: t('auth.errors.required_field') })
    .email({ message: t('auth.errors.invalid_email') })
})
export type RequestPasswordResetFormValues = z.infer<ReturnType<typeof buildRequestPasswordResetSchema>>

export const buildConfirmPasswordResetSchema = (t: Translator) => z.object({
  token: z.string().min(1, { message: t('auth.errors.token_required') }),
  password: z.string().min(MIN_PASSWORD_LENGTH, {
    message: t('auth.errors.password_too_short', { min: MIN_PASSWORD_LENGTH })
  }),
  password_confirmation: z.string().min(1, { message: t('auth.errors.required_field') })
}).refine(values => values.password === values.password_confirmation, {
  message: t('auth.errors.passwords_do_not_match'),
  path: ['password_confirmation']
})
export type ConfirmPasswordResetFormValues = z.infer<ReturnType<typeof buildConfirmPasswordResetSchema>>

export const buildVerifyEmailSchema = (t: Translator) => z.object({
  token: z.string().min(1, { message: t('auth.errors.token_required') })
})
export type VerifyEmailFormValues = z.infer<ReturnType<typeof buildVerifyEmailSchema>>

export const buildResendVerificationSchema = (t: Translator) => z.object({
  email: z.string()
    .min(1, { message: t('auth.errors.required_field') })
    .email({ message: t('auth.errors.invalid_email') })
})
export type ResendVerificationFormValues = z.infer<ReturnType<typeof buildResendVerificationSchema>>
