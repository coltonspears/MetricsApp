import { useState } from 'react'
import { GitBranch, Save, Eye, EyeOff, TestTube } from 'lucide-react'

const GitHubAuth = () => {
  const [showClientSecret, setShowClientSecret] = useState(false)
  const [formData, setFormData] = useState({
    displayName: 'GitHub OAuth',
    clientId: '',
    clientSecret: '',
    scopes: 'user:email',
    redirectUrl: 'https://yourapp.com/auth/github/callback'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('GitHub OAuth Configuration:', formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleTestConnection = () => {
    console.log('Testing GitHub OAuth connection...')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-themed-border-primary pb-4">
        <div className="flex items-center space-x-4">
          <GitBranch className="h-8 w-8 text-themed-interactive-primary" />
          <h1 className="text-3xl font-bold text-themed-text-primary">GitHub OAuth Configuration</h1>
          <span className="px-3 py-1 text-sm font-medium border-themed-alert-error bg-opacity-20 text-themed-status-warning rounded-full">
            Work in Progress
          </span>
        </div>
        <div className="mt-2">
          <p className="text-themed-text-secondary">
            Configure GitHub OAuth integration for user authentication. This page is currently under development.
          </p>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-themed-bg-tertiary rounded-lg shadow border border-themed-border-primary">
        <div className="px-6 py-4 border-b border-themed-border-primary">
          <h3 className="text-lg font-medium text-themed-text-primary">OAuth Settings</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-themed-text-secondary mb-2">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="e.g., GitHub Login"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
            </div>

            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-themed-text-secondary mb-2">
                Client ID
              </label>
              <input
                type="text"
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                placeholder="Your GitHub OAuth App Client ID"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
            </div>

            <div>
              <label htmlFor="clientSecret" className="block text-sm font-medium text-themed-text-secondary mb-2">
                Client Secret
              </label>
              <div className="relative">
                <input
                  type={showClientSecret ? 'text' : 'password'}
                  id="clientSecret"
                  name="clientSecret"
                  value={formData.clientSecret}
                  onChange={handleChange}
                  placeholder="Your GitHub OAuth App Client Secret"
                  className="w-full px-3 py-2 pr-10 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-themed-text-muted hover:text-themed-text-primary"
                >
                  {showClientSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="scopes" className="block text-sm font-medium text-themed-text-secondary mb-2">
                Scopes
              </label>
              <input
                type="text"
                id="scopes"
                name="scopes"
                value={formData.scopes}
                onChange={handleChange}
                placeholder="user:email read:user"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
              <p className="mt-1 text-sm text-themed-text-muted">
                Space-separated list of GitHub OAuth scopes
              </p>
            </div>

            <div>
              <label htmlFor="redirectUrl" className="block text-sm font-medium text-themed-text-secondary mb-2">
                Authorization Callback URL
              </label>
              <input
                type="url"
                id="redirectUrl"
                name="redirectUrl"
                value={formData.redirectUrl}
                onChange={handleChange}
                placeholder="https://yourapp.com/auth/github/callback"
                className="w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-themed-border-primary">
              <button
                type="button"
                onClick={handleTestConnection}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-themed-text-primary bg-themed-bg-surface border border-themed-border-primary rounded-sm hover:bg-themed-interactive-secondary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test Connection
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-themed-text-inverse bg-themed-interactive-primary border border-transparent rounded-sm hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-themed-alert-info bg-opacity-10 border border-themed-alert-info rounded-lg p-6">
        <h3 className="text-sm font-medium text-themed-status-info mb-3">Setup Instructions</h3>
        <ol className="text-sm text-themed-text-secondary space-y-2 list-decimal list-inside">
          <li>
            Go to your GitHub settings → Developer settings → OAuth Apps
          </li>
          <li>
            Click "New OAuth App" or "Register a new application"
          </li>
          <li>
            Fill in your application details:
            <ul className="mt-1 ml-4 list-disc list-inside text-themed-text-muted">
              <li>Application name: Your app name</li>
              <li>Homepage URL: Your application's homepage</li>
              <li>Authorization callback URL: The redirect URL from above</li>
            </ul>
          </li>
          <li>
            After registering, copy the Client ID and generate a Client Secret
          </li>
          <li>
            Paste the Client ID and Client Secret into the form above
          </li>
          <li>
            Adjust the scopes as needed for your application
          </li>
          <li>
            Test the connection and save your configuration
          </li>
        </ol>
      </div>
    </div>
  )
}

export default GitHubAuth 