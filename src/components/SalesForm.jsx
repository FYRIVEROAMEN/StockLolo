import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { updateProducto, createVenta, createDetalleVenta } from '../services/api'
import Swal from 'sweetalert2'

function SalesForm({ onSaleRecorded, productos }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])
  const [cart, setCart] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Filtrar productos mientras se escribe
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts([])
      return
    }
    const term = searchTerm.toLowerCase()
    const results = productos.filter(p => 
      p.nombre?.toLowerCase().includes(term) ||
      p.categoria?.toLowerCase().includes(term) ||
      p.color?.toLowerCase().includes(term) ||
      p.talle?.toLowerCase().includes(term)
    ).slice(0, 10)
    setFilteredProducts(results)
  }, [searchTerm, productos])

  // Agregar producto al carrito
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id)
    
    if (existingItem) {
      if (existingItem.quantity + 1 > product.stock) {
        Swal.fire({
          title: 'Stock insuficiente',
          text: `No hay suficiente stock de ${product.nombre}. Solo quedan ${product.stock}.`,
          icon: 'warning',
          confirmButtonColor: '#dc2626',
          confirmButtonText: 'Aceptar'
        })
        return
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
    setSearchTerm('')
    setFilteredProducts([])
  }

  // Cambiar cantidad en el carrito
  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return
    const product = productos.find(p => p.id === id)
    if (newQuantity > product.stock) {
      Swal.fire({
        title: 'Stock insuficiente',
        text: `No hay suficiente stock. Máximo disponible: ${product.stock}`,
        icon: 'warning',
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Aceptar'
      })
      return
    }
    setCart(cart.map(item => item.id === id ? { ...item, quantity: newQuantity } : item))
  }

  // Eliminar del carrito
  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
  }

  // Calcular total
  const total = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0)

  // Procesar la venta
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Swal.fire({
        title: 'Carrito vacío',
        text: 'Agregá al menos un producto al carrito.',
        icon: 'warning',
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Aceptar'
      })
      return
    }

    setIsProcessing(true)

    try {
      // 1. Crear el registro principal de la venta
      const { data: ventaData, error: ventaError } = await createVenta({ total })
      if (ventaError) throw new Error(ventaError.message)
      
      const ventaId = ventaData[0].id

      // 2. Procesar cada producto del carrito
      for (const item of cart) {
        await createDetalleVenta({
          venta_id: ventaId,
          producto_id: item.id,
          cantidad: item.quantity,
          precio_unitario: item.precio
        })

        const newStock = item.stock - item.quantity
        await updateProducto(item.id, { stock: newStock })
      }

      // 3. Éxito - SweetAlert personalizado
      await Swal.fire({
        title: '¡Venta Registrada!',
        html: `
          <div style="text-align: left; font-size: 1.1rem;">
            <p style="margin: 10px 0;"><strong>Total:</strong> <span style="color: #16a34a; font-size: 1.5rem;">$${total.toFixed(2)}</span></p>
            <p style="margin: 10px 0;"><strong>Productos:</strong> ${cart.length}</p>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#16a34a',
        confirmButtonText: 'Aceptar',
        timer: 4000,
        timerProgressBar: true,
        showConfirmButton: true,
        willClose: () => {
          setCart([])
          onSaleRecorded()
        }
      })

    } catch (err) {
      console.error(err)
      Swal.fire({
        title: 'Error',
        text: 'Error al procesar la venta. Intentá de nuevo.',
        icon: 'error',
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Aceptar'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-200 max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
        <ShoppingCart className="w-8 h-8 text-green-600" /> Registrar Nueva Venta
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COLUMNA IZQUIERDA: Buscador y Resultados */}
        <div>
          <h3 className="text-xl font-bold text-gray-700 mb-3">1. Buscar Producto</h3>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-4 w-6 h-6 text-gray-400" />
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
                    <p className="text-gray-600 text-base">
                      {product.categoria} | Talle: {product.talle || 'N/A'} | Color: {product.color || 'N/A'}
                    </p>
                    <p className="text-green-700 font-bold text-base">
                      Stock: {product.stock} | Precio: ${Number(product.precio).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className={`p-3 rounded-lg font-bold text-lg flex items-center gap-2 transition ${
                      product.stock <= 0 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Plus className="w-5 h-5" /> Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Carrito y Total */}
        <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200 flex flex-col">
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
                  <div key={item.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{item.nombre}</p>
                      <p className="text-gray-600 text-sm">${Number(item.precio).toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-xl flex items-center justify-center"
                      >-</button>
                      <span className="text-xl font-bold w-8 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-xl flex items-center justify-center"
                      >+</button>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-gray-300 pt-4 mt-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-gray-700">Total a Pagar:</span>
                  <span className="text-3xl font-bold text-green-700">${total.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full bg-green-600 text-white p-5 rounded-xl text-xl font-bold hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Procesando...' : '✅ Confirmar Venta y Descontar Stock'}
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