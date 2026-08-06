/**
 * StreamXYZ Backend Server
 * Express + Socket.IO — WebRTC signaling server
 *
 * Install:  cd server && npm install
 * Run:      node index.js
 * Env:      PORT=5000 (default)
 */

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')
const { v4: uuidv4 } = require('uuid')

// ── App setup ────────────────────────────────────────────────────────────────
const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
})

app.use(cors())
app.use(express.json())

// ── In-memory state (replace with MongoDB for persistence) ───────────────────
const rooms = new Map()   // roomId → { participants: Map<socketId, user> }
const users = new Map()   // socketId → { userId, roomId, name }

// ── REST endpoints ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, users: users.size })
})

app.post('/api/rooms', (req, res) => {
  const roomId = `MXT-${rand4()}-${rand4()}`
  rooms.set(roomId, { id: roomId, participants: new Map(), createdAt: Date.now() })
  res.json({ roomId })
})

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json({
    roomId: room.id,
    participantCount: room.participants.size,
    createdAt: room.createdAt,
  })
})

// ── Socket.IO signaling ───────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[+] Socket connected: ${socket.id}`)

  // ── Join room ──────────────────────────────────────────────────────────────
  socket.on('join-room', ({ roomId, userId, name } = {}) => {
    // Validate required fields
    if (!roomId || !userId) {
      socket.emit('error', { message: 'roomId and userId are required' })
      return
    }
    const safeName = (name || 'Guest').trim().slice(0, 50)
    // Ensure room exists
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { id: roomId, participants: new Map(), createdAt: Date.now() })
    }

    const room = rooms.get(roomId)

    // Limit to 10 participants
    if (room.participants.size >= 10) {
      socket.emit('room-full')
      return
    }

    socket.join(roomId)

    const user = { userId, name: safeName, socketId: socket.id, roomId, joinedAt: Date.now() }
    room.participants.set(socket.id, user)
    users.set(socket.id, user)

    // Tell existing participants about the new joiner
    socket.to(roomId).emit('user-connected', { userId, socketId: socket.id, name: safeName })

    // Send existing participants list to the new joiner
    const existingParticipants = [...room.participants.values()]
      .filter(p => p.socketId !== socket.id)
    socket.emit('existing-participants', existingParticipants)

    console.log(`[Room ${roomId}] ${safeName} joined (${room.participants.size} total)`)
  })

  // ── WebRTC signaling ───────────────────────────────────────────────────────
  socket.on('offer', ({ offer, to, from }) => {
    io.to(to).emit('offer', { offer, from })
  })

  socket.on('answer', ({ answer, to, from }) => {
    io.to(to).emit('answer', { answer, from })
  })

  socket.on('ice-candidate', ({ candidate, to, from }) => {
    io.to(to).emit('ice-candidate', { candidate, from })
  })

  // ── Chat message ───────────────────────────────────────────────────────────
  socket.on('send-message', ({ roomId, message }) => {
    const user = users.get(socket.id)
    if (!user) return

    const msg = {
      id:     uuidv4(),
      sender: user.name,
      text:   message,
      time:   new Date().toISOString(),
    }

    // Broadcast to everyone in room except sender
    socket.to(roomId).emit('new-message', msg)
  })

  // ── Media state change (mic/cam toggle) ────────────────────────────────────
  socket.on('media-state', ({ roomId, micOn, camOn }) => {
    socket.to(roomId).emit('peer-media-state', {
      socketId: socket.id,
      micOn,
      camOn,
    })
  })

  // ── Raise hand ─────────────────────────────────────────────────────────────
  socket.on('raise-hand', ({ roomId, raised }) => {
    const user = users.get(socket.id)
    socket.to(roomId).emit('peer-hand', {
      socketId: socket.id,
      name: user?.name,
      raised,
    })
  })

  // ── File share notification ────────────────────────────────────────────────
  socket.on('file-shared', ({ roomId, file }) => {
    const user = users.get(socket.id)
    socket.to(roomId).emit('new-file', {
      ...file,
      sender: user?.name,
      time: new Date().toISOString(),
    })
  })

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const user = users.get(socket.id)
    if (user) {
      const room = rooms.get(user.roomId)
      if (room) {
        room.participants.delete(socket.id)
        if (room.participants.size === 0) {
          rooms.delete(user.roomId)
          console.log(`[Room ${user.roomId}] Empty — removed`)
        } else {
          io.to(user.roomId).emit('user-disconnected', {
            socketId: socket.id,
            userId: user.userId,
            name: user.name,
          })
        }
      }
      users.delete(socket.id)
      console.log(`[-] ${user.name} disconnected from ${user.roomId}`)
    }
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function rand4() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`\n🚀 MeetYZ Server running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health\n`)
})
