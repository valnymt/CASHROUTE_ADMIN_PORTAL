import type { ReactNode } from 'react'
import Backdrop from '@/components/Backdrop'
import Logo from '@/components/Logo'

/** Centered glass card used by the AP-01 sign-in screens. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <Backdrop />
      <div className="glass animate-pop-in w-full max-w-[448px] rounded-[28px] p-6 sm:p-9">
        <Logo />
        {children}
      </div>
    </main>
  )
}
