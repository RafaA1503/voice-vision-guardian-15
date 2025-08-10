
import { useEffect, useRef } from 'react';

const VoiceAssistant = () => {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Configurar síntesis de voz
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Mensaje de bienvenida
      const welcomeMessage = 'Bienvenido al Asistente Visual. Selecciona una opción para comenzar a identificar objetos o verificar billetes.';
      speak(welcomeMessage);
    }

    return () => {
      // Limpiar síntesis de voz al desmontar
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancelar cualquier síntesis anterior
      window.speechSynthesis.cancel();
      
      utteranceRef.current = new SpeechSynthesisUtterance(text);
      utteranceRef.current.lang = 'es-ES';
      utteranceRef.current.rate = 0.8;
      utteranceRef.current.pitch = 1;
      utteranceRef.current.volume = 1;

      // Intentar usar una voz en español si está disponible
      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(voice => 
        voice.lang.startsWith('es') || voice.name.includes('Spanish')
      );
      
      if (spanishVoice) {
        utteranceRef.current.voice = spanishVoice;
      }

      window.speechSynthesis.speak(utteranceRef.current);
    }
  };

  // Este componente no renderiza nada visible
  return null;
};

export default VoiceAssistant;
