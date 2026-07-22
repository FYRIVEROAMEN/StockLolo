import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Edit2, Trash2, LogOut, Search, AlertTriangle, ShoppingCart, BarChart3, RotateCcw } from 'lucide-react'
import { 
  getProductosActivos, 
  deactivateProducto, 
  reactivateProducto, 
  getProductosInactivos 
} from '../services/api'
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

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  const handleDelete = async (id) => {
    if (confirm('¿Desactivar este producto?\n\nNo se borrará de la base de datos para no romper el historial de ventas, pero dejará de aparecer en el inventario.')) {
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
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0"> {/* 👈 Padding bottom para mobile */}
      {/* Header (igual para desktop y mobile) */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" /> Stock Mercaderia
          </h1>
          <button onClick={onLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition text-lg font-medium">
            <LogOut className="w-6 h-6" /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/*  Pestañas SUPERIORES (solo desktop) */}
        <div className="hidden md:flex border-b border-gray-300 mb-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`px-6 py-4 font-bold text-xl flex items-center gap-2 transition ${
              currentView === 'dashboard' ? 'border-b-4 border-blue-600 text-blue-700 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Package className="w-6 h-6" /> Inventario
          </button>
          <button
            onClick={() => setCurrentView('sales')}
            className={`px-6 py-4 font-bold text-xl flex items-center gap-2 transition ${
              currentView === 'sales' ? 'border-b-4 border-green-600 text-green-700 bg-green-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ShoppingCart className="w-6 h-6" /> Registrar Venta
          </button>
          <button
            onClick={() => setCurrentView('history')}
            className={`px-6 py-4 font-bold text-xl flex items-center gap-2 transition ${
              currentView === 'history' ? 'border-b-4 border-purple-600 text-purple-700 bg-purple-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-6 h-6" /> Historial
          </button>
        </div>

        {/* Contenido según la pestaña */}
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
                <p className={`text-4xl font-bold mt-2 ${stockBajo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stockBajo}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-4 top-3.5 w-6 h-6 text-gray-400" />
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
                className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-md"
              >
                <Plus className="w-6 h-6" /> Agregar Producto
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              {loading ? (
                <div className="p-8 text-center text-gray-500 text-xl">Cargando productos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase">Nombre</th>
                        <th className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase">Categoría</th>
                        <th className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase">Talle</th>
                        <th className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase">Color</th>
                        <th className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase">Precio</th>
                        <th className="px-6 py-4 text-left text-base font-bold text-gray-700 uppercase">Stock</th>
                        <th className="px-6 py-4 text-right text-base font-bold text-gray-700 uppercase">Acciones</th>
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
                            <span className={`px-4 py-1.5 rounded-full text-base font-bold ${p.stock <= 5 ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'}`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-3">
                            <button onClick={() => { setShowForm(true); setEditId(p.id); }} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                              <Edit2 className="w-6 h-6" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition">
                              <Trash2 className="w-6 h-6" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredProductos.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-gray-500 text-xl">
                            {search ? 'No se encontraron productos.' : 'No hay productos. ¡Agrega el primero!'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setShowInactive(!showInactive)
                  if (!showInactive) fetchProductosInactivos()
                }}
                className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2 mx-auto"
              >
                {showInactive ? 'Ocultar productos desactivados' : 'Ver productos desactivados'}
              </button>
            </div>

            {showInactive && (
              <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-300 overflow-hidden mt-6">
                <div className="p-4 bg-gray-200 border-b border-gray-300">
                  <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" /> Productos Desactivados
                  </h3>
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
                            <button 
                              onClick={() => handleReactivar(p.id)} 
                              className="text-green-700 hover:text-green-900 font-bold flex items-center gap-1 ml-auto bg-green-100 px-3 py-1.5 rounded-lg hover:bg-green-200 transition"
                            >
                              <RotateCcw className="w-4 h-4" /> Reactivar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {productosInactivos.length === 0 && (
                        <tr><td colSpan="3" className="px-6 py-6 text-center text-gray-500">No hay productos desactivados.</td></tr>
                      )}
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

      {/* 👇 BOTTOM NAVIGATION BAR (solo mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              currentView === 'dashboard' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Package className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold">Inventario</span>
          </button>
          <button
            onClick={() => setCurrentView('sales')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              currentView === 'sales' ? 'text-green-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShoppingCart className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold">Ventas</span>
          </button>
          <button
            onClick={() => setCurrentView('history')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition ${
              currentView === 'history' ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BarChart3 className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold">Historial</span>
          </button>
        </div>
      </nav>

      {showForm && <ProductForm onClose={() => setShowForm(false)} editId={editId} onSave={fetchProductos} />}
    </div>
  )
}

export default Dashboard