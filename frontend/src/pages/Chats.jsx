import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import EmojiPicker from 'emoji-picker-react'
import {
  Search,
  Send,
  Users,
  MessageSquare,
  ArrowLeft,
  MapPin,
  ExternalLink,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Check,
  CheckCheck,
  FileText,
  Download,
  X
} from 'lucide-react'

const authHeaders = () => {
  const token = localStorage.getItem('ts_token')
  return { Authorization: `Bearer ${token}` }
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-orange-400 to-rose-500',
  'from-pink-500 to-rose-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-700',
]

const renderPeerAvatar = (peer, sizeClass = "w-10 h-10", textClass = "text-xs") => {
  const initials = getInitials(peer?.name)
  const avatar = peer?.avatar_url
  const hasAvatar = avatar && avatar !== 'None' && avatar !== 'null' && avatar !== ''

  if (hasAvatar && !avatar.startsWith('preset:')) {
    return <img src={avatar} alt={peer.name} className={`${sizeClass} rounded-full object-cover border border-slate-100 shrink-0`} />
  }
  
  let gradient = 'from-primary to-secondary'
  if (hasAvatar && avatar.startsWith('preset:')) {
    gradient = avatar.split('preset:')[1]
  } else {
    const colorIdx = (peer?.name || '').length % AVATAR_COLORS.length
    gradient = AVATAR_COLORS[colorIdx]
  }
  
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shrink-0 ${textClass} shadow-sm`}>
      {initials}
    </div>
  )
}

const formatTime = (isoString) => {
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

const formatConvoTime = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function MessageBubble({ msg, isMe }) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[75%] space-y-0.5">
        {msg.type === 'text' && (
          <div
            className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
              isMe
                ? 'bg-indigo-600 text-white rounded-br-none'
                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
            }`}
          >
            {msg.text}
          </div>
        )}

        {msg.type === 'image' && (
          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={msg.file_url}
              alt={msg.file_name || 'Image'}
              className="max-w-[220px] rounded-2xl border border-slate-100 shadow-sm hover:opacity-90 transition-opacity"
            />
          </a>
        )}

        {msg.type === 'file' && (
          <a
            href={msg.file_url}
            target="_blank"
            rel="noopener noreferrer"
            download={msg.file_name}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs shadow-sm transition-all ${
              isMe
                ? 'bg-indigo-600 text-white rounded-br-none hover:bg-indigo-700'
                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none hover:bg-slate-50'
            }`}
          >
            <FileText size={16} className="shrink-0" />
            <span className="truncate max-w-[140px] font-medium">{msg.file_name || 'File'}</span>
            <Download size={13} className="shrink-0 opacity-70" />
          </a>
        )}

        <div className={`flex items-center gap-1 text-[9px] text-slate-400 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span>{formatTime(msg.created_at)}</span>
          {isMe && (msg.read ? <CheckCheck size={12} className="text-indigo-500" /> : <Check size={12} />)}
        </div>
      </div>
    </div>
  )
}

export default function Chats() {
  const { user: currentUser } = useAuth()
  const { subscribe, fetchNotifications } = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorLoading, setErrorLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedPeer, setSelectedPeer] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [inputText, setInputText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const [showMobileChat, setShowMobileChat] = useState(false)

  const messagesEndRef = useRef(null)
  const selectedPeerRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    selectedPeerRef.current = selectedPeer
  }, [selectedPeer])

  const peerIdOf = (p) => p?.id || p?._id

  // ---------- Load conversations ----------

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    setErrorLoading(false)
    try {
      const res = await api.get('/api/messages/conversations', { headers: authHeaders() })
      const convos = res.data || []
      setConversations(convos)

      let initialPeer = null
      if (location.state?.startChatWith) {
        const routePeer = location.state.startChatWith
        const routeId = routePeer.id || routePeer._id
        const found = convos.find(c => c.peer.id === routeId)
        initialPeer = found ? found.peer : routePeer
        setShowMobileChat(true)
      }
      if (initialPeer) setSelectedPeer(initialPeer)
    } catch (e) {
      console.error('Failed to load conversations:', e)
      setErrorLoading(true)
      toast.error('Failed to load conversations. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [location.state])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setSelectedPeer(null)
        setShowMobileChat(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ---------- Load message history when peer changes ----------

  useEffect(() => {
    if (!selectedPeer) {
      setMessages([])
      return
    }
    const pid = peerIdOf(selectedPeer)

    async function loadHistory() {
      setLoadingMessages(true)
      try {
        const res = await api.get(`/api/messages/${pid}?limit=50`, { headers: authHeaders() })
        setMessages(res.data || [])
        // Mark conversation read and clear local unread badge
        await api.post(`/api/messages/${pid}/read`, {}, { headers: authHeaders() })
        setConversations(prev => prev.map(c => c.peer.id === pid ? { ...c, unread_count: 0 } : c))
        fetchNotifications()
      } catch (e) {
        console.error('Failed to load messages:', e)
        toast.error('Failed to load conversation history')
      } finally {
        setLoadingMessages(false)
      }
    }
    loadHistory()
  }, [selectedPeer])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ---------- Listen on the shared app-wide socket (owned by NotificationContext) ----------

  useEffect(() => {
    if (!currentUser) return

    const unsubscribe = subscribe((data) => {
      if (data.event === 'new_message') {
        const msg = data.message
        const activePeerId = peerIdOf(selectedPeerRef.current)

        if (msg.sender_id === activePeerId) {
          setMessages(prev => [...prev, msg])
          api.post(`/api/messages/${msg.sender_id}/read`, {}, { headers: authHeaders() })
            .then(() => fetchNotifications())
            .catch(() => {})
        } else {
          toast(`New message`, {
            icon: '💬',
            style: { borderRadius: '10px', background: '#334155', color: '#fff' },
          })
        }

        setConversations(prev => {
          const idx = prev.findIndex(c => c.peer.id === msg.sender_id)
          if (idx === -1) {
            // Message from someone not yet in the list (shouldn't normally happen
            // since you must be connected to message) — refresh the full list.
            fetchConversations()
            return prev
          }
          const updated = [...prev]
          const isActive = msg.sender_id === activePeerId
          updated[idx] = {
            ...updated[idx],
            last_message: msg,
            unread_count: isActive ? 0 : updated[idx].unread_count + 1,
          }
          updated.sort((a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0))
          return updated
        })
      }

      if (data.event === 'read_receipt') {
        const activePeerId = peerIdOf(selectedPeerRef.current)
        if (data.by === activePeerId) {
          setMessages(prev => prev.map(m => (m.sender_id === currentUser.id ? { ...m, read: true } : m)))
        }
      }
    })

    return () => unsubscribe()
  }, [currentUser, subscribe])

  // ---------- Send text ----------

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || !selectedPeer) return

    const pid = peerIdOf(selectedPeer)
    const text = inputText.trim()
    setInputText('')
    setShowEmojiPicker(false)

    try {
      const res = await api.post(`/api/messages/${pid}/text`, { text }, { headers: authHeaders() })
      const msg = res.data
      setMessages(prev => [...prev, msg])
      setConversations(prev => {
        const updated = prev.map(c => c.peer.id === pid ? { ...c, last_message: msg } : c)
        updated.sort((a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0))
        return updated
      })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send message')
      setInputText(text)
    }
  }

  // ---------- Send image/file ----------

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedPeer) return

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File must be under 15MB')
      return
    }

    const pid = peerIdOf(selectedPeer)
    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      const res = await api.post(`/api/messages/${pid}/upload`, formData, { headers: authHeaders() })
      const msg = res.data
      setMessages(prev => [...prev, msg])
      setConversations(prev => {
        const updated = prev.map(c => c.peer.id === pid ? { ...c, last_message: msg } : c)
        updated.sort((a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0))
        return updated
      })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ---------- Filter conversations ----------

  const filteredConversations = conversations.filter(c => {
    const name = c.peer?.name || ''
    const uni = c.peer?.university || ''
    const q = searchQuery.toLowerCase()
    return name.toLowerCase().includes(q) || uni.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100dvh-140px)] lg:h-[calc(100vh-80px)] flex flex-col">
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

      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm flex-1 overflow-hidden flex min-h-0">

        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col min-h-0 bg-slate-50/20 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
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

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
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
                  onClick={fetchConversations}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <Users className="mx-auto mb-2 text-slate-300" size={24} />
                <p className="text-xs font-medium text-slate-500">No connections found</p>
                <p className="text-[10px] mt-0.5 text-slate-400">
                  {searchQuery ? 'Try another search query' : 'Matches will appear here once accepted'}
                </p>
              </div>
            ) : (
              filteredConversations.map(convo => {
                const peer = convo.peer
                const isSelected = selectedPeer && peerIdOf(selectedPeer) === peer.id
                const lastMsg = convo.last_message
                let preview = 'Say hello 👋'
                if (lastMsg) {
                  if (lastMsg.type === 'text') preview = lastMsg.text
                  else if (lastMsg.type === 'image') preview = '📷 Photo'
                  else preview = `📎 ${lastMsg.file_name || 'File'}`
                }

                return (
                  <button
                    key={peer.id}
                    onClick={() => { setSelectedPeer(peer); setShowMobileChat(true) }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group ${
                      isSelected
                        ? 'bg-indigo-50/80 text-indigo-900 border-l-4 border-indigo-600 rounded-l-none'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {renderPeerAvatar(peer, "w-10 h-10", "text-xs")}
                      {convo.online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5 gap-2">
                        <h4 className="text-xs font-semibold truncate group-hover:text-indigo-600 transition-colors">
                          {peer.name || 'Anonymous Peer'}
                        </h4>
                        {lastMsg && (
                          <span className="text-[9px] text-slate-400 shrink-0">{formatConvoTime(lastMsg.created_at)}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] text-slate-400 truncate">{preview}</p>
                        {convo.unread_count > 0 && (
                          <span className="shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                            {convo.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat frame */}
        <div className={`flex-1 flex flex-col min-h-0 bg-white relative ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedPeer ? (
            <>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/20">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 shrink-0"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className="relative shrink-0">
                    {renderPeerAvatar(selectedPeer, "w-10 h-10", "text-xs")}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{selectedPeer.name || 'Anonymous Peer'}</h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin size={10} className="text-slate-300 shrink-0" />
                      <span className="truncate">{selectedPeer.university || 'No university'}</span>
                    </p>
                  </div>
                </div>

                <Link
                  to={`/profile/user/${peerIdOf(selectedPeer)}`}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-indigo-600 transition-all flex items-center gap-1 text-[10px] font-semibold"
                >
                  <span>Profile</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading conversation...</div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                    <MessageSquare size={24} className="mb-2 text-slate-300" />
                    <p className="text-xs">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} isMe={msg.sender_id === currentUser.id} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {showEmojiPicker && (
                <div className="absolute bottom-20 right-4 z-20">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => setInputText(prev => prev + emojiData.emoji)}
                    height={350}
                    width={300}
                  />
                </div>
              )}

              <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white shrink-0 flex items-center gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelected}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelected}
                />

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all shrink-0 disabled:opacity-40"
                  title="Send image"
                >
                  <ImageIcon size={17} />
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all shrink-0 disabled:opacity-40"
                  title="Send file"
                >
                  <Paperclip size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(v => !v)}
                  className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all shrink-0"
                  title="Emoji"
                >
                  <Smile size={17} />
                </button>

                <input
                  type="text"
                  placeholder={uploading ? 'Uploading...' : `Message ${selectedPeer.name || 'peer'}...`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onFocus={() => setShowEmojiPicker(false)}
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 bg-slate-100 border-none rounded-2xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 transition-all disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-2xl transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
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
