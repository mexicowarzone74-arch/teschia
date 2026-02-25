export const getStatusInfo = (status) => {
  const statusMap = {
    'online': { 
      label: 'En línea', 
      color: 'bg-green-500', 
      textColor: 'text-green-600',
      icon: '●'
    },
    'away': { 
      label: 'Ausente', 
      color: 'bg-yellow-500', 
      textColor: 'text-yellow-600',
      icon: '◐'
    },
    'busy': { 
      label: 'Ocupado', 
      color: 'bg-red-500', 
      textColor: 'text-red-600',
      icon: '⊗'
    },
    'dnd': { 
      label: 'No molestar', 
      color: 'bg-purple-500', 
      textColor: 'text-purple-600',
      icon: '⛔'
    },
    'offline': { 
      label: 'Desconectado', 
      color: 'bg-gray-400', 
      textColor: 'text-gray-600',
      icon: '○'
    }
  };

  return statusMap[status] || statusMap['offline'];
};

export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return null;
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now - lastSeenDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return lastSeenDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
};
