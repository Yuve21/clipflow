import ffmpeg from 'fluent-ffmpeg'
import * as path from 'path'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

/**
 * Analyze momentary loudness (dBFS) per second using FFmpeg's ebur128 filter.
 * Returns a Map<second, loudness> for the entire audio file.
 * Non-critical — resolves with an empty map on failure rather than throwing.
 */
export function analyzeAudioEnergy(audioPath: string, tmpDir: string): Promise<Map<number, number>> {
  const energyMap = new Map<number, number>()
  // Write to a temp file so we don't need /dev/null (works cross-platform + Vercel)
  const nullOut = path.join(tmpDir, '_energy_null.out')

  return new Promise((resolve) => {
    const proc = ffmpeg(audioPath)
      .audioFilters('ebur128=peak=true')
      .format('null')
      .output(nullOut)

    proc.on('stderr', (line: string) => {
      // ebur128 emits: "t:  1.2345 TARGET:-23 LUFS    M: -18.3  S: ..."
      const match = line.match(/t:\s*([\d.]+).*\bM:\s*([-\d.]+)/)
      if (match) {
        const t = parseFloat(match[1])
        const m = parseFloat(match[2])
        if (!isNaN(t) && !isNaN(m) && m > -100) {
          energyMap.set(Math.floor(t), m)
        }
      }
    })

    proc.on('end', () => resolve(energyMap))
    proc.on('error', (err) => {
      console.warn('[AudioEnergy] ebur128 analysis failed (non-fatal):', err.message)
      resolve(energyMap)
    })

    proc.run()
  })
}

/**
 * Score a clip's audio energy (1-100) relative to the whole recording.
 * Higher = louder / more energetic than average → stronger podcast signal.
 */
export function scoreClipEnergy(
  energyMap: Map<number, number>,
  startTime: number,
  endTime: number
): number {
  if (energyMap.size === 0) return 50

  const clipValues: number[] = []
  for (let t = Math.floor(startTime); t <= Math.ceil(endTime); t++) {
    const v = energyMap.get(t)
    if (v !== undefined) clipValues.push(v)
  }
  if (clipValues.length === 0) return 50

  const allValues = Array.from(energyMap.values())
  const globalMin = Math.min(...allValues)
  const globalMax = Math.max(...allValues)
  if (globalMax === globalMin) return 50

  const clipMean = clipValues.reduce((a, b) => a + b, 0) / clipValues.length
  const normalized = ((clipMean - globalMin) / (globalMax - globalMin)) * 100
  return Math.max(1, Math.min(100, Math.round(normalized)))
}
