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
  Send
} from 'lucide-react'
import { Floor, Room, User } from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import PhotoGallery from '@/components/ui/PhotoGallery'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'floors' | 'rooms' | 'users' | 'codes' | 'activity' | 'cleaning'>('floors')

  const getDisplayName = (name: string, lastName?: string | null) => {
    return lastName ? `${name} ${lastName}` : name
  }

  // Floor management
  const [newFloor, setNewFloor] = useState({ number: '', name: '' })
  const [newRoom, setNewRoom] = useState({ name: '', floorId: '' })
  
  // Room editing
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [editRoom, setEditRoom] = useState({ name: '', floorId: '' })
  const [showEditForm, setShowEditForm] = useState(false)
  
  // Floor editing
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
  const [editFloor, setEditFloor] = useState({ number: '', name: '' })
  const [showEditFloorForm, setShowEditFloorForm] = useState(false)
  
  // Code management
  const [codes, setCodes] = useState<any[]>([])
  const [newCodeCount, setNewCodeCount] = useState(1)
  const [newCodeExpires, setNewCodeExpires] = useState(30)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  
  // Activity management
  const [workSessions, setWorkSessions] = useState<any[]>([])
  
  // Cleaning management
  const [cleaningData, setCleaningData] = useState<any[]>([])
  const [allCleaningRecords, setAllCleaningRecords] = useState<any[]>([])
  
  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchData()
    }
  }, [session])

  // Auto-refresh activity and users every 60s when on Activity tab
  useEffect(() => {
    if (activeTab !== 'activity') return
    const intervalId = setInterval(async () => {
      try {
        const [activityRes, usersRes] = await Promise.all([
          fetch('/api/admin/activity'),
          fetch('/api/admin/users')
        ])
        const activityData = await activityRes.json()
        const usersData = await usersRes.json()
        setWorkSessions(Array.isArray(activityData) ? activityData : [])
        setUsers(Array.isArray(usersData) ? usersData : [])
      } catch (e) {
        console.error('Auto-refresh failed:', e)
      }
    }, 60000)
    return () => clearInterval(intervalId)
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [floorsRes, roomsRes, usersRes, codesRes, activityRes, cleaningRes] = await Promise.all([
        fetch('/api/admin/floors'),
        fetch('/api/admin/rooms'),
        fetch('/api/admin/users'),
        fetch('/api/admin/codes'),
        fetch('/api/admin/activity'),
        fetch('/api/admin/cleaning')
      ])

      const floorsData = await floorsRes.json()
      const roomsData = await roomsRes.json()
      const usersData = await usersRes.json()
      const codesData = await codesRes.json()
      const activityData = await activityRes.json()
      const cleaningData = await cleaningRes.json()

      setFloors(Array.isArray(floorsData) ? floorsData : [])
      setRooms(Array.isArray(roomsData) ? roomsData : [])
      setUsers(Array.isArray(usersData) ? usersData : [])
      setCodes(Array.isArray(codesData) ? codesData : [])
      setWorkSessions(Array.isArray(activityData) ? activityData : [])
      setCleaningData(Array.isArray(cleaningData) ? cleaningData : [])
      
      // Debug log to see what's being loaded
      console.log('Cleaning data loaded:', cleaningData)
      
      // Generate all possible cleaning records from the past
      const allRecords = floorsData.flatMap((floor: any) => {
        if (!floor.cleaningRotations || floor.cleaningRotations.length === 0) return []
        
        const records = []
        const currentPeriod = getCurrentPeriod(floor.cleaningSettings?.frequency || 'weekly')
        const currentRoomIndex = getCurrentRoomIndex(floor.cleaningRotations, currentPeriod)
        
        // Generate records for the last 12 periods (3 months for weekly)
        for (let i = 0; i < 12; i++) {
          const periodNumber = parseInt(currentPeriod.split('-W')[1] || currentPeriod.split('-BW')[1] || currentPeriod.split('-M')[1]) - i
          if (periodNumber <= 0) break
          
          const period = currentPeriod.replace(/\d{2}$/, periodNumber.toString().padStart(2, '0'))
          const roomIndex = (currentRoomIndex - i + floor.cleaningRotations.length) % floor.cleaningRotations.length
          const room = floor.cleaningRotations[roomIndex]
          
          if (room) {
            // Check if there's a completed record for this period
            const completedRecord = floor.cleaningRecords?.find((record: any) => 
              record.period === period && record.roomId === room.room.id
            )
            
            records.push({
              id: `generated-${floor.id}-${period}-${room.room.id}`,
              period,
              roomId: room.room.id,
              floorId: floor.id,
              room: {
                name: room.room.name,
                users: room.room.users
              },
              floor: { 
                name: floor.name, 
                number: floor.number,
                settings: floor.cleaningSettings
              },
              user: completedRecord?.user || null,
              completedAt: completedRecord?.completedAt || null,
              photos: completedRecord ? JSON.parse(completedRecord.photos || '[]') : [],
              isCompleted: !!completedRecord,
              isGenerated: true
            })
          }
        }
        
        return records
      })
      setAllCleaningRecords(allRecords)
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

  // Helper: detect un-checked-out sessions after 23:30 of that day
  const isLateUncheckout = (session: any) => {
    if (session?.checkOut) return false
    if (!session?.date || !session?.checkIn?.timestamp) return false
    try {
      const cutoff = new Date(session.date + 'T23:30:00')
      const now = new Date()
      // If the day has passed or time is after 23:30 local
      return now.getTime() >= cutoff.getTime()
    } catch {
      return false
    }
  }

  // Compute penalty counts per user (number of late uncheckouts)
  const penaltyCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of workSessions) {
      if (isLateUncheckout(s)) {
        const id = s.user?.id
        if (id) counts[id] = (counts[id] || 0) + 1
      }
    }
    return counts
  }, [workSessions])

  const formatPeriod = (period: string, frequency: string) => {
    // Normalize the frequency parameter
    const normalizedFrequency = frequency?.trim()?.toLowerCase()
    
    if (normalizedFrequency === 'weekly') {
      // Extract week number and year
      const match = period.match(/(\d{4})-W(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const week = parseInt(match[2])
        
        // Calculate start and end of week with custom logic
        const { weekStart, weekEnd } = getCustomWeekDates(year, week)
        
        return `${weekStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${weekEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`
      }
    } else if (normalizedFrequency === 'biweekly') {
      const match = period.match(/(\d{4})-BW(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const biweek = parseFloat(match[2])
        
        // Calculate start of biweek (every 2 weeks starting from week 1)
        // For BW19.5, start from week 39 (not week 40)
        const weekStart = getWeekStartDate(year, (biweek - 1) * 2 + 1)
        const biweekEnd = new Date(weekStart.getTime() + 13 * 24 * 60 * 60 * 1000)
        
        return `${weekStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${biweekEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`
      }
    } else if (normalizedFrequency === 'monthly') {
      const match = period.match(/(\d{4})-M(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const month = parseFloat(match[2])
        
        if (month === 9.5) {
          // Special case: M09.5 starts from week 38 (15. 9.) and ends on 15. 10.
          const week38Start = getWeekStartDate(year, 38)
          const week38End = new Date(week38Start.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days later
          
          return `${week38Start.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${week38End.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`
        } else {
          const monthStart = new Date(year, month - 1, 1)
          const monthEnd = new Date(year, month, 0)
          
          return `${monthStart.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })}. - ${monthEnd.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}.`
        }
      }
    }
    
    // If no match found, return the original period
    return period
  }

  // Helper function to get week start date (Monday) for ISO 8601 week
  const getWeekStartDate = (year: number, week: number) => {
    const jan4 = new Date(year, 0, 4) // January 4th is always in week 1
    const jan4Day = jan4.getDay() || 7 // Convert Sunday (0) to 7
    const mondayOfWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 24 * 60 * 60 * 1000)
    return new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000)
  }

  // Custom week calculation: týden končí v neděli, pokud rok končí dříve než v neděli, 
  // tak se týden protáhne do posledního dne roku, a od 1.1. pak začíná od 1.1. do 7.1.
  const getCustomWeekDates = (year: number, week: number) => {
    if (week === 1) {
      // První týden: 1.1. do 7.1.
      const weekStart = new Date(year, 0, 1) // 1. ledna
      const weekEnd = new Date(year, 0, 7) // 7. ledna
      return { weekStart, weekEnd }
    }

    // Pro ostatní týdny: začátek v pondělí, konec v neděli
    // Najdi první pondělí roku (8.1. nebo později)
    let firstMonday = new Date(year, 0, 8) // 8. ledna
    const dayOfWeek = firstMonday.getDay()
    if (dayOfWeek !== 1) { // Pokud není pondělí
      firstMonday = new Date(firstMonday.getTime() + (8 - dayOfWeek) * 24 * 60 * 60 * 1000)
    }
    
    // Vypočítej začátek týdne (week - 2 protože týden 1 je 1.1.-7.1.)
    const weekStart = new Date(firstMonday.getTime() + (week - 2) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000) // +6 dní = neděle

    // Pokud je konec týdne v dalším roce, použij poslední den roku
    if (weekEnd.getFullYear() > year) {
      const lastDayOfYear = new Date(year, 11, 31) // 31. prosince
      return { weekStart, weekEnd: lastDayOfYear }
    }

    return { weekStart, weekEnd }
  }

  // Helper function to get frequency text
  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'týdně'
      case 'biweekly': return 'dvoutýdně'
      case 'monthly': return 'měsíčně'
      default: return frequency || 'neznámá'
    }
  }

  // Helper function to get next period for room rotation
  const getNextPeriodForRoom = (currentPeriod: string, frequency: string, periodsAhead: number) => {
    if (frequency === 'weekly') {
      const match = currentPeriod.match(/(\d{4})-W(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const week = parseInt(match[2])
        const nextWeek = week + periodsAhead
        if (nextWeek > 52) {
          return `${year + 1}-W${(nextWeek - 52).toString().padStart(2, '0')}`
        }
        return `${year}-W${nextWeek.toString().padStart(2, '0')}`
      }
    } else if (frequency === 'biweekly') {
      const match = currentPeriod.match(/(\d{4})-BW(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const biweek = parseFloat(match[2])
        const nextBiweek = biweek + periodsAhead
        if (nextBiweek > 26) {
          return `${year + 1}-BW${(nextBiweek - 26).toString().padStart(2, '0')}`
        }
        return `${year}-BW${nextBiweek.toString().padStart(2, '0')}`
      }
    } else if (frequency === 'monthly') {
      const match = currentPeriod.match(/(\d{4})-M(\d{2}(?:\.5)?)/)
      if (match) {
        const year = parseInt(match[1])
        const month = parseFloat(match[2])
        const nextMonth = month + periodsAhead
        if (nextMonth > 12) {
          return `${year + 1}-M${(nextMonth - 12).toString().padStart(2, '0')}`
        }
        return `${year}-M${nextMonth.toString().padStart(2, '0')}`
      }
    }
    return currentPeriod
  }

  // Určí index aktuálně zodpovědné místnosti v rotaci na základě období
  const getCurrentRoomIndex = (rotations: any[], period: string) => {
    if (!Array.isArray(rotations) || rotations.length === 0) return 0

    let periodNumber = 1
    if (period.includes('-W')) {
      const part = period.split('-W')[1]
      periodNumber = parseInt(part || '1', 10) || 1
    } else if (period.includes('-BW')) {
      const part = period.split('-BW')[1]
      periodNumber = parseInt(part || '1', 10) || 1
    } else if (period.includes('-M')) {
      const part = period.split('-M')[1]
      periodNumber = parseInt(part || '1', 10) || 1
    }

    const idx = (periodNumber - 1) % rotations.length
    return idx < 0 ? 0 : idx
  }

  // Helper function to check if floor completed cleaning in last 3 days of current period
  const checkIfFloorCompletedInLast3Days = (floorId: string, cleaningRecords: any[], currentPeriod: string, frequency: string) => {
    const now = new Date()
    
    // Get the last 3 days of current period
    let last3DaysStart: Date
    let periodEnd: Date
    
    if (frequency === 'weekly') {
      const match = currentPeriod.match(/(\d{4})-W(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const week = parseInt(match[2])
        const weekStart = getWeekStartDate(year, week)
        periodEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
        last3DaysStart = new Date(periodEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
      } else {
        return false
      }
    } else if (frequency === 'biweekly') {
      const match = currentPeriod.match(/(\d{4})-BW(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const biweek = parseInt(match[2])
        const weekStart = getWeekStartDate(year, (biweek - 1) * 2 + 1)
        periodEnd = new Date(weekStart.getTime() + 13 * 24 * 60 * 60 * 1000)
        last3DaysStart = new Date(periodEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
      } else {
        return false
      }
    } else if (frequency === 'monthly') {
      const match = currentPeriod.match(/(\d{4})-M(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const month = parseInt(match[2])
        const monthStart = new Date(year, month - 1, 1)
        periodEnd = new Date(year, month, 0)
        last3DaysStart = new Date(periodEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
      } else {
        return false
      }
    } else {
      return false
    }
    
    // Check if there's a cleaning record for this floor in the last 3 days
    return cleaningRecords.some((record: any) => {
      if (record.floorId !== floorId) return false
      
      const recordDate = new Date(record.completedAt)
      return recordDate >= last3DaysStart && recordDate <= periodEnd
    })
  }

  // Helper function to check if room completed cleaning in last 3 days of current period
  const checkIfRoomCompletedInLast3Days = (roomId: string, cleaningRecords: any[], currentPeriod: string, frequency: string) => {
    const now = new Date()
    
    // Get the last 3 days of current period
    let last3DaysStart: Date
    let periodEnd: Date
    
    if (frequency === 'weekly') {
      const match = currentPeriod.match(/(\d{4})-W(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const week = parseInt(match[2])
        const weekStart = getWeekStartDate(year, week)
        periodEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
        last3DaysStart = new Date(periodEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
      } else {
        return false
      }
    } else if (frequency === 'biweekly') {
      const match = currentPeriod.match(/(\d{4})-BW(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const biweek = parseInt(match[2])
        const weekStart = getWeekStartDate(year, (biweek - 1) * 2 + 1)
        periodEnd = new Date(weekStart.getTime() + 13 * 24 * 60 * 60 * 1000)
        last3DaysStart = new Date(periodEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
      } else {
        return false
      }
    } else if (frequency === 'monthly') {
      const match = currentPeriod.match(/(\d{4})-M(\d{2})/)
      if (match) {
        const year = parseInt(match[1])
        const month = parseInt(match[2])
        const monthStart = new Date(year, month - 1, 1)
        periodEnd = new Date(year, month, 0)
        last3DaysStart = new Date(periodEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
      } else {
        return false
      }
    } else {
      return false
    }
    
    // Check if there's a cleaning record for this room in the last 3 days
    return cleaningRecords.some((record: any) => {
      if (record.roomId !== roomId) return false
      
      const recordDate = new Date(record.completedAt)
      return recordDate >= last3DaysStart && recordDate <= periodEnd
    })
  }


  const handleCreateFloor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFloor.number || !newFloor.name) return

    try {
      const response = await fetch('/api/admin/floors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: parseInt(newFloor.number),
          name: newFloor.name
        })
      })

      if (response.ok) {
        setNewFloor({ number: '', name: '' })
        fetchData()
      }
    } catch (error) {
      console.error('Error creating floor:', error)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoom.name || !newRoom.floorId) return

    try {
      const response = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom)
      })

      if (response.ok) {
        setNewRoom({ name: '', floorId: '' })
        fetchData()
      }
    } catch (error) {
      console.error('Error creating room:', error)
    }
  }

  const handleAssignUser = async (userId: string, roomId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomId })
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error assigning user:', error)
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

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setEditRoom({ name: room.name, floorId: room.floorId })
    setShowEditForm(true)
  }

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRoom || !editRoom.name || !editRoom.floorId) return

    try {
      const response = await fetch('/api/admin/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRoom.id,
          name: editRoom.name,
          floorId: editRoom.floorId
        })
      })

      if (response.ok) {
        setShowEditForm(false)
        setEditingRoom(null)
        setEditRoom({ name: '', floorId: '' })
        fetchData()
      }
    } catch (error) {
      console.error('Error updating room:', error)
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Opravdu chcete smazat tuto místnost?')) return

    try {
      const response = await fetch(`/api/admin/rooms?id=${roomId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchData()
      } else {
        const data = await response.json()
        alert(data.error || 'Chyba při mazání místnosti')
      }
    } catch (error) {
      console.error('Error deleting room:', error)
    }
  }

  const cancelEdit = () => {
    setShowEditForm(false)
    setEditingRoom(null)
    setEditRoom({ name: '', floorId: '' })
  }

  const handleEditFloor = (floor: Floor) => {
    setEditingFloor(floor)
    setEditFloor({ number: floor.number.toString(), name: floor.name })
    setShowEditFloorForm(true)
  }

  const handleUpdateFloor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFloor || !editFloor.number || !editFloor.name) return

    try {
      const response = await fetch('/api/admin/floors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingFloor.id,
          number: parseInt(editFloor.number),
          name: editFloor.name
        })
      })

      if (response.ok) {
        setShowEditFloorForm(false)
        setEditingFloor(null)
        setEditFloor({ number: '', name: '' })
        fetchData()
      }
    } catch (error) {
      console.error('Error updating floor:', error)
    }
  }

  const handleDeleteFloor = async (floorId: string) => {
    if (!confirm('Opravdu chcete smazat toto patro?')) return

    try {
      const response = await fetch(`/api/admin/floors?id=${floorId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchData()
      } else {
        const data = await response.json()
        alert(data.error || 'Chyba při mazání patra')
      }
    } catch (error) {
      console.error('Error deleting floor:', error)
    }
  }

  const cancelFloorEdit = () => {
    setShowEditFloorForm(false)
    setEditingFloor(null)
    setEditFloor({ number: '', name: '' })
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
          expiresInDays: newCodeExpires
        })
      })

      if (response.ok) {
        setNewCodeCount(1)
        setNewCodeExpires(30)
        fetchData()
      }
    } catch (error) {
      console.error('Error generating codes:', error)
    }
  }

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Opravdu chcete smazat tento kód?')) return

    try {
      const response = await fetch(`/api/admin/codes?id=${codeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error deleting code:', error)
    }
  }

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
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

  if (session.user.role !== 'ADMIN') {
    router.push('/')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-gray-600">Přesměrování na hlavní stránku...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <motion.header
        className="bg-white shadow-sm border-b border-gray-200"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="secondary"
                onClick={() => router.push('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Zpět</span>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Administrace
                  </h1>
                  <p className="text-gray-600 hidden sm:block">
                    Správa pater, místností a uživatelů
                  </p>
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
                <Menu className="w-6 h-6" />
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Tabs */}
          <motion.div
            className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { id: 'floors', name: 'Patra', icon: Building2, shortName: 'Patra' },
                { id: 'rooms', name: 'Místnosti', icon: MapPin, shortName: 'Místnosti' },
                { id: 'users', name: 'Uživatelé', icon: Users, shortName: 'Uživatelé' },
                { id: 'codes', name: 'Kódy', icon: Key, shortName: 'Kódy' },
                { id: 'activity', name: 'Aktivita', icon: Activity, shortName: 'Aktivita' },
                { id: 'cleaning', name: 'Uklid', icon: Sparkles, shortName: 'Uklid' },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-xl font-medium transition-all text-xs sm:text-sm ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    <span className="text-center leading-tight">{tab.name}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* Floors Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'floors' && (
              <motion.div
                key="floors"
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat nové patro
                  </h3>
                  <form onSubmit={handleCreateFloor} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input
                      type="number"
                      placeholder="Číslo patra"
                      value={newFloor.number}
                      onChange={(e) => setNewFloor({ ...newFloor, number: e.target.value })}
                      className="w-full"
                    />
                    <Input
                      type="text"
                      placeholder="Název patra"
                      value={newFloor.name}
                      onChange={(e) => setNewFloor({ ...newFloor, name: e.target.value })}
                      className="w-full"
                    />
                    <Button type="submit" variant="primary" className="w-full sm:col-span-2 lg:col-span-1">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Přidat</span>
                      <span className="sm:hidden">+</span>
                    </Button>
                  </form>
                </Card>

                {/* Edit Floor Form */}
                <AnimatePresence>
                  {showEditFloorForm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Edit3 className="w-5 h-5 mr-2" />
                          Upravit patro
                        </h3>
                        <form onSubmit={handleUpdateFloor} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Input
                            type="number"
                            placeholder="Číslo patra"
                            value={editFloor.number}
                            onChange={(e) => setEditFloor({ ...editFloor, number: e.target.value })}
                            className="w-full"
                          />
                          <Input
                            type="text"
                            placeholder="Název patra"
                            value={editFloor.name}
                            onChange={(e) => setEditFloor({ ...editFloor, name: e.target.value })}
                            className="w-full"
                          />
                          <Button type="submit" variant="success" className="w-full">
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">Uložit</span>
                            <span className="sm:hidden">✓</span>
                          </Button>
                          <Button type="button" variant="secondary" onClick={cancelFloorEdit} className="w-full">
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">Zrušit</span>
                            <span className="sm:hidden">✕</span>
                          </Button>
                        </form>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Card>
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Seznam pater</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {floors.map((floor) => (
                      <motion.div
                        key={floor.id}
                        className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            Patro {floor.number}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {floor.rooms.length} místností
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditFloor(floor)}
                            className="flex-1 sm:flex-none"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span className="sm:hidden ml-2">Upravit</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteFloor(floor.id)}
                            disabled={floor.rooms.length > 0}
                            className="flex-1 sm:flex-none"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sm:hidden ml-2">Smazat</span>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rooms Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'rooms' && (
              <motion.div
                key="rooms"
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat novou místnost
                  </h3>
                  <form onSubmit={handleCreateRoom} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input
                      type="text"
                      placeholder="Název místnosti"
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                      className="w-full"
                    />
                    <select
                      value={newRoom.floorId}
                      onChange={(e) => setNewRoom({ ...newRoom, floorId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Vyberte patro</option>
                      {floors.map((floor) => (
                        <option key={floor.id} value={floor.id}>
                          Patro {floor.number}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="primary" className="w-full sm:col-span-2 lg:col-span-1">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Přidat</span>
                      <span className="sm:hidden">+</span>
                    </Button>
                  </form>
                </Card>

                {/* Edit Room Form */}
                <AnimatePresence>
                  {showEditForm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Edit3 className="w-5 h-5 mr-2" />
                          Upravit místnost
                        </h3>
                        <form onSubmit={handleUpdateRoom} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Input
                            type="text"
                            placeholder="Název místnosti"
                            value={editRoom.name}
                            onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })}
                            className="w-full"
                          />
                          <select
                            value={editRoom.floorId}
                            onChange={(e) => setEditRoom({ ...editRoom, floorId: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Vyberte patro</option>
                            {floors.map((floor) => (
                              <option key={floor.id} value={floor.id}>
                                Patro {floor.number}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="success" className="w-full">
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">Uložit</span>
                            <span className="sm:hidden">✓</span>
                          </Button>
                          <Button type="button" variant="secondary" onClick={cancelEdit} className="w-full">
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">Zrušit</span>
                            <span className="sm:hidden">✕</span>
                          </Button>
                        </form>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Card>
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Seznam místností</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {rooms.map((room) => (
                      <motion.div
                        key={room.id}
                        className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {room.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Patro {room.floor?.number} • {room.users.length} uživatelů
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditRoom(room)}
                            className="flex-1 sm:flex-none"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span className="sm:hidden ml-2">Upravit</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteRoom(room.id)}
                            disabled={room.users.length > 0}
                            className="flex-1 sm:flex-none"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sm:hidden ml-2">Smazat</span>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

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
                            <h4 className="text-sm font-semibold text-gray-900">
                              {getDisplayName(user.name, user.lastName)}
                              {((user.penaltyCount ?? penaltyCounts[user.id] ?? 0) > 0) && (
                                <span className="ml-2 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                  Trestné body: {user.penaltyCount ?? penaltyCounts[user.id]}
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {user.email} • {user.role}
                            </p>
                            <p className="text-sm text-gray-500">
                              {user.room ? `${user.room.name} (Patro ${user.room.floor?.number})` : 'Nepřiřazeno'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <select
                              value={user.roomId || ''}
                              onChange={(e) => handleAssignUser(user.id, e.target.value)}
                              className="w-full lg:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Nepřiřazeno</option>
                              {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                  {room.name} (Patro {room.floor?.number})
                                </option>
                              ))}
                            </select>
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
                  <form onSubmit={handleGenerateCodes} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            disabled={code.isUsed}
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
                            onClick={() => handleDeleteCode(code.id)}
                            disabled={code.isUsed}
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

          {/* Activity Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      Docházka - Pracovní dny
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Přehled jednotlivých pracovních dnů všech uživatelů
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {workSessions.length > 0 ? workSessions.map((session: any) => (
                      <motion.div
                        key={session.id}
                        className="px-6 py-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex flex-row flex-wrap items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">
                                  {new Date(session.date).toLocaleDateString('cs-CZ', { 
                                    weekday: 'short', 
                                    day: 'numeric', 
                                    month: 'short' 
                                  })}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(session.checkIn.timestamp).toLocaleTimeString('cs-CZ', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">
                                  {getDisplayName(session.user.name, session.user.lastName)}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  {session.user.room?.name || 'Nepřiřazeno'} 
                                  {session.user.room?.floor && ` • Patro ${session.user.room.floor.number}`}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2">
                            <div className="text-left sm:text-right">
                              {session.checkIn && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="text-sm text-gray-600">
                                    Příchod: {new Date(session.checkIn.timestamp).toLocaleTimeString('cs-CZ', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              )}
                              
                              {session.checkOut ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-sm text-gray-600">
                                    Odchod: {new Date(session.checkOut.timestamp).toLocaleTimeString('cs-CZ', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              ) : isLateUncheckout(session) ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-red-600" />
                                  <span className="text-sm font-semibold text-red-700">
                                    Neodhlášený
                                  </span>
                                </div>
                              ) : session.isCurrentlyIn ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  <span className="text-sm font-medium text-blue-700">
                                    Stále v budově
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                                  <span className="text-sm text-gray-500">
                                    Pouze příchod
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center sm:justify-end space-x-2">
                              {isLateUncheckout(session) ? (
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  Neodhlášený
                                </span>
                              ) : (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  session.isComplete 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {session.isComplete 
                                    ? 'Odešel' 
                                    : 'Stále v budově'
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="px-6 py-8 text-center text-gray-500">
                        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Žádná aktivita nebyla zaznamenána</p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cleaning Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'cleaning' && (
              <motion.div
                key="cleaning"
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Uklid - Přehled pater
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Nastavení a přehled uklidu pro všechna patra
                    </p>
                  </div>
                  

                  {/* Cleaning Status Summary */}
                  <div className="p-6 border-b border-gray-200 bg-blue-50">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">
                      Souhrn uklidů pro aktuální období
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {cleaningData.map((floor: any) => {
                        // Check if the current responsible room has completed cleaning
                        const isCurrentRoomCleaned = floor.currentRoom ? (
                          floor.cleaningRecords.some((record: any) => 
                            record.roomId === floor.currentRoom.id && 
                            record.period === floor.currentPeriod
                          ) || checkIfRoomCompletedInLast3Days(floor.currentRoom.id, floor.cleaningRecords, floor.currentPeriod, floor.settings?.frequency || 'weekly')
                        ) : false
                        
                        const isFullyCleaned = isCurrentRoomCleaned
                        
                        return (
                          <div 
                            key={floor.id} 
                            className={`p-4 rounded-lg border-2 ${
                              isFullyCleaned 
                                ? 'bg-green-50 border-green-300' 
                                : 'bg-red-50 border-red-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">
                                Patro {floor.number}
                              </h5>
                              {isFullyCleaned ? (
                                <span className="text-green-600 text-lg">✓</span>
                              ) : (
                                <span className="text-red-600 text-lg">✗</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {floor.name}
                            </p>
                            <p className={`text-xs font-medium ${
                              isFullyCleaned ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {isFullyCleaned ? 'Uklizeno' : 'Neuklizeno'}
                            </p>
                            {floor.currentRoom && (
                              <p className="text-xs text-gray-500 mt-1">
                                Zodpovědná: {floor.currentRoom.name}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {cleaningData.length > 0 ? cleaningData.map((floor: any) => (
                      <motion.div
                        key={floor.id}
                        className="px-6 py-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">
                              Patro {floor.number} - {floor.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-4 mt-2">
                              <span className="text-sm text-gray-600">
                                Frekvence: {floor.settings ? 
                                  floor.settings.frequency === 'weekly' ? 'Týdně' :
                                  floor.settings.frequency === 'biweekly' ? 'Jednou za 2 týdny' :
                                  floor.settings.frequency === 'monthly' ? 'Měsíčně' : floor.settings.frequency
                                  : 'Nenastaveno'
                                }
                              </span>
                              <span className="text-sm text-gray-500">
                                Období: {formatPeriod(floor.currentPeriod, floor.settings?.frequency || 'weekly')}
                              </span>
                            </div>
                            
                            {floor.currentRoom && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-900">
                                  Aktuálně zodpovědná: {floor.currentRoom.name}
                                </p>
                                <p className="text-xs text-blue-700">
                                  {floor.currentRoom.users.map((u: any) => getDisplayName(u.name, u.lastName)).join(', ')}
                                </p>
                              </div>
                            )}
                          </div>
                          
                        </div>
                        
                        {/* Rotation - Show current period and next period */}
                        {floor.cleaningRotations.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Rotace uklidu:</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Current Period */}
                              <div className="space-y-2">
                                <h6 className="text-sm font-semibold text-gray-800 flex items-center">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Aktuální období
                                </h6>
                                {floor.currentRoom ? (() => {
                                  const hasCompletedCleaning = floor.cleaningRecords.some((record: any) => 
                                    record.roomId === floor.currentRoom.id && 
                                    record.period === floor.currentPeriod
                                  ) || checkIfRoomCompletedInLast3Days(floor.currentRoom.id, floor.cleaningRecords, floor.currentPeriod, floor.settings?.frequency || 'weekly')
                                  
                                  return (
                                    <div
                                      className={`p-3 rounded-lg text-xs ${
                                        hasCompletedCleaning
                                          ? 'bg-green-100 border border-green-300'
                                          : 'bg-red-100 border border-red-300'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">{floor.currentRoom.name}</span>
                                        {hasCompletedCleaning ? (
                                          <span className="text-green-600 text-xs">✓ Dokončeno</span>
                                        ) : (
                                          <span className="text-red-600 text-xs">✗ Nedokončeno</span>
                                        )}
                                      </div>
                                      <div className="text-gray-500">
                                        {floor.currentRoom.users.map((u: any) => getDisplayName(u.name, u.lastName)).join(', ')}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        Období: {formatPeriod(floor.currentPeriod, floor.settings?.frequency || 'weekly')}
                                      </div>
                                    </div>
                                  )
                                })() : (
                                  <div className="p-3 rounded-lg text-xs bg-gray-100 border border-gray-300">
                                    <span className="text-gray-500">Žádná místnost není přiřazena</span>
                                  </div>
                                )}
                              </div>

                              {/* Next Periods */}
                              <div className="space-y-2">
                                <h6 className="text-sm font-semibold text-gray-800 flex items-center">
                                  <Clock className="w-4 h-4 mr-2" />
                                  Nastávající období
                                </h6>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(() => {
                                    const nextPeriods = []
                                    let currentRoomIndex = floor.cleaningRotations.findIndex((r: any) => r.room.id === floor.currentRoom?.id)
                                    
                                    // Generate next 2 periods
                                    for (let i = 0; i < 2; i++) {
                                      const nextRoomIndex = (currentRoomIndex + 1 + i) % floor.cleaningRotations.length
                                      const nextRoom = floor.cleaningRotations[nextRoomIndex]
                                      
                                      if (nextRoom) {
                                        // Calculate next period
                                        const nextPeriod = getNextPeriodForRoom(floor.currentPeriod, floor.settings?.frequency || 'weekly', i + 1)
                                        
                                        nextPeriods.push(
                                          <div key={i} className="p-3 rounded-lg text-xs bg-blue-50 border border-blue-200">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="font-medium">{nextRoom.room.name}</span>
                                              <span className="text-blue-600 text-xs">Připraveno</span>
                                            </div>
                                            <div className="text-gray-500">
                                              {nextRoom.room.users.map((u: any) => getDisplayName(u.name, u.lastName)).join(', ')}
                                            </div>
                                            <div className="text-xs text-blue-600 mt-1">
                                              Období: {formatPeriod(nextPeriod, floor.settings?.frequency || 'weekly')}
                                            </div>
                                          </div>
                                        )
                                      }
                                    }
                                    
                                    return nextPeriods.length > 0 ? nextPeriods : (
                                      <div className="col-span-2 p-3 rounded-lg text-xs bg-gray-100 border border-gray-300">
                                        <span className="text-gray-500">Žádná další místnost</span>
                                      </div>
                                    )
                                  })()}
                                </div>
                              </div>

                            </div>
                          </div>
                        )}
                        
                        {/* Recent Records */}
                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Nedávné uklidy:</h5>
                          {(() => {
                            const currentRoom = floor.currentRoom
                            const currentRecord = currentRoom
                              ? floor.cleaningRecords.find((r: any) => r.period === floor.currentPeriod && r.roomId === currentRoom.id)
                              : null

                            if (!currentRoom) {
                              return (
                                <div className="p-3 rounded-lg text-xs bg-gray-100 border border-gray-300">
                                  <span className="text-gray-500">Žádná místnost není přiřazena pro aktuální období</span>
                                </div>
                              )
                            }

                            if (currentRecord && Array.isArray(currentRecord.photos) && currentRecord.photos.length > 0) {
                              return (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium text-gray-900">
                                        {currentRoom.name} - {currentRecord.user ? getDisplayName(currentRecord.user.name, currentRecord.user.lastName) : '—'}
                                      </span>
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        Aktuální období
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs text-gray-500">
                                        {new Date(currentRecord.completedAt).toLocaleDateString('cs-CZ')}
                                      </span>
                                      <div className="text-xs text-gray-400">
                                        {formatPeriod(floor.currentPeriod, floor.settings?.frequency || 'weekly')}
                                      </div>
                                    </div>
                                  </div>
                                  <PhotoGallery 
                                    photos={currentRecord.photos} 
                                    title="Fotografie z úklidu"
                                    className="mt-2"
                                  />
                                </div>
                              )
                            }

                            return (
                              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                <span className="text-sm text-red-800">
                                  {currentRoom.name} ještě neuklidila a čeká se na fotky
                                </span>
                                <div className="text-xs text-gray-500 mt-1">
                                  Období: {formatPeriod(floor.currentPeriod, floor.settings?.frequency || 'weekly')}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </motion.div>
                    )) : (
                      <div className="px-6 py-8 text-center text-gray-500">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Žádná data o uklidu</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* All Cleaning Records with Photos */}
                <Card>
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <ImageIcon className="w-5 h-5 mr-2" />
                      Všechny záznamy úklidu s fotografiemi
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Kompletní přehled všech úklidů z minulosti - hotové i nehotové
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {(() => {
                      // Získej všechna období z reálných záznamů napříč patry
                      const periodSet = new Set<string>()
                      cleaningData.forEach((floor: any) => {
                        floor.cleaningRecords.forEach((r: any) => periodSet.add(r.period))
                      })

                      // Seřaď období sestupně (nejnovější první)
                      const periods = Array.from(periodSet).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0))

                      if (periods.length === 0) {
                        return (
                          <div className="px-6 py-8 text-center text-gray-500">
                            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>Žádné záznamy úklidu</p>
                          </div>
                        )
                      }

                      return periods.map((period) => (
                        <div key={period} className="py-6">
                          {/* Nadpis období */}
                          <div className="px-6 mb-4">
                            <h4 className="text-md font-semibold text-gray-900">
                              Období: {formatPeriod(period, (cleaningData.find((f: any) => f.cleaningRecords?.some((r: any) => r.period === period))?.settings?.frequency) || 'weekly')}
                            </h4>
                          </div>

                          {/* Seznam pater pro dané období */}
                          <div className="space-y-4">
                            {[...cleaningData]
                              .sort((a: any, b: any) => a.number - b.number)
                              .map((floor: any) => {
                                const frequency = floor.settings?.frequency || 'weekly'

                                // Urči zodpovědnou místnost pro dané období
                                const idx = getCurrentRoomIndex(floor.cleaningRotations || [], period)
                                const rotationEntry = (floor.cleaningRotations || [])[idx]
                                const responsibleRoom = rotationEntry?.room

                                // Najdi záznam pro patro v tomto období (jen pokud je zodpovědná místnost známa)
                                const record = responsibleRoom
                                  ? (floor.cleaningRecords || []).find(
                                      (r: any) => r.period === period && r.roomId === responsibleRoom.id
                                    )
                                  : null

                                return (
                                  <div key={`${floor.id}-${period}`} className="px-6">
                                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <h5 className="text-lg font-semibold text-gray-900">
                                            Patro {floor.number} - {floor.name}
                                          </h5>
                                          <span className="text-xs text-gray-500">
                                            {frequency === 'weekly'
                                              ? 'Týdně'
                                              : frequency === 'biweekly'
                                              ? 'Jednou za 2 týdny'
                                              : frequency === 'monthly'
                                              ? 'Měsíčně'
                                              : frequency}
                                          </span>
                                        </div>

                                        {/* Zodpovědná místnost a stav */}
                                        {responsibleRoom ? (
                                          <div
                                            className={`p-3 rounded-lg ${
                                              record
                                                ? 'bg-green-50 border border-green-200'
                                                : 'bg-red-50 border border-red-200'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between mb-1">
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium">{responsibleRoom.name}</span>
                                                {record ? (
                                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                    ✓ Dokončeno
                                                  </span>
                                                ) : (
                                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                                                    ✗ Čeká na fotky
                                                  </span>
                                                )}
                                              </div>

                                              <div className="text-right text-xs text-gray-600">
                                                {record ? (
                                                  <>
                                                    <div>{new Date(record.completedAt).toLocaleDateString('cs-CZ')}</div>
                                                  </>
                                                ) : (
                                                  <div>
                                                    Zodpovědní: {(responsibleRoom.users || []).map((u: any) => getDisplayName(u.name, u.lastName)).join(', ')}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Fotky jen pokud jsou v tomto období */}
                                            {record && Array.isArray(record.photos) && record.photos.length > 0 && (
                                              <PhotoGallery photos={record.photos} title="Fotografie z úklidu" className="mt-2" />
                                            )}

                                            {/* Info když nejsou fotky */}
                                            {!record && (
                                              <div className="mt-2 text-xs text-gray-600">
                                                {responsibleRoom.name} nedokončila úklid!
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="p-3 rounded-lg text-xs bg-gray-100 border border-gray-300">
                                            <span className="text-gray-500">Žádná místnost není přiřazena pro toto období</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  )
}