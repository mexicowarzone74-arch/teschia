import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaUser, FaUsers, FaChalkboardTeacher, FaTimes } from 'react-icons/fa';
import api from '../services/api';

const GlobalSearch = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();
    const inputRef = useRef(null);

    // Escuchar atajo de teclado Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Enfocar input al abrir
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Buscar al escribir
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                try {
                    const response = await api.get(`/search/global?q=${query}`);
                    setResults(response.data.results);
                    setSelectedIndex(0);
                } catch (error) {
                    console.error('Error in search:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (item) => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        
        switch (item.type) {
            case 'alumno':
                navigate(`/alumnos?id=${item.id}`);
                break;
            case 'grupo':
                navigate(`/grupos?id=${item.id}`);
                break;
            case 'maestro':
                navigate(`/maestros?id=${item.id}`);
                break;
            default:
                break;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 sm:pt-40 px-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                <div className="flex items-center p-4 border-b border-gray-100">
                    <FaSearch className="text-gray-400 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 placeholder-gray-400"
                        placeholder="Busca alumnos, grupos o maestros... (Esc para salir)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400 transition-colors">
                        <FaTimes />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">
                            <div className="animate-spin inline-block w-6 h-6 border-b-2 border-blue-500 rounded-full mb-2"></div>
                            <p className="text-sm">Buscando en el sistema...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="p-2">
                            {results.map((item, index) => (
                                <button
                                    key={`${item.type}-${item.id}`}
                                    onClick={() => handleSelect(item)}
                                    className={`w-full flex items-center p-3 rounded-xl transition-all ${
                                        index === selectedIndex ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg mr-4 ${
                                        item.type === 'alumno' ? 'bg-blue-100 text-blue-600' :
                                        item.type === 'grupo' ? 'bg-purple-100 text-purple-600' :
                                        'bg-teal-100 text-teal-600'
                                    }`}>
                                        {item.type === 'alumno' && <FaUser />}
                                        {item.type === 'grupo' && <FaUsers />}
                                        {item.type === 'maestro' && <FaChalkboardTeacher />}
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-bold ${index === selectedIndex ? 'text-blue-700' : 'text-gray-800'}`}>
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">{item.type}: {item.subtitle}</p>
                                    </div>
                                    {index === selectedIndex && (
                                        <span className="ml-auto text-[10px] font-bold bg-blue-600 text-white px-2 py-1 rounded">ENTER</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : query.length >= 2 ? (
                        <div className="p-8 text-center text-gray-400">
                            <p>No se encontraron resultados para "{query}"</p>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            <p className="text-sm">Escribe al menos 2 caracteres para buscar</p>
                            <div className="mt-4 flex justify-center gap-4">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Ej: 2024</span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Ej: Juan</span>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Ej: B-01</span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="bg-gray-50 p-3 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest border-t border-gray-100">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><span className="bg-white border shadow-sm px-1 rounded">↑↓</span> Navegar</span>
                        <span className="flex items-center gap-1"><span className="bg-white border shadow-sm px-1 rounded">ENTER</span> Seleccionar</span>
                    </div>
                    <span>TESCHA Intelligence v1.0</span>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
