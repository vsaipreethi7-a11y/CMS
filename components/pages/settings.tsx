'use client';

import { useState, useEffect, useRef } from 'react';
import { Key, Zap, Database, Download, Upload, Trash2, RefreshCw, ExternalLink, Eye, EyeOff, Loader2, Check, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGroq } from '@/hooks/use-groq';

interface SettingsProps {
  onClearData: () => void;
  onLoadDemoData: () => void;
  onExportData: () => void;
  onImportData: (data: string) => boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const MODELS = [
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Fast, efficient' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Most capable' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: '32K context' },
];

export function Settings({
  onClearData,
  onLoadDemoData,
  onExportData,
  onImportData,
  showToast
}: SettingsProps) {
  const { complete } = useGroq();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('llama-3.1-8b-instant');
  const [temperature, setTemperature] = useState(0.7);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiKey(localStorage.getItem('groq_api_key') || '');
      setModel(localStorage.getItem('groq_model') || 'llama-3.1-8b-instant');
      setTemperature(parseFloat(localStorage.getItem('groq_temp') || '0.7'));
    }
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('groq_api_key', apiKey);
    showToast('API key saved');
    setTestResult(null);
  };

  const handleSaveModel = (newModel: string) => {
    setModel(newModel);
    localStorage.setItem('groq_model', newModel);
    showToast('Model updated');
  };

  const handleSaveTemperature = (newTemp: number) => {
    setTemperature(newTemp);
    localStorage.setItem('groq_temp', newTemp.toString());
  };

  const handleTestConnection = async () => {
    if (!apiKey) {
      showToast('Please enter an API key first', 'error');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await complete('Say hello in exactly 5 words.');
      setTestResult({ success: true, message: response });
      showToast('Connection successful');
    } catch (error) {
      setTestResult({ success: false, message: error instanceof Error ? error.message : 'Connection failed' });
      showToast('Connection failed', 'error');
    }
    setIsTesting(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      const success = onImportData(data);
      if (success) {
        showToast('Data imported successfully');
      } else {
        showToast('Failed to import data', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    onClearData();
    setApiKey('');
    setModel('llama-3.1-8b-instant');
    setTemperature(0.7);
    setShowClearConfirm(false);
    showToast('All data cleared');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your Groq AI integration and manage data</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          Groq API Configuration
        </h2>

        <div className="space-y-5">
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
              <span>API Key</span>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Get your key <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="gsk_..."
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={handleSaveApiKey}>
                Save
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Model</label>
            <div className="grid grid-cols-3 gap-3">
              {MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSaveModel(m.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    model === m.id
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
              <span>Temperature</span>
              <span className="font-mono text-foreground">{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={temperature}
              onChange={e => handleSaveTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey}
              variant="outline"
              className="w-full"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>

            {testResult && (
              <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {testResult.success ? (
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <p className="text-sm">{testResult.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-secondary" />
          Data Management
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Button onClick={onExportData} variant="outline" className="justify-start">
            <Download className="w-4 h-4 mr-2" />
            Export All Data
          </Button>

          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="justify-start">
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          <Button
            onClick={() => {
              onLoadDemoData();
              showToast('Demo data loaded');
            }}
            variant="outline"
            className="justify-start"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Load Demo Data
          </Button>

          {showClearConfirm ? (
            <div className="col-span-2 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400 flex-1">Are you sure? This cannot be undone.</span>
              <Button size="sm" variant="outline" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleClear}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Clear All
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setShowClearConfirm(true)}
              variant="outline"
              className="justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-muted-foreground" />
          About
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono text-foreground">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tech Stack</span>
            <span className="text-foreground">Next.js, React, Tailwind CSS, Groq AI</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Storage</span>
            <span className="text-foreground">Browser LocalStorage</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            CMS Nexus - AI-Powered Multi-CMS Integration Platform
          </p>
        </div>
      </div>
    </div>
  );
}
