import * as React from "react"

/** Phone + tablet: sidebar opens as overlay sheet (hamburger menu). Desktop: persistent sidebar. */
const SIDEBAR_OVERLAY_MAX_WIDTH = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${SIDEBAR_OVERLAY_MAX_WIDTH}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth <= SIDEBAR_OVERLAY_MAX_WIDTH)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth <= SIDEBAR_OVERLAY_MAX_WIDTH)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
