export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-[50px] shrink-0 place-items-center rounded-[18px] bg-black shadow-[0_4px_18px_0_rgba(150,215,76,0.55)]">
        <img src="/assets/logo.png" alt="" className="h-[44px] w-[40px] -scale-y-100 object-cover" />
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
