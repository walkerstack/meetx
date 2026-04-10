import { useState } from 'react'
import Lobby from './components/Lobby.jsx'
import MeetingRoom from './components/MeetingRoom.jsx'
import { ToastProvider } from './components/Toast.jsx'

export default function App() {
  const [screen, setScreen] = useState('lobby') // 'lobby' | 'room'
  const [meetingData, setMeetingData] = useState(null)

  const joinMeeting = (data) => {
    setMeetingData(data)
    setScreen('room')
  }

  const leaveMeeting = () => {
    setMeetingData(null)
    setScreen('lobby')
  }

  return (
    <ToastProvider>
      {screen === 'lobby' && <Lobby onJoin={joinMeeting} />}
      {screen === 'room' && <MeetingRoom meeting={meetingData} onLeave={leaveMeeting} />}
    </ToastProvider>
  )
}
