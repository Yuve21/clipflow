'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sparkles, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Client { id: string; name: string }
interface Props { clients: Client[]; credits: number }

const MAX_FILE_BYTES = 500 * 1024 * 1024 // 500MB

export function NewJobButton({ clients, credits }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [form, setForm] = useState({
    client_id: clients[0]?.id ?? '',
    max_clips: '10',
    min_duration_s: '30',
    max_duration_s: '90',
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [stage, setStage] = useState<'idle' | 'uploading' | 'starting'>('idle')
  const [error, setError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setFileError('')
    if (!f) return
    if (f.size > MAX_FILE_BYTES) {
      setFileError('File is too large. Maximum size is 500MB.')
      return
    }
    setFile(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError('')
    setStage('uploading')
    setUploadProgress(0)

    try {
      // 1. Get presigned upload URL
      const urlRes = await fetch('/api/ai-clipper/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          client_id: form.client_id || null,
        }),
      })
      if (!urlRes.ok) {
        const d = await urlRes.json()
        throw new Error(d.error || 'Failed to get upload URL')
      }
      const { job_id, upload_url, token, path: storagePath } = await urlRes.json()

      // 2. Upload directly to Supabase Storage with progress tracking
      const supabase = createClient()
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: HTTP ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Upload network error'))

        // Use Supabase Storage's upload-to-signed-url endpoint
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        xhr.open('PUT', `${supabaseUrl}/storage/v1/object/upload/sign/${storagePath}?token=${token}`)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
        xhr.send(file)
      })

      // 3. Kick off AI processing
      setStage('starting')
      const jobRes = await fetch('/api/ai-clipper/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id,
          max_clips: parseInt(form.max_clips),
          min_duration_s: parseInt(form.min_duration_s),
          max_duration_s: parseInt(form.max_duration_s),
        }),
      })
      if (!jobRes.ok) {
        const d = await jobRes.json()
        throw new Error(d.error || 'Failed to start job')
      }

      setOpen(false)
      router.push(`/dashboard/ai-clipper/${job_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStage('idle')
    }
  }

  const isLoading = stage !== 'idle'

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={credits < 1} title={credits < 1 ? 'Buy credits to run the AI Clipper' : undefined}>
        <Sparkles size={16} /> New AI job
      </Button>

      <Modal open={open} onClose={() => !isLoading && setOpen(false)} title="New AI Clip Job" className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Video file *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">Click to select a video</p>
                  <p className="text-xs text-gray-400 mt-0.5">MP4, MOV, MKV, WebM · Max 500MB · up to 90 min · uses 1 credit</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
          </div>

          {/* Client */}
          {clients.length > 0 && (
            <Select label="Client (optional)" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">— No client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}

          {/* Filters */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-3">Clip settings</label>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="# of clips"
                type="number"
                min="1" max="30"
                value={form.max_clips}
                onChange={e => setForm(f => ({ ...f, max_clips: e.target.value }))}
              />
              <Input
                label="Min length (s)"
                type="number"
                min="10" max="300"
                value={form.min_duration_s}
                onChange={e => setForm(f => ({ ...f, min_duration_s: e.target.value }))}
              />
              <Input
                label="Max length (s)"
                type="number"
                min="10" max="600"
                value={form.max_duration_s}
                onChange={e => setForm(f => ({ ...f, max_duration_s: e.target.value }))}
              />
            </div>
          </div>

          {/* Upload progress */}
          {stage === 'uploading' && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Uploading…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          {stage === 'starting' && (
            <p className="text-sm text-indigo-600 text-center animate-pulse">Starting AI analysis…</p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" loading={isLoading} disabled={!file || !!fileError}>
              <Sparkles size={14} /> Analyse with AI
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
