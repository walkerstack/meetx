import styles from './ParticipantsPanel.module.css'
import { Mic, MicOff, Video, VideoOff, Crown, MoreHorizontal } from 'lucide-react'

export default function ParticipantsPanel({ participants }) {
  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {participants.map(p => (
          <div key={p.id} className={styles.item}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar} style={{ '--c': p.color }}>
                {p.avatar}
              </div>
              {p.speaking && <span className={styles.speakingDot} />}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>
                {p.isMe ? `${p.name} (You)` : p.name}
                {p.isHost && (
                  <span className={styles.hostBadge}>
                    <Crown size={10} /> Host
                  </span>
                )}
              </div>
              {p.speaking && (
                <div className={styles.speakingLabel}>
                  <span className={styles.wave}>Speaking...</span>
                </div>
              )}
            </div>
            <div className={styles.icons}>
              <span className={`${styles.icon} ${!p.micOn ? styles.iconOff : ''}`}>
                {p.micOn ? <Mic size={14} /> : <MicOff size={14} />}
              </span>
              <span className={`${styles.icon} ${!p.camOn ? styles.iconOff : ''}`}>
                {p.camOn ? <Video size={14} /> : <VideoOff size={14} />}
              </span>
              {!p.isMe && (
                <button className={styles.moreBtn} title="Options">
                  <MoreHorizontal size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
