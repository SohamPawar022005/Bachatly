'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AlertTriangle, LogIn, UserPlus } from 'lucide-react'

import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { loginSchema, registerSchema } from '@/lib/validation/schemas'

type Mode = 'login' | 'register'

/**
 * Sign in / sign up.
 *
 * Sign-in runs through Auth.js so the session cookie is issued by the same code
 * path the middleware trusts; registration posts to our REST endpoint (which
 * hashes the password) and then signs the user straight in.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/account'
  const isLogin = mode === 'login'

  // One schema for both modes: `name` only exists on the register form, and the
  // password rules differ (registration enforces strength, sign-in does not).
  const formSchema = z
    .object({
      name: z.string().trim().max(80).optional(),
      email: registerSchema.shape.email,
      password: isLogin ? loginSchema.shape.password : registerSchema.shape.password,
    })
    .refine(
      (values) => isLogin || (values.name?.trim().length ?? 0) >= 2,
      { message: 'Name must be at least 2 characters', path: ['name'] },
    )
  type Values = z.infer<typeof formSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const [failure, setFailure] = React.useState<string | null>(null)

  const onSubmit = async (values: Values) => {
    setFailure(null)
    try {
      if (!isLogin) {
        await api.post('/api/auth/register', { name: values.name?.trim(), email: values.email, password: values.password })
      }
      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
      })
      if (result?.error) {
        setFailure('Incorrect email or password. Please check and try again.')
        return
      }
      router.push(callbackUrl)
      router.refresh()
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {failure ? (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" aria-hidden />
            Could not continue
          </AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}

      {!isLogin ? (
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Asha Deshmukh"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            {...register('name')}
          />
          {errors.name ? (
            <p id="name-error" className="text-xs text-destructive">
              {errors.name.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email ? (
          <p id="email-error" className="text-xs text-destructive">
            {errors.email?.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          placeholder="••••••••"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
        {errors.password ? (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password?.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Spinner /> : isLogin ? <LogIn className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
        {isSubmitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? (
          <>
            New to Bachatly?{' '}
            <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
