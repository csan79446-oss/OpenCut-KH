import { AspectRatio, TimelineClip, TimelineTrack } from '../types/editor';

export function getResolutionForAspectRatio(ratio: AspectRatio, quality: '720p' | '1080p' | '4k' = '1080p'): { width: number; height: number } {
  const base = quality === '4k' ? 2160 : quality === '720p' ? 720 : 1080;
  switch (ratio) {
    case '9:16': // TikTok, Shorts, Reels
      return { width: Math.round(base * (9 / 16)), height: base };
    case '1:1': // Square
      return { width: base, height: base };
    case '4:5': // Instagram portrait
      return { width: Math.round(base * (4 / 5)), height: base };
    case '21:9': // Ultra-wide
      return { width: Math.round(base * (21 / 9)), height: base };
    case '16:9': // Landscape YouTube / Cinema
    default:
      return { width: Math.round(base * (16 / 9)), height: base };
  }
}

/**
 * Render all active clips at a specific playhead time to a Canvas 2D context
 */
export function renderCanvasFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentTime: number,
  clips: TimelineClip[],
  tracks: TimelineTrack[],
  mediaElementsMap: Map<string, HTMLVideoElement | HTMLImageElement>
) {
  // Clear background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, width, height);

  // Group visible tracks sorted from bottom to top: audio -> video -> overlay -> text
  const trackOrder: Record<string, number> = {
    audio: 0,
    sfx: 1,
    video: 2,
    overlay: 3,
    text: 4,
  };

  const visibleTrackIds = new Set(tracks.filter((t) => t.isVisible).map((t) => t.id));

  const activeClips = clips
    .filter((clip) => {
      if (!visibleTrackIds.has(clip.trackId)) return false;
      return currentTime >= clip.start && currentTime <= clip.start + clip.duration;
    })
    .sort((a, b) => {
      const trackA = tracks.find((t) => t.id === a.trackId);
      const trackB = tracks.find((t) => t.id === b.trackId);
      const orderA = trackA ? trackOrder[trackA.type] ?? 2 : 2;
      const orderB = trackB ? trackOrder[trackB.type] ?? 2 : 2;
      return orderA - orderB;
    });

  for (const clip of activeClips) {
    ctx.save();

    // Calculate clip relative progress
    const clipProgress = (currentTime - clip.start) / clip.duration;
    const clipAge = currentTime - clip.start;
    const clipRemaining = clip.start + clip.duration - currentTime;

    // Apply Fade In / Fade Out opacity
    let dynamicOpacity = clip.transform.opacity ?? 1;
    if (clip.fadeIn > 0 && clipAge < clip.fadeIn) {
      dynamicOpacity *= clipAge / clip.fadeIn;
    }
    if (clip.fadeOut > 0 && clipRemaining < clip.fadeOut) {
      dynamicOpacity *= clipRemaining / clip.fadeOut;
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, dynamicOpacity));

    // Blend mode
    if (clip.transform.blendMode && clip.transform.blendMode !== 'normal') {
      ctx.globalCompositeOperation = clip.transform.blendMode;
    }

    // Apply CSS filters
    const f = clip.filters;
    const filterParts: string[] = [];
    if (f.brightness !== 100) filterParts.push(`brightness(${f.brightness}%)`);
    if (f.contrast !== 100) filterParts.push(`contrast(${f.contrast}%)`);
    if (f.saturate !== 100) filterParts.push(`saturate(${f.saturate}%)`);
    if (f.blur > 0) filterParts.push(`blur(${f.blur}px)`);
    if (f.hueRotate > 0) filterParts.push(`hue-rotate(${f.hueRotate}deg)`);
    if (f.sepia > 0) filterParts.push(`sepia(${f.sepia}%)`);
    if (f.grayscale > 0) filterParts.push(`grayscale(${f.grayscale}%)`);
    if (filterParts.length > 0) {
      ctx.filter = filterParts.join(' ');
    }

    // Center pivot & transforms
    const centerX = width / 2 + (clip.transform.x / 100) * width;
    const centerY = height / 2 + (clip.transform.y / 100) * height;
    ctx.translate(centerX, centerY);

    if (clip.transform.rotation !== 0) {
      ctx.rotate((clip.transform.rotation * Math.PI) / 180);
    }

    let scale = clip.transform.scale || 1;

    // Transition effect simulation
    if (clip.transitionIn === 'zoom' && clipAge < 0.4) {
      scale *= 0.7 + (clipAge / 0.4) * 0.3;
    } else if (clip.transitionIn === 'flash' && clipAge < 0.2) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }

    ctx.scale(scale, scale);

    // 1. Render Video / Image Clip
    if (clip.type === 'video' || clip.type === 'image') {
      const mediaEl = mediaElementsMap.get(clip.mediaId);
      let drawn = false;

      if (mediaEl) {
        try {
          if (mediaEl instanceof HTMLVideoElement) {
            const targetVideoTime = clip.sourceStart + (currentTime - clip.start) * clip.speed;
            if (Math.abs(mediaEl.currentTime - targetVideoTime) > 0.25 && isFinite(targetVideoTime)) {
              mediaEl.currentTime = targetVideoTime % (mediaEl.duration || 10);
            }
            if (mediaEl.readyState >= 2) {
              const sourceW = mediaEl.videoWidth || width;
              const sourceH = mediaEl.videoHeight || height;
              const renderRatio = Math.max(width / sourceW, height / sourceH);
              const dw = sourceW * renderRatio;
              const dh = sourceH * renderRatio;
              ctx.drawImage(mediaEl, -dw / 2, -dh / 2, dw, dh);
              drawn = true;
            }
          } else if (mediaEl instanceof HTMLImageElement && mediaEl.complete && mediaEl.naturalWidth > 0) {
            const sourceW = mediaEl.naturalWidth;
            const sourceH = mediaEl.naturalHeight;
            const renderRatio = Math.max(width / sourceW, height / sourceH);
            const dw = sourceW * renderRatio;
            const dh = sourceH * renderRatio;
            ctx.drawImage(mediaEl, -dw / 2, -dh / 2, dw, dh);
            drawn = true;
          }
        } catch {
          drawn = false;
        }
      }

      if (!drawn) {
        drawProceduralVideoBackground(ctx, width, height, clip, currentTime);
      }
    }

    // 2. Render Text / Subtitle Clip
    if (clip.type === 'text' && clip.textConfig) {
      const cfg = clip.textConfig;
      ctx.filter = 'none'; // text should be crisp

      // Animations
      let textOffsetY = 0;
      let textScale = 1;
      if (cfg.animation === 'bounce') {
        textOffsetY = Math.sin(clipProgress * Math.PI * 6) * 12;
      } else if (cfg.animation === 'pop') {
        const popTime = Math.min(1, clipAge * 4);
        textScale = 0.5 + 0.5 * Math.sin((popTime * Math.PI) / 2);
      }

      ctx.scale(textScale, textScale);
      ctx.font = `bold ${cfg.fontSize}px "${cfg.fontFamily || 'Inter'}", sans-serif`;
      ctx.textAlign = (cfg.align as CanvasTextAlign) || 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(cfg.text);
      const textWidth = metrics.width;
      const textHeight = cfg.fontSize * 1.3;

      // Draw background pill if configured
      if (cfg.backgroundColor && cfg.backgroundColor !== 'transparent') {
        ctx.fillStyle = cfg.backgroundColor;
        const paddingX = 24;
        const paddingY = 12;
        const pillX = -textWidth / 2 - paddingX;
        const pillY = textOffsetY - textHeight / 2 - paddingY / 2;
        const pillW = textWidth + paddingX * 2;
        const pillH = textHeight + paddingY;
        const radius = 10;

        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, radius);
        ctx.fill();
      }

      // Stroke / Shadow
      if (cfg.strokeWidth > 0 && cfg.strokeColor) {
        ctx.strokeStyle = cfg.strokeColor;
        ctx.lineWidth = cfg.strokeWidth;
        ctx.strokeText(cfg.text, 0, textOffsetY);
      }

      // Text Fill
      ctx.fillStyle = cfg.color || '#ffffff';
      ctx.fillText(cfg.text, 0, textOffsetY);
    }

    // Draw Vignette if filter specifies
    if (f.vignette > 0) {
      const grad = ctx.createRadialGradient(0, 0, width * 0.25, 0, 0, width * 0.7);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${f.vignette / 100})`);
      ctx.fillStyle = grad;
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }

    ctx.restore();
  }
}

/**
 * Procedural stylized background when media is loading or for animated graphics
 */
function drawProceduralVideoBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  clip: TimelineClip,
  currentTime: number
) {
  const t = currentTime * 0.8;
  const grad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  
  if (clip.filters.preset === 'cyberpunk') {
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#701a75');
    grad.addColorStop(1, '#06b6d4');
  } else if (clip.filters.preset === 'cinematic') {
    grad.addColorStop(0, '#111827');
    grad.addColorStop(0.5, '#047857');
    grad.addColorStop(1, '#0284c7');
  } else {
    grad.addColorStop(0, '#18181b');
    grad.addColorStop(0.5, '#27272a');
    grad.addColorStop(1, '#3f3f46');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(-width / 2, -height / 2, width, height);

  // Animated subtle glowing rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  const radius = Math.abs(Math.sin(t) * 120) + 100;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Watermark title
  ctx.font = '600 22px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.textAlign = 'center';
  ctx.fillText(clip.title, 0, 0);
}
