import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const socket = io('http://localhost:5000');

const Chat = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [room] = useState('general');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/'); 
      return;
     }

    socket.emit('join_room', { room, username: user.username });

    const fetchMessages = async () => {
      const { data } = await axios.get(
        `api/messages/${room}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setMessages(data);
    };
    fetchMessages();

    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });
    socket.on('user_typing', ({ username }) => {
      setTyping(`${username} is typing...`);
    });
    socket.on('user_stop_typing', () => setTyping(''));
    socket.on('online_users', (users) => setOnlineUsers(users));
    socket.on('user_joined', ({ message }) => {
      setMessages((prev) => [...prev, { content: message, isNotification: true }]);
    });
    socket.on('user_left', ({ message }) => {
      setMessages((prev) => [...prev, { content: message, isNotification: true }]);
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('online_users');
      socket.off('user_joined');
      socket.off('user_left');
    };
  }, [user, navigate, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    socket.emit('send_message', {
      room,
      content: newMessage,
      senderId: user._id,
      username: user.username,
    });
    socket.emit('stop_typing', { room });
    setNewMessage('');
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socket.emit('typing', { room, username: user.username });
    setTimeout(() => socket.emit('stop_typing', { room }), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h3 style={styles.sidebarTitle}>💬 ChatApp</h3>
        <p style={styles.sidebarLabel}>Online Users</p>
        {onlineUsers.map((u, i) => (
          <div key={i} style={styles.userItem}>
            <span style={styles.dot}></span> {u.username}
          </div>
        ))}
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>

      <div style={styles.chatArea}>
        <div style={styles.header}>
          <h3># {room}</h3>
          <span style={styles.username}>Logged in as: {user?.username}</span>
        </div>

        <div style={styles.messages}>
          {messages.map((msg, i) =>
            msg.isNotification ? (
              <p key={i} style={styles.notification}>{msg.content}</p>
            ) : (
              <div
                key={i}
                style={{
                  ...styles.message,
                  alignSelf: msg.sender?._id === user._id ? 'flex-end' : 'flex-start',
                  background: msg.sender?._id === user._id ? '#6c63ff' : '#fff',
                  color: msg.sender?._id === user._id ? '#fff' : '#000',
                }}
              >
                <span style={styles.msgUsername}>{msg.sender?.username}</span>
                <p style={{ margin: 0 }}>{msg.content}</p>
              </div>
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        {typing && <p style={styles.typing}>{typing}</p>}

        <div style={styles.inputArea}>
          <input
            style={styles.input}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button style={styles.sendBtn} onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { display:'flex', height:'100vh', fontFamily:'sans-serif' },
  sidebar: { width:'220px', background:'#1a1a2e', color:'#fff', padding:'20px', display:'flex', flexDirection:'column' },
  sidebarTitle: { margin:'0 0 24px', fontSize:'20px' },
  sidebarLabel: { fontSize:'12px', color:'#aaa', marginBottom:'8px', textTransform:'uppercase' },
  userItem: { display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', fontSize:'14px' },
  dot: { width:'8px', height:'8px', background:'#4caf50', borderRadius:'50%', display:'inline-block' },
  logoutBtn: { marginTop:'auto', padding:'10px', background:'#ff4757', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' },
  chatArea: { flex:1, display:'flex', flexDirection:'column', background:'#f0f2f5' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', background:'#fff', borderBottom:'1px solid #ddd' },
  username: { fontSize:'13px', color:'#666' },
  messages: { flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:'12px' },
  message: { maxWidth:'60%', padding:'10px 16px', borderRadius:'12px', boxShadow:'0 1px 4px rgba(0,0,0,0.1)' },
  msgUsername: { fontSize:'11px', fontWeight:'bold', display:'block', marginBottom:'4px', opacity:0.7 },
  notification: { textAlign:'center', color:'#999', fontSize:'13px', margin:'4px 0' },
  typing: { padding:'0 24px 8px', color:'#888', fontSize:'13px', fontStyle:'italic' },
  inputArea: { display:'flex', padding:'16px 24px', background:'#fff', borderTop:'1px solid #ddd', gap:'12px' },
  input: { flex:1, padding:'12px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px' },
  sendBtn: { padding:'12px 24px', background:'#6c63ff', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px' },
};

export default Chat;