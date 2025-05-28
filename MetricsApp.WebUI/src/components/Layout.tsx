import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Database, Search, Bell, Settings, Sun, Moon, Activity } from 'lucide-react'
import { useTheme } from '../lib/theme'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Database, current: location.pathname === '/' },
    { name: 'Search', href: '/search', icon: Search, current: location.pathname === '/search' },
    { name: 'RUM', href: '/rum', icon: Activity, current: location.pathname === '/rum' },
    { name: 'Alerts', href: '/alerts', icon: Bell, current: location.pathname === '/alerts' },
    { name: 'Settings', href: '/settings', icon: Settings, current: location.pathname === '/settings' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900 dark:bg-slate-800">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Database className="h-8 w-8 text-emerald-400" />
              <span className="ml-2 text-xl font-bold text-white">MetricsApp</span>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      item.current
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200`}
                  >
                    <Icon
                      className={`${
                        item.current ? 'text-emerald-300' : 'text-slate-400 group-hover:text-slate-300'
                      } mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200`}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex bg-slate-800 dark:bg-slate-700 p-4">
            <button
              onClick={toggleTheme}
              className="flex-shrink-0 w-full group block"
            >
              <div className="flex items-center">
                <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-slate-700 dark:bg-slate-600 text-slate-300 hover:text-white transition-colors duration-200">
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors duration-200">
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="sr-only">Open sidebar</span>
            <Database className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  {/* Page content will go here */}
                </div>
                <div className="md:hidden">
                  <button
                    onClick={toggleTheme}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors duration-200"
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout 