import { useState } from 'react'
import clsx from 'clsx'

interface SettingsProps { dark: boolean; onToggleDark: () => void }

const MODELS = [
  { name: 'Llama 3.2', desc: 'Fast · local · 2B' },
  { name: 'Llama 3', desc: 'Accurate · local · 8B' },
  { name: 'Mistral 7B', desc: 'Balanced · local' },
  { name: 'Custom', desc: 'Your fine-tuned model' },
]

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={clsx('w-10 h-5 rounded-full relative transition-colors flex-shrink-0', on ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700')}
    >
      <div className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', on ? 'left-5' : 'left-0.5')} />
    </button>
  )
}

function SettingRow({ label, sub, right }: { label: string; sub: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div>
        <div className="text-sm text-gray-800 dark:text-gray-200">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
      </div>
      {right}
    </div>
  )
}

export default function Settings({ dark, onToggleDark }: SettingsProps) {
  const [compact, setCompact] = useState(true)
  const [showConf, setShowConf] = useState(true)
  const [multiDoc, setMultiDoc] = useState(true)
  const [citations, setCitations] = useState(true)
  const [model, setModel] = useState('Llama 3.2')
  const [k, setK] = useState('3')

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-medium text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your preferences and account</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1 pb-2 border-b border-gray-50 dark:border-gray-800">Appearance</h2>
            <SettingRow label="Dark mode" sub="Switch to dark theme" right={<Toggle on={dark} onToggle={onToggleDark} />} />
            <SettingRow label="Compact view" sub="Reduce spacing in lists" right={<Toggle on={compact} onToggle={() => setCompact(c => !c)} />} />
            <SettingRow label="Confidence scores" sub="Display AI confidence on answers" right={<Toggle on={showConf} onToggle={() => setShowConf(c => !c)} />} />
          </div>

          <div className="card">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-50 dark:border-gray-800">Profile</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">TK</div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Thirumalaikumar</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">thirumalaikumar@ale.com</div>
                <div className="text-xs text-gray-400">Network Engineering Intern</div>
              </div>
            </div>
            <button className="w-full border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Edit profile
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-50 dark:border-gray-800">AI model</h2>
            <div className="grid grid-cols-2 gap-2">
              {MODELS.map(m => (
                <div
                  key={m.name}
                  onClick={() => setModel(m.name)}
                  className={clsx(
                    'border rounded-lg p-3 cursor-pointer transition-colors',
                    model === m.name ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200'
                  )}
                >
                  <div className="text-xs font-medium text-gray-900 dark:text-white">{m.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1 pb-2 border-b border-gray-50 dark:border-gray-800">Search preferences</h2>
            <SettingRow
              label="Results per query (k)"
              sub="Number of chunks retrieved"
              right={
                <select value={k} onChange={e => setK(e.target.value)} className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none">
                  <option>3</option><option>5</option><option>10</option>
                </select>
              }
            />
            <SettingRow label="Multi-document search" sub="Search across all indexed files" right={<Toggle on={multiDoc} onToggle={() => setMultiDoc(c => !c)} />} />
            <SettingRow label="Show source citations" sub="Always display source references" right={<Toggle on={citations} onToggle={() => setCitations(c => !c)} />} />
          </div>
        </div>
      </div>
    </div>
  )
}
