'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const LP_CSS = \`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
.lp-root *,.lp-root *::before,.lp-root *::after{box-sizing:border-box;margin:0;padding:0}
.lp-root{font-family:'Inter',-apple-system,sans-serif;background:#050709;color:#e2e8f0;overflow-x:hidden;position:relative}
#lp-canvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none}
.lp-nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:16px 48px;display:flex;align-items:center;justify-content:space-between;transition:background .3s,border-color .3s,backdrop-filter .3s;border-bottom:1px solid transparent}
.lp-nav.lp-scrolled{background:rgba(5,7,9,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-color:rgba(255,255,255,0.08)}
.lp-logo-wrap{display:flex;align-items:center;gap:10px;text-decoration:none}
.lp-logo-box{position:relative;width:36px;height:36px;flex-shrink:0}
.lp-logo-ring{position:absolute;inset:-3px;border-radius:12px;background:conic-gradient(#3b82f6,#8b5cf6,#a78bfa,#3b82f6);animation:lp-spin 3s linear infinite}
.lp-logo-inner{position:absolute;inset:2px;border-radius:9px;background:#080b12;display:flex;align-items:center;justify-content:center}
@keyframes lp-spin{to{transform:rotate(360deg)}}
.lp-logo-name{font-size:18px;font-weight:800;color:#e2e8f0;letter-spacing:-.02em}
.lp-nav-links{display:flex;align-items:center;gap:32px}
.lp-nav-links a{font-size:14px;font-weight:500;color:rgba(255,255,255,0.55);text-decoration:none;transition:color .2s}
.lp-nav-links a:hover{color:#e2e8f0}
.lp-nav-buttons{display:flex;align-items:center;gap:8px}
.lp-btn-secondary{padding:8px 16px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.75);background:transparent;cursor:pointer;transition:all .2s}
.lp-btn-secondary:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.25)}
.lp-content{position:relative;z-index:1}
.lp-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 48px 80px}
.lp-hero-title{font-size:clamp(52px,6.5vw,88px);font-weight:900;margin-bottom:20px;padding-bottom:0.4em;line-height:1.05;letter-spacing:-.02em}
.lp-hero-line{background:linear-gradient(135deg,#fff 0%,#a78bfa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;display:block}
.lp-hero-subtitle{font-size:clamp(16px,1.5vw,19px);color:rgba(255,255,255,0.5);max-width:600px;margin:20px auto 40px}
.lp-hero-buttons{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:60px}
.lp-btn-primary{padding:15px 32px;border:none;border-radius:12px;font-size:16px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%);cursor:pointer;transition:all .2s}
.lp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 20px 40px rgba(37,99,235,0.3)}
.lp-classroom{padding:60px 48px;margin:0 auto;max-width:1200px}
.lp-section-title{font-size:32px;font-weight:800;margin-bottom:40px;text-align:center}
.lp-classroom-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-bottom:40px}
.lp-classroom-card{padding:20px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.02);transition:all .3s}
.lp-classroom-card:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.2)}
.lp-classroom-card h3{font-size:18px;font-weight:700;margin-bottom:12px;color:#fff}
.lp-classroom-card p{font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6}
.lp-pricing{padding:80px 48px;background:linear-gradient(180deg,rgba(37,99,235,0.05) 0%,rgba(124,58,237,0.05) 100%);margin:60px 0}
.lp-pricing-toggle{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:40px}
.lp-pricing-label{font-size:14px;font-weight:600;color:rgba(255,255,255,0.75)}
.lp-toggle-switch{position:relative;width:52px;height:28px;background:rgba(255,255,255,0.1);border-radius:14px;cursor:pointer;transition:background .3s}
.lp-toggle-switch.lp-active{background:linear-gradient(135deg,#2563eb,#7c3aed)}
.lp-toggle-knob{position:absolute;top:2px;left:2px;width:24px;height:24px;background:#fff;border-radius:12px;transition:left .3s;box-shadow:0 2px 8px rgba(0,0,0,0.2)}
.lp-toggle-switch.lp-active .lp-toggle-knob{left:26px}
.lp-pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;max-width:1000px;margin:0 auto}
.lp-pricing-card{padding:32px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.02);position:relative;transition:all .3s}
.lp-pricing-card:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.2);transform:translateY(-4px)}
.lp-pricing-card h3{font-size:20px;font-weight:700;margin-bottom:8px}
.lp-pricing-badge{position:absolute;top:-12px;right:20px;padding:6px 12px;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:6px;font-size:11px;font-weight:700;color:#fff}
.lp-pricing-price{font-size:clamp(32px,5vw,48px);font-weight:900;margin:20px 0;color:#fff}
.lp-pricing-price-subtitle{font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:20px}
.lp-pricing-features{list-style:none;margin:24px 0;padding:0}
.lp-pricing-features li{padding:10px 0;font-size:14px;color:rgba(255,255,255,0.7);border-bottom:1px solid rgba(255,255,255,0.05)}
.lp-pricing-features li:before{content:'✓';color:#2563eb;font-weight:700;margin-right:8px}
.lp-pricing-cta{width:100%;padding:12px 24px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:20px}
.lp-pricing-primary .lp-pricing-cta{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff}
.lp-pricing-primary .lp-pricing-cta:hover{transform:translateY(-2px)}
.lp-pricing-secondary .lp-pricing-cta{background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.2)}
.lp-pricing-secondary .lp-pricing-cta:hover{background:rgba(255,255,255,0.05)}
.lp-features{padding:80px 48px;max-width:1200px;margin:0 auto}
.lp-features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:32px;margin-bottom:60px}
.lp-feature-card{padding:24px;border:1px solid rgba(255,255,255,0.1);border-radius:12px;background:rgba(255,255,255,0.02);transition:all .3s}
.lp-feature-card:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.2)}
.lp-feature-icon{font-size:32px;margin-bottom:16px}
.lp-feature-card h3{font-size:18px;font-weight:700;margin-bottom:12px}
.lp-feature-card p{font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6}
.lp-footer{padding:60px 48px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(5,7,9,0.5);margin-top:100px}
.lp-footer-content{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:40px;margin-bottom:40px}
.lp-footer-col h4{font-size:14px;font-weight:700;color:#fff;margin-bottom:16px}
.lp-footer-col a{display:block;font-size:13px;color:rgba(255,255,255,0.6);text-decoration:none;margin-bottom:10px;transition:color .2s}
.lp-footer-col a:hover{color:#fff}
.lp-footer-bottom{border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;text-align:center;font-size:13px;color:rgba(255,255,255,0.5)}
.lp-rock{animation:lp-rock 0.6s ease-in-out infinite}
@keyframes lp-rock{0%,100%{transform:rotate(0deg)translate(0,0)}25%{transform:rotate(-8deg)translate(-2px,-4px)}75%{transform:rotate(8deg)translate(2px,-4px)}}
@media(max-width:768px){
.lp-nav{padding:12px 20px}
.lp-hero{padding:100px 20px 70px}
.lp-hero-title{font-size:clamp(36px,11vw,58px);padding-bottom:0.4em}
.lp-hero-buttons{flex-direction:column}
.lp-btn-primary,.lp-btn-secondary{width:100%;max-width:320px}
.lp-classroom{padding:40px 20px}
.lp-pricing{padding:60px 20px;margin:40px 0}
.lp-features{padding:60px 20px}
.lp-footer{padding:40px 20px}
}
\`;

const CLASSROOM_Qs = [
  { id: 1, text: 'What is photosynthesis?', topic: 'Biology', teacher: 'Ms. Chen', responses: 24 },
  { id: 2, text: 'Solve for x: 3x + 7 = 22', topic: 'Math', teacher: 'Mr. Smith', responses: 18 },
  { id: 3, text: 'Name 3 causes of WWI', topic: 'History', teacher: 'Ms. Garcia', responses: 31 }
];

const FLASHCARDS = [
  { id: 1, front: 'Mitochondria', back: 'Powerhouse of the cell', deck: 'Biology 101' },
  { id: 2, front: 'Photosynthesis', back: 'Process using light to convert CO₂ to glucose', deck: 'Biology 101' },
  { id: 3, front: 'Osmosis', back: 'Water movement across semipermeable membrane', deck: 'Biology 101' }
];

const STUDENT_FEED = [
  { user: 'Alex', action: 'completed', item: 'Biology Midterm flashcards', time: '2 min ago' },
  { user: 'Jordan', action: 'joined', item: 'AP Calc study group', time: '15 min ago' },
  { user: 'Sam', action: 'mastered', item: 'Spanish vocabulary set', time: '1 hour ago' }
];

const SRS_DATA = [
  { name: 'New', count: 24, color: '#3b82f6' },
  { name: 'Learning', count: 38, color: '#f59e0b' },
  { name: 'Review', count: 56, color: '#8b5cf6' },
  { name: 'Mastered', count: 112, color: '#10b981' }
];

const TOPICS = [
  'Biology', 'Chemistry', 'Physics', 'Math', 'History', 'Spanish', 'English', 'Economics'
];

const STUDENTS = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn'];

const NOVA_FEATS = [
  { icon: '✨', title: 'AI Flashcard Generator', desc: 'Create cards from notes in seconds' },
  { icon: '📊', title: 'Smart Review Schedule', desc: 'Science-based spacing algorithm' },
  { icon: '👥', title: 'Classroom Integration', desc: 'Teachers create, students learn together' },
  { icon: '🎯', title: 'Progress Tracking', desc: 'Real-time insights into mastery' },
  { icon: '🔊', title: 'Audio Support', desc: 'Listen to pronunciation & definitions' },
  { icon: '🌍', title: 'Multilingual', desc: 'Study in 30+ languages' }
];

const DECKHEALTH = [
  { name: 'Bio 101', cards: 48, health: 72, color: '#10b981' },
  { name: 'Calculus', cards: 36, health: 58, color: '#f59e0b' },
  { name: 'Spanish', cards: 52, health: 85, color: '#3b82f6' },
  { name: 'History', cards: 41, health: 61, color: '#8b5cf6' }
];

const PERF = [
  { day: 'Mon', score: 62 },
  { day: 'Tue', score: 75 },
  { day: 'Wed', score: 68 },
  { day: 'Thu', score: 81 },
  { day: 'Fri', score: 89 },
  { day: 'Sat', score: 76 },
  { day: 'Sun', score: 84 }
];

export default function LandingPage() {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [scrollY, setScrollY] = useState(0)
  const [isAnnual, setIsAnnual] = useState(false)
  const [flipped, setFlipped] = useState({})
  const [currentQ, setCurrentQ] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = LP_CSS
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
    <div className="lp-root">
      <canvas ref={canvasRef} id="lp-canvas" />
      <div className="lp-content">
        <nav className={\`lp-nav ${scrollY > 50 ? 'lp-scrolled' : ''}\`}>
          <a href="#" className="lp-logo-wrap">
            <div className="lp-logo-box">
              <div className="lp-logo-ring" />
              <div className="lp-logo-inner">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L14 8H6L10 2Z" fill="#3b82f6" />
                </svg>
              </div>
            </div>
            <span className="lp-logo-name">Flashfo</span>
          </a>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#classroom">Learn</a>
          </div>
          <div className="lp-nav-buttons">
            <button className="lp-btn-secondary" onClick={() => router.push('/login')}>Log in</button>
            <button className="lp-btn-primary" onClick={() => router.push('/signup')}>Sign up</button>
          </div>
        </nav>

        <section className="lp-hero">
          <h1 className="lp-hero-title">
            <span className="lp-hero-line">Study smarter.</span>
            <span className="lp-hero-line">Teach better.</span>
            <span className="lp-hero-line">Together.</span>
          </h1>
          <p className="lp-hero-subtitle">Nova builds personalized flashcards and study guides in seconds. Teachers create, students master, everyone grows.</p>
          <div className="lp-hero-buttons">
            <button className="lp-btn-primary" onClick={() => router.push('/signup')}>Get started free</button>
            <button className="lp-btn-secondary">Watch demo</button>
          </div>
        </section>

        <section className="lp-classroom" id="classroom">
          <h2 className="lp-section-title">Live Classroom Questions</h2>
          <div className="lp-classroom-grid">
            {CLASSROOM_Qs.map((q, i) => (
              <div key={q.id} className="lp-classroom-card" onClick={() => setCurrentQ(i)}>
                <h3>{q.text}</h3>
                <p>{q.topic} • {q.responses} responses</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', padding: '20px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Question: <strong>{CLASSROOM_Qs[currentQ]?.text}</strong></p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>{CLASSROOM_Qs[currentQ]?.responses} students answering in real-time</p>
          </div>
        </section>

        <section className="lp-classroom" style={{ paddingBottom: '40px' }}>
          <h2 className="lp-section-title">Sample Flashcard Deck</h2>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            {FLASHCARDS[0] && (
              <div style={{ padding: '40px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.1))', cursor: 'pointer', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }} onClick={() => setFlipped(f => ({ ...f, 0: !f[0] }))}>
                <div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>Click to flip</p>
                  <p style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{flipped[0] ? FLASHCARDS[0].back : FLASHCARDS[0].front}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="lp-pricing" id="pricing">
          <h2 className="lp-section-title">Simple, Transparent Pricing</h2>
          <div className="lp-pricing-toggle">
            <span className="lp-pricing-label">Monthly</span>
            <div className={\`lp-toggle-switch ${isAnnual ? 'lp-active' : ''}\`} onClick={() => setIsAnnual(!isAnnual)}>
              <div className="lp-toggle-knob" />
            </div>
            <span className="lp-pricing-label">Annual</span>
            {isAnnual && <span style={{ marginLeft: '12px', padding: '4px 8px', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#fff' }}>Save 35%</span>}
          </div>
          <div className="lp-pricing-grid">
            <div className="lp-pricing-card lp-pricing-secondary">
              <h3>Student Pro</h3>
              <div className="lp-pricing-price">{isAnnual ? '$55' : '$7'}<span style={{ fontSize: '0.4em', fontWeight: '400', color: 'rgba(255,255,255,0.5)' }}>/year</span></div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>Per {isAnnual ? 'year' : 'month'}</p>
              <ul className="lp-pricing-features">
                <li>Unlimited decks</li>
                <li>AI card generation</li>
                <li>Smart review</li>
                <li>Progress analytics</li>
              </ul>
              <button className="lp-pricing-cta" onClick={() => router.push('/signup')}>Start free trial</button>
            </div>
            <div className="lp-pricing-card lp-pricing-primary">
              <div className="lp-pricing-badge">POPULAR</div>
              <h3>Teacher Pro</h3>
              <div className="lp-pricing-price">{isAnnual ? '$99' : '$13'}<span style={{ fontSize: '0.4em', fontWeight: '400', color: 'rgba(255,255,255,0.5)' }}>/year</span></div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>Per {isAnnual ? 'year' : 'month'}</p>
              <ul className="lp-pricing-features">
                <li>Everything in Student</li>
                <li>Classroom creation</li>
                <li>Student management</li>
                <li>Advanced analytics</li>
              </ul>
              <button className="lp-pricing-cta" onClick={() => router.push('/signup')}>Start free trial</button>
            </div>
          </div>
        </section>

        <section className="lp-features" id="features">
          <h2 className="lp-section-title">Powered by Nova AI</h2>
          <div className="lp-features-grid">
            {NOVA_FEATS.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="lp-footer">
          <div className="lp-footer-content">
            <div className="lp-footer-col">
              <h4>Product</h4>
              <a href="#">Features</a>
              <a href="#">Pricing</a>
              <a href="#">Security</a>
            </div>
            <div className="lp-footer-col">
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
            </div>
            <div className="lp-footer-col">
              <h4>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <p>© 2024 Flashfo. All rights reserved. | Made with ❤️ by londogc</p>
          </div>
        </footer>
      </div>
    </div>
  )
}