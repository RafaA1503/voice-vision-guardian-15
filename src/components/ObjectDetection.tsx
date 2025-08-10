import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Square, AlertCircle } from 'lucide-react';
import { pipeline } from '@huggingface/transformers';

interface ObjectDetectionProps {
  onDetection: (message: string) => void;
}

const ObjectDetection = ({ onDetection }: ObjectDetectionProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<string[]>([]);
  const [model, setModel] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Traducción de objetos del inglés al español
  const objectTranslations: { [key: string]: string } = {
    'person': 'persona',
    'bicycle': 'bicicleta',
    'car': 'automóvil',
    'motorcycle': 'motocicleta',
    'airplane': 'avión',
    'bus': 'autobús',
    'train': 'tren',
    'truck': 'camión',
    'boat': 'barco',
    'traffic light': 'semáforo',
    'fire hydrant': 'hidrante',
    'stop sign': 'señal de alto',
    'parking meter': 'parquímetro',
    'bench': 'banco',
    'bird': 'pájaro',
    'cat': 'gato',
    'dog': 'perro',
    'horse': 'caballo',
    'sheep': 'oveja',
    'cow': 'vaca',
    'elephant': 'elefante',
    'bear': 'oso',
    'zebra': 'cebra',
    'giraffe': 'jirafa',
    'backpack': 'mochila',
    'umbrella': 'paraguas',
    'handbag': 'bolso',
    'tie': 'corbata',
    'suitcase': 'maleta',
    'frisbee': 'frisbee',
    'skis': 'esquíes',
    'snowboard': 'tabla de nieve',
    'sports ball': 'pelota',
    'kite': 'cometa',
    'baseball bat': 'bate de béisbol',
    'baseball glove': 'guante de béisbol',
    'skateboard': 'patineta',
    'surfboard': 'tabla de surf',
    'tennis racket': 'raqueta de tenis',
    'bottle': 'botella',
    'wine glass': 'copa de vino',
    'cup': 'taza',
    'fork': 'tenedor',
    'knife': 'cuchillo',
    'spoon': 'cuchara',
    'bowl': 'tazón',
    'banana': 'plátano',
    'apple': 'manzana',
    'sandwich': 'sándwich',
    'orange': 'naranja',
    'broccoli': 'brócoli',
    'carrot': 'zanahoria',
    'hot dog': 'perro caliente',
    'pizza': 'pizza',
    'donut': 'dona',
    'cake': 'pastel',
    'chair': 'silla',
    'couch': 'sofá',
    'potted plant': 'planta en maceta',
    'bed': 'cama',
    'dining table': 'mesa de comedor',
    'toilet': 'inodoro',
    'tv': 'televisión',
    'laptop': 'laptop',
    'mouse': 'ratón',
    'remote': 'control remoto',
    'keyboard': 'teclado',
    'cell phone': 'teléfono celular',
    'microwave': 'microondas',
    'oven': 'horno',
    'toaster': 'tostadora',
    'sink': 'fregadero',
    'refrigerator': 'refrigerador',
    'book': 'libro',
    'clock': 'reloj',
    'vase': 'jarrón',
    'scissors': 'tijeras',
    'teddy bear': 'osito de peluche',
    'hair drier': 'secadora de pelo',
    'toothbrush': 'cepillo de dientes'
  };

  // Inicializar el modelo de detección de objetos
  useEffect(() => {
    const initModel = async () => {
      try {
        setIsLoading(true);
        const objectDetector = await pipeline(
          'object-detection',
          'Xenova/detr-resnet-50',
          { device: 'webgpu' }
        );
        setModel(objectDetector);
        console.log('Modelo de detección de objetos cargado');
      } catch (error) {
        console.error('Error cargando el modelo:', error);
        // Fallback sin WebGPU
        try {
          const objectDetector = await pipeline(
            'object-detection',
            'Xenova/detr-resnet-50'
          );
          setModel(objectDetector);
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
        onDetection('Cámara activada automáticamente. Detectando objetos...');
        startObjectDetection();
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      onDetection('Error: No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onDetection('Cámara desactivada.');
  };

  const captureAndDetect = async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Configurar el canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar el frame actual del video en el canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Detectar objetos en la imagen
      const results = await model(canvas);
      
      if (results && results.length > 0) {
        // Filtrar objetos con confianza alta
        const highConfidenceObjects = results.filter((obj: any) => obj.score > 0.5);
        
        if (highConfidenceObjects.length > 0) {
          const objectNames = highConfidenceObjects.map((obj: any) => {
            const englishName = obj.label.toLowerCase();
            return objectTranslations[englishName] || englishName;
          });

          // Eliminar duplicados y convertir a string array
          const uniqueObjects: string[] = [...new Set(objectNames)].filter(name => typeof name === 'string');
          setDetectedObjects(uniqueObjects);

          // Crear mensaje de voz
          if (uniqueObjects.length === 1) {
            const message = `Detecto ${uniqueObjects[0]}. Ten cuidado.`;
            onDetection(message);
          } else {
            const message = `Detecto ${uniqueObjects.join(', ')}. Ten cuidado.`;
            onDetection(message);
          }
          
          speak(uniqueObjects);
        }
      }
    } catch (error) {
      console.error('Error en la detección:', error);
    }
  };

  const speak = (objects: string[]) => {
    if ('speechSynthesis' in window) {
      // Cancelar cualquier síntesis anterior
      window.speechSynthesis.cancel();
      
      let message = '';
      if (objects.length === 1) {
        message = `Hay ${objects[0]}. Ten cuidado.`;
      } else if (objects.length > 1) {
        message = `Hay ${objects.join(', ')}. Ten cuidado.`;
      }

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  const startObjectDetection = () => {
    // Detectar objetos cada 3 segundos
    intervalRef.current = setInterval(captureAndDetect, 3000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-blue-100">
      <div className="text-center space-y-6">
        {/* Status */}
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-gray-700 font-medium">
            {isLoading ? 'Iniciando automáticamente...' : isActive ? 'Detectando objetos automáticamente...' : 'Preparando sistema...'}
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
                  <Camera className="w-16 h-16 text-blue-500 animate-pulse mx-auto mb-2" />
                  <p className="text-gray-600">Iniciando automáticamente...</p>
                </div>
              ) : (
                <Camera className="w-16 h-16 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Detected Objects */}
        {detectedObjects.length > 0 && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Objetos Detectados:</h3>
            <div className="flex flex-wrap gap-2">
              {detectedObjects.map((object, index) => (
                <span 
                  key={index} 
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {object}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-2xl p-4 text-left">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Sistema Automático:
          </h4>
          <ul className="text-gray-600 text-sm space-y-1">
            <li>• La cámara se inicia automáticamente</li>
            <li>• Los objetos se detectan cada 3 segundos</li>
            <li>• Los resultados se anuncian por voz</li>
            <li>• Mantén el teléfono estable para mejor detección</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ObjectDetection;
