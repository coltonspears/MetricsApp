import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Database, Search, Bell, Settings, Sun, Moon, Activity, Layers, ChevronDown, Plus } from 'lucide-react'
import { useTheme } from '../lib/theme'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [connectionsOpen, setConnectionsOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Database, current: location.pathname === '/' },
    { name: 'Search', href: '/search', icon: Search, current: location.pathname === '/search' },
    { name: 'RUM', href: '/rum', icon: Activity, current: location.pathname === '/rum' },
    { name: 'Alerts', href: '/alerts', icon: Bell, current: location.pathname === '/alerts' },
    { name: 'Settings', href: '/settings', icon: Settings, current: location.pathname === '/settings' },
  ]

  const connectionsItems = [
    { name: 'Add new connection', href: '/connections/add', icon: Plus },
    { name: 'Data Sources', href: '/connections/datasources', icon: Database },
  ]

  const isConnectionsActive = location.pathname.startsWith('/connections') || location.pathname.startsWith('/datasources')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 app-scale-90">
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
              
              {/* Connections Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setConnectionsOpen(!connectionsOpen)}
                  className={`${
                    isConnectionsActive
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  } group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200`}
                >
                  <Layers
                    className={`${
                      isConnectionsActive ? 'text-emerald-300' : 'text-slate-400 group-hover:text-slate-300'
                    } mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200`}
                  />
                  Connections
                  <ChevronDown
                    className={`${
                      connectionsOpen ? 'rotate-180' : ''
                    } ml-auto h-4 w-4 transition-transform duration-200`}
                  />
                </button>
                
                {connectionsOpen && (
                  <div className="mt-1 space-y-1">
                    {connectionsItems.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.href || 
                        (item.href === '/datasources' && location.pathname.startsWith('/datasources'))
                      
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                          } group flex items-center pl-8 pr-2 py-2 text-sm font-medium rounded-md transition-colors duration-200`}
                        >
                          <Icon
                            className={`${
                              isActive ? 'text-emerald-200' : 'text-slate-400 group-hover:text-slate-300'
                            } mr-3 flex-shrink-0 h-4 w-4 transition-colors duration-200`}
                          />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>
          <div className="flex-shrink-0 flex bg-slate-800 dark:bg-slate-700 p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleTheme}
                    className="bg-slate-700 dark:bg-slate-600 p-1 rounded-full text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
                  >
                    <span className="sr-only">Toggle theme</span>
                    {theme === 'dark' ? (
                      <Sun className="h-6 w-6" />
                    ) : (
                      <Moon className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} fixed inset-0 flex z-40 md:hidden`}>
        <div className="fixed inset-0 bg-slate-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <Database className="h-8 w-8 text-emerald-400" />
              <span className="ml-2 text-xl font-bold text-white">MetricsApp</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
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
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Mobile Connections */}
              <div className="space-y-1">
                <div className="text-slate-400 px-2 py-2 text-xs font-semibold uppercase tracking-wider">
                  Connections
                </div>
                {connectionsItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href || 
                    (item.href === '/datasources' && location.pathname.startsWith('/datasources'))
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </nav>
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