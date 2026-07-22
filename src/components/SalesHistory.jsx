import { useState, useEffect } from 'react'
import { Download, Trash2, Calendar, Filter, Eye, X } from 'lucide-react'
import { getVentas, deleteDetalleVenta, deleteVenta } from '../services/api'
import Swal from 'sweetalert2'

function SalesHistory() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [selectedVenta, setSelectedVenta] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    fetchVentas()
  }, [])

  const fetchVentas = async () => {
    setLoading(true)
    try {
      const { data } = await getVentas()
      if (data) {
        const ventasConDetalle = await Promise.all(
          data.map(async (venta) => {
            const { data: detalle } = await fetch(
              `https://izxtbndkcjxubvnisygh.supabase.co/rest/v1/detalle_ventas?venta_id=eq.${venta.id}&select=*,productos!producto_id(nombre,talle,color)`,
              {
                headers: {
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eHRibmRrY2p4dWJ2bmlzeWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTA3NDksImV4cCI6MjEwMDIyNjc0OX0.d-lkbzrINaZMFTRd4Yf34VHiNKcJgNUex9amF0gHknc',
                  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eHRibmRrY2p4dWJ2bmlzeWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTA3NDksImV4cCI6MjEwMDIyNjc0OX0.d-lkbzrINaZMFTRd4Yf34VHiNKcJgNUex9amF0gHknc',
                }
              }
            ).then(res => res.json())
            return { ...venta, detalle: detalle || [] }
          })
        )
        setVentas(ventasConDetalle)
      }
    } catch (err) {
      console.error('Error al cargar ventas:', err)
    }
    setLoading(false)
  }

  const filteredVentas = ventas.filter(venta => {
    const ventaDate = new Date(venta.fecha)
    const now = new Date()
    const diffTime = now - ventaDate
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    if (filterPeriod === 'today') return diffDays < 1
    if (filterPeriod === 'week') return diffDays <= 7
    if (filterPeriod === 'month') return diffDays <= 30
    return true
  })

  const exportToCSV = () => {
    const headers = ['ID Venta', 'Fecha', 'Producto', 'Talle', 'Color', 'Cantidad', 'Precio Unitario', 'Subtotal']
    const rows = []

    filteredVentas.forEach(venta => {
      if (venta.detalle && venta.detalle.length > 0) {
        venta.detalle.forEach(item => {
          rows.push([
            venta.id,
            new Date(venta.fecha).toLocaleString('es-AR'),
            item.productos?.nombre || 'Producto eliminado',
            item.productos?.talle || 'N/A',
            item.productos?.color || 'N/A',
            item.cantidad,
            `$${Number(item.precio_unitario).toFixed(2)}`,
            `$${(item.cantidad * item.precio_unitario).toFixed(2)}`
          ])
        })
      } else {
        rows.push([
          venta.id,
          new Date(venta.fecha).toLocaleString('es-AR'),
          'Sin productos',
          '-',
          '-',
          0,
          '-',
          `$${Number(venta.total).toFixed(2)}`
        ])
      }
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `ventas_${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
  }

  const deleteOldVentas = async (days) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      html: `Se eliminarán todas las ventas de hace más de <strong>${days} días</strong>.<br><br><span style="color: #dc2626; font-weight: bold;">Esta acción no se puede deshacer.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      const { data: allVentas } = await getVentas()
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      const ventasAEliminar = allVentas.filter(v => {
        const ventaDate = new Date(v.fecha)
        return ventaDate < cutoffDate
      })

      for (const venta of ventasAEliminar) {
        await deleteDetalleVenta(venta.id)
        await deleteVenta(venta.id)
      }

      await fetchVentas()
      
      await Swal.fire({
        title: '¡Éxito!',
        text: `Se eliminaron ${ventasAEliminar.length} ventas antiguas`,
        icon: 'success',
        confirmButtonColor: '#16a34a',
        timer: 2000,
        timerProgressBar: true
      })
    } catch (err) {
      console.error('Error al eliminar:', err)
      await Swal.fire({
        title: 'Error',
        text: 'Error al eliminar las ventas',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      })
    }
  }

  // ✅ NUEVA FUNCIÓN: Eliminar venta individual
  const deleteSingleVenta = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar esta venta?',
      text: 'Esta acción no se puede deshacer. La venta desaparecerá del historial.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      await deleteDetalleVenta(id)
      await deleteVenta(id)
      await fetchVentas()
      
      await Swal.fire({
        title: '¡Eliminada!',
        text: 'La venta fue eliminada correctamente',
        icon: 'success',
        confirmButtonColor: '#16a34a',
        timer: 2000,
        timerProgressBar: true
      })
    } catch (err) {
      console.error('Error al eliminar:', err)
      await Swal.fire({
        title: 'Error',
        text: 'Error al eliminar la venta',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      })
    }
  }

  const totalVentas = filteredVentas.reduce((sum, v) => sum + (v.total || 0), 0)

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
        📊 Historial de Ventas
      </h2>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="p-3 border-2 border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las ventas</option>
            <option value="today">Hoy</option>
            <option value="week">Últimos 7 días</option>
            <option value="month">Últimos 30 días</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-5 py-3 rounded-lg text-lg font-bold hover:bg-green-700 transition flex items-center gap-2"
          >
            <Download className="w-5 h-5" /> Exportar Excel
          </button>
          <button
            onClick={() => deleteOldVentas(90)}
            className="bg-red-600 text-white px-5 py-3 rounded-lg text-lg font-bold hover:bg-red-700 transition flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" /> Limpiar (&gt;90 días)
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl mb-6">
        <p className="text-lg text-gray-700">Total de ventas en el período:</p>
        <p className="text-3xl font-bold text-blue-700">${totalVentas.toFixed(2)}</p>
        <p className="text-base text-gray-600 mt-1">{filteredVentas.length} transacciones</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 text-xl">Cargando historial...</div>
      ) : filteredVentas.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-xl">No hay ventas en este período</div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {filteredVentas.map(venta => (
            <div key={venta.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-lg font-bold text-gray-800">Venta #{venta.id}</p>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(venta.fecha).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-700">${Number(venta.total).toFixed(2)}</p>
                  <div className="flex items-center gap-3 justify-end mt-1">
                    {/* ✅ NUEVO BOTÓN: Eliminar venta individual */}
                    <button
                      onClick={() => deleteSingleVenta(venta.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-bold flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                      title="Eliminar esta venta"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVenta(venta)
                        setShowDetail(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> Ver detalle ({venta.detalle?.length || 0})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDetail && selectedVenta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-800">Detalle de Venta #{selectedVenta.id}</h3>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-600"><strong>Fecha:</strong> {new Date(selectedVenta.fecha).toLocaleString('es-AR')}</p>
              <p className="text-gray-600"><strong>Total:</strong> ${Number(selectedVenta.total).toFixed(2)}</p>
            </div>

            <h4 className="text-lg font-bold text-gray-700 mb-3">Productos vendidos:</h4>
            <div className="space-y-2">
              {selectedVenta.detalle?.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">{item.productos?.nombre || 'Producto eliminado'}</p>
                    <p className="text-gray-600 text-sm">Talle: {item.productos?.talle || 'N/A'} | Color: {item.productos?.color || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{item.cantidad} x ${Number(item.precio_unitario).toFixed(2)}</p>
                    <p className="text-green-700 font-bold">${(item.cantidad * item.precio_unitario).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowDetail(false)}
              className="w-full bg-blue-600 text-white p-4 rounded-xl text-lg font-bold hover:bg-blue-700 transition mt-6"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      {/* 👇 Footer con créditos y donaciones */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-gray-500 text-sm mb-1">
          Desarrollado por <span className="font-bold text-gray-700">Yamil Amen</span> 💻
        </p>
        <p className="text-gray-400 text-xs mb-3">
          Sistema de gestión de stock
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-sm mx-auto">
          <p className="text-yellow-800 text-sm font-medium mb-1">
            ☕ ¿Te gustó el sistema?
          </p>
          <p className="text-yellow-700 text-xs">
            Se aceptan donaciones a:
          </p>
          <p className="text-yellow-900 font-bold text-base mt-1">
            FacundoRivero11
          </p>
      
        </div>
        <p className="text-gray-300 text-xs mt-4">
          © {new Date().getFullYear()} Stock Mercaderia
        </p>
      </div>

    </div>
    
  )
}

export default SalesHistory