/** The four blurred "aura orbs" behind every screen in the Figma file. */
export default function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <img src="/assets/orb-violet.svg" alt="" className="absolute -top-[30%] -left-[25%] w-[60vw] min-w-[480px] max-w-none" />
      <img src="/assets/orb-lilac.svg" alt="" className="absolute -top-[35%] left-[45%] w-[50vw] min-w-[420px] max-w-none" />
      <img src="/assets/orb-blue.svg" alt="" className="absolute top-[45%] left-[5%] w-[50vw] min-w-[420px] max-w-none" />
      <img src="/assets/orb-lime.svg" alt="" className="absolute top-[55%] left-[60%] w-[55vw] min-w-[460px] max-w-none" />
    </div>
  )
}
