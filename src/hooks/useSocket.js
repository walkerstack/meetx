import { useEffect, useRef, useState } from 'react'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

/**
 * useSocket — manages a Socket.IO connection lifecycle.
 *
 * Returns the socket instance once connected.
 * The socket is disconnected automatically when the component unmounts.
 *
 * Usage:
 *   const { socket, connected } = useSocket({ enabled: true })
 */
export function useSocket({ enabled = true } = {}) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!enabled) return

    // Lazy import so socket.io-client is only loaded when needed
    let socket
    import('socket.io-client').then(({ io }) => {
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      })

      socketRef.current = socket

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id)
        setConnected(true)
      })

      socket.on('disconnect', reason => {
        console.log('[Socket] Disconnected:', reason)
        setConnected(false)
      })

      socket.on('connect_error', err => {
        console.warn('[Socket] Connection error:', err.message)
        setConnected(false)
      })
    })

    return () => {
      if (socket) {
        socket.disconnect()
        setConnected(false)
      }
    }
  }, [enabled])

  return { socket: socketRef.current, connected }
}
