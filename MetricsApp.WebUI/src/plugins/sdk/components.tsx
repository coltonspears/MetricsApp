/**
 * Plugin SDK React Components
 * 
 * Pre-built components for common plugin UI patterns.
 */

import React, { 
  forwardRef, 
  type ComponentProps, 
  type ReactNode 
} from 'react';
import type { FormFieldDefinition } from './types';

// ============================================================================
// Form Components
// ============================================================================

interface FormFieldProps {
  field: FormFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Generic form field component that renders the appropriate input based on field type
 */
export function FormField({ field, value, onChange, error, disabled }: FormFieldProps) {
  const baseInputClass = `
    w-full px-3 py-2 rounded-md border transition-colors
    bg-[var(--bg-secondary)] border-[var(--border-primary)]
    text-[var(--text-primary)] placeholder-[var(--text-muted)]
    focus:outline-none focus:ring-2 focus:ring-[var(--interactive-primary)] focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'password':
        return (
          <input
            type={field.type}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            className={baseInputClass}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.valueAsNumber || null)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseInputClass}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            rows={4}
            className={baseInputClass}
          />
        );

      case 'select':
        return (
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            disabled={disabled}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--interactive-primary)] focus:ring-[var(--interactive-primary)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {field.description || 'Enable'}
            </span>
          </label>
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder={field.placeholder || '{}'}
            disabled={disabled}
            rows={6}
            className={`${baseInputClass} font-mono text-sm`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {field.label}
          {field.required && <span className="text-[var(--status-error)] ml-1">*</span>}
        </span>
      </label>
      
      {field.description && field.type !== 'boolean' && (
        <p className="text-xs text-[var(--text-muted)]">{field.description}</p>
      )}
      
      {renderInput()}
      
      {error && (
        <p className="text-xs text-[var(--status-error)]">{error}</p>
      )}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Section wrapper for grouping form fields
 */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ============================================================================
// Button Components
// ============================================================================

interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }, ref) => {
    const baseClass = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-[var(--interactive-primary)] text-white hover:bg-[var(--interactive-primary-hover)] focus:ring-[var(--interactive-primary)]',
      secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] focus:ring-[var(--interactive-primary)]',
      danger: 'bg-[var(--status-error)] text-white hover:opacity-90 focus:ring-[var(--status-error)]',
      ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] focus:ring-[var(--interactive-primary)]',
    };
    
    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={`${baseClass} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        ) : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================================
// Card Components
// ============================================================================

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function CardHeader({ title, description, actions }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between p-4 border-b border-[var(--border-primary)]">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardContent({ children, className = '' }: CardProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardProps) {
  return (
    <div className={`flex items-center justify-end gap-2 p-4 border-t border-[var(--border-primary)] ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// Status & Feedback Components
// ============================================================================

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ type, title, children, onClose }: AlertProps) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  return (
    <div className={`rounded-lg border p-4 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {title && <h4 className="font-medium mb-1">{title}</h4>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizes[size]} ${className}`} />
  );
}

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const styles = {
    connected: 'bg-green-500/20 text-green-400 border-green-500/30',
    disconnected: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  const labels = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
    pending: 'Pending',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label || labels[status]}
    </span>
  );
}

// ============================================================================
// Connection Test Component
// ============================================================================

interface ConnectionTestProps {
  onTest: () => Promise<{ success: boolean; message?: string; latencyMs?: number }>;
  disabled?: boolean;
}

export function ConnectionTest({ onTest, disabled }: ConnectionTestProps) {
  const [testing, setTesting] = React.useState(false);
  const [result, setResult] = React.useState<{
    success: boolean;
    message?: string;
    latencyMs?: number;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await onTest();
      setResult(res);
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant="secondary"
        onClick={handleTest}
        loading={testing}
        disabled={disabled || testing}
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </Button>

      {result && (
        <Alert type={result.success ? 'success' : 'error'}>
          {result.message || (result.success ? 'Connection successful!' : 'Connection failed')}
          {result.success && result.latencyMs !== undefined && (
            <span className="ml-2 opacity-70">({result.latencyMs}ms)</span>
          )}
        </Alert>
      )}
    </div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="mb-4 text-[var(--text-muted)] opacity-50">{icon}</div>
      )}
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

