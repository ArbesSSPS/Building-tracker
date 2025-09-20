'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, 
  Users, 
  MapPin, 
  LogOut, 
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  RefreshCw,
  Settings,
  Home,
  Key,
  Copy,
  Check,
  Activity,
  Clock,
  Calendar,
  Menu,
  Sparkles,
  Image as ImageIcon,
  Send,
  Crown
} from 'lucide-react'
import { Floor, Room, User } from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import PhotoGallery from '@/components/ui/PhotoGallery'

export default function SuperAdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'codes'>('users')

  const getDisplayName = (name: string, lastName?: string | null) => {
    return lastName ? `${name} ${lastName}` : name
  }

  // Code management
  const [newCodeCount, setNewCodeCount] = useState(1)
  const [newCodeExpires, setNewCodeExpires] = useState(30)
  const [newCodeRole, setNewCodeRole] = useState('USER')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  // Role management
  const [editingUser, setEditingUser] = useState<any>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)

  useEffect(() => {
    if (session?.user?.role === 'SUPERADMIN') {
      fetchData()
    } else if (session?.user?.role === 'ADMIN') {
      router.push('/admin')
    } else {
      router.push('/')
    }
  }, [session, router])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, codesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/codes')
      ])

      const usersData = await usersRes.json()
      const codesData = await codesRes.json()

      setUsers(Array.isArray(usersData) ? usersData : [])
      setCodes(Array.isArray(codesData) ? codesData : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleEditUserRole = (user: any) => {
    setEditingUser(user)
    setShowRoleModal(true)
  }

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/admin/users/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        fetchData()
        setShowRoleModal(false)
        setEditingUser(null)
      } else {
        const error = await response.json()
        alert(`Chyba při změně role: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Chyba při změně role uživatele')
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Opravdu chcete smazat uživatele "${userName}"? Tato akce je nevratná a smaže všechny související data.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        fetchData()
      } else {
        const error = await response.json()
        alert(`Chyba při mazání uživatele: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Chyba při mazání uživatele')
    }
  }

  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newCodeCount < 1 || newCodeCount > 50) return

    try {
      const response = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: newCodeCount,
          expiresInDays: newCodeExpires,
          role: newCodeRole
        })
      })

      if (response.ok) {
        setNewCodeCount(1)
        setNewCodeExpires(30)
        setNewCodeRole('USER')
        fetchData()
      } else {
        const error = await response.json()
        alert(`Chyba při generování kódů: ${error.error}`)
      }
    } catch (error) {
      console.error('Error generating codes:', error)
      alert('Chyba při generování kódů')
    }
  }

  const handleDeleteCode = async (codeId: string, code: any) => {
    const isUsed = code.isUsed
    const message = isUsed 
      ? `Opravdu chcete smazat použitý kód "${code.code}"? Tato akce je nevratná.`
      : `Opravdu chcete smazat kód "${code.code}"?`
    
    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/admin/codes?id=${codeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        fetchData()
      } else {
        const error = await response.json()
        alert(`Chyba při mazání kódu: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting code:', error)
      alert('Chyba při mazání kódu')
    }
  }

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600">Načítání...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'SUPERADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Přístup odepřen</h1>
          <p className="text-gray-600 mb-4">Nemáte oprávnění k přístupu k této stránce.</p>
          <Button onClick={() => router.push('/')}>
            <Home className="w-4 h-4 mr-2" />
            Zpět na hlavní stránku
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        className="bg-white shadow-sm border-b border-gray-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Superadmin Panel
                </h1>
                <p className="text-gray-600 hidden sm:block">
                  Správa uživatelů a registračních kódů
                </p>
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
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Admin Panel</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push('/')}
                className="flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Hlavní stránka</span>
              </Button>
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
              <Button
                variant="secondary"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="md:hidden bg-white border-b border-gray-200"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-3 p-4">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Obnovit</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  router.push('/admin')
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Admin Panel</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  router.push('/')
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Hlavní stránka</span>
              </Button>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Uživatelé
              </button>
              <button
                onClick={() => setActiveTab('codes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'codes'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Key className="w-4 h-4 inline mr-2" />
                Registrační kódy
              </button>
            </nav>
          </div>
        </div>

        {/* Users Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div
              key="users"
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Seznam uživatelů</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {users.map((user: any) => (
                    <motion.div
                      key={user.id}
                      className="px-4 sm:px-6 py-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {getDisplayName(user.name, user.lastName)}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === 'SUPERADMIN' 
                                ? 'bg-purple-100 text-purple-800'
                                : user.role === 'ADMIN'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.room && (
                            <p className="text-xs text-gray-500">
                              {user.room.name} • Patro {user.room.floor?.number}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditUserRole(user)}
                            className="flex-1 sm:flex-none"
                            title="Změnit roli uživatele"
                          >
                            <Settings className="w-4 h-4" />
                            <span className="sm:hidden ml-2">Role</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, getDisplayName(user.name, user.lastName))}
                            className="flex-1 sm:flex-none"
                            title="Smazat uživatele"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sm:hidden ml-2">Smazat</span>
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Codes Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'codes' && (
            <motion.div
              key="codes"
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Generovat nové kódy
                </h3>
                <form onSubmit={handleGenerateCodes} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-600 mb-1">Počet kódů</label>
                    <Input
                      type="number"
                      placeholder="Počet kódů"
                      value={newCodeCount}
                      onChange={(e) => setNewCodeCount(parseInt(e.target.value) || 1)}
                      className="w-full"
                      min="1"
                      max="50"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-600 mb-1">Expirace (dny)</label>
                    <Input
                      type="number"
                      placeholder="Expirace (dny)"
                      value={newCodeExpires}
                      onChange={(e) => setNewCodeExpires(parseInt(e.target.value) || 30)}
                      className="w-full"
                      min="1"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm text-gray-600 mb-1">Role</label>
                    <select
                      value={newCodeRole}
                      onChange={(e) => setNewCodeRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPERADMIN">SUPERADMIN</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="primary" className="w-full">
                      <Plus className="w-4 h-4" />
                      Generovat
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Seznam kódů</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {codes && codes.length > 0 ? codes.map((code) => (
                    <motion.div
                      key={code.id}
                      className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start sm:items-center space-x-4">
                        <div className="font-mono text-lg font-bold text-gray-900">
                          {code.code}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            code.isUsed 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {code.isUsed ? 'Použit' : 'Dostupný'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            code.role === 'SUPERADMIN' 
                              ? 'bg-purple-100 text-purple-800'
                              : code.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {code.role}
                          </span>
                          {code.expiresAt && (
                            <span className="text-xs text-gray-500">
                              Expiruje: {new Date(code.expiresAt).toLocaleDateString('cs-CZ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                          title={code.isUsed ? "Kopírovat použitý kód" : "Kopírovat kód"}
                        >
                          {copiedCode === code.code ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteCode(code.id, code)}
                          title={code.isUsed ? "Smazat použitý kód" : "Smazat kód"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="px-6 py-8 text-center text-gray-500">
                      Žádné kódy nebyly vygenerovány
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Role Change Modal */}
      <AnimatePresence>
        {showRoleModal && editingUser && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Změnit roli uživatele
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {getDisplayName(editingUser.name, editingUser.lastName)} ({editingUser.email})
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Aktuální role: <span className="font-medium">{editingUser.role}</span>
              </p>
              
              <div className="space-y-3">
                {['USER', 'ADMIN', 'SUPERADMIN'].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleUpdateUserRole(editingUser.id, role)}
                    className={`w-full text-left px-4 py-2 rounded-lg border transition-colors ${
                      editingUser.role === role
                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                    disabled={editingUser.role === role}
                  >
                    <div className="font-medium">{role}</div>
                    <div className="text-xs text-gray-500">
                      {role === 'USER' && 'Běžný uživatel'}
                      {role === 'ADMIN' && 'Administrátor - může spravovat systém'}
                      {role === 'SUPERADMIN' && 'Superadmin - může měnit role a generovat všechny kódy'}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="flex justify-end mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRoleModal(false)
                    setEditingUser(null)
                  }}
                >
                  Zrušit
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}