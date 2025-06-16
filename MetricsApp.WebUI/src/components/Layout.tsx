import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Database, Search, Bell, Settings, Sun, Moon, Activity, Layers, ChevronDown, Plus, BarChart3, User, LogOut, History, Star, Home, HelpCircle, Sliders, Bookmark, Menu, Shield, Users, Building, GitBranch } from 'lucide-react'
import { useTheme } from '../lib/theme'
import ThemeSelector from './ThemeSelector'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { currentTheme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Persist sidebar collapsed state - default to collapsed
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : true
  })
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [authenticationOpen, setAuthenticationOpen] = useState(false)
  const [administrationOpen, setAdministrationOpen] = useState(false)
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

  const authenticationItems = [
    { name: 'Google OAuth', href: '/admin/authentication/google', icon: Shield, wip: true },
    { name: 'GitHub OAuth', href: '/admin/authentication/github', icon: GitBranch, wip: true },
    { name: 'Azure PAT', href: '/admin/authentication/azure', icon: Shield, wip: true },
    { name: 'Standalone Auth', href: '/admin/authentication/default', icon: Shield, wip: true },
  ]

  const administrationItems = [
    { name: 'Organizations', href: '/admin/orgs', icon: Building, wip: true },
    { name: 'Create Organization', href: '/admin/orgs/create', icon: Plus, wip: true },
    { name: 'Admin Users', href: '/admin/users', icon: Users, wip: true },
    { name: 'Invite Users', href: '/org/users/invite', icon: Plus, wip: true },
    { name: 'Teams', href: '/org/teams', icon: Users, wip: true },
    { name: 'Create Team', href: '/orgs/teams/create', icon: Plus, wip: true },
  ]

  const pinnedNavItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Dashboards', href: '/dashboards', icon: BarChart3 },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Explore', href: '/explore', icon: Search },
  ]

  const isConnectionsActive = location.pathname.startsWith('/connections') || location.pathname.startsWith('/datasources')
  const isAuthenticationActive = location.pathname.startsWith('/admin/authentication')
  const isAdministrationActive = location.pathname.startsWith('/admin/orgs') || location.pathname.startsWith('/admin/users') || location.pathname.startsWith('/org/users') || location.pathname.startsWith('/org/teams') || location.pathname.startsWith('/orgs/teams')

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
  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-75'
  const mainContentOffset = sidebarCollapsed ? 'md:pl-16' : 'md:pl-75'
  const topNavOffset = sidebarCollapsed ? 'left-16' : 'left-75'

  // WIP Badge Component
  const WipBadge = () => (
    <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-yellow-600 text-yellow-100 rounded">
      WIP
    </span>
  )

  return (
    <div 
      className="min-h-screen app-scale-90"
      style={{ 
        backgroundColor: 'var(--bg-primary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-base)'
      }}
    >
      {/* Sidebar - Full Height */}
      <div className={`hidden md:flex md:${sidebarWidth} md:flex-col md:fixed md:inset-y-0 transition-all duration-300`}>
        <div 
          className="flex-1 flex flex-col min-h-0"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {!sidebarCollapsed ? (
              <div className="flex items-center flex-shrink-0 px-4 justify-between">
                <div className="flex items-center">
                  <Database 
                    className="h-8 w-8" 
                    style={{ color: 'var(--text-accent)' }}
                  />
                  <span 
                    className="ml-2 text-xl font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    MetricsApp
                  </span>
                </div>
                
                {/* Hamburger Menu Button */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 transition-colors"
                  style={{ 
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)'
                    e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <Menu className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 px-4">
                <Database 
                  className="h-8 w-8" 
                  style={{ color: 'var(--text-accent)' }}
                />
                
                {/* Hamburger Menu Button */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 transition-colors"
                  style={{ 
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)'
                    e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
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
                    className={`group flex items-center px-2 py-2 text-sm font-medium transition-colors duration-200 ${
                      sidebarCollapsed ? 'justify-center' : ''
                    }`}
                    style={{
                      backgroundColor: item.current ? 'var(--interactive-primary)' : 'transparent',
                      color: item.current ? 'var(--text-inverse)' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)',
                      borderRight: item.current ? '2px solid var(--interactive-primary)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!item.current) {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!item.current) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <Icon
                      className={`${sidebarCollapsed ? '' : 'mr-3'} flex-shrink-0 h-5 w-5 transition-colors duration-200`}
                      style={{ 
                        color: item.current ? 'var(--text-inverse)' : 'var(--text-secondary)'
                      }}
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
                    className="group flex items-center w-full px-2 py-2 text-sm font-medium transition-colors duration-200"
                    style={{
                      backgroundColor: isConnectionsActive ? 'var(--interactive-primary)' : 'transparent',
                      color: isConnectionsActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)',
                      borderRight: isConnectionsActive ? '2px solid var(--interactive-primary)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isConnectionsActive) {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isConnectionsActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                  >
                    <Layers
                      className="mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200"
                      style={{
                        color: isConnectionsActive ? 'var(--text-inverse)' : 'var(--text-secondary)'
                      }}
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
                            className="group flex items-center pl-8 pr-2 py-2 text-sm font-medium transition-colors duration-200"
                            style={{
                              backgroundColor: isActive ? 'var(--interactive-secondary)' : 'transparent',
                              color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)',
                              borderRadius: 'var(--radius-md)',
                              borderLeft: isActive ? '2px solid var(--text-accent)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                                e.currentTarget.style.color = 'var(--text-primary)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = 'var(--text-secondary)'
                              }
                            }}
                          >
                            <Icon
                              className="mr-3 flex-shrink-0 h-4 w-4 transition-colors duration-200"
                              style={{
                                color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)'
                              }}
                            />
                            {item.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Authentication Dropdown */}
              {!sidebarCollapsed && (
                <div className="relative">
                  <button
                    onClick={() => setAuthenticationOpen(!authenticationOpen)}
                    className="group flex items-center w-full px-2 py-2 text-sm font-medium transition-colors duration-200"
                    style={{
                      backgroundColor: isAuthenticationActive ? 'var(--interactive-primary)' : 'transparent',
                      color: isAuthenticationActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)',
                      borderRight: isAuthenticationActive ? '2px solid var(--interactive-primary)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isAuthenticationActive) {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAuthenticationActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                  >
                    <Shield
                      className="mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200"
                      style={{
                        color: isAuthenticationActive ? 'var(--text-inverse)' : 'var(--text-secondary)'
                      }}
                    />
                    Authentication
                    <ChevronDown
                      className={`${
                        authenticationOpen ? 'rotate-180' : ''
                      } ml-auto h-4 w-4 transition-transform duration-200`}
                    />
                  </button>
                  
                  {authenticationOpen && (
                    <div className="mt-1 space-y-1">
                      {authenticationItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.href
                        
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className="group flex items-center pl-8 pr-2 py-2 text-sm font-medium transition-colors duration-200"
                            style={{
                              backgroundColor: isActive ? 'var(--interactive-secondary)' : 'transparent',
                              color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)',
                              borderRadius: 'var(--radius-md)',
                              borderLeft: isActive ? '2px solid var(--text-accent)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                                e.currentTarget.style.color = 'var(--text-primary)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = 'var(--text-secondary)'
                              }
                            }}
                          >
                            <Icon
                              className="mr-3 flex-shrink-0 h-4 w-4 transition-colors duration-200"
                              style={{
                                color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)'
                              }}
                            />
                            {item.name}
                            {item.wip && <WipBadge />}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Administration Dropdown */}
              {!sidebarCollapsed && (
                <div className="relative">
                  <button
                    onClick={() => setAdministrationOpen(!administrationOpen)}
                    className="group flex items-center w-full px-2 py-2 text-sm font-medium transition-colors duration-200"
                    style={{
                      backgroundColor: isAdministrationActive ? 'var(--interactive-primary)' : 'transparent',
                      color: isAdministrationActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)',
                      borderRight: isAdministrationActive ? '2px solid var(--interactive-primary)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isAdministrationActive) {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAdministrationActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                  >
                    <Users
                      className="mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200"
                      style={{
                        color: isAdministrationActive ? 'var(--text-inverse)' : 'var(--text-secondary)'
                      }}
                    />
                    Administration
                    <ChevronDown
                      className={`${
                        administrationOpen ? 'rotate-180' : ''
                      } ml-auto h-4 w-4 transition-transform duration-200`}
                    />
                  </button>
                  
                  {administrationOpen && (
                    <div className="mt-1 space-y-1">
                      {administrationItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.href
                        
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className="group flex items-center pl-8 pr-2 py-2 text-sm font-medium transition-colors duration-200"
                            style={{
                              backgroundColor: isActive ? 'var(--interactive-secondary)' : 'transparent',
                              color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)',
                              borderRadius: 'var(--radius-md)',
                              borderLeft: isActive ? '2px solid var(--text-accent)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                                e.currentTarget.style.color = 'var(--text-primary)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = 'var(--text-secondary)'
                              }
                            }}
                          >
                            <Icon
                              className="mr-3 flex-shrink-0 h-4 w-4 transition-colors duration-200"
                              style={{
                                color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)'
                              }}
                            />
                            {item.name}
                            {item.wip && <WipBadge />}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
          <div 
            className="flex-shrink-0 flex p-4"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div className="flex items-center w-full">
              <div className={sidebarCollapsed ? '' : 'ml-3'}>
                <div className="flex items-center space-x-3">
                  {sidebarCollapsed ? (
                    <ThemeSelector variant="compact" showLabel={false} />
                  ) : (
                    <ThemeSelector variant="dropdown" showLabel={false} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Navigation Bar - To the right of sidebar */}
      <div 
        className={`hidden md:block fixed top-0 ${topNavOffset} right-0 h-[40px] z-50 transition-all duration-300`}
        style={{ 
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: `1px solid var(--border-primary)`
        }}
      >
        <div className="flex items-center h-full px-4">
          {/* Left: Breadcrumbs */}
          <div 
            className="flex items-center space-x-1 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && (
                  <span 
                    className="mx-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    /
                  </span>
                )}
                <Link
                  to={crumb.href}
                  className={`transition-colors ${
                    index === breadcrumbs.length - 1 ? 'font-medium' : ''
                  }`}
                  style={{ 
                    color: index === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = index === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  {crumb.name}
                </Link>
              </div>
            ))}
          </div>

          {/* Right: Search, Theme, Pinned Nav, Profile */}
          <div className="flex items-center space-x-2 ml-auto">
            {/* Search Bar */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center px-3 py-1.5 w-64 text-sm border rounded-sm transition-colors justify-between"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)',
                  borderRadius: 'var(--radius-sm)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.borderColor = 'var(--border-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.borderColor = 'var(--border-primary)'
                }}
              >
                <div className="flex items-center">
                  <Search className="h-4 w-4 mr-2" />
                  <span>Search...</span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Divider */}
            <div 
              className="h-6 w-px"
              style={{ backgroundColor: 'var(--border-primary)' }}
            />

            {/* Theme Selector */}
            <ThemeSelector variant="compact" showLabel={false} />

            {/* Divider */}
            <div 
              className="h-6 w-px"
              style={{ backgroundColor: 'var(--border-primary)' }}
            />

            {/* Pinned Nav Dropdown */}
            <div className="relative">
              <button
                onClick={() => setPinnedNavOpen(!pinnedNavOpen)}
                className="p-1 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                <Star className="h-4 w-4" />
              </button>
              {pinnedNavOpen && (
                <div 
                  className="absolute right-0 mt-1 w-48 shadow-lg border py-1 z-50"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    bottom: 'auto',
                    top: '100%',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}
                >
                  {pinnedNavItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center px-3 py-2 text-sm transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
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
            <div 
              className="h-6 w-px"
              style={{ backgroundColor: 'var(--border-primary)' }}
            />

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium transition-colors"
                style={{ 
                  backgroundColor: 'var(--interactive-primary)',
                  borderRadius: 'var(--radius-full)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--interactive-primary-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--interactive-primary)'
                }}
              >
                U
              </button>
              {profileMenuOpen && (
                <div 
                  className="absolute right-0 mt-1 w-96 shadow-lg border py-1 z-50"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    bottom: 'auto',
                    top: '100%',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}
                >
                  <Link 
                    to="/profile"
                    className="flex items-center w-full px-3 py-2 text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                    <span 
                      className="ml-auto px-1.5 py-0.5 text-xs font-medium rounded"
                      style={{
                        backgroundColor: 'var(--status-warning)',
                        color: 'var(--text-inverse)'
                      }}
                    >
                      WIP
                    </span>
                  </Link>
                  <Link 
                    to="/profile/notifications"
                    className="flex items-center w-full px-3 py-2 text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Notification History
                    <span 
                      className="ml-auto px-1.5 py-0.5 text-xs font-medium rounded"
                      style={{
                        backgroundColor: 'var(--status-warning)',
                        color: 'var(--text-inverse)'
                      }}
                    >
                      WIP
                    </span>
                  </Link>
                  <Link 
                    to="/profile/settings"
                    className="flex items-center w-full px-3 py-2 text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                    <span 
                      className="ml-auto px-1.5 py-0.5 text-xs font-medium rounded"
                      style={{
                        backgroundColor: 'var(--status-warning)',
                        color: 'var(--text-inverse)'
                      }}
                    >
                      WIP
                    </span>
                  </Link>
                  <hr 
                    className="my-1"
                    style={{ borderColor: 'var(--border-primary)' }}
                  />
                  <div className="px-3 py-1">
                    <ThemeSelector variant="grid" showLabel={false} />
                  </div>
                  <hr 
                    className="my-1"
                    style={{ borderColor: 'var(--border-primary)' }}
                  />
                  <Link 
                    to="/logout"
                    className="flex items-center w-full px-3 py-2 text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Off
                    <span 
                      className="ml-auto px-1.5 py-0.5 text-xs font-medium rounded"
                      style={{
                        backgroundColor: 'var(--status-warning)',
                        color: 'var(--text-inverse)'
                      }}
                    >
                      WIP
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Top Nav - Full width for mobile */}
      <div 
        className="md:hidden fixed top-0 left-0 right-0 h-[40px] z-50"
        style={{ 
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: `1px solid var(--border-primary)`
        }}
      >
        <div className="flex items-center h-full px-4">
          {/* Mobile menu button */}
          <button
            type="button"
            className="mr-4 h-6 w-6 inline-flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Database className="h-5 w-5" />
          </button>

          {/* Breadcrumbs */}
          <div 
            className="flex items-center space-x-1 text-sm flex-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && (
                  <span 
                    className="mx-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    /
                  </span>
                )}
                <Link
                  to={crumb.href}
                  className={`transition-colors ${
                    index === breadcrumbs.length - 1 ? 'font-medium' : ''
                  }`}
                  style={{ 
                    color: index === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = index === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
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
              className="p-1 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-1 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              {currentTheme.type === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
          <div 
            className="w-1/2 h-1/2 flex flex-col border"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-xl)'
            }}
          >
            {/* Search Header */}
            <div 
              className="p-4"
              style={{ borderBottom: `1px solid var(--border-primary)` }}
            >
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  type="text"
                  placeholder="Search for actions, pages, and more..."
                  className="w-full pl-10 pr-4 py-2 border focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Search Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Actions Section */}
              <div>
                <h3 
                  className="text-sm font-medium mb-2 flex items-center"
                  style={{ color: 'var(--text-secondary)' }}
                >
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
                        className="flex items-center p-2 text-sm transition-colors"
                        style={{
                          color: 'var(--text-secondary)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
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
                <h3 
                  className="text-sm font-medium mb-2 flex items-center"
                  style={{ color: 'var(--text-secondary)' }}
                >
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
                        className="flex items-center p-2 text-sm transition-colors"
                        style={{
                          color: 'var(--text-secondary)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
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
                        className="flex items-center p-2 text-sm transition-colors"
                        style={{
                          color: 'var(--text-secondary)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
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
                <h3 
                  className="text-sm font-medium mb-2 flex items-center"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Sliders className="h-4 w-4 mr-1" />
                  Preferences
                </h3>
                <div className="space-y-1">
                  <button 
                    className="flex items-center w-full p-2 text-sm transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme()
                      setSearchOpen(false)
                    }}
                    className="flex items-center w-full p-2 text-sm transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    {currentTheme.type === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                    Toggle Theme
                  </button>
                </div>
              </div>

              {/* Help Section */}
              <div>
                <h3 
                  className="text-sm font-medium mb-2 flex items-center"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <HelpCircle className="h-4 w-4 mr-1" />
                  Help
                </h3>
                <div className="space-y-1">
                  <button 
                    className="flex items-center w-full p-2 text-sm transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Documentation
                  </button>
                  <button 
                    className="flex items-center w-full p-2 text-sm transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Support
                  </button>
                </div>
              </div>
            </div>

            {/* Close button */}
            <div 
              className="p-4"
              style={{ borderTop: `1px solid var(--border-primary)` }}
            >
              <button
                onClick={() => setSearchOpen(false)}
                className="transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50" 
          onClick={() => setSidebarOpen(false)} 
        />
        <div 
          className="relative flex-1 flex flex-col max-w-xs w-full"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              style={{
                borderRadius: 'var(--radius-full)'
              }}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <svg 
                className="h-6 w-6"
                style={{ color: 'var(--text-inverse)' }}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <Database 
                className="h-8 w-8"
                style={{ color: 'var(--text-accent)' }}
              />
              <span 
                className="ml-2 text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                MetricsApp
              </span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="group flex items-center px-2 py-2 text-base font-medium transition-colors"
                    style={{
                      backgroundColor: item.current ? 'var(--interactive-primary)' : 'transparent',
                      color: item.current ? 'var(--text-inverse)' : 'var(--text-secondary)',
                      borderRadius: 'var(--radius-md)'
                    }}
                    onMouseEnter={(e) => {
                      if (!item.current) {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!item.current) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Mobile Connections */}
              <div className="space-y-1">
                <div 
                  className="px-2 py-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
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
                      className="group flex items-center px-2 py-2 text-base font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--interactive-primary)' : 'transparent',
                        color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        borderRadius: 'var(--radius-md)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }
                      }}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>

              {/* Mobile Authentication */}
              <div className="space-y-1">
                <div 
                  className="px-2 py-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Authentication
                </div>
                {authenticationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="group flex items-center px-2 py-2 text-base font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--interactive-primary)' : 'transparent',
                        color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        borderRadius: 'var(--radius-md)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }
                      }}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                      {item.name}
                      {item.wip && (
                        <span 
                          className="ml-auto px-1.5 py-0.5 text-xs font-medium rounded"
                          style={{
                            backgroundColor: 'var(--status-warning)',
                            color: 'var(--text-inverse)'
                          }}
                        >
                          WIP
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>

              {/* Mobile Administration */}
              <div className="space-y-1">
                <div 
                  className="px-2 py-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Administration
                </div>
                {administrationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="group flex items-center px-2 py-2 text-base font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--interactive-primary)' : 'transparent',
                        color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        borderRadius: 'var(--radius-md)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                          e.currentTarget.style.color = 'var(--text-primary)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }
                      }}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-4 flex-shrink-0 h-6 w-6" />
                      {item.name}
                      {item.wip && (
                        <span 
                          className="ml-auto px-1.5 py-0.5 text-xs font-medium rounded"
                          style={{
                            backgroundColor: 'var(--status-warning)',
                            color: 'var(--text-inverse)'
                          }}
                        >
                          WIP
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`${mainContentOffset} flex flex-col flex-1 transition-all duration-300`}>
        {/* Spacer for top nav */}
        <div className="h-[40px] hidden md:block" />
        <main className="flex-1">
          <div className="py-6">
            <div className="px-4 sm:px-6 md:px-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  {
                    
                  }
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