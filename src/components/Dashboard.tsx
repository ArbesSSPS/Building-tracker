'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, 
  Users, 
  MapPin, 
  LogOut, 
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  Menu,
  X,
  Sparkles,
  Key,
  Crown
} from 'lucide-react'
import { BuildingStats, Presence } from '@/types'
import Button from './ui/Button'
import Card from './ui/Card'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<BuildingStats | null>(null)
  const [presence, setPresence] = useState<Presence | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [alarmCode, setAlarmCode] = useState<string | null>(null)
  const [showAlarmCode, setShowAlarmCode] = useState(false)

  const getDisplayName = (name: string, lastName?: string | null) => {
    return lastName ? `${name} ${lastName}` : name
  }

  useEffect(() => {
    if (session) {
      fetchStats()
      fetchPresence()
      fetchAlarmCode()
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchPresence = async () => {
    try {
      const response = await fetch('/api/presence')
      const data = await response.json()
      setPresence(data)
    } catch (error) {
      console.error('Error fetching presence:', error)
    }
  }

  const fetchAlarmCode = async () => {
    try {
      const response = await fetch('/api/user/profile')
      const data = await response.json()
      setAlarmCode(data.alarmCode)
    } catch (error) {
      console.error('Error fetching alarm code:', error)
    }
  }

  const updatePresence = async (isPresent: boolean) => {
    setLoading(true)
    try {
      const response = await fetch('/api/presence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPresent })
      })

      if (response.ok) {
        await fetchPresence()
        await fetchStats()
      }
    } catch (error) {
      console.error('Error updating presence:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchStats(), fetchPresence()])
    setRefreshing(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-600">Načítání...</p>
        </motion.div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-gray-600">Přesměrování na přihlašovací stránku...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <motion.header
        className="bg-white shadow-sm border-b border-gray-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Sledování budovy
                </h1>
                <div className="text-gray-600 hidden sm:block">
                  <div className="flex items-center space-x-2">
                    <span>Vítejte, {getDisplayName(session.user.name, session.user.lastName)}</span>
                    {session.user.role === 'SUPERADMIN' && (
                      <span className="px-2 py-1 text-xs font-bold text-purple-700 bg-purple-100 rounded-full">
                        SUPERADMIN
                      </span>
                    )}
                    {session.user.role === 'ADMIN' && (
                      <span className="px-2 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full">
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-3">
              <motion.button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>
              <Button
                variant="secondary"
                onClick={() => router.push('/cleaning')}
                className="flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Uklid</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push('/settings')}
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Nastavení</span>
              </Button>
              {session.user.role === 'ADMIN' && (
                <Button
                  variant="secondary"
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Administrace</span>
                </Button>
              )}
              {session.user.role === 'SUPERADMIN' && (
                <Button
                  variant="secondary"
                  onClick={() => router.push('/superadmin')}
                  className="flex items-center space-x-2"
                >
                  <Crown className="w-4 h-4" />
                  <span>Superadmin</span>
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => signOut()}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Odhlásit se</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <motion.button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </motion.button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                className="md:hidden border-t border-gray-200 py-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-3">
                  <div className="px-2 py-1">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span>Vítejte, {getDisplayName(session.user.name, session.user.lastName)}</span>
                        {session.user.role === 'SUPERADMIN' && (
                          <span className="px-2 py-1 text-xs font-bold text-purple-700 bg-purple-100 rounded-full">
                            SUPERADMIN
                          </span>
                        )}
                        {session.user.role === 'ADMIN' && (
                          <span className="px-2 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <motion.button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="flex-1 flex items-center justify-center space-x-2 p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                      <span>Obnovit</span>
                    </motion.button>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      router.push('/cleaning')
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Uklid</span>
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      router.push('/settings')
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Nastavení</span>
                  </Button>

                  {session.user.role === 'ADMIN' && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        router.push('/admin')
                        setMobileMenuOpen(false)
                      }}
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Administrace</span>
                    </Button>
                  )}
                  {session.user.role === 'SUPERADMIN' && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        router.push('/superadmin')
                        setMobileMenuOpen(false)
                      }}
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <Crown className="w-4 h-4" />
                      <span>Superadmin</span>
                    </Button>
                  )}
                  
                  <Button
                    variant="secondary"
                    onClick={() => {
                      signOut()
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Odhlásit se</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl space-y-8">
          {/* Stats Cards */}
          <motion.div
            className={`grid grid-cols-1 gap-6 ${alarmCode ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Celkem v budově</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.totalPresent || 0}
                  </p>
                  <p className="text-sm text-gray-500">lidí</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Na vašem patře</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.floorPresent || 0}
                  </p>
                  <p className="text-sm text-gray-500">lidí</p>
                </div>
              </div>
            </Card>

            {alarmCode && (
              <Card className="p-6 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setShowAlarmCode(!showAlarmCode)}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Key className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">Kód od alarmu</p>
                    <div className="relative">
                      {showAlarmCode ? (
                        <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest">
                          {alarmCode}
                        </p>
                      ) : (
                        <div className="relative">
                          <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest filter blur-md select-none">
                            {alarmCode}
                          </p>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-sm text-gray-600 font-medium shadow-sm border border-gray-200">
                              Kliknutím se zobrazí
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">4 číslice</p>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>

          {/* Current Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-full ${
                    presence?.isPresent ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {presence?.isPresent ? 'Jste v budově' : 'Nejste v budově'}
                    </h3>
                    {session.user.room && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {session.user.room.name} • Patro {session.user.room.floor?.number}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {presence?.isPresent ? (
              <Button
                variant="danger"
                size="lg"
                onClick={() => updatePresence(false)}
                disabled={loading}
                loading={loading}
                className="w-full h-16 text-lg font-semibold"
              >
                <XCircle className="w-6 h-6" />
                Odcházím
              </Button>
            ) : (
              <Button
                variant="success"
                size="lg"
                onClick={() => updatePresence(true)}
                disabled={loading}
                loading={loading}
                className="w-full h-16 text-lg font-semibold"
              >
                <CheckCircle className="w-6 h-6" />
                Jsem zde
              </Button>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}