import { useEffect, useRef, useState } from 'react';

const OPENAI_KEY_STORAGE = 'OPENAI_API_KEY';

const ChatGPTVisionDetector = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>('Preparando sistema...');
  const [lastMessage, setLastMessage] = useState<string>('');

  // Load API key and set document title
  useEffect(() => {
    document.title = 'Detector automático de objetos y billetes';
    const key = localStorage.getItem(OPENAI_KEY_STORAGE);
    if (key) setApiKey(key);
  }, []);

  // Start when apiKey is set
  useEffect(() => {
    if (!apiKey) return;
    startCamera();
    return () => stopAll();
  }, [apiKey]);

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
    if (!apiKey || !videoRef.current || !canvasRef.current || isAnalyzing) return;

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
      const message = await analyzeWithOpenAI(dataUrl, apiKey);
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
- Si aparece un billete mexicano, indica su posible denominación y una valoración: "billete auténtico", "posible billete falso" o "no es posible confirmar autenticidad" (basado en rasgos visibles como ventana transparente, marca de agua, hilo de seguridad, relieve).`;

    const body = {
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'Eres un asistente de visión que responde de forma breve y clara en español latino.' },
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

  const handleApiKeyInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value.trim();
      if (value) {
        localStorage.setItem(OPENAI_KEY_STORAGE, value);
        setApiKey(value);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Asistente Visual Automático</h1>
          <p className="text-white/70 mt-2">Detección de objetos y verificación de billetes usando ChatGPT Vision</p>
        </header>

        <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-black/40">
          <video ref={videoRef} className="w-full h-[360px] object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Status overlay */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-sm bg-white/10 backdrop-blur border border-white/20">
            {isActive ? (isAnalyzing ? 'Analizando...' : 'Detectando...') : 'Preparando...'}
          </div>

          {/* API key overlay when missing - no botones, confirmar con Enter */}
          {!apiKey && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
              <div className="w-full max-w-md text-center">
                <h2 className="text-xl font-semibold mb-2">Ingresa tu clave de API de OpenAI</h2>
                <p className="text-white/70 mb-4 text-sm">Se guardará localmente y se usará solo desde tu navegador.</p>
                <input
                  type="password"
                  placeholder="sk-... (presiona Enter para continuar)"
                  onKeyDown={handleApiKeyInput}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 outline-none placeholder-white/50"
                  autoFocus
                />
              </div>
            </div>
          )}
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
