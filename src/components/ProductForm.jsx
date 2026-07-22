import { useState, useEffect } from 'react'
import { getProductoById, createProducto, updateProducto } from '../services/api'
import Swal from 'sweetalert2'

function ProductForm({ onClose, editId, onSave }) {
  const [form, setForm] = useState({
    nombre: '',
    categoria: '',
    talle: '',
    color: '',
    precio: '',
    stock: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editId) {
      getProductoById(editId).then(({ data }) => {
        if (data && data[0]) {
          const p = data[0]
          setForm({
            nombre: p.nombre || '',
            categoria: p.categoria || '',
            talle: p.talle || '',
            color: p.color || '',
            precio: String(p.precio || ''),
            stock: String(p.stock || '')
          })
        }
      })
    }
  }, [editId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      nombre: form.nombre,
      categoria: form.categoria,
      talle: form.talle,
      color: form.color,
      precio: parseFloat(form.precio) || 0,
      stock: parseInt(form.stock) || 0
    }

    try {
      if (editId) {
        await updateProducto(editId, payload)
        Swal.fire({
          title: '¡Actualizado!',
          text: 'El producto fue actualizado correctamente.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'Aceptar',
          timer: 2000,
          timerProgressBar: true,
          willClose: () => {
            onSave()
            onClose()
          }
        })
      } else {
        await createProducto(payload)
        Swal.fire({
          title: '¡Agregado!',
          text: 'El producto fue agregado correctamente.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          confirmButtonText: 'Aceptar',
          timer: 2000,
          timerProgressBar: true,
          willClose: () => {
            onSave()
            onClose()
          }
        })
      }
    } catch (err) {
      Swal.fire({
        title: 'Error',
        text: 'Error: ' + (err.response?.data?.message || err.message),
        icon: 'error',
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Aceptar'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {editId ? 'Editar' : 'Agregar'} Producto
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              required
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Remera básica"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <input
              value={form.categoria}
              onChange={e => setForm({...form, categoria: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Remeras, Pantalones"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Talle</label>
              <input
                value={form.talle}
                onChange={e => setForm({...form, talle: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="S, M, L, XL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                value={form.color}
                onChange={e => setForm({...form, color: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Negro, Blanco..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
              <input
                required
                type="number"
                step="0.01"
                value={form.precio}
                onChange={e => setForm({...form, precio: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input
                required
                type="number"
                value={form.stock}
                onChange={e => setForm({...form, stock: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 p-3 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductForm