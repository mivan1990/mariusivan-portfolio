interface AvatarProps {
  url: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }

export default function Avatar({ url, name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeMap[size]} rounded-full object-cover border border-gray-700`}
      />
    )
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gray-700 flex items-center justify-center font-bold text-yellow-500 border border-gray-600`}
    >
      {initials}
    </div>
  )
}
