import React, { useEffect, useState, useCallback } from 'react';
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  FlaskConical,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  Save,
} from 'lucide-react';
import {
  llmModelService,
} from '../services/llmModelService';
import type {
  LLMModel,
  LLMAssignments,
} from '../services/llmModelService';

// ── helpers ──────────────────────────────────────────────────────────

const COMMON_ENDPOINTS = [
  { label: 'Groq', value: 'https://api.groq.com/openai/v1' },
  { label: 'OpenAI', value: 'https://api.openai.com/v1' },
  { label: 'Together AI', value: 'https://api.together.xyz/v1' },
  { label: 'OpenRouter', value: 'https://openrouter.ai/api/v1' },
  { label: 'Mistral', value: 'https://api.mistral.ai/v1' },
  { label: 'DeepSeek', value: 'https://api.deepseek.com/v1' },
  { label: 'Custom…', value: '' },
];

interface ModelFormState {
  name: string;
  endpoint: string;
  model_name: string;
  api_key: string;
  max_tokens: number;
}

const EMPTY_FORM: ModelFormState = { name: '', endpoint: '', model_name: '', api_key: '', max_tokens: 4096 };

// ── sub-components ────────────────────────────────────────────────────

interface StatusBadgeProps { active: boolean }
const StatusBadge: React.FC<StatusBadgeProps> = ({ active }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
    active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
           : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ── main component ────────────────────────────────────────────────────

export const LLMModels: React.FC = () => {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModelFormState>(EMPTY_FORM);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // test state (per model)
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // assignment state
  const [assignDraft, setAssignDraft] = useState({ review_processing: '', reply_generation: '' });
  const [savingAssign, setSavingAssign] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [modelList, assignData] = await Promise.all([
        llmModelService.list(),
        llmModelService.getAssignments(),
      ]);
      setModels(modelList);
      setAssignDraft({
        review_processing: assignData.review_processing_model_id || '',
        reply_generation: assignData.reply_generation_model_id || '',
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load models.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowKey(false);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (m: LLMModel) => {
    setEditingId(m.id);
    setForm({ name: m.name, endpoint: m.endpoint, model_name: m.model_name, api_key: '', max_tokens: m.max_tokens });
    setShowKey(false);
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setFormError(null); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.endpoint.trim() || !form.model_name.trim()) {
      setFormError('Name, endpoint, and model name are required.');
      return;
    }
    if (!editingId && !form.api_key.trim()) {
      setFormError('API key is required when adding a new model.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        const payload: any = { name: form.name, endpoint: form.endpoint, model_name: form.model_name, max_tokens: form.max_tokens };
        if (form.api_key.trim()) payload.api_key = form.api_key.trim();
        await llmModelService.update(editingId, payload);
      } else {
        await llmModelService.create({
          name: form.name.trim(),
          endpoint: form.endpoint.trim(),
          model_name: form.model_name.trim(),
          api_key: form.api_key.trim(),
          max_tokens: form.max_tokens,
        });
      }
      closeModal();
      await load();
    } catch (e: any) {
      setFormError(e.message || 'Failed to save model.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await llmModelService.test(id);
      setTestResults(prev => ({ ...prev, [id]: result }));
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: e.message } }));
    } finally {
      setTestingId(null);
    }
  };

  const handleTestConnectivity = async () => {
    if (!form.endpoint.trim() || !form.model_name.trim()) {
      setFormError('Endpoint and model name are required for testing.');
      return;
    }
    if (!editingId && !form.api_key.trim()) {
      setFormError('API key is required for new models.');
      return;
    }

    setTesting(true);
    setFormError(null);
    try {
      const payload: any = {
        endpoint: form.endpoint.trim(),
        model_name: form.model_name.trim(),
        max_tokens: form.max_tokens,
        model_id: editingId || undefined,
      };
      if (form.api_key.trim()) {
        payload.api_key = form.api_key.trim();
      }

      const res = await llmModelService.testConnectivity(payload);
      if (res.success) {
        setAssignMsg('Connectivity test successful!');
      } else {
        setFormError(`Test failed: ${res.message}`);
      }
    } catch (e: any) {
      setFormError(e.message || 'Connectivity test failed.');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await llmModelService.remove(deleteId);
      setDeleteId(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to delete model.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveAssignments = async () => {
    setSavingAssign(true);
    setAssignMsg(null);
    try {
      await llmModelService.setAssignments({
        review_processing_model_id: assignDraft.review_processing || null,
        reply_generation_model_id: assignDraft.reply_generation || null,
      });
      setAssignMsg('Assignments saved successfully.');
      await load();
    } catch (e: any) {
      setAssignMsg(e.message || 'Failed to save assignments.');
    } finally {
      setSavingAssign(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LLM Models</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Manage OpenAI-compatible models and assignments</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl shadow transition-colors"
        >
          <Plus size={18} />
          Add Model
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ── Model Library ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Model Library</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">All registered OpenAI-compatible endpoints</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-violet-500" />
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 dark:text-slate-500">
            <Bot size={40} strokeWidth={1.5} />
            <p className="text-sm">No models registered yet. Click "Add Model" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  {['Name', 'Endpoint', 'Model ID', 'Max Tokens', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {models.map(model => (
                  <tr key={model.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900 dark:text-white">{model.name}</span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-gray-500 dark:text-slate-400 truncate block font-mono text-xs" title={model.endpoint}>
                        {model.endpoint}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded text-xs">
                        {model.model_name}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 dark:text-slate-300 font-mono text-xs">{model.max_tokens}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge active={model.is_active} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Test */}
                        <button
                          onClick={() => handleTest(model.id)}
                          disabled={testingId === model.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                          title="Test model connectivity"
                        >
                          {testingId === model.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <FlaskConical size={13} />}
                          Test
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => openEdit(model)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteId(model.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                      {/* Test result inline */}
                      {testResults[model.id] && (
                        <div className={`mt-2 flex items-start gap-1.5 text-xs ${
                          testResults[model.id].success
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {testResults[model.id].success
                            ? <CheckCircle size={13} className="mt-0.5 shrink-0" />
                            : <XCircle size={13} className="mt-0.5 shrink-0" />}
                          <span>{testResults[model.id].message}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Assignments ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Model Assignments</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Choose which model handles each AI task</p>
        </div>
        <div className="p-6 space-y-5">
          {([
            { key: 'review_processing', label: 'Review Processing', desc: 'Batch sentiment analysis (runs automatically)' },
            { key: 'reply_generation',  label: 'Reply Generation',  desc: 'On-demand guest reply generation' },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="sm:w-56 shrink-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{desc}</div>
              </div>
              <div className="relative flex-1">
                <select
                  value={assignDraft[key]}
                  onChange={e => setAssignDraft(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
                >
                  <option value="">— None assigned —</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.model_name})</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSaveAssignments}
              disabled={savingAssign || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow transition-colors"
            >
              {savingAssign ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Assignments
            </button>
            {assignMsg && (
              <span className={`text-sm ${assignMsg.includes('success') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {assignMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Edit Model' : 'Add Model'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Groq Llama-3 Production"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>

              {/* Endpoint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Endpoint URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      onChange={e => { if (e.target.value) setForm(p => ({ ...p, endpoint: e.target.value })); }}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 focus:ring-2 focus:ring-violet-500 outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>Quick-fill…</option>
                      {COMMON_ENDPOINTS.map(o => (
                        <option key={o.label} value={o.value || ' '}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <input
                  type="url"
                  value={form.endpoint}
                  onChange={e => setForm(p => ({ ...p, endpoint: e.target.value }))}
                  placeholder="https://api.groq.com/openai/v1"
                  className="w-full mt-2 px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none font-mono"
                />
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Model Name</label>
                <input
                  type="text"
                  value={form.model_name}
                  onChange={e => setForm(p => ({ ...p, model_name: e.target.value }))}
                  placeholder="e.g. llama-3.3-70b-versatile"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none font-mono"
                />
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  The model identifier sent in the API request (e.g. <code>gpt-4o-mini</code>)
                </p>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  API Key {editingId && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={form.api_key}
                    onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
                    placeholder={editingId ? 'Enter new key to replace…' : 'sk-…'}
                    className="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  Stored encrypted with AES-256-GCM — never stored in plain text.
                </p>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Max Tokens</label>
                <input
                  type="number"
                  value={form.max_tokens}
                  onChange={e => setForm(p => ({ ...p, max_tokens: parseInt(e.target.value) || 0 }))}
                  placeholder="4096"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none font-mono"
                />
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  The maximum number of tokens allowed in the response.
                </p>
              </div>

              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  <XCircle size={15} className="mt-0.5 shrink-0" />
                  {formError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestConnectivity}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {testing ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
                  Test Connection
                </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow transition-colors"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {editingId ? 'Save Changes' : 'Add Model'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Delete Model</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              The model will be deactivated and any assignments pointing to it will be cleared.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow transition-colors"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
