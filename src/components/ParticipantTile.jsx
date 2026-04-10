import { useRef, useEffect } from 'react'
import styles from './ParticipantTile.module.css'
import { Mic, MicOff, Pin, PinOff, Crown } from 'lucide-react'

export default function ParticipantTile({
  participant: p,
  localVideoRef,
  isSpotlight,
  isStrip,
  onPin,
}) {
  const tileClass = [
    styles.tile,
    isSpotlight ? styles.spotlight : '',
    isStrip ? styles.strip : '',
    p.speaking ? styles.speaking : '',
    p.isMe ? styles.me : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={tileClass}>
      {/* Video or avatar */}
      {p.camOn ? (
        p.isMe ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={styles.video}
          />
        ) : (
          <div className={styles.fakeVideo}>
            {/* Animated gradient representing remote video */}
            <div
              className={styles.videoGradient}
              style={{
                background: `linear-gradient(135deg, ${p.color}22, ${p.color}08, #0d1117)`,
              }}
            />
            <div className={styles.avatarLarge} style={{ '--c': p.color }}>
              {p.avatar}
            </div>
            <div className={styles.videoSimLabel}>Camera On</div>
          </div>
        )
      ) : (
        <div className={styles.noVideo}>
          <div
            className={styles.avatarMain}
            style={{ '--c': p.color }}
          >
            {p.avatar}
          </div>
          <span className={styles.noVideoLabel}>Camera off</span>
        </div>
      )}

      {/* Overlay controls */}
      <div className={styles.overlay}>
        {/* Bottom bar */}
        <div className={styles.bottomBar}>
          <div className={styles.nameTag}>
            {p.isHost && (
              <span className={styles.hostCrown}>
                <Crown size={10} />
              </span>
            )}
            <span className={styles.name}>{p.isMe ? `${p.name} (You)` : p.name}</span>
          </div>
          <button
            className={`${styles.micIcon} ${!p.micOn ? styles.micOff : ''}`}
            title={p.micOn ? 'Microphone on' : 'Microphone off'}
          >
            {p.micOn ? <Mic size={12} /> : <MicOff size={12} />}
          </button>
        </div>

        {/* Pin button on hover */}
        <button className={styles.pinBtn} onClick={onPin} title={isSpotlight ? 'Unpin' : 'Pin'}>
          {isSpotlight ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
      </div>

      {/* Speaking indicator ring */}
      {p.speaking && <div className={styles.speakingRing} />}
    </div>
  )
}
