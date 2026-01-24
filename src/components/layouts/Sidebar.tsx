'use client'

import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  CogIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/demo/dashboard', icon: HomeIcon },
  { name: 'Analytics', href: '/demo/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Users', href: '/demo/dashboard/users', icon: UsersIcon },
  { name: 'Orders', href: '/demo/dashboard/orders', icon: ShoppingCartIcon },
  { name: 'Documents', href: '/demo/dashboard/documents', icon: DocumentTextIcon },
  { name: 'Settings', href: '/demo/dashboard/settings', icon: CogIcon },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:z-auto',
          {
            'translate-x-0': isOpen,
            '-translate-x-full': !isOpen,
          }
        )}
      >
        <div className="flex h-full flex-col bg-white shadow-xl lg:shadow-none border-r">
          {/* Logo Section */}
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-purple-600" />
              <span className="text-xl font-bold text-gray-900">Dashboard</span>
            </div>

            {/* Close button - mobile only */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 lg:hidden"
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'group flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onClose()
                    }
                  }}
                >
                  <item.icon
                    className={clsx(
                      'mr-3 h-5 w-5 shrink-0 transition-colors',
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-linear-to-br from-gray-300 to-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Tali Nanzing Moses</p>
                <p className="text-xs text-gray-500 truncate">User</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}