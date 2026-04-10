import { useRef } from 'react'
import styles from './FilesPanel.module.css'
import { Upload, Download, FileText, Image, Archive } from 'lucide-react'
import { FILE_ICONS } from '../utils/mockData.js'

export default function FilesPanel({ files, onUpload }) {
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (file) { onUpload(file); e.target.value = '' }
  }

  const getFileInfo = (type) => FILE_ICONS[type] || FILE_ICONS.default

  return (
    <div className={styles.panel}>
      <div className={styles.uploadZone} onClick={() => fileRef.current?.click()}>
        <div className={styles.uploadIcon}><Upload size={20} /></div>
        <div className={styles.uploadText}>
          <span className={styles.uploadPrimary}>Click to share a file</span>
          <span className={styles.uploadSecondary}>Any format, up to 100MB</span>
        </div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      <div className={styles.fileList}>
        <div className={styles.sectionLabel}>Shared Files ({files.length})</div>
        {files.map(f => {
          const info = getFileInfo(f.type)
          return (
            <div key={f.id} className={styles.fileItem}>
              <div className={styles.fileIcon} style={{ '--fc': info.color }}>
                {info.icon}
              </div>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{f.name}</span>
                <span className={styles.fileMeta}>
                  {f.sender} · {f.size} · {f.time}
                </span>
              </div>
              <button className={styles.downloadBtn} title="Download">
                <Download size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
