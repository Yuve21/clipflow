'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogPostModal } from '../log-post-modal'
import { Pencil, Plus } from 'lucide-react'

type ClipStatus = 'todo' | 'editing' | 'ready' | 'posted' | 'flagged'

const STATUSES: { value: ClipStatus; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'editing', label: 'Editing' },
  { value: 'ready', label: 'Ready' },
  { value: 'posted', label: 'Posted' },
  { value: 'flagged', label: 'Flagged' },
]

const STATUS_CLASSES: Record<ClipStatus, string> = {
  todo: 'bg-gray-100 text-gray-700',
  editing: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-blue-100 text-blue-700',
  posted: 'bg-green-100 text-green-700',
  flagged: 'bg-red-100 text-red-700',
}

async function patchClip(clipId: string, body: Record<string, unknown>) {
  await fetch(`/api/clips/${clipId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function EditableTitle({ clipId, title }: { clipId: string; title: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(title)
  const [saving, setSaving] = useState(false)

  async function save() {
    setEditing(false)
    const trimmed = value.trim()
    if (!trimmed || trimmed === title) {
      setValue(title)
      return
    }
    setSaving(true)
    await patchClip(clipId, { title: trimmed })
    setSaving(false)
    router.refresh()
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setValue(title)
            setEditing(false)
          }
        }}
        className="w-full max-w-xl rounded-lg border border-indigo-300 bg-white px-2 py-1 text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    )
  }

  return (
    <div className="group/title flex items-center gap-2">
      <h1 className={`text-2xl font-bold text-gray-900 ${saving ? 'opacity-60' : ''}`}>{value}</h1>
      <button
        onClick={() => setEditing(true)}
        aria-label="Edit title"
        className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-indigo-50 hover:text-indigo-600 group-hover/title:opacity-100"
      >
        <Pencil size={16} />
      </button>
    </div>
  )
}

export function StatusSelect({ clipId, status }: { clipId: string; status: ClipStatus }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSaving(true)
    await patchClip(clipId, { status: e.target.value })
    setSaving(false)
    router.refresh()
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={saving}
      aria-label="Clip status"
      className={`cursor-pointer rounded-lg border-0 px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${STATUS_CLASSES[status]}`}
    >
      {STATUSES.map(s => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  )
}

export function LogPostButton({
  clipId,
  clientId,
  status,
}: {
  clipId: string
  clientId: string
  status: ClipStatus
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Log post
      </Button>
      <LogPostModal
        open={open}
        onClose={() => setOpen(false)}
        clipId={clipId}
        clientId={clientId}
        onPosted={async () => {
          if (status !== 'posted') await patchClip(clipId, { status: 'posted' })
          router.refresh()
        }}
      />
    </>
  )
}

export function EditClipForm({
  clipId,
  title,
  dueDate,
}: {
  clipId: string
  title: string
  dueDate: string | null
}) {
  const router = useRouter()
  const [form, setForm] = useState({ title, due_date: dueDate ?? '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await patchClip(clipId, {
      title: form.title.trim() || title,
      due_date: form.due_date || null,
    })
    setSaving(false)
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
      />
      <Input
        label="Due date"
        type="date"
        value={form.due_date}
        onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" loading={saving}>Save changes</Button>
        {saved && !saving && <span className="text-xs text-green-600">Saved</span>}
      </div>
    </form>
  )
}
