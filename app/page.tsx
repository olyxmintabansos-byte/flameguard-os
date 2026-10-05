"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Download, Zap, Flame } from "lucide-react";

type HeatmapCell = 0 | 1 | 2 | 3 | 4;

const WEEKS = 52;
const DAYS = 7;

export default function Home() {
  const [grid, setGrid] = useState<HeatmapCell[][]>(
    Array(WEEKS)
      .fill(null)
      .map(() => Array(DAYS).fill(0))
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushLevel, setBrushLevel] = useState<HeatmapCell>(4);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Particle fire effect
  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
  }

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playIgniteSound = useCallback(() => {
    const ctx = initAudio();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }, [initAudio]);

  const paintCell = (week: number, day: number) => {
    setGrid((prev) => {
      const newGrid = prev.map((row) => [...row]);
      newGrid[week][day] = brushLevel;
      return newGrid;
    });
    playIgniteSound();
  };

  const handleCellMouseDown = (week: number, day: number) => {
    setIsDrawing(true);
    paintCell(week, day);
  };

  const handleCellMouseEnter = (week: number, day: number) => {
    if (isDrawing) paintCell(week, day);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Canvas particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.fillStyle = "rgba(7, 9, 14, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.vy += 0.1;

        const gradient = ctx.createLinearGradient(p.x, p.y - p.size, p.x, p.y + p.size);
        gradient.addColorStop(0, `rgba(245, 158, 11, ${p.life * 0.6})`);
        gradient.addColorStop(0.5, `rgba(255, 69, 0, ${p.life * 0.4})`);
        gradient.addColorStop(1, "rgba(239, 68, 68, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const emitParticles = (x: number, y: number, count = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2) - 2,
        life: 1,
        size: 2 + Math.random() * 3,
      });
    }
  };

  const presets = {
    api: () => {
      const newGrid = Array(WEEKS)
        .fill(null)
        .map(() => Array(DAYS).fill(0));
      "API".split("").forEach((char, i) => {
        const patterns: Record<string, number[][]> = {
          A: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1],
            [1, 0, 1],
          ],
          P: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1],
            [1, 0, 0],
          ],
          I: [[1], [1], [1], [1]],
        };
        const pattern = patterns[char] || [];
        pattern.forEach((row, y) => {
          row.forEach((val, x) => {
            const w = i * 6 + x;
            if (w < WEEKS && y < DAYS) newGrid[w][y] = val as HeatmapCell;
          });
        });
      });
      setGrid(newGrid);
      emitParticles(window.innerWidth / 2, window.innerHeight / 2, 20);
    },
    solid: () => {
      setGrid(Array(WEEKS).fill(Array(DAYS).fill(4)));
      emitParticles(window.innerWidth / 2, window.innerHeight / 2, 20);
    },
    hundred: () => {
      const newGrid = Array(WEEKS)
        .fill(null)
        .map(() => Array(DAYS).fill(4));
      setGrid(newGrid);
      emitParticles(window.innerWidth / 2, window.innerHeight / 2, 20);
    },
  };

  const streakDays = grid.flat().filter((c) => c > 0).length;
  const maxStreak = 52 * 7;
  const consistency = Math.round((streakDays / (maxStreak * 0.7)) * 100);

  const generatePatchScript = (date: string, repo: string, email: string) => {
    const targetDate = new Date(date);
    const dateStr = targetDate.toISOString().split("T")[0];
    const script = `#!/bin/bash
# Patch commit untuk: ${dateStr}
export GIT_AUTHOR_DATE="${dateStr}T00:00:00+08:00"
export GIT_COMMITTER_DATE="${dateStr}T00:00:00+08:00"
git commit --allow-empty -m "🔥 Consistency patch: ${dateStr}" --author="${email}"
git push origin main`;
    return script;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cellColor = (level: HeatmapCell) => {
    const colors = [
      "bg-slate-700/40",
      "bg-emerald-700",
      "bg-emerald-500",
      "bg-emerald-400",
      "bg-emerald-300",
    ];
    return colors[level];
  };

  return (
    <main className="min-h-screen bg-[var(--primary)] p-8 overflow-x-auto">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">
            <span className="flame-text">FLAMEGUARD</span>
          </h1>
          <p className="text-emerald-400 text-lg">
            Biar Kotak-Kotak Hijau Lu Gak Bolong, Api TikTok Lu Gak Pernah Padam.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4">
            <div className="text-xs text-emerald-400 uppercase tracking-wider">
              Streak Days
            </div>
            <div className="text-3xl font-bold text-emerald-300 mt-1">
              {streakDays}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-amber-400 uppercase tracking-wider">
              Fire 🔥
            </div>
            <div className="text-3xl font-bold text-amber-300 mt-1">
              {consistency}%
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-orange-400 uppercase tracking-wider">
              Max Potential
            </div>
            <div className="text-3xl font-bold text-orange-300 mt-1">
              {maxStreak}
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="text-xs text-red-400 uppercase tracking-wider">
              Flame Tier
            </div>
            <div className="text-3xl font-bold text-red-300 mt-1">
              {Math.floor(consistency / 20)}
            </div>
          </div>
        </div>

        {/* Brush level selector */}
        <div className="glass-card p-4 mb-8">
          <div className="text-sm text-emerald-400 mb-3">Brush Intensity</div>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((level) => (
              <button
                key={level}
                onClick={() => setBrushLevel(level as HeatmapCell)}
                className={`w-8 h-8 rounded transition-transform ${
                  brushLevel === level ? "scale-125 ring-2 ring-emerald-400" : ""
                } ${cellColor(level as HeatmapCell)}`}
              />
            ))}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="glass-card p-6 mb-8 overflow-x-auto">
          <div className="flex gap-1 pb-4" style={{ minWidth: "fit-content" }}>
            {grid.map((week, w) => (
              <div key={w} className="flex flex-col gap-1">
                {week.map((cell, d) => (
                  <div
                    key={`${w}-${d}`}
                    className={`heatmap-cell ${cellColor(cell)}`}
                    onMouseDown={() => handleCellMouseDown(w, d)}
                    onMouseEnter={() => handleCellMouseEnter(w, d)}
                    title={`Week ${w + 1}, Day ${d + 1}: Level ${cell}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="glass-card p-6 mb-8">
          <div className="text-sm text-emerald-400 mb-4 uppercase tracking-wider">
            Quick Presets
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => presets.api()}
              className="bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 px-4 py-2 rounded transition"
            >
              API 🔥
            </button>
            <button
              onClick={() => presets.solid()}
              className="bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 px-4 py-2 rounded transition"
            >
              SOLID GREEN
            </button>
            <button
              onClick={() => presets.hundred()}
              className="bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 px-4 py-2 rounded transition"
            >
              100% 🎯
            </button>
            <button
              onClick={() => setGrid(Array(WEEKS).fill(Array(DAYS).fill(0)))}
              className="bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 px-4 py-2 rounded transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Emergency Patch Generator */}
        <div className="glass-card p-6 mb-8">
          <div className="text-sm text-amber-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Zap size={16} />
            Emergency Patch Generator
          </div>
          <PatchGenerator onGenerate={generatePatchScript} onCopy={copyToClipboard} copied={copied} />
        </div>

        {/* Story Card Preview */}
        <div className="glass-card p-6">
          <div className="text-sm text-orange-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Flame size={16} />
            Story Flex Card Preview
          </div>
          <StoryCardPreview stats={{ streakDays, consistency, tier: Math.floor(consistency / 20) }} />
        </div>
      </div>
    </main>
  );
}

function PatchGenerator({
  onGenerate,
  onCopy,
  copied,
}: {
  onGenerate: (date: string, repo: string, email: string) => string;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const [date, setDate] = useState("");
  const [repo, setRepo] = useState("my-repo");
  const [email, setEmail] = useState("user@github.com");
  const [script, setScript] = useState("");

  const generate = () => {
    if (!date) return;
    const result = onGenerate(date, repo, email);
    setScript(result);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-slate-800/50 border border-emerald-500/30 rounded px-3 py-2 text-white placeholder-slate-500"
        />
        <input
          type="text"
          placeholder="Repository name"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          className="bg-slate-800/50 border border-emerald-500/30 rounded px-3 py-2 text-white placeholder-slate-500"
        />
        <input
          type="email"
          placeholder="Git email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-slate-800/50 border border-emerald-500/30 rounded px-3 py-2 text-white placeholder-slate-500"
        />
      </div>
      <button
        onClick={generate}
        className="bg-amber-600/50 hover:bg-amber-600/70 border border-amber-500/50 px-4 py-2 rounded transition w-full"
      >
        Generate Script
      </button>
      {script && (
        <div className="relative">
          <pre className="bg-slate-900 border border-emerald-500/30 rounded p-3 text-xs text-emerald-300 overflow-x-auto">
            {script}
          </pre>
          <button
            onClick={() => onCopy(script)}
            className="absolute top-2 right-2 bg-emerald-600/50 hover:bg-emerald-600/70 p-2 rounded flex items-center gap-1 text-xs"
          >
            <Copy size={12} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

function StoryCardPreview({
  stats,
}: {
  stats: { streakDays: number; consistency: number; tier: number };
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const downloadCard = () => {
    if (!cardRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#07090e";
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🔥 " + stats.streakDays, 540, 500);

    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 80px Arial";
    ctx.fillText("STREAK MASTER", 540, 700);

    ctx.fillStyle = "#10b981";
    ctx.font = "60px Arial";
    ctx.fillText(stats.consistency + "% CONSISTENCY", 540, 900);

    ctx.fillStyle = "#ff4500";
    ctx.font = "bold 100px Arial";
    ctx.fillText("TIER " + stats.tier, 540, 1200);

    const link = document.createElement("a");
    link.href = canvas.toDataURL();
    link.download = "flameguard-story.png";
    link.click();
  };

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="w-full max-w-sm aspect-[9/16] mx-auto glass-card p-8 flex flex-col justify-center items-center text-center"
      >
        <div className="text-7xl mb-4 flame-text">🔥</div>
        <div className="text-5xl font-bold text-emerald-300 mb-6">
          {stats.streakDays}
        </div>
        <div className="text-2xl font-bold text-amber-400 mb-4">
          STREAK MASTER
        </div>
        <div className="text-lg text-emerald-400 mb-6">
          {stats.consistency}% CONSISTENCY
        </div>
        <div className="text-4xl font-bold text-orange-400">
          TIER {stats.tier}
        </div>
      </div>
      <button
        onClick={downloadCard}
        className="w-full bg-emerald-600/50 hover:bg-emerald-600/70 border border-emerald-500/50 px-4 py-2 rounded transition flex items-center justify-center gap-2"
      >
        <Download size={16} />
        Download Card
      </button>
    </div>
  );
}
