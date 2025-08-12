import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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
    <section className="min-h-screen bg-background text-foreground">
      <div className="container py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Asistente visual: objetos y billetes
          </h1>
          <p className="mt-2 text-muted-foreground">
            Detección automática de objetos y billetes peruanos y mexicanos con verificación básica de autenticidad.
          </p>
        </header>

        <Card className="relative overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <video ref={videoRef} className="w-full aspect-video object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <Badge variant="secondary" className="absolute top-3 left-3">
                {isActive ? (isAnalyzing ? 'Analizando…' : 'Detectando…') : 'Preparando…'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">Estado: {status}</p>
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