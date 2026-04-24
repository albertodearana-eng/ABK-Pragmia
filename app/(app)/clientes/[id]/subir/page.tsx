'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileText, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function SubirPolizaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [clienteId, setClienteId] = useState<string>('')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  // Resolve params
  params.then(p => setClienteId(p.id))

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    setFiles(prev => [...prev, ...dropped])
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.type === 'application/pdf')
      setFiles(prev => [...prev, ...selected])
    }
  }

  const removeFile = (i: number) => setFiles(files.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (!files.length || !clienteId) return
    setLoading(true)
    setError('')

    try {
      for (const file of files) {
        setProgress(`Procesando ${file.name}...`)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('cliente_id', clienteId)

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Error al procesar el PDF')

        // Redirigir al formulario de validación
        router.push(`/clientes/${clienteId}/validar/${data.version_id}`)
        return // procesar uno a la vez por ahora
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/clientes/${clienteId}`} className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Subir póliza o suplemento</h1>
          <p className="text-sm text-gray-500">Claude extraerá automáticamente los datos del PDF</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragging ? 'border-abk-red bg-abk-red-light' : 'border-gray-300 hover:border-abk-red hover:bg-gray-50'
        }`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={onFileInput}
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 ${dragging ? 'text-abk-red' : 'text-gray-300'}`} />
        <p className="font-medium text-gray-700">
          {dragging ? 'Suelta el PDF aquí' : 'Arrastra el PDF aquí o haz click para seleccionar'}
        </p>
        <p className="text-sm text-gray-400 mt-1">Solo archivos PDF · Pólizas, suplementos, renovaciones</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <FileText className="w-5 h-5 text-abk-red flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-800 mb-1">¿Qué ocurre al subir el PDF?</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Claude detecta automáticamente el ramo (Daños, RC, D&O...)</li>
          <li>Extrae todos los campos relevantes de las condiciones particulares</li>
          <li>Te muestra los datos extraídos para que los revises y corrijas</li>
          <li>Al confirmar, se guarda como nueva versión de la póliza</li>
        </ol>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {progress && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin text-abk-red" />
          {progress}
        </div>
      )}

      <div className="mt-5 flex gap-3 justify-end">
        <Link href={`/clientes/${clienteId}`} className="btn-ghost">Cancelar</Link>
        <button
          onClick={handleSubmit}
          disabled={!files.length || loading}
          className="btn-primary flex items-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
          ) : (
            <><Upload className="w-4 h-4" /> Procesar PDF</>
          )}
        </button>
      </div>
    </div>
  )
}
