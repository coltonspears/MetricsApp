import { LucideIcon } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: LucideIcon
  children?: React.ReactNode
}

const PlaceholderPage = ({ title, description, icon: Icon, children }: PlaceholderPageProps) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Icon className="h-8 w-8 text-emerald-600" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Work in Progress
          </span>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          {description} This page is currently under development.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700">
        <div className="p-12 text-center">
          <Icon className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Coming Soon
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            This feature is being actively developed and will be available soon.
          </p>
          {children}
        </div>
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Development Status</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          This page is part of our ongoing development efforts. Check back soon for updates, or contact the development team if you need this feature prioritized.
        </p>
      </div>
    </div>
  )
}

export default PlaceholderPage 