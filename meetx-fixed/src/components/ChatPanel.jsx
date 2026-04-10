import { useState, useRef, useEffect } from 'react'
import styles from './ChatPanel.module.css'
import { Send, Smile, Paperclip } from 'lucide-react'

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👏', '🤔', '😮']

export default function ChatPanel({ messages, onSend, onUpload }) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (file) { onUpload(file); e.target.value = '' }
  }

  const groupedMessages = messages.reduce((groups, msg, i) => {
    const prev = messages[i - 1]
    const showAvatar = !prev || prev.sender !== msg.sender
    groups.push({ ...msg, showAvatar })
    return groups
  }, [])

  return (
    <div className={styles.chat}>
      {/* Messages */}
      <div className={styles.messages}>
        {groupedMessages.map((msg, i) => (
          <div key={msg.id} className={`${styles.msgGroup} ${msg.own ? styles.own : ''}`}>
            {!msg.own && msg.showAvatar && (
              <div className={styles.avatarWrap}>
                <div className={styles.avatar} style={{ '--c': msg.color }}>
                  {msg.avatar}
                </div>
              </div>
            )}
            <div className={styles.msgContent}>
              {!msg.own && msg.showAvatar && (
                <div className={styles.senderName}>{msg.sender}</div>
              )}
              <div className={styles.bubble}>
                <p className={styles.msgText}>{msg.text}</p>
              </div>
              <div className={styles.msgMeta}>{msg.time}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className={styles.emojiPicker}>
          {EMOJIS.map(e => (
            <button
              key={e}
              className={styles.emojiBtn}
              onClick={() => {
                setText(t => t + e)
                inputRef.current?.focus()
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={styles.inputArea}>
        <div className={styles.inputRow}>
          <button
            className={styles.actionBtn}
            onClick={() => setShowEmoji(v => !v)}
            title="Emojis"
          >
            <Smile size={17} />
          </button>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            rows={1}
          />
          <button className={styles.actionBtn} onClick={() => fileRef.current?.click()} title="Share file">
            <Paperclip size={17} />
          </button>
          <button
            className={`${styles.sendBtn} ${text.trim() ? styles.sendActive : ''}`}
            onClick={submit}
            title="Send"
          >
            <Send size={16} />
          </button>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>
    </div>
  )
}
