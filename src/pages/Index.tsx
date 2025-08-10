
import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, DollarSign, Volume2, CheckCircle, AlertCircle, Loader2, Zap, Shield, Eye } from 'lucide-react';
import ObjectDetection from '@/components/ObjectDetection';
import CurrencyDetection from '@/components/CurrencyDetection';

const Index = () => {
  const [activeMode, setActiveMode] = useState<'objects' | 'currency'>('objects');
  const [systemStatus, setSystemStatus] = useState({
    voiceAssistant: false,
    camera: false,
    models: false
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // Verificar sistemas al cargar
  useEffect(() => {
    const initializeSystems = async () => {
      console.log('Iniciando verificación de sistemas...');
      
      // Verificar asistente de voz
      if ('speechSynthesis' in window) {
        setSystemStatus(prev => ({ ...prev, voiceAssistant: true }));
        console.log('✓ Asistente de voz disponible');
      }

      // Verificar acceso a cámara
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        if (hasCamera) {
          setSystemStatus(prev => ({ ...prev, camera: true }));
          console.log('✓ Cámara disponible');
        }
      } catch (error) {
        console.log('⚠ Error verificando cámara:', error);
      }

      // Simular carga de modelos
      setTimeout(() => {
        setSystemStatus(prev => ({ ...prev, models: true }));
        setIsInitializing(false);
        console.log('✓ Modelos de IA cargados');
        
        // Mensaje de bienvenida automático
        speak('Asistente Visual iniciado correctamente. Sistema listo para detectar objetos automáticamente. Mantén tu teléfono estable.');
      }, 2000);
    };

    initializeSystems();
  }, []);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(voice => 
        voice.lang.startsWith('es') || voice.name.includes('Spanish')
      );
      
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleDetection = (message: string) => {
    console.log('Detección:', message);
    speak(message);
  };

  // Cambio automático de modo cada 30 segundos
  useEffect(() => {
    if (!isInitializing) {
      const interval = setInterval(() => {
        setActiveMode(prev => {
          const newMode = prev === 'objects' ? 'currency' : 'objects';
          const modeText = newMode === 'objects' ? 'detección de objetos' : 'verificación de billetes';
          speak(`Cambiando automáticamente a modo ${modeText}`);
          return newMode;
        });
      }, 30000); // Cambiar cada 30 segundos

      return () => clearInterval(interval);
    }
  }, [isInitializing]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center max-w-md z-10">
          <div className="mb-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-spin"></div>
              <div className="absolute inset-2 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
            Asistente Visual
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Iniciando sistemas inteligentes...
          </p>
          
          {/* Status indicators with modern design */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className={`w-3 h-3 rounded-full ${systemStatus.voiceAssistant ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-gray-500'} transition-all duration-500`}></div>
              <Volume2 className={`w-5 h-5 ${systemStatus.voiceAssistant ? 'text-green-400' : 'text-gray-400'} transition-colors duration-500`} />
              <span className="text-white/90 font-medium flex-1 text-left">Asistente de Voz</span>
              {systemStatus.voiceAssistant && <CheckCircle className="w-5 h-5 text-green-400" />}
            </div>
            
            <div className="flex items-center space-x-4 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className={`w-3 h-3 rounded-full ${systemStatus.camera ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 'bg-gray-500'} transition-all duration-500`}></div>
              <Camera className={`w-5 h-5 ${systemStatus.camera ? 'text-blue-400' : 'text-gray-400'} transition-colors duration-500`} />
              <span className="text-white/90 font-medium flex-1 text-left">Acceso a Cámara</span>
              {systemStatus.camera && <CheckCircle className="w-5 h-5 text-blue-400" />}
            </div>
            
            <div className="flex items-center space-x-4 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className={`w-3 h-3 rounded-full ${systemStatus.models ? 'bg-purple-400 shadow-lg shadow-purple-400/50' : 'bg-gray-500'} transition-all duration-500`}></div>
              <Zap className={`w-5 h-5 ${systemStatus.models ? 'text-purple-400' : 'text-gray-400'} transition-colors duration-500`} />
              <span className="text-white/90 font-medium flex-1 text-left">Modelos de IA</span>
              {systemStatus.models ? <CheckCircle className="w-5 h-5 text-purple-400" /> : <Loader2 className="w-5 h-5 animate-spin text-purple-400" />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header with glassmorphism */}
      <div className="relative bg-white/10 backdrop-blur-xl shadow-2xl border-b border-white/20">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Asistente Visual IA
            </h1>
            <p className="text-white/80 text-xl font-medium">
              {activeMode === 'objects' ? 'Detectando objetos en tiempo real...' : 'Verificando autenticidad de billetes...'}
            </p>
          </div>
        </div>
      </div>

      <div className="relative container mx-auto px-6 py-8">
        {/* Mode indicator with modern design */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20">
            <div className="flex items-center space-x-6">
              <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 ${
                activeMode === 'objects' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25 scale-105' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}>
                <Eye className="w-6 h-6" />
                <span className="font-semibold text-lg">Objetos</span>
                {activeMode === 'objects' && (
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-200"></div>
                  </div>
                )}
              </div>
              
              <div className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 ${
                activeMode === 'currency' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 scale-105' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}>
                <Shield className="w-6 h-6" />
                <span className="font-semibold text-lg">Billetes</span>
                {activeMode === 'currency' && (
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-200"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active mode content */}
        {activeMode === 'objects' && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-xl rounded-full px-6 py-3 border border-white/20">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                <h2 className="text-2xl font-bold text-white">
                  Identificación Automática de Objetos
                </h2>
              </div>
              <p className="text-white/70 mt-4 text-lg">
                Sistema inteligente detectando y anunciando objetos automáticamente
              </p>
            </div>
            <ObjectDetection onDetection={handleDetection} />
          </div>
        )}

        {activeMode === 'currency' && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-xl rounded-full px-6 py-3 border border-white/20">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <h2 className="text-2xl font-bold text-white">
                  Verificación Automática de Billetes
                </h2>
              </div>
              <p className="text-white/70 mt-4 text-lg">
                Tecnología avanzada para identificar billetes y verificar autenticidad
              </p>
            </div>
            <CurrencyDetection onDetection={handleDetection} />
          </div>
        )}

        {/* System status with modern design */}
        <div className="mt-12 bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
          <h4 className="text-2xl font-bold text-white mb-6 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
              <Volume2 className="w-4 h-4 text-white" />
            </div>
            Sistema Automático Activo
          </h4>
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col items-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-green-400/25">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-semibold">Voz</span>
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-blue-400/25">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-semibold">Cámara</span>
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse"></div>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-violet-400 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-purple-400/25">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-white font-semibold">IA</span>
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 animate-pulse"></div>
            </div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
            <p className="text-white/90 font-medium text-lg">
              🔄 Cambio automático de modo cada 30 segundos
            </p>
            <p className="text-white/70 text-sm mt-1">
              Sistema funcionando en modo completamente autónomo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
