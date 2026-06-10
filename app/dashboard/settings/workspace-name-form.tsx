'use client'

import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Copy } from 'lucide-react'

interface WorkspaceNameFormProps {
  workspaceId: string
  initialName: string
}

export function WorkspaceNameForm({ workspaceId, initialName }: WorkspaceNameFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function flashStatus(next: 'saved' | 'error') {
    setStatus(next)
    if (statusTimer.current) clearTimeout(statusTimer.current)
    statusTimer.current = setTimeout(() => setStatus('idle'), 3000)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return

    setSaving(true)
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) throw new Error('Request failed')
      flashStatus('saved')
      router.refresh()
    } catch {
      flashStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" data-workspace-id={workspaceId}>
      <Input
        label="Workspace name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="My clipping studio"
        maxLength={80}
        required
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" loading={saving} disabled={!name.trim()}>
          Save
        </Button>
        {status === 'saved' && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
            <Check size={14} />
            Saved!
          </span>
        )}
        {status === 'error' && (
          <span className="text-sm font-medium text-red-600">Something went wrong. Try again.</span>
        )}
      </div>
    </form>
  )
}

export function CopyWorkspaceId({ workspaceId }: { workspaceId: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(workspaceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (e.g. insecure context) — fail silently
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
        {workspaceId}
      </code>
      <Button type="button" variant="secondary" size="sm" onClick={copy}>
        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
