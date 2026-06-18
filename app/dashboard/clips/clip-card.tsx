'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogPostModal } from './log-post-modal'
import { ChevronDown, Calendar, ExternalLink, ArrowUpRight } from 'lucide-react'

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
  clip: Clip
  onMove: (id: string, status: ClipStatus) => Promise<void>
  columns: { status: ClipStatus; label: string }[]
}

export function ClipCard({ clip, onMove, columns }: Props) {
  const [showMenu, setShowMenu] = useState(false)
  const [showLogPost, setShowLogPost] = useState(false)
  const isOverdue = clip.due_date && new Date(clip.due_date) < new Date() && clip.status !== 'posted'

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-default group">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="text-sm font-medium text-gray-900 leading-snug">{clip.title}</p>
          <div className="relative flex items-center gap-0.5 shrink-0">
            <Link
              href={`/dashboard/clips/${clip.id}`}
              aria-label="View details"
              className="p-0.5 rounded text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ArrowUpRight size={12} />
            </Link>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="p-0.5 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100"
            >
              <ChevronDown size={14} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 bg-white border border-gray-100 rounded-lg shadow-lg z-20 w-36 py-1">
                {columns.filter(c => c.status !== clip.status).map(c => (
                  <button
                    key={c.status}
                    onClick={() => { onMove(clip.id, c.status); setShowMenu(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Move to {c.label}
                  </button>
                ))}
                {clip.status !== 'posted' && (
                  <button
                    onClick={() => { setShowLogPost(true); setShowMenu(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 mt-1"
                  >
                    Log post…
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-2">{clip.clients?.name}</p>

        {clip.due_date && (
          <div className={`flex items-center gap-1 text-xs mb-2 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
            <Calendar size={10} />
            {isOverdue ? 'Due ' : ''}{clip.due_date}
          </div>
        )}

        {clip.posts?.length > 0 && (
          <div className="space-y-1 mt-2 border-t border-gray-50 pt-2">
            {clip.posts.map(post => (
              <div key={post.id} className="flex items-center gap-1 text-xs text-gray-500">
                <span className="font-medium">{post.posting_accounts?.platform}</span>
                <span>@{post.posting_accounts?.handle}</span>
                {post.url && (
                  <a href={post.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-indigo-400 hover:text-indigo-600">
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <LogPostModal
        open={showLogPost}
        onClose={() => setShowLogPost(false)}
        clipId={clip.id}
        clientId={clip.client_id}
        onPosted={() => onMove(clip.id, 'posted')}
      />
    </>
  )
}
