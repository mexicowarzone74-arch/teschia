import { useState, useEffect, useRef } from 'react';
import { FaComments, FaTimes, FaPaperPlane, FaUserCircle, FaRobot, FaArrowLeft, FaUser, FaTrash, FaBroom, FaUpload, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getStatusInfo, formatLastSeen } from '../utils/statusHelpers';

// Función para formatear el tiempo del último mensaje de forma compacta
const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Si es hoy, mostrar hora
    if (diffInDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Si es ayer
    else if (diffInDays === 1) {
        return 'Ayer';
    }
    // Si es esta semana (menos de 7 días)
    else if (diffInDays < 7) {
        return `${diffInDays}d`;
    }
    // Si es más de una semana
    else {
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
};

const ChatFlotante = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState('list'); // 'list' o 'chat'
    const [mensaje, setMensaje] = useState('');
    const [mensajes, setMensajes] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null); // null para sala general
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const [typing, setTyping] = useState(false);
    const [uploading, setUploading] = useState(false);
    const { socket } = useSocket();
    const { user } = useAuth();
    const scrollRef = useRef();
    const fileInputRef = useRef();
    const typingTimeoutRef = useRef();

    // Escuchar evento para cerrar si se abre otro componente flotante
    useEffect(() => {
        const handleClose = () => setIsOpen(false);
        window.addEventListener('close-chat-flotante', handleClose);
        return () => window.removeEventListener('close-chat-flotante', handleClose);
    }, []);

    const toggleOpen = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        if (nextState) {
            window.dispatchEvent(new CustomEvent('close-asistente-ia'));
        }
    };

    const getFileUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const base = api.defaults.baseURL.replace(/\/api\/?$/, '');
        return `${base}${path}`;
    };

    // Generar ID de sala único para chat privado
    const getSalaId = (otherUserId) => {
        if (!otherUserId) return 'general';
        const ids = [user.id, otherUserId].sort((a, b) => a - b);
        return `p_${ids[0]}_${ids[1]}`;
    };

    const currentSalaId = getSalaId(selectedUser?.id);

    // Notificar al servidor que estamos online cuando se abre el chat
    useEffect(() => {
        if (isOpen && socket && user) {
            socket.emit('user:online', user.id);
        }
    }, [isOpen, socket, user]);

    // Escuchar cambios de estado de usuarios
    useEffect(() => {
        if (!socket) return;

        const handleUserStatusChanged = (data) => {
            setUsuarios(prev => prev.map(u => 
                u.id === data.userId 
                    ? { ...u, is_online: data.isOnline, status: data.status, last_seen: data.lastSeen || u.last_seen }
                    : u
            ));
        };

        const handleMessageStatus = (data) => {
            if (data.sala_id === currentSalaId) {
                setMensajes(prev => prev.map(m => 
                    m.id === data.messageId ? { ...m, estado: data.estado } : m
                ));
            }
        };

        const handleMessagesRead = (data) => {
            if (data.sala_id === currentSalaId) {
                setMensajes(prev => prev.map(m => 
                    data.messageIds.includes(m.id) ? { ...m, estado: 'leido', leido: true } : m
                ));
            }
        };

        socket.on('user:status_changed', handleUserStatusChanged);
        socket.on('chat:message_status', handleMessageStatus);
        socket.on('chat:messages_read', handleMessagesRead);

        return () => {
            socket.off('user:status_changed', handleUserStatusChanged);
            socket.off('chat:message_status', handleMessageStatus);
            socket.off('chat:messages_read', handleMessagesRead);
        };
    }, [socket, currentSalaId]);

    // Cargar historial y usuarios
    useEffect(() => {
        if (isOpen) {
            if (view === 'list') {
                cargarUsuarios();
            } else {
                cargarHistorial();
                if (selectedUser) {
                    marcarComoLeido();
                    // Limpiar contador localmente
                    setUsuarios(prev => prev.map(u => 
                        u.id === selectedUser.id ? { ...u, unread_count: 0 } : u
                    ));
                    // Si todos están leídos, limpiar el contador global del botón
                    setUnread(0);
                }
            }
        }
    }, [isOpen, view, selectedUser]);

    // Función para reproducir sonido de notificación
    const reproducirSonidoNotificacion = () => {
        try {
            // Crear un sonido de notificación usando Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Configurar el sonido (tono agradable)
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800 Hz
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volumen moderado
            
            // Reproducir sonido corto
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1); // 100ms
            
            // Segundo tono para hacer "ding-dong"
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(600, audioContext.currentTime);
                gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
                osc2.start(audioContext.currentTime);
                osc2.stop(audioContext.currentTime + 0.1);
            }, 100);
        } catch (error) {
            console.log('No se pudo reproducir sonido:', error);
        }
    };

    // Escuchar mensajes en tiempo real
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (nuevoMensaje) => {
            // Solo reproducir sonido si el mensaje NO es del usuario actual
            if (nuevoMensaje.emisor_id !== user?.id) {
                reproducirSonidoNotificacion();
            }
            
            if (nuevoMensaje.sala_id === currentSalaId) {
                setMensajes(prev => [...prev, nuevoMensaje]);
                if (isOpen && view === 'chat') {
                    marcarComoLeido();
                }
                setTyping(false);
            } else {
                // Actualizar contador individual
                setUsuarios(prev => prev.map(u => 
                    u.id === nuevoMensaje.emisor_id ? { ...u, unread_count: (u.unread_count || 0) + 1 } : u
                ));
                setUnread(prev => prev + 1);
            }
        };

        const handleTyping = (data) => {
            if (data.sala_id === currentSalaId && data.userId !== user.id) {
                setTyping(data.isTyping);
                
                // Limpieza de seguridad
                if (data.isTyping) {
                    setTimeout(() => setTyping(false), 3000);
                }
            }
        };

        const handleDeletedMessage = (data) => {
            if (data.sala_id === currentSalaId) {
                setMensajes(prev => prev.filter(m => m.id !== data.id));
            }
        };

        const handleClearedRoom = (data) => {
            if (data.sala_id === currentSalaId) {
                setMensajes([]);
            }
        };

        socket.on('chat:message', handleNewMessage);
        socket.on('chat:typing', handleTyping);
        socket.on('chat:message_deleted', handleDeletedMessage);
        socket.on(`chat:room_cleared:${user?.id}`, handleClearedRoom);
        socket.emit('chat:join', 'general');

        return () => {
            socket.off('chat:message', handleNewMessage);
            socket.off('chat:typing', handleTyping);
            socket.off('chat:message_deleted', handleDeletedMessage);
            socket.off(`chat:room_cleared:${user?.id}`, handleClearedRoom);
        };
    }, [socket, currentSalaId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [mensajes]);

    const cargarUsuarios = async () => {
        try {
            setLoading(true);
            const response = await api.get('/chat/usuarios');
            setUsuarios(response.data);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const marcarComoLeido = async () => {
        try {
            await api.post(`/chat/read/${currentSalaId}`);
            
            // Obtener IDs de mensajes no leídos en esta sala
            const unreadMessageIds = mensajes
                .filter(m => m.emisor_id !== user.id && !m.leido)
                .map(m => m.id);
            
            if (unreadMessageIds.length > 0 && socket) {
                socket.emit('chat:mark_read', { 
                    messageIds: unreadMessageIds, 
                    sala_id: currentSalaId 
                });
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const cargarHistorial = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/chat/${currentSalaId}`);
            setMensajes(response.data);
            if (socket) socket.emit('chat:join', currentSalaId);
        } catch (error) {
            console.error('Error al cargar historial:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await api.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = {
                emisor_id: user.id,
                emisor_nombre: user.username,
                emisor_rol: user.rol,
                mensaje: `Sent a file: ${file.name}`,
                sala_id: currentSalaId,
                receptor_id: selectedUser?.id || null,
                metadata: { file: response.data }
            };

            socket.emit('chat:message', data);
        } catch (error) {
            console.error('Error al subir archivo:', error);
        } finally {
            setUploading(false);
        }
    };

    const enviarMensaje = (e) => {
        e.preventDefault();
        if (!mensaje.trim() || !socket) return;

        const data = {
            emisor_id: user.id,
            emisor_nombre: user.username,
            emisor_rol: user.rol,
            mensaje: mensaje,
            sala_id: currentSalaId,
            receptor_id: selectedUser?.id || null
        };

        socket.emit('chat:message', data);
        setMensaje('');
    };

    const vaciarChat = async () => {
        if (!window.confirm('¿Vaciar conversación?')) return;
        try {
            await api.delete(`/chat/sala/${currentSalaId}`);
            setMensajes([]);
        } catch (error) {
            console.error('Error al vaciar chat:', error);
        }
    };

    const eliminarMensaje = async (id) => {
        if (!window.confirm('¿Eliminar mensaje?')) return;
        try {
            await api.delete(`/chat/mensaje/${id}`);
            setMensajes(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error al eliminar mensaje:', error);
        }
    };

    const handleTypingEmit = () => {
        if (!socket) return;
        socket.emit('chat:typing', {
            sala_id: currentSalaId,
            userId: user.id,
            username: user.username,
            isTyping: true
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('chat:typing', {
                sala_id: currentSalaId,
                userId: user.id,
                username: user.username,
                isTyping: false
            });
        }, 2000);
    };

    const selectContact = (u) => {
        setSelectedUser(u);
        setView('chat');
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Ventana de Chat */}
            {isOpen && (
                <div className="mb-2 w-85 sm:w-[350px] h-[520px] max-h-[80vh] bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-5 duration-300">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-tescha-blue to-blue-700 p-4 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            {view === 'chat' && (
                                <button onClick={() => setView('list')} className="p-1 hover:bg-white/20 rounded-full transition-colors mr-1">
                                    <FaArrowLeft className="text-sm" />
                                </button>
                            )}
                            <div className="relative">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    {selectedUser ? <FaUser /> : <FaComments className="text-xl" />}
                                </div>
                                {selectedUser?.status && selectedUser.status !== 'offline' && (
                                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                        getStatusInfo(selectedUser.status).color
                                    }`}></div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">
                                    {selectedUser ? (selectedUser.nombre_completo || selectedUser.username) : 'Chat General'}
                                </h3>
                                <p className="text-[10px] opacity-80">
                                    {selectedUser ? (
                                        selectedUser.status && selectedUser.status !== 'offline' ? (
                                            <span className="flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                                    getStatusInfo(selectedUser.status).color
                                                }`}></span>
                                                {getStatusInfo(selectedUser.status).label}
                                            </span>
                                        ) : selectedUser.last_seen ? (
                                            `Últ. vez: ${formatLastSeen(selectedUser.last_seen)}`
                                        ) : (
                                            selectedUser.rol
                                        )
                                    ) : (
                                        'Comunicación Grupal'
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {view === 'chat' && (
                                <button 
                                    onClick={vaciarChat} 
                                    className="hover:bg-red-500/30 p-2 rounded-full transition-colors text-white/80 hover:text-white"
                                    title="Vaciar chat"
                                >
                                    <FaBroom className="text-sm" />
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
                        {view === 'list' ? (
                            <div className="overflow-y-auto h-full p-2 space-y-1">
                                {/* Sala General */}
                                <button 
                                    onClick={() => selectContact(null)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-all border border-transparent hover:border-blue-100 group"
                                >
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <FaComments />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm text-gray-800">Sala General</p>
                                        <p className="text-xs text-gray-500">Consulta colectiva e IA</p>
                                    </div>
                                </button>

                                <div className="px-3 py-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personal Activo</span>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tescha-blue"></div>
                                    </div>
                                ) : usuarios.length > 0 ? (
                                    usuarios.map(u => {
                                        const userSalaId = getSalaId(u.id);
                                        const isTyping = typing && selectedUser?.id === u.id; 
                                        const hasLastMsg = !!u.last_message;

                                        return (
                                            <button 
                                                key={u.id}
                                                onClick={() => selectContact(u)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-all border border-transparent hover:border-blue-100 group relative"
                                            >
                                                <div className="relative shrink-0">
                                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-tescha-blue group-hover:text-white transition-colors overflow-hidden font-bold shadow-sm">
                                                        {u.nombre ? u.nombre.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    {/* Indicador de estado */}
                                                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${
                                                        getStatusInfo(u.status || 'offline').color
                                                    }`}></div>
                                                </div>

                                                <div className="text-left flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <p className="font-bold text-sm text-gray-800 truncate pr-2">
                                                            {u.nombre_completo || u.username}
                                                        </p>
                                                        {u.last_message_at && (
                                                            <span className={`text-[9px] whitespace-nowrap font-medium ${
                                                                u.unread_count > 0 ? 'text-tescha-blue font-bold' : 'text-gray-400'
                                                            }`}>
                                                                {formatMessageTime(u.last_message_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {typing && currentSalaId === userSalaId ? (
                                                        <p className="text-[10px] text-green-500 font-bold animate-pulse">Escribiendo...</p>
                                                    ) : hasLastMsg ? (
                                                        <p className={`text-[11px] truncate ${
                                                            u.unread_count > 0 ? 'font-bold text-gray-900' : 'font-normal text-gray-500'
                                                        }`}>
                                                            {u.last_message_emisor_id === user.id ? (
                                                                <>
                                                                    <span className="text-blue-600">Tú: </span>
                                                                    <span className="text-gray-600">{u.last_message.substring(0, 25)}{u.last_message.length > 25 ? '...' : ''}</span>
                                                                </>
                                                            ) : (
                                                                <span>{u.last_message.substring(0, 30)}{u.last_message.length > 30 ? '...' : ''}</span>
                                                            )}
                                                        </p>
                                                    ) : u.status && u.status !== 'offline' ? (
                                                        <p className={`text-[10px] font-medium ${
                                                            getStatusInfo(u.status).textColor
                                                        }`}>
                                                            {getStatusInfo(u.status).label}
                                                        </p>
                                                    ) : u.last_seen ? (
                                                        <p className="text-[10px] text-gray-400">
                                                            {formatLastSeen(u.last_seen)}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] text-gray-400">{u.rol}</p>
                                                    )}
                                                </div>

                                                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter bg-blue-50 px-1.5 py-0.5 rounded">
                                                    {u.rol}
                                                </span>

                                                {u.unread_count > 0 && (
                                                    <div className="ml-1 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center animate-bounce border-2 border-white shadow-sm shrink-0">
                                                        {u.unread_count}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-10 opacity-40">
                                        <p className="text-xs italic">No hay otros contactos...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Mensajes */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {loading ? (
                                        <div className="flex justify-center items-center h-full">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tescha-blue"></div>
                                        </div>
                                    ) : (
                                        mensajes.map((m, idx) => {
                                            const isMe = m.emisor_id === user.id;
                                            const isIA = m.emisor_rol === 'ia';
                                            
                                            return (
                                                <div key={idx} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className={`flex items-center gap-1 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                            {isMe ? 'Tú' : m.emisor_nombre}
                                                        </span>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded text-white ${
                                                            m.emisor_rol === 'coordinador' ? 'bg-amber-500' : 
                                                            m.emisor_rol === 'ia' ? 'bg-purple-600' : 'bg-blue-500'
                                                        }`}>
                                                            {m.emisor_rol}
                                                        </span>
                                                        {isMe && (
                                                            <button 
                                                                onClick={() => eliminarMensaje(m.id)}
                                                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <FaTrash className="text-[8px]" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                                                        isMe 
                                                            ? 'bg-tescha-blue text-white rounded-tr-none' 
                                                            : isIA 
                                                            ? 'bg-purple-50 border border-purple-100 text-gray-800 rounded-tl-none font-medium'
                                                            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                                    }`}>
                                                        {isIA && <FaRobot className="inline mr-2 text-purple-600" />}
                                                        
                                                        {m.metadata?.file ? (
                                                            <div className="space-y-1">
                                                                {m.metadata.file.type.startsWith('image/') ? (
                                                                    <img 
                                                                        src={getFileUrl(m.metadata.file.url)} 
                                                                        alt={m.metadata.file.name}
                                                                        className="max-w-full max-h-[200px] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-black/5 bg-gray-50"
                                                                        onClick={() => window.open(getFileUrl(m.metadata.file.url), '_blank')}
                                                                    />
                                                                ) : (
                                                                    <div className="flex items-center gap-2 p-1.5 bg-black/5 rounded">
                                                                        <div className="flex-1 truncate text-xs font-bold">{m.metadata.file.name}</div>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => window.open(getFileUrl(m.metadata.file.url), '_blank')}
                                                                            className="text-[10px] bg-white px-2 py-0.5 rounded shadow-sm"
                                                                        >
                                                                            Ver
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            m.mensaje.replace('🤖 [IA]: ', '')
                                                        )}
                                                        
                                                        <div className={`flex items-center gap-1.5 mt-1 justify-end ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                                            <span className="text-[9px]">
                                                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {isMe && (
                                                                <span className="text-[10px] flex items-center">
                                                                    {m.estado === 'leido' || m.leido ? (
                                                                        <FaCheckDouble className="text-blue-200" title="Leído" />
                                                                    ) : m.estado === 'entregado' ? (
                                                                        <FaCheckDouble className="text-gray-300" title="Entregado" />
                                                                    ) : m.estado === 'enviado' ? (
                                                                        <FaCheck className="text-gray-300" title="Enviado" />
                                                                    ) : (
                                                                        <FaCheck className="text-gray-400 opacity-60" title="Enviando..." />
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    {typing && (
                                        <div className="flex flex-col items-start animate-fade-in">
                                            <div className="bg-white border border-gray-100 px-3 py-1.5 rounded-2xl shadow-sm">
                                                <div className="flex gap-1">
                                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input */}
                                <form onSubmit={enviarMensaje} className="p-4 bg-white border-t border-gray-100 shrink-0">
                                    <div className="relative flex items-center gap-2 px-2">
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            ref={fileInputRef} 
                                            onChange={handleFileUpload}
                                            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="p-2 text-gray-500 hover:text-tescha-blue transition-colors disabled:opacity-50"
                                            title="Adjuntar archivo"
                                        >
                                            {uploading ? (
                                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <FaUpload />
                                            )}
                                        </button>
                                        <input
                                            type="text"
                                            value={mensaje}
                                            onChange={(e) => {
                                                setMensaje(e.target.value);
                                                handleTypingEmit();
                                            }}
                                            placeholder="Escribe un mensaje..."
                                            className="flex-1 pl-4 pr-12 py-3 bg-gray-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-tescha-blue transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!mensaje.trim()}
                                            className="absolute right-4 p-2 bg-tescha-blue text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center"
                                        >
                                            <FaPaperPlane className="text-xs" />
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Botón flotante */}
            <button
                onClick={toggleOpen}
                className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                    isOpen 
                        ? 'bg-red-500 rotate-90' 
                        : 'bg-gradient-to-tr from-blue-600 to-tescha-blue hover:shadow-blue-500/50'
                }`}
            >
                {isOpen ? <FaTimes className="text-white text-xl" /> : <FaComments className="text-white text-2xl" />}
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-white">
                        {unread}
                    </span>
                )}
            </button>
        </div>
    );
};

export default ChatFlotante;
