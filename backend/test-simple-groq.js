import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Groq from 'groq-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

console.log('🧪 PRUEBA RÁPIDA DE GROQ\n');

const apiKey = process.env.GROQ_API_KEY?.split(',')[0];
console.log(`API Key detectada: ${apiKey?.substring(0, 20)}...`);
console.log(`Longitud total: ${process.env.GROQ_API_KEY?.length} caracteres\n`);

const groq = new Groq({ apiKey });

console.log('⏳ Enviando solicitud a Llama 3.3 70B...\n');

try {
  const response = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: '¿Qué es TESCHA? Responde en máximo 30 palabras.'
      }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 150
  });

  const respuesta = response.choices[0].message.content;
  const tokens = response.usage?.total_tokens || 0;
  
  console.log('✅ ¡ÉXITO! Respuesta recibida:\n');
  console.log(respuesta);
  console.log(`\n📊 Tokens usados: ${tokens}`);
  console.log('\n🎉 El sistema está funcionando correctamente!');
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.status) console.error(`Status: ${error.status}`);
}
