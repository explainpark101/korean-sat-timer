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
  ShieldAlert,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
} from 'lucide-react';

const SIREN_DURATION_SEC = 1.5;
const THEME_STORAGE_KEY = 'csat-timer-theme';

/** Remaining-time TTS: 30-min exams warn at 5 min; others at 10 min */
const getRemainingWarnMin = (durationMin) => (durationMin === 30 ? 5 : 10);

const speakTts = (text) => {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ko-KR';
    utter.rate = 0.95;

    const voices = synth.getVoices();
    const koVoice =
      voices.find((v) => v.lang === 'ko-KR') ||
      voices.find((v) => v.lang?.startsWith('ko'));
    if (koVoice) utter.voice = koVoice;

    synth.speak(utter);
  } catch (err) {
    console.error('TTS speak error:', err);
  }
};

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch (e) {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

// CSAT (수능) Exam Schedule Constants (Time in Seconds from midnight)
// 10s offset when clicking a subject sets clock to Subject Start - 10 seconds
const SUBJECTS = [
  {
    id: 'korean',
    period: '1교시',
    name: '국어',
    startTime: '08:40',
    endTime: '10:00',
    startSec: 8 * 3600 + 40 * 60,
    endSec: 10 * 3600,
    durationMin: 80,
  },
  {
    id: 'math',
    period: '2교시',
    name: '수학',
    startTime: '10:30',
    endTime: '12:10',
    startSec: 10 * 3600 + 30 * 60,
    endSec: 12 * 3600 + 10 * 60,
    durationMin: 100,
  },
  {
    id: 'english',
    period: '3교시',
    name: '영어',
    startTime: '13:10',
    endTime: '14:20',
    startSec: 13 * 3600 + 10 * 60,
    endSec: 14 * 3600 + 20 * 60,
    durationMin: 70,
  },
  {
    id: 'history',
    period: '4교시',
    name: '한국사',
    startTime: '14:50',
    endTime: '15:20',
    startSec: 14 * 3600 + 50 * 60,
    endSec: 15 * 3600 + 20 * 60,
    durationMin: 30,
  },
  {
    id: 'inquiry1',
    period: '4교시',
    name: '탐구1',
    startTime: '15:35',
    endTime: '16:05',
    startSec: 15 * 3600 + 35 * 60,
    endSec: 16 * 3600 + 5 * 60,
    durationMin: 30,
  },
  {
    id: 'inquiry2',
    period: '4교시',
    name: '탐구2',
    startTime: '16:10',
    endTime: '16:40',
    startSec: 16 * 3600 + 10 * 60,
    endSec: 16 * 3600 + 40 * 60,
    durationMin: 30,
  },
  {
    id: 'foreign',
    period: '5교시',
    name: '제2외국어',
    startTime: '17:05',
    endTime: '17:45',
    startSec: 17 * 3600 + 5 * 60,
    endSec: 17 * 3600 + 45 * 60,
    durationMin: 40,
  },
];

const formatTimeSeconds = (totalSec) => {
  const h = Math.floor(totalSec / 3600) % 24;
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

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
 * Plays siren sound using Web Audio API (~3s by default)
 */
const playSirenSound = (durationSec = SIREN_DURATION_SEC) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const master = ctx.createGain();
    master.gain.value = 0.25;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
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

    const a = osc('sawtooth', 440, 0.7);
    const b = osc('square', 445, 0.35);
    const c = osc('sawtooth', 220, 0.25);

    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();

    lfo.type = 'sine';
    lfo.frequency.value = 5;
    depth.gain.value = 25;

    lfo.connect(depth);
    lfo.connect(a.o.frequency);
    lfo.connect(b.o.frequency);

    const now = ctx.currentTime;
    [a, b, c].forEach((x) => x.o.start(now));
    lfo.start(now);

    master.gain.setValueAtTime(0.25, now + Math.max(0.1, durationSec - 0.4));
    master.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    setTimeout(() => {
      [a, b, c].forEach((x) => {
        try {
          x.o.stop();
        } catch (e) {}
      });
      try {
        lfo.stop();
      } catch (e) {}
      try {
        ctx.close();
      } catch (e) {}
    }, durationSec * 1000 + 150);
  } catch (err) {
    console.error('Audio synth execution error:', err);
  }
};

const AnalogClock = ({ currentSec, isDark, large = false }) => {
  const seconds = currentSec % 60;
  const minutes = (currentSec / 60) % 60;
  const hours = (currentSec / 3600) % 12;

  const secAngle = seconds * 6;
  const minAngle = minutes * 6;
  const hourAngle = hours * 30 + minutes * 0.5;

  const rim = isDark ? '#424245' : '#e0e0e0';
  const face = isDark ? '#1d1d1f' : '#ffffff';
  const hourStroke = isDark ? '#f5f5f7' : '#1d1d1f';
  const tickMinor = isDark ? '#6e6e73' : '#cccccc';
  const minuteStroke = isDark ? '#a1a1a6' : '#333333';
  const label = isDark ? '#86868b' : '#7a7a7a';
  const accent = isDark ? '#2997ff' : '#0066cc';
  const pivotDot = isDark ? '#1d1d1f' : '#ffffff';

  return (
    <div
      className={`relative mx-auto aspect-square w-full p-2 ${
        large
          ? 'max-w-[min(92vw,calc(100vh-6rem))]'
          : 'my-2 max-w-[340px] sm:max-w-[380px]'
      }`}
    >
      <svg
        viewBox="0 0 300 300"
        className="h-full w-full"
        style={{
          filter: isDark
            ? 'drop-shadow(3px 5px 30px rgba(0, 0, 0, 0.55))'
            : 'drop-shadow(3px 5px 30px rgba(0, 0, 0, 0.22))',
        }}
      >
        <circle cx="150" cy="150" r="146" fill={rim} />
        <circle cx="150" cy="150" r="138" fill={face} />

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
              stroke={isHour ? hourStroke : tickMinor}
              strokeWidth={isHour ? 2.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

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
              fill={hourStroke}
              style={{
                fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '-0.28px',
                userSelect: 'none',
              }}
            >
              {num}
            </text>
          );
        })}

        <text
          x="150"
          y="105"
          textAnchor="middle"
          fill={label}
          style={{
            fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
            fontSize: '10px',
            fontWeight: 400,
            letterSpacing: '-0.08px',
            userSelect: 'none',
          }}
        >
          수능 실전 타이머
        </text>

        <line
          x1="150"
          y1="150"
          x2={150 + 58 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
          y2={150 + 58 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
          stroke={hourStroke}
          strokeWidth="6"
          strokeLinecap="round"
        />

        <line
          x1="150"
          y1="150"
          x2={150 + 88 * Math.cos((minAngle - 90) * (Math.PI / 180))}
          y2={150 + 88 * Math.sin((minAngle - 90) * (Math.PI / 180))}
          stroke={minuteStroke}
          strokeWidth="4"
          strokeLinecap="round"
        />

        <line
          x1="150"
          y1="150"
          x2={150 + 112 * Math.cos((secAngle - 90) * (Math.PI / 180))}
          y2={150 + 112 * Math.sin((secAngle - 90) * (Math.PI / 180))}
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="150"
          y1="150"
          x2={150 - 24 * Math.cos((secAngle - 90) * (Math.PI / 180))}
          y2={150 - 24 * Math.sin((secAngle - 90) * (Math.PI / 180))}
          stroke={accent}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        <circle cx="150" cy="150" r="6" fill={accent} />
        <circle cx="150" cy="150" r="2.5" fill={pivotDot} />
      </svg>
    </div>
  );
};

export default function App() {
  const [includeForeign, setIncludeForeign] = useState(false);

  const activeSubjects = includeForeign
    ? SUBJECTS
    : SUBJECTS.filter((s) => s.id !== 'foreign');

  const [selectedSubjectId, setSelectedSubjectId] = useState('korean');
  const [currentSec, setCurrentSec] = useState(SUBJECTS[0].startSec - 10);
  const [isRunning, setIsRunning] = useState(false);
  const [showDigital, setShowDigital] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sirenNotification, setSirenNotification] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);
  const [pendingSubject, setPendingSubject] = useState(null);
  const [isClockFullscreen, setIsClockFullscreen] = useState(false);

  const audioRef = useRef(null);
  const sirenTriggeredRef = useRef(new Set());
  const confirmDialogRef = useRef(null);
  const clockFullscreenRef = useRef(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // Chrome loads voices asynchronously; warm the list once
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener('voiceschanged', warm);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', warm);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const exitClockFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsClockFullscreen(false);
  }, []);

  const enterClockFullscreen = useCallback(() => {
    setIsClockFullscreen(true);
  }, []);

  useEffect(() => {
    if (!isClockFullscreen) return undefined;
    const el = clockFullscreenRef.current;
    if (el?.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {
        // Overlay still works without Fullscreen API permission
      });
    }
    return undefined;
  }, [isClockFullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsClockFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isClockFullscreen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        exitClockFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isClockFullscreen, exitClockFullscreen]);

  const getCurrentPhaseInfo = useCallback(() => {
    for (const sub of activeSubjects) {
      if (currentSec >= sub.startSec && currentSec <= sub.endSec) {
        return {
          type: 'EXAM',
          subject: sub,
          title: `[${sub.period}] ${sub.name} 영역`,
          remainingSec: sub.endSec - currentSec,
          progressPercent:
            ((currentSec - sub.startSec) / (sub.endSec - sub.startSec)) * 100,
        };
      }
    }

    const firstSub = activeSubjects[0];
    if (currentSec < firstSub.startSec) {
      return {
        type: 'PREPARE',
        subject: firstSub,
        title: `${firstSub.name} 영역 입실 및 시험 준비`,
        remainingSec: firstSub.startSec - currentSec,
        progressPercent: 0,
      };
    }

    for (let i = 0; i < activeSubjects.length - 1; i++) {
      const currentSub = activeSubjects[i];
      const nextSub = activeSubjects[i + 1];
      if (currentSec > currentSub.endSec && currentSec < nextSub.startSec) {
        return {
          type: 'BREAK',
          subject: nextSub,
          title: `쉬는시간 (${nextSub.name} 준비)`,
          remainingSec: nextSub.startSec - currentSec,
          progressPercent: 0,
        };
      }
    }

    const lastSub = activeSubjects[activeSubjects.length - 1];
    if (currentSec > lastSub.endSec) {
      return {
        type: 'FINISHED',
        subject: null,
        title: '모든 시험 과정 종료',
        remainingSec: 0,
        progressPercent: 100,
      };
    }

    return { type: 'UNKNOWN', title: '대기 중', remainingSec: 0, progressPercent: 0 };
  }, [currentSec, activeSubjects]);

  const currentPhase = getCurrentPhaseInfo();

  const applySelectSubject = useCallback((subject) => {
    setSelectedSubjectId(subject.id);
    setCurrentSec(subject.startSec - 10);
    sirenTriggeredRef.current.clear();
  }, []);

  const handleSelectSubject = (subject) => {
    // Confirm when an exam period is currently in progress
    if (currentPhase.type === 'EXAM') {
      setPendingSubject(subject);
      return;
    }
    applySelectSubject(subject);
  };

  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    if (pendingSubject && !dialog.open) {
      dialog.showModal();
    }
  }, [pendingSubject]);

  const handleConfirmSubjectChange = () => {
    if (pendingSubject) {
      applySelectSubject(pendingSubject);
    }
    setPendingSubject(null);
    confirmDialogRef.current?.close();
  };

  const handleCancelSubjectChange = () => {
    setPendingSubject(null);
    confirmDialogRef.current?.close();
  };

  const handlePrevSubject = useCallback(() => {
    const currentIndex = activeSubjects.findIndex((s) => s.id === selectedSubjectId);
    const prevIndex = Math.max(0, currentIndex - 1);
    applySelectSubject(activeSubjects[prevIndex]);
  }, [selectedSubjectId, activeSubjects, applySelectSubject]);

  const handleNextSubject = useCallback(() => {
    const currentIndex = activeSubjects.findIndex((s) => s.id === selectedSubjectId);
    const nextIndex = Math.min(activeSubjects.length - 1, currentIndex + 1);
    applySelectSubject(activeSubjects[nextIndex]);
  }, [selectedSubjectId, activeSubjects, applySelectSubject]);

  const handleResetCurrent = useCallback(() => {
    const sub =
      activeSubjects.find((s) => s.id === selectedSubjectId) || activeSubjects[0];
    setCurrentSec(sub.startSec - 10);
    sirenTriggeredRef.current.clear();
  }, [selectedSubjectId, activeSubjects]);

  const checkSirenTrigger = useCallback(
    (sec) => {
      activeSubjects.forEach((sub) => {
        const warnMin = getRemainingWarnMin(sub.durationMin);
        const remainingWarnSec = sub.endSec - warnMin * 60;

        const triggers = [
          {
            time: sub.startSec,
            id: `${sub.id}-start`,
            label: `${sub.name} 시험 시작 안내 사이렌!`,
            kind: 'siren',
          },
          {
            time: remainingWarnSec,
            id: `${sub.id}-${warnMin}m`,
            label: `${sub.name} 시험 종료 ${warnMin}분 전`,
            kind: 'tts',
            ttsText: `${warnMin}분 남았습니다`,
          },
          {
            time: sub.endSec,
            id: `${sub.id}-end`,
            label: `${sub.name} 시험 종료 안내 사이렌!`,
            kind: 'siren',
          },
        ];

        triggers.forEach((trig) => {
          if (sec === trig.time && !sirenTriggeredRef.current.has(trig.id)) {
            sirenTriggeredRef.current.add(trig.id);

            if (soundEnabled) {
              if (trig.kind === 'tts') {
                speakTts(trig.ttsText);
              } else {
                playSirenSound(SIREN_DURATION_SEC);
              }
            }

            setSirenNotification({
              id: trig.id,
              text: trig.kind === 'tts' ? trig.ttsText : trig.label,
              time: formatTimeSeconds(sec),
            });

            setTimeout(() => {
              setSirenNotification(null);
            }, 4000);
          }
        });
      });
    },
    [activeSubjects, soundEnabled],
  );

  useEffect(() => {
    let interval = null;

    if (isRunning) {
      interval = setInterval(() => {
        setCurrentSec((prev) => {
          const nextSec = prev + 1;

          const lastSub = activeSubjects[activeSubjects.length - 1];
          if (nextSec >= lastSub.endSec + 1) {
            setIsRunning(false);
            return lastSub.endSec;
          }

          checkSirenTrigger(nextSec);
          return nextSec;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, activeSubjects, checkSirenTrigger]);

  useEffect(() => {
    const currentSub = activeSubjects.find(
      (s) => currentSec >= s.startSec - 10 && currentSec <= s.endSec,
    );
    if (currentSub && currentSub.id !== selectedSubjectId) {
      setSelectedSubjectId(currentSub.id);
    }
  }, [currentSec, activeSubjects, selectedSubjectId]);

  // Media Session: title = phase only (e.g. "[1교시] 국어 영역"); artist/album = "수능"
  // Do not push current time into metadata every second.
  const mediaTitle = currentPhase.title || '수능 타이머';

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: mediaTitle,
      artist: '수능',
      album: '수능',
      artwork: [
        {
          src: 'https://cdn-icons-png.flaticon.com/512/2884/2884781.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });
  }, [mediaTitle]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => setIsRunning(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsRunning(false));
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevSubject);
      navigator.mediaSession.setActionHandler('nexttrack', handleNextSubject);
    } catch (err) {
      console.warn('MediaSession handler error:', err);
    }
  }, [handlePrevSubject, handleNextSubject]);

  const togglePlay = () => {
    if (!isRunning) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas-parchment font-sans text-ink">
      <audio
        ref={audioRef}
        loop
        src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
      />

      {/* global-nav */}
      <header className="sticky top-0 z-40 h-11 bg-surface-black text-on-dark">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Clock className="h-4 w-4 shrink-0 text-on-dark" strokeWidth={1.75} />
            <div className="min-w-0">
              <h1
                className="truncate text-[12px] font-normal leading-none tracking-[-0.12px] text-on-dark"
              >
                수능 실전 타이머
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <label className="flex h-8 cursor-pointer items-center gap-2 rounded-sm bg-ink px-[15px] text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-on-dark active:scale-95">
              <input
                type="checkbox"
                checked={includeForeign}
                onChange={(e) => setIncludeForeign(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <span className="hidden sm:inline">제2외국어</span>
              <span className="sm:hidden">5교시</span>
            </label>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(210,210,215,0.64)] text-ink active:scale-95"
              title={isDark ? '라이트 모드' : '다크 모드'}
              aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(210,210,215,0.64)] text-ink active:scale-95"
              title={soundEnabled ? '사이렌 알림 켜짐' : '사이렌 알림 끔'}
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => playSirenSound(SIREN_DURATION_SEC)}
              className="hidden h-8 items-center gap-1.5 rounded-sm bg-ink px-[15px] text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-on-dark active:scale-95 md:flex"
            >
              <Bell className="h-3.5 w-3.5" />
              사이렌 테스트
            </button>

            <button
              type="button"
              onClick={() => speakTts('10분 남았습니다')}
              className="hidden h-8 items-center gap-1.5 rounded-sm bg-ink px-[15px] text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-on-dark active:scale-95 md:flex"
            >
              TTS 테스트
            </button>
          </div>
        </div>
      </header>

      {/* sub-nav-frosted */}
      <div
        className="sticky top-11 z-30 h-[52px] border-b border-subnav-border bg-subnav backdrop-blur-[20px] backdrop-saturate-[180%]"
      >
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate font-display text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">
              {currentPhase.title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-[12px] font-normal leading-none tracking-[-0.12px] text-ink-muted-48">
                남은 시간
              </div>
              <div className="font-mono text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-ink">
                {formatDuration(currentPhase.remainingSec)}
              </div>
            </div>
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-[38px] min-w-[44px] items-center justify-center gap-2 rounded-pill bg-primary px-[22px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-on-primary outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary-focus active:scale-95"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  일시정지
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  시작
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Siren notification — dark tile, no bounce/shadow chrome */}
      {sirenNotification && (
        <div className="fixed top-[108px] right-4 z-50 flex max-w-sm items-start gap-3 rounded-none bg-surface-tile-1 px-5 py-4 text-on-dark">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary-on-dark" />
          <div>
            <div className="text-[12px] font-normal leading-none tracking-[-0.12px] text-body-muted">
              알림 ({sirenNotification.time})
            </div>
            <div className="mt-1 text-[17px] font-semibold leading-[1.24] tracking-[-0.374px]">
              {sirenNotification.text}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
          {/* Schedule — product-tile-parchment / store-utility rhythm */}
          <section className="bg-canvas-parchment px-5 py-12 sm:px-8 sm:py-20 lg:col-span-5 lg:px-10">
            <div className="mb-6 flex items-end justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Calendar className="h-4 w-4" />
                  <span className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px]">
                    시간표
                  </span>
                </div>
                <h2 className="font-display text-[34px] font-semibold leading-[1.47] tracking-[-0.374px] text-ink sm:text-[40px] sm:leading-[1.1] sm:tracking-normal">
                  수능 시험 시간표
                </h2>
              </div>
              <span className="shrink-0 pb-1 text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48">
                {activeSubjects.length}개 영역
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-hairline text-[12px] font-normal leading-none tracking-[-0.12px] text-ink-muted-48">
                    <th className="px-4 py-3 font-normal">교시 / 과목</th>
                    <th className="px-3 py-3 font-normal">시험시간</th>
                    <th className="px-3 py-3 text-center font-normal">소요</th>
                    <th className="px-4 py-3 text-right font-normal">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSubjects.map((sub) => {
                    const isSelected = selectedSubjectId === sub.id;
                    const isExamRunning =
                      currentSec >= sub.startSec && currentSec <= sub.endSec;
                    const isFinished = currentSec > sub.endSec;

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => handleSelectSubject(sub)}
                        className={`cursor-pointer border-b border-divider-soft transition-colors last:border-b-0 ${
                          isSelected
                            ? 'bg-row-selected'
                            : 'hover:bg-surface-pearl'
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span
                              className={`h-6 w-0.5 rounded-pill ${
                                isSelected ? 'bg-primary' : 'bg-hairline'
                              }`}
                            />
                            <div>
                              <div className="text-[12px] font-normal leading-none tracking-[-0.12px] text-ink-muted-48">
                                {sub.period}
                              </div>
                              <div
                                className={`mt-0.5 text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] ${
                                  isSelected ? 'text-primary' : 'text-ink'
                                }`}
                              >
                                {sub.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 font-mono text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-80">
                          {sub.startTime} ~ {sub.endTime}
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48">
                          {sub.durationMin}분
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {isExamRunning ? (
                            <span className="inline-flex items-center gap-1.5 rounded-pill border border-primary px-3 py-1 text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              진행중
                            </span>
                          ) : isFinished ? (
                            <span className="inline-flex items-center gap-1 text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              종료
                            </span>
                          ) : isSelected ? (
                            <span className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-primary">
                              선택됨
                            </span>
                          ) : (
                            <span className="text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48">
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

            <div className="mt-4 flex items-start gap-2 text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                과목 행을 클릭하면 해당 과목{' '}
                <span className="font-semibold text-ink-muted-80">시작 10초 전</span>
                으로 시계가 설정됩니다.
              </p>
            </div>
          </section>

          {/* Clock tile — product-tile-light */}
          <section className="flex flex-col bg-canvas px-5 py-12 sm:px-8 sm:py-20 lg:col-span-7 lg:px-12">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-primary">
                  Examination Clock
                </p>
                <h2 className="mt-1 font-display text-[34px] font-semibold leading-[1.47] tracking-[-0.374px] text-ink sm:text-[40px] sm:leading-[1.1] sm:tracking-normal">
                  아날로그 시계
                </h2>
                <p className="mt-2 max-w-md font-display text-[21px] font-normal leading-[1.19] tracking-[0.231px] text-ink-muted-80 sm:text-[24px] sm:font-light sm:leading-[1.5] sm:tracking-normal">
                  실제 수능 시험 시각 기준 · 초침 포함
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setShowDigital(!showDigital)}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border-[3px] border-divider-soft bg-surface-pearl px-3.5 py-2 text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-80 active:scale-95"
                >
                  {showDigital ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5 text-primary" />
                      디지털 숨기기
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      디지털 보기
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={enterClockFullscreen}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border-[3px] border-divider-soft bg-surface-pearl px-3.5 py-2 text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-80 active:scale-95"
                  title="아날로그 시계만 전체화면"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-primary" />
                  시계 전체화면
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-1 flex-col items-center">
              <AnalogClock currentSec={currentSec} isDark={isDark} />

              {showDigital && (
                <div className="mt-4 w-full max-w-md space-y-3">
                  <div className="rounded-lg border border-hairline bg-canvas-parchment px-6 py-5 text-center">
                    <div className="mb-2 flex items-center justify-center gap-1.5 text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      현재 디지털 시각 (24시간)
                    </div>
                    <div className="font-display text-[40px] font-semibold leading-[1.1] tracking-normal text-ink sm:text-[56px] sm:leading-[1.07] sm:tracking-[-0.28px]">
                      {formatTimeSeconds(currentSec)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-hairline bg-canvas-parchment px-6 py-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 text-left">
                        <div className="text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48">
                          현재 타이머 진행 상태
                        </div>
                        <div className="mt-1 truncate text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-ink">
                          {currentPhase.title}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48">
                          남은 시간
                        </div>
                        <div className="mt-1 font-mono text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-primary">
                          {formatDuration(currentPhase.remainingSec)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-10 w-full max-w-xl">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handlePrevSubject}
                    className="flex h-11 items-center gap-1.5 rounded-sm bg-ink px-4 text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-on-dark active:scale-95"
                    title="이전 과목으로 이동"
                  >
                    <SkipBack className="h-4 w-4" />
                    <span className="hidden sm:inline">이전 과목</span>
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-12 min-w-[160px] flex-1 max-w-[200px] items-center justify-center gap-2 rounded-pill bg-primary px-7 text-[18px] font-light leading-none text-on-primary outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary-focus active:scale-95"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="h-5 w-5 fill-current" />
                        일시정지
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 fill-current" />
                        타이머 시작
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetCurrent}
                    className="flex h-11 items-center gap-1.5 rounded-sm bg-ink px-4 text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-on-dark active:scale-95"
                    title="선택된 과목 시작 10초 전으로 리셋"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">처음부터</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextSubject}
                    className="flex h-11 items-center gap-1.5 rounded-sm bg-ink px-4 text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-on-dark active:scale-95"
                    title="다음 과목으로 이동"
                  >
                    <span className="hidden sm:inline">다음 과목</span>
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Dark tile notice band */}
        <section className="bg-surface-tile-1 px-5 py-16 text-center sm:px-8 sm:py-20">
          <p className="mx-auto max-w-2xl font-display text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-on-dark sm:text-[34px] sm:font-semibold sm:leading-[1.47] sm:tracking-[-0.374px]">
            시작·종료는 사이렌, 남은 시간은 TTS
          </p>
          <p className="mx-auto mt-4 max-w-lg text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-body-muted">
            시험 시작·종료 시각에는 사이렌이 울립니다. 종료 전 안내는 TTS로
            「10분 남았습니다」(30분 시험은 「5분 남았습니다」)를 안내합니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => playSirenSound(SIREN_DURATION_SEC)}
              className="inline-flex items-center gap-2 rounded-pill bg-primary px-[22px] py-[11px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-on-primary active:scale-95"
            >
              <Bell className="h-4 w-4" />
              사이렌 테스트
            </button>
            <button
              type="button"
              onClick={() => speakTts('10분 남았습니다')}
              className="inline-flex items-center gap-2 rounded-pill border border-primary-on-dark bg-transparent px-[22px] py-[11px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-primary-on-dark active:scale-95"
            >
              TTS 테스트
            </button>
            <button
              type="button"
              onClick={() => speakTts('5분 남았습니다')}
              className="inline-flex items-center gap-2 rounded-pill border border-primary-on-dark bg-transparent px-[22px] py-[11px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-primary-on-dark active:scale-95"
            >
              TTS 5분 테스트
            </button>
          </div>
        </section>
      </main>

      {/* Confirm subject change during active exam */}
      <dialog
        ref={confirmDialogRef}
        className="confirm-dialog w-[min(100%-2rem,420px)] rounded-lg border border-hairline bg-canvas p-0 text-ink shadow-none open:fixed open:inset-0 open:m-auto"
        onCancel={handleCancelSubjectChange}
        onClose={() => setPendingSubject(null)}
      >
        <form
          method="dialog"
          className="px-6 py-6"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <h3 className="font-display text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">
            시험 진행 중
          </h3>
          <p className="mt-3 text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-ink-muted-80">
            현재{' '}
            <span className="font-semibold text-ink">
              {currentPhase.subject
                ? `[${currentPhase.subject.period}] ${currentPhase.subject.name} 영역`
                : currentPhase.title}
            </span>
            이 진행 중입니다.
            {pendingSubject && (
              <>
                {' '}
                <span className="font-semibold text-ink">
                  [{pendingSubject.period}] {pendingSubject.name}
                </span>
                (으)로 이동하면 시계가 해당 과목 시작 10초 전으로 바뀝니다. 계속할까요?
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelSubjectChange}
              className="rounded-pill border border-primary bg-canvas px-[22px] py-[11px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-primary active:scale-95"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirmSubjectChange}
              className="rounded-pill bg-primary px-[22px] py-[11px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-on-primary active:scale-95"
            >
              변경
            </button>
          </div>
        </form>
      </dialog>

      {/* footer */}
      <footer className="bg-canvas-parchment px-5 py-16 text-ink-muted-80 sm:px-8">
        <div className="mx-auto max-w-[980px]">
          <p className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-ink">
            수능 실전 타이머
          </p>
          <p className="mt-3 max-w-xl text-[17px] font-normal leading-[2.41] tracking-normal text-ink-muted-80">
            대학수학능력시험 실전 시뮬레이션
          </p>
          <p className="mt-8 text-[12px] font-normal leading-none tracking-[-0.12px] text-ink-muted-48">
            실제 수능 시험 시각 기준 아날로그 시계 & 자동 연속 진행 타이머
          </p>
        </div>
      </footer>

      {/* Analog clock only — fullscreen (no remaining time / chrome) */}
      {isClockFullscreen && (
        <div
          ref={clockFullscreenRef}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas"
        >
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={exitClockFullscreen}
              className="flex items-center gap-1.5 rounded-md border-[3px] border-divider-soft bg-surface-pearl px-3.5 py-2 text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-80 active:scale-95"
            >
              <Minimize2 className="h-3.5 w-3.5 text-primary" />
              전체화면 종료
            </button>
          </div>
          <AnalogClock currentSec={currentSec} isDark={isDark} large />
          <p className="mt-4 text-[12px] font-normal leading-none tracking-[-0.12px] text-ink-muted-48">
            Esc 또는 우측 상단 버튼으로 종료
          </p>
        </div>
      )}
    </div>
  );
}
