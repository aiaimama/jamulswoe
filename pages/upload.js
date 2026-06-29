import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

async function uploadToR2(file) {
  const ext = file.name.split('.').pop()
  const filename = `quick/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  let uploadFile = file

  try {
    uploadFile = await new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        const max = 1920
        let w = img.width, h = img.height
        if (w > max) { h = h * max / w; w = max }
        if (h > max) { w = w * max / h; h = max }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('압축 실패')), 'image/jpeg', 0.85)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 로드 실패')) }
      img.src = url
    })
  } catch (e) {
    console.warn('압축 실패, 원본 사용:', e)
    uploadFile = file
  }

  if (uploadFile.size > 4 * 1024 * 1024) {
    throw new Error('이미지가 너무 커요. 더 작은 이미지를 사용해주세요.')
  }

  const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}&contentType=image/jpeg`, {
    method: 'POST',
    body: uploadFile,
  })
  const data = await res.json()
  return data.url
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function Upload() {
  const router = useRouter()
  const [tab, setTab] = useState('text')
  const [text, setText] = useState('')
  const [images, setImages] = useState([])
  const [toast, setToast] = useState('')
  const [expires, setExpires] = useState('forever')
  const [rules, setRules] = useState([{ from: '', to: '' }, { from: '', to: '' }])
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(null)
  const [textImage, setTextImage] = useState(null)
  const [copied, setCopied] = useState(false)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const addImages = (files) => {
    const newFiles = Array.from(files)
    setImages(prev => [...prev, ...newFiles].slice(0, 10))
  }
  const removeImage = (i) => setImages(prev => prev.filter((_, j) => j !== i))
  const moveImage = (i, dir) => {
    setImages(prev => {
      const arr = [...prev]
      const j = i + dir
      if (j < 0 || j >= arr.length) return arr
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  useEffect(() => {
    if (localStorage.getItem('authed') !== 'yes') { router.push('/'); return }
    const saved = localStorage.getItem('rules')
    if (saved) setRules(JSON.parse(saved))
    fetch(`${SUPA_URL}/rest/v1/posts?expires_at=lt.${new Date().toISOString()}&select=id,image_url`, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
    }).then(r => r.json()).then(async (expired) => {
      if (!expired || expired.length === 0) return
      for (const p of expired) {
        if (p.image_url) {
          const urls = p.image_url.split('|||')
          for (const url of urls) {
            const filename = url.split('/sudal-quick-share/')[1]
            if (filename) {
              await fetch(`${SUPA_URL}/storage/v1/object/sudal-quick-share/${filename}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${SUPA_KEY}` }
              })
            }
          }
        }
      }
      await fetch(`${SUPA_URL}/rest/v1/posts?expires_at=lt.${new Date().toISOString()}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }
      })
    })
  }, [])

  const replace = (t) => {
    let r = t
    rules.forEach(rule => { if (rule.from) r = r.split(rule.from).join(rule.to) })
    return r
  }

  const expiry = () => {
    const h = { '3h': 3, '12h': 12, '24h': 24 }
    if (!h[expires]) return null
    const d = new Date()
    d.setHours(d.getHours() + h[expires])
    return d.toISOString()
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}${done}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const submit = async () => {
    setLoading(true)
    try {
      let body
      if (tab === 'text') {
        let attachedUrl = null
        if (textImage) attachedUrl = await uploadToR2(textImage)
        body = { type: 'text', content: replace(text), image_url: attachedUrl, expires_at: expiry() }
      } else {
        if (images.length === 0) { setLoading(false); return }
        const urls = []
        for (const image of images) urls.push(await uploadToR2(image))
        body = { type: 'image', image_url: urls.join('|||'), expires_at: expiry() }
      }
      const res = await fetch(`${SUPA_URL}/rest/v1/posts`, {
        method: 'POST',
        headers: {
          'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json', 'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setDone(`/view/${data[0].id}`)
    } catch (e) {
      showToast('오류: ' + e.message)
    }
    setLoading(false)
  }

  if (done) {
    const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${done}`
    return (
      <div style={s.center}>
        <div style={{ ...s.card, gap: 12 }}>
          <p style={s.doneTitle}>공유 완료</p>
          <p style={s.doneSub}>아래 링크를 복사해서 공유하세요</p>
          <div style={s.linkBox} onClick={() => { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(document.getElementById('linktext')); sel.removeAllRanges(); sel.addRange(range) }}>
            <span id="linktext" style={{ fontFamily: 'monospace', fontSize: 12, color: '#555', wordBreak: 'break-all' }}>{fullUrl}</span>
          </div>
          <button style={{ ...s.btnMain, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={copyLink}>
            {copied ? '✓ 복사됨' : '링크 복사'}
          </button>
          <button style={s.btnSub} onClick={() => { setDone(null); setText(''); setImages([]); setPreview(''); setCopied(false) }}>
            + 또 올리기
          </button>
        </div>
        {toast && <div style={s.toast}>{toast}</div>}
      </div>
    )
  }

  return (
    <div style={s.center}>
      {toast && <div style={s.toast}>{toast}</div>}
      <div style={s.card}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={s.logo} />
            <span style={s.siteName}>자물쇠</span>
          </div>
          <button style={s.logoutBtn} onClick={() => { localStorage.removeItem('authed'); router.push('/') }}>로그아웃</button>
        </div>

        <div style={s.divider} />

        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
          {['text', 'image'].map(t => (
            <button key={t}
              style={{ ...s.tab, background: tab === t ? '#111' : '#fff', color: tab === t ? '#fff' : '#555', borderColor: tab === t ? '#111' : '#e5e5e5' }}
              onClick={() => setTab(t)}>
              {t === 'text' ? '텍스트' : '이미지'}
            </button>
          ))}
        </div>

        {tab === 'text' && <>
          <div style={s.section}>
            <p style={s.sectionLabel}>이름 치환 <span style={{ color: '#bbb', fontWeight: 400 }}>(선택사항)</span></p>
            {rules.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input placeholder={i === 0 ? '캐릭터' : '페르소나'} value={r.from}
                  onChange={e => { const n = [...rules]; n[i].from = e.target.value; setRules(n) }}
                  style={{ ...s.input, minWidth: 0 }} />
                <span style={{ color: '#bbb', fontSize: 13, textAlign: 'center' }}>→</span>
                <input placeholder={i === 0 ? '{{char}}' : '{{user}}'} value={r.to}
                  onChange={e => { const n = [...rules]; n[i].to = e.target.value; setRules(n) }}
                  style={{ ...s.input, minWidth: 0 }} />
                <button onClick={() => setRules(rules.filter((_, j) => j !== i))}
                  style={s.iconBtn}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button style={s.smallBtn} onClick={() => setRules([...rules, { from: '', to: '' }])}>+ 추가</button>
              <button style={{ ...s.smallBtn, background: '#111', color: '#fff', borderColor: '#111' }}
                onClick={() => { localStorage.setItem('rules', JSON.stringify(rules)); showToast('저장됐어요') }}>저장</button>
            </div>
          </div>

          <textarea placeholder="로그 붙여넣기..." value={text}
            onChange={e => { setText(e.target.value); setPreview('') }}
            style={{ ...s.input, width: '100%', height: 140, resize: 'vertical' }} />

          <button style={{ ...s.btnSub, width: '100%' }} onClick={() => setPreview(replace(text))}>미리보기</button>

          <div style={{ width: '100%' }}>
            <p style={s.sectionLabel}>이미지 첨부 <span style={{ color: '#bbb', fontWeight: 400 }}>(선택사항)</span></p>
            <label style={s.uploadLabel}>
              <span style={{ fontSize: 13, color: textImage ? '#111' : '#aaa' }}>{textImage ? textImage.name : '이미지 선택 (1장)'}</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setTextImage(e.target.files[0] || null)} />
            </label>
            {textImage && <button onClick={() => setTextImage(null)} style={{ ...s.smallBtn, background: '#fff', color: '#999', marginTop: 6 }}>제거</button>}
          </div>

          {preview && (
            <div style={s.previewBox}>{preview}</div>
          )}
        </>}

        {tab === 'image' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {images.map((img, i) => (
              <div key={i} style={s.imageRow}>
                <img src={URL.createObjectURL(img)} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} alt="" />
                <span style={{ flex: 1, fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</span>
                <button onClick={() => moveImage(i, -1)} disabled={i === 0} style={s.iconBtn}>↑</button>
                <button onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} style={s.iconBtn}>↓</button>
                <button onClick={() => removeImage(i)} style={s.iconBtn}>✕</button>
              </div>
            ))}
            {images.length < 10 && (
              <label style={s.uploadLabel}>
                <span style={{ fontSize: 13, color: '#aaa' }}>+ 이미지 추가 ({images.length}/10)</span>
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => addImages(e.target.files)} />
              </label>
            )}
          </div>
        )}

        <div style={{ width: '100%' }}>
          <p style={s.sectionLabel}>만료 시간</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['3h', '3시간'], ['12h', '12시간'], ['24h', '24시간'], ['forever', '영구']].map(([v, l]) => (
              <button key={v}
                style={{ ...s.tab, flex: 1, fontSize: 12, padding: '8px 4px', background: expires === v ? '#111' : '#fff', color: expires === v ? '#fff' : '#555', borderColor: expires === v ? '#111' : '#e5e5e5' }}
                onClick={() => setExpires(v)}>{l}</button>
            ))}
          </div>
        </div>

        <button style={{ ...s.btnMain, width: '100%' }} onClick={submit} disabled={loading}>
          {loading ? '올리는 중...' : '공유하기'}
        </button>

      </div>
    </div>
  )
}

const s = {
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: '20px 16px', boxSizing: 'border-box' },
  card: { background: '#fff', padding: '24px 20px', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 480, border: '0.5px solid #e5e5e5', boxSizing: 'border-box' },
  logo: { width: 28, height: 28, background: '#111', borderRadius: 6, flexShrink: 0 },
  siteName: { fontSize: 15, fontWeight: 500, color: '#111', letterSpacing: '-0.2px' },
  logoutBtn: { fontSize: 12, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' },
  divider: { width: '100%', height: '0.5px', background: '#e5e5e5' },
  tab: { padding: '9px 0', borderRadius: 8, border: '0.5px solid', cursor: 'pointer', fontSize: 13, fontWeight: 500, flex: 1, fontFamily: 'inherit' },
  section: { width: '100%', background: '#fafafa', borderRadius: 10, padding: 14, boxSizing: 'border-box' },
  sectionLabel: { fontSize: 12, fontWeight: 500, color: '#111', margin: '0 0 8px' },
  input: { padding: '9px 11px', borderRadius: 7, border: '0.5px solid #e5e5e5', background: '#fff', color: '#111', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', width: '100%' },
  iconBtn: { color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '0 3px', fontFamily: 'inherit' },
  smallBtn: { padding: '6px 12px', borderRadius: 6, border: '0.5px solid #e5e5e5', background: '#fff', color: '#555', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' },
  uploadLabel: { display: 'block', border: '0.5px dashed #ddd', borderRadius: 8, padding: '14px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', boxSizing: 'border-box', width: '100%' },
  previewBox: { background: '#fafafa', border: '0.5px solid #e5e5e5', borderRadius: 8, padding: 12, width: '100%', color: '#333', fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto', boxSizing: 'border-box' },
  imageRow: { display: 'flex', alignItems: 'center', gap: 8, background: '#fafafa', borderRadius: 8, padding: '8px 10px', border: '0.5px solid #e5e5e5' },
  btnMain: { padding: '12px 0', borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' },
  btnSub: { padding: '10px 0', borderRadius: 8, background: '#fff', color: '#555', border: '0.5px solid #e5e5e5', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' },
  doneTitle: { fontSize: 16, fontWeight: 500, color: '#111', margin: 0 },
  doneSub: { fontSize: 12, color: '#999', margin: 0 },
  linkBox: { background: '#fafafa', border: '0.5px solid #e5e5e5', borderRadius: 8, padding: '10px 12px', width: '100%', boxSizing: 'border-box', cursor: 'text' },
  toast: { position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontFamily: 'inherit', zIndex: 9999 },
}
