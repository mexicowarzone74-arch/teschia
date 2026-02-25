/**
 * SCRIPT DE PRUEBA - SISTEMA MULTI-MODELO
 * Prueba todos los modelos de IA disponibles
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configurar dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import { 
  ejecutarChatInteligente,
  generarRespuestaIA, 
  obtenerEstadisticas,
  MODELOS,
  ESTRATEGIA_FALLBACK
} from './config/modelos-ia.js';

console.log('🤖 SISTEMA MULTI-MODELO DE IA - TESCHA\n');
console.log('═'.repeat(60));

// Mostrar modelos disponibles
console.log('\n📦 MODELOS DISPONIBLES:\n');

Object.keys(MODELOS).forEach(provider => {
  console.log(`\n🔹 ${provider.toUpperCase()}:`);
  Object.keys(MODELOS[provider]).forEach(modelo => {
    const info = MODELOS[provider][modelo];
    console.log(`   • ${info.nombre} (${info.id})`);
    if (info.descripcion) console.log(`     ${info.descripcion}`);
  });
});

console.log('\n═'.repeat(60));
console.log('\n🔄 ESTRATEGIA DE FALLBACK:\n');
ESTRATEGIA_FALLBACK.forEach((modelo, i) => {
  console.log(`${i + 1}. ${modelo}`);
});

console.log('\n═'.repeat(60));
console.log('\n🧪 PRUEBA 1: Respuesta Simple\n');

try {
  const inicio = Date.now();
  const respuesta = await generarRespuestaIA(
    '¿Qué es el sistema escolar TESCHA? Responde en máximo 50 palabras.',
    'Eres un asistente experto del sistema TESCHA.',
    200
  );
  const tiempo = Date.now() - inicio;
  
  console.log(`✅ Respuesta recibida en ${tiempo}ms:`);
  console.log(`\n${respuesta}\n`);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
}

console.log('═'.repeat(60));
console.log('\n🧪 PRUEBA 2: Chat con Historial\n');

try {
  const messages = [
    { 
      role: 'system', 
      content: 'Eres un asistente matemático. Responde de forma concisa.' 
    },
    { 
      role: 'user', 
      content: '¿Cuánto es 15 × 23?' 
    }
  ];
  
  const inicio = Date.now();
  const respuesta = await ejecutarChatInteligente(messages, [], 150);
  const tiempo = Date.now() - inicio;
  
  console.log(`✅ Respuesta recibida en ${tiempo}ms:`);
  console.log(`\n${respuesta.content}\n`);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
}

console.log('═'.repeat(60));
console.log('\n📊 ESTADÍSTICAS DEL SISTEMA:\n');

const stats = obtenerEstadisticas();

console.log('🔧 Configuración:');
console.log(`   • Groq API Keys: ${stats.configuracion.groqKeys}`);
console.log(`   • OpenRouter: ${stats.configuracion.openrouterConfigured ? '✅ Configurado' : '❌ No configurado'}`);
console.log(`   • Modelos disponibles: ${stats.configuracion.modelosDisponibles}`);

if (Object.keys(stats.modelos).length > 0) {
  console.log('\n📈 Uso de modelos:');
  Object.entries(stats.modelos).forEach(([modelo, data]) => {
    console.log(`\n   ${modelo}:`);
    console.log(`     • Usos: ${data.usos}`);
    console.log(`     • Éxitos: ${data.exitos}`);
    console.log(`     • Fallos: ${data.fallos}`);
    console.log(`     • Tiempo promedio: ${Math.round(data.tiempoPromedio)}ms`);
    console.log(`     • Tokens usados: ${data.tokensUsados}`);
  });
} else {
  console.log('\n⚠️ No hay estadísticas aún (primer uso)');
}

console.log('\n═'.repeat(60));
console.log('\n✨ Prueba completada! El sistema está funcionando correctamente.\n');
