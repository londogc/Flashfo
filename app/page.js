'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const canvasRef = useRef(null)

  useEffect(() => {
    const css = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; }
      body { font-family: -apple-system, sans-serif; background: #050709; color: #e2e8f0; }
      #canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
      .content { position: relative; z-index: 1; }
      nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 16px 48px; display: flex; align-items: center; justify-content: space-between; background: rgba(5,7,9,0.8); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.08); }
      .logo { font-size: 20px; font-weight: 800; color: #e2e8f0; text-decoration: none; }
      .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 120px 48px 80px; }
      h1 { font-size: clamp(52px, 6.5vw, 88px); font-weight: 900; margin-bottom: 20px; padding-bottom: 0.4em; line-height: 1.05; }
      .line { background: linear-gradient(135deg, #fff 0%, #a78bfa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: block; }
      p { font-size: clamp(16px, 1.5vw, 19px); color: rgba(255,255,255,0.5); max-width: 600px; margin: 20px auto 40px; }
      .buttons { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
      button { padding: 15px 32px; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
      .btn-primary { background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; box-shadow: 0 8px 28px rgba(99, 102, 241, 0.45); }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(99, 102, 241, 0.6); }
      .btn-secondary { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.75); }
      .btn-secondary:hover { background: rgba(255,255,255,0.11); border-color: rgba(255,255,255,0.28); }
      @media (max-width: 768px) {
        nav { padding: 12px 20px; }
        .hero { padding: 100px 20px 70px; }
        h1 { font-size: clamp(36px, 11vw, 58px); padding-bottom: 0.4em; }
        .buttons { flex-direction: column; }
        button { width: 100%; max-width: 320px; }
      }
    `
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl~') || canvas.getContext('experimental-webgl')
    if (!gl) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const vShader = `attribute vec2 a_p; void main() { gl_Position = vec4(a_p, 0.0, 1.0); }`
    const fShader = `precision mediump float; uniform float u_t; uniform vec2 u_r: 
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i),hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main() {
        vec2 uv = (gl_FragCoord.xy - u_r * 0.5) / min(u_r.x, u_r.y);
        float n = noise(uv * 2.0 + u_t * 0.2);
        vec3 col = mix(vec3(0.05, 0.03, 0.15), vec3(0.1, 0.08, 0.3), n);
        gl_FragColor = vec4(col, 1.0);
      }`

    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s }
    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADRPvShader))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADRPfShader))
    gl.linkProg(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(prog, 'a_p')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
    const uT = gl.getUniformLocation(prog, 'u_t')
    const uR = gl.getUniformLocation(prog, 'u_r')

    let raf, start = performance.now()
    const render = () => {
      const t = (performance.now() - start) / 1000
      gl.uniform1f(uT, t)
      gl.uniform2f(uR, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(render)
    }
    render()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div>
      <canvas ref={canvasRef} id="canvas" />
      <div className="content">
        <nav>
          <a href="/" className="logo">Flashfo</a>
          <div>
            <button className="btn-secondary" onClick={() => router.push('/login')} style={{ marginRight: '8px' }}>Log in</button>
            <button className="btn-primary" onClick={() => router.push('/signup')}>Sign up</button>
          </div>
        </nav>
        <section className="hero">
          <h1>
            <span className="line">Study smarter.</span>
            <span className="line">Teach better.</span>
            <span className="line">Together.</span>
          </h1>
          <p>Nova builds personalized flashcards, quizzes, and study guides in seconds â€” tailored to your exact curriculum.</p>
          <div className="buttons">
            <button className="btn-primary" onClick={() => router.push('/signup')}>Get started â†’</button>
            <button className="btn-secondary">Learn more</button>
          </div>
        </section>
      </div>
    </div>
  )
}
