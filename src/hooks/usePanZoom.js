import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_SCALE = 0.2
const MAX_SCALE = 2
const DRAG_THRESHOLD = 3

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/**
 * Drag to pan, two-finger scroll to pan, pinch or ctrl/cmd + wheel to zoom.
 * Elements marked with `data-no-pan` don't start a drag.
 */
export function usePanZoom() {
  const containerRef = useRef(null)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef(null)
  const draggedRef = useRef(false)

  const zoomAt = useCallback((factor, px, py) => {
    setView((v) => {
      const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE)
      const ratio = scale / v.scale
      return { scale, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio }
    })
  }, [])

  const zoomBy = useCallback(
    (factor) => {
      const el = containerRef.current
      if (el) zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2)
    },
    [zoomAt],
  )

  const centerOn = useCallback((x, y) => {
    const el = containerRef.current
    if (!el) return
    setView((v) => ({
      ...v,
      x: el.clientWidth / 2 - x * v.scale,
      y: el.clientHeight / 2 - y * v.scale,
    }))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect()
        const delta = clamp(e.deltaY, -50, 50)
        zoomAt(Math.exp(-delta * 0.01), e.clientX - rect.left, e.clientY - rect.top)
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('[data-no-pan]')) return
    dragRef.current = { x: e.clientX, y: e.clientY, viewX: view.x, viewY: view.y }
    draggedRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.x
    const dy = e.clientY - drag.y
    if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) draggedRef.current = true
    setView((v) => ({ ...v, x: drag.viewX + dx, y: drag.viewY + dy }))
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const wasDragged = () => draggedRef.current

  return {
    containerRef,
    view,
    zoomBy,
    centerOn,
    wasDragged,
    panHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
