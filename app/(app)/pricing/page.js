'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

const PRICES = {
  student: { monthly: 'price_1TS69gLu7zMVJuloo7S44sow', annual: 'price_1TS6BtLu7zMVJuloFSLuTJou' },
  teacher: { monthly: 'price_1TS6DHLu7zMVJuloSHQ9zT1c', annual: 'price_1TS6E6Lu7zMVJuloQJP7uNz2' },
  school:  { monthly: 'price_1TS6FOLu7zMVJulorLTheTxO', annual: null },
}

const PLANS = [
  {
    id: 'student',
    name: 'Student Pro',
    color: '#a78bfa',
    borderColor: 'rgba(167,139,250,0.3)',
    bgColor: 'rgba(167,139,250,0.06)',
    monthly: 7,
    annual: 55,
    annualMonthly: 4.58,
    badge: null,
    features: [
      'Unlimited AI flashcard generation',
      'Unlimited quizzes & study guides',
      'Unlimited summaries',
      'Spaced repetition',
      'Progress tracking',
      'Nova AI Tutor',
      'Voice mode',
      'Save unlimited decks',
    ],
  },
  {
    id: 'teacher',
    name: 'Teacher Pro',
    color: '#34d399',
    borderColor: 'rgba(52,211,153,0.3)',
    bgColor: 'rgba(52,211,153,0.06)',
    monthly: 13,
    annual: 99,
    annualMonthly: 8.25,
    badge: 'Most popular',
    features: [
      'Everything in Student Pro',
      'Host live quizzes (unlimited students)',
      'Class roster management',
      'Assignment builder',
      'Curriculum planner',
      'Student performance analytics',
      'Student Portal',
      'Nova AI Lesson Builder',
    ],
  },
  {
    id: 'school',
    name: 'School',
    color: '#f59e0b',
    borderColor: 'rgba(245,158,11,0.3)',
    bgColor: 'rgba(245,158,11,0.06)',
    monthly: 149,
    annual: null,
    annualMonthly: null,
    badge: null,
    features: [
      'Up to 10 teacher accounts',
      'Unlimited student accounts',
      'Everything in Teacher Pro',
      'School-wide admin dashboard',
      'Priority support',
      'Billing by invoice available',
      'Contact us for annual pricing & volume discounts',
    ],
  },
]

export default function PricingPage() {
  const [billing, setBilling] = useState('annual')
  const [loading, setLoading] = useState(null)
  const { user, profile } = useAuth()
  const router = useRouter()

  const currentPlan = profile?.plan || 'free'

  async function handleCheckout(planId) {
    if (!user) { router.push('/auth?mode=signup'); return }
    const priceId = PRICES[planId][billing === 'annual' && PRICES[planId].annual ? 'annual' : 'monthly']
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id, userEmail: user.email }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert('Something went wrong. Please try again.')
    } catch (e) {
      alert('Something went wrong. Please try again.')
    }
    setLoading(null)
  }

  const isCurrentPlan = (planId) => {
    if (planId === 'student' && currentPlan === 'student_pro') return true
    if (planId === 'teacher' && currentPlan === 'teacher_pro') return true
    if (planId === 'school'  && currentPlan === 'school') return true
    return false
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0d1117', padding:'60px 20px', fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`
        @media(max-width:768px){
          .pc-wrap{padding:32px 14px 40px!important}
          .pc-cards{grid-template-columns:1fr!important;max-width:100%!important}
          .pc-toggle{margin-bottom:24px!important}
        }
      `}</style>
      <div style={{ maxWidth:960, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:20, padding:'4px 14px', fontSize:11, fontWeight:700, color:'#a78bfa', marginBottom:16, letterSpacing:'0.05em' }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="#a78bfa"><polygon points="7 1 2 8 7 8 6 13 12 6 7 6"/></svg>
            NOVA-POWERED
          </div>
          <h1 style={{ fontSize:40, fontWeight:800, color:'#e6edf3', letterSpacing:'-0.03em', margin:'0 0 12px' }}>Simple, honest pricing</h1>
          <p style={{ fontSize:16, color:'#8b949e', margin:0 }}>Study smarter. Teach better. Cancel any time.</p>
        </div>

        {/* Billing toggle */}
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginBottom:48 }}>
          <span style={{ fontSize:14, color: billing==='monthly' ? '#e6edf3' : '#8b949e', fontWeight: billing==='monthly' ? 600 : 400 }}>Monthly</span>
          <div onClick={()=>setBilling(b=>b==='monthly'?'annual':'monthly')}
            style={{ width:48, height:26, borderRadius:13, background: billing==='annual' ? '#2563eb' : '#21262d', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
            <div style={{ position:'absolute', top:3, left: billing==='annual' ? 25 : 3, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
          </div>
          <span style={{ fontSize:14, color: billing==='annual' ? '#e6edf3' : '#8b949e', fontWeight: billing==='annual' ? 600 : 400 }}>
            Annual <span style={{ fontSize:11, color:'#34d399', fontWeight:700 }}>Save up to 35%</span>
          </span>
        </div>

        <div style={{ textAlign:'center', fontSize:13, color:'#34d399', marginBottom:32, fontWeight:600 }}>
          ✦ All paid plans include a 3-day free trial — no charge until day 4
        </div>

        {/* Cards */}
        <div className="pc-cards" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20, alignItems:'start' }}>
          {PLANS.map(plan => {
            const isCurrent = isCurrentPlan(plan.id)
            const showAnnual = billing === 'annual' && plan.annual
            const price = showAnnual ? plan.annualMonthly : plan.monthly
            const billed = showAnnual ? plan.annual : null

            return (
              <div key={plan.id} style={{ background:'#161b22', border:'1px solid '+(isCurrent ? plan.borderColor : '#21262d'), borderRadius:16, padding:'28px 24px', position:'relative', transition:'border-color 0.2s' }}>

                {/* Badge */}
                {plan.badge && (
                  <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:plan.color, color:'#000', fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:20 }}>
                    {plan.badge}
                  </div>
                )}

                {isCurrent && (
                  <div style={{ position:'absolute', top:-12, right:20, background:'#21262d', color:'#8b949e', fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20 }}>
                    Current plan
                  </div>
                )}

                {/* Plan name + color bar */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <div style={{ width:4, height:28, background:plan.color, borderRadius:2 }}/>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:'#e6edf3' }}>{plan.name}</div>
                    {currentPlan === 'lifetime' && <div style={{ fontSize:11, color:'#a78bfa' }}>You have lifetime access ✦</div>}
                  </div>
                </div>

                {/* Price */}
                <div style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                    <span style={{ fontSize:42, fontWeight:800, color:'#e6edf3', letterSpacing:'-0.03em' }}>${price.toFixed(2)}</span>
                    <span style={{ fontSize:14, color:'#8b949e' }}>/mo</span>
                  </div>
                  {billed && <div style={{ fontSize:12, color:'#484f58', marginTop:2 }}>Billed ${billed}/year</div>}
                  {!billed && plan.id !== 'school' && <div style={{ fontSize:12, color:'#484f58', marginTop:2 }}>Billed monthly</div>}
                  {plan.id === 'school' && <div style={{ fontSize:12, color:'#484f58', marginTop:2 }}>Monthly · Invoice available</div>}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => !isCurrent && !loading && handleCheckout(plan.id)}
                  disabled={isCurrent || loading === plan.id || currentPlan === 'lifetime'}
                  style={{
                    width:'100%', padding:'12px 0', borderRadius:10, border:'none', fontSize:14, fontWeight:700, cursor: (isCurrent || currentPlan==='lifetime') ? 'default' : 'pointer',
                    background: isCurrent || currentPlan==='lifetime' ? '#21262d' : 'linear-gradient(90deg,#2563eb,#7c3aed)',
                    color: isCurrent || currentPlan==='lifetime' ? '#8b949e' : '#fff',
                    opacity: loading === plan.id ? 0.7 : 1,
                    marginBottom:24,
                  }}>
                  {loading === plan.id ? 'Redirecting to Stripe...' :
                   currentPlan === 'lifetime' ? 'Lifetime access ✦' :
                   isCurrent ? 'Current plan' :
                   'Start 3-day free trial →'}
                </button>

                {/* Features */}
                <div>
                  {plan.features.map((f,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6.5" stroke={plan.color} strokeWidth="1"/>
                        <path d="M4 7l2 2 4-4" stroke={plan.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontSize:13, color:'#8b949e' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Free tier note */}
        <div style={{ textAlign:'center', marginTop:48, padding:'24px', background:'#161b22', borderRadius:12, border:'1px solid #21262d' }}>
          <div style={{ fontSize:15, fontWeight:600, color:'#e6edf3', marginBottom:6 }}>Free tier always available</div>
          <div style={{ fontSize:13, color:'#8b949e' }}>15 AI generations per month, save up to 5 decks, join live quizzes as a student — no credit card required.</div>
          {!user && <button onClick={()=>router.push('/auth?mode=signup')} style={{ marginTop:14, padding:'8px 20px', borderRadius:8, border:'1px solid #30363d', background:'transparent', color:'#8b949e', fontSize:13, cursor:'pointer' }}>Sign up free →</button>}
        </div>

        {/* Trust badges */}
        <div style={{ display:'flex', justifyContent:'center', gap:32, marginTop:40, flexWrap:'wrap' }}>
          {['Cancel any time','Secure payment via Stripe','COPPA compliant','FERPA friendly'].map(t=>(
            <div key={t} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#484f58' }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
