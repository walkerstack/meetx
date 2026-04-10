import { useEffect, useRef, useCallback, useState } from 'react'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

/**
 * useWebRTC — manages local media stream and peer connections.
 *
 * In production, pass a `socket` instance so signaling messages
 * (offer / answer / ice-candidate) get exchanged via Socket.IO.
 * Without a socket the hook still works for local preview.
 */
export function useWebRTC({ socket, roomId, userId, name, micOn, camOn }) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState({}) // { socketId: MediaStream }
  const [error, setError] = useState(null)
  const peersRef = useRef({})         // { socketId: RTCPeerConnection }
  const localStreamRef = useRef(null)
  const socketRef = useRef(socket)
  const userIdRef = useRef(userId)

  // Keep refs current so callbacks always have latest values
  useEffect(() => { socketRef.current = socket }, [socket])
  useEffect(() => { userIdRef.current = userId }, [userId])

  // ── Acquire local media ──────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    const constraints = { video: camOn, audio: micOn }

    if (!micOn && !camOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
        localStreamRef.current = null
        setLocalStream(null)
      }
      return
    }

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        // Replace old stream tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop())
        }
        localStreamRef.current = stream
        setLocalStream(stream)

        // Update tracks in all existing peer connections
        Object.values(peersRef.current).forEach(pc => {
          stream.getTracks().forEach(track => {
            const sender = pc.getSenders().find(s => s.track?.kind === track.kind)
            if (sender) sender.replaceTrack(track)
            else pc.addTrack(track, stream)
          })
        })
      })
      .catch(err => {
        console.warn('getUserMedia error:', err)
        setError(err.message)
      })

    return () => { active = false }
  }, [micOn, camOn])

  // ── Mute / unmute without restarting the stream ──────────────────────────
  useEffect(() => {
    if (!localStreamRef.current) return
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = micOn })
  }, [micOn])

  useEffect(() => {
    if (!localStreamRef.current) return
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = camOn })
  }, [camOn])

  // ── Socket.IO signaling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    // FIX: Send as object — server expects { roomId, userId, name }
    socket.emit('join-room', { roomId, userId, name })

    // FIX: user-connected receives { userId, socketId, name } — use socketId as peer key
    const onUserConnected = async ({ socketId: peerSocketId }) => {
      const pc = createPeerConnection(peerSocketId)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('offer', { offer, to: peerSocketId, from: socket.id })
      } catch (e) {
        console.error('Offer error', e)
      }
    }

    // FIX: from is the peer's socketId (passed as socket.id in offer emit)
    const onOffer = async ({ offer, from }) => {
      const pc = createPeerConnection(from)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('answer', { answer, to: from, from: socket.id })
      } catch (e) {
        console.error('Answer error', e)
      }
    }

    const onAnswer = async ({ answer, from }) => {
      const pc = peersRef.current[from]
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (e) {
          console.warn('setRemoteDescription answer error', e)
        }
      }
    }

    const onIceCandidate = async ({ candidate, from }) => {
      const pc = peersRef.current[from]
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) }
        catch (e) { console.warn('ICE error', e) }
      }
    }

    // FIX: user-disconnected sends { socketId, userId, name } — use socketId
    const onUserDisconnected = ({ socketId: peerSocketId }) => {
      if (peersRef.current[peerSocketId]) {
        peersRef.current[peerSocketId].close()
        delete peersRef.current[peerSocketId]
        setRemoteStreams(prev => {
          const next = { ...prev }
          delete next[peerSocketId]
          return next
        })
      }
    }

    socket.on('user-connected', onUserConnected)
    socket.on('offer', onOffer)
    socket.on('answer', onAnswer)
    socket.on('ice-candidate', onIceCandidate)
    socket.on('user-disconnected', onUserDisconnected)

    return () => {
      socket.off('user-connected', onUserConnected)
      socket.off('offer', onOffer)
      socket.off('answer', onAnswer)
      socket.off('ice-candidate', onIceCandidate)
      socket.off('user-disconnected', onUserDisconnected)
    }
  }, [socket, roomId, userId, name])

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(peersRef.current).forEach(pc => pc.close())
      peersRef.current = {}
      localStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const createPeerConnection = useCallback((peerSocketId) => {
    if (peersRef.current[peerSocketId]) return peersRef.current[peerSocketId]

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peersRef.current[peerSocketId] = pc

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    // FIX: Use refs so we always have the latest socket/userId values
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate,
          to: peerSocketId,
          from: socketRef.current.id,
        })
      }
    }

    // Remote stream
    pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        setRemoteStreams(prev => ({ ...prev, [peerSocketId]: streams[0] }))
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.iceConnectionState)) {
        setRemoteStreams(prev => {
          const next = { ...prev }
          delete next[peerSocketId]
          return next
        })
      }
    }

    return pc
  }, [])

  // ── Screen share ─────────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      })
      const videoTrack = screenStream.getVideoTracks()[0]

      Object.values(peersRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(videoTrack)
      })

      videoTrack.onended = stopScreenShare
      return screenStream
    } catch (e) {
      console.warn('Screen share error', e)
      return null
    }
  }, [])

  const stopScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return
    const videoTrack = localStreamRef.current.getVideoTracks()[0]
    if (!videoTrack) return
    Object.values(peersRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (sender) sender.replaceTrack(videoTrack)
    })
  }, [])

  return {
    localStream,
    remoteStreams,
    error,
    startScreenShare,
    stopScreenShare,
  }
}
