import { useState } from 'react'
import { GitBranch, Save, Eye, EyeOff } from 'lucide-react'

const GitHubAuth = () => {
  const [showClientSecret, setShowClientSecret] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    clientId: '',
    clientSecret: '',
    scopes: 'user:email',
    redirectUrl: ''
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <GitBranch className="h-8 w-8 text-emerald-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">GitHub OAuth Configuration</h1>
          <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Work in Progress
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Configure GitHub OAuth integration for user authentication. This page is currently under development.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="e.g., GitHub Login"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Client ID
              </label>
              <input
                type="text"
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                placeholder="Your GitHub OAuth App Client ID"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="clientSecret" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                  className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showClientSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="scopes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Scopes
              </label>
              <input
                type="text"
                id="scopes"
                name="scopes"
                value={formData.scopes}
                onChange={handleChange}
                placeholder="user:email read:user"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Space-separated list of GitHub OAuth scopes
              </p>
            </div>

            <div>
              <label htmlFor="redirectUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Authorization Callback URL
              </label>
              <input
                type="url"
                id="redirectUrl"
                name="redirectUrl"
                value={formData.redirectUrl}
                onChange={handleChange}
                placeholder="https://yourapp.com/auth/github/callback"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Test Connection
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Configuration</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Setup Instructions</h3>
        <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
          <li>Go to GitHub Settings → Developer settings → OAuth Apps</li>
          <li>Click "New OAuth App" and fill out the application details</li>
          <li>Set the Authorization callback URL to match your application</li>
          <li>Copy the Client ID and generate a Client Secret</li>
          <li>Configure the appropriate scopes for your application needs</li>
        </ol>
      </div>
    </div>
  )
}

export default GitHubAuth 