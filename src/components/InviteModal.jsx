import { useState } from 'react'
import styles from './InviteModal.module.css'
import { X, Copy, Check, Link, Mail, Users } from 'lucide-react'

export default function InviteModal({ meetingId, onClose }) {
  const [copied, setCopied] = useState(null)

  const meetingLink = `${window.location.origin}?join=${meetingId}`

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const shareItems = [
    {
      key: 'link',
      icon: <Link size={16} />,
      label: 'Meeting Link',
      value: meetingLink,
      display: meetingLink.replace('https://', ''),
    },
    {
      key: 'id',
      icon: <Users size={16} />,
      label: 'Meeting ID',
      value: meetingId,
      display: meetingId,
      mono: true,
    },
  ]

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}><Users size={18} /></div>
            <div>
              <h2 className={styles.title}>Invite People</h2>
              <p className={styles.subtitle}>Share the link or ID to add participants</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={17} /></button>
        </div>

        <div className={styles.body}>
          {shareItems.map(item => (
            <div key={item.key} className={styles.shareItem}>
              <div className={styles.shareLabel}>
                <span className={styles.shareLabelIcon}>{item.icon}</span>
                {item.label}
              </div>
              <div className={styles.shareRow}>
                <div className={`${styles.shareValue} ${item.mono ? styles.mono : ''}`}>
                  {item.display}
                </div>
                <button
                  className={`${styles.copyBtn} ${copied === item.key ? styles.copyBtnSuccess : ''}`}
                  onClick={() => copyText(item.value, item.key)}
                >
                  {copied === item.key ? (
                    <><Check size={13} /> Copied!</>
                  ) : (
                    <><Copy size={13} /> Copy</>
                  )}
                </button>
              </div>
            </div>
          ))}

          <div className={styles.divider}>
            <span>or invite via</span>
          </div>

          <button className={styles.emailBtn}>
            <Mail size={16} />
            <span>Send Email Invite</span>
          </button>
        </div>

        <div className={styles.footer}>
          <div className={styles.participantLimit}>
            <Users size={13} />
            <span>This meeting supports up to <strong>10 participants</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
