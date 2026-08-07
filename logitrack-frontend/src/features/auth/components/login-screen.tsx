'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Icon } from '@/shared/ui/icon'
import { Field } from '@/shared/ui/field'
import { TextInput } from '@/shared/ui/text-input'
import { useTheme } from '@/shared/theme/use-theme'
import { useLoginController } from '../controllers/use-login-controller'

const FIELD_CONTROL =
  'w-full h-compact-row-height bg-surface-container-lowest border border-outline-variant ' +
  'rounded-xs font-data-mono text-data-mono text-on-surface transition-colors ' +
  'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ' +
  'dark:border-[#60708c] dark:bg-[#1d2b42] dark:text-[#f7f9ff] dark:placeholder:text-[#8e9bb0] ' +
  'dark:hover:border-[#7f90ad] dark:focus:border-[#c4caff] dark:focus:ring-[#aeb6ff]/40'

const FIELD_LABEL =
  'font-label-caps text-label-caps text-on-surface-variant uppercase dark:text-[#dce4f3]'

const ICON_TONE = 'text-on-surface-variant dark:text-[#c2cdeb]'

type LoginScreenProps = {
  /** Rota para onde voltar apos o login; ja sanitizada na page. */
  redirectTo: string
  /** Veio de `/api/auth/expirar`: distingue "sessao caiu" de "credencial errada". */
  hasExpired: boolean
}

export function LoginScreen({ redirectTo, hasExpired }: LoginScreenProps) {
  const t = useTranslations('Auth')
  const { toggle } = useTheme()
  const { formAction, isSubmitting, errorMessage, isPasswordVisible, togglePasswordVisibility } =
    useLoginController()

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-background text-on-background transition-colors duration-200">
      <div className="login-ambient pointer-events-none absolute inset-0 z-0" />
      <div className="absolute inset-0 z-[1] grid-pattern pointer-events-none" />

      <button
        type="button"
        onClick={toggle}
        aria-label={t('toggleTheme')}
        className="absolute right-6 top-6 z-50 flex items-center justify-center rounded-full border border-outline-variant bg-surface-container-high p-2 text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container-highest hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-[#526483] dark:bg-[#1b2940] dark:text-[#d5def0] dark:shadow-lg dark:hover:border-[#8798b6] dark:hover:bg-[#273957] dark:hover:text-white"
      >
        <Icon name="dark_mode" className="dark:hidden" />
        <Icon name="light_mode" className="hidden dark:block" />
      </button>

      <div className="relative z-10 w-full max-w-[460px] px-container-padding">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-[92px] w-[200px] items-center justify-center">
            <Image
              src="/img/logo-logitrack.png"
              alt={t('logoAlt')}
              width={512}
              height={235}
              priority
              className="h-auto w-full object-contain drop-shadow-sm dark:brightness-0 dark:invert dark:opacity-95 dark:drop-shadow-[0_0_16px_rgba(174,182,255,0.28)]"
            />
          </div>
        </div>

        <div className="rounded-xs border border-outline-variant bg-surface-container-lowest shadow-lg dark:border-[#5c6f91] dark:bg-[#121e30] dark:shadow-[0_28px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(174,182,255,0.08)]">
          <div className="h-1 w-full rounded-t-xs bg-primary dark:bg-[#c4caff] dark:shadow-[0_0_20px_rgba(174,182,255,0.5)]" />

          <form className="p-8 flex flex-col gap-6" action={formAction}>
            {/* Para onde voltar depois do login; sanitizado na Server Action. */}
            <input type="hidden" name="from" value={redirectTo} />

            <Field
              htmlFor="email"
              label={t('email')}
              className="flex flex-col gap-2"
              labelClassName={FIELD_LABEL}
            >
              <TextInput
                id="email"
                name="email"
                type="email"
                required
                placeholder="user@logitron.sys"
                leadingIcon="mail"
                leadingIconClassName={`text-[20px] ${ICON_TONE}`}
                className={`${FIELD_CONTROL} pl-10 pr-4`}
              />
            </Field>

            <Field
              htmlFor="password"
              label={t('password')}
              className="flex flex-col gap-2"
              labelClassName={FIELD_LABEL}
            >
              <TextInput
                id="password"
                name="senha"
                type={isPasswordVisible ? 'text' : 'password'}
                required
                placeholder="••••••••"
                leadingIcon="lock"
                leadingIconClassName={`text-[20px] ${ICON_TONE}`}
                className={`${FIELD_CONTROL} pl-10 pr-10`}
                trailing={
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={isPasswordVisible ? t('hidePassword') : t('showPassword')}
                    className={`flex items-center justify-center ${ICON_TONE} transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
                  >
                    <Icon name={isPasswordVisible ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                  </button>
                }
              />
            </Field>

            {hasExpired && !errorMessage && (
              <p role="status" className="rounded-xs border border-outline-variant bg-surface-container-low px-3 py-2 font-body-sm text-body-sm text-on-surface-variant dark:border-[#526483] dark:bg-[#1b2940] dark:text-[#dce4f3]">
                {t('expired')}
              </p>
            )}

            {errorMessage && (
              <p role="alert" className="rounded-xs border border-error/40 bg-error-container/40 px-3 py-2 font-body-sm text-body-sm text-error dark:text-[#ffd4cf]">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group mt-2 flex h-compact-row-height w-full items-center justify-center gap-2 rounded-xs bg-primary font-label-caps text-label-caps uppercase tracking-wider text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 dark:bg-[#b9c1ff] dark:text-[#101745] dark:shadow-[0_8px_24px_rgba(105,119,224,0.25)] dark:hover:bg-[#d9ddff] dark:hover:text-[#09103d]"
            >
              {isSubmitting ? t('entering') : t('submit')}
              <Icon name="arrow_forward" className="text-[16px] group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="rounded-b-xs border-t border-outline-variant bg-surface-container-low p-4 text-center dark:border-[#455875] dark:bg-[#17253a]">
            <span className="font-data-mono text-[10px] text-on-surface-variant/70 dark:text-[#bfcbe0]">
              {t('secureConnection')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
