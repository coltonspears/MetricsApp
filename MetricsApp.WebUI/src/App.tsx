import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import { rumCollector, trackPageView } from './lib/rum-collector'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Search from './pages/Search'
import RUM from './pages/RUM'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'

function App() {
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

  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<Search />} />
          <Route path="/rum" element={<RUM />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App 