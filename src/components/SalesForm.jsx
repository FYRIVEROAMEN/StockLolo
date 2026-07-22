import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, ShoppingCart, Minus } from 'lucide-react'
import { updateProducto, createVenta, createDetalleVenta } from '../services/api'
import Swal from 'sweetalert2'

function SalesForm({ onSaleRecorded, productos }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])
  const [cart, setCart] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (searchTerm.trim() === '') { setFilteredProducts([]); return }
    const term = searchTerm.toLowerCase()
    const results = productos.filter(p => 
      p.nombre?.toLowerCase().includes(term) || p.categoria?.toLowerCase().includes(term) ||
      p.color?.toLowerCase().includes(term) || p.talle?.toLowerCase().includes(term)
    ).slice(0, 10)
    setFilteredProducts(results)
  }, [searchTerm, productos])

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      if (existingItem.quantity + 1 > product.stock) {
        Swal.fire({ title: 'Stock insuficiente', text: `Solo quedan ${product.stock}.`, icon: 'warning', confirmButtonColor: '#dc2626' })
        return
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
    setSearchTerm('')
    setFilteredProducts([])
  }

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return
    const product = productos.find(p => p.id === id)
    if (newQuantity > product.stock) {
      Swal.fire({ title: 'Stock insuficiente', text: `Máximo disponible: ${product.stock}`, icon: 'warning', confirmButtonColor: '#dc2626' })
      return
    }
    setCart(cart.map(item => item.id === id ? { ...item, quantity: newQuantity } : item))
  }

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id))
  const total = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0)

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Swal.fire({ title: 'Carrito vacío', text: 'Agregá al menos un producto.', icon: 'warning', confirmButtonColor: '#dc2626' })
      return
    }
    setIsProcessing(true)
    try {
      const { data: ventaData, error: ventaError } = await createVenta({ total })
      if (ventaError) throw new Error(ventaError.message)
      const ventaId = ventaData[0].id

      for (const item of cart) {
        await createDetalleVenta({ venta_id: ventaId, producto_id: item.id, cantidad: item.quantity, precio_unitario: item.precio })
        await updateProducto(item.id, { stock: item.stock - item.quantity })
      }

      await Swal.fire({
        title: '¡Venta Registrada!',
        html: `<div style="text-align: left; font-size: 1.1rem;">
          <p style="margin: 10px 0;"><strong>Total:</strong> <span style="color: #16a34a; font-size: 1.5rem;">$${total.toFixed(2)}</span></p>
          <p style="margin: 10px 0;"><strong>Productos:</strong> ${cart.length}</p>
        </div>`,
        icon: 'success', confirmButtonColor: '#16a34a', confirmButtonText: 'Aceptar',
        timer: 3000, timerProgressBar: true,
        willClose: () => { setCart([]); onSaleRecorded(); }
      })
    } catch (err) {
      console.error(err)
      Swal.fire({ title: 'Error', text: 'Error al procesar la venta.', icon: 'error', confirmButtonColor: '#dc2626' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white p-4 sm:p-8 rounded-xl shadow-sm border border-gray-200 max-w-5xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
        <ShoppingCart className="w-8 h-8 text-green-600" /> Registrar Nueva Venta
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COLUMNA IZQUIERDA */}
        <div>
          <h3 className="text-xl font-bold text-gray-700 mb-3">1. Buscar Producto</h3>
          <div className="relative mb-4">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
  <input
    type="text"
    placeholder="Escribí nombre, color, talle o categoría..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
  />
</div>

          {filteredProducts.length > 0 && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl max-h-96 overflow-y-auto">
              {filteredProducts.map(product => (
                <div key={product.id} className="flex justify-between items-center p-4 border-b border-gray-200 hover:bg-white transition">
                  <div>
                    <p className="font-bold text-lg text-gray-800">{product.nombre}</p>
                    <p className="text-gray-600 text-base">{product.categoria} | Talle: {product.talle || 'N/A'} | Stock: <span className="font-bold text-green-700">{product.stock}</span></p>
                  </div>
                  <button
                    onClick={() => addToCart(product)} disabled={product.stock <= 0}
                    className={`btn touch-target ${product.stock <= 0 ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    <Plus className="w-5 h-5" /> Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: CARRITO */}
        <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border-2 border-gray-200 flex flex-col">
          <h3 className="text-xl font-bold text-gray-700 mb-3">2. Carrito de Venta</h3>
          
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-8">
              <ShoppingCart className="w-16 h-16 mb-2 opacity-50" />
              <p className="text-lg">El carrito está vacío</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto max-h-80 space-y-3 mb-4">
                {cart.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-lg">{item.nombre}</p>
                      <p className="text-gray-600">${Number(item.precio).toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="btn btn-secondary touch-target">
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="text-xl font-bold w-10 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="btn btn-secondary touch-target">
                        <Plus className="w-5 h-5" />
                      </button>
                      <button onClick={() => removeFromCart(item.id)} className="btn btn-danger touch-target" style={{ marginLeft: '8px' }}>
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-gray-300 pt-4 mt-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold text-gray-700">Total a Pagar:</span>
                  <span className="text-3xl font-bold text-green-700">${total.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout} disabled={isProcessing}
                  className="btn btn-success w-full" style={{ minHeight: '64px', fontSize: '20px' }}
                >
                  {isProcessing ? 'Procesando...' : '✅ Confirmar Venta'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SalesForm