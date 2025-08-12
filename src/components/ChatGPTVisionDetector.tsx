import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Activity, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';

const OPENAI_API_KEY = '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';

const ChatGPTVisionDetector = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>('Preparando sistema...');
  const [lastMessage, setLastMessage] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState<string>('');
  const [autoDetect, setAutoDetect] = useState(false); // Manual por defecto para ahorrar costos
  const [lowPower, setLowPower] = useState(true); // Ahorro activado por defecto
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Start camera automatically when component mounts
  useEffect(() => {
    setMounted(true);
    const title = 'Detector de objetos y billetes peruanos y mexicanos';
    document.title = title;

    // Meta description
    const metaDescName = 'description';
    let metaDesc = document.querySelector(`meta[name="${metaDescName}"]`) as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = metaDescName;
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = 'Detector visual: objetos y billetes peruanos y mexicanos con análisis de autenticidad.';

    // Canonical
    const canonicalHref = window.location.href;
    let linkEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.rel = 'canonical';
      document.head.appendChild(linkEl);
    }
    linkEl.href = canonicalHref;

    startCamera();
    startSpeechRecognition();
    return () => { stopAll(); stopSpeechRecognition(); };
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

  // Reconocimiento de voz continuo (Web Speech API)
  const startSpeechRecognition = () => {
    try {
      const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        setStatus((s) => s + ' | Reconocimiento de voz no soportado');
        return;
      }
      const rec = new SR();
      rec.lang = 'es-ES';
      rec.continuous = true;
      rec.interimResults = false;
      rec.onstart = () => setIsListening(true);
      rec.onend = () => {
        setIsListening(false);
        // reintentar automáticamente para mantener la escucha activa
        try { rec.start(); } catch { /* noop */ }
      };
      rec.onerror = (e: any) => {
        console.error('SpeechRecognition error', e);
        setIsListening(false);
      };
      rec.onresult = (e: any) => {
        const result = e.results[e.results.length - 1];
        if (!result) return;
        const isFinal = result.isFinal;
        const text: string = (result[0]?.transcript || '').trim().toLowerCase();
        if (!text) return;
        setLastHeard(text);
        if (isFinal) handleVoiceCommand(text);
      };
      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('No se pudo iniciar el reconocimiento de voz:', err);
    }
  };

  const stopSpeechRecognition = () => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onend = null;
        rec.stop();
      } catch { /* noop */ }
    }
    recognitionRef.current = null;
    setIsListening(false);
  };

  const handleVoiceCommand = async (text: string) => {
    const queries = [
      'qué hay adelante', 'que hay adelante',
      'qué hay enfrente', 'que hay enfrente',
      'qué ves', 'que ves',
      'que hay al frente', 'qué hay al frente'
    ];
    if (queries.some((q) => text.includes(q))) {
      speak('Analizando lo que hay adelante.');
      await analyzeFrame();
      return;
    }
  };

  const handleToggleAuto = (value: boolean) => {
    setAutoDetect(value);
    if (value) {
      beginLoop();
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleToggleLowPower = (value: boolean) => {
    setLowPower(value);
    if (autoDetect) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      beginLoop();
    }
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
      setStatus('Cámara activa. Listo para analizar.');
      speak('Cámara activada. Detección por voz lista. El modo ahorro está ' + (lowPower ? 'activado' : 'desactivado') + '.');
      // No iniciamos el bucle por defecto para ahorrar costos
      if (autoDetect) beginLoop();
    } catch (e) {
      console.error(e);
      setStatus('No se pudo acceder a la cámara. Revisa permisos.');
      speak('No se pudo acceder a la cámara. Revisa los permisos.');
    }
  };

  const beginLoop = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    const intervalMs = lowPower ? 30000 : 10000; // Reducir llamadas para ahorrar
    intervalRef.current = window.setInterval(() => {
      analyzeFrame();
    }, intervalMs);
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    const maxWidth = lowPower ? 512 : 768;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', lowPower ? 0.5 : 0.7);

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
    <section className="min-h-screen text-foreground relative overflow-hidden futuristic-bg">
      <div className="container py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Asistente visual: objetos y billetes
          </h1>
          <p className="mt-2 text-muted-foreground">
            Detección automática de objetos y billetes peruanos y mexicanos con verificación básica de autenticidad.
          </p>
        </header>

        <Card className="relative overflow-hidden glass-panel neon-ring">
          <CardContent className="p-0">
            <div className="relative">
              <video ref={videoRef} className="w-full aspect-video object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <Badge variant="secondary" className="absolute top-3 left-3">
                {isActive ? (isAnalyzing ? 'Analizando…' : 'Detectando…') : 'Preparando…'}
              </Badge>
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <Badge variant={isListening ? 'default' : 'secondary'} className="flex items-center gap-1">
                  <Mic className="h-3.5 w-3.5" />
                  {isListening ? 'Escuchando' : 'Mic apagado'}
                </Badge>
                {isAnalyzing && <Activity className="h-4 w-4 text-primary animate-pulse" aria-hidden />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 glass-panel neon-ring">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">Estado: {status}</p>
            {lastHeard && (
              <p className="text-xs text-muted-foreground mt-1">Último comando: “{lastHeard}”</p>
            )}
            {lastMessage && (
              <p className="mt-2 text-lg leading-relaxed">{lastMessage}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default ChatGPTVisionDetector;