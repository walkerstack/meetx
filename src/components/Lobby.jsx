import { useState, useEffect, useRef } from 'react'
import styles from './Lobby.module.css'
import {
  Video, Mic, MicOff, VideoOff, Plus, ArrowRight,
  Users, Shield, Zap, Globe, ChevronRight, Copy, Check
} from 'lucide-react'

const RECENT_MEETINGS = [
  { id: 'MXT-7F2K-9P1L', name: 'Design Sprint Review', time: '2h ago', participants: 6 },
  { id: 'MXT-2J7Q-2N8R', name: 'Engineering Standup', time: 'Yesterday', participants: 8 },
  { id: 'MXT-1A1B-7C4D', name: 'Product Roadmap Q2', time: '2 days ago', participants: 12 },
]

function generateMeetingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `MXT-${seg()}-${seg()}`
}

export default function Lobby({ onJoin }) {
  const [tab, setTab] = useState('new') // 'new' | 'join'
  const [name, setName] = useState('')
  const [meetingId, setMeetingId] = useState('')
  const [generatedId] = useState(generateMeetingId)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [copied, setCopied] = useState(false)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    // Animate canvas background
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.4 + 0.1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Draw connections
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(q => {
          const d = Math.hypot(p.x - q.x, p.y - q.y)
          if (d < 100) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `rgba(59,130,246,${0.08 * (1 - d / 100)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.alpha})`
        ctx.fill()
        // Move
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      })
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const streamRef = useRef(null)
  useEffect(() => {
    if (camOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(s => {
          if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
          streamRef.current = s
          setStream(s)
          if (videoRef.current) videoRef.current.srcObject = s
        })
        .catch(() => setCamOn(false))
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      setStream(null)
      if (videoRef.current) videoRef.current.srcObject = null
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [camOn])

  const copyId = () => {
    navigator.clipboard.writeText(generatedId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoin = () => {
    const n = name.trim() || 'Guest User'
    const id = tab === 'new' ? generatedId : meetingId.trim() || generatedId
    onJoin({ name: n, meetingId: id, micOn, camOn })
  }

  const stats = [
    { icon: <Users size={16} />, label: 'Up to 10 participants' },
    { icon: <Shield size={16} />, label: 'End-to-end encrypted' },
    { icon: <Zap size={16} />, label: 'Ultra-low latency' },
    { icon: <Globe size={16} />, label: 'WebRTC powered' },
  ]

  return (
    <div className={styles.lobby}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Ambient glow orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      <div className={styles.inner}>
        {/* LEFT — branding + preview */}
        <div className={styles.left}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Video size={20} strokeWidth={2.5} color="#fff" />
            </div>
            <span className={styles.logoText}>Stream<span>XYZ</span></span>
            <span className={styles.logoBadge}>v2.0</span>
          </div>

          <h1 className={styles.headline}>
            Connect.<br />Collaborate.<br />
            <span className={styles.headlineAccent}>Create.</span>
          </h1>
          <p className={styles.tagline}>
            Crystal-clear video meetings with real-time<br />chat, file sharing & screen presentation.
          </p>

          {/* Stats */}
          <div className={styles.statsGrid}>
            {stats.map((s, i) => (
              <div key={i} className={styles.statItem}>
                <span className={styles.statIcon}>{s.icon}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Preview card */}
          <div className={styles.previewCard}>
            <div className={styles.previewVideo}>
              {camOn ? (
                <video ref={videoRef} autoPlay muted playsInline className={styles.videoEl} />
              ) : (
                <div className={styles.videoOff}>
                  <div className={styles.avatarCircle}>{(name || 'G')[0].toUpperCase()}</div>
                  <span>Camera is off</span>
                </div>
              )}
              <div className={styles.previewOverlay}>
                <span className={styles.liveChip}>
                  <span className={styles.liveDot} />
                  Preview
                </span>
              </div>
            </div>
            <div className={styles.previewControls}>
              <button
                className={`${styles.previewBtn} ${!micOn ? styles.previewBtnOff : ''}`}
                onClick={() => setMicOn(v => !v)}
                title={micOn ? 'Mute' : 'Unmute'}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                <span>{micOn ? 'Mic On' : 'Muted'}</span>
              </button>
              <button
                className={`${styles.previewBtn} ${!camOn ? styles.previewBtnOff : ''}`}
                onClick={() => setCamOn(v => !v)}
                title={camOn ? 'Camera off' : 'Camera on'}
              >
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
                <span>{camOn ? 'Cam On' : 'Cam Off'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div className={styles.right}>
          <div className={styles.card}>
            {/* Tab switcher */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${tab === 'new' ? styles.tabActive : ''}`}
                onClick={() => setTab('new')}
              >
                <Plus size={15} /> New Meeting
              </button>
              <button
                className={`${styles.tab} ${tab === 'join' ? styles.tabActive : ''}`}
                onClick={() => setTab('join')}
              >
                <ArrowRight size={15} /> Join Meeting
              </button>
              <div className={`${styles.tabSlider} ${tab === 'join' ? styles.tabSliderRight : ''}`} />
            </div>

            <div className={styles.form}>
              {/* Name input */}
              <div className={styles.field}>
                <label className={styles.label}>Your Name</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Enter your display name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              {tab === 'new' ? (
                <div className={styles.field}>
                  <label className={styles.label}>Meeting ID (auto-generated)</label>
                  <div className={styles.idRow}>
                    <div className={styles.idDisplay}>{generatedId}</div>
                    <button className={styles.copyBtn} onClick={copyId}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className={styles.hint}>Share this ID with participants to invite them</p>
                </div>
              ) : (
                <div className={styles.field}>
                  <label className={styles.label}>Meeting ID</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="e.g. MXT-8F2K-9P1L"
                    value={meetingId}
                    onChange={e => setMeetingId(e.target.value.toUpperCase())}
                  />
                </div>
              )}

              {/* Device toggles */}
              <div className={styles.deviceRow}>
                <div className={styles.deviceLabel}>Join with:</div>
                <div className={styles.deviceToggles}>
                  <button
                    className={`${styles.deviceToggle} ${micOn ? styles.deviceOn : styles.deviceOff}`}
                    onClick={() => setMicOn(v => !v)}
                  >
                    {micOn ? <Mic size={14} /> : <MicOff size={14} />}
                    <span>Mic</span>
                  </button>
                  <button
                    className={`${styles.deviceToggle} ${camOn ? styles.deviceOn : styles.deviceOff}`}
                    onClick={() => setCamOn(v => !v)}
                  >
                    {camOn ? <Video size={14} /> : <VideoOff size={14} />}
                    <span>Camera</span>
                  </button>
                </div>
              </div>

              <button className={styles.joinBtn} onClick={handleJoin}>
                <span>{tab === 'new' ? 'Start Meeting' : 'Join Now'}</span>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Recent meetings */}
            {RECENT_MEETINGS.length > 0 && (
              <div className={styles.recent}>
                <div className={styles.recentHeader}>Recent Meetings</div>
                {RECENT_MEETINGS.map(m => (
                  <div key={m.id} className={styles.recentItem} onClick={() => {
                    setMeetingId(m.id)
                    setTab('join')
                  }}>
                    <div className={styles.recentInfo}>
                      <span className={styles.recentName}>{m.name}</span>
                      <span className={styles.recentMeta}>{m.id} · {m.time}</span>
                    </div>
                    <div className={styles.recentRight}>
                      <span className={styles.recentParticipants}>
                        <Users size={11} /> {m.participants}
                      </span>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
