interface Props {
  nombre: string
  url: string
  onCerrar: () => void
}

export default function WhatsAppToast({ nombre, url, onCerrar }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-green-200 rounded-2xl shadow-2xl shadow-green-100 p-5 w-80">
        {/* Icono + encabezado */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center text-2xl flex-shrink-0">
            📱
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm">¡Orden lista!</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Avisa a <span className="font-semibold text-gray-700">{nombre}</span> que su auto está listo para recoger
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="text-gray-300 hover:text-gray-500 text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={onCerrar}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500
                       hover:bg-green-600 text-white text-sm font-semibold py-2.5
                       rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.103 1.504 5.818L.057 23.885a.5.5 0 00.659.61l6.249-1.99A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.504-5.173-1.378l-.361-.212-3.743 1.19 1.257-3.631-.229-.373A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Enviar WhatsApp
          </a>
          <button
            onClick={onCerrar}
            className="px-4 py-2.5 border border-gray-200 text-gray-500
                       hover:bg-gray-50 text-sm rounded-xl transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
