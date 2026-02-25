import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import { ejecutarChatInteligente } from './config/modelos-ia.js';

console.log('🧪 PRUEBA DE RESPALDO OLLAMA (sin internet)\n');
console.log('Forzando uso de Ollama local...\n');

const messages = [
  { role: 'user', content: '¿Cuánto es 5 + 3? Responde solo el número.' }
];

try {
  const inicio = Date.now();
  
  // Forzar uso de Ollama
  const respuesta = await ejecutarChatInteligente(
    messages,
    [],
    100,
    'ollama.phi3'  // Forzar phi3 local
  );
  
  const tiempo = Date.now() - inicio;
  
  console.log('✅ RESPUESTA DE OLLAMA LOCAL:');
  console.log(respuesta.content);
  console.log(`\n⏱️  Tiempo: ${tiempo}ms`);
  console.log('\n🎉 ¡Respaldo funcionando! Tu sistema funciona sin internet.');
} catch (error) {
  console.error('❌ Error:', error.message);
}
