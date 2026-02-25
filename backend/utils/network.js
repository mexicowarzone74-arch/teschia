import os from 'os';

/**
 * Obtiene todas las direcciones IP locales (IPv4) de la máquina.
 * Excluye la interfaz de loopback (127.0.0.1).
 */
export const getLocalIPs = () => {
    const interfaces = os.networkInterfaces();
    const ips = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Solo IPv4 y que no sea la interfaz de loopback
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    
    return ips;
};

export default { getLocalIPs };
