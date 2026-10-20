import { IconMenu } from '@/components/icons'

/** Page header: breadcrumb + title (and the menu button on phones/tablets). */
export default function Topbar({ crumbs, title, onMenu }: { crumbs: string[]; title: string; onMenu: () => void }) {
  return (
    <header className="flex min-h-[56px] items-center gap-3">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onMenu}
        className="glass grid size-11 shrink-0 place-items-center rounded-[22px] text-ink lg:hidden"
      >
        <IconMenu />
      </button>
      <div className="min-w-0 leading-normal">
        <p className="hidden truncate text-[12px] text-ink-60 sm:block">{['CashRoute', ...crumbs].join('  ›  ')}</p>
        <h1 className="truncate text-[22px] font-bold text-plum sm:text-[26px]">{title}</h1>
      </div>
    </header>
  )
}
