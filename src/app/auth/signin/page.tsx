'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccess(message)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Neplatné přihlašovací údaje')
      } else {
        const session = await getSession()
        if (session?.user?.role === 'ADMIN') {
          router.push('/admin')
        } else {
          router.push('/')
        }
      }
    } catch (error) {
      setError('Chyba při přihlašování')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <motion.div
        className="max-w-md w-full space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            className="mx-auto w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Building2 className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h2
            className="text-3xl font-bold text-gray-900"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Přihlášení
          </motion.h2>
          <motion.p
            className="mt-2 text-gray-600"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Nebo{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              se zaregistrujte
            </Link>
          </motion.p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email"
                type="email"
                placeholder="Váš email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-5 h-5" />}
                required
              />

              <div className="relative">
                <Input
                  label="Heslo"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Vaše heslo"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-5 h-5" />}
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="bg-red-50 border border-red-200 rounded-lg p-4"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-red-600 text-sm">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {success && (
                  <motion.div
                    className="bg-green-50 border border-green-200 rounded-lg p-4"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-green-600 text-sm">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={loading}
                className="w-full"
              >
                {!loading && <ArrowRight className="w-5 h-5" />}
                {loading ? 'Přihlašování...' : 'Přihlásit se'}
              </Button>
            </form>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}