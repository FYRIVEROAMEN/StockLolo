import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, Trash2, ShoppingCart, Minus, X, Barcode, User, Phone, DollarSign, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { 
  updateProducto, 
  createVenta, 
  createDetalleVenta, 
  crearOActualizarCliente, 
  registrarPago, 
  actualizarEstadoPagoVenta,
  updateVentaCliente
} from '../services/api'
import Swal from 'sweetalert2'
import { BrowserMultiFormatReader } from '@zxing/library'

const formatWhatsAppNumber = (phone) => {
  if (!phone) return ''
  let clean = phone.replace(/\D/g, '')
  if (clean.startsWith('549')) return clean
  if (clean.startsWith('0')) clean = clean.slice(1)
  if (clean.startsWith('9')) clean = clean.slice(1)
  if (clean.startsWith('15')) clean = '11' + clean
  clean = clean.replace(/^(11|2\d{2}|3\d{2})15/, '$1')
  return `549${clean}`
}

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

const Tooltip = ({ text, show, onClose }) => {
  if (!show) return null
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-800 text-white text-[10px] px-2 py-1.5 rounded-lg shadow-lg z-50 max-w-[180px] text-center leading-tight">
      {text}
      <button onClick={onClose} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center text-gray-800 text-[10px] font-bold">×</button>
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800" />
    </div>
  )
}

function SalesForm({ onSaleRecorded, productos, cart, setCart }) {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [filteredProducts, setFilteredProducts] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  
  const [clienteTelefono, setClienteTelefono] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [montoPagado, setMontoPagado] = useState('')
  
  const [aplicarDescuento, setAplicarDescuento] = useState(false)
  const [tipoDescuento, setTipoDescuento] = useState('porcentaje')
  const [valorDescuento, setValorDescuento] = useState(0)
  const [motivoDescuento, setMotivoDescuento] = useState('Promoción')
  
  const [showClientData, setShowClientData] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  
  const [firstUse, setFirstUse] = useState(() => JSON.parse(localStorage.getItem('stockflow_first_use') || 'true'))
  const [showScanTooltip, setShowScanTooltip] = useState(false)
  const [showDiscountTooltip, setShowDiscountTooltip] = useState(false)
  
  const codeReaderRef = useRef(null)
  const isCancelledRef = useRef(false)
  const montoInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('stockflow_first_use', JSON.stringify(firstUse))
    if (firstUse) {
      setTimeout(() => setShowScanTooltip(true), 2000)
      setTimeout(() => setShowDiscountTooltip(true), 5000)
    }
  }, [firstUse])

  useEffect(() => {
    if (debouncedSearchTerm.trim() === '') { setFilteredProducts([]); return }
    const term = debouncedSearchTerm.toLowerCase()
    const results = productos.filter(p => 
      p.nombre?.toLowerCase().includes(term) || p.categoria?.toLowerCase().includes(term) ||
      p.color?.toLowerCase().includes(term) || p.talle?.toLowerCase().includes(term)
    ).slice(0, 10)
    setFilteredProducts(results)
  }, [debouncedSearchTerm, productos])

  const triggerHaptic = useCallback((pattern = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  }, [])

  const addToCart = useCallback((product) => {
    triggerHaptic(20)
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      if (existingItem.quantity + 1 > product.stock) {
        Swal.fire({ title: 'Stock insuficiente', text: `Solo quedan ${product.stock}.`, icon: 'warning', confirmButtonColor: '#dc2626' })
        return
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
      if (cart.length === 0) setMontoPagado(product.precio.toString())
    }
    setSearchTerm('')
    setFilteredProducts([])
  }, [cart, triggerHaptic])

  const updateQuantity = useCallback((id, newQuantity) => {
    if (newQuantity < 1) return
    triggerHaptic(10)
    const product = productos.find(p => p.id === id)
    if (newQuantity > product.stock) {
      Swal.fire({ title: 'Stock insuficiente', text: `Máximo: ${product.stock}`, icon: 'warning', confirmButtonColor: '#dc2626' })
      return
    }
    setCart(cart.map(item => item.id === id ? { ...item, quantity: newQuantity } : item))
  }, [cart, productos, triggerHaptic])

  const removeFromCart = useCallback((id) => {
    triggerHaptic([10, 50, 10])
    const newCart = cart.filter(item => item.id !== id)
    setCart(newCart)
    if (newCart.length === 0) setMontoPagado('')
  }, [cart, triggerHaptic])

  const totalBruto = cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0)
  const descuentoMonto = aplicarDescuento ? (tipoDescuento === 'porcentaje' ? totalBruto * (valorDescuento / 100) : valorDescuento) : 0
  const totalNeto = totalBruto - descuentoMonto
  const montoPagadoNum = Number(montoPagado) || 0
  const resta = totalNeto - montoPagadoNum

  const pagoStatus = montoPagadoNum === 0 ? 'empty' 
    : montoPagadoNum > totalNeto ? 'excess'
    : montoPagadoNum === totalNeto ? 'exact'
    : 'partial'

  const handleCheckout = async () => {
    if (cart.length === 0) return Swal.fire({ title: 'Carrito vacío', icon: 'warning', confirmButtonColor: '#dc2626' })
    if (!clienteTelefono.trim()) return Swal.fire({ title: 'Teléfono requerido', text: 'Necesario para registrar la venta y el sorteo.', icon: 'warning', confirmButtonColor: '#dc2626' })
    if (montoPagadoNum < 0 || montoPagadoNum > totalNeto) return Swal.fire({ title: 'Monto inválido', text: `Debe ser entre $0 y $${totalNeto.toFixed(2)}.`, icon: 'warning', confirmButtonColor: '#dc2626' })

    setIsProcessing(true)
    triggerHaptic(50)
    
    try {
      const LOCAL_ID = import.meta.env.VITE_LOCAL_ID || 1
      const { data: ventaData, error: ventaError } = await createVenta({ 
        total_bruto: totalBruto, descuento_monto: descuentoMonto, 
        descuento_motivo: aplicarDescuento ? motivoDescuento : 'Sin descuento', 
        total_neto: totalNeto, local_id: LOCAL_ID 
      })
      if (ventaError) throw new Error(ventaError.message)
      const ventaId = ventaData[0].id

      for (const item of cart) {
        await createDetalleVenta({ venta_id: ventaId, producto_id: item.id, cantidad: item.quantity, precio_unitario: item.precio, local_id: LOCAL_ID })
        await updateProducto(item.id, { stock: item.stock - item.quantity })
      }

      const clienteId = await crearOActualizarCliente(clienteTelefono.trim(), clienteNombre.trim() || null, LOCAL_ID, totalNeto)
      await updateVentaCliente(ventaId, clienteId)
      if (montoPagadoNum > 0) await registrarPago(ventaId, clienteId, montoPagadoNum, LOCAL_ID)

      let estadoPago = 'pagado'
      if (montoPagadoNum === 0) estadoPago = 'pendiente'
      else if (montoPagadoNum < totalNeto) estadoPago = 'parcial'
      await actualizarEstadoPagoVenta(ventaId, estadoPago)

      const fecha = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      let mensajeWhatsApp = `*COMPROBANTE DE VENTA*\n━━━━━━━━━━━━━━━━━━━━\n📅 ${fecha}\n Venta #${ventaId}\n━━━━━━━━━━━━━━━━━━━━\n\n*PRODUCTOS:*\n`
      cart.forEach(item => { mensajeWhatsApp += `${item.quantity}x ${item.nombre}\n   $${(item.precio * item.quantity).toFixed(2)}\n` })
      mensajeWhatsApp += `\n━━━━━━━━━━━━━━━━━━━━\n*Subtotal: $${totalBruto.toFixed(2)}*\n`
      if (aplicarDescuento && descuentoMonto > 0) mensajeWhatsApp += `*Descuento (${motivoDescuento}): -$${descuentoMonto.toFixed(2)}*\n`
      mensajeWhatsApp += `*TOTAL: $${totalNeto.toFixed(2)}*\n`
      if (montoPagadoNum < totalNeto) mensajeWhatsApp += `*Pagado: $${montoPagadoNum.toFixed(2)}*\n*Resta: $${resta.toFixed(2)}*\n`
      mensajeWhatsApp += `━━━━━━━━━━━━━━━━━━━━\n\n *¡SORTEO DE FIN DE MES!* \nAl agendarnos, participás AUTOMÁTICAMENTE.\n📅 Sorteo: Último día del mes\n\n✅ Seguinos en Instagram @Moon.importados\n¡Gracias por tu compra! `

      const result = await Swal.fire({
        title: '¡Venta Registrada! ✅',
        html: `<div style="text-align: left;"><p><strong>Total:</strong> <span style="color: #16a34a; font-size: 1.5rem; font-weight: bold;">$${totalNeto.toFixed(2)}</span></p>${resta > 0 ? `<p><strong>Resta:</strong> <span style="color: #dc2626; font-weight: bold;">$${resta.toFixed(2)}</span></p>` : ''}<hr style="margin: 15px 0;" /><label style="display: block; margin-bottom: 8px; font-weight: 600;">Enviar comprobante:</label><input id="swal-whatsapp-input" type="tel" placeholder="Ej: 11 1234 5678" style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 16px;" value="${clienteTelefono}" /></div>`,
        icon: 'success', showCancelButton: true, confirmButtonColor: '#25D366', cancelButtonColor: '#6b7280',
        confirmButtonText: 'Enviar por WhatsApp', cancelButtonText: 'Solo cerrar',
        preConfirm: () => document.getElementById('swal-whatsapp-input').value
      })

      if (result.isConfirmed && result.value) window.open(`https://wa.me/${formatWhatsAppNumber(result.value)}?text=${encodeURIComponent(mensajeWhatsApp)}`, '_blank')
      
      triggerHaptic([50, 100, 50])
      setCart([]); setClienteTelefono(''); setClienteNombre(''); setMontoPagado('')
      setAplicarDescuento(false); setValorDescuento(0); setMotivoDescuento('Promoción')
      onSaleRecorded()
    } catch (err) {
      Swal.fire({ title: 'Error', text: err.message, icon: 'error', confirmButtonColor: '#dc2626' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleScan = async () => {
    setIsScanning(true)
    isCancelledRef.current = false
    triggerHaptic(30)
    try {
      const codeReader = new BrowserMultiFormatReader()
      codeReaderRef.current = codeReader
      const scannedCode = await new Promise((resolve, reject) => {
        let timeoutId = setTimeout(() => { if (!isCancelledRef.current) reject(new Error('Tiempo agotado')) }, 30000)
        codeReader.decodeFromVideoDevice(undefined, 'video', (result, err) => {
          if (isCancelledRef.current) { clearTimeout(timeoutId); reject(new Error('Cancelado')); return }
          if (result) { clearTimeout(timeoutId); resolve(result.getText()) }
        })
      })
      if (scannedCode) {
        const product = productos.find(p => p.barcode === scannedCode || p.codigo_barras === scannedCode)
        if (product) { addToCart(product); Swal.fire({ title: '¡Agregado!', text: product.nombre, icon: 'success', timer: 1500, showConfirmButton: false }) }
        else Swal.fire({ title: 'No encontrado', text: `Código: ${scannedCode}`, icon: 'warning', confirmButtonColor: '#dc2626' })
      }
    } catch (err) {
      if (!isCancelledRef.current) Swal.fire({ title: 'Error al escanear', text: err.message || 'Intentá de nuevo', icon: 'error', confirmButtonColor: '#dc2626' })
    } finally {
      setIsScanning(false)
      if (codeReaderRef.current) { codeReaderRef.current.reset(); codeReaderRef.current = null }
    }
  }

  const handleCloseScan = () => {
    isCancelledRef.current = true
    setIsScanning(false)
    if (codeReaderRef.current) { codeReaderRef.current.reset(); codeReaderRef.current = null }
  }

  const getInputColorClasses = () => {
    switch(pagoStatus) {
      case 'excess': return 'border-red-500 bg-red-50 focus:ring-red-500'
      case 'exact': return 'border-green-500 bg-green-50 focus:ring-green-500'
      case 'partial': return 'border-yellow-500 bg-yellow-50 focus:ring-yellow-500'
      default: return 'border-gray-300 bg-white focus:ring-green-500'
    }
  }

  const getMontoHelpText = () => {
    switch(pagoStatus) {
      case 'excess': return '⚠️ Monto excede el total'
      case 'exact': return '✅ Pago exacto'
      case 'partial': return ` Falta: $${resta.toFixed(2)}`
      default: return 'Ingresá el monto recibido'
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-40 lg:pb-8">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-green-600" /> Nueva Venta
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white" aria-label="Buscar producto" />
              </div>
              <div className="relative">
                <Tooltip text="Tocá para escanear códigos de barra" show={showScanTooltip && firstUse} onClose={() => setShowScanTooltip(false)} />
                <button onClick={handleScan} className="bg-green-600 hover:bg-green-700 text-white rounded-xl w-14 h-14 flex items-center justify-center transition shadow-md active:scale-95 min-h-[56px] min-w-[56px]" title="Escanear código de barras" aria-label="Escanear código de barras">
                  <Barcode className="w-6 h-6" />
                </button>
              </div>
            </div>

            {filteredProducts.length > 0 && (
              <div className="bg-white border-2 border-gray-200 rounded-xl max-h-[40vh] lg:max-h-none overflow-y-auto shadow-sm">
                {filteredProducts.map(product => (
                  <div key={product.id} onClick={() => product.stock > 0 && addToCart(product)}
                    className={`flex justify-between items-center p-3 border-b border-gray-100 transition cursor-pointer active:bg-gray-50 ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'}`}
                    role="button" aria-label={`Agregar ${product.nombre} al carrito`}>
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-bold text-gray-800 text-sm truncate" title={product.nombre}>{product.nombre}</p>
                      <p className="text-xs text-gray-500">{product.categoria} | T: {product.talle || 'N/A'} | C: {product.color || 'N/A'}</p>
                      <p className="text-green-700 font-bold text-xs mt-1">Stock: {product.stock} | ${Number(product.precio).toFixed(2)}</p>
                    </div>
                    {product.stock > 0 && <div className="bg-green-100 text-green-700 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0"><Plus className="w-5 h-5" /></div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {cart.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-300 text-center">
                <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-30 text-gray-400" />
                <p className="text-lg font-semibold text-gray-500">Carrito vacío</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">Buscá productos o escaneá un código</p>
                <button onClick={() => document.querySelector('input[type="text"]')?.focus()} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition active:scale-95">Buscar producto</button>
              </div>
            ) : (
              <>
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Carrito ({cart.length})
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {cart.map(item => (
  <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
    {/* Fila 1: Nombre y precio */}
    <div className="mb-2">
      <p className="font-bold text-gray-800 text-sm leading-tight" title={item.nombre}>
        {item.nombre}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">
        ${Number(item.precio).toFixed(2)} c/u
      </p>
    </div>
    
    {/* Fila 2: Controles */}
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600 font-medium">Cantidad:</span>
      <div className="flex items-center gap-1">
        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} 
          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-full text-gray-600 active:bg-gray-100 active:scale-95 transition-all"
          aria-label={`Restar uno a ${item.nombre}`}>
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} 
          className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-full text-gray-600 active:bg-gray-100 active:scale-95 transition-all"
          aria-label={`Sumar uno a ${item.nombre}`}>
          <Plus className="w-3 h-3" />
        </button>
        <button onClick={() => removeFromCart(item.id)} 
          className="w-8 h-8 flex items-center justify-center bg-red-50 border border-red-200 rounded-full text-red-600 active:bg-red-100 active:scale-95 transition-all ml-1"
          aria-label={`Eliminar ${item.nombre}`}>
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
))}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                  <button onClick={() => setShowClientData(!showClientData)} className="w-full flex justify-between items-center mb-2 p-2 hover:bg-gray-50 rounded-lg transition" aria-expanded={showClientData} aria-label="Datos del cliente">
                    <h4 className="text-lg font-bold text-gray-700 flex items-center gap-2"><User className="w-5 h-5" /> Cliente</h4>
                    {showClientData ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {showClientData && (
                    <div className="space-y-3 mt-3">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="tel" placeholder="Teléfono (Ej: 11 1234 5678)" value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500" aria-label="Teléfono del cliente" />
                      </div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Nombre (Opcional)" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500" aria-label="Nombre del cliente" />
                      </div>
                    </div>
                  )}
                  {!showClientData && !clienteTelefono && <p className="text-xs text-gray-500 mt-1 ml-2">Tocá para agregar datos del cliente</p>}
                </div>

                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                  <div className="relative">
                    <Tooltip text="Aplicá descuentos por promoción o cliente VIP" show={showDiscountTooltip && firstUse} onClose={() => setShowDiscountTooltip(false)} />
                    <button onClick={() => setShowDiscount(!showDiscount)} className="w-full flex justify-between items-center mb-2 p-2 hover:bg-gray-50 rounded-lg transition" aria-expanded={showDiscount} aria-label="Descuentos">
                      <h4 className="text-lg font-bold text-gray-700 flex items-center gap-2"><Tag className="w-5 h-5" /> Descuentos</h4>
                      {showDiscount ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                  {showDiscount && (
                    <div className="space-y-3 mt-3">
                      <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                        <input type="checkbox" checked={aplicarDescuento} onChange={(e) => setAplicarDescuento(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500" aria-label="Aplicar descuento" />
                        <span className="text-sm font-medium text-gray-700">Aplicar descuento</span>
                      </label>
                      {aplicarDescuento && (
                        <>
                          <div className="flex gap-2">
                            <button onClick={() => setTipoDescuento('porcentaje')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition active:scale-95 ${tipoDescuento === 'porcentaje' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>%</button>
                            <button onClick={() => setTipoDescuento('monto')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition active:scale-95 ${tipoDescuento === 'monto' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>$ Fijo</button>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{tipoDescuento === 'porcentaje' ? '%' : '$'}</span>
                            <input type="number" placeholder="0" value={valorDescuento} onChange={(e) => setValorDescuento(Number(e.target.value))} className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500" min="0" aria-label="Valor del descuento" />
                          </div>
                          <select value={motivoDescuento} onChange={(e) => setMotivoDescuento(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500" aria-label="Motivo del descuento">
                            <option value="Promoción">Promoción</option>
                            <option value="Cliente VIP">Cliente VIP</option>
                            <option value="Pequeño defecto">Pequeño defecto</option>
                            <option value="Cierre de caja">Cierre de caja</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl shadow-sm lg:hidden">
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-600">Total a Pagar</p>
                      <p className="text-xl font-bold text-gray-700">${totalNeto.toFixed(2)}</p>
                    </div>
                    <div className="relative mb-2">
                      <label className="text-xs text-gray-600 block mb-1">Monto pagado</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                        <input ref={montoInputRef} type="number" placeholder="0.00" value={montoPagado} onChange={(e) => setMontoPagado(e.target.value)}
                          className={`w-full pl-8 pr-4 py-4 border-2 rounded-lg text-right text-2xl font-bold focus:outline-none focus:ring-2 transition-all ${getInputColorClasses()}`}
                          min="0" max={totalNeto} step="0.01" aria-label="Monto pagado" />
                      </div>
                      <p className={`text-xs mt-1 font-medium ${pagoStatus === 'excess' ? 'text-red-600' : pagoStatus === 'exact' ? 'text-green-600' : pagoStatus === 'partial' ? 'text-yellow-600' : 'text-gray-500'}`}>
                        {getMontoHelpText()}
                      </p>
                    </div>
                    {resta > 0 && pagoStatus === 'partial' && <p className="text-sm text-red-600 font-semibold">Resta: ${resta.toFixed(2)}</p>}
                  </div>
                  <button onClick={handleCheckout} disabled={isProcessing || pagoStatus === 'excess'}
                    className={`w-full font-bold py-4 rounded-xl text-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[56px] ${isProcessing || pagoStatus === 'excess' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    aria-label="Confirmar">
                    {isProcessing ? 'Procesando...' : <><DollarSign className="w-6 h-6" /> Confirmar</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="hidden lg:block mt-6 bg-white border-2 border-gray-200 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total a Pagar</p>
                <p className="text-3xl font-bold text-green-700">${totalNeto.toFixed(2)}</p>
                {resta > 0 && <p className="text-sm text-red-600 font-semibold mt-1">Resta: ${resta.toFixed(2)}</p>}
              </div>
              <div className="w-64">
                <label className="text-sm text-gray-600 block mb-2">Monto pagado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input type="number" placeholder="0" value={montoPagado} onChange={(e) => setMontoPagado(e.target.value)}
                    className={`w-full pl-8 pr-4 py-3 border-2 rounded-lg text-right text-lg font-bold focus:outline-none focus:ring-2 transition-all ${getInputColorClasses()}`}
                    min="0" max={totalNeto} step="0.01" />
                </div>
                <p className={`text-xs mt-1 ${pagoStatus === 'excess' ? 'text-red-600' : pagoStatus === 'exact' ? 'text-green-600' : 'text-gray-500'}`}>{getMontoHelpText()}</p>
              </div>
              <button onClick={handleCheckout} disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg active:scale-[0.98] transition-all flex items-center gap-2 min-h-[56px]">
                {isProcessing ? 'Procesando...' : <><DollarSign className="w-6 h-6" /> Confirmar</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {isScanning && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md">
            <div className="relative w-full h-80 bg-black rounded-2xl overflow-hidden border-4 border-green-500 shadow-2xl">
              <video id="video" className="w-full h-full object-cover" autoPlay playsInline />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
              </div>
            </div>
            <div className="mt-6 text-center">
              <h3 className="text-xl font-bold text-white mb-2">Escaneá el código</h3>
              <button onClick={handleCloseScan} className="bg-red-600 hover:bg-red-700 text-white w-full py-3 rounded-xl text-lg font-semibold active:scale-95 transition">
                <X className="w-5 h-5 inline mr-2" /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesForm