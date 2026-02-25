import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import { ejecutarChatInteligente, obtenerEstadisticas } from './config/modelos-ia.js';

console.log('\n🌟 PRUEBA DE OPENROUTER - MODELOS PREMIUM\n');
console.log('Probando modelos avanzados: Qwen, DeepSeek, Mistral\n');

// Probar con Qwen 2.5 72B (excelente para multilenguaje)
console.log('📊 Prueba 1: Qwen 2.5 72B (Matematicas)\n');

try {
  const inicio1 = Date.now();
  const respuesta1 = await ejecutarChatInteligente(
    [{ role: 'user', content: 'Calcula 157 x 23 y explica el proceso en espanol' }],
    [],
    300,
    'openrouter.qwen-2.5-72b'
  );
  const tiempo1 = Date.now() - inicio1;
  
  console.log('✅ Respuesta de Qwen:');
  console.log(respuesta1.content);
  console.log(`\n⏱️  Tiempo: ${tiempo1}ms\n`);
} catch (error) {
  console.error('❌ Error con Qwen:', error.message, '\n');
}

// Probar con DeepSeek (codigo)
console.log('💻 Prueba 2: DeepSeek Coder (Programacion)\n');

try {
  const inicio2 = Date.now();
  const respuesta2 = await ejecutarChatInteligente(
    [{ role: 'user', content: 'Escribe una funcion JavaScript que invierta un string' }],
    [],
    300,
    'openrouter.deepseek-coder'
  );
  const tiempo2 = Date.now() - inicio2;
  
  console.log('✅ Respuesta de DeepSeek:');
  console.log(respuesta2.content);
  console.log(`\n⏱️  Tiempo: ${tiempo2}ms\n`);
} catch (error) {
  console.error('❌ Error con DeepSeek:', error.message, '\n');
}

// Estadisticas
console.log('📊 ESTADISTICAS:\n');
const stats = obtenerEstadisticas();
console.log(`OpenRouter configurado: ${stats.configuracion.openrouterConfigured ? '✅ SI' : '❌ NO'}`);
console.log(`Groq Keys: ${stats.configuracion.groqKeys}`);
console.log(`\n🎉 Ahora tienes acceso a todos los modelos premium!\n`);
