'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  Key,
  Save,
  Copy,
  Check,
  Plus,
  Trash2,
  Clock
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'

interface UserProfile {
  id: string
  name: string
  email: string
  room: {
    id: string
    name: string
    floor: {
      id: string
      number: number
      name: string
    }
    users: Array<{
      id: string
      name: string
      email: string
    }>
  } | null
  alarmCode: string | null
}

interface InviteCode {
  id: string
  code: string
  expiresAt: string
  createdAt: string
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alarmCode, setAlarmCode] = useState('')
  const [newCodeCount, setNewCodeCount] = useState(1)
  const [newCodeExpires, setNewCodeExpires] = useState(30)
  const [generating, setGenerating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetchProfile()
      fetchInviteCodes()
    }
  }, [session])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      const data = await response.json()
      setProfile(data)
      setAlarmCode(data.alarmCode || '')
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInviteCodes = async () => {
    try {
      const response = await fetch('/api/user/invite-codes')
      const data = await response.json()
      if (data.success) {
        setInviteCodes(data.codes)
      }
    } catch (error) {
      console.error('Error fetching invite codes:', error)
    }
  }

  const saveAlarmCode = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alarmCode })
      })
      const data = await response.json()
      if (data.success) {
        setProfile(prev => prev ? { ...prev, alarmCode } : null)
      }
    } catch (error) {
      console.error('Error saving alarm code:', error)
    } finally {
      setSaving(false)
    }
  }

  const generateInviteCodes = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/user/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          count: newCodeCount, 
          expiresInDays: newCodeExpires 
        })
      })
      const data = await response.json()
      if (data.success) {
        await fetchInviteCodes()
        setNewCodeCount(1)
      }
    } catch (error) {
      console.error('Error generating invite codes:', error)
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(text)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        className="bg-white shadow-sm border-b border-gray-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              className="mr-4 flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zpět</span>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Nastavení
                </h1>
                <p className="text-gray-600">
                  Správa vašeho profilu a nastavení
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* User Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Informace o vašem účtu
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jméno
                </label>
                <p className="text-gray-900">{profile?.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-gray-900">{profile?.email}</p>
              </div>
              {profile?.room && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Místnost
                    </label>
                    <p className="text-gray-900 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {profile.room.name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patro
                    </label>
                    <p className="text-gray-900 flex items-center">
                      <Building2 className="w-4 h-4 mr-1" />
                      {profile.room.floor.name} (patro {profile.room.floor.number})
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Spolubydlící
                    </label>
                    <div className="space-y-1">
                      {profile.room.users.map((user) => (
                        <p key={user.id} className="text-gray-900 flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {user.name} ({user.email})
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Alarm Code */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2" />
              Kód od alarmu
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Zadejte kód od alarmu. Pokud ho budete mít uložený, zobrazí se na tlačítku "Jsem zde" na hlavní stránce.
              </p>
              <div className="flex space-x-3">
                <Input
                  type="text"
                  placeholder="Zadejte kód od alarmu"
                  value={alarmCode}
                  onChange={(e) => setAlarmCode(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={saveAlarmCode}
                  disabled={saving}
                  className="flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Ukládám...' : 'Uložit'}</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Invite Codes */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Key className="w-5 h-5 mr-2" />
              Invite kódy
            </h2>
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                Generujte invite kódy pro nové uživatele. Když se někdo zaregistruje pomocí vašeho kódu, 
                automaticky se přiřadí k vám do místnosti.
              </p>

              {/* Generate New Codes */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Generovat nové kódy</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Počet kódů
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={newCodeCount}
                      onChange={(e) => setNewCodeCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platnost (dny)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={newCodeExpires}
                      onChange={(e) => setNewCodeExpires(parseInt(e.target.value) || 30)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={generateInviteCodes}
                      disabled={generating}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{generating ? 'Generuji...' : 'Generovat'}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing Codes */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Aktivní kódy</h3>
                {inviteCodes.length === 0 ? (
                  <p className="text-gray-500 text-sm">Žádné aktivní kódy</p>
                ) : (
                  <div className="space-y-2">
                    {inviteCodes.map((code) => (
                      <div key={code.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <div className="text-sm text-gray-500">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Platí do: {formatDate(code.expiresAt)}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => copyToClipboard(code.code)}
                          className="flex items-center space-x-1"
                        >
                          {copiedCode === code.code ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span>{copiedCode === code.code ? 'Zkopírováno' : 'Kopírovat'}</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
