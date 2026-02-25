/**
 * Sistema de mensajes súper amigables y claros
 * Para que hasta el usuario más perdido entienda qué pasó
 */

import { toast } from 'react-toastify';

export const mensajes = {
  // ÉXITOS - Con emojis y mensajes claros
  exito: {
    guardar: () => toast.success('✅ ¡Guardado! Los cambios ya están listos.'),
    eliminar: () => toast.success('🗑️ ¡Eliminado! Ya no existe en el sistema.'),
    actualizar: () => toast.success('🔄 ¡Actualizado! Los datos se refrescaron.'),
    enviar: () => toast.success('📧 ¡Enviado! El mensaje está en camino.'),
    completar: () => toast.success('✅ ¡Listo! Operación completada con éxito.'),
    crear: (cosa) => toast.success(`➕ ¡Creado! El ${cosa} ya está en el sistema.`),
  },

  // ERRORES - Explicaciones claras de qué salió mal
  error: {
    red: () => toast.error('📡 No hay internet. Revisa tu conexión y vuelve a intentar.'),
    servidor: () => toast.error('🔧 El servidor está ocupado. Espera un momento e intenta de nuevo.'),
    noEncontrado: (cosa) => toast.error(`🔍 No encontramos ese ${cosa}. ¿Ya existe?`),
    permisos: () => toast.error('🔒 No tienes permiso para hacer esto. Habla con un administrador.'),
    camposVacios: () => toast.error('📝 Llena todos los campos marcados con * antes de continuar.'),
    formatoIncorrecto: (campo) => toast.error(`❌ El ${campo} no tiene el formato correcto. Revísalo.`),
    duplicado: (cosa) => toast.error(`⚠️ Ya existe un ${cosa} con esos datos.`),
    muyCorto: (campo, min) => toast.error(`📏 El ${campo} debe tener al menos ${min} caracteres.`),
    muyLargo: (campo, max) => toast.error(`📏 El ${campo} no puede tener más de ${max} caracteres.`),
    rangoInvalido: (campo, min, max) => toast.error(`📊 El ${campo} debe estar entre ${min} y ${max}.`),
    emailInvalido: () => toast.error('📧 Ese email no es válido. Ejemplo: usuario@tescha.edu.mx'),
    telefonoInvalido: () => toast.error('📞 El teléfono debe tener 10 dígitos. Ejemplo: 5512345678'),
    fechaInvalida: () => toast.error('📅 Esa fecha no es válida. Revísala.'),
    fechaFuturo: () => toast.error('⏰ No puedes usar una fecha del futuro.'),
    fechaPasado: () => toast.error('⏰ Esa fecha ya pasó. Usa una fecha actual o futura.'),
  },

  // ADVERTENCIAS - Avisos importantes
  advertencia: {
    cambiosSinGuardar: () => toast.warning('⚠️ Tienes cambios sin guardar. ¿Quieres salir de todas formas?'),
    operacionIrreversible: () => toast.warning('🚨 Esta acción NO se puede deshacer. ¿Estás seguro?'),
    sesionExpirando: (minutos) => toast.warning(`⏰ Tu sesión expirará en ${minutos} minutos. Guarda tu trabajo.`),
    limiteAlcanzado: (limite) => toast.warning(`⚠️ Has alcanzado el límite de ${limite} registros.`),
    campoOpcional: (campo) => toast.info(`ℹ️ El ${campo} es opcional, pero es recomendable llenarlo.`),
    revisionNecesaria: () => toast.warning('👀 Revisa bien los datos antes de guardar.'),
  },

  // INFORMACIÓN - Mensajes informativos
  info: {
    cargando: () => toast.info('⏳ Cargando datos... Un momento por favor.'),
    procesando: () => toast.info('⚙️ Procesando... Esto puede tardar unos segundos.'),
    buscando: () => toast.info('🔍 Buscando... Espera un momento.'),
    sincronizando: () => toast.info('🔄 Sincronizando datos con el servidor...'),
    copiado: () => toast.success('📋 ¡Copiado al portapapeles!'),
    descargando: () => toast.info('⬇️ Descargando archivo...'),
    vacio: () => toast.info('📭 No hay registros para mostrar.'),
    filtroActivo: (filtro) => toast.info(`🔍 Mostrando solo: ${filtro}`),
  },

  // AYUDA - Mensajes de ayuda y orientación
  ayuda: {
    primeraVez: () => toast.info('👋 ¡Hola! Parece que es tu primera vez aquí. ¿Quieres ver un tutorial?', {
      autoClose: 10000,
      closeButton: true
    }),
    atajo: (tecla, accion) => toast.info(`⌨️ Tip: Presiona ${tecla} para ${accion}`, {
      autoClose: 5000
    }),
    sugerencia: (texto) => toast.info(`💡 Sugerencia: ${texto}`, {
      autoClose: 7000
    }),
    siguientePaso: (paso) => toast.info(`➡️ Siguiente paso: ${paso}`, {
      autoClose: 5000
    }),
  },

  // PROGRESO - Para operaciones largas
  progreso: {
    inicio: (operacion) => {
      const id = toast.loading(`⏳ ${operacion}... 0%`);
      return id;
    },
    actualizar: (id, operacion, porcentaje) => {
      toast.update(id, {
        render: `⏳ ${operacion}... ${porcentaje}%`,
        type: 'info',
        isLoading: true
      });
    },
    completar: (id, mensaje = '¡Completado!') => {
      toast.update(id, {
        render: `✅ ${mensaje}`,
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });
    },
    error: (id, mensaje = 'Hubo un error') => {
      toast.update(id, {
        render: `❌ ${mensaje}`,
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
    }
  },

  // CONFIRMACIONES - Mensajes que requieren acción del usuario
  confirmar: {
    eliminar: (cosa) => `¿Seguro que quieres eliminar este ${cosa}? Esta acción NO se puede deshacer.`,
    cambiar: (cosa) => `¿Quieres guardar los cambios en ${cosa}?`,
    salir: () => '¿Quieres salir? Hay cambios sin guardar que se perderán.',
    continuar: () => '¿Estás seguro de continuar con esta operación?',
    cancelar: () => '¿Cancelar esta operación? Se perderá el progreso.',
  }
};

// Funciones helper para validaciones comunes con mensajes claros
export const validarConMensaje = {
  email: (email) => {
    if (!email) {
      mensajes.error.camposVacios();
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mensajes.error.emailInvalido();
      return false;
    }
    return true;
  },

  telefono: (telefono) => {
    if (!telefono) return true; // Opcional
    if (!/^\d{10}$/.test(telefono.replace(/\D/g, ''))) {
      mensajes.error.telefonoInvalido();
      return false;
    }
    return true;
  },

  rango: (valor, min, max, nombreCampo) => {
    if (valor < min || valor > max) {
      mensajes.error.rangoInvalido(nombreCampo, min, max);
      return false;
    }
    return true;
  },

  longitud: (texto, min, max, nombreCampo) => {
    if (texto.length < min) {
      mensajes.error.muyCorto(nombreCampo, min);
      return false;
    }
    if (texto.length > max) {
      mensajes.error.muyLargo(nombreCampo, max);
      return false;
    }
    return true;
  },

  requerido: (valor, nombreCampo) => {
    if (!valor || valor.trim() === '') {
      toast.error(`📝 El campo "${nombreCampo}" es obligatorio.`);
      return false;
    }
    return true;
  }
};

export default mensajes;
