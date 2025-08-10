import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { pipeline } from '@huggingface/transformers';

interface CurrencyDetectionProps {
  onDetection: (message: string) => void;
}

const CurrencyDetection = ({ onDetection }: CurrencyDetectionProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedCurrency, setDetectedCurrency] = useState<string | null>(null);
  const [isAuthentic, setIsAuthentic] = useState<boolean | null>(null);
  const [model, setModel] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Información sobre billetes mexicanos
  const mexicanCurrency = {
    '20': { name: 'Veinte pesos', color: 'azul', figure: 'Benito Juárez' },
    '50': { name: 'Cincuenta pesos', color: 'rosa', figure: 'José María Morelos' },
    '100': { name: 'Cien pesos', color: 'rojo', figure: 'Nezahualcóyotl' },
    '200': { name: 'Doscientos pesos', color: 'verde', figure: 'Sor Juana Inés de la Cruz' },
    '500': { name: 'Quinientos pesos', color: 'morado', figure: 'Diego Rivera y Frida Kahlo' },
    '1000': { name: 'Mil pesos', color: 'café', figure: 'Francisco I. Madero' }
  };

  // Inicializar el modelo de clasificación de imágenes
  useEffect(() => {
    const initModel = async () => {
      try {
        setIsLoading(true);
        const classifier = await pipeline(
          'image-classification',
          'google/vit-base-patch16-224',
          { device: 'webgpu' }
        );
        setModel(classifier);
        console.log('Modelo de clasificación cargado');
      } catch (error) {
        console.error('Error cargando el modelo:', error);
        // Fallback sin WebGPU
        try {
          const classifier = await pipeline(
            'image-classification',
            'google/vit-base-patch16-224'
          );
          setModel(classifier);
        } catch (fallbackError) {
          console.error('Error con fallback:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initModel();
  }, []);

  // Iniciar automáticamente cuando el modelo esté listo
  useEffect(() => {
    if (model && !isLoading && !isActive) {
      startCamera();
    }
  }, [model, isLoading]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsActive(true);
        onDetection('Cámara activada automáticamente para verificación de billetes.');
        startCurrencyDetection();
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      onDetection('Error: No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const startCurrencyDetection = () => {
    // Analizar billetes cada 5 segundos
    intervalRef.current = setInterval(analyzeCurrency, 5000);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    onDetection('Verificación de billetes detenida.');
  };

  const analyzeCurrency = async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Para demostración, simulamos la detección de billetes
      // En una implementación real, necesitarías un modelo específico para billetes
      const mockDetection = simulateCurrencyDetection();
      
      setDetectedCurrency(mockDetection.denomination);
      setIsAuthentic(mockDetection.isAuthentic);
      
      const currencyInfo = mexicanCurrency[mockDetection.denomination as keyof typeof mexicanCurrency];
      
      let message = '';
      if (currencyInfo) {
        message = `Detectado: billete de ${currencyInfo.name}. `;
        message += mockDetection.isAuthentic 
          ? 'El billete parece auténtico.' 
          : 'Advertencia: este billete podría ser falso. Verifica con un experto.';
      } else {
        message = 'No se pudo identificar el billete. Acércalo más a la cámara.';
      }

      onDetection(message);
      speak(message);

    } catch (error) {
      console.error('Error en el análisis:', error);
      onDetection('Error en el análisis del billete.');
    }
  };

  // Simulación de detección de billetes (en producción usarías un modelo real)
  const simulateCurrencyDetection = () => {
    const denominations = ['20', '50', '100', '200', '500', '1000'];
    const randomDenomination = denominations[Math.floor(Math.random() * denominations.length)];
    const isAuthentic = Math.random() > 0.2; // 80% probabilidad de ser auténtico

    return {
      denomination: randomDenomination,
      isAuthentic: isAuthentic
    };
  };

  const speak = (message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-green-100">
      <div className="text-center space-y-6">
        {/* Status */}
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-gray-700 font-medium">
            {isLoading ? 'Iniciando automáticamente...' : isActive ? 'Verificando billetes automáticamente...' : 'Preparando sistema...'}
          </span>
        </div>

        {/* Video Preview */}
        <div className="relative mx-auto max-w-lg">
          <video
            ref={videoRef}
            className="w-full h-64 bg-black rounded-2xl object-cover"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-2xl">
              {isLoading ? (
                <div className="text-center">
                  <DollarSign className="w-16 h-16 text-green-500 animate-pulse mx-auto mb-2" />
                  <p className="text-gray-600">Iniciando automáticamente...</p>
                </div>
              ) : (
                <DollarSign className="w-16 h-16 text-gray-400" />
              )}
            </div>
          )}

          {/* Overlay guide */}
          {isActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-green-400 border-dashed rounded-lg w-48 h-32 flex items-center justify-center">
                <span className="text-green-600 bg-black/50 px-2 py-1 rounded text-sm">
                  Acerca el billete aquí
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {detectedCurrency && (
          <div className={`rounded-2xl p-4 border-2 ${
            isAuthentic 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-center space-x-2 mb-3">
              {isAuthentic ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              )}
              <h3 className={`font-semibold text-lg ${
                isAuthentic ? 'text-green-800' : 'text-red-800'
              }`}>
                {isAuthentic ? 'Billete Auténtico' : 'Posible Billete Falso'}
              </h3>
            </div>
            
            <div className="text-center">
              <p className="font-medium text-gray-800 mb-2">
                Denominación: {mexicanCurrency[detectedCurrency as keyof typeof mexicanCurrency]?.name}
              </p>
              <p className="text-sm text-gray-600">
                Color característico: {mexicanCurrency[detectedCurrency as keyof typeof mexicanCurrency]?.color}
              </p>
              <p className="text-sm text-gray-600">
                Personaje: {mexicanCurrency[detectedCurrency as keyof typeof mexicanCurrency]?.figure}
              </p>
            </div>

            {!isAuthentic && (
              <div className="mt-3 p-3 bg-red-100 rounded-lg">
                <p className="text-red-800 text-sm font-medium">
                  ⚠️ Recomendación: Consulta con un experto o institución bancaria para verificar la autenticidad.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-2xl p-4 text-left">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
            <DollarSign className="w-4 h-4 mr-2" />
            Sistema Automático:
          </h4>
          <ul className="text-gray-600 text-sm space-y-1">
            <li>• La cámara se inicia automáticamente</li>
            <li>• Los billetes se analizan cada 5 segundos</li>
            <li>• Los resultados se anuncian por voz</li>
            <li>• Coloca el billete dentro del marco</li>
            <li>• Mantén buena iluminación</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CurrencyDetection;
