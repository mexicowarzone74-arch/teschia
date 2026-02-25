import { useState, useEffect } from 'react';
import { tfaService } from '../services/api';
import { toast } from 'react-toastify';
import { 
    FaShieldAlt, FaQrcode, FaCheckCircle, 
    FaTimesCircle, FaKey, FaCopy, FaDownload 
} from 'react-icons/fa';

const Security = () => {
    const [tfaEnabled, setTfaEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showSetup, setShowSetup] = useState(false);
    const [setupData, setSetupData] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState(null);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await tfaService.status();
            setTfaEnabled(res.data.enabled);
        } catch (error) {
            toast.error('Error al verificar estatus de seguridad');
        } finally {
            setLoading(false);
        }
    };

    const handleStartSetup = async () => {
        try {
            setLoading(true);
            const res = await tfaService.generate();
            setSetupData(res.data);
            setShowSetup(true);
        } catch (error) {
            toast.error('Error al iniciar configuración 2FA');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndEnable = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await tfaService.verify(verificationCode);
            setTfaEnabled(true);
            setShowSetup(false);
            setBackupCodes(res.data.backupCodes);
            toast.success('¡2FA activado correctamente!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Código inválido');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        const code = prompt('Para desactivar 2FA, ingresa tu código actual:');
        if (!code) return;

        try {
            setLoading(true);
            await tfaService.disable(code);
            setTfaEnabled(false);
            setBackupCodes(null);
            toast.success('2FA desactivado exitosamente');
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo desactivar 2FA');
        } finally {
            setLoading(false);
        }
    };

    const copyBackupCodes = () => {
        const text = backupCodes.join('\n');
        navigator.clipboard.writeText(text);
        toast.info('Códigos copiados al portapapeles');
    };

    if (loading && !setupData) {
        return <div className="p-8 text-center">Cargando configuración de seguridad...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <FaShieldAlt className="text-tescha-blue" />
                    Seguridad de la Cuenta
                </h1>
                <p className="text-gray-600 mt-2">Protege tu cuenta con capas de seguridad adicionales</p>
            </div>

            {/* Estado de 2FA */}
            <div className="card">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <div className={`p-4 rounded-xl ${tfaEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            <FaShieldAlt className="text-3xl" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Autenticación de Dos Factores (2FA)</h3>
                            <p className="text-sm text-gray-600 mt-1 max-w-md">
                                Agrega una capa extra de seguridad. Además de tu contraseña, deberás ingresar un código generado por tu celular.
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                {tfaEnabled ? (
                                    <span className="flex items-center gap-1 text-sm font-bold text-green-600">
                                        <FaCheckCircle /> ACTIVADO
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-sm font-bold text-gray-400">
                                        <FaTimesCircle /> DESACTIVADO
                                    </span>
                                ) }
                            </div>
                        </div>
                    </div>
                    <div>
                        {tfaEnabled ? (
                            <button onClick={handleDisable} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
                                Desactivar
                            </button>
                        ) : (
                            <button onClick={handleStartSetup} className="btn-primary">
                                Configurar 2FA
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Códigos de Respaldo (Si acaba de activar) */}
            {backupCodes && (
                <div className="card border-2 border-green-200 bg-green-50 animate-fadeIn">
                    <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                        <FaKey /> Códigos de Respaldo
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                        Guarda estos códigos en un lugar seguro. Si pierdes tu celular, estos códigos te permitirán entrar a tu cuenta.
                    </p>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                        {backupCodes.map((code, idx) => (
                            <div key={idx} className="bg-white p-2 text-center font-mono text-sm border border-green-200 rounded font-bold text-gray-700">
                                {code}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button onClick={copyBackupCodes} className="btn-secondary bg-white flex items-center gap-2 text-sm">
                            <FaCopy /> Copiar todos
                        </button>
                        <button className="btn-secondary bg-white flex items-center gap-2 text-sm">
                            <FaDownload /> Descargar TXT
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Configuración */}
            {showSetup && setupData && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-lg">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-center text-gray-800">Configurar Autenticador</h2>
                            <p className="text-center text-gray-600 mt-2">Sigue estos pasos para activar 2FA</p>
                            
                            <div className="mt-8 space-y-6">
                                <div className="flex gap-4">
                                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">1</span>
                                    <p className="text-sm">Descarga <b>Google Authenticator</b> o <b>Authy</b> en tu celular.</p>
                                </div>
                                
                                <div className="flex gap-4">
                                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">2</span>
                                    <div>
                                        <p className="text-sm">Escanea este código QR desde la aplicación:</p>
                                        <div className="mt-4 flex justify-center p-4 bg-gray-50 rounded-xl">
                                            <img src={setupData.qrCodeUrl} alt="QR Setup" className="w-48 h-48" />
                                        </div>
                                        <p className="text-xs text-center text-gray-400 mt-2 font-mono">
                                            O ingresa manualmente: <span className="font-bold text-gray-600">{setupData.secret}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">3</span>
                                    <form onSubmit={handleVerifyAndEnable} className="flex-1">
                                        <p className="text-sm mb-3">Ingresa el código de 6 dígitos que aparece en tu app:</p>
                                        <input 
                                            type="text"
                                            maxLength="6"
                                            className="input text-center text-2xl font-bold tracking-[0.3em]"
                                            placeholder="000 000"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                                            required
                                        />
                                        <div className="mt-6 flex gap-3">
                                            <button 
                                                type="submit" 
                                                disabled={verificationCode.length < 6 || loading}
                                                className="flex-1 btn-primary"
                                            >
                                                {loading ? 'Verificando...' : 'Activar 2FA'}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowSetup(false)}
                                                className="btn-secondary"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Security;
