import { useState, useEffect, useRef } from 'react'
import styles from './SettingsModal.module.css'
import { X, Mic, Video, Volume2, Monitor, ChevronDown } from 'lucide-react'

export default function SettingsModal({ onClose }) {
  const [devices, setDevices] = useState({ audio: [], video: [], output: [] })
  const [selected, setSelected] = useState({ audio: '', video: '', output: '' })
  const [activeTab, setActiveTab] = useState('audio')

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(list => {
      const audio  = list.filter(d => d.kind === 'audioinput')
      const video  = list.filter(d => d.kind === 'videoinput')
      const output = list.filter(d => d.kind === 'audiooutput')
      setDevices({ audio, video, output })
      setSelected({
        audio:  audio[0]?.deviceId  || '',
        video:  video[0]?.deviceId  || '',
        output: output[0]?.deviceId || '',
      })
    }).catch(() => {})
  }, [])

  const tabs = [
    { id: 'audio',  label: 'Audio',   icon: <Mic size={15} /> },
    { id: 'video',  label: 'Video',   icon: <Video size={15} /> },
    { id: 'output', label: 'Speaker', icon: <Volume2 size={15} /> },
  ]

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}><Monitor size={18} /></div>
          <h2 className={styles.title}>Device Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={17} /></button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabs.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={styles.body}>
          {activeTab === 'audio' && (
            <SettingGroup label="Microphone" icon={<Mic size={16} />}
              devices={devices.audio} value={selected.audio}
              onChange={v => setSelected(s => ({ ...s, audio: v }))} />
          )}
          {activeTab === 'video' && (
            <SettingGroup label="Camera" icon={<Video size={16} />}
              devices={devices.video} value={selected.video}
              onChange={v => setSelected(s => ({ ...s, video: v }))} />
          )}
          {activeTab === 'output' && (
            <SettingGroup label="Speaker / Headphones" icon={<Volume2 size={16} />}
              devices={devices.output} value={selected.output}
              onChange={v => setSelected(s => ({ ...s, output: v }))} />
          )}

          {/* Noise suppression & echo cancellation toggles */}
          <div className={styles.toggleSection}>
            <ToggleRow label="Noise Suppression" defaultOn />
            <ToggleRow label="Echo Cancellation" defaultOn />
            <ToggleRow label="Auto Gain Control" defaultOn />
            {activeTab === 'video' && <ToggleRow label="HD Video (720p)" />}
            {activeTab === 'video' && <ToggleRow label="Mirror my video" defaultOn />}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.saveBtn} onClick={onClose}>Save Settings</button>
        </div>
      </div>
    </div>
  )
}

function SettingGroup({ label, icon, devices, value, onChange }) {
  return (
    <div className={styles.settingGroup}>
      <label className={styles.groupLabel}>
        <span className={styles.groupIcon}>{icon}</span>
        {label}
      </label>
      <div className={styles.selectWrap}>
        <select
          className={styles.select}
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {devices.length === 0 && <option value="">No device found</option>}
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Device ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className={styles.selectArrow} />
      </div>
    </div>
  )
}

function ToggleRow({ label, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
        onClick={() => setOn(v => !v)}
        aria-pressed={on}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}
