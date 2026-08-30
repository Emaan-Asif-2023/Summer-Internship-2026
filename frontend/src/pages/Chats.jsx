import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationContext.jsx'
import api from '../api/axios.js'
import toast from 'react-hot-toast'
import EmojiPicker from 'emoji-picker-react'
import {
  Search, Send, Users, MessageSquare, ArrowLeft, MapPin,
  ExternalLink, Paperclip, Image as ImageIcon, Smile,
  Check, CheckCheck, FileText, Download, X, Reply,
  Trash2, MoreVertical, Trash, CornerUpLeft
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

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

const renderPeerAvatar = (peer, sizeClass = 'w-10 h-10', textClass = 'text-xs') => {
  const initials = getInitials(peer?.name)
  const avatar = peer?.avatar_url
  const hasAvatar = avatar && avatar !== 'None' && avatar !== 'null' && avatar !== ''
  if (hasAvatar && !avatar.startsWith('preset:')) {
    return <img src={avatar} alt={peer.name} className={`${sizeClass} rounded-full object-cover border border-slate-100 shrink-0`} />
  }
  let gradient = 'from-primary to-secondary'
  if (hasAvatar && avatar.startsWith('preset:')) gradient = avatar.split('preset:')[1]
  else gradient = AVATAR_COLORS[(peer?.name || '').length % AVATAR_COLORS.length]
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shrink-0 ${textClass} shadow-sm`}>
      {initials}
    </div>
  )
}

const formatTime = (iso) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

const formatConvoTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ---------- Reply Preview (inside input area) ----------
function ReplyPreview({ replyTo, onCancel, peerName, currentUserId }) {
  if (!replyTo) return null
  const isMe = replyTo.sender_id === currentUserId
  return (
    <div className="px-4 pt-2 pb-0 shrink-0">
      <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 border-l-4 border-indigo-500">
        <CornerUpLeft size={13} className="text-indigo-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-indigo-600">{isMe ? 'You' : peerName}</p>
          <p className="text-[11px] text-slate-500 truncate">{replyTo.text || (replyTo.type === 'image' ? '📷 Photo' : '📎 File')}</p>
        </div>
        <button onClick={onCancel} className="p-1 hover:bg-slate-200 rounded-lg transition-colors shrink-0">
          <X size={12} className="text-slate-400" />
        </button>
      </div>
    </div>
  )
}

// ---------- Message Bubble ----------
function MessageBubble({ msg, isMe, onReply, onReact, onDelete, currentUserId, peerName }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const menuRef = useRef(null)

  const isDeleted = msg.deleted_for_everyone

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const reactionEntries = Object.entries(msg.reactions || {})
  const totalReactions = reactionEntries.reduce((s, [, arr]) => s + arr.length, 0)

  const bubbleBase = isMe
    ? 'bg-indigo-600 text-white rounded-br-none'
    : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
      <div className="max-w-[75%] space-y-0.5 relative">

        {/* Reply quote */}
        {msg.reply_to && !isDeleted && (
          <div className={`flex items-start gap-2 px-3 py-1.5 rounded-xl text-[10px] mb-0.5 border-l-4 border-indigo-400 ${
            isMe ? 'bg-indigo-700/50 text-indigo-100' : 'bg-slate-100 text-slate-500'
          }`}>
            <CornerUpLeft size={11} className="shrink-0 mt-0.5 opacity-70" />
            <div className="min-w-0">
              <p className="font-bold text-[9px] opacity-80">
                {msg.reply_to.sender_id === currentUserId ? 'You' : peerName}
              </p>
              <p className="truncate">{msg.reply_to.text || (msg.reply_to.type === 'image' ? '📷 Photo' : '📎 File')}</p>
            </div>
          </div>
        )}

        {/* Bubble content */}
        <div className="relative">
          {isDeleted ? (
            <div className={`px-4 py-2.5 rounded-2xl text-xs italic opacity-60 ${bubbleBase}`}>
              🚫 This message was deleted
            </div>
          ) : msg.type === 'text' ? (
            <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap break-words ${bubbleBase}`}>
              {msg.text}
            </div>
          ) : msg.type === 'image' ? (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={msg.file_url} alt={msg.file_name || 'Image'}
                className="max-w-[220px] rounded-2xl border border-slate-100 shadow-sm hover:opacity-90 transition-opacity" />
            </a>
          ) : (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" download={msg.file_name}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs shadow-sm transition-all ${
                isMe ? 'bg-indigo-600 text-white rounded-br-none hover:bg-indigo-700'
                     : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none hover:bg-slate-50'
              }`}>
              <FileText size={16} className="shrink-0" />
              <span className="truncate max-w-[140px] font-medium">{msg.file_name || 'File'}</span>
              <Download size={13} className="shrink-0 opacity-70" />
            </a>
          )}

          {/* Hover action buttons */}
          {!isDeleted && !msg._sending && (
            <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-20' : '-right-20'} hidden group-hover:flex items-center gap-1`}>
              <button
                onClick={() => onReply(msg)}
                className="p-1.5 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"
                title="Reply"
              >
                <Reply size={12} />
              </button>
              <div className="relative" ref={isMe ? menuRef : null}>
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="p-1.5 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-slate-700 shadow-sm transition-all"
                  title="More"
                >
                  <MoreVertical size={12} />
                </button>
                {showMenu && (
                  <div className={`absolute bottom-full mb-1 ${isMe ? 'right-0' : 'left-0'} bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 w-44`}>
                    {/* Quick reactions */}
                    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100">
                      {QUICK_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => { onReact(msg, emoji); setShowMenu(false) }}
                          className="text-base hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { onReply(msg); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Reply size={13} /> Reply
                    </button>
                    <button
                      onClick={() => { onDelete(msg, false); setShowMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Trash size={13} /> Delete for me
                    </button>
                    {isMe && (
                      <button
                        onClick={() => { onDelete(msg, true); setShowMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={13} /> Unsend for everyone
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reactions display */}
        {totalReactions > 0 && !isDeleted && (
          <div className={`flex flex-wrap gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, reactors]) => (
              <button
                key={emoji}
                onClick={() => onReact(msg, emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-all ${
                  reactors.includes(currentUserId)
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {emoji} <span className="text-[10px] font-semibold">{reactors.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Time + tick */}
        <div className={`flex items-center gap-1 text-[9px] text-slate-400 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          <span>{formatTime(msg.created_at)}</span>
          {isMe && !isDeleted && (
            msg._sending
              ? <Check size={12} className="text-slate-300" />          // single grey = sending
              : msg.read
                ? <CheckCheck size={12} className="text-indigo-500" />  // double blue = read
                : msg.delivered
                  ? <CheckCheck size={12} className="text-slate-400" /> // double grey = delivered to device
                  : <Check size={12} className="text-slate-400" />      // single grey = sent to server only
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Delete Confirmation Modal ----------
function DeleteConfirmModal({ onConfirm, onCancel, isOwnMessage }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Delete message?</h3>
        <p className="text-xs text-slate-500 mb-4">Choose how you want to delete this message.</p>
        <div className="space-y-2">
          {isOwnMessage && (
            <button
              onClick={() => onConfirm(true)}
              className="w-full py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all"
            >
              Unsend for everyone
            </button>
          )}
          <button
            onClick={() => onConfirm(false)}
            className="w-full py-2.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
          >
            Delete for me
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- Main Component ----------
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

  // New feature states
  const [replyTo, setReplyTo] = useState(null)          // message being replied to
  const [deleteTarget, setDeleteTarget] = useState(null) // {msg} for confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const selectedPeerRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const prevMessagesLengthRef = useRef(0)
  const inputRef = useRef(null)

  useEffect(() => { selectedPeerRef.current = selectedPeer }, [selectedPeer])

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
    const handler = (e) => {
      if (e.key === 'Escape') { setSelectedPeer(null); setShowMobileChat(false); setReplyTo(null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ---------- Load message history ----------
  useEffect(() => {
    if (!selectedPeer) { setMessages([]); return }
    const pid = peerIdOf(selectedPeer)
    setReplyTo(null)

    async function loadHistory() {
      setLoadingMessages(true)
      prevMessagesLengthRef.current = 0
      try {
        const res = await api.get(`/api/messages/${pid}?limit=50`, { headers: authHeaders() })
        setMessages(res.data || [])
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

  // ---------- Scroll to bottom ----------
  useEffect(() => {
    if (messages.length === 0) return
    const isNew = messages.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0
    prevMessagesLengthRef.current = messages.length
    const doScroll = () => {
      const c = messagesContainerRef.current
      if (!c) return
      if (isNew) c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' })
      else c.scrollTop = c.scrollHeight
    }
    doScroll()
    requestAnimationFrame(doScroll)
    setTimeout(doScroll, 100)
    setTimeout(doScroll, 300)
  }, [messages])

  useEffect(() => {
    if (loadingMessages) return
    const doScroll = () => {
      const c = messagesContainerRef.current
      if (!c) return
      c.scrollTop = c.scrollHeight
    }
    doScroll()
    requestAnimationFrame(doScroll)
    setTimeout(doScroll, 100)
    setTimeout(doScroll, 300)
  }, [loadingMessages])

  // ---------- Polling fallback ----------
  useEffect(() => {
    if (!selectedPeer) return
    const pid = peerIdOf(selectedPeer)
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/messages/${pid}?limit=50`, { headers: authHeaders() })
        const fresh = res.data || []
        setMessages(prev => {
          if (fresh.length > prev.length) {
            api.post(`/api/messages/${pid}/read`, {}, { headers: authHeaders() })
              .then(() => fetchNotifications()).catch(() => {})
            setConversations(c => c.map(conv => conv.peer.id === pid ? { ...conv, unread_count: 0 } : conv))
            return fresh
          }
          return prev
        })
      } catch { /* silent */ }
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedPeer])

  // ---------- WebSocket listener ----------
  useEffect(() => {
    if (!currentUser) return
    const unsubscribe = subscribe((data) => {
      if (data.event === 'new_message') {
        const msg = data.message
        const activePeerId = peerIdOf(selectedPeerRef.current)
        const myId = String(currentUser.id)
        const senderId = String(msg.sender_id)
        const receiverId = String(msg.receiver_id)
        const otherPersonId = senderId === myId ? receiverId : senderId

        const isForActiveChat = activePeerId && (
          otherPersonId === String(activePeerId) ||
          senderId === String(activePeerId)
        )

        if (isForActiveChat) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          api.post(`/api/messages/${activePeerId}/read`, {}, { headers: authHeaders() })
            .then(() => {
              fetchNotifications()
              setMessages(prev => prev.map(m => m.sender_id === currentUser.id ? { ...m, read: true } : m))
            }).catch(() => {})
          setConversations(prev => prev.map(c =>
            String(c.peer.id) === String(activePeerId) ? { ...c, unread_count: 0 } : c
          ))
        } else {
          // Show toast with sender name if we can find them
          const senderConvo = conversations.find(c => String(c.peer.id) === otherPersonId)
          toast(senderConvo ? `New message from ${senderConvo.peer.name}` : 'New message', {
            icon: '💬', style: { borderRadius: '10px', background: '#334155', color: '#fff' }
          })
        }

        // Always update sidebar last_message
        setConversations(prev => {
          const idx = prev.findIndex(c => String(c.peer.id) === otherPersonId)
          if (idx === -1) { fetchConversations(); return prev }
          const updated = [...prev]
          const isActive = String(activePeerId) === otherPersonId
          const current = updated[idx]
          const incomingTime = new Date(msg.created_at).getTime()
          const currentTime = current.last_message ? new Date(current.last_message.created_at).getTime() : 0
          updated[idx] = {
            ...current,
            last_message: incomingTime >= currentTime ? msg : current.last_message,
            unread_count: isActive ? 0 : (senderId !== myId ? current.unread_count + 1 : current.unread_count),
          }
          updated.sort((a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0))
          return updated
        })
      }

      if (data.event === 'read_receipt') {
        const activePeerId = peerIdOf(selectedPeerRef.current)
        if (String(data.by) === String(activePeerId)) {
          setMessages(prev => prev.map(m =>
            String(m.sender_id) === String(currentUser.id) ? { ...m, read: true, read_at: data.read_at } : m
          ))
          setConversations(prev => prev.map(c =>
            String(c.peer.id) === String(activePeerId) && c.last_message
              ? { ...c, last_message: { ...c.last_message, read: true } } : c
          ))
        }
      }

      if (data.event === 'delivery_receipt') {
        // Single message delivered to receiver's device
        setMessages(prev => prev.map(m =>
          m.id === data.message_id ? { ...m, delivered: true } : m
        ))
        setConversations(prev => prev.map(c =>
          c.last_message?.id === data.message_id
            ? { ...c, last_message: { ...c.last_message, delivered: true } }
            : c
        ))
      }

      if (data.event === 'bulk_delivery_receipt') {
        // Multiple messages delivered when receiver came online
        const ids = new Set(data.message_ids)
        setMessages(prev => prev.map(m => ids.has(m.id) ? { ...m, delivered: true } : m))
        setConversations(prev => prev.map(c =>
          c.last_message && ids.has(c.last_message.id)
            ? { ...c, last_message: { ...c.last_message, delivered: true } }
            : c
        ))
      }

      if (data.event === 'message_deleted' || data.event === 'message_reacted') {
        const updated = data.message
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
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
    const replyToId = replyTo?.id || null
    const replyToSnapshot = replyTo || null
    setReplyTo(null)

    // Optimistic message — show instantly before server confirms
    const tempId = `temp_${Date.now()}`
    const optimisticMsg = {
      id: tempId,
      sender_id: currentUser.id,
      receiver_id: pid,
      type: 'text',
      text,
      read: false,
      created_at: new Date(Date.now() - 1).toISOString(), // 1ms in past so real msg always wins
      reply_to: replyToSnapshot,
      reactions: {},
      deleted_for: [],
      deleted_for_everyone: false,
      _sending: true,
    }
    setMessages(prev => [...prev, optimisticMsg])
    // Update sidebar immediately with latest message
    setConversations(prev => {
      const updated = prev.map(c => c.peer.id === pid ? { ...c, last_message: optimisticMsg } : c)
      updated.sort((a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0))
      return updated
    })

    try {
      const res = await api.post(`/api/messages/${pid}/text`, { text, reply_to_id: replyToId }, { headers: authHeaders() })
      const msg = res.data
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? msg : m))
      setConversations(prev => {
        const updated = prev.map(c => c.peer.id === pid ? { ...c, last_message: msg } : c)
        updated.sort((a, b) => new Date(b.last_message?.created_at || 0) - new Date(a.last_message?.created_at || 0))
        return updated
      })
    } catch (err) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setConversations(prev => {
        const updated = prev.map(c => c.peer.id === pid ? { ...c, last_message: c.last_message?.id === tempId ? null : c.last_message } : c)
        return updated
      })
      toast.error(err.response?.data?.detail || 'Failed to send message')
      setInputText(text)
    }
  }

  // ---------- Send file ----------
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedPeer) return
    if (file.size > 15 * 1024 * 1024) { toast.error('File must be under 15MB'); return }
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

  // ---------- Reply ----------
  const handleReply = (msg) => {
    setReplyTo(msg)
    inputRef.current?.focus()
  }

  // ---------- React ----------
  const handleReact = async (msg, emoji) => {
    if (!selectedPeer) return
    const pid = peerIdOf(selectedPeer)
    try {
      const res = await api.post(`/api/messages/${pid}/${msg.id}/react`, { emoji }, { headers: authHeaders() })
      setMessages(prev => prev.map(m => m.id === res.data.id ? res.data : m))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to react')
    }
  }

  // ---------- Delete message ----------
  const handleDeleteMessage = async (msg, forEveryone) => {
    if (!selectedPeer) return
    const pid = peerIdOf(selectedPeer)
    setDeleteTarget(null)
    try {
      const res = await api.delete(`/api/messages/${pid}/${msg.id}`, {
        headers: authHeaders(),
        data: { delete_for_everyone: forEveryone },
      })
      if (forEveryone) {
        setMessages(prev => prev.map(m => m.id === res.data.id ? res.data : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== msg.id))
      }
      toast.success(forEveryone ? 'Message unsent' : 'Message deleted')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete message')
    }
  }

  // ---------- Clear conversation ----------
  const handleClearConversation = async () => {
    if (!selectedPeer) return
    const pid = peerIdOf(selectedPeer)
    setShowClearConfirm(false)
    try {
      await api.delete(`/api/messages/${pid}`, { headers: authHeaders() })
      setMessages([])
      setConversations(prev => prev.map(c => c.peer.id === pid ? { ...c, last_message: null, unread_count: 0 } : c))
      toast.success('Conversation cleared')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to clear conversation')
    }
  }

  const filteredConversations = conversations.filter(c => {
    const q = searchQuery.toLowerCase()
    return (c.peer?.name || '').toLowerCase().includes(q) || (c.peer?.university || '').toLowerCase().includes(q)
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100dvh-140px)] lg:h-[calc(100vh-80px)] flex flex-col">

      {/* Delete message modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOwnMessage={deleteTarget.sender_id === currentUser?.id}
          onConfirm={(forEveryone) => handleDeleteMessage(deleteTarget, forEveryone)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Clear conversation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Clear conversation?</h3>
            <p className="text-xs text-slate-500 mb-4">This will remove all messages from your view. The other person can still see them.</p>
            <div className="space-y-2">
              <button onClick={handleClearConversation}
                className="w-full py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all">
                Clear for me
              </button>
              <button onClick={() => setShowClearConfirm(false)}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <MessageSquare className="text-indigo-600" size={22} />
            Messages
          </h1>
          <p className="text-xs text-slate-500">Coordinate and collaborate with your connections</p>
        </div>
        <Link to="/discover" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all">
          Discover Peers
        </Link>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm flex-1 overflow-hidden flex min-h-0">

        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col min-h-0 bg-slate-50/20 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100/80 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search connections..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-2xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-700" />
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
                <button onClick={fetchConversations} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-semibold hover:bg-indigo-700 transition-colors">Retry</button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <Users className="mx-auto mb-2 text-slate-300" size={24} />
                <p className="text-xs font-medium text-slate-500">No connections found</p>
                <p className="text-[10px] mt-0.5 text-slate-400">{searchQuery ? 'Try another search query' : 'Matches will appear here once accepted'}</p>
              </div>
            ) : (
              filteredConversations.map(convo => {
                const peer = convo.peer
                const isSelected = selectedPeer && peerIdOf(selectedPeer) === peer.id
                const lastMsg = convo.last_message
                let preview = 'Say hello 👋'
                if (lastMsg) {
                  if (lastMsg.deleted_for_everyone) preview = '🚫 Message deleted'
                  else if (lastMsg.type === 'text') preview = lastMsg.text
                  else if (lastMsg.type === 'image') preview = '📷 Photo'
                  else preview = `📎 ${lastMsg.file_name || 'File'}`
                }
                return (
                  <button key={peer.id}
                    onClick={() => { setSelectedPeer(peer); setShowMobileChat(true) }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group ${
                      isSelected ? 'bg-indigo-50/80 text-indigo-900 border-l-4 border-indigo-600 rounded-l-none' : 'hover:bg-slate-50 text-slate-700'
                    }`}>
                    <div className="relative shrink-0">
                      {renderPeerAvatar(peer, 'w-10 h-10', 'text-xs')}
                      {convo.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5 gap-2">
                        <h4 className="text-xs font-semibold truncate group-hover:text-indigo-600 transition-colors">{peer.name || 'Anonymous Peer'}</h4>
                        {lastMsg && <span className="text-[9px] text-slate-400 shrink-0">{formatConvoTime(lastMsg.created_at)}</span>}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          {lastMsg && String(lastMsg.sender_id) === String(currentUser?.id) && !lastMsg.deleted_for_everyone && (
                            <span className="shrink-0">
                              {lastMsg._sending
                                ? <Check size={12} className="text-slate-300" />
                                : lastMsg.read
                                  ? <CheckCheck size={12} className="text-indigo-500" />
                                  : lastMsg.delivered
                                    ? <CheckCheck size={12} className="text-slate-400" />
                                    : <Check size={12} className="text-slate-400" />
                              }
                            </span>
                          )}
                          <p className="text-[10px] text-slate-400 truncate">{preview}</p>
                        </div>
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
              {/* Chat header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/20">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 shrink-0">
                    <ArrowLeft size={18} />
                  </button>
                  <div className="relative shrink-0">{renderPeerAvatar(selectedPeer, 'w-10 h-10', 'text-xs')}</div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{selectedPeer.name || 'Anonymous Peer'}</h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin size={10} className="text-slate-300 shrink-0" />
                      <span className="truncate">{selectedPeer.university || 'No university'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all"
                    title="Clear conversation"
                  >
                    <Trash2 size={15} />
                  </button>
                  <Link to={`/profile/user/${peerIdOf(selectedPeer)}`}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-indigo-600 transition-all flex items-center gap-1 text-[10px] font-semibold">
                    <span>Profile</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">Loading conversation...</div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                    <MessageSquare size={24} className="mb-2 text-slate-300" />
                    <p className="text-xs">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMe={String(msg.sender_id) === String(currentUser.id)}
                      currentUserId={String(currentUser.id)}
                      peerName={selectedPeer.name}
                      onReply={handleReply}
                      onReact={handleReact}
                      onDelete={(msg) => setDeleteTarget(msg)}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-20 right-4 z-20">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => setInputText(prev => prev + emojiData.emoji)}
                    height={350} width={300}
                  />
                </div>
              )}

              {/* Reply preview */}
              <ReplyPreview
                replyTo={replyTo}
                onCancel={() => setReplyTo(null)}
                peerName={selectedPeer.name}
                currentUserId={currentUser.id}
              />

              {/* Input bar */}
              <form onSubmit={handleSend} className="p-4 border-t border-slate-100 bg-white shrink-0 flex items-center gap-2">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

                <button type="button" disabled={uploading} onClick={() => imageInputRef.current?.click()}
                  className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all shrink-0 disabled:opacity-40" title="Send image">
                  <ImageIcon size={17} />
                </button>
                <button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all shrink-0 disabled:opacity-40" title="Send file">
                  <Paperclip size={17} />
                </button>
                <button type="button" onClick={() => setShowEmojiPicker(v => !v)}
                  className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all shrink-0" title="Emoji">
                  <Smile size={17} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder={uploading ? 'Uploading...' : `Message ${selectedPeer.name || 'peer'}...`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onFocus={() => setShowEmojiPicker(false)}
                  disabled={uploading}
                  className="flex-1 px-4 py-2.5 bg-slate-100 border-none rounded-2xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 transition-all disabled:opacity-60"
                />
                <button type="submit" disabled={!inputText.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-2xl transition-all shadow-sm active:scale-95 shrink-0">
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
