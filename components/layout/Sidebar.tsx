'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Users, LogOut, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types'
import { clsx } from 'clsx'

export default function Sidebar({ usuario }: { usuario: Usuario | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/clientes', label: 'Clientes', icon: Users },
  ]

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-abk-red rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-abk-red leading-none">ABK</p>
            <p className="text-xs text-gray-400 leading-none mt-0.5">Pragmia</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-abk-red-light text-abk-red'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-medium text-gray-800 truncate">{usuario?.nombre || 'Usuario'}</p>
          <p className="text-xs text-gray-400 truncate">{usuario?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
