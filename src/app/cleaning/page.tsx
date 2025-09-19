'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Camera, 
  Upload, 
  CheckCircle, 
  Clock,
  Users,
  Calendar,
  AlertCircle
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface CleaningData {
  floor: {
    id: string
    number: number
    name: string
  }
  settings: {
    id: string
    frequency: 'weekly' | 'biweekly' | 'monthly'
  } | null
  currentPeriod: string
  currentRoom: {
    id: string
    name: string
    users: Array<{
      id: string
      name: string
      lastName: string | null
      email: string
    }>
  } | null
  rotation: Array<{
    id: string
    name: string
    order: number
    users: Array<{
      id: string
      name: string
      lastName: string | null
      email: string
    }>
  }>
  records: Array<{
    id: string
    photos: string[]
    completedAt: string
    user: {
      name: string
      lastName: string | null
    }
    room: {
      name: string
    }
  }>
}

export default function CleaningPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cleaningData, setCleaningData] = useState<CleaningData | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [cleaningCompleted, setCleaningCompleted] = useState(false)
  const [nextCleaningDate, setNextCleaningDate] = useState<Date | null>(null)
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false)

  const getDisplayName = (name: string, lastName?: string | null) => {
    return lastName ? `${name} ${lastName}` : name
  }

  useEffect(() => {
    if (session) {
      fetchCleaningData()
    }
  }, [session])

  const fetchCleaningData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cleaning')
      const data = await response.json()
      setCleaningData(data)
      
      // Check if cleaning is already completed for current room (any user from the room can complete it)
      if (data.currentRoom && data.records) {
        const roomRecord = data.records.find((record: any) => 
          record.roomId === data.currentRoom.id
        )
        
        if (roomRecord) {
          setIsAlreadyCompleted(true)
          // Calculate next cleaning date
          const nextDate = calculateNextCleaningDate(data.settings?.frequency || 'weekly')
          setNextCleaningDate(nextDate)
        } else {
          setIsAlreadyCompleted(false)
        }
      }
    } catch (error) {
      console.error('Error fetching cleaning data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length + photos.length > 3) {
      alert('Můžete nahrát maximálně 3 fotografie')
      return
    }

    const newPhotos = [...photos, ...files].slice(0, 3)
    setPhotos(newPhotos)

    // Create previews
    const newPreviews = newPhotos.map(file => URL.createObjectURL(file))
    setPreviews(newPreviews)
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    setPreviews(newPreviews)
  }

  const handleCompleteCleaning = async () => {
    if (photos.length !== 3) {
      alert('Musíte nahrát přesně 3 fotografie')
      return
    }

    setUploading(true)
    try {
      // First upload photos
      const formData = new FormData()
      photos.forEach((photo) => {
        formData.append('photos', photo)
      })

      const uploadResponse = await fetch('/api/cleaning/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        alert(`Chyba při nahrávání fotografií: ${error.error}`)
        return
      }

      const uploadResult = await uploadResponse.json()
      const photoUrls = uploadResult.files

      // Then complete cleaning with photo URLs
      const response = await fetch('/api/cleaning/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photos: photoUrls,
          roomId: cleaningData?.currentRoom?.id,
          floorId: cleaningData?.floor.id,
          period: cleaningData?.currentPeriod
        })
      })

      if (response.ok) {
        setPhotos([])
        setPreviews([])
        setCleaningCompleted(true)
        
        // Calculate next cleaning date
        const nextDate = calculateNextCleaningDate(cleaningData?.settings?.frequency || 'weekly')
        setNextCleaningDate(nextDate)
        
        await fetchCleaningData()
      } else {
        const error = await response.json()
        alert(error.error || 'Chyba při dokončování uklidu')
      }
    } catch (error) {
      console.error('Error completing cleaning:', error)
      alert('Chyba při dokončování uklidu')
    } finally {
      setUploading(false)
    }
  }

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'Týdně'
      case 'biweekly': return 'Jednou za 2 týdny'
      case 'monthly': return 'Měsíčně'
      default: return frequency
    }
  }

  const formatPeriod = (period: string, frequency: string) => {
    if (frequency === 'weekly') {
      // Extract week number and year
      const match = period.match(/(\d{4})-W(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const week = parseInt(match[2])
        
        // Use custom week calculation for consistency with admin
        const { weekStart, weekEnd } = getCustomWeekDates(year, week)
        
        return `${weekStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${weekEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`
      }
    } else if (frequency === 'biweekly') {
      const match = period.match(/(\d{4})-BW(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const biweek = parseFloat(match[2])
        
        // Calculate start of biweek (every 2 weeks starting from week 1)
        const weekStart = getCustomWeekDates(year, (biweek - 1) * 2 + 1).weekStart
        const biweekEnd = new Date(weekStart.getTime() + 13 * 24 * 60 * 60 * 1000)
        
        return `${weekStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${biweekEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`
      }
    } else if (frequency === 'monthly') {
      const match = period.match(/(\d{4})-M(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const month = parseFloat(match[2])
        
        if (month === 9.5) {
          // Special case: M09.5 starts from week 38 (15. 9.) and ends on 15. 10.
          const week38Start = getCustomWeekDates(year, 38).weekStart
          const week38End = new Date(week38Start.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days later
          return `${week38Start.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${week38End.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`
        } else {
          const monthStart = new Date(year, month - 1, 1)
          const monthEnd = new Date(year, month, 0)
          return `${monthStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${monthEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`
        }
      }
    }
    
    return period
  }

  // Helper function to get week start date (Monday) for ISO 8601 week
  const getWeekStartDate = (year: number, week: number) => {
    const jan4 = new Date(year, 0, 4) // January 4th is always in week 1
    const jan4Day = jan4.getDay() || 7 // Convert Sunday (0) to 7
    const mondayOfWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 24 * 60 * 60 * 1000)
    return new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000)
  }

  // Helper function to get custom week dates (same as in admin page)
  const getCustomWeekDates = (year: number, week: number) => {
    if (week === 1) {
      const weekStart = new Date(year, 0, 1)
      const weekEnd = new Date(year, 0, 7)
      return { weekStart, weekEnd }
    }
    
    // Find first Monday after January 7th
    let firstMonday = new Date(year, 0, 8)
    const dayOfWeek = firstMonday.getDay()
    if (dayOfWeek !== 1) {
      firstMonday = new Date(firstMonday.getTime() + (8 - dayOfWeek) * 24 * 60 * 60 * 1000)
    }
    
    // Calculate week start (week 2 starts from firstMonday)
    const weekStart = new Date(firstMonday.getTime() + (week - 2) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
    
    // If week ends in next year, extend to last day of current year
    if (weekEnd.getFullYear() > year) {
      const lastDayOfYear = new Date(year, 11, 31)
      return { weekStart, weekEnd: lastDayOfYear }
    }
    
    return { weekStart, weekEnd }
  }

  // Helper function to get future period with custom week calculation
  const getFuturePeriod = (currentPeriod: string, frequency: string, periodsAhead: number) => {
    if (frequency === 'weekly') {
      const match = currentPeriod.match(/(\d{4})-W(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const week = parseInt(match[2])
        const futureWeek = week + periodsAhead
        
        // Handle year overflow
        if (futureWeek > 52) {
          const nextYear = year + 1
          const adjustedWeek = futureWeek - 52
          return `${nextYear}-W${adjustedWeek.toString().padStart(2, '0')}`
        }
        
        return `${year}-W${futureWeek.toString().padStart(2, '0')}`
      }
    } else if (frequency === 'biweekly') {
      const match = currentPeriod.match(/(\d{4})-BW(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const biweek = parseFloat(match[2])
        const futureBiweek = biweek + periodsAhead
        
        if (futureBiweek > 26) {
          const nextYear = year + 1
          const adjustedBiweek = futureBiweek - 26
          return `${nextYear}-BW${adjustedBiweek.toString().padStart(2, '0')}`
        }
        
        return `${year}-BW${futureBiweek.toString().padStart(2, '0')}`
      }
    } else if (frequency === 'monthly') {
      const match = currentPeriod.match(/(\d{4})-M(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const month = parseFloat(match[2])
        const futureMonth = month + periodsAhead
        
        if (futureMonth > 12) {
          const nextYear = year + 1
          const adjustedMonth = futureMonth - 12
          return `${nextYear}-M${adjustedMonth.toString().padStart(2, '0')}`
        }
        
        return `${year}-M${futureMonth.toString().padStart(2, '0')}`
      }
    }
    return currentPeriod
  }

  const calculateNextCleaningDate = (frequency: string): Date => {
    const now = new Date()
    const nextDate = new Date(now)
    
    switch (frequency) {
      case 'weekly':
        // Next Friday
        const daysUntilFriday = (5 - now.getDay() + 7) % 7
        nextDate.setDate(now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday))
        break
      case 'biweekly':
        // Next Friday in 2 weeks
        const daysUntilNextFriday = (5 - now.getDay() + 7) % 7
        nextDate.setDate(now.getDate() + (daysUntilNextFriday === 0 ? 14 : daysUntilNextFriday + 7))
        break
      case 'monthly':
        // Next month, same day
        nextDate.setMonth(now.getMonth() + 1)
        break
      default:
        // Default to next Friday
        const daysUntilDefaultFriday = (5 - now.getDay() + 7) % 7
        nextDate.setDate(now.getDate() + (daysUntilDefaultFriday === 0 ? 7 : daysUntilDefaultFriday))
    }
    
    return nextDate
  }

  const canCompleteCleaning = () => {
    if (!cleaningData?.settings || !cleaningData.currentPeriod) return false
    
    const now = new Date()
    const frequency = cleaningData.settings.frequency
    
    // Use the same logic as in admin page for consistency
    if (frequency === 'weekly') {
      const match = cleaningData.currentPeriod.match(/(\d{4})-W(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const week = parseInt(match[2])
        
        // Calculate start and end of week with custom logic
        const { weekStart, weekEnd } = getCustomWeekDates(year, week)
        const last3Days = new Date(weekEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
        return now >= last3Days && now <= weekEnd
      }
    } else if (frequency === 'biweekly') {
      const match = cleaningData.currentPeriod.match(/(\d{4})-BW(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const biweek = parseFloat(match[2])
        
        // Calculate start of biweek (every 2 weeks starting from week 1)
        const weekStart = getCustomWeekDates(year, (biweek - 1) * 2 + 1).weekStart
        const biweekEnd = new Date(weekStart.getTime() + 13 * 24 * 60 * 60 * 1000)
        const last3Days = new Date(biweekEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
        return now >= last3Days && now <= biweekEnd
      }
    } else if (frequency === 'monthly') {
      const match = cleaningData.currentPeriod.match(/(\d{4})-M(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const month = parseFloat(match[2])
        
        if (month === 9.5) {
          // Special case: M09.5 starts from week 38 (15. 9.) and ends on 15. 10.
          const week38Start = getCustomWeekDates(year, 38).weekStart
          const week38End = new Date(week38Start.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days later
          const last3Days = new Date(week38End.getTime() - 3 * 24 * 60 * 60 * 1000)
          return now >= last3Days && now <= week38End
        } else {
          const monthStart = new Date(year, month - 1, 1)
          const monthEnd = new Date(year, month, 0)
          const last3Days = new Date(monthEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
          return now >= last3Days && now <= monthEnd
        }
      }
    }
    
    return false
  }

  // Helper function to get biweek start date
  const getBiweekStartDate = (period: string) => {
    const match = period.match(/(\d{4})-BW(\d{2})/)
    if (match) {
      const year = parseInt(match[1])
      const biweek = parseInt(match[2])
      const weekStart = getWeekStartDate(year, (biweek - 1) * 2 + 1)
      return weekStart
    }
    return new Date()
  }

  // Helper function to get month start date
  const getMonthStartDate = (period: string) => {
    const match = period.match(/(\d{4})-M(\d{2})/)
    if (match) {
      const year = parseInt(match[1])
      const month = parseInt(match[2])
      return new Date(year, month - 1, 1)
    }
    return new Date()
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
    router.push('/auth/signin')
    return null
  }

  if (loading) {
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
          <p className="text-gray-600">Načítání uklid dat...</p>
        </motion.div>
      </div>
    )
  }

  if (!cleaningData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Chyba při načítání
          </h2>
          <p className="text-gray-600">
            Nepodařilo se načíst data o uklidu
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center">
            <motion.div
              className="mx-auto w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Uklid
            </h1>
            <p className="text-gray-600">
              Patro {cleaningData.floor.number} - {cleaningData.floor.name}
            </p>
          </div>

          {/* Completed Cleaning View */}
          {(cleaningCompleted || isAlreadyCompleted) && nextCleaningDate && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-8 text-center">
                <motion.div
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {cleaningCompleted ? 'Uklid byl úspěšně dokončen!' : 'Uklid je již dokončen'}
                </h2>
                
                <p className="text-gray-600 mb-6">
                  {cleaningCompleted 
                    ? 'Děkujeme za provedení uklidu. Fotografie byly uloženy a uklid je zaznamenán v systému.'
                    : 'Uklid pro toto období byl již dokončen. Fotografie jsou uloženy v systému.'
                  }
                </p>
                
                <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center justify-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Další uklid
                  </h3>
                  <p className="text-blue-700">
                    {nextCleaningDate.toLocaleDateString('cs-CZ', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Frekvence: {getFrequencyText(cleaningData?.settings?.frequency || 'weekly')}
                  </p>
                </div>
                
                <Button
                  onClick={() => {
                    setCleaningCompleted(false)
                    setIsAlreadyCompleted(false)
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Zobrazit detaily
                </Button>
              </Card>
            </motion.div>
          )}

          {/* No Cleaning This Week View - for users not responsible for cleaning this period */}
          {!cleaningCompleted && !isAlreadyCompleted && (!cleaningData.currentRoom || !cleaningData.currentRoom.users.some((u: any) => u.id === session?.user?.id)) && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-8 text-center">
                <motion.div
                  className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Clock className="w-8 h-8 text-gray-600" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Nemáte tento týden úklid
                </h2>
                
                <p className="text-gray-600 mb-6">
                  Tento týden nemáte přiřazen úklid. Místnosti se střídají podle rotace.
                </p>
                
                <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center justify-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Aktuální období
                  </h3>
                  <p className="text-blue-700">
                    {formatPeriod(cleaningData.currentPeriod, cleaningData.settings?.frequency || 'weekly')}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Frekvence: {getFrequencyText(cleaningData?.settings?.frequency || 'weekly')}
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Show who is responsible this week - for all users */}
          {!cleaningCompleted && !isAlreadyCompleted && cleaningData.rotation.length > 0 && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Kdo je tento týden zodpovědný za úklid
                </h2>
                <div className="space-y-2">
                  {cleaningData.rotation.map((room, index) => (
                    <div
                      key={room.id}
                      className={`p-3 rounded-lg ${
                        room.id === cleaningData.currentRoom?.id
                          ? 'bg-blue-100 border-2 border-blue-300'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{room.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({room.users.map(u => getDisplayName(u.name, u.lastName)).join(', ')})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            #{index + 1}
                          </span>
                          {room.id === cleaningData.currentRoom?.id && (
                            <span className="text-blue-600 text-sm font-medium">
                              ← Aktuálně zodpovědná
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Show when current user will be responsible */}
              {(() => {
                const currentUserRoomIndex = cleaningData.rotation.findIndex((room: any) => 
                  room.users.some((u: any) => u.id === session?.user?.id)
                )
                
                if (currentUserRoomIndex === -1) return null
                
                const currentRoomIndex = cleaningData.rotation.findIndex((room: any) => 
                  room.id === cleaningData.currentRoom?.id
                )
                
                if (currentRoomIndex === -1) return null
                
                const periodsUntilUserTurn = (currentUserRoomIndex - currentRoomIndex + cleaningData.rotation.length) % cleaningData.rotation.length
                
                return (
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Kdy budete mít na starosti úklid
                    </h2>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-900">
                          {cleaningData.rotation[currentUserRoomIndex].name}
                        </span>
                        <span className="text-sm text-green-600">
                          #{currentUserRoomIndex + 1} v rotaci
                        </span>
                      </div>
                      <p className="text-sm text-green-700">
                        Zodpovědní: {cleaningData.rotation[currentUserRoomIndex].users.map(u => getDisplayName(u.name, u.lastName)).join(', ')}
                      </p>
                      {periodsUntilUserTurn === 0 ? (
                        <p className="text-sm text-green-600 mt-2 font-medium">
                          ✓ Máte úklid právě teď!
                        </p>
                      ) : (
                        <div className="mt-2">
                          <p className="text-sm text-green-600">
                            Budete mít úklid za {periodsUntilUserTurn} {periodsUntilUserTurn === 1 ? 'období' : 'období'}
                          </p>
                          <p className="text-xs text-green-500 mt-1">
                            Období: {formatPeriod(
                              getFuturePeriod(cleaningData.currentPeriod, cleaningData.settings?.frequency || 'weekly', periodsUntilUserTurn),
                              cleaningData.settings?.frequency || 'weekly'
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })()}
            </motion.div>
          )}

          {/* Regular Cleaning View - only for users responsible for cleaning this period */}
          {!cleaningCompleted && !isAlreadyCompleted && cleaningData.currentRoom && cleaningData.currentRoom.users.some((u: any) => u.id === session?.user?.id) && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >


          {/* Photo Upload - only for users responsible for cleaning this period */}
          {canCompleteCleaning() && cleaningData.currentRoom && cleaningData.currentRoom.users.some((u: any) => u.id === session?.user?.id) && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Camera className="w-5 h-5 mr-2" />
                Nahrajte fotografie uklizených prostor
              </h2>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                    disabled={photos.length >= 3}
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Klikněte pro nahrání fotografií ({photos.length}/3)
                    </span>
                  </label>
                </div>

                {/* Photo Previews */}
                {previews.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {previews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleCompleteCleaning}
                  disabled={photos.length !== 3 || uploading}
                  loading={uploading}
                  variant="success"
                  className="w-full"
                >
                  <CheckCircle className="w-5 h-5" />
                  Dokončit uklid
                </Button>
              </div>
            </Card>
          )}


          {/* Recent Records */}
          {cleaningData.records.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Nedávné uklidy
              </h2>
              <div className="space-y-3">
                {cleaningData.records.slice(0, 5).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{record.room.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        - {getDisplayName(record.user.name, record.user.lastName)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(record.completedAt).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
