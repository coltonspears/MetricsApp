import { useState } from 'react'
import { Building, Plus, Edit, Trash2, Users, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

const Organizations = () => {
  const [organizations] = useState([
    {
      id: '1',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      description: 'Main enterprise organization',
      userCount: 45,
      teamCount: 8,
      createdAt: '2024-01-15T10:00:00Z',
      status: 'active'
    },
    {
      id: '2',
      name: 'Development Team',
      slug: 'dev-team',
      description: 'Development and engineering teams',
      userCount: 12,
      teamCount: 3,
      createdAt: '2024-02-01T14:30:00Z',
      status: 'active'
    },
    {
      id: '3',
      name: 'Marketing Division',
      slug: 'marketing-div',
      description: 'Marketing and sales organization',
      userCount: 8,
      teamCount: 2,
      createdAt: '2024-02-10T09:15:00Z',
      status: 'inactive'
    }
  ])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full"
    if (status === 'active') {
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`
    }
    return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building className="h-8 w-8 text-emerald-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Organizations</h1>
              <p className="text-slate-600 dark:text-slate-400">
                Manage organizations and their settings
              </p>
            </div>
            <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
              Work in Progress
            </span>
          </div>
          <Link
            to="/admin/orgs/create"
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Plus className="h-4 w-4" />
            <span>Create Organization</span>
          </Link>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">All Organizations</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {org.name}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {org.description}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        /{org.slug}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-slate-900 dark:text-white">
                      <Users className="h-4 w-4 mr-1 text-slate-400" />
                      {org.userCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {org.teamCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(org.status)}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(org.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/admin/orgs/edit/${org.id}`}
                        className="text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-400"
                        title="Edit organization"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        title="Organization settings"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                        title="Delete organization"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Building className="h-8 w-8 text-emerald-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{organizations.length}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Total Organizations</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {organizations.reduce((sum, org) => sum + org.userCount, 0)}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Total Members</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {organizations.reduce((sum, org) => sum + org.teamCount, 0)}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Total Teams</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Organizations 