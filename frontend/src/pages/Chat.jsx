import { useState, useEffect, useRef } from 'react';
import { FaComments, FaPaperPlane, FaUserCircle, FaRobot, FaSearch, FaUser, FaArrowLeft, FaUpload, FaTrash, FaBroom, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../services/api';
import StatusSelector from '../components/StatusSelector';
import { getStatusInfo, formatLastSeen } from '../utils/statusHelpers';

const Chat = () => {
    const [mensaje, setMensaje] = useState('');
    const [mensajes, setMensajes] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null); // null = Sala General
    const [loading, setLoading] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState('');
    const [typingUsers, setTypingUsers] = useState({}); // { salaId: { userId: nombre } }
    const { socket } = useSocket();
    const { user } = useAuth();
    const scrollRef = useRef();
    const fileInputRef = useRef();
    const typingTimeoutRef = useRef();

    const getFileUrl = (path) => {
        if (!path) return '';
        // Si ya es URL absoluta o data URL (base64), devolverla directamente
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        // Construir URL absoluta basada en la base de la API
        const base = api.defaults.baseURL.replace(/\/api\/?$/, '');
        return `${base}${path}`;
    };

    // Generar ID de sala único
    const getSalaId = (otherId) => {
        if (!otherId) return 'general';
        const ids = [user.id, otherId].sort((a, b) => a - b);
        return `p_${ids[0]}_${ids[1]}`;
    };

    const currentSalaId = getSalaId(selectedUser?.id);

    useEffect(() => {
        cargarUsuarios();
        
        // Notificar al servidor que estamos online
        if (socket && user) {
            socket.emit('user:online', user.id);
        }
    }, [socket, user]);

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

    useEffect(() => {
        cargarHistorial();
        if (selectedUser) {
            marcarComoLeido();
            // Limpiar contador localmente
            setUsuarios(prev => prev.map(u => 
                u.id === selectedUser.id ? { ...u, unread_count: 0 } : u
            ));
        }
    }, [selectedUser]);

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
            console.error('Error al marcar como leído:', error);
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMsg) => {
            if (newMsg.sala_id === currentSalaId) {
                setMensajes(prev => [...prev, newMsg]);
                // Si estamos en la sala, marcar como leído en el server también
                if (selectedUser) {
                    marcarComoLeido();
                }
                // Si estaba escribiendo, quitarlo al llegar el mensaje
                setTypingUsers(prev => {
                    const next = { ...prev };
                    if (next[newMsg.sala_id]) {
                        delete next[newMsg.sala_id][newMsg.emisor_id];
                    }
                    return next;
                });
            } else {
                // Si no estamos en esa sala, aumentar contador del usuario
                setUsuarios(prev => prev.map(u => 
                    u.id === newMsg.emisor_id ? { ...u, unread_count: (u.unread_count || 0) + 1 } : u
                ));
            }
        };

        const handleTyping = (data) => {
            if (data.userId === user.id) return;
            
            setTypingUsers(prev => ({
                ...prev,
                [data.sala_id]: {
                    ...(prev[data.sala_id] || {}),
                    [data.userId]: data.isTyping ? data.username : null
                }
            }));

            // Limpiar automáticamente después de 3 segundos si no hay actualización
            if (data.isTyping) {
                setTimeout(() => {
                    setTypingUsers(prev => {
                        const next = { ...prev };
                        if (next[data.sala_id]) {
                            delete next[data.sala_id][data.userId];
                        }
                        return next;
                    });
                }, 3000);
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
        socket.emit('chat:join', currentSalaId);

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
            setLoadingUsers(true);
            const response = await api.get('/chat/usuarios');
            setUsuarios(response.data || []);
        } catch (error) {
            console.error('Error al cargar contactos:', error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const cargarHistorial = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/chat/${currentSalaId}`);
            setMensajes(response.data);
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

            // Enviar mensaje automático con el archivo
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
            toast.success('Archivo enviado');
        } catch (error) {
            console.error('Error al subir archivo:', error);
            toast.error('Error al subir archivo');
        } finally {
            setUploading(false);
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

    const vaciarChat = async () => {
        if (!window.confirm('¿Estás seguro de que deseas vaciar toda esta conversación? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`/chat/sala/${currentSalaId}`);
            setMensajes([]);
            toast.success('Conversación vaciada');
        } catch (error) {
            console.error('Error al vaciar chat:', error);
            toast.error('Error al vaciar la conversación');
        }
    };

    const eliminarMensaje = async (id) => {
        if (!window.confirm('¿Eliminar este mensaje?')) return;
        try {
            await api.delete(`/chat/mensaje/${id}`);
            setMensajes(prev => prev.filter(m => m.id !== id));
            toast.success('Mensaje eliminado');
        } catch (error) {
            console.error('Error al eliminar mensaje:', error);
            toast.error('Error al eliminar el mensaje');
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

    const filteredUsers = usuarios.filter(u => 
        (u.nombre_completo || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-140px)] flex bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            
            {/* Sidebar de Contactos */}
            <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/30">
                <div className="p-4 bg-white border-b border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="font-bold text-lg text-gray-800">Mensajes</h2>
                        <StatusSelector currentStatus={user?.status || 'online'} />
                    </div>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input 
                            type="text" 
                            placeholder="Buscar contacto..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-tescha-blue"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {/* Botón Sala General */}
                    <button 
                        onClick={() => setSelectedUser(null)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                            selectedUser === null ? 'bg-white shadow-sm border-blue-100 border' : 'hover:bg-white/50'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            selectedUser === null ? 'bg-tescha-blue text-white' : 'bg-blue-100 text-blue-600'
                        }`}>
                            <FaComments />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm text-gray-800">Sala General</p>
                            <p className="text-[10px] text-gray-500">Chat grupal e IA</p>
                        </div>
                    </button>

                    <div className="px-3 py-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contactos Directos</span>
                    </div>

                    {loadingUsers ? (
                        <div className="flex justify-center p-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tescha-blue"></div>
                        </div>
                    ) : filteredUsers.length > 0 ? filteredUsers.map(u => {
                        const userSalaId = getSalaId(u.id);
                        const isTyping = typingUsers[userSalaId] && Object.keys(typingUsers[userSalaId]).length > 0;

                        return (
                            <button 
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                    selectedUser?.id === u.id ? 'bg-white shadow-sm border-blue-100 border' : 'hover:bg-white/50'
                                }`}
                            >
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                                        selectedUser?.id === u.id ? 'bg-tescha-blue' : 'bg-gray-400'
                                    }`}>
                                        {u.nombre ? u.nombre.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                                    </div>
                                    {/* Indicador de estado */}
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                        getStatusInfo(u.status || 'offline').color
                                    }`}></div>
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-800 truncate">
                                        {u.nombre_completo || u.username}
                                    </p>
                                    {isTyping ? (
                                        <p className="text-[10px] text-green-500 font-bold animate-pulse">Escribiendo...</p>
                                    ) : (
                                        <p className={`text-[10px] font-medium ${
                                            getStatusInfo(u.status || 'offline').textColor
                                        }`}>
                                            {u.status && u.status !== 'offline' 
                                                ? getStatusInfo(u.status).label
                                                : u.last_seen 
                                                    ? formatLastSeen(u.last_seen)
                                                    : u.rol
                                            }
                                        </p>
                                    )}
                                </div>
                                {u.unread_count > 0 && (
                                    <div className="ml-auto bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-sm border-2 border-white">
                                        {u.unread_count}
                                    </div>
                                )}
                            </button>
                        );
                    }) : (
                        <div className="p-4 text-center text-xs text-gray-400 italic">
                            {search ? 'No se encontraron coincidencias' : 'Aún no hay otros contactos registrados'}
                        </div>
                    )}
                </div>
            </div>

            {/* Area de Chat */}
            <div className="flex-1 flex flex-col bg-white">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-100 flex items-center gap-4">
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                            selectedUser ? 'bg-tescha-blue shadow-lg shadow-blue-100' : 'bg-purple-600 shadow-lg shadow-purple-100'
                        }`}>
                            {selectedUser ? <FaUser className="text-xl" /> : <FaRobot className="text-2xl" />}
                        </div>
                        {selectedUser?.is_online && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800">
                            {selectedUser ? (selectedUser.nombre_completo || selectedUser.username) : 'Asistente IA & Sala General'}
                        </h2>
                        {selectedUser ? (
                            selectedUser.status && selectedUser.status !== 'offline' ? (
                                <p className={`text-xs flex items-center gap-1 font-medium ${
                                    getStatusInfo(selectedUser.status).textColor
                                }`}>
                                    <span className={`w-2 h-2 rounded-full animate-pulse ${
                                        getStatusInfo(selectedUser.status).color
                                    }`}></span>
                                    {getStatusInfo(selectedUser.status).label}
                                </p>
                            ) : selectedUser.last_seen ? (
                                <p className="text-xs text-gray-500">
                                    Últ. vez: {formatLastSeen(selectedUser.last_seen)}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-500">Desconectado</p>
                            )
                        ) : (
                            <p className="text-xs text-green-500 flex items-center gap-1 font-medium">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                IA activa para resolver dudas técnico-académicas
                            </p>
                        )}
                    </div>
                    
                    <button 
                        onClick={vaciarChat}
                        className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Vaciar Chat"
                    >
                        <FaBroom />
                        <span className="hidden sm:inline">Vaciar Chat</span>
                    </button>
                </div>

                {/* Mensajes */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tescha-blue"></div>
                        </div>
                    ) : mensajes.length > 0 ? (
                        mensajes.map((m, idx) => {
                            const isMe = m.emisor_id === user?.id;
                            const isIA = m.emisor_rol === 'ia';

                            return (
                                <div key={idx} className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-4 max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <div className="flex-shrink-0 mt-1">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                                                isIA ? 'bg-purple-600' : isMe ? 'bg-blue-600' : 'bg-gray-500'
                                            }`}>
                                                {isIA ? <FaRobot /> : m.emisor_nombre.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2 mb-1.5 px-1">
                                                <span className="text-[11px] font-bold text-gray-600">{m.emisor_nombre}</span>
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full text-white font-bold tracking-tighter uppercase ${
                                                    m.emisor_rol === 'coordinador' ? 'bg-amber-500' : 
                                                    m.emisor_rol === 'ia' ? 'bg-purple-600' : 'bg-blue-500'
                                                }`}>
                                                    {m.emisor_rol}
                                                </span>
                                                {isMe && (
                                                    <button 
                                                        onClick={() => eliminarMensaje(m.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Eliminar mensaje"
                                                    >
                                                        <FaTrash className="text-[10px]" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className={`px-5 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                                isMe 
                                                    ? 'bg-tescha-blue text-white rounded-tr-none' 
                                                    : isIA
                                                    ? 'bg-purple-50 border border-purple-100 text-gray-800 rounded-tl-none font-medium'
                                                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                                            }`}>
                                                {m.metadata?.file ? (
                                                    <div className="space-y-2">
                                                        {m.metadata.file.type.startsWith('image/') ? (
                                                            <img 
                                                                src={getFileUrl(m.metadata.file.url)} 
                                                                alt={m.metadata.file.name}
                                                                className="max-w-full max-h-[300px] object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-black/5 bg-gray-50"
                                                                onClick={() => window.open(getFileUrl(m.metadata.file.url), '_blank')}
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-3 p-2 bg-black/5 rounded-lg">
                                                                <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-tescha-blue">
                                                                    <FaUpload />
                                                                </div>
                                                                <div className="flex-1 overflow-hidden">
                                                                    <p className="font-bold text-xs truncate">{m.metadata.file.name}</p>
                                                                    <p className="text-[10px] opacity-70">{(m.metadata.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                                </div>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => window.open(getFileUrl(m.metadata.file.url), '_blank')}
                                                                    className="p-2 bg-white/50 hover:bg-white text-[10px] rounded font-bold transition-colors"
                                                                >
                                                                    VER / DESCARGAR
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    m.mensaje.replace('🤖 [IA]: ', '')
                                                )}
                                                <div className={`flex items-center gap-1.5 mt-2 justify-end ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                                    <span className="text-[10px]">
                                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isMe && (
                                                        <span className="text-[11px] flex items-center">
                                                            {m.estado === 'leido' || m.leido ? (
                                                                <FaCheckDouble className="text-blue-300" title="✓✓ Leído - El destinatario ha visto tu mensaje" />
                                                            ) : m.estado === 'entregado' ? (
                                                                <FaCheckDouble className="text-gray-300" title="✓✓ Entregado - Mensaje recibido por el destinatario" />
                                                            ) : m.estado === 'enviado' ? (
                                                                <FaCheck className="text-gray-300" title="✓ Enviado - Mensaje enviado al servidor" />
                                                            ) : (
                                                                <FaCheck className="text-gray-400 opacity-60" title="⏳ Enviando..." />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <FaComments className="text-8xl mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No hay mensajes en este chat.</p>
                            <p className="text-sm">¡Sé el primero en escribir!</p>
                        </div>
                    )}

                    {/* Indicador de escribiendo */}
                    {Object.entries(typingUsers[currentSalaId] || {}).map(([uid, name]) => name && (
                        <div key={uid} className="flex justify-start">
                            <div className="flex gap-4">
                                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs font-bold">
                                    {name.charAt(0).toUpperCase()}
                                </div>
                                <div className="bg-white border border-gray-100 px-4 py-2 rounded-2xl shadow-sm">
                                    <div className="flex gap-1 h-5 items-center">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 font-medium">{name} está escribiendo...</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input de Chat */}
                <div className="p-6 bg-white border-t border-gray-100">
                    <form onSubmit={enviarMensaje} className="max-w-4xl mx-auto flex gap-4">
                        <div className="flex-1 relative flex gap-2">
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
                                className="p-4 bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center disabled:opacity-50"
                                title="Adjuntar archivo"
                            >
                                {uploading ? (
                                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <FaUpload className="text-xl" />
                                )}
                            </button>
                            <input
                                type="text"
                                value={mensaje}
                                onChange={(e) => {
                                    setMensaje(e.target.value);
                                    handleTypingEmit();
                                }}
                                placeholder={selectedUser ? `Enviar mensaje privado a ${selectedUser.username}...` : "Escribe un mensaje para el equipo..."}
                                className="flex-1 px-6 py-4 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-tescha-blue transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!mensaje.trim()}
                            className="px-10 bg-tescha-blue text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                        >
                            <span>Enviar</span>
                            <FaPaperPlane className="text-sm" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;
