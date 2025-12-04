import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
  className?: string
  children?: ReactNode
}

const PageHeader = ({ title, description, meta, actions, className, children }: PageHeaderProps) => {
  const classes = ['page-header', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <div className="space-y-3">
        {meta ? <div className="page-meta">{meta}</div> : null}
        <div>
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-subtitle">{description}</p> : null}
        </div>
        {children}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  )
}

export default PageHeader
