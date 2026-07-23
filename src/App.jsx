import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Clock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Bell, 
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Zap
} from 'lucide-react';

// CSAT (수능) Exam Schedule Constants (Time in Seconds from midnight)
// 10s offset when clicking a subject sets clock to Subject Start - 10 seconds
const SUBJECTS = [
  {
    id: 'korean',
    period: '1교시',
    name: '국어',
    startTime: '08:40',
    endTime: '10:00',
    startSec: 8 * 3600 + 40 * 60, // 31200
    endSec: 10 * 3600,            // 36000
    durationMin: 80,
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/10'
  },
  {
    id: 'math',
    period: '2교시',
    name: '수학',
    startTime: '10:30',
    endTime: '12:10',
    startSec: 10 * 3600 + 30 * 60, // 37800
    endSec: 12 * 3600 + 10 * 60,  // 43800
    durationMin: 100,
    color: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10'
  },
  {
    id: 'english',
    period: '3교시',
    name: '영어',
    startTime: '13:10',
    endTime: '14:20',
    startSec: 13 * 3600 + 10 * 60, // 47400
    endSec: 14 * 3600 + 20 * 60,  // 51600
    durationMin: 70,
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/10'
  },
  {
    id: 'history',
    period: '4교시',
    name: '한국사',
    startTime: '14:50',
    endTime: '15:20',
    startSec: 14 * 3600 + 50 * 60, // 53400
    endSec: 15 * 3600 + 20 * 60,  // 55200
    durationMin: 30,
    color: 'from-purple-500 to-violet-600',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10'
  },
  {
    id: 'inquiry1',
    period: '4교시',
    name: '탐구1',
    startTime: '15:35',
    endTime: '16:05',
    startSec: 15 * 3600 + 35 * 60, // 56100
    endSec: 16 * 3600 + 5 * 60,   // 57900
    durationMin: 30,
    color: 'from-rose-500 to-pink-600',
    borderColor: 'border-rose-500/50',
    bgColor: 'bg-rose-500/10'
  },
  {
    id: 'inquiry2',
    period: '4교시',
    name: '탐구2',
    startTime: '16:10',
    endTime: '16:40',
    startSec: 16 * 3600 + 10 * 60, // 58200
    endSec: 16 * 3600 + 40 * 60,  // 60000
    durationMin: 30,
    color: 'from-fuchsia-500 to-pink-600',
    borderColor: 'border-fuchsia-500/50',
    bgColor: 'bg-fuchsia-500/10'
  },
  {
    id: 'foreign',
    period: '5교시',
    name: '제2외국어',
    startTime: '17:05',
    endTime: '17:45',
    startSec: 17 * 3600 + 5 * 60,  // 61500
    endSec: 17 * 3600 + 45 * 60,  // 63900
    durationMin: 40,
    color: 'from-cyan-500 to-blue-600',
    borderColor: 'border-cyan-500/50',
    bgColor: 'bg-cyan-500/10'
  }
];

// Helper: Convert seconds from midnight to HH:MM:SS format string
const formatTimeSeconds = (totalSec) => {
  const h = Math.floor(totalSec / 3600) % 24;
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Helper: Format countdown mm:ss or hh:mm:ss
const formatDuration = (totalSec) => {
  if (totalSec < 0) totalSec = 0;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Plays siren sound using user's Web Audio API specifications
 */
const playSirenSound = (durationSec = 2.5) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const master = ctx.createGain();
    master.gain.value = 0.25;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    filter.Q.value = 0.7;

    const compressor = ctx.createDynamicsCompressor();

    filter.connect(compressor);
    compressor.connect(master);
    master.connect(ctx.destination);

    function osc(type, freq, gainVal) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gainVal;

      o.connect(g);
      g.connect(filter);

      return { o, g };
    }

    // Siren configured around 440Hz base pitch with dissonant beating and vibrato
    const a = osc("sawtooth", 440, 0.70);
    const b = osc("square", 445, 0.35); // Dissonant beating layer
    const c = osc("sawtooth", 220, 0.25);

    // Vibrato LFO
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();

    lfo.type = "sine";
    lfo.frequency.value = 5;
    depth.gain.value = 25; // Deeper vibrato sweep for siren effect

    lfo.connect(depth);
    lfo.connect(a.o.frequency);
    lfo.connect(b.o.frequency);

    const now = ctx.currentTime;
    [a, b, c].forEach(x => x.o.start(now));
    lfo.start(now);

    // Fade out audio gracefully before stopping
    master.gain.setValueAtTime(0.25, now + Math.max(0.1, durationSec - 0.4));
    master.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    setTimeout(() => {
      [a, b, c].forEach(x => {
        try { x.o.stop(); } catch (e) {}
      });
      try { lfo.stop(); } catch (e) {}
      try { ctx.close(); } catch (e) {}
    }, durationSec * 1000 + 150);
  } catch (err) {
    console.error("Audio synth execution error:", err);
  }
};

const AnalogClock = ({ currentSec }) => {
  // Convert currentSec to angles
  const seconds = currentSec % 60;
  const minutes = (currentSec / 60) % 60;
  const hours = (currentSec / 3600) % 12;

  const secAngle = seconds * 6; // 360 deg / 60 s = 6 deg/s
  const minAngle = minutes * 6; // 360 deg / 60 m = 6 deg/m
  const hourAngle = (hours * 30) + (minutes * 0.5); // 30 deg/h + 0.5 deg/m

  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-square mx-auto my-2 p-2">
      <svg 
        viewBox="0 0 300 300" 
        className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
      >
        <defs>
          <radialGradient id="clockFace" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <radialGradient id="rimGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Rim */}
        <circle cx="150" cy="150" r="146" fill="url(#rimGrad)" stroke="#334155" strokeWidth="4" />
        {/* Inner Dial Face */}
        <circle cx="150" cy="150" r="136" fill="url(#clockFace)" stroke="#1e293b" strokeWidth="2" />

        {/* 60 Minute/Second Tick Marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const isHour = i % 5 === 0;
          const angle = i * 6;
          const rad = (angle - 90) * (Math.PI / 180);
          const rInner = isHour ? 116 : 124;
          const rOuter = 132;
          const x1 = 150 + rInner * Math.cos(rad);
          const y1 = 150 + rInner * Math.sin(rad);
          const x2 = 150 + rOuter * Math.cos(rad);
          const y2 = 150 + rOuter * Math.sin(rad);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isHour ? '#f8fafc' : '#475569'}
              strokeWidth={isHour ? 3 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Hour Numbers 1-12 */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
          const angle = num * 30;
          const rad = (angle - 90) * (Math.PI / 180);
          const r = 100;
          const x = 150 + r * Math.cos(rad);
          const y = 150 + r * Math.sin(rad);

          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-slate-200 font-extrabold text-base sm:text-lg select-none tracking-tight"
              style={{ fontFamily: 'sans-serif' }}
            >
              {num}
            </text>
          );
        })}

        {/* CSAT Center Logo/Badge */}
        <text 
          x="150" 
          y="105" 
          textAnchor="middle" 
          className="fill-amber-400/80 font-bold text-[10px] tracking-widest uppercase select-none"
        >
          수능 실전 타이머
        </text>

        {/* Hour Hand */}
        <line
          x1="150"
          y1="150"
          x2={150 + 58 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
          y2={150 + 58 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
          stroke="#f1f5f9"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Minute Hand */}
        <line
          x1="150"
          y1="150"
          x2={150 + 88 * Math.cos((minAngle - 90) * (Math.PI / 180))}
          y2={150 + 88 * Math.sin((minAngle - 90) * (Math.PI / 180))}
          stroke="#94a3b8"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Second Hand (초침) */}
        <g filter="url(#glow)">
          {/* Main Second Line */}
          <line
            x1="150"
            y1="150"
            x2={150 + 112 * Math.cos((secAngle - 90) * (Math.PI / 180))}
            y2={150 + 112 * Math.sin((secAngle - 90) * (Math.PI / 180))}
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Counterbalance Tail */}
          <line
            x1="150"
            y1="150"
            x2={150 - 24 * Math.cos((secAngle - 90) * (Math.PI / 180))}
            y2={150 - 24 * Math.sin((secAngle - 90) * (Math.PI / 180))}
            stroke="#ef4444"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>

        {/* Center Pivot Point */}
        <circle cx="150" cy="150" r="6" fill="#ef4444" />
        <circle cx="150" cy="150" r="2.5" fill="#ffffff" />
      </svg>
    </div>
  );
};

export default function App() {
  // State initialization
  // Default: 2nd foreign language unselected (false)
  const [includeForeign, setIncludeForeign] = useState(false);
  
  // Filter active subjects based on 2nd foreign language toggle
  const activeSubjects = includeForeign 
    ? SUBJECTS 
    : SUBJECTS.filter(s => s.id !== 'foreign');

  // Currently selected subject index
  const [selectedSubjectId, setSelectedSubjectId] = useState('korean');
  
  // Current simulated time in seconds from midnight (default to Korean start - 10 seconds: 08:39:50)
  const [currentSec, setCurrentSec] = useState(SUBJECTS[0].startSec - 10);
  
  // Playing/running state
  const [isRunning, setIsRunning] = useState(false);
  
  // Speed multiplier (1x, 2x, 5x, 10x) for quick testing
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  
  // Default: Digital clock hidden (false)
  const [showDigital, setShowDigital] = useState(false);
  
  // Mute/Audio state
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Visual Toast/Alert for Siren Trigger
  const [sirenNotification, setSirenNotification] = useState(null);

  // Hidden audio element for MediaSession unlock & persistent execution
  const audioRef = useRef(null);
  
  // Ref to store triggered siren timestamps to avoid duplicate triggers within same second
  const sirenTriggeredRef = useRef(new Set());

  // Get active subject or break phase based on currentSec
  const getCurrentPhaseInfo = useCallback(() => {
    // Check if within a subject
    for (const sub of activeSubjects) {
      if (currentSec >= sub.startSec && currentSec <= sub.endSec) {
        return {
          type: 'EXAM',
          subject: sub,
          title: `[${sub.period}] ${sub.name} 영역`,
          remainingSec: sub.endSec - currentSec,
          progressPercent: ((currentSec - sub.startSec) / (sub.endSec - sub.startSec)) * 100
        };
      }
    }

    // Check if before first exam
    const firstSub = activeSubjects[0];
    if (currentSec < firstSub.startSec) {
      return {
        type: 'PREPARE',
        subject: firstSub,
        title: `${firstSub.name} 영역 입실 및 시험 준비`,
        remainingSec: firstSub.startSec - currentSec,
        progressPercent: 0
      };
    }

    // Check if during break between exams
    for (let i = 0; i < activeSubjects.length - 1; i++) {
      const currentSub = activeSubjects[i];
      const nextSub = activeSubjects[i + 1];
      if (currentSec > currentSub.endSec && currentSec < nextSub.startSec) {
        return {
          type: 'BREAK',
          subject: nextSub,
          title: `쉬는시간 (${nextSub.name} 준비)`,
          remainingSec: nextSub.startSec - currentSec,
          progressPercent: 0
        };
      }
    }

    // After all exams finished
    const lastSub = activeSubjects[activeSubjects.length - 1];
    if (currentSec > lastSub.endSec) {
      return {
        type: 'FINISHED',
        subject: null,
        title: '모든 시험 과정 종료',
        remainingSec: 0,
        progressPercent: 100
      };
    }

    return { type: 'UNKNOWN', title: '대기 중', remainingSec: 0, progressPercent: 0 };
  }, [currentSec, activeSubjects]);

  const currentPhase = getCurrentPhaseInfo();

  // Handle subject row selection: Sets clock to target subject start - 10 seconds
  const handleSelectSubject = (subject) => {
    setSelectedSubjectId(subject.id);
    const newSec = subject.startSec - 10;
    setCurrentSec(newSec);
    sirenTriggeredRef.current.clear();
  };

  // Switch to Previous Subject
  const handlePrevSubject = useCallback(() => {
    const currentIndex = activeSubjects.findIndex(s => s.id === selectedSubjectId);
    const prevIndex = Math.max(0, currentIndex - 1);
    handleSelectSubject(activeSubjects[prevIndex]);
  }, [selectedSubjectId, activeSubjects]);

  // Switch to Next Subject
  const handleNextSubject = useCallback(() => {
    const currentIndex = activeSubjects.findIndex(s => s.id === selectedSubjectId);
    const nextIndex = Math.min(activeSubjects.length - 1, currentIndex + 1);
    handleSelectSubject(activeSubjects[nextIndex]);
  }, [selectedSubjectId, activeSubjects]);

  // Reset current subject to start time - 10 seconds (처음부터 시작)
  const handleResetCurrent = useCallback(() => {
    const sub = activeSubjects.find(s => s.id === selectedSubjectId) || activeSubjects[0];
    setCurrentSec(sub.startSec - 10);
    sirenTriggeredRef.current.clear();
  }, [selectedSubjectId, activeSubjects]);

  // Check and trigger siren sounds at exact CSAT key moments
  const checkSirenTrigger = useCallback((sec) => {
    activeSubjects.forEach((sub) => {
      const tenMinBefore = sub.endSec - (10 * 60);

      // Trigger points: Start, 10 Min Before End, End Time
      const triggers = [
        { time: sub.startSec, label: `${sub.name} 시험 시작 안내 사이렌!`, id: `${sub.id}-start` },
        { time: tenMinBefore, label: `${sub.name} 시험 종료 10분 전 안내 사이렌!`, id: `${sub.id}-10m` },
        { time: sub.endSec, label: `${sub.name} 시험 종료 안내 사이렌!`, id: `${sub.id}-end` }
      ];

      triggers.forEach((trig) => {
        if (sec === trig.time && !sirenTriggeredRef.current.has(trig.id)) {
          sirenTriggeredRef.current.add(trig.id);
          
          if (soundEnabled) {
            playSirenSound(3.0);
          }

          // Show UI Notification
          setSirenNotification({
            id: trig.id,
            text: trig.label,
            time: formatTimeSeconds(sec)
          });

          // Auto hide siren toast after 4s
          setTimeout(() => {
            setSirenNotification(null);
          }, 4000);
        }
      });
    });
  }, [activeSubjects, soundEnabled]);

  // Main Timer Interval Loop
  useEffect(() => {
    let interval = null;

    if (isRunning) {
      const stepMs = 1000 / speedMultiplier;
      interval = setInterval(() => {
        setCurrentSec((prev) => {
          const nextSec = prev + 1;

          // Check for exam completion threshold
          const lastSub = activeSubjects[activeSubjects.length - 1];
          if (nextSec >= lastSub.endSec + 1) {
            setIsRunning(false); // Stop when all exams finish
            return lastSub.endSec;
          }

          checkSirenTrigger(nextSec);
          return nextSec;
        });
      }, stepMs);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, speedMultiplier, activeSubjects, checkSirenTrigger]);

  // Sync active subject selection when currentSec moves into another subject during auto-progress
  useEffect(() => {
    const currentSub = activeSubjects.find(s => currentSec >= s.startSec - 10 && currentSec <= s.endSec);
    if (currentSub && currentSub.id !== selectedSubjectId) {
      setSelectedSubjectId(currentSub.id);
    }
  }, [currentSec, activeSubjects, selectedSubjectId]);

  // Sync MediaSession API for lockscreen & hardware media controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      const titleText = currentPhase.title || '수능 타이머';
      const statusText = isRunning ? '시작됨' : '일시정지';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: titleText,
        artist: `시각: ${formatTimeSeconds(currentSec)} (${statusText})`,
        album: '대학수학능력시험 실전 타이머',
        artwork: [
          { src: 'https://cdn-icons-png.flaticon.com/512/2884/2884781.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      // Handler mappings
      try {
        navigator.mediaSession.setActionHandler('play', () => setIsRunning(true));
        navigator.mediaSession.setActionHandler('pause', () => setIsRunning(false));
        navigator.mediaSession.setActionHandler('previoustrack', handlePrevSubject);
        navigator.mediaSession.setActionHandler('nexttrack', handleNextSubject);
      } catch (err) {
        console.warn('MediaSession handler error:', err);
      }
    }
  }, [currentSec, currentPhase, isRunning, handlePrevSubject, handleNextSubject]);

  // Play background audio loop to keep browser media session awake when active
  const togglePlay = () => {
    if (!isRunning) {
      // Play silent dummy buffer or unlock Web Audio API
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Hidden Audio element for MediaSession activation */}
      <audio 
        ref={audioRef} 
        loop 
        src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" 
      />

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20 text-slate-950">
              <Clock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                수능 실전 타이머
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                  REAL CSAT
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                실제 수능 시험 시각 기준 아날로그 시계 & 자동 연속 진행 타이머
              </p>
            </div>
          </div>

          {/* Quick Header Status & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Foreign Lang Toggle */}
            <label className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer text-xs font-medium transition-all">
              <input
                type="checkbox"
                checked={includeForeign}
                onChange={(e) => setIncludeForeign(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
              />
              <span className="hidden sm:inline text-slate-300">제2외국어</span>
              <span className="sm:hidden text-slate-300">5교시</span>
            </label>

            {/* Mute/Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border transition-all ${
                soundEnabled 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
              title={soundEnabled ? '사이렌 알림 켜짐' : '사이렌 알림 끔'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Test Siren Button */}
            <button
              onClick={() => playSirenSound(2.5)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all"
            >
              <Bell className="w-3.5 h-3.5" />
              사이렌 테스트
            </button>
          </div>
        </div>
      </header>

      {/* Siren Alarm Floating Notification */}
      {sirenNotification && (
        <div className="fixed top-20 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-2xl shadow-2xl border border-red-400/50 flex items-center gap-3 animate-bounce">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-red-100">알림 ({sirenNotification.time})</div>
            <div className="text-sm font-extrabold">{sirenNotification.text}</div>
          </div>
        </div>
      )}

      {/* Main Grid Content Area (Requirement 1: 2 Column Grid) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* LEFT COLUMN: Subject Schedule Table (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <h2 className="font-bold text-lg text-slate-100">수능 시험 시간표</h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  총 {activeSubjects.length}개 영역
                </span>
              </div>

              {/* Subject Schedule Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                      <th className="py-2.5 px-2">교시 / 과목</th>
                      <th className="py-2.5 px-2">시험시간</th>
                      <th className="py-2.5 px-2 text-center">소요</th>
                      <th className="py-2.5 px-2 text-right">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {activeSubjects.map((sub) => {
                      const isSelected = selectedSubjectId === sub.id;
                      const isExamRunning = currentSec >= sub.startSec && currentSec <= sub.endSec;
                      const isFinished = currentSec > sub.endSec;

                      return (
                        <tr
                          key={sub.id}
                          onClick={() => handleSelectSubject(sub)}
                          className={`group cursor-pointer transition-all duration-150 rounded-xl ${
                            isSelected
                              ? 'bg-amber-500/15 text-white'
                              : 'hover:bg-slate-800/60 text-slate-300'
                          }`}
                        >
                          {/* Subject Name & Period */}
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-6 rounded-full transition-all ${
                                isSelected ? 'bg-amber-400 scale-y-110' : 'bg-slate-700 group-hover:bg-slate-500'
                              }`} />
                              <div>
                                <div className="text-xs text-slate-400 font-semibold">{sub.period}</div>
                                <div className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                                  {sub.name}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Time Range */}
                          <td className="py-3 px-2 font-mono text-xs text-slate-300">
                            {sub.startTime} ~ {sub.endTime}
                          </td>

                          {/* Duration */}
                          <td className="py-3 px-2 text-center font-mono text-xs text-slate-400">
                            {sub.durationMin}분
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-2 text-right">
                            {isExamRunning ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                진행중
                              </span>
                            ) : isFinished ? (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                종료
                              </span>
                            ) : isSelected ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-semibold">
                                선택됨
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 font-normal">
                                대기
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Information Notice Footnote */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p>
                  과목 행을 클릭하면 해당 과목 <span className="text-amber-400 font-semibold">시작 10초 전</span>으로 시계가 설정됩니다.
                </p>
              </div>
            </div>

            {/* Current Phase & Status Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">현재 타이머 진행 상태</div>
                  <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    {currentPhase.title}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">남은 시간</div>
                <div className="text-base font-extrabold font-mono text-amber-400">
                  {formatDuration(currentPhase.remainingSec)}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Analog Clock, Digital View, and Controls (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
              
              {/* Background Subtle Gradient Glow */}
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header inside clock box */}
              <div className="w-full flex items-center justify-between mb-2 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                    CSAT Analog Examination Clock
                  </span>
                </div>

                {/* Digital Clock Visibility Toggle Switch (Requirement 3) */}
                <button
                  onClick={() => setShowDigital(!showDigital)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                >
                  {showDigital ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      디지털 시각 숨기기
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      디지털 시각 보기
                    </>
                  )}
                </button>
              </div>

              {/* Requirement 2: Analog Clock displaying second hand (초침) */}
              <AnalogClock currentSec={currentSec} />

              {/* Requirement 3: Optional Digital Clock Display */}
              {showDigital && (
                <div className="w-full mt-2 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center shadow-inner z-10 transition-all">
                  <div className="text-xs text-slate-400 font-semibold mb-1 tracking-wider uppercase flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    현재 디지털 시각 (24시간)
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-slate-100">
                    {formatTimeSeconds(currentSec)}
                  </div>
                </div>
              )}

              {/* Playback Controls & Navigation (Requirement 5) */}
              <div className="w-full mt-6 space-y-4 z-10">
                
                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  
                  {/* Previous Subject */}
                  <button
                    onClick={handlePrevSubject}
                    className="p-3 sm:px-4 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                    title="이전 과목으로 이동"
                  >
                    <SkipBack className="w-4 h-4" />
                    <span className="hidden sm:inline">이전 과목</span>
                  </button>

                  {/* Play / Pause Toggle Button */}
                  <button
                    onClick={togglePlay}
                    className={`flex-1 max-w-[180px] py-3 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-5 h-5 fill-current" />
                        일시정지
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                        타이머 시작
                      </>
                    )}
                  </button>

                  {/* Reset (처음부터 시작) */}
                  <button
                    onClick={handleResetCurrent}
                    className="p-3 sm:px-4 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                    title="선택된 과목 시작 10초 전으로 리셋"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">처음부터</span>
                  </button>

                  {/* Next Subject */}
                  <button
                    onClick={handleNextSubject}
                    className="p-3 sm:px-4 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                    title="다음 과목으로 이동"
                  >
                    <span className="hidden sm:inline">다음 과목</span>
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed Multiplier Options */}
                <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1 pl-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    진행 배속:
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 5, 10].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setSpeedMultiplier(spd)}
                        className={`px-2.5 py-1 rounded-lg font-bold font-mono transition-all ${
                          speedMultiplier === spd
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Practical Advice Banner */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  각 시험별 <strong className="text-slate-200">시작, 종료 10분 전, 종료 시각</strong>에 자동 사이렌 알림이 울립니다.
                </span>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 bg-slate-950 text-center text-xs text-slate-500">
        <p>대학수학능력시험 실전 시뮬레이션 타이머 &bull; MediaSession API & Web Audio Synth Enabled</p>
      </footer>
    </div>
  );
}