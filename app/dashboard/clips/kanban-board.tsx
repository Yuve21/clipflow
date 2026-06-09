'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ClipCard } from './clip-card'

type ClipStatus = 'todo' | 'editing' | 'ready' | 'posted' | 'flagged'

interface Clip {
  id: string
  title: string
  status: ClipStatus
  due_date: string | null
  client_id: string
  clients: { name: string } | null
  posts: { id: string; url: string | null; posted_at: string; posting_accounts: { platform: string; handle: string } | null }[]
}

interface Props {
  clips: Clip[]
}

const COLUMNS: { status: ClipStatus; label: string; color: 'gray' | 'yellow' | 'blue' | 'green' | 'red' }[] = [
  { status: 'todo', label: 'To do', color: 'gray' },
  { status: 'editing', label: 'Editing', color: 'yellow' },
  { status: 'ready', label: 'Ready', color: 'blue' },
  { status: 'posted', label: 'Posted', color: 'green' },
  { status: 'flagged', label: 'Flagged', color: 'red' },
]

export function KanbanBoard({ clips: initialClips }: Props) {
  const [clips, setClips] = useState(initialClips)

  async function moveClip(id: string, newStatus: ClipStatus) {
    setClips(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
    await fetch(`/api/clips/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  return (
    <div className="flex gap-4 p-6 h-full overflow-x-auto">
      {COLUMNS.map(col => {
        const colClips = clips.filter(c => c.status === col.status)
        return (
          <div key={col.status} className="flex flex-col w-64 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={col.color}>{col.label}</Badge>
              <span className="text-xs text-gray-400">{colClips.length}</span>
            </div>
            <div className="kanban-col flex-1 overflow-y-auto space-y-2 pr-1">
              {colClips.map(clip => (
                <ClipCard key={clip.id} clip={clip} onMove={moveClip} columns={COLUMNS} />
              ))}
              {colClips.length === 0 && (
                <div className="border-2 border-dashed border-gray-100 rounded-xl p-4 text-center text-xs text-gray-300">
                  Empty
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
