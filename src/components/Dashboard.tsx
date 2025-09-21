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
  Key
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
                    <span>Vítejte, {getDisplayName(session.user.name, (session.user as any).lastName)}</span>
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
              {['ADMIN', 'SUPERADMIN'].includes(session.user.role) && (
                <Button
                  variant="secondary"
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Administrace</span>
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
                        <span>Vítejte, {getDisplayName(session.user.name, (session.user as any).lastName)}</span>
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

                  {['ADMIN', 'SUPERADMIN'].includes(session.user.role) && (
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

      {/* Footer - Logo and Credits */}
      <motion.footer
        className="absolute bottom-4 right-4 flex items-center space-x-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="35" height="16" viewBox="0 0 35 16" fill="none">
          <g clipPath="url(#clip0_270_4)">
            <path d="M7.28512 14.2443C7.23697 14.2443 7.18282 14.2321 7.12266 14.2078C7.0625 14.1714 7.00232 14.135 6.94216 14.0985L0.6426 9.76163C0.474131 9.64014 0.34176 9.52474 0.245493 9.4154C0.161258 9.29391 0.119141 9.14207 0.119141 8.95985V8.46785C0.119141 8.28563 0.161258 8.13985 0.245493 8.03052C0.34176 7.90903 0.474131 7.78756 0.6426 7.66607L6.94216 3.32918C7.00232 3.30489 7.0625 3.28058 7.12266 3.25629C7.18282 3.21985 7.23697 3.20163 7.28512 3.20163C7.38138 3.20163 7.46562 3.23807 7.53782 3.31096C7.61002 3.37169 7.64612 3.45674 7.64612 3.56607V5.24252C7.64612 5.41258 7.59798 5.55229 7.50172 5.66163C7.40546 5.7588 7.29716 5.84385 7.17681 5.91674L3.00719 8.72296L7.17681 11.5292C7.29716 11.6021 7.40546 11.6871 7.50172 11.7843C7.59798 11.8815 7.64612 12.0212 7.64612 12.2034V13.8616C7.64612 13.9831 7.61002 14.0803 7.53782 14.1532C7.46562 14.2139 7.38138 14.2443 7.28512 14.2443ZM9.03177 15.9754C8.92347 15.9754 8.83322 15.9329 8.76101 15.8478C8.68881 15.775 8.65271 15.6899 8.65271 15.5927C8.65271 15.532 8.66473 15.4712 8.68881 15.4105L14.8259 0.541182C14.862 0.443995 14.9222 0.352884 15.0064 0.267848C15.1027 0.170663 15.2411 0.12207 15.4216 0.12207H16.8115C16.9198 0.12207 17.01 0.164589 17.0822 0.249626C17.1544 0.322515 17.1905 0.407551 17.1905 0.504737C17.1905 0.553328 17.1785 0.61407 17.1544 0.686959L10.9993 15.5563C10.9632 15.6413 10.897 15.7324 10.8007 15.8296C10.7165 15.9268 10.5781 15.9754 10.3855 15.9754H9.03177ZM27.8303 14.2443C27.7341 14.2443 27.6498 14.2139 27.5776 14.1532C27.5054 14.0803 27.4693 13.9831 27.4693 13.8616V12.2034C27.4693 12.0212 27.5175 11.8815 27.6137 11.7843C27.7099 11.6871 27.8182 11.6021 27.9386 11.5292L32.1083 8.72296L27.9386 5.91674C27.8182 5.84385 27.7099 5.7588 27.6137 5.66163C27.5175 5.55229 27.4693 5.41258 27.4693 5.24252V3.56607C27.4693 3.45674 27.5054 3.37169 27.5776 3.31096C27.6498 3.23807 27.7341 3.20163 27.8303 3.20163C27.8904 3.20163 27.9507 3.21985 28.0108 3.25629C28.0709 3.28058 28.1251 3.30489 28.1733 3.32918L34.4728 7.66607C34.6534 7.78756 34.7856 7.90903 34.87 8.03052C34.9543 8.13985 34.9963 8.28563 34.9963 8.46785V8.95985C34.9963 9.14207 34.9543 9.29391 34.87 9.4154C34.7856 9.52474 34.6534 9.64014 34.4728 9.76163L28.1733 14.0985C28.1251 14.135 28.0709 14.1714 28.0108 14.2078C27.9507 14.2321 27.8904 14.2443 27.8303 14.2443Z" fill="#0A010D"/>
            <path d="M17.2496 14.4443C17.1413 14.4443 17.0451 14.4079 16.9608 14.335C16.8886 14.2499 16.8525 14.1527 16.8525 14.0434C16.8525 14.007 16.8586 13.9645 16.8706 13.9159C16.8947 13.8551 16.9247 13.8005 16.9608 13.7519L20.0113 9.57897L17.2135 5.66119C17.1774 5.61259 17.1474 5.56402 17.1233 5.51542C17.1113 5.46682 17.1052 5.41824 17.1052 5.36964C17.1052 5.26031 17.1413 5.16919 17.2135 5.09631C17.2978 5.01126 17.394 4.96875 17.5024 4.96875H19.3796C19.524 4.96875 19.6323 5.00519 19.7045 5.07808C19.7887 5.15097 19.8489 5.21779 19.885 5.27853L21.7442 7.82964L23.6034 5.29675C23.6516 5.23602 23.7117 5.16919 23.7839 5.09631C23.8561 5.01126 23.9703 4.96875 24.1268 4.96875H25.9138C26.0221 4.96875 26.1124 5.01126 26.1846 5.09631C26.2689 5.16919 26.3109 5.26031 26.3109 5.36964C26.3109 5.41824 26.305 5.46682 26.2929 5.51542C26.2808 5.56402 26.2508 5.61259 26.2026 5.66119L23.3507 9.59719L26.4373 13.7519C26.4734 13.8005 26.4974 13.849 26.5095 13.8976C26.5335 13.9462 26.5456 13.9948 26.5456 14.0434C26.5456 14.1527 26.5035 14.2499 26.4192 14.335C26.347 14.4079 26.2568 14.4443 26.1485 14.4443H24.181C24.0487 14.4443 23.9463 14.4139 23.8741 14.3532C23.8019 14.2803 23.7418 14.2135 23.6936 14.1527L21.69 11.4559L19.6503 14.1527C19.6142 14.2013 19.5601 14.2621 19.4879 14.335C19.4157 14.4079 19.3074 14.4443 19.163 14.4443H17.2496Z" fill="url(#paint0_linear_270_4)"/>
          </g>
          <defs>
            <linearGradient id="paint0_linear_270_4" x1="17.17" y1="14.4443" x2="26.1626" y2="14.5813" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C91FF3"/>
              <stop offset="1" stopColor="#340440"/>
            </linearGradient>
            <clipPath id="clip0_270_4">
              <rect width="35" height="16" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <span className="text-sm font-rubik font-semibold" style={{ color: '#000' }}>
          code and design by{' '}
          <a 
            href="https://www.virtuex.cz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity font-rubik font-semibold"
            style={{
              background: 'linear-gradient(78deg, #C91FF3 68.63%, #340440 87.12%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '16px',
              lineHeight: 'normal',
              letterSpacing: '-0.48px'
            }}
          >
            virtuex
          </a>
        </span>
      </motion.footer>
    </div>
  )
}