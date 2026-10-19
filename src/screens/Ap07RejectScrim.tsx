/** Figma top-level frame 3:767 "Scrim" — layered over frame 3:596 (AP-07 · Reject Reason). */
export default function Scrim() {
  return (
    <div className="bg-[rgba(66,24,105,0.4)] relative size-full" data-node-id="3:767" data-name="Scrim">
      <div className="absolute border border-[rgba(255,255,255,0.95)] border-solid content-stretch flex flex-col gap-[14px] items-start left-[502px] overflow-clip p-[26px] rounded-[28px] shadow-[0px_10px_28px_0px_rgba(66,24,105,0.09)] top-[303px] w-[540px]" data-node-id="3:768" data-name="Reject modal">
        <div aria-hidden className="absolute backdrop-blur-[14px] bg-[rgba(255,255,255,0.92)] inset-0 pointer-events-none rounded-[28px]" />
        <div className="content-stretch flex items-center justify-between overflow-clip relative shrink-0 w-full" data-node-id="3:769" data-name="Frame">
          <p className="[word-break:break-word] font-['Plus_Jakarta_Sans'] font-bold leading-[normal] relative shrink-0 text-[#421869] text-[22px] whitespace-nowrap" data-node-id="3:770">
            Reject REQ-1048
          </p>
          <a className="bg-[rgba(42,16,71,0.06)] content-stretch cursor-pointer flex flex-col items-center justify-center overflow-clip relative rounded-[16px] shrink-0 size-[32px]" data-node-id="3:771" data-name="link:detail Close">
            <p className="[word-break:break-word] font-['Plus_Jakarta_Sans'] font-normal leading-[normal] relative shrink-0 text-[12px] text-[rgba(42,16,71,0.6)] text-left whitespace-nowrap" data-node-id="3:772">
              ✕
            </p>
          </a>
        </div>
        <p className="[word-break:break-word] font-['Plus_Jakarta_Sans'] font-normal leading-[normal] relative shrink-0 text-[14px] text-[rgba(42,16,71,0.6)] w-full" data-node-id="3:773">
          The Maker will be notified. A reason is required.
        </p>
        <div className="content-stretch flex flex-col gap-[6px] items-start overflow-clip relative shrink-0 w-full" data-node-id="3:774" data-name="Frame">
          <p className="[word-break:break-word] font-['Plus_Jakarta_Sans'] font-semibold leading-[normal] relative shrink-0 text-[12px] text-[rgba(42,16,71,0.6)] whitespace-nowrap" data-node-id="3:775">
            Reason for rejection *
          </p>
          <div className="bg-[rgba(255,255,255,0.8)] border border-[#e5484d] border-solid content-stretch flex flex-col h-[110px] items-start overflow-clip px-[16px] py-[12px] relative rounded-[18px] shrink-0 w-full" data-node-id="3:776" data-name="Reason textarea (required)">
            <p className="[word-break:break-word] font-['Plus_Jakarta_Sans'] font-normal leading-[normal] relative shrink-0 text-[14px] text-[rgba(42,16,71,0.38)] whitespace-nowrap" data-node-id="3:777">
              Explain why this request is being rejected…
            </p>
          </div>
          <p className="[word-break:break-word] font-['Plus_Jakarta_Sans'] font-normal leading-[normal] relative shrink-0 text-[#e5484d] text-[11px] whitespace-nowrap" data-node-id="3:778">
            Required — submission is blocked until a reason is entered.
          </p>
        </div>
        <div className="content-stretch cursor-pointer flex gap-[10px] items-start justify-end overflow-clip relative shrink-0 w-full" data-node-id="3:779" data-name="Footer">
          <a className="bg-[rgba(255,255,255,0.7)] border border-[rgba(255,255,255,0.95)] border-solid content-stretch flex items-center justify-center overflow-clip px-[20px] py-[11px] relative rounded-[30px] shrink-0" data-node-id="3:780" data-name="link:detail Cancel">
            <p className="[word-break:break-word] font-['Plus_Jakarta_Sans'] font-bold leading-[normal] relative shrink-0 text-[#2a1047] text-[14px] text-left whitespace-nowrap" data-node-id="3:781">
              Cancel
            </p>
          </a>
          <a className="bg-[rgba(229,72,77,0.12)] border border-[rgba(229,72,77,0.4)] border-solid content-stretch flex items-center justify-center overflow-clip px-[20px] py-[11px] relative rounded-[30px] shrink-0" data-node-id="3:782" data-name="link:approvals Confirm reject">
            <p className="[word-break:break-word] font-['Plus_Jakarta_Sans'] font-bold leading-[normal] relative shrink-0 text-[#e5484d] text-[14px] text-left whitespace-nowrap" data-node-id="3:783">
              Confirm reject
            </p>
          </a>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1.5px_1.5px_0px_rgba(255,255,255,0.95)]" />
      </div>
    </div>
  );
}
