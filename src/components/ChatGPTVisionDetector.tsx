import { useEffect, useRef, useState } from 'react';

const OPENAI_API_KEY = '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';

const ChatGPTVisionDetector = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>('Preparando sistema...');
  const [lastMessage, setLastMessage] = useState<string>('');

  // Start camera automatically when component mounts
  useEffect(() => {
    document.title = 'Detector automático de objetos y billetes';
    startCamera();
    return () => stopAll();
  }, []);

  const stopAll = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  const startCamera = async () => {
    try {
      setStatus('Solicitando acceso a la cámara...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsActive(true);
      setStatus('Cámara activa. Analizando entorno...');
      speak('Cámara activada. Comenzando detección automática.');
      beginLoop();
    } catch (e) {
      console.error(e);
      setStatus('No se pudo acceder a la cámara. Revisa permisos.');
      speak('No se pudo acceder a la cámara. Revisa los permisos.');
    }
  };

  const beginLoop = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    // analyze every 5 seconds
    intervalRef.current = window.setInterval(() => {
      analyzeFrame();
    }, 5000);
    // Run first analysis ASAP
    analyzeFrame();
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

    setIsAnalyzing(true);
    setStatus('Analizando imagen con ChatGPT...');

    try {
      const message = await analyzeWithOpenAI(dataUrl, OPENAI_API_KEY);
      if (message) {
        setLastMessage(message);
        speak(message);
        setStatus('Análisis completado. Continuando...');
      }
    } catch (err) {
      console.error('Error analizando con OpenAI:', err);
      setStatus('Error al analizar la imagen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeWithOpenAI = async (imageDataUrl: string, key: string): Promise<string> => {
    const prompt = `Analiza la imagen y responde en una sola frase en español:
- Enumera brevemente los objetos principales (usa nombres simples: silla, mesa, persona, perro, etc.).
- Si aparece un billete mexicano o peruano, indica:
  * País y denominación (ej: "billete peruano de 10 soles", "billete mexicano de 50 pesos")
  * Valoración de autenticidad: "billete auténtico", "posible billete falso" o "no es posible confirmar autenticidad"
  * Para billetes mexicanos: busca ventana transparente, marca de agua, hilo de seguridad, relieve
  * Para billetes peruanos: busca marca de agua, hilo de seguridad, relieve, ventana transparente, cambio de color`;

    const body = {
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Eres un asistente de visión experto en billetes mexicanos y peruanos que responde de forma breve y clara en español latino.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      max_tokens: 180,
      temperature: 0.2,
    } as any;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content || '';
    return content.trim();
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.rate = 0.9;
    utter.pitch = 1;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Asistente Visual Automático</h1>
          <p className="text-white/70 mt-2">Detección de objetos y verificación de billetes mexicanos y peruanos usando ChatGPT Vision</p>
        </header>

        <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-black/40">
          <video ref={videoRef} className="w-full h-[360px] object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Status overlay */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-sm bg-white/10 backdrop-blur border border-white/20">
            {isActive ? (isAnalyzing ? 'Analizando...' : 'Detectando...') : 'Preparando...'}
          </div>
        </div>

        {/* Last message */}
        <div className="mt-6 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
          <p className="text-sm text-white/70">Estado: {status}</p>
          {lastMessage && (
            <p className="mt-2 text-lg">{lastMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatGPTVisionDetector;