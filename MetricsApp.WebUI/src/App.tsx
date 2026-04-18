import { useEffect } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import { initializeTelemetry, traceRouteChange } from './lib/telemetry'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DashboardList from './pages/DashboardList'
import DashboardView from './pages/DashboardView'
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
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import StyleGuide from './pages/StyleGuide'
import ThemeShowcase from './pages/ThemeShowcase'
import PluginsListPage from './pages/PluginsListPage'
import PluginDetailPage from './pages/PluginDetailPage'

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-4xl font-semibold text-[var(--color-text-primary)] mb-3">404</h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        That page doesn't exist (or hasn't been built yet).
      </p>
      <Link
        to="/"
        className="px-4 py-2 rounded-md bg-[var(--color-accent-primary)] text-white hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </div>
  )
}

function App() {
  const location = useLocation()

  useEffect(() => {
    initializeTelemetry()
  }, [])

  useEffect(() => {
    traceRouteChange(location.pathname, {
      'route.path': location.pathname,
      'route.search': location.search,
      'route.hash': location.hash,
    })
  }, [location])

  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboards" element={<DashboardList />} />
          <Route path="/dashboards/:dashboardId" element={<DashboardView />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/telemetry" element={<TelemetryExplorer />} />
          <Route path="/telemetry/testing" element={<TelemetryTesting />} />
          <Route path="/logs" element={<LogViewer />} />
          <Route path="/tracing" element={<Tracing />} />
          <Route path="/connections/add" element={<AddConnection />} />
          <Route path="/connections/datasources/:dataSourceType" element={<DataSourceDetails />} />
          <Route path="/connections/datasources" element={<DataSources />} />
          <Route path="/datasources/:id" element={<DataSourceMetadata />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/plugins" element={<PluginsListPage />} />
          <Route path="/plugins/:pluginId" element={<PluginDetailPage />} />
          <Route path="/themes" element={<ThemeShowcase />} />
          <Route path="/docs/styleguide" element={<StyleGuide />} />
          <Route path="/docs/themeshowcase" element={<ThemeShowcase />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App
