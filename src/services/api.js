import axios from 'axios'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://izxtbndkcjxubvnisygh.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6eHRibmRrY2p4dWJ2bmlzeWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTA3NDksImV4cCI6MjEwMDIyNjc0OX0.d-lkbzrINaZMFTRd4Yf34VHiNKcJgNUex9amF0gHknc'

// 👇 Stock Lolo es el Local 1
const LOCAL_ID = import.meta.env.VITE_LOCAL_ID || 1

const api = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
})

// ==========================================
// PRODUCTOS
// ==========================================
export const getProductos = () => api.get(`/productos?local_id=eq.${LOCAL_ID}&order=created_at.desc`)
export const getProductoById = (id) => api.get(`/productos?id=eq.${id}&local_id=eq.${LOCAL_ID}`)
export const createProducto = (data) => api.post('/productos', { ...data, local_id: LOCAL_ID })
export const updateProducto = (id, data) => api.patch(`/productos?id=eq.${id}&local_id=eq.${LOCAL_ID}`, data)
export const deleteProducto = (id) => api.delete(`/productos?id=eq.${id}&local_id=eq.${LOCAL_ID}`)
export const getProductosActivos = () => api.get(`/productos?local_id=eq.${LOCAL_ID}&activo=eq.true&order=created_at.desc`)
export const getProductosInactivos = () => api.get(`/productos?local_id=eq.${LOCAL_ID}&activo=eq.false&order=created_at.desc`)
export const deactivateProducto = (id) => api.patch(`/productos?id=eq.${id}&local_id=eq.${LOCAL_ID}`, { activo: false })
export const reactivateProducto = (id) => api.patch(`/productos?id=eq.${id}&local_id=eq.${LOCAL_ID}`, { activo: true })

// ==========================================
// VENTAS
// ==========================================
export const createVenta = (data) => api.post('/ventas', { ...data, local_id: LOCAL_ID })
export const createDetalleVenta = (data) => api.post('/detalle_ventas', { ...data, local_id: LOCAL_ID })
export const getVentas = () => api.get(`/ventas?local_id=eq.${LOCAL_ID}&select=id,fecha,total,detalle_ventas(cantidad,precio_unitario,productos(nombre,talle,color))&order=fecha.desc`)
export const deleteDetalleVenta = (ventaId) => api.delete(`/detalle_ventas?venta_id=eq.${ventaId}&local_id=eq.${LOCAL_ID}`)
export const deleteVenta = (id) => api.delete(`/ventas?id=eq.${id}&local_id=eq.${LOCAL_ID}`)

export default api