import { useState } from 'react'
import { Shield, Save, Eye, EyeOff } from 'lucide-react'

const AzureAuth = () => {
  const [showToken, setShowToken] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    tenantId: '',
    clientId: '',
    personalAccessToken: '',
    organization: '',
    scopes: 'https://graph.microsoft.com/.default'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Azure PAT Configuration:', formData)
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
          <Shield className="h-8 w-8 text-emerald-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Azure PAT Configuration</h1>
          <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Work in Progress
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Configure Azure Personal Access Token integration for user authentication. This page is currently under development.
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
                placeholder="e.g., Azure DevOps Login"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="tenantId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tenant ID
              </label>
              <input
                type="text"
                id="tenantId"
                name="tenantId"
                value={formData.tenantId}
                onChange={handleChange}
                placeholder="Your Azure AD Tenant ID"
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
                placeholder="Your Azure App Registration Client ID"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="personalAccessToken" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Personal Access Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  id="personalAccessToken"
                  name="personalAccessToken"
                  value={formData.personalAccessToken}
                  onChange={handleChange}
                  placeholder="Your Azure DevOps Personal Access Token"
                  className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Organization
              </label>
              <input
                type="text"
                id="organization"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                placeholder="Your Azure DevOps Organization"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
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
                placeholder="https://graph.microsoft.com/.default"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Space-separated list of Azure AD scopes
              </p>
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
          <li>Create an App Registration in Azure Active Directory</li>
          <li>Generate a Personal Access Token in Azure DevOps</li>
          <li>Configure the appropriate permissions and scopes</li>
          <li>Copy the Tenant ID, Client ID, and Personal Access Token</li>
          <li>Set up the organization and scope configuration</li>
        </ol>
      </div>
    </div>
  )
}

export default AzureAuth 