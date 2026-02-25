import { useState } from 'react';

/**
 * Componente de tabla responsiva que se adapta a diferentes tamaños de pantalla
 * En móviles, muestra las filas como tarjetas
 * En desktop, muestra tabla tradicional
 */
const ResponsiveTable = ({ 
  columns, 
  data, 
  keyExtractor,
  emptyMessage = "No hay datos disponibles",
  mobileCardRender // Función opcional para renderizar tarjetas personalizadas en móvil
}) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (column) => {
    if (!column.sortable) return;
    
    if (sortColumn === column.key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };

  const sortedData = sortColumn 
    ? [...data].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        const modifier = sortDirection === 'asc' ? 1 : -1;
        
        if (aVal < bVal) return -1 * modifier;
        if (aVal > bVal) return 1 * modifier;
        return 0;
      })
    : data;

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Vista de escritorio - Tabla tradicional */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column)}
                  className={`px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((row, index) => (
              <tr key={keyExtractor ? keyExtractor(row) : index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 lg:px-6 py-4 text-sm text-gray-900">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista móvil - Tarjetas */}
      <div className="md:hidden space-y-3">
        {sortedData.map((row, index) => (
          <div 
            key={keyExtractor ? keyExtractor(row) : index}
            className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
          >
            {mobileCardRender ? (
              mobileCardRender(row)
            ) : (
              <div className="space-y-2">
                {columns.map((column) => (
                  !column.hideMobile && (
                    <div key={column.key} className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-gray-600 uppercase">
                        {column.label}:
                      </span>
                      <span className="text-sm text-gray-900 text-right flex-1 ml-2">
                        {column.render ? column.render(row) : row[column.key]}
                      </span>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default ResponsiveTable;
