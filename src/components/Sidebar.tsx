'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, 
  Users, 
  MapPin, 
  LogOut, 
  Settings,
  Menu,
  X,
  Home,
  Sparkles,
  Crown
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import Button from './ui/Button'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  const getDisplayName = (name: string, lastName?: string | null) => {
    return lastName ? `${name} ${lastName}` : name
  }

  const menuItems = [
    { id: 'dashboard', name: 'Přehled', icon: Home, path: '/' },
    { id: 'cleaning', name: 'Úklid', icon: Sparkles, path: '/cleaning' },
  ]

  const handleNavigation = (path: string) => {
    router.push(path)
    onClose()
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            className="fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 lg:static lg:shadow-none lg:z-auto"
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900">Menu</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-600 lg:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{getDisplayName(session?.user?.name || '', (session?.user as any)?.lastName)}</p>
                    <p className="text-sm text-gray-500">{session?.user?.email}</p>
                    {session?.user?.room && (
                      <p className="text-xs text-gray-400 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {session.user.room.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4">
                <ul className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.path
                    
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => handleNavigation(item.path)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.name}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              {/* Admin Link */}
              {session?.user?.role === 'ADMIN' && (
                <div className="p-4 border-t border-gray-200">
                  <Button
                    variant="secondary"
                    onClick={() => handleNavigation('/admin')}
                    className="w-full flex items-center space-x-3"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Administrace</span>
                  </Button>
                </div>
              )}
              {/* Superadmin Link */}
              {session?.user?.role === 'SUPERADMIN' && (
                <div className="p-4 border-t border-gray-200">
                  <Button
                    variant="secondary"
                    onClick={() => handleNavigation('/superadmin')}
                    className="w-full flex items-center space-x-3"
                  >
                    <Crown className="w-5 h-5" />
                    <span>Superadmin</span>
                  </Button>
                </div>
              )}

              {/* Logout */}
              <div className="p-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="w-full flex items-center space-x-3 text-red-600 hover:text-red-700"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Odhlásit se</span>
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

