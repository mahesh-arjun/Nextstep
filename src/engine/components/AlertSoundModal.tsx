import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Disc,
  Info,
  Play,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  AlertSoundType,
  AudioSettings,
  ResolutionSoundType,
  audioNotifier,
} from '../services/audioNotifier';

interface AlertSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: (settings: AudioSettings) => void;
}

const ALERT_SOUND_OPTIONS: {
  id: AlertSoundType;
  name: string;
  category: string;
  description: string;
  tag: string;
  tagColor: string;
}[] = [
  {
    id: 'cyber-siren',
    name: 'Cyber Siren (Standard SRE)',
    category: 'Urgent Ops',
    description: 'Two-tone 880Hz → 587Hz pitch sweep. High urgency for critical P1 outages.',
    tag: 'Recommended',
    tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  {
    id: 'sonar-pulse',
    name: 'Sonar Pulse',
    category: 'Subtle Electronic',
    description: 'Clean resonant 1175Hz radar ping. High visibility with low operator fatigue.',
    tag: 'Low Fatigue',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'critical-klaxon',
    name: 'Critical Klaxon',
    category: 'Emergency Evacuation',
    description: 'Dual pulsed industrial square-wave burst. Unmissable for production meltdowns.',
    tag: 'Max Urgency',
    tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  {
    id: 'modern-marimba',
    name: 'Modern Marimba',
    category: 'Melodic Acoustic',
    description: 'Warm, elegant 3-tone acoustic triad (A4-C#5-E5). Gentle on ears in open offices.',
    tag: 'Office Friendly',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'synth-beacon',
    name: 'Synth Beacon',
    category: 'Sci-Fi Telemetry',
    description: 'Fast 4-tone ascending sci-fi arpeggio. Crisp digital presence.',
    tag: 'Modern',
    tagColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  {
    id: 'sub-bass-rumble',
    name: 'Sub-Bass Tactical Drop',
    category: 'Low Frequency',
    description: 'Deep 160Hz → 45Hz sub-bass thump. Heavy tactile response with headphones/subwoofers.',
    tag: 'Tactile',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
];

const RESOLUTION_SOUND_OPTIONS: {
  id: ResolutionSoundType;
  name: string;
  description: string;
}[] = [
  {
    id: 'harmonic-chimes',
    name: 'Harmonic Major 7th Chimes',
    description: 'Uplifting 5-note crystalline resolution progression.',
  },
  {
    id: 'retro-level-up',
    name: 'Retro 8-Bit Level Up',
    description: 'Fast nostalgic 8-bit positive fanfare.',
  },
  {
    id: 'zen-bell',
    name: 'Zen Temple Bowl',
    description: 'Harmonic 528Hz Solfeggio soothing resonance.',
  },
];

export const AlertSoundModal: React.FC<AlertSoundModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged,
}) => {
  const [settings, setSettings] = useState<AudioSettings>(() => audioNotifier.getSettings());
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdate = (partial: Partial<AudioSettings>) => {
    const updated = audioNotifier.updateSettings(partial);
    setSettings(updated);
    if (onSettingsChanged) onSettingsChanged(updated);
  };

  const handleTestAlert = (sound: AlertSoundType, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPlayingPreview(`alert-${sound}`);
    audioNotifier.testAlertSound(sound, settings.volume);
    setTimeout(() => setPlayingPreview(null), 600);
  };

  const handleTestResolution = (sound: ResolutionSoundType, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPlayingPreview(`res-${sound}`);
    audioNotifier.testResolutionSound(sound, settings.volume);
    setTimeout(() => setPlayingPreview(null), 800);
  };

  const handleTestSiren = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPlayingPreview('harmful-siren');
    audioNotifier.testHarmfulServerSiren();
    setTimeout(() => setPlayingPreview(null), 3600);
  };

  const handleStopSiren = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    audioNotifier.stopSiren();
    setPlayingPreview(null);
  };

  const handleResetDefaults = () => {
    const defaults: Partial<AudioSettings> = {
      enabled: true,
      volume: 0.75,
      alertSound: 'cyber-siren',
      resolutionSound: 'harmonic-chimes',
      severityThreshold: 'P1_P2',
      alertOnAnomalies: false,
      harmfulServerSirenEnabled: true,
      cooldownSeconds: 3,
    };
    handleUpdate(defaults);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                System Alert Sound & Audio Telemetry
              </h2>
              <p className="text-xs text-zinc-400">
                Configure operational acoustic alarms, sound profiles, and alert thresholds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Master Enable & Volume Section */}
          <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdate({ enabled: !settings.enabled })}
                className={`p-3 rounded-xl border transition ${
                  settings.enabled
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {settings.enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <div>
                <span className="text-sm font-semibold text-zinc-200">
                  {settings.enabled ? 'Audio Alerts Active' : 'Audio Alerts Muted'}
                </span>
                <p className="text-xs text-zinc-400">
                  {settings.enabled
                    ? 'Sound triggers on new incidents and resolution milestones'
                    : 'No audible alerts will sound'}
                </p>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 w-full sm:w-56">
              <span className="text-xs font-mono text-zinc-400 w-12">
                {Math.round(settings.volume * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <button
                onClick={() => handleTestAlert(settings.alertSound)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1 transition"
                title="Test Volume"
              >
                <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                <span>Test</span>
              </button>
            </div>
          </div>

          {/* Sound Profile Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                Select Incident Alert Sound Profile
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">
                Active: {ALERT_SOUND_OPTIONS.find((s) => s.id === settings.alertSound)?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALERT_SOUND_OPTIONS.map((profile) => {
                const isSelected = settings.alertSound === profile.id;
                const isTesting = playingPreview === `alert-${profile.id}`;

                return (
                  <div
                    key={profile.id}
                    onClick={() => {
                      handleUpdate({ alertSound: profile.id });
                      handleTestAlert(profile.id);
                    }}
                    className={`cursor-pointer rounded-xl p-3.5 border transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/70 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-950/50'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isSelected ? 'bg-indigo-400 ring-2 ring-indigo-400/30' : 'bg-zinc-600'
                            }`}
                          />
                          <span className="text-xs font-bold text-zinc-100">{profile.name}</span>
                        </div>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${profile.tagColor}`}
                        >
                          {profile.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                        {profile.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {profile.category}
                      </span>
                      <button
                        onClick={(e) => handleTestAlert(profile.id, e)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition ${
                          isTesting
                            ? 'bg-indigo-600 text-white animate-pulse'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                        <span>{isTesting ? 'Playing...' : 'Preview'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trigger Severity Threshold */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Alert Trigger Severity Filter
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleUpdate({ severityThreshold: 'P1_ONLY' })}
                className={`p-3 rounded-lg border text-left transition ${
                  settings.severityThreshold === 'P1_ONLY'
                    ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-400">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>P1 Critical Only</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Alerts strictly for critical outages and cascading root causes.
                </p>
              </button>

              <button
                onClick={() => handleUpdate({ severityThreshold: 'P1_P2' })}
                className={`p-3 rounded-lg border text-left transition ${
                  settings.severityThreshold === 'P1_P2'
                    ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span>P1 & P2 Incidents</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Default: Signals both critical and high-priority degradations.
                </p>
              </button>

              <button
                onClick={() => handleUpdate({ severityThreshold: 'ALL' })}
                className={`p-3 rounded-lg border text-left transition ${
                  settings.severityThreshold === 'ALL'
                    ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-400">
                  <Bell className="w-3.5 h-3.5" />
                  <span>All Incidents (P1 - P4)</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Acoustic confirmation for every correlated incident ticket.
                </p>
              </button>
            </div>
          </div>

          {/* Harmful Server Emergency Siren Control */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-red-950/20 to-zinc-900/60 border border-rose-500/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-2">
                    Harmful Server Emergency Siren
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30">
                      Automatic Trigger
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Synthesizes an authentic multi-cycle emergency wail (460Hz → 1040Hz) when a server crashes, is overwhelmed by rogue traffic, or enters critical failure.
                  </p>
                </div>
              </div>

              {/* Siren Enable Toggle */}
              <button
                onClick={() =>
                  handleUpdate({ harmfulServerSirenEnabled: !settings.harmfulServerSirenEnabled })
                }
                className={`w-11 h-6 flex items-center rounded-full p-0.5 transition ${
                  settings.harmfulServerSirenEnabled ? 'bg-rose-600' : 'bg-zinc-800'
                }`}
                title={
                  settings.harmfulServerSirenEnabled
                    ? 'Harmful Server Siren Enabled'
                    : 'Harmful Server Siren Disabled'
                }
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow-md transform transition ${
                    settings.harmfulServerSirenEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-rose-950/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-zinc-400 font-mono text-[11px]">
                {settings.harmfulServerSirenEnabled
                  ? '🚨 Siren will blare when harmful nodes are detected'
                  : 'Muted for harmful servers'}
              </span>

              <div className="flex items-center gap-2">
                {playingPreview === 'harmful-siren' ? (
                  <button
                    onClick={handleStopSiren}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-rose-500/40 font-mono transition"
                  >
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>Silence Siren</span>
                  </button>
                ) : (
                  <button
                    onClick={handleTestSiren}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/30 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Test Emergency Siren</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Resolution Chime & Cooldown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Resolution Chime Selector */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Resolution Chime
              </label>
              <div className="space-y-2">
                {RESOLUTION_SOUND_OPTIONS.map((resSound) => {
                  const isSelected = settings.resolutionSound === resSound.id;
                  const isTesting = playingPreview === `res-${resSound.id}`;

                  return (
                    <div
                      key={resSound.id}
                      onClick={() => {
                        handleUpdate({ resolutionSound: resSound.id });
                        handleTestResolution(resSound.id);
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:bg-zinc-850'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold block">{resSound.name}</span>
                        <span className="text-[10px] text-zinc-500">{resSound.description}</span>
                      </div>
                      <button
                        onClick={(e) => handleTestResolution(resSound.id, e)}
                        className={`p-1.5 rounded-md text-xs transition ${
                          isTesting
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cooldown Throttle & Anomaly Ping */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 mb-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  Alert Throttle Cooldown
                </label>
                <p className="text-[11px] text-zinc-500 mb-2">
                  Minimum quiet gap between consecutive siren alarms during high-volume spikes.
                </p>
                <div className="flex gap-2">
                  {[1, 3, 5, 10].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => handleUpdate({ cooldownSeconds: sec })}
                      className={`flex-1 py-1.5 rounded-md font-mono text-xs border transition ${
                        settings.cooldownSeconds === sec
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Anomaly Audio Ping Toggle */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Anomaly Radar Ping
                  </span>
                  <p className="text-[10px] text-zinc-500">
                    Subtle micro-click when 3-sigma statistical deviation occurs
                  </p>
                </div>
                <button
                  onClick={() => handleUpdate({ alertOnAnomalies: !settings.alertOnAnomalies })}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition ${
                    settings.alertOnAnomalies ? 'bg-indigo-600' : 'bg-zinc-800'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                      settings.alertOnAnomalies ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
              Saved automatically
            </span>
            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
