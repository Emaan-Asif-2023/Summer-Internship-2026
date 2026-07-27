import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import {
  Search,
  Send,
  Users,
  MessageSquare,
  ArrowLeft,
  Info,
  MapPin,
  ExternalLink,
  Bot
} from 'lucide-react'

export default function Chats() {
  const { user: currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // App & loading states
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorLoading, setErrorLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Active chat state
  const [selectedPeer, setSelectedPeer] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')

  // Mobile layout state
  const [showMobileChat, setShowMobileChat] = useState(false)

  // Scroll ref
  const messagesEndRef = useRef(null)

  // 1. Fetch connections on mount
  const fetchConnections = useCallback(async () => {
    setLoading(true)
    setErrorLoading(false)
    try {
      const token = localStorage.getItem('ts_token')
      const res = await api.get('/api/connections', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const conns = res.data || []
      setConnections(conns)

      // Determine which peer to start with
      let initialPeer = null
      
      // A. Check if navigated from another page with state (startChatWith)
      if (location.state?.startChatWith) {
        const routePeer = location.state.startChatWith
        // Find if this peer is in connections to ensure they are connected
        const found = conns.find(c => c.user.id === routePeer.id || c.user.id === routePeer._id)
        if (found) {
          initialPeer = found.user
        } else {
          // Fallback just in case payload user schema is direct
          initialPeer = routePeer
        }
        setShowMobileChat(true)
      } 
      // B. Otherwise, auto-select the first connection if available
      else if (conns.length > 0) {
        initialPeer = conns[0].user
      }

      if (initialPeer) {
        setSelectedPeer(initialPeer)
      }
    } catch (e) {
      console.error('Failed to load connections:', e)
      setErrorLoading(true)
      toast.error('Failed to load connections. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [location.state])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  // 2. Load messages from local storage when selectedPeer changes
  useEffect(() => {
    if (!currentUser || !selectedPeer) {
      setMessages([])
      return
    }

    const peerId = selectedPeer.id || selectedPeer._id
    const storageKey = `teamsync_chat_msg_${currentUser.id}_${peerId}`
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      try {
        setMessages(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse stored messages:', e)
        setMessages([])
      }
    } else {
      // Prepopulate with a few friendly mock messages if opening the chat for the first time
      const mockInit = [
        {
          id: `mock-1-${peerId}`,
          senderId: peerId,
          text: `Hey there! 👋 Nice connecting with you on TeamSync.`,
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
        },
        {
          id: `mock-2-${peerId}`,
          senderId: peerId,
          text: `I looked at your profile and really liked your skills. Are you working on any projects right now?`,
          timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        }
      ]
      localStorage.setItem(storageKey, JSON.stringify(mockInit))
      setMessages(mockInit)
    }
  }, [selectedPeer, currentUser])

  // 3. Scroll to bottom of message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 4. Send Message
  const handleSend = (e) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || !selectedPeer || !currentUser) return

    const peerId = selectedPeer.id || selectedPeer._id
    const storageKey = `teamsync_chat_msg_${currentUser.id}_${peerId}`

    const newMsg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      text: inputText.trim(),
      timestamp: new Date().toISOString()
    }

    const updated = [...messages, newMsg]
    setMessages(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    setInputText('')

    // 5. Automated simulated reply to show the flow beautifully
    setTimeout(() => {
      const replyMsg = {
        id: `msg-reply-${Date.now()}`,
        senderId: peerId,
        text: `Hey, thanks for the message! I'm currently away but I'll get back to you shortly. Let's collaborate soon! 🚀`,
        timestamp: new Date().toISOString()
      }
      // Re-read storage just in case of race condition
      const currentStored = localStorage.getItem(storageKey)
      const currentList = currentStored ? JSON.parse(currentStored) : updated
      const finalMsgs = [...currentList, replyMsg]
      setMessages(finalMsgs)
      localStorage.setItem(storageKey, JSON.stringify(finalMsgs))
      toast(`New reply from ${selectedPeer.name || 'Peer'}`, {
        icon: '💬',
        style: {
          borderRadius: '10px',
          background: '#334155',
          color: '#fff',
        }
      })
    }, 1500)
  }

  // Filter connections list
  const filteredConnections = connections.filter(conn => {
    const name = conn.user?.name || ''
    const uni = conn.user?.university || ''
    const query = searchQuery.toLowerCase()
    return name.toLowerCase().includes(query) || uni.toLowerCase().includes(query)
  })

  // Format time helper
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Initials generator
  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-80px)] flex flex-col">
      {/* Page Title & Back */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <MessageSquare className="text-indigo-600" size={22} />
            Messages
          </h1>
          <p className="text-xs text-slate-500">Coordinate and collaborate with your connections</p>
        </div>
        <Link 
          to="/discover"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all"
        >
          Discover Peers
        </Link>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm flex-1 overflow-hidden flex min-h-0">
        
        {/* Left Sidebar - Connections List */}
        <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col min-h-0 bg-slate-50/20 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Search bar */}
          <div className="p-4 border-b border-slate-100/80 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search connections..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-2xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-700"
              />
            </div>
          </div>

          {/* Connections List Feed */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              // Loading Skeletion
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="w-1/2 h-3.5 bg-slate-200 rounded" />
                    <div className="w-3/4 h-2.5 bg-slate-100 rounded" />
                  </div>
                </div>
              ))
            ) : errorLoading ? (
              <div className="py-12 px-4 text-center">
                <p className="text-xs text-slate-400 mb-3">Failed to load list</p>
                <button
                  onClick={fetchConnections}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <Users className="mx-auto mb-2 text-slate-300" size={24} />
                <p className="text-xs font-medium text-slate-500">No connections found</p>
                <p className="text-[10px] mt-0.5 text-slate-400">
                  {searchQuery ? 'Try another search query' : 'Matches will appear here once accepted'}
                </p>
              </div>
            ) : (
              filteredConnections.map(conn => {
                const peer = conn.user
                const peerId = peer.id || peer._id
                const isSelected = selectedPeer && (selectedPeer.id === peerId || selectedPeer._id === peerId)
                const peerInitials = getInitials(peer.name)
                
                return (
                  <button
                    key={peerId}
                    onClick={() => {
                      setSelectedPeer(peer)
                      setShowMobileChat(true)
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group ${
                      isSelected
                        ? 'bg-indigo-50/80 text-indigo-900 border-l-4 border-indigo-600 rounded-l-none'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {peer.avatar_url ? (
                        <img
                          src={peer.avatar_url}
                          alt={peer.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-100"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {peerInitials}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-semibold truncate group-hover:text-indigo-600 transition-colors">
                          {peer.name || 'Anonymous Peer'}
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {peer.university || 'No university listed'}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Main Chat Frame */}
        <div className={`flex-1 flex flex-col min-h-0 bg-white ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedPeer ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/20">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 shrink-0"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="relative shrink-0">
                    {selectedPeer.avatar_url ? (
                      <img
                        src={selectedPeer.avatar_url}
                        alt={selectedPeer.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        {getInitials(selectedPeer.name)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">
                      {selectedPeer.name || 'Anonymous Peer'}
                    </h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin size={10} className="text-slate-300 shrink-0" />
                      <span className="truncate">{selectedPeer.university || 'No university'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/user/${selectedPeer.id || selectedPeer._id}`}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-indigo-600 transition-all flex items-center gap-1 text-[10px] font-semibold"
                    title="View Full Profile"
                  >
                    <span>Profile</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {messages.map((msg, i) => {
                  const isMe = msg.senderId === currentUser.id
                  return (
                    <div
                      key={msg.id || i}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[75%] space-y-0.5">
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-none'
                              : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className={`text-[9px] text-slate-400 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form
                onSubmit={handleSend}
                className="p-4 border-t border-slate-100 bg-white shrink-0 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Message ${selectedPeer.name || 'peer'}...`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 border-none rounded-2xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-2xl transition-all shadow-sm active:scale-95"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            // Empty State
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/20">
              <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-4">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">No active conversation</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                Choose a connection from the list or explore the Discover tab to start messaging new peers!
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
