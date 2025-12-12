function Button({ children, onClick, className = '', variant = 'default', ...props }) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none'
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2',
    ghost: 'bg-transparent text-foreground hover:bg-transparent hover:text-foreground px-4 py-2',
    outline: 'border border-black/10 bg-background hover:bg-accent px-4 py-2',
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button

