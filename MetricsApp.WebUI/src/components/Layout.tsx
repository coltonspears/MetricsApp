import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Database, Search, Bell, Settings, Sun, Moon, Activity, Layers, ChevronDown, Plus, BarChart3, User, LogOut, History, Star, Home, HelpCircle, Sliders, Bookmark, Menu } from 'lucide-react'
import { useTheme } from '../lib/theme'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Persist sidebar collapsed state - default to collapsed
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : true
  })
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [pinnedNavOpen, setPinnedNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Handle ESC key for search popup
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }

    if (searchOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => {
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [searchOpen])

  // Close all menus when location changes
  useEffect(() => {
    setProfileMenuOpen(false)
    setPinnedNavOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Database, current: location.pathname === '/' },
    { name: 'Explore', href: '/explore', icon: BarChart3, current: location.pathname === '/explore' },
    { name: 'Search', href: '/search', icon: Search, current: location.pathname === '/search' },
    { name: 'RUM', href: '/rum', icon: Activity, current: location.pathname === '/rum' },
    { name: 'Alerts', href: '/alerts', icon: Bell, current: location.pathname === '/alerts' },
    { name: 'Settings', href: '/settings', icon: Settings, current: location.pathname === '/settings' },
  ]

  const connectionsItems = [
    { name: 'Add new connection', href: '/connections/add', icon: Plus },
    { name: 'Data Sources', href: '/connections/datasources', icon: Database },
  ]

  const pinnedNavItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Dashboards', href: '/dashboards', icon: BarChart3 },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Explore', href: '/explore', icon: Search },
  ]

  const isConnectionsActive = location.pathname.startsWith('/connections') || location.pathname.startsWith('/datasources')

  // Generate breadcrumb from current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(segment => segment !== '')
    const breadcrumbs = [{ name: 'Home', href: '/' }]
    
    let currentPath = ''
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`
      const name = segment.charAt(0).toUpperCase() + segment.slice(1)
      breadcrumbs.push({ name, href: currentPath })
    })
    
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()
  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64'
  const mainContentOffset = sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
  const topNavOffset = sidebarCollapsed ? 'left-16' : 'left-64'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 app-scale-90">
      {/* Sidebar - Full Height */}
      <div className={`hidden md:flex md:${sidebarWidth} md:flex-col md:fixed md:inset-y-0 transition-all duration-300`}>
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900 dark:bg-slate-800">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {!sidebarCollapsed ? (
              <div className="flex items-center flex-shrink-0 px-4 justify-between">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-emerald-400" />
                  <span className="ml-2 text-xl font-bold text-white">MetricsApp</span>
                </div>
                
                {/* Hamburger Menu Button */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 px-4">
                <Database className="h-8 w-8 text-emerald-400" />
                
                {/* Hamburger Menu Button */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>
            )}

            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      item.current
                        ? 'bg-slate-700 dark:bg-slate-600 text-emerald-400 border-r-2 border-emerald-400'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      sidebarCollapsed ? 'justify-center' : ''
                    }`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <Icon
                      className={`${
                        item.current ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'
                      } ${sidebarCollapsed ? '' : 'mr-3'} flex-shrink-0 h-5 w-5 transition-colors duration-200`}
                    />
                    {!sidebarCollapsed && item.name}
                  </Link>
                )
              })}
              
              {/* Connections Dropdown */}
              {!sidebarCollapsed && (
                <div className="relative">
                  <button
                    onClick={() => setConnectionsOpen(!connectionsOpen)}
                    className={`${
                      isConnectionsActive
                        ? 'bg-slate-700 dark:bg-slate-600 text-emerald-400 border-r-2 border-emerald-400'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    } group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200`}
                  >
                    <Layers
                      className={`${
                        isConnectionsActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'
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
                                ? 'bg-slate-600 dark:bg-slate-500 text-emerald-400 border-l-2 border-emerald-400'
                                : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                            } group flex items-center pl-8 pr-2 py-2 text-sm font-medium rounded-md transition-colors duration-200`}
                          >
                            <Icon
                              className={`${
                                isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'
                              } mr-3 flex-shrink-0 h-4 w-4 transition-colors duration-200`}
                            />
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
          <div className="flex-shrink-0 flex bg-slate-800 dark:bg-slate-700 p-4">
            <div className="flex items-center">
              <div className={sidebarCollapsed ? '' : 'ml-3'}>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleTheme}
                    className="bg-slate-700 dark:bg-slate-600 p-1 rounded-full text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
                    title={sidebarCollapsed ? 'Toggle theme' : ''}
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

      {/* Top Navigation Bar - To the right of sidebar */}
      <div className={`hidden md:block fixed top-0 ${topNavOffset} right-0 h-[40px] bg-slate-800 dark:bg-slate-900 border-b border-slate-700 dark:border-slate-600 z-50 transition-all duration-300`}>
        <div className="flex items-center h-full px-4">
          {/* Left: Breadcrumbs */}
          <div className="flex items-center space-x-1 text-sm text-slate-300">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && <span className="mx-1 text-slate-500">/</span>}
                <Link
                  to={crumb.href}
                  className={`hover:text-white transition-colors ${
                    index === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-slate-400'
                  }`}
                >
                  {crumb.name}
                </Link>
              </div>
            ))}
          </div>

          {/* Right: Search, Pinned Nav, Profile */}
          <div className="flex items-center space-x-2 ml-auto">
            {/* Search Bar */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center px-3 py-1.5 w-64 text-sm text-slate-400 bg-slate-700 dark:bg-slate-800 border border-slate-600 rounded-sm hover:text-white hover:border-slate-500 transition-colors justify-between"
              >
                <div className="flex items-center">
                  <Search className="h-4 w-4 mr-2" />
                  <span>Search...</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-700 dark:bg-slate-600"></div>

            {/* Pinned Nav Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPinnedNavOpen(!pinnedNavOpen)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <Star className="h-4 w-4" />
              </button>
              {pinnedNavOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-slate-800 dark:bg-slate-700 rounded-md shadow-lg border border-slate-600 py-1 z-50">
                  {pinnedNavItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 hover:text-white"
                        onClick={() => setPinnedNavOpen(false)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-700 dark:bg-slate-600"></div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-medium hover:bg-emerald-500 transition-colors"
              >
                U
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-slate-800 dark:bg-slate-700 rounded-md shadow-lg border border-slate-600 py-1 z-50">
                  <button className="flex items-center w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 hover:text-white">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 hover:text-white">
                    <History className="h-4 w-4 mr-2" />
                    Notification History
                  </button>
                  <hr className="my-1 border-slate-600" />
                  <button 
                    onClick={() => {
                      toggleTheme()
                      setProfileMenuOpen(false)
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 hover:text-white"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <hr className="my-1 border-slate-600" />
                  <button className="flex items-center w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 hover:text-white">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Off
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Top Nav - Full width for mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-[40px] bg-slate-800 dark:bg-slate-900 border-b border-slate-700 dark:border-slate-600 z-50">
        <div className="flex items-center h-full px-4">
          {/* Mobile menu button */}
          <button
            type="button"
            className="mr-4 h-6 w-6 inline-flex items-center justify-center text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Database className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center space-x-1 text-sm text-slate-300 flex-1">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && <span className="mx-1 text-slate-500">/</span>}
                <Link
                  to={crumb.href}
                  className={`hover:text-white transition-colors ${
                    index === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-slate-400'
                  }`}
                >
                  {crumb.name}
                </Link>
              </div>
            ))}
          </div>

          {/* Mobile right items */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Search Overlay */}
      {searchOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSearchOpen(false)
            }
          }}
        >
          <div className="bg-slate-800 dark:bg-slate-700 rounded-lg shadow-xl border border-slate-600 w-1/2 h-1/2 flex flex-col">
            {/* Search Header */}
            <div className="p-4 border-b border-slate-600">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search for actions, pages, and more..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 dark:bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Search Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Actions Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center">
                  <Bookmark className="h-4 w-4 mr-1" />
                  Actions
                </h3>
                <div className="space-y-1">
                  {pinnedNavItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center p-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 rounded"
                        onClick={() => setSearchOpen(false)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Pages Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center">
                  <Database className="h-4 w-4 mr-1" />
                  Pages
                </h3>
                <div className="space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center p-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 rounded"
                        onClick={() => setSearchOpen(false)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </Link>
                    )
                  })}
                  {connectionsItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center p-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 rounded"
                        onClick={() => setSearchOpen(false)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Preferences Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center">
                  <Sliders className="h-4 w-4 mr-1" />
                  Preferences
                </h3>
                <div className="space-y-1">
                  <button className="flex items-center w-full p-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 rounded">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme()
                      setSearchOpen(false)
                    }}
                    className="flex items-center w-full p-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 rounded"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                    Toggle Theme
                  </button>
                </div>
              </div>

              {/* Help Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center">
                  <HelpCircle className="h-4 w-4 mr-1" />
                  Help
                </h3>
                <div className="space-y-1">
                  <button className="flex items-center w-full p-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 rounded">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Documentation
                  </button>
                  <button className="flex items-center w-full p-2 text-sm text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600 rounded">
                    <Bell className="h-4 w-4 mr-2" />
                    Support
                  </button>
                </div>
              </div>
            </div>

            {/* Close button */}
            <div className="p-4 border-t border-slate-600">
              <button
                onClick={() => setSearchOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Press ESC to close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handlers for dropdown menus */}
      {(profileMenuOpen || pinnedNavOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setProfileMenuOpen(false)
            setPinnedNavOpen(false)
          }}
        />
      )}

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
      <div className={`${mainContentOffset} flex flex-col flex-1 pt-[40px] transition-all duration-300`}>
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  {/* Page content will go here */}
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