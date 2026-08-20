import { useEffect, useRef, useState, type ReactNode } from 'react'
import { sfxConfirm, sfxCursor } from '../audio/sfx'

export function Win({
  title,
  children,
  className = '',
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`win ${className}`}>
      {title && <h2 className="win-title">{title}</h2>}
      {children}
    </section>
  )
}

export function MenuItem({
  label,
  hint,
  note,
  onSelect,
  disabled,
  checked,
}: {
  label: string
  hint?: string
  note?: string
  onSelect: () => void
  disabled?: boolean
  checked?: boolean
}) {
  return (
    <button
      type="button"
      className={`menu-item${checked ? ' checked' : ''}`}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        sfxCursor()
        onSelect()
      }}
    >
      <span className="cursor">{checked ? '✔' : disabled ? '　' : '▶'}</span>
      <span className="label">{label}</span>
      {hint && <span className="hint">{hint}</span>}
      {note && <span className="done">{note}</span>}
    </button>
  )
}

export function Button({
  children,
  onClick,
  variant,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'primary' | 'danger'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`btn${variant ? ` btn--${variant}` : ''}`}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        sfxConfirm()
        onClick()
      }}
    >
      {children}
    </button>
  )
}

/** 1文字ずつ表示するメッセージ。タップで全文表示 */
export function TypedText({ text, speed = 18 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    setShown(0)
    if (timer.current) window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          if (timer.current) window.clearInterval(timer.current)
          return n
        }
        return n + 1
      })
    }, speed)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [text, speed])

  const done = shown >= text.length

  return (
    <div className="msg" onClick={() => setShown(text.length)}>
      {text.slice(0, shown)}
      {!done && <span className="dim">▍</span>}
    </div>
  )
}
