import { asset } from '@/lib/base'

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-[50px] shrink-0 place-items-center rounded-[18px] bg-black shadow-[0_4px_18px_0_rgba(150,215,76,0.55)]">
        <img src={asset('/images/logo.png?v=2')} alt="" className="size-[40px] object-contain" />
      </div>
      {!compact && (
        <div className="leading-tight font-bold">
          <p className="text-[22px] text-ink">CashRoute</p>
          <p className="text-[10px] text-violet">HQ ADMIN</p>
        </div>
      )}
    </div>
  )
}
