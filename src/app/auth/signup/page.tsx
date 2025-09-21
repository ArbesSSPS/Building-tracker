'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2, User, Mail, Lock, ArrowRight, Eye, EyeOff, Key } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export default function SignUp() {
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, lastName, email, password, code })
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/auth/signin?message=Registrace byla úspěšná')
      } else {
        setError(data.error || 'Chyba při registraci')
      }
    } catch (error) {
      setError('Chyba při registraci')
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
        style={{ 
          width: '100%', 
          maxWidth: '448px',
          contain: 'layout'
        }}
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
            Registrace
          </motion.h2>
          <motion.p
            className="mt-2 text-gray-600"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Nebo{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              se přihlaste
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
            <form onSubmit={handleSubmit} className="space-y-6" style={{ contain: 'layout' }}>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="w-full sm:w-[calc(50%-4px)]">
                  <Input
                    label="Jméno"
                    type="text"
                    placeholder="Vaše jméno"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={<User className="w-5 h-5" />}
                    required
                  />
                </div>
                <div className="w-full sm:w-[calc(50%-4px)]">
                  <Input
                    label="Příjmení"
                    type="text"
                    placeholder="Vaše příjmení"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    icon={<User className="w-5 h-5" />}
                  />
                </div>
              </div>

              <div className="w-full">
                <Input
                  label="Email"
                  type="email"
                  placeholder="Váš email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-5 h-5" />}
                  required
                />
              </div>

              <div className="w-full">
                <Input
                  label="Registrační kód"
                  type="text"
                  placeholder="Zadejte registrační kód"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  icon={<Key className="w-5 h-5" />}
                  required
                />
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Heslo
                </label>
                <div className="relative flex items-center border border-gray-300 rounded-lg bg-white transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <div className="pl-3 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Heslo (min. 6 znaků)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 py-3 px-3 border-0 outline-none bg-transparent text-gray-900 placeholder-gray-500 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Potvrzení hesla
                </label>
                <div className="relative flex items-center border border-gray-300 rounded-lg bg-white transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <div className="pl-3 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Potvrzení hesla"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex-1 py-3 px-3 border-0 outline-none bg-transparent text-gray-900 placeholder-gray-500 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  className="bg-red-50 border border-red-200 rounded-lg p-4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-red-600 text-sm">{error}</p>
                </motion.div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                disabled={loading}
                className="w-full"
              >
                {!loading && <ArrowRight className="w-5 h-5" />}
                {loading ? 'Registrace...' : 'Zaregistrovat se'}
              </Button>
            </form>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}