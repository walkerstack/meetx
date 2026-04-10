import { useState, useEffect, useRef } from 'react'
import styles from './MeetingRoom.module.css'
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  MessageSquare, Users, Paperclip, PhoneOff,
  Grid, Layout, Shield, Settings, X, Signal, UserPlus, Copy, Check
} from 'lucide-react'
import { FILE_ICONS } from '../utils/mockData.js'
import ParticipantTile from './ParticipantTile.jsx'
import ChatPanel from './ChatPanel.jsx'
import ParticipantsPanel from './ParticipantsPanel.jsx'
import FilesPanel from './FilesPanel.jsx'
import SettingsModal from './SettingsModal.jsx'
import InviteModal from './InviteModal.jsx'
import { useToast } from './Toast.jsx'
import { useSocket } from '../hooks/useSocket.js'

export default function MeetingRoom({ meeting, onLeave }) {
  const [micOn, setMicOn]         = useState(meeting.micOn)
  const [camOn, setCamOn]         = useState(meeting.camOn)
  const [screenOn, setScreenOn]   = useState(false)
  const [layout, setLayout]       = useState('grid')
  const [sidePanel, setSidePanel] = useState(null)
  const [participants, setParticipants] = useState([])   // real peers via Socket.IO
  const [messages, setMessages]   = useState([])
  const [files, setFiles]         = useState([])
  const [duration, setDuration]   = useState(0)
  const [handRaised, setHandRaised]       = useState(false)
  const [networkQuality]                  = useState(4)
  const [pinnedId, setPinnedId]           = useState(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showSettings, setShowSettings]   = useState(false)
  const [showInvite, setShowInvite]       = useState(false)
  const [idCopied, setIdCopied]           = useState(false)
  const [localStream, setLocalStream]     = useState(null)
  const localVideoRef = useRef(null)
  const timerRef      = useRef(null)
  const toast = useToast()
  const { socket } = useSocket({ enabled: true })

  useEffect(() => {
  if (!socket) return
  socket.emit('join-room', {
    roomId: meeting.meetingId,
    userId: socket.id,
    name: meeting.name || 'Guest',
  })
}, [socket])

  // Sync participants list from socket events
  useEffect(() => {
    if (!socket) return

    const onExistingParticipants = (list) => {
      setParticipants(list.map(p => ({
        id: p.socketId, name: p.name,
        avatar: (p.name || '?')[0].toUpperCase(),
        color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
        micOn: true, camOn: true, speaking: false, isHost: false,
      })))
    }

    const onUserConnected = ({ socketId, name: peerName }) => {
      setParticipants(prev => {
        if (prev.find(p => p.id === socketId)) return prev
        return [...prev, {
          id: socketId, name: peerName,
          avatar: (peerName || '?')[0].toUpperCase(),
          color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
          micOn: true, camOn: true, speaking: false, isHost: false,
        }]
      })
    }

    const onUserDisconnected = ({ socketId }) => {
      setParticipants(prev => prev.filter(p => p.id !== socketId))
    }

    const onPeerMediaState = ({ socketId, micOn: m, camOn: c }) => {
      setParticipants(prev => prev.map(p => p.id === socketId ? { ...p, micOn: m, camOn: c } : p))
    }

    const onNewMessage = (msg) => {
      setMessages(prev => [...prev, {
        id: msg.id, sender: msg.sender,
        avatar: (msg.sender || '?')[0].toUpperCase(),
        color: '#94a3b8', text: msg.text,
        time: new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        own: false,
      }])
    }

    const onNewFile = (file) => {
      setFiles(prev => [...prev, {
        id: `f${Date.now()}`, name: file.name, size: file.size || '?',
        type: file.type || 'file', sender: file.sender,
        time: new Date(file.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
      setSidePanel('files')
      toast.info(`${file.sender} shared a file`)
    }

    const onRoomFull = () => toast.error('Meeting is full (max 10 participants)')

    socket.on('existing-participants', onExistingParticipants)
    socket.on('user-connected', onUserConnected)
    socket.on('user-disconnected', onUserDisconnected)
    socket.on('peer-media-state', onPeerMediaState)
    socket.on('new-message', onNewMessage)
    socket.on('new-file', onNewFile)
    socket.on('room-full', onRoomFull)

    return () => {
      socket.off('existing-participants', onExistingParticipants)
      socket.off('user-connected', onUserConnected)
      socket.off('user-disconnected', onUserDisconnected)
      socket.off('peer-media-state', onPeerMediaState)
      socket.off('new-message', onNewMessage)
      socket.off('new-file', onNewFile)
      socket.off('room-full', onRoomFull)
    }
  }, [socket])

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Welcome toast only — no fake participants
  useEffect(() => {
    const t = setTimeout(() => toast.success(`Joined ${meeting.meetingId}`), 600)
    return () => clearTimeout(t)
  }, [])

  // Local camera — FIX: use ref to avoid stale closure causing stop/restart loop
  const localStreamRef2 = useRef(null)
  useEffect(() => {
    if (camOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(s => {
          // Stop any previous stream first
          if (localStreamRef2.current) localStreamRef2.current.getTracks().forEach(t => t.stop())
          localStreamRef2.current = s
          setLocalStream(s)
          if (localVideoRef.current) localVideoRef.current.srcObject = s
        })
        .catch(() => setCamOn(false))
    } else {
      if (localStreamRef2.current) {
        localStreamRef2.current.getTracks().forEach(t => t.stop())
        localStreamRef2.current = null
      }
      setLocalStream(null)
      if (localVideoRef.current) localVideoRef.current.srcObject = null
    }
    return () => {
      if (localStreamRef2.current) {
        localStreamRef2.current.getTracks().forEach(t => t.stop())
        localStreamRef2.current = null
      }
    }
  }, [camOn])

  const fmt = (s) => {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const copyId = () => {
    navigator.clipboard.writeText(meeting.meetingId)
    setIdCopied(true); setTimeout(() => setIdCopied(false), 2000)
    toast.success('Meeting ID copied!')
  }

  const sendMessage = (text) => {
    setMessages(prev => [...prev, {
      id: `m${Date.now()}`,
      sender: 'You',
      avatar: (meeting.name || 'Y')[0].toUpperCase(),
      color: '#3b82f6', text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      own: true
    }])
    if (socket) socket.emit('send-message', { roomId: meeting.meetingId, message: text })
  }

  const uploadFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase()
    const size = file.size > 1024*1024
      ? `${(file.size/1048576).toFixed(1)} MB`
      : `${Math.round(file.size/1024)} KB`
    const fileData = {
      id: `f${Date.now()}`, name: file.name, size,
      type: ext, sender: 'You',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setFiles(prev => [...prev, fileData])
    setSidePanel('files')
    toast.success(`"${file.name}" shared`)
    if (socket) socket.emit('file-shared', {
      roomId: meeting.meetingId,
      file: { name: file.name, size, type: ext }
    })
  }

  const toggleMic = () => setMicOn(v => {
    const next = !v
    toast.info(next ? 'Mic on' : 'Mic muted')
    if (socket) socket.emit('media-state', { roomId: meeting.meetingId, micOn: next, camOn })
    return next
  })
  const toggleCam = () => setCamOn(v => {
    const next = !v
    toast.info(next ? 'Camera on' : 'Camera off')
    if (socket) socket.emit('media-state', { roomId: meeting.meetingId, micOn, camOn: next })
    return next
  })
  const toggleScreen = () => setScreenOn(v => { toast.info(v ? 'Screen share stopped' : 'Sharing screen'); return !v })
  const toggleHand = () => setHandRaised(v => {
    const next = !v
    toast.info(next ? '✋ Hand raised' : 'Hand lowered')
    if (socket) socket.emit('raise-hand', { roomId: meeting.meetingId, raised: next })
    return next
  })
  const togglePanel  = (p) => setSidePanel(prev => prev === p ? null : p)

  const me = {
    id: 'me', name: meeting.name || 'You',
    avatar: (meeting.name||'Y')[0].toUpperCase(),
    color: '#3b82f6', speaking: false, micOn, camOn, isMe: true, isHost: true,
  }

  const allParticipants = [me, ...participants]
  const pinned  = pinnedId ? allParticipants.find(p => p.id === pinnedId) : null
  const others  = pinnedId ? allParticipants.filter(p => p.id !== pinnedId) : allParticipants
  const alone   = participants.length === 0

  const qColors = ['','#f43f5e','#f59e0b','#f59e0b','#10b981','#10b981']
  const qLabels = ['','Poor','Fair','Good','Great','Excellent']

  return (
    <div className={styles.room}>
      {/* TOP BAR */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <div className={styles.logoMini}><Video size={14} color="#fff" /><span>MeetX</span></div>
          <div className={styles.meetingInfo}>
            <span className={styles.meetingId}>{meeting.meetingId}</span>
            <span className={styles.separator}>·</span>
            <span className={styles.timer}>{fmt(duration)}</span>
          </div>
          <button className={styles.copyIdBtn} onClick={copyId}>
            {idCopied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy ID</>}
          </button>
        </div>

        <div className={styles.topCenter}>
          <div className={styles.networkBadge} style={{'--nq-color': qColors[networkQuality]}}>
            <Signal size={13}/>
            <span>{qLabels[networkQuality]}</span>
            <div className={styles.networkBars}>
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`${styles.bar} ${i<=networkQuality ? styles.barActive : ''}`}/>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.topRight}>
          <div className={styles.participantCount}><Users size={14}/><span>{allParticipants.length}</span></div>
          <button className={styles.topBtn} onClick={() => setShowSettings(true)} title="Settings"><Settings size={16}/></button>
          <button className={styles.topBtn} onClick={() => setShowInvite(true)} title="Invite"><UserPlus size={16}/></button>
          <button className={styles.endCallBtn} onClick={() => setShowLeaveModal(true)}><PhoneOff size={16}/><span>End</span></button>
        </div>
      </header>

      {/* MAIN */}
      <div className={styles.main}>
        <div className={styles.videoArea}>
          {!alone && (
            <div className={styles.layoutToggle}>
              <button className={`${styles.layoutBtn} ${layout==='grid' ? styles.layoutBtnActive:''}`} onClick={() => setLayout('grid')}><Grid size={15}/></button>
              <button className={`${styles.layoutBtn} ${layout==='spotlight' ? styles.layoutBtnActive:''}`} onClick={() => setLayout('spotlight')}><Layout size={15}/></button>
            </div>
          )}

          {alone ? (
            /* ── WAITING ROOM ── */
            <div className={styles.waitingRoom}>
              <div className={styles.waitingVideoWrap}>
                <ParticipantTile participant={me} localVideoRef={localVideoRef} isSpotlight onPin={() => {}} />
              </div>
              <div className={styles.waitingOverlay}>
                <div className={styles.waitingCard}>
                  <div className={styles.waitingIcon}>👋</div>
                  <h2 className={styles.waitingTitle}>You're the only one here</h2>
                  <p className={styles.waitingDesc}>Share your meeting ID with others so they can join</p>
                  <div className={styles.waitingIdBox}>
                    <span className={styles.waitingIdText}>{meeting.meetingId}</span>
                    <button className={styles.waitingCopyBtn} onClick={copyId}>
                      {idCopied ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Copy</>}
                    </button>
                  </div>
                  <button className={styles.waitingInviteBtn} onClick={() => setShowInvite(true)}>
                    <UserPlus size={16}/> Invite People
                  </button>
                  <p className={styles.waitingHint}>
                    Others open <strong>{import.meta.env.VITE_APP_URL || 'localhost:3000'}</strong> → Join Meeting → paste the ID above
                  </p>
                </div>
              </div>
            </div>
          ) : layout === 'grid' ? (
            <div className={`${styles.grid} ${styles[`grid${Math.min(allParticipants.length,6)}`]}`}>
              {allParticipants.map(p => (
                <ParticipantTile key={p.id} participant={p} localVideoRef={p.isMe ? localVideoRef : null}
                  onPin={() => { setPinnedId(p.id); setLayout('spotlight') }} />
              ))}
            </div>
          ) : (
            <div className={styles.spotlight}>
              {pinned
                ? <ParticipantTile participant={pinned} localVideoRef={pinned.isMe ? localVideoRef:null} isSpotlight onPin={() => { setPinnedId(null); setLayout('grid') }}/>
                : <ParticipantTile participant={me} localVideoRef={localVideoRef} isSpotlight onPin={() => setLayout('grid')}/>
              }
              <div className={styles.stripRow}>
                {others.slice(0,5).map(p => (
                  <ParticipantTile key={p.id} participant={p} localVideoRef={p.isMe ? localVideoRef:null} isStrip onPin={() => setPinnedId(p.id)}/>
                ))}
              </div>
            </div>
          )}
        </div>

        {sidePanel && (
          <div className={styles.sidePanel}>
            <div className={styles.sidePanelHeader}>
              <span className={styles.sidePanelTitle}>
                {sidePanel==='chat' && 'Meeting Chat'}
                {sidePanel==='participants' && `Participants (${allParticipants.length})`}
                {sidePanel==='files' && `Shared Files (${files.length})`}
              </span>
              <button className={styles.closePanelBtn} onClick={() => setSidePanel(null)}><X size={16}/></button>
            </div>
            {sidePanel==='chat'         && <ChatPanel messages={messages} onSend={sendMessage} onUpload={uploadFile}/>}
            {sidePanel==='participants' && <ParticipantsPanel participants={allParticipants}/>}
            {sidePanel==='files'        && <FilesPanel files={files} onUpload={uploadFile}/>}
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <footer className={styles.controls}>
        <div className={styles.controlsLeft}>
          <div className={styles.secureChip}><Shield size={12}/><span>Encrypted</span></div>
        </div>
        <div className={styles.controlsCenter}>
          <div className={styles.controlGroup}>
            <button className={`${styles.controlBtn} ${!micOn?styles.controlBtnOff:''}`} onClick={toggleMic}>
              <span className={styles.controlIcon}>{micOn ? <Mic size={20}/> : <MicOff size={20}/>}</span>
              <span className={styles.controlLabel}>{micOn?'Mute':'Unmute'}</span>
            </button>
            <button className={`${styles.controlBtn} ${!camOn?styles.controlBtnOff:''}`} onClick={toggleCam}>
              <span className={styles.controlIcon}>{camOn ? <Video size={20}/> : <VideoOff size={20}/>}</span>
              <span className={styles.controlLabel}>{camOn?'Stop':'Start'}</span>
            </button>
            <button className={`${styles.controlBtn} ${screenOn?styles.controlBtnActive:''}`} onClick={toggleScreen}>
              <span className={styles.controlIcon}>{screenOn ? <MonitorOff size={20}/> : <Monitor size={20}/>}</span>
              <span className={styles.controlLabel}>Share</span>
            </button>
            <div className={styles.divider}/>
            <button className={`${styles.controlBtn} ${handRaised?styles.controlBtnActive:''}`} onClick={toggleHand}>
              <span className={styles.controlIcon} style={{fontSize:'20px'}}>✋</span>
              <span className={styles.controlLabel}>Hand</span>
            </button>
            <button className={`${styles.controlBtn} ${sidePanel==='chat'?styles.controlBtnActive:''}`} onClick={() => togglePanel('chat')}>
              <span className={styles.controlIcon}><MessageSquare size={20}/></span>
              <span className={styles.controlLabel}>Chat</span>
            </button>
            <button className={`${styles.controlBtn} ${sidePanel==='participants'?styles.controlBtnActive:''}`} onClick={() => togglePanel('participants')}>
              <span className={styles.controlIcon}><Users size={20}/></span>
              <span className={styles.controlLabel}>People</span>
            </button>
            <button className={`${styles.controlBtn} ${sidePanel==='files'?styles.controlBtnActive:''}`} onClick={() => togglePanel('files')}>
              <span className={styles.controlIcon}><Paperclip size={20}/></span>
              <span className={styles.controlLabel}>Files</span>
            </button>
          </div>
        </div>
        <div className={styles.controlsRight}>
          <button className={styles.leaveBtn} onClick={() => setShowLeaveModal(true)}>
            <PhoneOff size={18}/><span>Leave</span>
          </button>
        </div>
      </footer>

      {showLeaveModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowLeaveModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalIcon}><PhoneOff size={24} color="#f43f5e"/></div>
            <h3 className={styles.modalTitle}>Leave Meeting?</h3>
            <p className={styles.modalDesc}>Leave <strong>{meeting.meetingId}</strong>?</p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowLeaveModal(false)}>Stay</button>
              <button className={styles.modalLeave} onClick={onLeave}>Leave</button>
            </div>
          </div>
        </div>
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)}/>}
      {showInvite   && <InviteModal meetingId={meeting.meetingId} onClose={() => setShowInvite(false)}/>}
    </div>
  )
}
