'use client'
import { useState, useEffect } from 'react'

export default function UploadInput({ value, onChange, onText, placeholder, rows = 5 }) {
  const [internal, setInternal] = useState(value || '')

  // Stay in sync if parent resets value
  useEffect(() => { if (value !== undefined) setInternal(value) }, [value])

  function handleChange(e) {
    setInternal(e.target.value)
    onChange?.(e)
    onText?.(e.target.value)
  }

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const text = (await file.text()).substring(0, 12000)
      setInternal(text)
      onChange?.({ target: { value: text } })
      onText?.(text)
    } catch { alert('Could not read file.') }
    e.target.value = ''
  }

  const id = 'ff-upload-' + Math.random().toString(36).slice(2,6)

  return (
    <div>
      <textarea value={internal} onChange={handleChange} placeholder={placeholder} rows={rows}
        className="w-full text-sm text-t1 bg-transparent resize-none outline-none placeholder:text-t3"/>
      <div className="flex items-center gap-4 pt-2 mt-1 border-t border-line">
        <input type="file" accept=".txt,.md,.csv" className="hidden" id={id} onChange={handleFile}/>
        <label htmlFor={id} className="flex items-center gap-1.5 text-[11px] text-t3 hover:text-blue-500 cursor-pointer transition-colors select-none">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9v5h10V9M8 1v8M5 4l3-3 3 3"/>
          </svg>
          Upload .txt file
        </label>
        <span className="text-[10px] text-t3">or paste text above</span>
      </div>
    </div>
  )
}
