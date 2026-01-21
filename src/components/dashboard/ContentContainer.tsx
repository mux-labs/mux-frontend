interface ContentContainerProps {
  children: React.ReactNode
  className?: string
}

export function ContentContainer({ children, className = '' }: ContentContainerProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`}>
      {children}
    </div>
  )
}