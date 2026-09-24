import React, { useState } from 'react';
import { AlertOctagon, Check, Plus, Sliders, Trash2, X, Zap } from 'lucide-react';
import { DetectionRule, IncidentSeverity, RuleType } from '../types';

interface RulesConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: DetectionRule[];
  onToggleRule: (ruleId: string) => void;
  onAddRule: (rule: DetectionRule) => void;
  onDeleteRule: (ruleId: string) => void;
  zThreshold: number;
  onZThresholdChange: (threshold: number) => void;
}

export const RulesConfigModal: React.FC<RulesConfigModalProps> = ({
  isOpen,
  onClose,
  rules,
  onToggleRule,
  onAddRule,
  onDeleteRule,
  zThreshold,
  onZThresholdChange,
}) => {
  if (!isOpen) return null;

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<RuleType>('threshold');
  const [severity, setSeverity] = useState<IncidentSeverity>('P2');
  const [serviceMatch, setServiceMatch] = useState('*');
  const [metric, setMetric] = useState<'latencyMs' | 'errorRatePct' | 'cpuPct'>('latencyMs');
  const [operator, setOperator] = useState<'>' | '>=' | '<'>('>=');
  const [thresholdValue, setThresholdValue] = useState<number>(1000);
  const [patternRegex, setPatternRegex] = useState('');
  const [targetIncidentTitle, setTargetIncidentTitle] = useState('');

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newRule: DetectionRule = {
      id: `rule_custom_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Custom operator detection rule',
      enabled: true,
      severity,
      ruleType,
      conditions:
        ruleType === 'threshold'
          ? [
              {
                serviceMatch,
                metric,
                operator,
                value: Number(thresholdValue),
              },
            ]
          : [
              {
                serviceMatch,
                patternRegex: patternRegex.trim(),
              },
            ],
      targetIncidentTitle: targetIncidentTitle.trim() || name.trim(),
      triggerCount: 0,
    };

    onAddRule(newRule);
    setIsAdding(false);
    setName('');
    setDescription('');
    setTargetIncidentTitle('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-3xl w-full p-5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                Detection Rules & Anomaly Detection Tuning
              </h3>
              <p className="text-xs text-zinc-400">
                Configure threshold rules, pattern matches, and statistical 3σ sensitivity
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statistical Anomaly Detection Slider Bar */}
        <div className="my-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-zinc-200">
                Statistical Anomaly Sensitivity (Z-Score Threshold)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              ±{zThreshold.toFixed(1)}σ ({zThreshold >= 3.0 ? 'Strict 99.7%' : 'Sensitive'})
            </span>
          </div>
          <input
            type="range"
            min="1.5"
            max="4.5"
            step="0.1"
            value={zThreshold}
            onChange={(e) => onZThresholdChange(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1.5">
            <span>1.5σ (High False Alarms)</span>
            <span>3.0σ (Standard 3-Sigma Rule)</span>
            <span>4.5σ (Extreme Outliers Only)</span>
          </div>
        </div>

        {/* Rules List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Active Detection Rules ({rules.length})
            </span>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="text-xs font-medium px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancel' : 'Add Custom Rule'}</span>
            </button>
          </div>

          {/* Add Rule Form */}
          {isAdding && (
            <form onSubmit={handleCreateRule} className="p-4 rounded-xl bg-zinc-900 border border-indigo-500/50 space-y-3 text-xs animate-fadeIn">
              <h4 className="font-bold text-indigo-300">Create New Detection Rule</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Memory Spike on Checkout"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 rounded bg-zinc-950 border border-zinc-700 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                    className="w-full p-2 rounded bg-zinc-950 border border-zinc-700 text-zinc-200"
                  >
                    <option value="P1">P1 Critical</option>
                    <option value="P2">P2 High</option>
                    <option value="P3">P3 Medium</option>
                    <option value="P4">P4 Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Target Service</label>
                  <select
                    value={serviceMatch}
                    onChange={(e) => setServiceMatch(e.target.value)}
                    className="w-full p-2 rounded bg-zinc-950 border border-zinc-700 text-zinc-200"
                  >
                    <option value="*">All Services (*)</option>
                    <option value="checkout-service">checkout-service</option>
                    <option value="payment-service">payment-service</option>
                    <option value="inventory-db">inventory-db</option>
                    <option value="auth-service">auth-service</option>
                    <option value="api-gateway">api-gateway</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Metric</label>
                  <select
                    value={metric}
                    onChange={(e) => setMetric(e.target.value as any)}
                    className="w-full p-2 rounded bg-zinc-950 border border-zinc-700 text-zinc-200"
                  >
                    <option value="latencyMs">Latency (ms)</option>
                    <option value="errorRatePct">Error Rate (%)</option>
                    <option value="cpuPct">CPU Saturation (%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Threshold Value</label>
                  <input
                    type="number"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(Number(e.target.value))}
                    className="w-full p-2 rounded bg-zinc-950 border border-zinc-700 text-zinc-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 text-white font-bold"
                >
                  Save Rule
                </button>
              </div>
            </form>
          )}

          {/* List of Rules */}
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 text-xs ${
                rule.enabled
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-zinc-950 border-zinc-900 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => onToggleRule(rule.id)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                        rule.severity === 'P1'
                          ? 'bg-rose-500/20 text-rose-300'
                          : rule.severity === 'P2'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {rule.severity}
                    </span>
                    <span className="font-bold text-zinc-200">{rule.name}</span>
                    <span className="text-[10px] uppercase font-mono px-1 rounded bg-zinc-800 text-zinc-400">
                      {rule.ruleType}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{rule.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-right">
                <span className="font-mono text-[10px] text-zinc-500">
                  Fired {rule.triggerCount} times
                </span>
                {rule.id.startsWith('rule_custom_') && (
                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-1 rounded text-zinc-500 hover:text-rose-400 transition"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-800 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
