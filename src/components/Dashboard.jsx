import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Edit2, Trash2, LogOut, Search, AlertTriangle, ShoppingCart, BarChart3, RotateCcw } from 'lucide-react'
import { getProductosActivos, deactivateProducto, reactivateProducto, getProductosInactivos } from '../services/api'
import ProductForm from './ProductForm'
import SalesForm from './SalesForm'
import SalesHistory from './SalesHistory'

function Dashboard({ onLogout }) {
  const [productos, setProductos] = useState([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard')
  const [showInactive, setShowInactive] = useState(false)
  const [productosInactivos, setProductosInactivos] = useState([])

  const fetchProductos = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getProductosActivos()
      if (data) setProductos(data)
    } catch (err) {
      console.error('Error al cargar productos:', err)
    }
    setLoading(false)
  }, [])

  const fetchProductosInactivos = useCallback(async () => {
    try {
      const { data } = await getProductosInactivos()
      if (data) setProductosInactivos(data)
    } catch (err) {
      console.error('Error al cargar inactivos:', err)
    }
  }, [])

  useEffect(() => { fetchProductos() }, [fetchProductos])

  const handleDelete = async (id) => {
    if (window.confirm('¿Desactivar este producto?\n\nNo se borrará de la base de datos para no romper el historial de ventas, pero dejará de aparecer en el inventario.')) {
      try {
        await deactivateProducto(id)
        fetchProductos()
      } catch (err) {
        alert('Error al desactivar: ' + (err.response?.data?.message || err.message))
      }
    }
  }

  const handleReactivar = async (id) => {
    try {
      await reactivateProducto(id)
      fetchProductosInactivos()
      fetchProductos()
    } catch (err) {
      alert('Error al reactivar: ' + (err.response?.data?.message || err.message))
    }
  }

  const filteredProductos = productos.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase()) ||
    p.color?.toLowerCase().includes(search.toLowerCase())
  )

  const stockBajo = productos.filter(p => p.stock <= 5).length
  const totalProductos = productos.length
  const totalStock = productos.reduce((acc, p) => acc + (p.stock || 0), 0)

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-7 h-7 md:w-8 md:h-8 text-blue-600" /> Stock Mercadería
          </h1>
          <button onClick={onLogout} className="btn btn-secondary touch-target">
            <LogOut className="w-5 h-5" /> <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Navegación Desktop */}
        <div className="top-tabs">
          <button onClick={() => setCurrentView('dashboard')} className={`tab-btn ${currentView === 'dashboard' ? 'active' : ''}`}>
            <Package className="w-6 h-6" /> Inventario
          </button>
          <button onClick={() => setCurrentView('sales')} className={`tab-btn ${currentView === 'sales' ? 'active' : ''}`}>
            <ShoppingCart className="w-6 h-6" /> Registrar Venta
          </button>
          <button onClick={() => setCurrentView('history')} className={`tab-btn ${currentView === 'history' ? 'active' : ''}`}>
            <BarChart3 className="w-6 h-6" /> Historial
          </button>
        </div>

      

        {currentView === 'dashboard' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-lg text-gray-600 font-medium">Total Productos</p>
                <p className="text-4xl font-bold text-gray-800 mt-2">{totalProductos}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-lg text-gray-600 font-medium">Stock Total</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">{totalStock}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-lg text-gray-600 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-500" /> Stock Bajo (≤5)
                </p>
                <p className={`text-4xl font-bold mt-2 ${stockBajo > 0 ? 'text-red-600' : 'text-green-600'}`}>{stockBajo}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md w-full">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
  <input
    type="text"
    placeholder="Buscar por nombre, categoría o color..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>
              <button
                onClick={() => { setShowForm(true); setEditId(null); }}
                className="btn btn-primary w-full sm:w-auto"
              >
                <Plus className="w-6 h-6" /> Agregar Producto
              </button>
            </div>

            {/* VISTA MOBILE: Cards */}
            <div className="product-cards-mobile">
              {loading ? <div className="loading-state">Cargando productos...</div> : 
                filteredProductos.length === 0 ? (
                  <div className="empty-state">{search ? 'No se encontraron productos.' : 'No hay productos. ¡Agrega el primero!'}</div>
                ) : (
                  filteredProductos.map((p) => (
                    <div key={p.id} className="product-card">
                      <div className="product-card-header">
                        <div>
                          <h3 className="product-card-title">{p.nombre}</h3>
                          <p className="product-card-meta">{p.categoria || 'Sin categoría'}</p>
                        </div>
                        <span className={`stock-badge ${p.stock <= 5 ? 'stock-low' : 'stock-ok'}`}>
                          Stock: {p.stock}
                        </span>
                      </div>
                      <div className="product-card-details">
                        <div className="detail-item">Talle: <span>{p.talle || '-'}</span></div>
                        <div className="detail-item">Color: <span>{p.color || '-'}</span></div>
                      </div>
                      <div className="product-card-footer">
                        <div className="product-price">${Number(p.precio).toFixed(2)}</div>
                        <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                          <button onClick={() => { setShowForm(true); setEditId(p.id); }} className="btn btn-secondary touch-target" style={{ flex: 1 }}>
                            <Edit2 size={18} /> Editar
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="btn btn-danger touch-target" style={{ flex: 1 }}>
                            <Trash2 size={18} /> Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              }
            </div>

            {/* VISTA DESKTOP: Tabla */}
            <div className="product-table-desktop bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              {loading ? <div className="loading-state">Cargando productos...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-100 border-b-2 border-gray-200">
                      <tr>
                        {['Nombre', 'Categoría', 'Talle', 'Color', 'Precio', 'Stock', 'Acciones'].map(h => (
                          <th key={h} className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProductos.map((p) => (
                        <tr key={p.id} className="hover:bg-blue-50 transition">
                          <td className="px-6 py-4 font-bold text-gray-900 text-lg">{p.nombre}</td>
                          <td className="px-6 py-4 text-gray-700 text-lg">{p.categoria || '-'}</td>
                          <td className="px-6 py-4 text-gray-700 text-lg">{p.talle || '-'}</td>
                          <td className="px-6 py-4 text-gray-700 text-lg">{p.color || '-'}</td>
                          <td className="px-6 py-4 text-gray-900 font-bold text-lg">${Number(p.precio).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className={`stock-badge ${p.stock <= 5 ? 'stock-low' : 'stock-ok'}`}>{p.stock}</span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-3">
                            <button onClick={() => { setShowForm(true); setEditId(p.id); }} className="btn btn-secondary touch-target">
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="btn btn-danger touch-target">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredProductos.length === 0 && (
                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500 text-xl">No se encontraron productos.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="text-center mt-8">
              <button onClick={() => { setShowInactive(!showInactive); if (!showInactive) fetchProductosInactivos(); }} className="btn btn-secondary">
                {showInactive ? 'Ocultar productos desactivados' : 'Ver productos desactivados'}
              </button>
            </div>

            {showInactive && (
              <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-300 overflow-hidden mt-6">
                <div className="p-4 bg-gray-200 border-b border-gray-300">
                  <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Productos Desactivados</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-600 uppercase">Nombre</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-600 uppercase">Categoría</th>
                        <th className="px-6 py-3 text-right text-sm font-bold text-gray-600 uppercase">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {productosInactivos.map((p) => (
                        <tr key={p.id} className="bg-gray-50">
                          <td className="px-6 py-3 text-gray-500 text-base">{p.nombre}</td>
                          <td className="px-6 py-3 text-gray-500 text-base">{p.categoria || '-'}</td>
                          <td className="px-6 py-3 text-right">
                            <button onClick={() => handleReactivar(p.id)} className="btn btn-success touch-target" style={{ minWidth: 'auto', padding: '0 12px' }}>
                              <RotateCcw className="w-4 h-4" /> Reactivar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : currentView === 'sales' ? (
          <SalesForm onSaleRecorded={fetchProductos} productos={productos} />
        ) : (
          <SalesHistory />
        )}
      </main>

      {/* Bottom Navigation Mobile */}
      <nav className="bottom-nav">
        <button onClick={() => setCurrentView('dashboard')} className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}>
          <Package className="w-6 h-6" /> <span>Inventario</span>
        </button>
        <button onClick={() => setCurrentView('sales')} className={`nav-item ${currentView === 'sales' ? 'active' : ''}`}>
          <ShoppingCart className="w-6 h-6" /> <span>Ventas</span>
        </button>
        <button onClick={() => setCurrentView('history')} className={`nav-item ${currentView === 'history' ? 'active' : ''}`}>
          <BarChart3 className="w-6 h-6" /> <span>Historial</span>
        </button>
      </nav>

      {showForm && <ProductForm onClose={() => setShowForm(false)} editId={editId} onSave={fetchProductos} />}
    </div>
  )
}

export default Dashboard