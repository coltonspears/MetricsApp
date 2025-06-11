import { DiMsqlServer } from 'react-icons/di'
import { SiPrometheus } from 'react-icons/si'
import { Database } from 'lucide-react'

interface DataSourceIconProps {
  dataSourceType: string
  className?: string
}

const DataSourceIcon = ({ dataSourceType, className = "h-5 w-5" }: DataSourceIconProps) => {
  const getIcon = () => {
    switch (dataSourceType.toLowerCase()) {
      case 'sqlserver':
      case 'sql server':
        return <DiMsqlServer className={className} />
      case 'prometheus':
        return <SiPrometheus className={className} />
      case 'mysql':
      case 'postgresql':
      case 'postgres':
        return <Database className={className} />
      case 'elasticsearch':
      case 'influxdb':
      case 'redis':
        return <Database className={className} />
      default:
        return <Database className={className} />
    }
  }

  return getIcon()
}

export default DataSourceIcon 