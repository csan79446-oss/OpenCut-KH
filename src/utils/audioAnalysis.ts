import { SilenceSegment, TimelineClip } from '../types/editor';

/**
 * Generate simulated or decoded waveform peaks from audio
 */
export function generateWaveformPeaks(count: number = 60, seed: number = 42): number[] {
  const peaks: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    // pseudo-random with natural rhythm
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    // create speech-like cadence (speech burst, brief pause)
    const rhythm = Math.sin(i * 0.45) * 0.3 + 0.7;
    const isPause = i % 14 === 6 || i % 14 === 7;
    const val = isPause ? Math.max(5, rnd * 15) : Math.min(100, Math.floor((rnd * 65 + 30) * rhythm));
    peaks.push(val);
  }
  return peaks;
}

/**
 * Analyze waveform peaks to locate silence intervals (AutoCut algorithm)
 */
export function detectSilenceIntervals(
  waveform: number[],
  clipDuration: number,
  thresholdDb: number = -32, // -50dB (quiet) to -20dB (loud)
  minDurationSeconds: number = 0.35
): SilenceSegment[] {
  if (!waveform || waveform.length === 0 || clipDuration <= 0) {
    return [];
  }

  // Convert dB threshold (-40dB to -15dB) to 0-100 linear peak threshold
  // -40dB ~ 10, -30dB ~ 25, -20dB ~ 50
  const linearThreshold = Math.max(5, Math.min(60, Math.round(Math.pow(10, (thresholdDb + 45) / 20) * 12)));

  const secondsPerSample = clipDuration / waveform.length;
  const silences: SilenceSegment[] = [];

  let inSilence = false;
  let silenceStartIndex = 0;
  let accumulatedRms = 0;
  let sampleCount = 0;

  for (let i = 0; i < waveform.length; i++) {
    const val = waveform[i];
    const isSilent = val <= linearThreshold;

    if (isSilent) {
      if (!inSilence) {
        inSilence = true;
        silenceStartIndex = i;
        accumulatedRms = val;
        sampleCount = 1;
      } else {
        accumulatedRms += val;
        sampleCount++;
      }
    } else {
      if (inSilence) {
        const segDuration = sampleCount * secondsPerSample;
        if (segDuration >= minDurationSeconds) {
          silences.push({
            start: Math.round(silenceStartIndex * secondsPerSample * 100) / 100,
            end: Math.round(i * secondsPerSample * 100) / 100,
            duration: Math.round(segDuration * 100) / 100,
            rms: Math.round(accumulatedRms / sampleCount),
          });
        }
        inSilence = false;
        sampleCount = 0;
      }
    }
  }

  // Check trailing silence
  if (inSilence) {
    const segDuration = sampleCount * secondsPerSample;
    if (segDuration >= minDurationSeconds) {
      silences.push({
        start: Math.round(silenceStartIndex * secondsPerSample * 100) / 100,
        end: Math.round(clipDuration * 100) / 100,
        duration: Math.round(segDuration * 100) / 100,
        rms: Math.round(accumulatedRms / sampleCount),
      });
    }
  }

  return silences;
}

/**
 * Execute AutoCut on clips:
 * Slices out silence intervals and ripples subsequent clips backward,
 * delivering the signature fast-paced, punchy AutoCut editing result!
 */
export function autoCutSilenceFromClips(
  clips: TimelineClip[],
  targetClipId: string | null,
  thresholdDb: number = -32,
  minDurationSeconds: number = 0.35
): { newClips: TimelineClip[]; cutCount: number; savedSeconds: number } {
  // If targetClipId is provided, cut that specific clip; otherwise cut all video clips
  const eligibleClips = targetClipId
    ? clips.filter((c) => c.id === targetClipId)
    : clips.filter((c) => c.type === 'video');

  if (eligibleClips.length === 0) {
    return { newClips: clips, cutCount: 0, savedSeconds: 0 };
  }

  let totalCuts = 0;
  let totalSavedSeconds = 0;
  let currentClips = [...clips];

  for (const clip of eligibleClips) {
    const waveform = clip.audioWaveform || generateWaveformPeaks(60);
    const silences = detectSilenceIntervals(waveform, clip.duration, thresholdDb, minDurationSeconds);

    if (silences.length === 0) continue;

    // Calculate non-silent retained parts within the clip
    const keptIntervals: { start: number; end: number }[] = [];
    let lastEnd = 0;

    for (const silence of silences) {
      if (silence.start > lastEnd + 0.1) {
        keptIntervals.push({ start: lastEnd, end: silence.start });
      }
      lastEnd = Math.max(lastEnd, silence.end);
      totalCuts++;
      totalSavedSeconds += silence.duration;
    }

    if (lastEnd < clip.duration - 0.1) {
      keptIntervals.push({ start: lastEnd, end: clip.duration });
    }

    if (keptIntervals.length === 0) continue;

    // Replace the clip with the sliced fragments
    const fragments: TimelineClip[] = keptIntervals.map((interval, idx) => {
      const fragDuration = Math.round((interval.end - interval.start) * 100) / 100;
      return {
        ...clip,
        id: `${clip.id}-cut-${idx}-${Date.now()}`,
        start: 0, // will be repositioned in ripple pass
        duration: fragDuration,
        sourceStart: clip.sourceStart + interval.start,
        title: `${clip.title} (Cut ${idx + 1})`,
        fadeIn: idx === 0 ? clip.fadeIn : 0.05,
        fadeOut: idx === keptIntervals.length - 1 ? clip.fadeOut : 0.05,
        audioWaveform: generateWaveformPeaks(Math.max(12, Math.floor(fragDuration * 8))),
      };
    });

    // Remove old clip and insert fragments
    const clipIndex = currentClips.findIndex((c) => c.id === clip.id);
    currentClips.splice(clipIndex, 1, ...fragments);
  }

  // Ripple pass: reorganize start times on affected video tracks so clips snap together seamlessly
  const tracksToRipple = new Set(eligibleClips.map((c) => c.trackId));
  
  for (const trackId of tracksToRipple) {
    const trackClips = currentClips
      .filter((c) => c.trackId === trackId)
      .sort((a, b) => a.start - b.start);

    let runningTime = 0;
    for (const c of trackClips) {
      c.start = Math.round(runningTime * 100) / 100;
      runningTime += c.duration;
    }
  }

  return {
    newClips: currentClips,
    cutCount: totalCuts,
    savedSeconds: Math.round(totalSavedSeconds * 100) / 100,
  };
}
