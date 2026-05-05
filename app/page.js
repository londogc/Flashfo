'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const canvasRef = useRef(null)

  useEffect(() => {
    const css = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #050709; color: #e2e8f0; }
#canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
.content { position: relative; z-index: 1; }
nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 16px 48px; display: flex; align-items: center; justify-content: space-between; }
.hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 120px 48px 80px; }
h1 { font-size: clamp(52px, 6.5vw, 88px); font-weight: 900; margin-bottom: 20px; padding-bottom: 0.4em; line-height: 1.05; }
.line { background: linear-gradient(135deg, #fff 0%, #a78bfa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: block; }
p { font-size: clamp(16px, 1.5vw, 19px); color: rgba(255,255,255,0.5); max-width: 600px; margin: 20px auto 40px; }
.buttons { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
button { padding: 15px 32px; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-primary { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; }
.btn-secondary { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.75); }
@media (max-width: 768px) { nav { padding: 12px 20px; } .hero { padding: 100px 20px 70px; } h1 { font-size: clamp(36px, 11vw, 58px); padding-bottom: 0.4em; } .buttons { flex-direction: column; } button { width: 100%; max-width: 320px; } }`
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl')
    if (!gl) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div>
      <canvas ref={canvasRef} id="canvas" />
      <div className="content">
        <nav>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>Flashfo</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => router.push('/login')}>Log in</button>
            <button className="btn-primary" onClick={() => router.push('/signup')}>Sign up</button>
          </div>
        </nav>
        <section className="hero">
          <h1>
            <span className="line">Study smarter.</span>
            <span className="line">Teach better.</span>
            <span className="line">Together.</span>
          </h1>
          <p>Nova builds personalized flashcards and study guides in seconds.</p>
          <div className="buttons">
            <button className="btn-primary" onClick={() => router.push('/signup')}>Get started</button>
            <button className="btn-secondary">Learn more</button>
          </div>
        </section>
      </div>
    </div>
  )
}