'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [teachers, setTeachers] = useState([])
  const [stats, setStats] = useState({ teachers:0, students:0, generations:0 })
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteFeedback, setInviteFeedback] = useState('')

  useEffect(() => {
    if (!profile) return
    if (profile.plan !== 'school' && profile.plan !== 'lifetime') {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [profile])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ adminId: user.id })
      })
      const d = await res.json()
      setTeachers(d.teachers || [])
      setStats({ teachers: d.teacherCount || 0, students: 0, generations: 0 })
    } catch(e) {
      console.error('Admin load error:', e)
    }
    setLoading(false)
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteFeedback('')
    try {
      // In production: send invite email via your email provider
      // For now: create a placeholder profile entry or use Supabase inviteUserByEmail
      const res = await fetch('/api/admin/invite', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email: inviteEmail.trim(), adminId: user.id })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setInviteFeedback('Invite sent to '+inviteEmail)
      setInviteEmail('')
      setTimeout(()=>loadData(), 1500)
    } catch(e) {
      setInviteFeedback('Could not send invite. Please try again.')
    }
    setInviting(false)
  }

  const avatarColor = (name) => {
    const colors = ['#3b82f6','#a78bfa','#34d399','#f59e0b','#f87171','#60a5fa']
    let hash = 0; for (const c of (name||'?')) hash += c.charCodeAt(0)
    return colors[hash % colors.length]
  }

  const initials = (name) => (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0d1117',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:28,height:28,border:'2px solid #2563eb',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0d1117',padding:'32px 20px',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{maxWidth:800,margin:'0 auto'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:28}}>
          <div style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          </div>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:'#e6edf3',letterSpacing:'-0.02em'}}>School Admin</div>
            <div style={{fontSize:13,color:'#f59e0b'}}>School plan · {stats.teachers} / 10 teacher seats used</div>
          </div>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)',borderRadius:20,padding:'4px 12px'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#34d399'}}/>
            <span style={{fontSize:11,fontWeight:700,color:'#34d399'}}>Active</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
          {[
            {label:'Teachers',value:stats.teachers,sub:10-stats.teachers+' seats remaining',col:'#3b82f6'},
            {label:'Students',value:stats.students||'—',sub:'across all classes',col:'#a78bfa'},
            {label:'AI Generations',value:stats.generations||'—',sub:'this month',col:'#34d399'},
          ].map(({label,value,sub,col})=>(
            <div key={label} style={{background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'16px 18px'}}>
              <div style={{fontSize:11,color:'#8b949e',marginBottom:4}}>{label}</div>
              <div style={{fontSize:30,fontWeight:800,color:'#e6edf3',letterSpacing:'-0.02em'}}>{value}</div>
              <div style={{fontSize:11,color:col,marginTop:4}}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Teacher accounts */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:'#484f58',letterSpacing:'0.07em',marginBottom:12}}>TEACHER ACCOUNTS</div>
          <div style={{background:'#161b22',border:'1px solid #21262d',borderRadius:12,overflow:'hidden'}}>
            {teachers.length === 0 ? (
              <div style={{padding:'32px',textAlign:'center',color:'#484f58',fontSize:13}}>
                No teacher accounts yet — invite your first teacher below
              </div>
            ) : teachers.map((t,i)=>(
              <div key={t.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:i<teachers.length-1?'1px solid #21262d':'none'}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:'rgba('+avatarColor(t.full_name).replace('#','').match(/../g).map(h=>parseInt(h,16)).join(',')+',.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:avatarColor(t.full_name),flexShrink:0}}>
                  {initials(t.full_name)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#e6edf3'}}>{t.full_name||'Unnamed teacher'}</div>
                  <div style={{fontSize:11,color:'#8b949e'}}>Teacher Pro · joined {new Date(t.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{padding:'3px 8px',borderRadius:5,fontSize:10,fontWeight:700,background:'rgba(52,211,153,0.1)',color:'#34d399'}}>Active</div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite teacher */}
        <div style={{background:'#161b22',border:'1px solid #21262d',borderRadius:12,padding:'18px 20px',marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:'#484f58',letterSpacing:'0.07em',marginBottom:12}}>INVITE A TEACHER</div>
          <div style={{display:'flex',gap:10}}>
            <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendInvite()}
              placeholder="teacher@school.edu"
              style={{flex:1,background:'#0d1117',border:'1px solid #30363d',borderRadius:9,padding:'10px 13px',fontSize:13,color:'#e6edf3',outline:'none'}}/>
            <button onClick={sendInvite} disabled={inviting||!inviteEmail.trim()}
              style={{padding:'10px 18px',borderRadius:9,border:'none',background:'linear-gradient(90deg,#2563eb,#7c3aed)',color:'#fff',fontSize:13,fontWeight:700,cursor:inviting||!inviteEmail.trim()?'not-allowed':'pointer',opacity:inviting||!inviteEmail.trim()?0.6:1,whiteSpace:'nowrap'}}>
              {inviting?'Sending...':'Send invite →'}
            </button>
          </div>
          {inviteFeedback&&<div style={{marginTop:10,fontSize:12,color:inviteFeedback.includes('sent')?'#34d399':'#f87171'}}>{inviteFeedback}</div>}
          {stats.teachers >= 10 && <div style={{marginTop:10,fontSize:12,color:'#f59e0b'}}>You have reached the 10-teacher limit. Contact support to upgrade.</div>}
        </div>

        {/* Quick links */}
        <div style={{fontSize:11,fontWeight:700,color:'#484f58',letterSpacing:'0.07em',marginBottom:12}}>QUICK LINKS</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {[
            {label:'Live quizzes',icon:'⚡',href:'/teach',color:'#3b82f6'},
            {label:'Lesson builder',icon:'📋',href:'/lesson-builder',color:'#a78bfa'},
            {label:'Curriculum',icon:'📐',href:'/curriculum',color:'#34d399'},
          ].map(({label,href,color})=>(
            <button key={label} onClick={()=>router.push(href)}
              style={{background:'#161b22',border:'1px solid #21262d',borderRadius:10,padding:'14px',textAlign:'center',cursor:'pointer',transition:'border-color 0.15s'}}>
              <div style={{fontSize:13,fontWeight:600,color}}>{label}</div>
              <div style={{fontSize:11,color:'#484f58',marginTop:2}}>→</div>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
