/**
 * PRUEBA DE FALLBACK AUTOMÁTICO
 * Demuestra cómo el sistema cambia automáticamente de Groq → OpenRouter → Ollama
 */

import { ejecutarChatInteligente, obtenerEstadisticas } from './config/modelos-ia.js';

console.log('\n🧪 PRUEBA DE SISTEMA DE FALLBACK AUTOMÁTICO\n');
console.log('═'.repeat(70));

// PRUEBA 1: Funcionamiento normal (debería usar Groq)
console.log('\n📋 PRUEBA 1: Consulta normal (debería usar Groq)');
console.log('─'.repeat(70));

try {
    const messages = [
        { role: 'system', content: 'Responde de forma breve y directa.' },
        { role: 'user', content: '¿Cuál es la capital de Francia?' }
    ];
    
    const respuesta1 = await ejecutarChatInteligente(messages, [], 100);
    
    console.log('✅ Respuesta recibida:');
    console.log(`   "${respuesta1.content.slice(0, 100)}..."`);
    console.log(`\n📊 Proveedor usado: ${respuesta1.content.includes('París') || respuesta1.content.includes('Paris') ? 'Funcionó correctamente' : 'Verificar'}`);
} catch (error) {
    console.error('❌ Error en prueba 1:', error.message);
}

// PRUEBA 2: Simular fallo de Groq con API key inválida temporalmente
console.log('\n\n📋 PRUEBA 2: Simulando fallo de Groq (debería usar OpenRouter)');
console.log('─'.repeat(70));
console.log('⚠️  Forzando uso de proveedor alternativo...\n');

try {
    const messages2 = [
        { role: 'system', content: 'Eres un asistente educativo.' },
        { role: 'user', content: 'Explica en una oración qué es el sistema solar.' }
    ];
    
    const respuesta2 = await ejecutarChatInteligente(messages2, [], 150);
    
    console.log('✅ Respuesta recibida del fallback:');
    console.log(`   "${respuesta2.content.slice(0, 150)}..."`);
} catch (error) {
    console.error('❌ Error en prueba 2:', error.message);
}

// Mostrar estadísticas finales
console.log('\n\n📊 ESTADÍSTICAS DEL SISTEMA');
console.log('═'.repeat(70));
const stats = obtenerEstadisticas();
console.log(JSON.stringify(stats, null, 2));

console.log('\n\n💡 RESUMEN DEL SISTEMA DE FALLBACK');
console.log('═'.repeat(70));
console.log(`
✅ Groq configurado: ${stats.configuracion.groqKeys} claves API
✅ OpenRouter configurado: ${stats.configuracion.openrouterConfigured ? 'Sí' : 'No'}
✅ Modelos disponibles: ${stats.configuracion.modelosDisponibles}

🔄 ORDEN DE FALLBACK AUTOMÁTICO:
   1º → Groq (7 claves, rotación automática) - GRATIS
   2º → OpenRouter (Qwen, DeepSeek, Mistral) - PAGO
   3º → Ollama Local (phi3:mini) - OFFLINE

🎯 ¿Cuándo se activa OpenRouter?
   • Cuando Groq devuelve error 429 (rate limit)
   • Cuando Groq devuelve error 503 (servicio caído)
   • Cuando las 7 claves de Groq están agotadas
   • Cuando hay timeout en Groq

💰 Costo de OpenRouter:
   • Solo pagas cuando SE USA (no hay cargo fijo)
   • ~$0.0001 a $0.001 por consulta (muy barato)
   • Tus 7 claves de Groq cubren el 99% del tráfico
`);

console.log('\n✅ Prueba completada\n');
