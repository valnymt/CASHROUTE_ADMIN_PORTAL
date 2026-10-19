import Ap07RejectReasonModal from '../screens/Ap07RejectReasonModal'
import Ap07RejectScrim from '../screens/Ap07RejectScrim'
import Ap07TeamAssignmentDrawer from '../screens/Ap07TeamAssignmentDrawer'

/**
 * In the Figma file the AP-07 overlays are separate top-level "Scrim" frames
 * placed on top of their screen frame (same canvas position). These composites
 * stack them the same way.
 */

/** Frame 3:596 + Scrim 3:767 (1440×900, contains the Reject modal). */
export function Ap07RejectReason() {
  return (
    <div className="relative size-full">
      <Ap07RejectReasonModal />
      <div className="absolute inset-0">
        <Ap07RejectScrim />
      </div>
    </div>
  )
}

/** Frame 3:784 + Scrim 3:955 (945×900 at the frame's top-left). */
export function Ap07TeamAssignment() {
  return (
    <div className="relative size-full">
      <Ap07TeamAssignmentDrawer />
      <div className="absolute bg-[rgba(66,24,105,0.4)] h-[900px] left-0 top-0 w-[945px]" data-node-id="3:955" data-name="Scrim" />
    </div>
  )
}
