import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const CHAT_ROOMS = [
  { id: 'general', name: 'general', icon: '💬', desc: 'General community discussion' },
  { id: 'tech-talk', name: 'tech-talk', icon: '💻', desc: 'Code, tech & development' },
  { id: 'random', name: 'random', icon: '⚡', desc: 'Off-topic & fun banter' },
  { id: 'design', name: 'design', icon: '🎨', desc: 'UI/UX, art & creative showcase' },
];

const AVATAR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
  '#10b981', '#06b6d4', '#3b82f6', '#f59e0b'
];

const Chat = () => {
  const { user, logout, updateUser } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  // Chat State
  const [currentRoom, setCurrentRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // UI Modals & Mobile Drawer State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Profile Edit State
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editAvatarColor, setEditAvatarColor] = useState(user?.avatarColor || '#6366f1');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  // Handle Socket & Room Switching
  useEffect(() => {
    if (!user || !user.token) {
      navigate('/');
      return;
    }

    // Fetch initial chat history for the room — FIX: leading slash /api/messages/...
    const fetchMessages = async () => {
      try {
        const { data } = await axios.get(`/api/messages/${currentRoom}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setMessages(data || []);
      } catch (err) {
        console.error('Error fetching room messages:', err);
      }
    };

    fetchMessages();

    if (socket) {
      // Join Room via Socket
      socket.emit('join_room', {
        room: currentRoom,
        username: user.username,
        userId: user._id,
        avatarColor: user.avatarColor || '#6366f1',
      });

      const handleReceiveMessage = (message) => {
        setMessages((prev) => [...prev, message]);
      };

      const handleUserJoined = ({ message }) => {
        setMessages((prev) => [
          ...prev,
          { content: message, isNotification: true, id: Date.now() },
        ]);
      };

      const handleUserLeft = ({ message }) => {
        setMessages((prev) => [
          ...prev,
          { content: message, isNotification: true, id: Date.now() },
        ]);
      };

      const handleUserTyping = ({ username }) => {
        if (username !== user.username) {
          setTypingUser(`${username} is typing...`);
        }
      };

      const handleUserStopTyping = () => {
        setTypingUser('');
      };

      const handleOnlineUsers = (users) => {
        setOnlineUsers(users || []);
      };

      socket.on('receive_message', handleReceiveMessage);
      socket.on('user_joined', handleUserJoined);
      socket.on('user_left', handleUserLeft);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);
      socket.on('online_users', handleOnlineUsers);

      return () => {
        socket.off('receive_message', handleReceiveMessage);
        socket.off('user_joined', handleUserJoined);
        socket.off('user_left', handleUserLeft);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stop_typing', handleUserStopTyping);
        socket.off('online_users', handleOnlineUsers);
      };
    }
  }, [user, navigate, currentRoom, socket]);

  // Send Message Handler
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    if (socket) {
      socket.emit('send_message', {
        room: currentRoom,
        content: newMessage,
        senderId: user._id,
      });

      socket.emit('stop_typing', { room: currentRoom });
    }

    setNewMessage('');
  };

  // Typing event handler with debounce
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (socket) {
      socket.emit('typing', { room: currentRoom, username: user.username });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { room: currentRoom });
      }, 2000);
    }
  };

  // Profile update handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setUpdatingProfile(true);

    try {
      const { data } = await axios.put(
        '/api/auth/profile',
        {
          username: editUsername,
          avatarColor: editAvatarColor,
          newPassword: editNewPassword || undefined,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      updateUser({
        username: data.username,
        avatarColor: data.avatarColor,
        token: data.token,
      });

      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setEditNewPassword('');
    } catch (err) {
      setProfileMsg({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to update profile',
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleLogout = () => {
    if (socket) socket.disconnect();
    logout();
    navigate('/');
  };

  // Filter messages based on search query
  const filteredMessages = messages.filter((msg) =>
    searchQuery
      ? msg.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const activeRoomObj = CHAT_ROOMS.find((r) => r.id === currentRoom);

  return (
    <div style={styles.chatLayout}>
      <div className="ambient-bg">
        <div className="ambient-blob-1"></div>
        <div className="ambient-blob-2"></div>
      </div>

      {/* MOBILE BACKDROP */}
      {mobileSidebarOpen && (
        <div
          style={styles.mobileBackdrop}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          ...styles.sidebar,
          ...(mobileSidebarOpen ? styles.sidebarMobileOpen : {}),
        }}
        className="glass-panel"
      >
        {/* Brand */}
        <div style={styles.brandRow}>
          <div style={styles.brandBadge}>💬</div>
          <div>
            <h2 style={styles.brandTitle}>ChatApp</h2>
            <span style={styles.brandStatus}>● Workspace Active</span>
          </div>
        </div>

        {/* Room Channels */}
        <div style={styles.sectionContainer}>
          <p style={styles.sectionHeader}>CHANNELS</p>
          <div style={styles.roomList}>
            {CHAT_ROOMS.map((room) => {
              const isActive = currentRoom === room.id;
              return (
                <button
                  key={room.id}
                  style={{
                    ...styles.roomItem,
                    ...(isActive ? styles.roomItemActive : {}),
                  }}
                  onClick={() => {
                    setCurrentRoom(room.id);
                    setMobileSidebarOpen(false);
                  }}
                >
                  <span style={styles.roomIcon}>{room.icon}</span>
                  <span style={styles.roomName}># {room.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Online Users List */}
        <div style={{ ...styles.sectionContainer, flex: 1, overflowY: 'auto' }}>
          <p style={styles.sectionHeader}>ONLINE MEMBERS ({onlineUsers.length})</p>
          <div style={styles.userList}>
            {onlineUsers.map((u, i) => (
              <div key={i} style={styles.userCard}>
                <div
                  style={{
                    ...styles.avatarCircle,
                    backgroundColor: u.avatarColor || '#6366f1',
                  }}
                >
                  {u.username?.charAt(0).toUpperCase()}
                  <span style={styles.onlineDot}></span>
                </div>
                <span style={styles.onlineUsername}>{u.username}</span>
                {u.userId === user._id && <span style={styles.youBadge}>You</span>}
              </div>
            ))}
          </div>
        </div>

        {/* User Profile Footer */}
        <div style={styles.userFooter}>
          <div style={styles.userInfoGroup}>
            <div
              style={{
                ...styles.avatarCircle,
                backgroundColor: user?.avatarColor || '#6366f1',
                width: '36px',
                height: '36px',
                fontSize: '15px',
              }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div style={styles.userDetails}>
              <span style={styles.userFullName}>{user?.username}</span>
              <span style={styles.userEmailText}>{user?.email}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={styles.iconBtn}
              onClick={() => {
                setEditUsername(user?.username || '');
                setEditAvatarColor(user?.avatarColor || '#6366f1');
                setShowProfileModal(true);
              }}
              title="Settings"
            >
              ⚙️
            </button>
            <button
              style={{ ...styles.iconBtn, color: '#ef4444' }}
              onClick={handleLogout}
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main style={styles.mainArea}>
        {/* Header */}
        <header style={styles.chatHeader} className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              style={styles.mobileMenuToggle}
              onClick={() => setMobileSidebarOpen(true)}
            >
              ☰
            </button>
            <div style={styles.roomHeaderTitleGroup}>
              <h2 style={styles.activeRoomTitle}>
                {activeRoomObj?.icon} # {currentRoom}
              </h2>
              <p style={styles.activeRoomDesc}>{activeRoomObj?.desc}</p>
            </div>
          </div>

          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              className="glass-input"
              style={styles.searchInput}
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button style={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>
        </header>

        {/* Message Feed */}
        <div style={styles.messageFeed}>
          {filteredMessages.length === 0 ? (
            <div style={styles.emptyFeed}>
              <div style={styles.emptyIcon}>{activeRoomObj?.icon || '💬'}</div>
              <h3 style={{ color: '#f8fafc', marginBottom: '4px' }}>
                Welcome to #{currentRoom}!
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                This is the start of the #{currentRoom} channel. Send a message to start chatting.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg, index) => {
              if (msg.isNotification) {
                return (
                  <div key={index} style={styles.notificationPill}>
                    <span>✨ {msg.content}</span>
                  </div>
                );
              }

              const isMe = msg.sender?._id === user._id || msg.sender === user._id;
              const senderName = msg.sender?.username || 'User';
              const avatarColor = msg.sender?.avatarColor || '#6366f1';
              const timeString = msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Just now';

              return (
                <div
                  key={msg._id || index}
                  style={{
                    ...styles.messageRow,
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!isMe && (
                    <div
                      style={{
                        ...styles.avatarCircle,
                        backgroundColor: avatarColor,
                        width: '32px',
                        height: '32px',
                        fontSize: '13px',
                      }}
                    >
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(isMe ? styles.myBubble : styles.otherBubble),
                    }}
                  >
                    {!isMe && (
                      <span style={styles.senderNameLabel}>{senderName}</span>
                    )}
                    <p style={styles.messageContentText}>{msg.content}</p>
                    <span
                      style={{
                        ...styles.timestampText,
                        color: isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                        textAlign: isMe ? 'right' : 'left',
                      }}
                    >
                      {timeString}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {typingUser && (
            <div style={styles.typingIndicatorRow}>
              <div style={styles.typingDots}>
                <span className="spinner" style={{ width: '12px', height: '12px' }}></span>
                <span>{typingUser}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={styles.inputContainer} className="glass-panel">
          <form onSubmit={handleSendMessage} style={styles.inputForm}>
            <input
              className="glass-input"
              style={styles.chatInput}
              type="text"
              placeholder={`Message #${currentRoom}...`}
              value={newMessage}
              onChange={handleInputChange}
            />
            <button
              className="btn-primary"
              type="submit"
              disabled={!newMessage.trim()}
              style={{ width: 'auto', padding: '12px 24px' }}
            >
              Send 🚀
            </button>
          </form>
        </div>
      </main>

      {/* PROFILE SETTINGS MODAL */}
      {showProfileModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#f8fafc', margin: 0 }}>⚙️ User Profile & Settings</h3>
              <button
                style={styles.modalCloseBtn}
                onClick={() => setShowProfileModal(false)}
              >
                ✕
              </button>
            </div>

            {profileMsg.text && (
              <div
                className={`alert-box alert-${
                  profileMsg.type === 'success' ? 'success' : 'danger'
                }`}
              >
                <span>{profileMsg.type === 'success' ? '✅' : '⚠️'}</span>
                <div>{profileMsg.text}</div>
              </div>
            )}

            <form onSubmit={handleSaveProfile} style={styles.modalForm}>
              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Username</label>
                <input
                  className="glass-input"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                />
              </div>

              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Avatar Color Scheme</label>
                <div style={styles.colorGrid}>
                  {AVATAR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      style={{
                        ...styles.colorSwatch,
                        backgroundColor: color,
                        border:
                          editAvatarColor === color
                            ? '3px solid #ffffff'
                            : '2px solid transparent',
                        transform: editAvatarColor === color ? 'scale(1.15)' : 'scale(1)',
                      }}
                      onClick={() => setEditAvatarColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div style={styles.modalInputGroup}>
                <label style={styles.modalLabel}>Change Password (Optional)</label>
                <input
                  className="glass-input"
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowProfileModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={updatingProfile}
                  style={{ width: 'auto' }}
                >
                  {updatingProfile ? <span className="spinner"></span> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  chatLayout: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    position: 'relative',
  },
  mobileBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    zIndex: 90,
  },
  sidebar: {
    width: '280px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    zIndex: 100,
    borderRadius: 0,
    borderTop: 'none',
    borderBottom: 'none',
    borderLeft: 'none',
    transition: 'transform 0.3s ease',
  },
  sidebarMobileOpen: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    transform: 'translateX(0)',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  brandBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  brandTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f8fafc',
    margin: 0,
  },
  brandStatus: {
    fontSize: '11px',
    color: '#10b981',
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: '20px',
  },
  sectionHeader: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '1px',
    color: '#64748b',
    marginBottom: '10px',
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  roomItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  roomItemActive: {
    background: 'rgba(99, 102, 241, 0.2)',
    color: '#f8fafc',
    fontWeight: '600',
    borderLeft: '3px solid #6366f1',
  },
  roomIcon: {
    fontSize: '16px',
  },
  roomName: {
    flex: 1,
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 8px',
  },
  avatarCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    color: '#ffffff',
    fontSize: '12px',
    position: 'relative',
    flexShrink: 0,
  },
  onlineDot: {
    position: 'absolute',
    bottom: '-1px',
    right: '-1px',
    width: '8px',
    height: '8px',
    backgroundColor: '#10b981',
    border: '2px solid #0b0f19',
    borderRadius: '50%',
  },
  onlineUsername: {
    fontSize: '13px',
    color: '#cbd5e1',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  youBadge: {
    marginLeft: 'auto',
    fontSize: '10px',
    color: '#818cf8',
    background: 'rgba(99, 102, 241, 0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  userFooter: {
    marginTop: 'auto',
    paddingTop: '14px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  userFullName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#f8fafc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmailText: {
    fontSize: '11px',
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  iconBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* MAIN AREA */
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'relative',
    zIndex: 1,
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderRadius: 0,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
  },
  mobileMenuToggle: {
    background: 'none',
    border: 'none',
    color: '#f8fafc',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'block',
  },
  roomHeaderTitleGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  activeRoomTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f8fafc',
    margin: 0,
  },
  activeRoomDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  searchWrapper: {
    position: 'relative',
    width: '220px',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    fontSize: '13px',
    opacity: 0.6,
  },
  searchInput: {
    paddingLeft: '32px',
    paddingRight: '28px',
    fontSize: '13px',
    borderRadius: '20px',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '12px',
  },
  messageFeed: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyFeed: {
    margin: 'auto',
    textAlign: 'center',
    maxWidth: '400px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  notificationPill: {
    alignSelf: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '4px 16px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  messageRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '65%',
    padding: '12px 16px',
    borderRadius: '16px',
    position: 'relative',
    animation: 'fadeIn 0.2s ease',
  },
  myBubble: {
    background: 'var(--accent-gradient)',
    color: '#ffffff',
    borderBottomRightRadius: '4px',
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.25)',
  },
  otherBubble: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#f8fafc',
    borderBottomLeftRadius: '4px',
  },
  senderNameLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#818cf8',
    marginBottom: '4px',
    display: 'block',
  },
  messageContentText: {
    fontSize: '14px',
    lineHeight: '1.4',
    wordBreak: 'break-word',
    margin: 0,
  },
  timestampText: {
    display: 'block',
    fontSize: '10px',
    marginTop: '6px',
  },
  typingIndicatorRow: {
    alignSelf: 'flex-start',
    marginLeft: '42px',
  },
  typingDots: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#818cf8',
    fontStyle: 'italic',
  },
  inputContainer: {
    padding: '16px 24px',
    borderRadius: 0,
    borderBottom: 'none',
    borderLeft: 'none',
    borderRight: 'none',
  },
  inputForm: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  chatInput: {
    borderRadius: '12px',
    fontSize: '14px',
    padding: '14px 18px',
  },

  /* MODAL */
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '440px',
    padding: '28px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '18px',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  modalLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  colorGrid: {
    display: 'flex',
    gap: '10px',
    margin: '6px 0',
  },
  colorSwatch: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  cancelBtn: {
    padding: '10px 18px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default Chat;