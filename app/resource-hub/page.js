'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

const SUBJECTS = ['All','Math','Science','English','History','Biology','Chemistry','Physics','Geography','Art','Music','PE','Other']
const GRADES   = ['All','K-2','3-5','6-8','9-10','11-12','College']
const TYPES    = ['All','Quiz','Flashcards','Lesson Plan','Study Guide']

export default function ResourceHubPage() {
  const { user } = useAuth()
  const [resources, setResources]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [subject, setSubject]         = useState('All')
  const [grade, setGrade]             = useState('All')
  const [type, setType]               = useState('All')
  const [sort, setSort]               = useState('popular') // popular | newest | rating
  const [preview, setPreview]         = useState(null)
  const [importing, setImporting]     = useState(null)
  const [importFeedback, setImportFeedback] = useState('')
  const [myTab, setMyTab]             = useState(false) // toggle between hub and my contributions

  useEffect(() => { load() }, [subject, grade, type, sort])

  async function load() {
    setLoading(true)
    try {
      let q = supabase.from('resource_hub')
        .select('*, profiles(full_name, avatar_url)')
        .eq('status', 'approved')

      if (subject !== 'All') q = q.eq('subject', subject)
      if (grade   !== 'All') q = q.eq('grade_level', grade)
      if (type    !== 'All') q = q.eq('resource_type', type)

      if (sort === 'popular') q = q.order('download_count', { ascending: false })
      else if (sort === 'newest') q = q.order('created_at', { ascending: false })
      else if (sort === 'rating') q = q.order('avg_rating', { ascending: false })

      q = q.limit(40)
      const { data } = await q
      setResources(data || [])
    } catch(e) {}
    setLoading(false)
  }

  const filtered = resources.filter(r =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()) || r.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  async function importResource(resource) {
    if (!user) { setImportFeedback('Sign in to import resources.'); return }
    setImporting(resource.id)
    try {
      // Copy resource into user's saved_items
      const { error } = await supabase.from('saved_items').insert({
        user_id: user.id,
        type: resource.resource_type?.toLowerCase().replace(' ', '_') || 'quiz',
        title: resource.title + ' (from Resource Hub)',
        data: resource.resource_data || {}
      })
      if (error) throw error
      // Increment download count
      await supabase.from('resource_hub').update({ download_count: (resource.download_count || 0) + 1 }).eq('id', resource.id)
      setImportFeedback('Imported to My Stuff!')
      setTimeout(() => setImportFeedback(''), 3000)
      setPreview(null)
      load()
    } catch(e) { setImportFeedback('Import failed. Try again.') }
    setImporting(null)
  }

  async function rateResource(resourceId, rating) {
    if (!user) return
    await supabase.from('resource_ratings').upsert({ resource_id: resourceId, user_id: user.id, rating })
    // Recalc avg on the resource
    const { data } = await supabase.from('resource_ratings').select('rating').eq('resource_id', resourceId)
    if (data?.length) {
      const avg = data.reduce((a, r) => a + r.rating, 0) / data.length
      await supabase.from('resource_hub').update({ avg_rating: Math.round(avg * 10) / 10 }).eq('id', resourceId)
    }
    load()
  }

  function StarRating({ resource, interactive }) {
    return (
      <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(star => (
          <button key={star} onClick={() => interactive && rateResource(resource.id, star)}
            className={'text-lg leading-none ' + (interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default')}
            style={{ color: star <= Math.round(resource.avg_rating || 0) ? '#f59e0b' : 'var(--c-line)' }}>
            ★
          </button>
        ))}
        {resource.avg_rating > 0 && <span className="text-[11px] text-t3 ml-1">{Number(resource.avg_rating).toFixed(1)}</span>}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-surface border border-line rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-line">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 uppercase">{preview.resource_type}</span>
                    <span className="text-[10px] text-t3">{preview.grade_level} · {preview.subject}</span>
                  </div>
                  <h2 className="text-lg font-bold text-t1">{preview.title}</h2>
                  <p className="text-[13px] text-t2 mt-1">{preview.description}</p>
                </div>
                <button onClick={() => setPreview(null)} className="text-t3 hover:text-t1 text-xl flex-shrink-0">✕</button>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="bg-surface2 rounded-xl p-3">
                  <div className="text-lg font-black text-t1">{preview.resource_data?.questions?.length || preview.resource_data?.cards?.length || '—'}</div>
                  <div className="text-[10px] text-t3">{preview.resource_type === 'Flashcards' ? 'Cards' : 'Items'}</div>
                </div>
                <div className="bg-surface2 rounded-xl p-3">
                  <div className="text-lg font-black text-blue-600">{preview.download_count || 0}</div>
                  <div className="text-[10px] text-t3">Downloads</div>
                </div>
                <div className="bg-surface2 rounded-xl p-3">
                  <div className="text-lg font-black text-amber-500">{preview.avg_rating > 0 ? Number(preview.avg_rating).toFixed(1) : '—'}</div>
                  <div className="text-[10px] text-t3">Rating</div>
                </div>
              </div>
              {preview.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {preview.tags.map(tag => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-surface2 text-t3">{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="text-[12px] text-t3">Rate this resource:</div>
                <StarRating resource={preview} interactive={true}/>
              </div>
              <div className="flex gap-2">
                <button onClick={() => importResource(preview)} disabled={importing === preview.id}
                  className="flex-1 h-10 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center gap-2">
                  {importing === preview.id ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
                  Import to My Stuff
                </button>
                <button onClick={() => setPreview(null)} className="h-10 px-4 bg-surface border border-line text-t2 text-sm rounded-xl hover:bg-surface2">Cancel</button>
              </div>
              {importFeedback && <p className="text-[12px] text-center mt-2 text-emerald-500 font-medium">{importFeedback}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-t1 tracking-tight">Resource Hub</h1>
          <p className="text-sm text-t2 mt-0.5">Browse and share teacher-curated quizzes, flashcards, and lesson plans</p>
        </div>
        <a href="/my-stuff" className="h-9 px-4 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1v14M1 8h14"/></svg>
          Publish a Resource
        </a>
      </div>

      {/* Search + Filters */}
      <div className="bg-surface border border-line rounded-2xl p-4 mb-5 space-y-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search topics, titles, tags..."
          className="w-full h-10 bg-surface2 border border-line rounded-xl px-4 text-sm text-t1 outline-none focus:border-blue-400 placeholder:text-t3"/>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-t3 uppercase tracking-wider">Subject</span>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="h-8 bg-surface2 border border-line rounded-lg px-2 text-[12px] text-t1 outline-none focus:border-blue-400">
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-t3 uppercase tracking-wider">Grade</span>
            <select value={grade} onChange={e => setGrade(e.target.value)}
              className="h-8 bg-surface2 border border-line rounded-lg px-2 text-[12px] text-t1 outline-none focus:border-blue-400">
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-t3 uppercase tracking-wider">Type</span>
            <select value={type} onChange={e => setType(e.target.value)}
              className="h-8 bg-surface2 border border-line rounded-lg px-2 text-[12px] text-t1 outline-none focus:border-blue-400">
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] font-bold text-t3 uppercase tracking-wider">Sort</span>
            {[['popular','🔥 Popular'],['newest','✨ Newest'],['rating','⭐ Top Rated']].map(([id, label]) => (
              <button key={id} onClick={() => setSort(id)}
                className={'h-7 px-3 text-[11px] font-semibold rounded-lg border transition-all ' + (sort === id ? 'bg-blue-700 text-white border-blue-700' : 'bg-surface2 text-t2 border-line hover:border-blue-300')}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-line rounded-2xl p-16 text-center">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-t1 font-semibold mb-1">No resources found</p>
          <p className="text-sm text-t2 mb-5">Try different filters, or be the first to publish a resource for this topic!</p>
          <a href="/my-stuff" className="inline-block h-9 px-5 bg-blue-700 text-white text-sm font-semibold rounded-xl hover:bg-blue-800">Publish a Resource</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(resource => (
            <div key={resource.id} className="bg-surface border border-line rounded-xl p-5 hover:border-blue-300 transition-colors cursor-pointer group"
              onClick={() => setPreview(resource)}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ' + (
                    resource.resource_type === 'Quiz' ? 'bg-blue-500/10 text-blue-500' :
                    resource.resource_type === 'Flashcards' ? 'bg-emerald-500/10 text-emerald-600' :
                    resource.resource_type === 'Lesson Plan' ? 'bg-purple-500/10 text-purple-500' :
                    'bg-amber-500/10 text-amber-600'
                  )}>{resource.resource_type}</span>
                  <span className="text-[10px] text-t3">{resource.grade_level}</span>
                  <span className="text-[10px] text-t3">{resource.subject}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-t3 flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1v9M5 7l3 3 3-3M2 13h12"/></svg>
                  {resource.download_count || 0}
                </div>
              </div>
              <h3 className="text-sm font-bold text-t1 mb-1 group-hover:text-blue-500 transition-colors">{resource.title}</h3>
              <p className="text-[12px] text-t2 mb-3 line-clamp-2">{resource.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-bold text-blue-600">
                    {(resource.profiles?.full_name || 'T').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[11px] text-t3">{resource.profiles?.full_name || 'Teacher'}</span>
                </div>
                <StarRating resource={resource} interactive={false}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results count */}
      {!loading && filtered.length > 0 && (
        <p className="text-center text-[11px] text-t3 mt-6">{filtered.length} resource{filtered.length !== 1 ? 's' : ''} found</p>
      )}
    </div>
  )
}