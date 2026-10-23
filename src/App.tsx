import { useState, useEffect, useCallback } from 'react';

// ============ TYPES ============
interface Client {
  id: string;
  nombre: string;
  cedula: string;
  telefonoPrefijo: string; // 97, 98, 99
  telefonoFinal: string; // 4 dígitos finales
  temperatura: 'Caliente' | 'Tibio';
  montoReserva: number;
  montoDescuento: number;
  isInitial?: boolean;
}

// ============ HELPERS ============
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function getCurrentMonth(): string {
  const now = new Date();
  return `${MESES[now.getMonth()]} ${now.getFullYear()}`;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const NOMBRES_ECUATORIANOS = [
  'María Fernanda', 'Carlos Andrés', 'Ana Lucía', 'José Miguel', 'Paula Andrea',
  'Luis Fernando', 'Gabriela', 'Roberto', 'Valentina', 'Diego Alejandro',
  'Camila', 'Andrés Felipe', 'Sofía', 'Mauricio', 'Daniela',
  'Sebastián', 'Isabella', 'Fernando', 'Nicole', 'Ricardo'
];

const APELLIDOS_ECUATORIANOS = [
  'López', 'García', 'Rodríguez', 'Martínez', 'Hernández',
  'Pérez', 'González', 'Sánchez', 'Torres', 'Ramírez',
  'Flores', 'Vargas', 'Castillo', 'Morales', 'Jiménez',
  'Ruiz', 'Mendoza', 'Ortiz', 'Guerrero', 'Acosta'
];

function generateCedula(): string {
  // Generate a realistic Ecuadorian ID (10 digits)
  const province = String(randomInt(1, 24)).padStart(2, '0');
  const digits = province + Array.from({ length: 7 }, () => randomInt(0, 9)).join('');
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const d = parseInt(digits[i]);
    if (i % 2 === 0) {
      const doubled = d * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      sum += d;
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return digits + checkDigit;
}

function generateInitialClients(): Client[] {
  const clientes: Client[] = [];
  const reservas = [1000, 2000, 3000, 4000, 5000, 2000, 3000, 1000, 5000];
  const descuentos = [250, 350, 200, 300, 150, 250, 200, 150, 150]; // Sum ~2000
  const prefijos = ['97', '98', '99', '97', '98', '99', '97', '98', '99'];
  const temperaturas: ('Caliente' | 'Tibio')[] = ['Caliente', 'Caliente', 'Tibio', 'Caliente', 'Caliente', 'Caliente', 'Tibio', 'Caliente', 'Caliente'];

  for (let i = 0; i < 9; i++) {
    const nombreCompleto = `${NOMBRES_ECUATORIANOS[randomInt(0, NOMBRES_ECUATORIANOS.length - 1)]} ${APELLIDOS_ECUATORIANOS[randomInt(0, APELLIDOS_ECUATORIANOS.length - 1)]} ${APELLIDOS_ECUATORIANOS[randomInt(0, APELLIDOS_ECUATORIANOS.length - 1)]}`;
    clientes.push({
      id: generateId(),
      nombre: nombreCompleto,
      cedula: generateCedula(),
      telefonoPrefijo: prefijos[i],
      telefonoFinal: String(randomInt(1000, 9999)),
      temperatura: temperaturas[i],
      montoReserva: reservas[i],
      montoDescuento: descuentos[i],
      isInitial: true,
    });
  }
  return clientes;
}

function maskPhone(prefijo: string, final: string): string {
  return `+593 ${prefijo} *** ${final}`;
}

// ============ STORAGE ============
const STORAGE_KEY = 'cupos_descuento_data';

interface StoredData {
  saldo: number;
  clientes: Client[];
  metaCumplida: boolean;
}

function loadFromStorage(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading storage', e);
  }
  // Initialize
  const initial: StoredData = {
    saldo: 1500,
    clientes: generateInitialClients(),
    metaCumplida: false,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveToStorage(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ============ COMPONENTS ============

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
        <p className="text-gray-700 text-center mb-6 text-lg">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<StoredData>(loadFromStorage);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [temperatura, setTemperatura] = useState<'Caliente' | 'Tibio'>('Caliente');
  const [montoReserva, setMontoReserva] = useState('');
  const [montoDescuento, setMontoDescuento] = useState('');
  const [reservaConfirmada, setReservaConfirmada] = useState(false);

  const clientesIniciales = data.clientes.filter(c => c.isInitial);
  const clientesSesion = data.clientes.filter(c => !c.isInitial);
  const totalClientes = data.clientes.length;
  const meta = 10;
  const progreso = Math.min(totalClientes / meta, 1);

  // Persist on change
  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  // Feedback auto-hide
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Validation helpers
  const descuentoNum = parseFloat(montoDescuento) || 0;
  const showWarning = descuentoNum > 500 && !reservaConfirmada;

  const canApply = useCallback(() => {
    if (!nombre.trim()) return false;
    if (!cedula.trim()) return false;
    if (!telefono.trim()) return false;
    if (!montoReserva) return false;
    if (!montoDescuento) return false;
    if (!reservaConfirmada) return false;
    if (descuentoNum > data.saldo) return false;
    return true;
  }, [nombre, cedula, telefono, montoReserva, montoDescuento, reservaConfirmada, descuentoNum, data.saldo]);

  const handleApply = () => {
    // Validation 1: Datos mínimos
    if (!nombre.trim() || !cedula.trim() || !telefono.trim() || !montoReserva || !montoDescuento) {
      setFeedback('⚠️ Complete todos los campos obligatorios.');
      return;
    }
    // Validation 2: Saldo
    if (descuentoNum > data.saldo) {
      setFeedback(`❌ Saldo insuficiente. Disponible: $${data.saldo.toLocaleString()}.`);
      return;
    }
    // Validation 3: Reserva confirmada
    if (!reservaConfirmada) {
      setFeedback('❌ Debe confirmar la reserva para aplicar el descuento.');
      return;
    }

    // Apply
    const prefijo = telefono.substring(0, 2);
    const final4 = telefono.substring(5, 9);

    const newClient: Client = {
      id: generateId(),
      nombre: nombre.trim(),
      cedula: cedula.trim(),
      telefonoPrefijo: prefijo || '97',
      telefonoFinal: final4 || String(randomInt(1000, 9999)),
      temperatura: temperatura,
      montoReserva: parseFloat(montoReserva) || 0,
      montoDescuento: descuentoNum,
      isInitial: false,
    };

    const newData: StoredData = {
      saldo: data.saldo - descuentoNum,
      clientes: [...data.clientes, newClient],
      metaCumplida: totalClientes + 1 >= meta,
    };

    setData(newData);
    setFeedback('✅ Descuento aplicado correctamente');

    // Clear form
    setNombre('');
    setCedula('');
    setTelefono('');
    setTemperatura('Caliente');
    setMontoReserva('');
    setMontoDescuento('');
    setReservaConfirmada(false);
  };

  const handleDeleteLast = () => {
    if (clientesSesion.length === 0) return;
    const lastClient = clientesSesion[clientesSesion.length - 1];
    const newClientes = data.clientes.filter(c => c.id !== lastClient.id);
    const newData: StoredData = {
      saldo: data.saldo + lastClient.montoDescuento,
      clientes: newClientes,
      metaCumplida: false,
    };
    setData(newData);
    setShowDeleteModal(false);
    // Clear form
    setNombre('');
    setCedula('');
    setTelefono('');
    setTemperatura('Caliente');
    setMontoReserva('');
    setMontoDescuento('');
    setReservaConfirmada(false);
    setFeedback('🗑️ Último registro eliminado.');
  };

  const handleReset = () => {
    const fresh: StoredData = {
      saldo: 1500,
      clientes: generateInitialClients(),
      metaCumplida: false,
    };
    setData(fresh);
    setShowResetModal(false);
    setNombre('');
    setCedula('');
    setTelefono('');
    setTemperatura('Caliente');
    setMontoReserva('');
    setMontoDescuento('');
    setReservaConfirmada(false);
    setExpandedRows(new Set());
    sessionStorage.clear();
    setFeedback('🔄 Panel reiniciado al estado inicial.');
  };

  const phoneValidation = telefono.length >= 2 && !['97', '98', '99'].includes(telefono.substring(0, 2));
  const cedulaValidation = cedula.length > 0 && cedula.length !== 10;

  return (
    <div className="min-h-screen bg-gray-50 font-[Inter,sans-serif]">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Panel de Asignación de Cupos</h1>
            <p className="text-slate-300 text-sm mt-0.5">Asesor: <span className="font-semibold text-white">Jonathan Ortiz</span></p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Período</p>
              <p className="text-sm font-medium">{getCurrentMonth()}</p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              title="Actualizar panel"
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <span className="text-lg">↻</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Saldo & Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Saldo Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Saldo Disponible</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                Cupo restante
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-slate-800">
              ${data.saldo.toLocaleString()} <span className="text-lg font-normal text-gray-400">USD</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">Techo máximo por cliente con reserva confirmada</p>
          </div>

          {/* Meta Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Meta Mensual</span>
              {data.metaCumplida ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                  ✅ Cumplida
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                  En progreso
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Meta mensual: <strong>10 clientes con reserva</strong>
            </p>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${data.metaCumplida ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${progreso * 100}%` }}
              />
            </div>
            <p className={`text-sm font-medium ${data.metaCumplida ? 'text-green-600' : 'text-gray-600'}`}>
              {data.metaCumplida
                ? '✅ Meta mensual cumplida. Bono desbloqueado.'
                : `${totalClientes} de ${meta} clientes — Falta ${meta - totalClientes} cliente${meta - totalClientes !== 1 ? 's' : ''} para cumplir la meta y ganar el bono`}
            </p>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium shadow-sm ${
            feedback.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' :
            feedback.startsWith('❌') ? 'bg-red-50 text-red-700 border border-red-200' :
            feedback.startsWith('🗑️') || feedback.startsWith('🔄') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {feedback}
          </div>
        )}

        {/* Historial */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Historial del Mes</h2>
              <p className="text-xs text-gray-400 mt-0.5">{totalClientes} registro{totalClientes !== 1 ? 's' : ''} este período</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={clientesSesion.length === 0}
              title={clientesSesion.length === 0 ? 'No hay registros nuevos que eliminar' : 'Eliminar último registro'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                clientesSesion.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Eliminar último</span>
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Temperatura</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reserva</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descuento</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.clientes.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    expanded={expandedRows.has(client.id)}
                    onToggle={() => toggleExpand(client.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {data.clientes.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                expanded={expandedRows.has(client.id)}
                onToggle={() => toggleExpand(client.id)}
              />
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">Asignar Descuento — Cliente Actual</h2>
            <p className="text-xs text-gray-400 mt-0.5">Complete los datos para aplicar un cupo de descuento</p>
          </div>

          <div className="p-5 space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Carlos Pérez"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>

            {/* Cédula */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value.replace(/\D/g, '').substring(0, 10))}
                placeholder="10 dígitos"
                className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm ${cedulaValidation ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
              />
              {cedulaValidation && (
                <p className="text-xs text-amber-600 mt-1">⚠️ La cédula debe tener 10 dígitos</p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono del cliente</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 font-mono whitespace-nowrap">
                  +593
                </span>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').substring(0, 9))}
                  placeholder="97XXXXXXX"
                  className={`flex-1 px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-mono ${phoneValidation ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                />
              </div>
              {phoneValidation && (
                <p className="text-xs text-amber-600 mt-1">⚠️ El número debe iniciar con 97, 98 o 99</p>
              )}
            </div>

            {/* Temperatura */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperatura</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-all text-sm font-medium ${
                  temperatura === 'Caliente' ? 'border-red-300 bg-red-50 text-red-700 ring-2 ring-red-200' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
                  <input type="radio" name="temperatura" value="Caliente" checked={temperatura === 'Caliente'} onChange={() => setTemperatura('Caliente')} className="sr-only" />
                  🔥 Caliente
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-all text-sm font-medium ${
                  temperatura === 'Tibio' ? 'border-amber-300 bg-amber-50 text-amber-700 ring-2 ring-amber-200' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
                  <input type="radio" name="temperatura" value="Tibio" checked={temperatura === 'Tibio'} onChange={() => setTemperatura('Tibio')} className="sr-only" />
                  🌡️ Tibio
                </label>
              </div>
            </div>

            {/* Monto Reserva y Descuento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto de reserva (USD)</label>
                <input
                  type="number"
                  value={montoReserva}
                  onChange={(e) => setMontoReserva(e.target.value)}
                  placeholder="Ej: 2000"
                  min="0"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto de descuento (USD)</label>
                <input
                  type="number"
                  value={montoDescuento}
                  onChange={(e) => setMontoDescuento(e.target.value)}
                  placeholder="Ej: 350"
                  min="0"
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm ${showWarning ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                />
              </div>
            </div>

            {/* Warning inline */}
            {showWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                ⚠️ Monto superior al límite autorizado por cliente. <strong>Solicitar Autorización al Gerente Comercial</strong> para continuar, o confirme la reserva para desbloquearlo.
              </div>
            )}

            {/* Checkbox reserva */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="reservaConfirmada"
                checked={reservaConfirmada}
                onChange={(e) => setReservaConfirmada(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="reservaConfirmada" className="text-sm font-medium text-gray-700 cursor-pointer">
                Reserva confirmada
              </label>
              {reservaConfirmada && (
                <span className="ml-auto text-xs text-green-600 font-medium">✓ Activa</span>
              )}
            </div>

            {/* Botón aplicar */}
            <button
              onClick={handleApply}
              disabled={!canApply()}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                canApply()
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Aplicar descuento
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-gray-400">
          Sistema interno de gestión de cupos — {getCurrentMonth()}
        </footer>
      </main>

      {/* Modals */}
      {showDeleteModal && (
        <ConfirmModal
          message="¿Eliminar el último registro?"
          onConfirm={handleDeleteLast}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      {showResetModal && (
        <ConfirmModal
          message="¿Reiniciar datos del mes?"
          onConfirm={handleReset}
          onCancel={() => setShowResetModal(false)}
        />
      )}
    </div>
  );
}

// ============ TABLE ROW (Desktop) ============
function ClientRow({ client, expanded, onToggle }: { client: Client; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-5 py-3.5 text-sm font-mono text-gray-700">
          {maskPhone(client.telefonoPrefijo, client.telefonoFinal)}
        </td>
        <td className="px-5 py-3.5">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            client.temperatura === 'Caliente'
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {client.temperatura === 'Caliente' ? '🔥' : '🌡️'} {client.temperatura}
          </span>
        </td>
        <td className="px-5 py-3.5 text-sm font-medium text-gray-800">
          ${client.montoReserva.toLocaleString()}
        </td>
        <td className="px-5 py-3.5 text-sm font-semibold text-green-700">
          ${client.montoDescuento.toLocaleString()}
        </td>
        <td className="px-5 py-3.5 text-center">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-lg"
            title="Ver detalles"
          >
            👁
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-5 py-3">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wide">Nombre completo</span>
                <p className="font-medium text-gray-800 mt-0.5">{client.nombre}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wide">Cédula</span>
                <p className="font-medium text-gray-800 mt-0.5 font-mono">{client.cedula}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============ CARD (Mobile) ============
function ClientCard({ client, expanded, onToggle }: { client: Client; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-gray-700">
              {maskPhone(client.telefonoPrefijo, client.telefonoFinal)}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              client.temperatura === 'Caliente'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {client.temperatura === 'Caliente' ? '🔥' : '🌡️'} {client.temperatura}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">Reserva: <strong className="text-gray-800">${client.montoReserva.toLocaleString()}</strong></span>
            <span className="text-green-700">Desc: <strong>${client.montoDescuento.toLocaleString()}</strong></span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-lg ml-2"
          title="Ver detalles"
        >
          👁
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-400 text-xs uppercase tracking-wide">Nombre</span>
            <p className="font-medium text-gray-800">{client.nombre}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs uppercase tracking-wide">Cédula</span>
            <p className="font-medium text-gray-800 font-mono">{client.cedula}</p>
          </div>
        </div>
      )}
    </div>
  );
}
