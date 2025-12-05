import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import { rumCollector, trackPageView } from './lib/rum-collector'
import { traceRouteChange } from './lib/telemetry'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import Search from './pages/Search'
import TelemetryExplorer from './pages/TelemetryExplorer'
import TelemetryTesting from './pages/TelemetryTesting'
import LogViewer from './pages/LogViewer'
import Tracing from './pages/Tracing'
import AddConnection from './pages/AddConnection'
import DataSourceDetails from './pages/DataSourceDetails'
import DataSources from './pages/DataSources'
import DataSourceMetadata from './pages/DataSourceMetadata'
import RUM from './pages/RUM'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'
import ThemeShowcase from './pages/ThemeShowcase'

// Authentication pages
import GoogleAuth from './pages/admin/authentication/GoogleAuth'
import GitHubAuth from './pages/admin/authentication/GitHubAuth'
import AzureAuth from './pages/admin/authentication/AzureAuth'
import DefaultAuth from './pages/admin/authentication/DefaultAuth'

// Administration pages
import Organizations from './pages/admin/Organizations'
import CreateOrganization from './pages/admin/CreateOrganization'
import AdminUsers from './pages/admin/Users'
import InviteUsers from './pages/org/InviteUsers'
import Teams from './pages/org/Teams'

// Profile pages
import Profile from './pages/Profile'
import NotificationHistory from './pages/profile/Notifications'
import ProfileSettings from './pages/profile/ProfileSettings'
import Logout from './pages/Logout'
import StyleGuide from './pages/StyleGuide'
import PluginsListPage from './pages/PluginsListPage'
import PluginDetailPage from './pages/PluginDetailPage'
import ServiceMap from './pages/ServiceMap'

function App() {
  const location = useLocation()

  useEffect(() => {
    // Initialize RUM tracking
    rumCollector.enable()
    
    // Track initial page view
    trackPageView(window.location.pathname, {
      title: document.title,
      referrer: document.referrer
    })

    // Track page changes
    const handleLocationChange = () => {
      trackPageView(window.location.pathname, {
        title: document.title
      })
    }

    // Listen for navigation changes
    window.addEventListener('popstate', handleLocationChange)
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      rumCollector.disable()
    }
  }, [])

  // Track route changes with OpenTelemetry
  useEffect(() => {
    const routeName = location.pathname
    
    // Track page view with existing RUM
    trackPageView(routeName, {
      title: document.title,
      search: location.search,
      hash: location.hash
    })
    
    // Track route change with OpenTelemetry
    traceRouteChange(routeName, {
      'route.path': routeName,
      'route.search': location.search,
      'route.hash': location.hash,
    })
  }, [location])

  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/telemetry" element={<TelemetryExplorer />} />
          <Route path="/telemetry/testing" element={<TelemetryTesting />} />
          <Route path="/logs" element={<LogViewer />} />
          <Route path="/tracing" element={<Tracing />} />
          <Route path="/service-map" element={<ServiceMap />} />
          <Route path="/connections/add" element={<AddConnection />} />
          <Route path="/connections/datasources/:dataSourceType" element={<DataSourceDetails />} />
          <Route path="/connections/datasources" element={<DataSources />} />
          <Route path="/datasources/:id" element={<DataSourceMetadata />} />
          <Route path="/rum" element={<RUM />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/plugins" element={<PluginsListPage />} />
          <Route path="/plugins/:pluginId" element={<PluginDetailPage />} />

          <Route path="/themes" element={<ThemeShowcase />} />
          
          {/* Authentication Routes */}
          <Route path="/admin/authentication/google" element={<GoogleAuth />} />
          <Route path="/admin/authentication/github" element={<GitHubAuth />} />
          <Route path="/admin/authentication/azure" element={<AzureAuth />} />
          <Route path="/admin/authentication/default" element={<DefaultAuth />} />
          
          {/* Administration Routes */}
          <Route path="/admin/orgs" element={<Organizations />} />
          <Route path="/admin/orgs/create" element={<CreateOrganization />} />
          <Route path="/admin/orgs/edit/:id" element={<CreateOrganization />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/org/users/invite" element={<InviteUsers />} />
          <Route path="/org/teams" element={<Teams />} />
          <Route path="/orgs/teams/create" element={<Teams />} />
          <Route path="/orgs/teams/edit/:id" element={<Teams />} />
          <Route path="/orgs/teams/edit/:id/members" element={<Teams />} />
          <Route path="/orgs/teams/edit/:id/settings" element={<Teams />} />
          
          {/* Profile Routes */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/notifications" element={<NotificationHistory />} />
          <Route path="/profile/settings" element={<ProfileSettings />} />
          <Route path="/docs/styleguide" element={<StyleGuide />} />
          <Route path="/docs/themeshowcase" element={<ThemeShowcase />} />
          <Route path="/logout" element={<Logout />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App 
