import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface BreadcrumbDropdownItem {
  id: string
  name: string
  href: string
}

export default function BreadcrumbDropdown({
  items,
  currentId,
  onSelect,
}: {
  items: BreadcrumbDropdownItem[]
  currentId: string
  onSelect?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = items.find(i => i.id === currentId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block align-middle">
      <button
        className="flex items-center px-2 py-1 rounded transition-colors btn-themed-secondary font-medium"
        style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)', fontSize: 'var(--text-sm)' }}
        onClick={() => setOpen(o => !o)}
      >
        {current?.name || currentId}
        <ChevronDown className="ml-1 h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-56 bg-white border border-themed-border-primary rounded shadow z-10" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}>
          {items.map(item => (
            <Link
              key={item.id}
              to={item.href}
              className={`block px-4 py-2 transition-colors ${item.id === currentId ? 'font-bold' : ''}`}
              style={{ color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
              onClick={() => {
                setOpen(false)
                onSelect?.(item.id)
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                e.currentTarget.style.color = 'var(--text-accent)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 