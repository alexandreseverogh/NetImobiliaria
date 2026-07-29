'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { 
  RocketLaunchIcon, 
  CpuChipIcon, 
  UserGroupIcon, 
  MegaphoneIcon, 
  BuildingOffice2Icon, 
  HeartIcon, 
  LockClosedIcon,
  ChevronRightIcon,
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  ArrowRightIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  BoltIcon,
  ServerStackIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

// Interface para os módulos retornados da API
interface SystemModule {
  id: string
  name: string
  slug: string
  description: string
  icon: string
}

export default function Artemis4LandingPage() {
  const [modules, setModules] = useState<SystemModule[]>([])
  const [loading, setLoading] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const [useVideo, setUseVideo] = useState(true) // Fallback caso YouTube falhe ou sem conexão
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Drawer de navegação no mobile (< lg)
  const [navigating, setNavigating] = useState(false) // Overlay de transição ao entrar na área admin

  // Referências para controle de scroll e seeking
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [scrollPct, setScrollPct] = useState(0)
  const scrollPercentRef = useRef<number>(0)

  // Referências para desligar a simulação instantaneamente no clique de "Entrar" —
  // sem isso, o loop de canvas (rAF 60fps) + o interval da telemetria (postMessage ao
  // iframe do YouTube) continuam disputando a main thread durante a navegação, travando
  // a aba e dando a sensação de "não vai até o vídeo adiantar".
  const rafIdRef = useRef<number | null>(null)
  const telemetryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const simStoppedRef = useRef(false)

  // Mata rAF + interval + player do YouTube num único passo. Idempotente.
  const teardownSimulation = () => {
    simStoppedRef.current = true
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    if (telemetryIntervalRef.current) {
      clearInterval(telemetryIntervalRef.current)
      telemetryIntervalRef.current = null
    }
    try {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy()
      }
    } catch {
      /* best-effort: já estamos saindo da página */
    }
    playerRef.current = null
    if (playerContainerRef.current) {
      try { playerContainerRef.current.innerHTML = '' } catch { /* noop */ }
    }
  }

  // Clique em qualquer CTA "/admin/login": libera a main thread na hora (mata o vídeo/sim)
  // e mostra feedback imediato. NÃO faz preventDefault — o <a> nativo segue navegando.
  const handleEnter = () => {
    setNavigating(true)
    teardownSimulation()
  }

  // Referências do Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  // Referências dos Elementos do HUD Telemetria para Atualização Direta no DOM (60 FPS)
  const velocityRef = useRef<any>(null)
  const altitudeRef = useRef<any>(null)
  const tempRef = useRef<any>(null)
  const gForceRef = useRef<any>(null)
  const phaseRef = useRef<any>(null)
  const signalRef = useRef<any>(null)
  const thermalBarRef = useRef<any>(null)
  const shieldWearRef = useRef<any>(null)
  const missionTimeRef = useRef<any>(null)
  const machRef = useRef<any>(null)

  // 1. Carregar módulos do Banco de Dados através da API pública criada
  useEffect(() => {
    async function fetchModules() {
      try {
        const res = await fetch('/api/public/modules')
        const data = await res.json()
        if (data.success) {
          setModules(data.modules)
        }
      } catch (err) {
        console.error('Erro ao carregar módulos:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchModules()
  }, [])

  // 1.5. Pré-aquece /admin/login assim que a landing monta — a rota vive no route group
  // `admin` (layout pesado) e, em dev, compila sob demanda (~3-10s na 1ª navegação depois
  // de cada restart do servidor). Achado real: a versão anterior deste fix esperava até
  // 4s de ociosidade (requestIdleCallback) antes de disparar — "Entrar" é o 1º CTA visível
  // na tela, então um clique rápido batia o aquecimento na corrida e pagava o compile frio
  // do mesmo jeito. Disparo imediato no mount (fetch de baixíssimo custo, fire-and-forget,
  // não compete de forma perceptível com o vídeo/canvas que a página já carrega) — o clique
  // em "Entrar" pega a rota já morna (~0,3s) mesmo que aconteça em menos de 1s. Em produção
  // é inofensivo (rota já vem pré-compilada no build; só mais um GET de baixa prioridade,
  // sem efeito de "aquecer" nada). Roda uma única vez.
  useEffect(() => {
    fetch('/admin/login', { credentials: 'same-origin' }).catch(() => {})
  }, [])

  // 2. Inicialização do YouTube IFrame Player API
  useEffect(() => {
    if (!useVideo) return

    // Configura timeout de 15s para fallback em caso de falha de conexão/carregamento do YouTube
    const timeoutId = setTimeout(() => {
      if (!playerReady) {
        console.warn('YouTube Player API demorou para responder. Ativando fallback local 3D Canvas...')
        setUseVideo(false)
      }
    }, 15000)

    // Injeta script do YouTube API de forma 100% assíncrona — nunca bloqueia o thread principal
    const loadYoutubeAPI = () => {
      if (typeof window === 'undefined') return

      const w = window as any

      const initPlayer = () => {
        if (!w.YT || !w.YT.Player) return
        if (!playerContainerRef.current) return

        // Limpa o container e adiciona um div com id artemis-youtube-player manualmente para evitar que o React controle esse nó do DOM
        playerContainerRef.current.innerHTML = ''
        const playerDiv = document.createElement('div')
        playerDiv.id = 'artemis-youtube-player'
        playerDiv.className = 'w-full h-full'
        playerContainerRef.current.appendChild(playerDiv)

        try {
          const player = new w.YT.Player('artemis-youtube-player', {
            videoId: 'bxYdG17IeUA',
            playerVars: {
              autoplay: 1,
              mute: 1,
              controls: 0,
              showinfo: 0,
              rel: 0,
              loop: 1,
              playlist: 'bxYdG17IeUA',
              modestbranding: 1,
              playsinline: 1,
              enablejsapi: 1,
              disablekb: 1,
              fs: 0,
              start: 236,
              end: 250
            },
            events: {
              onReady: (event: any) => {
                event.target.mute()
                event.target.playVideo()

                // Garante que o iframe não captura nenhum evento de ponteiro
                const iframe = playerContainerRef.current?.querySelector('iframe')
                if (iframe) {
                  iframe.style.pointerEvents = 'none'
                  iframe.setAttribute('tabindex', '-1')
                }

                // Aguarda 1s para confirmar reprodução e define pronto
                setTimeout(() => {
                  setPlayerReady(true)
                  clearTimeout(timeoutId)
                }, 1000)
              },
              onError: () => {
                console.error('Erro no player do YouTube. Alternando para Canvas 3D.')
                setUseVideo(false)
              }
            }
          })
          playerRef.current = player
        } catch (err) {
          console.error('Falha ao inicializar player:', err)
          setUseVideo(false)
        }
      }

      const injectScriptAndInit = () => {
        if (w.YT && w.YT.Player) {
          initPlayer()
          return
        }

        // Encadeia com callbacks já registrados (múltiplos useEffects possíveis)
        const prevCallback = w.onYouTubeIframeAPIReady
        w.onYouTubeIframeAPIReady = () => {
          if (prevCallback) prevCallback()
          initPlayer()
        }

        if (!w.YT) {
          const tag = document.createElement('script')
          tag.src = 'https://www.youtube.com/iframe_api'
          tag.async = true   // não bloqueia o parser HTML
          tag.defer = true   // executa após o documento ser parseado
          document.head.appendChild(tag)
        }
      }

      // Usa requestIdleCallback quando disponível — o browser escolhe o momento
      // em que o thread principal está ocioso para iniciar o player.
      // Fallback: setTimeout de 2500ms (garante UI 100% interativa antes do vídeo).
      if (typeof (window as any).requestIdleCallback === 'function') {
        ;(window as any).requestIdleCallback(injectScriptAndInit, { timeout: 3000 })
      } else {
        setTimeout(injectScriptAndInit, 2500)
      }
    }

    // Delay inicial: aguarda hidratação + first paint antes de qualquer ação
    const initTimer = setTimeout(loadYoutubeAPI, 500)

    return () => {
      clearTimeout(timeoutId)
      clearTimeout(initTimer)
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy()
        } catch (e) {
          console.error('Erro ao destruir player:', e)
        }
      }
      if (playerContainerRef.current) {
        playerContainerRef.current.innerHTML = ''
      }
    }
  }, [useVideo])

  // 3. Captura do Scroll para controle de Reentrada Atmosférica
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const viewportHeight = window.innerHeight || 800

      // Mapeia o progresso do scroll do topo (0) até o final do primeiro viewport (1)
      const pct = Math.max(0, Math.min(1, scrollY / viewportHeight))
      setScrollPct(pct)
      scrollPercentRef.current = pct
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    // Dispara inicialmente para sincronizar
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 4. Efeitos de Canvas Overlay (Parallax Stars & Interactive Heat Sparks)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Respeita prefers-reduced-motion: suprime as faíscas decorativas (núcleo da simulação permanece)
    const prefersReduced = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let animationFrameId: number
    const rect = canvas.getBoundingClientRect()
    let width = (canvas.width = rect.width || window.innerWidth)
    let height = (canvas.height = rect.height || window.innerHeight)

    // Ajustar tamanho em resize
    const handleResize = () => {
      if (!canvas) return
      const r = canvas.getBoundingClientRect()
      width = canvas.width = r.width || window.innerWidth
      height = canvas.height = r.height || window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Configuração do mouse
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.targetX = e.clientX - rect.left - width / 2
      mouseRef.current.targetY = e.clientY - rect.top - height / 2
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Classe para partículas de plasma / fogo de atrito térmico
    class PlasmaParticle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      maxLife: number
      life: number
      color: string
      glow: number
      history: { x: number; y: number }[]

      constructor(startX: number, startY: number, angle: number, speed: number) {
        this.x = startX
        this.y = startY
        // Espalhamento em direção oposta à velocidade orbital da reentrada (subindo em ângulo para a direita/cima)
        const spread = (Math.random() - 0.5) * 0.5
        this.vx = Math.cos(angle + spread) * speed + (Math.random() - 0.5) * 2.0
        this.vy = Math.sin(angle + spread) * speed + (Math.random() - 0.5) * 2.0
        this.size = Math.random() * 5 + 1.2
        this.maxLife = Math.random() * 35 + 15
        this.life = this.maxLife
        this.history = []
        
        // Cores realistas de plasma ionizado
        const rand = Math.random()
        if (rand < 0.2) {
          this.color = 'rgba(255, 255, 255, ' // Núcleo superaquecido
          this.glow = 18
        } else if (rand < 0.45) {
          this.color = 'rgba(253, 224, 71, '  // Amarelo
          this.glow = 12
        } else if (rand < 0.75) {
          this.color = 'rgba(249, 115, 22, '  // Laranja de fricção
          this.glow = 10
        } else if (rand < 0.92) {
          this.color = 'rgba(236, 72, 153, '  // Rosa/Magenta ionizado de reentrada
          this.glow = 15
        } else {
          this.color = 'rgba(239, 68, 68, '   // Vermelho de resfriamento
          this.glow = 8
        }
      }

      update() {
        this.history.push({ x: this.x, y: this.y })
        if (this.history.length > 5) {
          this.history.shift()
        }
        this.x += this.vx
        this.y += this.vy
        this.vx *= 0.98
        this.vy *= 0.98
        this.life--
      }

      draw(c: CanvasRenderingContext2D) {
        const opacity = this.life / this.maxLife
        
        // Se o vídeo estiver ativo, desenha um rastro em linha para compensar a ausência do fillRect com alpha
        if (useVideo && this.history.length > 1) {
          c.save()
          c.beginPath()
          c.moveTo(this.history[0].x, this.history[0].y)
          for (let i = 1; i < this.history.length; i++) {
            c.lineTo(this.history[i].x, this.history[i].y)
          }
          c.strokeStyle = this.color + (opacity * 0.35) + ')'
          c.lineWidth = this.size * 1.5 * opacity
          c.lineCap = 'round'
          c.stroke()
          c.restore()
        }

        c.save()
        c.shadowBlur = this.glow * opacity
        c.shadowColor = this.color.includes('236') 
          ? '#ec4899' 
          : this.color.includes('253') 
            ? '#fde047' 
            : this.color.includes('249') 
              ? '#f97316' 
              : '#ef4444'
        c.fillStyle = this.color + opacity + ')'
        c.beginPath()
        c.arc(this.x, this.y, this.size * opacity, 0, Math.PI * 2)
        c.fill()
        c.restore()
      }
    }

    // Estrelas distantes para o espaço profundo
    const stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = []
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.3 + 0.3,
        speed: Math.random() * 0.25 + 0.05,
        opacity: Math.random() * 0.8 + 0.2
      })
    }

    const particles: PlasmaParticle[] = []
    let frame = 0

    // Loop principal da física e atualização de telemetria em tempo real
    const render = () => {
      // Parada dura (clique em "Entrar"): não reagenda o próximo frame.
      if (simStoppedRef.current) return
      frame++
      
      const p = scrollPercentRef.current

      if (useVideo) {
        // Se o vídeo estiver ativo, limpa o canvas transparentemente para revelar o YouTube por baixo
        ctx.clearRect(0, 0, width, height)
      } else {
        // Se for fallback, limpa com fundo escuro e efeito de rastro
        ctx.fillStyle = 'rgba(2, 6, 23, 0.2)'
        ctx.fillRect(0, 0, width, height)

        // 🌌 A. DESENHAR ESTRELAS (Aceleram sutilmente com base no scroll) - APENAS NO FALLBACK
        ctx.save()
        const starSpeedMult = 1.0 + p * 5.0 // Drift estelar acelera na reentrada rápida
        stars.forEach(star => {
          // Estrelas viajam para trás sutilmente (para a direita/cima)
          star.x += star.speed * starSpeedMult * 0.8
          star.y -= star.speed * starSpeedMult * 0.5
          if (star.x > width) {
            star.x = 0
            star.y = Math.random() * height
          }
          if (star.y < 0) {
            star.y = height
            star.x = Math.random() * width
          }
          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.restore()
      }

      // B. SE ESTIVER NO MODO FALLBACK (Sem vídeo do YouTube):
      // Desenhar a Terra curvada no canto inferior esquerdo e o Módulo Orion cinemático em Canvas 3D
      if (!useVideo) {
        // 🌍 Desenhar planeta Terra
        const earthCenterX = width * 0.2
        const earthCenterY = height * 1.65
        const earthRadius = height * 1.0

        ctx.save()
        const earthGrad = ctx.createRadialGradient(
          earthCenterX, earthCenterY, earthRadius * 0.3,
          earthCenterX, earthCenterY, earthRadius
        )
        earthGrad.addColorStop(0, '#030712')
        earthGrad.addColorStop(0.7, '#070f2e')
        earthGrad.addColorStop(0.92, '#1d4ed8') // Reflexo atmosférico azul profundo
        earthGrad.addColorStop(0.97, '#3b82f6') // Horizon glow brilhante
        earthGrad.addColorStop(1, '#93c5fd')   // Limite iluminado

        ctx.beginPath()
        ctx.arc(earthCenterX, earthCenterY, earthRadius, 0, Math.PI * 2)
        ctx.fillStyle = earthGrad
        ctx.fill()

        // Atmosfera fina e brilhante
        const atmosGrad = ctx.createRadialGradient(
          earthCenterX, earthCenterY, earthRadius * 0.95,
          earthCenterX, earthCenterY, earthRadius * 1.04
        )
        atmosGrad.addColorStop(0, 'rgba(59, 130, 246, 0.4)')
        atmosGrad.addColorStop(0.5, 'rgba(147, 197, 253, 0.25)')
        atmosGrad.addColorStop(1, 'rgba(56, 189, 248, 0)')
        ctx.beginPath()
        ctx.arc(earthCenterX, earthCenterY, earthRadius * 1.04, 0, Math.PI * 2)
        ctx.fillStyle = atmosGrad
        ctx.fill()
        ctx.restore()

        // 🛡️ Desenhar cápsula Orion (Posição baseada em mouse + oscilação leve)
        const mouse = mouseRef.current
        mouse.x += (mouse.targetX - mouse.x) * 0.05
        mouse.y += (mouse.targetY - mouse.y) * 0.05

        const capsuleX = width * 0.65 + mouse.x * 0.3
        const capsuleY = height * 0.4 + mouse.y * 0.3 + Math.sin(frame * 0.04) * 2.5
        const baseAngle = 5 * Math.PI / 4 // 225 graus mirando a Terra
        const pitch = mouse.x * 0.0002
        const reentryAngle = baseAngle + pitch

        // Bow Shock Wave de Plasma (Capa de calor frontal)
        const shockGrad = ctx.createRadialGradient(25, 0, 5, 20, 0, 42)
        shockGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
        shockGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.85)') // Amarelo
        shockGrad.addColorStop(0.6, 'rgba(249, 115, 22, 0.8)')  // Laranja
        shockGrad.addColorStop(0.9, 'rgba(236, 72, 153, 0.55)') // Rosa ionizado
        shockGrad.addColorStop(1, 'rgba(220, 38, 38, 0)')       // Fim do brilho

        ctx.save()
        ctx.translate(capsuleX, capsuleY)
        ctx.rotate(reentryAngle)
        ctx.beginPath()
        ctx.arc(28, 0, 32, -Math.PI / 2, Math.PI / 2)
        ctx.lineWidth = 12
        ctx.strokeStyle = shockGrad
        ctx.stroke()
        ctx.restore()

        // Fuselagem cônica da Orion
        ctx.save()
        ctx.translate(capsuleX, capsuleY)
        ctx.rotate(reentryAngle)
        
        // Tremor de reentrada térmica proporcional ao calor (pico em 0.45 de scroll)
        const pTemp = 1.0 - Math.pow((p - 0.45) / 0.45, 2)
        const shakeIntensity = 0.5 + Math.max(0, pTemp) * 2.0
        ctx.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity)

        const metalGrad = ctx.createLinearGradient(-25, -20, 25, 20)
        metalGrad.addColorStop(0, '#090d16')
        metalGrad.addColorStop(0.4, '#1e293b')
        metalGrad.addColorStop(0.75, '#475569')
        metalGrad.addColorStop(1, '#64748b')

        ctx.beginPath()
        ctx.moveTo(22, -25)
        ctx.quadraticCurveTo(25, 0, 22, 25)
        ctx.lineTo(-18, 14)
        ctx.quadraticCurveTo(-22, 0, -18, -14)
        ctx.lineTo(22, -25)
        ctx.closePath()
        ctx.fillStyle = metalGrad
        ctx.fill()

        // Escudo com glow vermelho/laranja incandescente
        const carbonGlow = ctx.createLinearGradient(20, -25, 22, 25)
        carbonGlow.addColorStop(0, '#ef4444')
        carbonGlow.addColorStop(0.5, '#fde047')
        carbonGlow.addColorStop(1, '#f97316')
        ctx.beginPath()
        ctx.moveTo(22, -25)
        ctx.quadraticCurveTo(25, 0, 22, 25)
        ctx.strokeStyle = carbonGlow
        ctx.lineWidth = 3
        ctx.stroke()

        // Visores de comando brilhantes
        ctx.fillStyle = '#e0f2fe'
        ctx.beginPath()
        ctx.arc(3, -6, 2.5, 0, Math.PI * 2)
        ctx.arc(3, 6, 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // C. INTERATIVE SPARK EMITTER (Sempre ativa, overlay no vídeo ou autônoma)
      // As partículas fluem a partir da posição média da cápsula (canto central/direito)
      const capVirtualX = width * 0.65 + (mouseRef.current.x * 0.3)
      const capVirtualY = height * 0.4 + (mouseRef.current.y * 0.3)
      
      // Gera faíscas dinâmicas se o scroll estiver na fase de reentrada ativa - Apenas no Fallback Offline
      if (!useVideo && p > 0.02 && !prefersReduced) {
        const spawnCount = Math.round(p * 5 + 1) // Quanto mais profundo, mais faíscas
        for (let i = 0; i < spawnCount; i++) {
          // As partículas viajam de volta (direção oposta à reentrada: aprox. 45 graus)
          const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.9
          const speed = Math.random() * 7 + 4
          particles.push(new PlasmaParticle(
            capVirtualX + (Math.random() - 0.5) * 20 - 15,
            capVirtualY + (Math.random() - 0.5) * 20 - 10,
            angle,
            speed
          ))
        }
      }

      // Desenha e limpa partículas
      for (let i = particles.length - 1; i >= 0; i--) {
        const part = particles[i]
        part.update()
        if (part.life <= 0 || part.x > width + 20 || part.y < -20) {
          particles.splice(i, 1)
        } else {
          part.draw(ctx)
        }
      }

      animationFrameId = rafIdRef.current = requestAnimationFrame(render)
    }

    // Atrasa 300ms para permitir interatividade antes de iniciar o loop de canvas
    const canvasStartTimer = setTimeout(() => render(), 300)

    return () => {
      clearTimeout(canvasStartTimer)
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [useVideo])

  // 5. Loop do LERP de Seek e atualização da Telemetria HUD no DOM (Alta Performance)
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined
    let lastSeek = 0

    const updateTelemetryDOM = () => {
      const p = scrollPercentRef.current

      // Cálculos Matemáticos e Físicos Coerentes com o Voo do Vídeo original
      const velocity = Math.round(27850 - p * (27850 - 7420))
      const altitude = (122.4 - p * (122.4 - 38.1)).toFixed(1)
      const mach = (velocity / 1225).toFixed(1)
      
      // Curva de temperatura (pico em 0.45 de progresso, simulando pico de atrito do vídeo ~4:30)
      const pTemp = 1.0 - Math.pow((p - 0.45) / 0.45, 2)
      const temp = Math.round(420 + Math.max(0, pTemp) * (2250 - 420))
      
      // Curva de G-Force (pico em 0.45 de progresso)
      const pG = 1.0 - Math.pow((p - 0.45) / 0.45, 2)
      const gForce = (1.0 + Math.max(0, pG) * 5.8).toFixed(1)
      
      const shieldWear = Math.round(100 - p * 16)
      const elapsed = Math.round(p * 14) // 14 segundos de duração do trecho exato

      // Atenuação e apagão térmico de sinal (entre 22% e 68% do progresso de reentrada)
      let signal = 100
      let isBlackout = false
      if (p > 0.22 && p < 0.68) {
        const fadeOutDist = 0.08
        if (p < 0.22 + fadeOutDist) {
          signal = Math.round(100 * (1 - (p - 0.22) / fadeOutDist))
        } else if (p > 0.68 - fadeOutDist) {
          signal = Math.round(100 * ((p - (0.68 - fadeOutDist)) / fadeOutDist))
        } else {
          signal = 0
          isBlackout = true
        }
      }

      // Estágios das fases de voo
      let phaseText = "INÍCIO DA REENTRADA (E.I.)"
      if (p > 0.05 && p <= 0.22) {
        phaseText = "CONTATO ATMOSFÉRICO INICIAL"
      } else if (p > 0.22 && p <= 0.68) {
        phaseText = "MÁXIMO BLOQUEIO TÉRMICO (PLASMA)"
      } else if (p > 0.68 && p <= 0.88) {
        phaseText = "RESFRIAMENTO E DESACELERAÇÃO"
      } else if (p > 0.88) {
        phaseText = "VÔO SUBSÔNICO SEGURO"
      }

      // Atualização Direta no DOM sem Re-renders do React
      if (velocityRef.current) velocityRef.current.innerText = `${velocity.toLocaleString('pt-BR')} km/h`
      if (altitudeRef.current) altitudeRef.current.innerText = `${altitude} km`
      if (machRef.current) machRef.current.innerText = `Mach ${mach}`
      if (tempRef.current) tempRef.current.innerText = `${temp}°C`
      if (gForceRef.current) gForceRef.current.innerText = `${gForce} G`
      if (phaseRef.current) phaseRef.current.innerText = phaseText
      if (shieldWearRef.current) shieldWearRef.current.innerText = `${shieldWear}%`
      if (missionTimeRef.current) missionTimeRef.current.innerText = `T+ ${elapsed}s`

      if (signalRef.current) {
        if (isBlackout) {
          signalRef.current.innerText = "SINAL PERDIDO - APAGÃO TÉRMICO"
          signalRef.current.className = "text-red-500 font-extrabold animate-pulse text-[10px]"
        } else {
          signalRef.current.innerText = `LINK DE TELEMETRIA: ${signal}%`
          signalRef.current.className = "text-blue-400 font-bold text-[10px]"
        }
      }

      if (thermalBarRef.current) {
        thermalBarRef.current.style.width = `${(temp / 2250) * 100}%`
        if (temp > 1800) {
          thermalBarRef.current.style.background = 'linear-gradient(to right, #ef4444, #b91c1c)'
        } else if (temp > 1000) {
          thermalBarRef.current.style.background = 'linear-gradient(to right, #f97316, #ef4444)'
        } else {
          thermalBarRef.current.style.background = 'linear-gradient(to right, #3b82f6, #f97316)'
        }
      }
    }

    const tick = () => {
      const player = playerRef.current
      if (player && playerReady && useVideo) {
        try {
          // Mantém o loop do trecho 3:56–4:10 com DEBOUNCE: no máximo 1 seekTo/seg.
          // Sem isso, durante o buffering inicial o seekTo era chamado a 60fps,
          // inundando o iframe do YouTube com postMessage e travando a main thread
          // "até o vídeo adiantar" (clique em 'Entrar' ficava na fila por segundos).
          const currentTime = player.getCurrentTime();
          const now = Date.now();
          if (now - lastSeek > 1000 && (currentTime >= 249.5 || (currentTime > 0 && currentTime < 235))) {
            player.seekTo(236, true);
            lastSeek = now;
          }
        } catch (e) {
          console.error('Erro no monitoramento do YouTube Player:', e)
        }
      }

      // Telemetria é texto/HUD — ~7fps é imperceptível e libera a main thread
      // para responder a cliques imediatamente.
      updateTelemetryDOM()
    }

    // Atrasa 700ms — sincronizado com o delay do YouTube para não competir
    // com a hidratação inicial do React e o carregamento da página.
    const telemetryStartTimer = setTimeout(() => {
      tick()
      intervalId = setInterval(tick, 150)
      telemetryIntervalRef.current = intervalId
    }, 700)

    return () => {
      clearTimeout(telemetryStartTimer)
      if (intervalId) clearInterval(intervalId)
    }
  }, [playerReady, useVideo])

  // Helper para mapeamento de ícones na UI (fallback se a imagem IA carregar lento)
  const renderIcon = (slug: string) => {
    switch (slug) {
      case 'adm-provisionado':
        return <CpuChipIcon className="w-8 h-8 text-blue-400" />
      case 'crm':
        return <UserGroupIcon className="w-8 h-8 text-amber-500" />
      case 'cadastros':
        return <LockClosedIcon className="w-8 h-8 text-purple-400" />
      case 'gestao-campanhas':
        return <MegaphoneIcon className="w-8 h-8 text-emerald-400" />
      case 'imobiliario':
        return <BuildingOffice2Icon className="w-8 h-8 text-cyan-400" />
      case 'saude':
        return <HeartIcon className="w-8 h-8 text-rose-500" />
      default:
        return <RocketLaunchIcon className="w-8 h-8 text-indigo-400" />
    }
  }

  // Cores de borda e sombra neon baseadas no módulo
  const getThemeClasses = (slug: string) => {
    switch (slug) {
      case 'adm-provisionado':
        return { border: 'hover:border-blue-500/50', shadow: 'hover:shadow-blue-500/10', text: 'text-blue-400' }
      case 'crm':
        return { border: 'hover:border-amber-500/50', shadow: 'hover:shadow-amber-500/10', text: 'text-amber-400' }
      case 'cadastros':
        return { border: 'hover:border-purple-500/50', shadow: 'hover:shadow-purple-500/10', text: 'text-purple-400' }
      case 'gestao-campanhas':
        return { border: 'hover:border-emerald-500/50', shadow: 'hover:shadow-emerald-500/10', text: 'text-emerald-400' }
      case 'imobiliario':
        return { border: 'hover:border-cyan-500/50', shadow: 'hover:shadow-cyan-500/10', text: 'text-cyan-400' }
      case 'saude':
        return { border: 'hover:border-rose-500/50', shadow: 'hover:shadow-rose-500/10', text: 'text-rose-400' }
      default:
        return { border: 'hover:border-indigo-500/50', shadow: 'hover:shadow-indigo-500/10', text: 'text-indigo-400' }
    }
  }

  // Opacidade dinâmica para fazer o Hero inicial desaparecer suavemente no início da rolagem
  const heroOpacity = Math.max(0, 1 - scrollPct * 3.5)
  const heroTranslate = `translateY(${-scrollPct * 80}px)`

  // Opacidade dinâmica para exibir o HUD de telemetria apenas quando a reentrada inicia
  let hudOpacity = 0
  if (scrollPct > 0.02 && scrollPct < 0.88) {
    if (scrollPct < 0.15) {
      hudOpacity = (scrollPct - 0.02) / 0.13
    } else {
      hudOpacity = 1
    }
  } else if (scrollPct >= 0.88) {
    hudOpacity = Math.max(0, 1 - (scrollPct - 0.88) / 0.12)
  }

  return (
    <div className="artemis4-page min-h-screen relative flex flex-col justify-between">

      {/* Overlay de transição — feedback instantâneo ao clicar em "Entrar" enquanto a
          área administrativa carrega (a simulação já foi desligada em handleEnter). */}
      {navigating && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#020617]/95 backdrop-blur-xl">
          <div className="w-12 h-12 rounded-full border-2 border-amber-300/30 border-t-amber-400 animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-200/90 italic">
            Acessando área administrativa…
          </p>
        </div>
      )}

      {/* Acessibilidade: respeita prefers-reduced-motion desativando animações decorativas do DOM */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .artemis4-page .animate-ping,
          .artemis4-page .animate-pulse,
          .artemis4-page .animate-bounce { animation: none !important; }
          .artemis4-page * { scroll-behavior: auto !important; }
        }
      `}</style>

      {/* ==========================================
          HEADER SECTION (Horizontal - Landpaging Copy)
          ========================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#020617]/70 border-b border-amber-300/10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo Artemis4 — imagem da pasta public */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="relative rounded-xl ring-1 ring-amber-300/20 shadow-[0_0_25px_-8px_rgba(212,175,55,0.45)] overflow-hidden">
                <img
                  src="/Artemis4.jpg"
                  alt="Artemis4"
                  className="h-12 w-auto object-contain"
                  draggable={false}
                />
              </div>
              <div className="hidden md:flex flex-col leading-none border-l border-amber-300/15 pl-3">
                <span className="text-[8px] font-black uppercase tracking-[0.35em] text-amber-300/80">Atmosfera</span>
                <span className="text-[8px] font-black uppercase tracking-[0.35em] text-gray-400">de Negócios</span>
              </div>
            </div>

            {/* Menu Horizontal Superior - IDÊNTICO ao Landpaging */}
            <nav className="hidden lg:flex space-x-1 items-center justify-center flex-1 px-8">
              <Link href="/" className="relative text-gray-300 hover:text-amber-100 px-4 py-3.5 text-xs font-black uppercase tracking-wider italic transition-all touch-manipulation rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] after:absolute after:left-4 after:right-4 after:bottom-1.5 after:h-px after:bg-gradient-to-r after:from-amber-300/0 after:via-amber-300/80 after:to-amber-300/0 after:scale-x-0 hover:after:scale-x-100 after:origin-center after:transition-transform after:duration-300">
                Início
              </Link>
              <Link href="/tokenizacao" className="relative text-gray-300 hover:text-amber-100 px-4 py-3.5 text-xs font-black uppercase tracking-wider italic transition-all touch-manipulation rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] after:absolute after:left-4 after:right-4 after:bottom-1.5 after:h-px after:bg-gradient-to-r after:from-amber-300/0 after:via-amber-300/80 after:to-amber-300/0 after:scale-x-0 hover:after:scale-x-100 after:origin-center after:transition-transform after:duration-300">
                Tokenização
              </Link>
              <Link href="/imoveis" className="relative text-gray-300 hover:text-amber-100 px-4 py-3.5 text-xs font-black uppercase tracking-wider italic transition-all touch-manipulation rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] after:absolute after:left-4 after:right-4 after:bottom-1.5 after:h-px after:bg-gradient-to-r after:from-amber-300/0 after:via-amber-300/80 after:to-amber-300/0 after:scale-x-0 hover:after:scale-x-100 after:origin-center after:transition-transform after:duration-300">
                Imóveis
              </Link>
              <Link href="/investidor" className="relative text-gray-300 hover:text-amber-100 px-4 py-3.5 text-xs font-black uppercase tracking-wider italic transition-all touch-manipulation rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] after:absolute after:left-4 after:right-4 after:bottom-1.5 after:h-px after:bg-gradient-to-r after:from-amber-300/0 after:via-amber-300/80 after:to-amber-300/0 after:scale-x-0 hover:after:scale-x-100 after:origin-center after:transition-transform after:duration-300">
                Investidor
              </Link>
              <Link href="/sobre" className="relative text-gray-300 hover:text-amber-100 px-4 py-3.5 text-xs font-black uppercase tracking-wider italic transition-all touch-manipulation rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] after:absolute after:left-4 after:right-4 after:bottom-1.5 after:h-px after:bg-gradient-to-r after:from-amber-300/0 after:via-amber-300/80 after:to-amber-300/0 after:scale-x-0 hover:after:scale-x-100 after:origin-center after:transition-transform after:duration-300">
                Sobre
              </Link>
              <Link href="/contato" className="relative text-gray-300 hover:text-amber-100 px-4 py-3.5 text-xs font-black uppercase tracking-wider italic transition-all touch-manipulation rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] after:absolute after:left-4 after:right-4 after:bottom-1.5 after:h-px after:bg-gradient-to-r after:from-amber-300/0 after:via-amber-300/80 after:to-amber-300/0 after:scale-x-0 hover:after:scale-x-100 after:origin-center after:transition-transform after:duration-300">
                Contato
              </Link>
            </nav>

            {/* Contatos / Login (Aponta para /admin/login) */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="hidden xl:flex items-center gap-5 text-xs text-gray-400 border-r border-white/10 pr-6">
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-amber-400/80" />
                  <span className="font-semibold">(81) 99800-0047</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-amber-400/80" />
                  <span className="font-semibold">Recife, PE</span>
                </div>
              </div>

              <a
                href="/admin/login"
                onClick={handleEnter}
                className="relative overflow-hidden group px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider italic transition-all touch-manipulation shadow-lg shadow-amber-500/25 ring-1 ring-amber-200/40 hover:shadow-amber-400/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
              >
                <span className="relative z-10">Entrar</span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-200 to-amber-400 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 z-0" />
              </a>

              {/* Botão hambúrguer — navegação mobile (< lg) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileMenuOpen}
                className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-white/10 bg-white/[0.04] text-white hover:text-amber-100 hover:border-amber-300/30 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
              >
                {mobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================
            DRAWER DE NAVEGAÇÃO MOBILE (< lg)
            ========================================== */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-amber-300/10 bg-[#020617]/95 backdrop-blur-xl">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-1">
              {[
                { href: '/', label: 'Início' },
                { href: '/tokenizacao', label: 'Tokenização' },
                { href: '/imoveis', label: 'Imóveis' },
                { href: '/investidor', label: 'Investidor' },
                { href: '/sobre', label: 'Sobre' },
                { href: '/contato', label: 'Contato' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider italic text-gray-300 hover:text-amber-100 hover:bg-amber-300/5 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
                >
                  {item.label}
                  <ChevronRightIcon className="w-4 h-4 opacity-50" />
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* ==========================================
          🚀 INTERACTIVE REENTRY SIMULATOR STAGE (Natural Scroll View)
          ========================================== */}
      <div className="relative w-full h-[100dvh] overflow-hidden bg-transparent flex flex-col justify-between pt-20 z-10">
          
          {/* CINEMATIC BG VIDEO (YouTube ou Fallback Canvas) - FIXED TO THE VIEWPORT */}
          {useVideo ? (
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-90 select-none" style={{ zIndex: -1 }} inert={'' as any}>
              {/* O player do YouTube é redimensionado e escalado para 1.35x para remover barras, títulos e logos do YT */}
              <div className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-screen min-w-[177.77vh] transform -translate-x-1/2 -translate-y-1/2 scale-[1.35] pointer-events-none">
                <div ref={playerContainerRef} className="w-full h-full pointer-events-none" />
              </div>
              {/* Overlays de vinheta futurista e cores para mesclagem premium com o tema dark */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/50" />
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#020617]/40 to-[#020617]/95" />
            </div>
          ) : (
            // Fallback de Espaço Profundo em caso do YouTube falhar
            <div className="fixed inset-0 z-0 bg-[#020617] pointer-events-none">
              <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[160px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-950/15 blur-[180px]" />
            </div>
          )}

          {/* Canvas interativo sobreposto para faíscas térmicas e estrelas parallax - FIXED TO THE VIEWPORT */}
          <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-10 pointer-events-none" />

          {/* ==========================================
              A. HERO CONTENT (Desaparece gradualmente ao rolar)
              ========================================== */}
          <div 
            style={{ opacity: heroOpacity, transform: heroTranslate, transition: 'transform 0.1s ease-out' }}
            className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto pointer-events-auto"
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-amber-300/25 bg-gradient-to-r from-amber-950/30 via-slate-950/50 to-amber-950/30 backdrop-blur-md mb-8 shadow-[0_0_30px_-10px_rgba(212,175,55,0.4)]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-200/90">
                Pressione Scroll para Iniciar Reentrada
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-7xl font-bold uppercase tracking-tight text-white mb-6 italic leading-[0.95]">
              TECNOLOGIA DE ALTA PERFORMANCE <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-[#f5e6b8] to-amber-400 drop-shadow-[0_2px_20px_rgba(212,175,55,0.25)]">
                PLATAFORMA ARTEMIS 4
              </span>
            </h1>

            <p className="max-w-3xl text-sm md:text-lg text-gray-300 font-medium mb-10 leading-relaxed drop-shadow-md">
              A <span className="text-amber-200 font-bold">atmosfera de negócios</span> onde sua operação entra em órbita: um ecossistema de gestão multissegmentada de alta performance. Role para explorar a reentrada atmosférica em tempo real e descubra nossos módulos.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a
                href="#modulos"
                className="px-8 py-4.5 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 font-black uppercase tracking-wider italic text-xs shadow-xl shadow-amber-500/25 ring-1 ring-amber-200/40 hover:scale-[1.03] hover:shadow-amber-400/40 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] flex items-center gap-2"
              >
                Ver Módulos <ChevronRightIcon className="w-4 h-4 mt-0.5" />
              </a>
              <a
                href="/admin/login"
                onClick={handleEnter}
                className="px-8 py-4.5 rounded-2xl bg-white/[0.04] hover:bg-amber-300/5 text-white hover:text-amber-100 font-black uppercase tracking-wider italic text-xs border border-white/10 hover:border-amber-300/30 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
              >
                Área de Testes
              </a>
            </div>
            
            {/* Scroll Down mouse hint */}
            <div className="absolute bottom-6 flex flex-col items-center gap-1.5 opacity-60">
              <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase italic">Role para Baixo</span>
              <div className="w-5 h-9 rounded-full border-2 border-gray-400 flex justify-center p-1">
                <div className="w-1 h-2 rounded-full bg-gray-400 animate-bounce" />
              </div>
            </div>
          </div>

          {/* ==========================================
              B. SCI-FI HUD TELEMETRIA (Exibido no scroll)
              ========================================== */}
          <div 
            style={{ opacity: hudOpacity, transition: 'opacity 0.4s ease-in-out' }}
            className="absolute inset-x-0 bottom-0 top-20 z-20 p-4 sm:p-8 flex flex-col justify-between pointer-events-none"
          >
            
            {/* HUD: TOPO (Status & Relógio) */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start w-full">
              {/* Painel Esquerdo: Missão e Alerta */}
              <div className="relative bg-gradient-to-b from-slate-900/70 to-slate-950/85 border border-white/10 rounded-2xl p-4 backdrop-blur-2xl ring-1 ring-inset ring-white/[0.06] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-300/30 before:to-transparent w-full sm:w-auto sm:min-w-[240px] shadow-[0_10px_40px_-12px_rgba(0,0,0,0.7)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[10px] font-black tracking-widest text-red-400 uppercase italic">TELEMETRIA ATIVA</span>
                </div>
                <div className="text-sm font-black uppercase tracking-tight italic text-white leading-none mb-1">
                  ARTEMIS-IV / REENTRY
                </div>
                <div className="text-[9px] font-bold text-gray-400 tracking-wider">
                  SEQ: <span ref={missionTimeRef} className="text-white font-black tabular-nums">E.I. + 0s</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/5">
                  <div ref={phaseRef} className="text-xs font-black uppercase text-blue-400 tracking-tighter italic">
                    INÍCIO DA REENTRADA
                  </div>
                </div>
              </div>

              {/* Painel Direito: Velocidade e Mach */}
              <div className="relative bg-gradient-to-b from-slate-900/70 to-slate-950/85 border border-white/10 rounded-2xl p-4 backdrop-blur-2xl ring-1 ring-inset ring-white/[0.06] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-300/30 before:to-transparent w-full sm:w-auto sm:min-w-[240px] text-right shadow-[0_10px_40px_-12px_rgba(0,0,0,0.7)]">
                <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase block mb-1">VELOCIDADE ORBITAL</span>
                <span ref={velocityRef} className="text-2xl font-black italic tracking-tighter text-white block leading-none tabular-nums">
                  27.850 km/h
                </span>
                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-white/5">
                  <span ref={machRef} className="text-[10px] font-extrabold text-blue-400 tracking-wider italic tabular-nums">Mach 22.7</span>
                  <span ref={altitudeRef} className="text-xs font-black text-white italic tabular-nums">122.4 km</span>
                </div>
              </div>
            </div>

            {/* HUD: CENTRO-INFERIOR (Prompt de Controle) */}
            <div className="relative text-center w-full max-w-sm mx-auto mb-4 bg-gradient-to-b from-slate-900/65 to-slate-950/80 border border-white/10 rounded-2xl p-3 backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-300/25 before:to-transparent">
              <span className="text-[9px] font-black tracking-widest text-amber-300/90 uppercase block mb-1.5">CONTROLES DE ATITUDE</span>
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-300">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> AERO-RUDDER: AUT</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> RCS-JET: STBY</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> PARACHUTE: ARM</span>
              </div>
            </div>

            {/* HUD: BASE (Escudo Térmico & Sinal) */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4 w-full">
              
              {/* Esquerdo: Temperatura do Escudo com barra */}
              <div className="relative bg-gradient-to-b from-slate-900/70 to-slate-950/85 border border-white/10 rounded-2xl p-4 backdrop-blur-2xl ring-1 ring-inset ring-white/[0.06] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-300/30 before:to-transparent flex-1 max-w-md shadow-[0_10px_40px_-12px_rgba(0,0,0,0.7)]">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">TEMPERATURA DO ESCUDO DE CARBONO</span>
                  <span ref={tempRef} className="text-lg font-black text-orange-400 italic tabular-nums">420°C</span>
                </div>
                
                {/* Barra Térmica Dinâmica */}
                <div className="w-full h-2.5 rounded-full bg-black/40 ring-1 ring-inset ring-white/5 overflow-hidden mb-2">
                  <div ref={thermalBarRef} className="h-full rounded-full transition-all duration-75" style={{ width: '18%', background: 'linear-gradient(to right, #3b82f6, #f97316)' }} />
                </div>
                
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                  <span>DESGASTE ABLATIVO: <span ref={shieldWearRef} className="text-white tabular-nums">100%</span></span>
                  <span>CARGA G: <span ref={gForceRef} className="text-white tabular-nums">1.0 G</span></span>
                </div>
              </div>

              {/* Direito: Link de Comunicação */}
              <div className="relative bg-gradient-to-b from-slate-900/70 to-slate-950/85 border border-white/10 rounded-2xl p-4 backdrop-blur-2xl ring-1 ring-inset ring-white/[0.06] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-300/30 before:to-transparent w-full sm:w-auto sm:min-w-[260px] text-right flex flex-col justify-center shadow-[0_10px_40px_-12px_rgba(0,0,0,0.7)]">
                <span ref={signalRef} className="text-blue-400 font-extrabold text-[10px] tracking-widest block uppercase mb-1">
                  LINK DE TELEMETRIA: 100%
                </span>
                <span className="text-[9px] font-bold text-gray-400 tracking-wider">
                  LINK: DEEP SPACE NETWORK Recife
                </span>
              </div>
            </div>

          </div>

        </div>

      {/* ==========================================
          HERO OVERLAY AND EXTRA GRAPHIC LAYER 
          (Preenche transição sutil antes do grid)
          ========================================== */}
      <div className="relative z-20 w-full bg-[#020617]/75 backdrop-blur-xl border-t border-white/5">
        
        {/* ==========================================
            MODULES SHOWCASE SECTION (SEMRush Inspired Grid)
            ========================================== */}
        <section id="modulos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-20 scroll-mt-20">
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-300/20 bg-amber-950/20 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-200/90">Alta Performance Multissegmento</span>
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl font-bold uppercase tracking-tight text-white italic">
                Nossos Módulos de Operação
              </h2>
            </div>
            <p className="max-w-md text-sm text-gray-400 leading-relaxed font-medium">
              A arquitetura cibernética da Artemis4 foi estruturada para centralizar o controle de operações em grandes portais imobiliários, incorporadoras, telemedicina e hubs de marketing.
            </p>
          </div>

          {/* Renderização condicional para carregamento da API */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-3xl p-6 h-[420px]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {modules.map((mod) => {
                const theme = getThemeClasses(mod.slug)
                return (
                  <div 
                    key={mod.id}
                    className={`group relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-gradient-to-b from-slate-900/60 to-slate-950/60 backdrop-blur-xl p-6 transition-all duration-500 hover:-translate-y-2.5 hover:shadow-2xl flex flex-col justify-between ${theme.border} ${theme.shadow}`}
                  >
                    <div>
                      {/* Imagem conceitual abstract 3D (gerada por IA) */}
                      <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-6 bg-slate-900 border border-white/5 group-hover:border-white/10 transition-colors">
                        <img
                          src={`/assets/artemis/${mod.slug}.png`}
                          alt={mod.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => {
                            // Oculta e permite que o fallback visual trabalhe
                            (e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                        {/* Camada de gradient overlay para fusão estética */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                        
                        {/* Ícone flutuante do Módulo */}
                        <div className="absolute bottom-3 left-3 p-2 bg-slate-900/90 backdrop-blur rounded-xl border border-white/10 shadow-lg">
                          {renderIcon(mod.slug)}
                        </div>
                      </div>

                      {/* Nome do Módulo */}
                      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight italic text-white mb-3 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                        {mod.name}
                      </h3>

                      {/* Descrição Técnica da Tabela de Módulos */}
                      <p className="text-xs text-gray-400 leading-relaxed font-medium mb-6 min-h-[48px]">
                        {mod.description || 'Solução modular integrada com controle de processos em tempo real e barramento central de microsserviços.'}
                      </p>
                    </div>

                    {/* CTA direcionando ao Login / Admin */}
                    <div>
                      <a
                        href="/admin/login"
                        onClick={handleEnter}
                        className="w-full py-3.5 rounded-2xl bg-white/5 group-hover:bg-blue-600/10 border border-white/10 group-hover:border-blue-500/20 text-white group-hover:text-blue-400 text-xs font-black uppercase tracking-wider italic transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] flex items-center justify-center gap-2"
                      >
                        Acessar Módulo <ArrowRightIcon className="w-3.5 h-3.5 mt-0.5 transition-transform group-hover:translate-x-1" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ==========================================
            TRUST / PROVA SOCIAL (antes do CTA — padrão Trust & Authority)
            ========================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 relative z-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-300/20 bg-amber-950/20 mb-3">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-200/90">Engenharia de Confiança</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-4xl font-bold uppercase tracking-tight text-white italic">
              Infraestrutura de Nível Orbital
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { Icon: BoltIcon, title: 'Latência Ultrabaixa', desc: 'Resposta em tempo real nos painéis de operação' },
              { Icon: ServerStackIcon, title: 'Bancos Redundantes', desc: 'Persistência segura com múltiplas réplicas' },
              { Icon: ClockIcon, title: 'Tempo Real', desc: 'Controle de processos com telemetria contínua' },
              { Icon: ShieldCheckIcon, title: 'Multissegmento', desc: 'Isolamento por cliente em cada segmento' },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-slate-900/50 to-slate-950/60 backdrop-blur-xl p-5 ring-1 ring-inset ring-white/[0.05] before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-300/25 before:to-transparent transition-all hover:border-amber-300/20 hover:-translate-y-1"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-400/10 ring-1 ring-amber-300/20 mb-3">
                  <Icon className="w-5 h-5 text-amber-300" />
                </div>
                <div className="text-sm font-black uppercase tracking-tight italic text-white mb-1">{title}</div>
                <div className="text-[11px] text-gray-400 leading-relaxed font-medium">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ==========================================
            MULTIPLE BUSINESS SEGMENTS / CTA AREA
            ========================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-20">
          <div className="relative rounded-[40px] overflow-hidden border border-amber-300/10 bg-gradient-to-br from-slate-950/80 via-slate-950/70 to-amber-950/20 backdrop-blur-2xl p-8 md:p-16 text-center shadow-[0_0_80px_-30px_rgba(212,175,55,0.3)]">

            {/* Glow decorativo de calor */}
            <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-amber-500/10 blur-[90px]" />

            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-300 mb-4 inline-block">Área de Lançamento Comercial</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white italic mb-6">
                Impulsione sua Empresa à Artemis 4
              </h2>
              <p className="text-sm md:text-base text-gray-300 font-medium leading-relaxed mb-10">
                Nossos microsserviços integrados operam com latência ultrabaixa e bancos redundantes para gerenciar carteiras de ativos digitais, agendas corporativas e otimização de funis publicitários em múltiplos nichos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="/admin/login"
                  onClick={handleEnter}
                  className="w-full sm:w-auto px-8 py-4.5 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-black uppercase tracking-wider italic text-xs shadow-xl shadow-amber-500/25 ring-1 ring-amber-200/40 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] flex items-center justify-center gap-2"
                >
                  Registrar Corporação
                </a>
                <a
                  href="/admin/login"
                  onClick={handleEnter}
                  className="w-full sm:w-auto px-8 py-4.5 rounded-2xl bg-white/[0.04] hover:bg-amber-300/5 border border-white/10 hover:border-amber-300/30 text-white hover:text-amber-100 font-black uppercase tracking-wider italic text-xs transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617] flex items-center justify-center gap-2"
                >
                  Área Administrativa <ArrowRightIcon className="w-3.5 h-3.5 mt-0.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            FOOTER SECTION (Modern & Solid)
            ========================================== */}
        <footer className="border-t border-white/5 bg-[#020617] py-14 w-full relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center ring-1 ring-amber-200/40 shadow-lg shadow-amber-500/20">
                    <RocketLaunchIcon className="w-5 h-5 text-slate-950" />
                  </div>
                  <span className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-white uppercase italic">
                    Artemis<span className="text-amber-400">4</span>
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed max-w-sm font-medium">
                  A <span className="text-amber-200/80 font-semibold">atmosfera de negócios</span> da Net Imobiliária: tecnologia espacial de reentrada de dados e multissegmentação, projetada cirurgicamente para atração e conversão corporativa em larga escala.
                </p>
              </div>
              
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4 italic">Navegação</h4>
                <ul className="space-y-2.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                  <li><Link href="/" className="inline-block py-1 hover:text-white focus-visible:outline-none focus-visible:text-amber-200 transition-colors">Início</Link></li>
                  <li><Link href="/tokenizacao" className="inline-block py-1 hover:text-white focus-visible:outline-none focus-visible:text-amber-200 transition-colors">Tokenização</Link></li>
                  <li><Link href="/imoveis" className="inline-block py-1 hover:text-white focus-visible:outline-none focus-visible:text-amber-200 transition-colors">Imóveis</Link></li>
                  <li><Link href="/sobre" className="inline-block py-1 hover:text-white focus-visible:outline-none focus-visible:text-amber-200 transition-colors">Sobre Nós</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4 italic">Contato Corporativo</h4>
                <ul className="space-y-3 text-xs text-gray-400 font-medium">
                  <li className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-amber-400/80" />
                    <span>(81) 99800-0047</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-amber-400/80" />
                    <span>suporte@netimobiliaria.com</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-amber-400/80 flex-shrink-0" />
                    <span>Recife, PE</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                © 2026 Artemis4. Todos os direitos reservados.
              </p>
              <div className="flex gap-6 text-[9px] text-gray-500 font-black uppercase tracking-widest">
                <Link href="/privacidade" className="inline-block py-1 hover:text-white focus-visible:outline-none focus-visible:text-amber-200 transition-colors">Privacidade</Link>
                <Link href="/termos" className="inline-block py-1 hover:text-white focus-visible:outline-none focus-visible:text-amber-200 transition-colors">Termos de Uso</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>

    </div>
  )
}
