'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Lock, CheckCircle, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      setTokenValid(true)
    } else {
      setTokenValid(false)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Hesla se neshodují')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Přesměrovat na login po 3 sekundách
        setTimeout(() => {
          router.push('/auth/signin')
        }, 3000)
      } else {
        setError(data.error || 'Chyba při změně hesla')
      }
    } catch (error) {
      setError('Chyba při změně hesla')
    } finally {
      setLoading(false)
    }
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-md w-full space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Neplatný odkaz
            </h2>
            <p className="text-gray-600 mb-8">
              Reset odkaz je neplatný nebo chybí. Požádejte o nový reset link.
            </p>
            <Button
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full"
            >
              Požádat o nový reset link
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-md w-full space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Heslo změněno!
            </h2>
            <p className="text-gray-600 mb-8">
              Vaše heslo bylo úspěšně změněno. Budete přesměrováni na přihlašovací stránku.
            </p>
            <Button
              onClick={() => router.push('/auth/signin')}
              className="w-full"
            >
              Pokračovat na přihlášení
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-md w-full space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Nové heslo
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Zadejte nové heslo pro svůj účet
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Nové heslo
            </label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Zadejte nové heslo"
              className="w-full"
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Potvrdit heslo
            </label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Potvrďte nové heslo"
              className="w-full"
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Měním heslo...' : 'Změnit heslo'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/auth/signin')}
              className="w-full flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět na přihlášení
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Načítání...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
