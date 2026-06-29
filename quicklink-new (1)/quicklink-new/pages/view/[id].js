import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function View() {
  const router = useRouter()
  const { id } = router.query
  const [post, setPost] = useState(null)
  const [status, setStatus] = useState('loading')
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  useEffect(() => {
    if (localStorage.getItem('authed') !== 'yes') {
      router.push(`/?id=${id}`)
      return
    }
    if (!id) return
    fetch(`${SUPA_URL}/rest/v1/posts?id=eq.${id}&select=*`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    })
      .then(r => r.json())
      .then(data => {
        if (!data || data.length === 0) { setStatus('notfound'); return }
        const p = data[0]
        if (p.expires_at && new Date(p.expires_at) < new Date()) { setStatus('expired'); return }
        setPost(p)
        setStatus('ok')
      })
  }, [id])

  const copyContent = () => {
    if (post.type === 'text') {
      navigator.clipboard.writeText(post.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    }
  }

  if (status === 'loading') return <ReaderMsg>불러오는 중...</ReaderMsg>
  if (status === 'notfound') return <ReaderMsg>없는 게시물이에요</ReaderMsg>
  if (status === 'expired') return <ReaderMsg>만료된 게시물이에요</ReaderMsg>

  const imgList = post.type === 'image' ? post.image_url.split('|||') : []
  const expiresLabel = post.expires_at
    ? (() => {
        const diff = new Date(post.expires_at) - new Date()
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        return diff <= 0 ? null : h > 0 ? `${h}시간 후 만료` : `${m}분 후 만료`
      })()
    : null

  return (
    <div style={s.wrap}>
      {toast && <div style={s.toast}>{toast}</div>}
      <div style={s.topbar}>
        <span style={s.topTitle}>자물쇠</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {expiresLabel && <span style={s.badge}>{expiresLabel}</span>}
          <button style={s.topBtn} onClick={copyContent}>{copied ? '✓ 복사됨' : '글 복사'}</button>
          <button style={s.topBtnAccent} onClick={() => router.push('/upload')}>올리기</button>
        </div>
      </div>

      <div style={s.content}>
        {post.type === 'text'
          ? <div>
              <div style={s.body}>{post.content}</div>
              {post.image_url && (
                <img src={post.image_url} style={{ ...s.img, marginTop: 24 }} alt=""
                  onContextMenu={e => e.preventDefault()} draggable={false} />
              )}
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {imgList.map((url, i) => (
                <img key={i} src={url} style={s.img} alt=""
                  onContextMenu={e => e.preventDefault()} draggable={false} />
              ))}
            </div>
        }

        <div style={s.footer}>
          {expiresLabel
            ? <p style={s.footerNote}>{expiresLabel.replace(' 만료', ' 후 자동으로 사라져요')}</p>
            : <p style={s.footerNote}>자물쇠에서 공유된 게시물이에요</p>
          }
          <button style={s.newBtn} onClick={() => router.push('/upload')}>새로 올리기</button>
        </div>
      </div>
    </div>
  )
}

function ReaderMsg({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
      <p style={{ color: '#aaa', fontSize: 14, margin: 0, fontFamily: 'sans-serif' }}>{children}</p>
    </div>
  )
}

const s = {
  wrap: { minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: '\'Noto Sans KR\', sans-serif' },
  topbar: { width: '100%', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid #e5e5e5', background: '#fff', position: 'sticky', top: 0, zIndex: 10, boxSizing: 'border-box' },
  topTitle: { fontSize: 14, color: '#111', fontWeight: 500, letterSpacing: '-0.2px' },
  topBtn: { fontSize: 12, color: '#888', background: 'none', border: '0.5px solid #e5e5e5', borderRadius: 6, cursor: 'pointer', padding: '5px 10px', fontFamily: 'inherit' },
  topBtnAccent: { fontSize: 12, color: '#fff', background: '#111', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '5px 10px', fontFamily: 'inherit' },
  badge: { fontSize: 11, color: '#aaa', fontFamily: 'sans-serif' },
  content: { maxWidth: 600, width: '100%', padding: '32px 20px 72px', boxSizing: 'border-box' },
  body: { fontSize: 14, lineHeight: 2.0, color: '#222', letterSpacing: '0.01em', wordBreak: 'keep-all', whiteSpace: 'pre-wrap', fontWeight: 400, margin: 0 },
  img: { maxWidth: '100%', borderRadius: 8, pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none', display: 'block' },
  footer: { marginTop: 48, paddingTop: 20, borderTop: '0.5px solid #e5e5e5', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  footerNote: { fontSize: 11, color: '#bbb', letterSpacing: '0.02em', margin: 0 },
  newBtn: { fontFamily: 'inherit', fontSize: 12, color: '#555', background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 20, padding: '8px 20px', cursor: 'pointer' },
  toast: { position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontFamily: 'sans-serif', zIndex: 9999 },
}
