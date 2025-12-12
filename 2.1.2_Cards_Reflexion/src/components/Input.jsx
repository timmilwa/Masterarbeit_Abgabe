function Input({ placeholder, value, onChange, className = '', ...props }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full bg-white rounded-lg px-3 py-2 text-base text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-[3px] ${className}`}
      {...props}
    />
  )
}

export default Input






