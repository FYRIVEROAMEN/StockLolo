import { useState, useEffect } from 'react'
import { getProductoById, createProducto, updateProducto } from '../services/api'
import Swal from 'sweetalert2'

function ProductForm({ onClose, editId, onSave }) {
  const [form, setForm] = useState({ nombre: '', categoria: '', talle: '', color: '', precio: '', stock: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editId) {
      getProductoById(editId).then(({ data }) => {
        if (data && data[0]) {
          const p = data[0]
          setForm({
            nombre: p.nombre || '', categoria: p.categoria || '', talle: p.talle || '',
            color: p.color || '', precio: String(p.precio || ''), stock: String(p.stock || '')
          })
        }
      })
    }
  }, [editId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      nombre: form.nombre, categoria: form.categoria, talle: form.talle, color: form.color,
      precio: parseFloat(form.precio) || 0, stock: parseInt(form.stock) || 0
    }

    try {
      if (editId) await updateProducto(editId, payload)
      else await createProducto(payload)
      
      Swal.fire({
        title: editId ? '¡Actualizado!' : '¡Agregado!',
        text: `El producto fue ${editId ? 'actualizado' : 'agregado'} correctamente.`,
        icon: 'success', confirmButtonColor: '#2563eb', confirmButtonText: 'Aceptar',
        timer: 2000, timerProgressBar: true,
        willClose: () => { onSave(); onClose(); }
      })
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'Error: ' + (err.response?.data?.message || err.message), icon: 'error', confirmButtonColor: '#dc2626' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{editId ? 'Editar' : 'Agregar'} Producto</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">Nombre *</label>
            <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="input-lg" placeholder="Ej: Remera básica" />
          </div>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">Categoría</label>
            <input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="input-lg" placeholder="Ej: Remeras, Pantalones" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Talle</label>
              <input value={form.talle} onChange={e => setForm({...form, talle: e.target.value})} className="input-lg" placeholder="S, M, L" />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Color</label>
              <input value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="input-lg" placeholder="Negro, Blanco" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Precio *</label>
              <input required type="number" step="0.01" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} className="input-lg" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-700 mb-2">Stock *</label>
              <input required type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="input-lg" placeholder="0" />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductForm