import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('authed') === 'yes') {
      const id = new URLSearchParams(window.location.search).get('id')
      if (id) router.push(`/view/${id}`)
      else router.push('/upload')
    }
  }, [])

  const login = () => {
    if (pw === process.env.NEXT_PUBLIC_SITE_PASSWORD) {
      localStorage.setItem('authed', 'yes')
      const id = new URLSearchParams(window.location.search).get('id')
      if (id) router.push(`/view/${id}`)
      else router.push('/upload')
    } else {
      setError(true)
    }
  }

  return (
    <div style={s.center}>
      <div style={s.card}>
        <div style={s.logo} />
        <h2 style={s.title}>자물쇠</h2>
        <p style={s.sub}>비밀번호로 입장하세요</p>
        <input
          style={{ ...s.input, borderColor: error ? '#e5e5e5' : '#e5e5e5', outline: error ? '1.5px solid #111' : 'none' }}
          type="password"
          placeholder="비밀번호 입력"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(false) }}
          onKeyDown={e => e.key === 'Enter' && login()}
        />
        {error && <p style={s.error}>비밀번호가 틀렸어요</p>}
        <button style={s.btn} onClick={login}>입장하기</button>
      </div>
    </div>
  )
}

const s = {
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' },
  card: { background: '#fff', padding: '36px 32px', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 320, border: '0.5px solid #e5e5e5', boxSizing: 'border-box' },
  logo: { width: 36, height: 36, background: '#111', borderRadius: 8 },
  title: { color: '#111', margin: 0, fontSize: 18, fontWeight: 500, letterSpacing: '-0.3px' },
  sub: { color: '#999', fontSize: 12, margin: 0 },
  input: { padding: '10px 12px', borderRadius: 8, border: '0.5px solid #e5e5e5', background: '#fafafa', color: '#111', fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  error: { color: '#111', fontSize: 12, margin: 0 },
  btn: { padding: '11px 0', borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, width: '100%', fontFamily: 'inherit' },
}
