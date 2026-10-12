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

// Tokenize text into rhythmic spoken words with smart support for English, numbers, and Khmer scripts
export function tokenizeTextIntoWords(text: string): string[] {
  if (!text || !text.trim()) return [];
  const trimmed = text.trim();

  // Helper to split continuous Khmer script into natural rhythmic words (1-2 syllables each)
  const segmentKhmerToken = (token: string): string[] => {
    // Match Khmer orthographic syllable clusters
    const clusterRegex = /[\u1780-\u17B3][\u17B4-\u17D3]*(?:\u17D2[\u1780-\u17B3][\u17B4-\u17D3]*)*|[^\u1780-\u17FF]+/g;
    const clusters = token.match(clusterRegex);
    if (!clusters || clusters.length <= 2) {
      return [token];
    }
    const words: string[] = [];
    for (let i = 0; i < clusters.length; i += 2) {
      if (i + 2 < clusters.length) {
        words.push(clusters[i] + clusters[i + 1]);
      } else {
        // Last 1 or 2 clusters
        words.push(clusters.slice(i).join(''));
      }
    }
    return words.length > 0 ? words : [token];
  };

  // If text contains spaces, split on spaces and segment long Khmer compounds
  if (/\s+/.test(trimmed)) {
    const rawTokens = trimmed.split(/\s+/).filter(Boolean);
    const resultWords: string[] = [];
    for (const raw of rawTokens) {
      if (/[\u1780-\u17FF]/.test(raw) && raw.length > 5) {
        resultWords.push(...segmentKhmerToken(raw));
      } else {
        resultWords.push(raw);
      }
    }
    return resultWords.length > 0 ? resultWords : rawTokens;
  }

  // Continuous Khmer script without spaces
  if (/[\u1780-\u17FF]/.test(trimmed)) {
    return segmentKhmerToken(trimmed);
  }

  return [trimmed];
}

/**
 * Split text into user-perceived grapheme clusters.
 * Crucial for Khmer script: keeps base consonant + subscript coeng + vowels + diacritics
 * together as one single complete visual glyph so typewriter animation never breaks clusters
 * or renders orphan dotted circles (◌្ / ◌ា).
 */
export function splitIntoGraphemes(text: string): string[] {
  if (!text) return [];
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter(['km', 'en'], { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text)).map((s: any) => s.segment);
    } catch {
      // Fallback below
    }
  }

  // Regex fallback matching Khmer orthographic syllable clusters and individual non-Khmer units
  const clusterRegex =
    /(?:[\u1780-\u17B3]|[\u17A3-\u17D3])(?:\u17D2[\u1780-\u17B3])*(?:[\u17B6-\u17D3\u17DD])*|[\s\S]/gu;
  const matches = text.match(clusterRegex);
  return matches || Array.from(text);
}

/**
 * Word and syllable aware line wrapping for Canvas 2D.
 * Supports Khmer (which has no inter-word spaces) by segmenting on natural word boundaries,
 * as well as space-delimited Latin languages.
 */
export function wrapCanvasText(
  text: string,
  measureWidth: (str: string) => number,
  maxWidth: number
): string[] {
  if (!text) return [];
  const paragraphs = text.split('\n');
  const allLines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push('');
      continue;
    }

    let units: string[] = [];
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
      try {
        const seg = new (Intl as any).Segmenter(['km', 'en'], { granularity: 'word' });
        units = Array.from(seg.segment(para)).map((s: any) => s.segment);
      } catch {
        units = [];
      }
    }

    if (units.length === 0) {
      units = para.split(/(\s+)/).filter(Boolean);
    }

    let currentLine = '';

    for (const unit of units) {
      const candidate = currentLine + unit;
      if (measureWidth(candidate) > maxWidth && currentLine.trim().length > 0) {
        allLines.push(currentLine.trimEnd());
        currentLine = unit.startsWith(' ') ? unit.trimStart() : unit;
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine.trim().length > 0) {
      allLines.push(currentLine.trimEnd());
    }
  }

  return allLines.length > 0 ? allLines : [text];
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
    const clipProgress = clip.duration > 0 ? (currentTime - clip.start) / clip.duration : 0;
    const clipAge = currentTime - clip.start;
    const clipRemaining = clip.start + clip.duration - currentTime;

    // Apply Fade In / Fade Out opacity (prevent pitch black screen at t=0 when editor loads)
    let dynamicOpacity = clip.transform.opacity ?? 1;
    if (clip.fadeIn > 0 && clipAge < clip.fadeIn) {
      const minStartOpacity = currentTime === 0 ? 0.95 : 0.05;
      dynamicOpacity *= Math.max(minStartOpacity, clipAge / clip.fadeIn);
    }
    if (clip.fadeOut > 0 && clipRemaining < clip.fadeOut) {
      dynamicOpacity *= Math.max(0, clipRemaining / clip.fadeOut);
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
    let animOffsetX = 0;
    let animOffsetY = 0;
    let animScale = 1;

    // Clip-level CapCut Animation Preset (Works on Video, Image, and Text clips!)
    const clipAnim = clip.animation;
    if (clipAnim && clipAnim.preset !== 'none') {
      const animDur = clipAnim.duration || 0.6;
      const zStart = clipAnim.zoomStart ?? 1.0;
      const zEnd = clipAnim.zoomEnd ?? 1.35;
      const tension = clipAnim.springTension ?? 1.0;

      if (clipAnim.preset === 'spring-pop') {
        // Authentic physics-based damped harmonic spring (CapCut Spring Pop)
        if (clipAge < animDur) {
          const p = Math.max(0, Math.min(1, clipAge / animDur));
          const spring = 1 - Math.exp(-6 * p * tension) * Math.cos(p * Math.PI * 4 * tension);
          animScale *= Math.max(0.01, spring);
        }
      } else if (clipAnim.preset === 'keyframe-zoom-in') {
        // Cinematic Ken Burns slow zoom-in push
        const smoothP = Math.min(1, Math.max(0, clipProgress));
        animScale *= zStart + (zEnd - zStart) * (smoothP * (2 - smoothP));
      } else if (clipAnim.preset === 'keyframe-zoom-out') {
        // Cinematic Ken Burns slow zoom-out pull
        const smoothP = Math.min(1, Math.max(0, clipProgress));
        animScale *= zEnd - (zEnd - zStart) * (smoothP * (2 - smoothP));
      } else if (clipAnim.preset === 'slide-up') {
        if (clipAge < animDur) {
          const p = clipAge / animDur;
          const easeP = 1 - Math.pow(1 - p, 3);
          animOffsetY += (1 - easeP) * (height * 0.15);
        }
      } else if (clipAnim.preset === 'slide-left') {
        if (clipAge < animDur) {
          const p = clipAge / animDur;
          const easeP = 1 - Math.pow(1 - p, 3);
          animOffsetX += (1 - easeP) * (width * 0.2);
        }
      } else if (clipAnim.preset === 'glitch') {
        if (clipAge < 0.35) {
          animOffsetX += (Math.random() - 0.5) * 14;
          animOffsetY += (Math.random() - 0.5) * 8;
        }
      }
    }

    const centerX = width / 2 + (clip.transform.x / 100) * width + animOffsetX;
    let centerY = height / 2 + (clip.transform.y / 100) * height + animOffsetY;
    if (clip.type === 'text' && clip.textConfig?.yPercent !== undefined) {
      centerY = (clip.textConfig.yPercent / 100) * height + (clip.transform.y / 100) * height + animOffsetY;
    }
    ctx.translate(centerX, centerY);

    if (clip.transform.rotation !== 0) {
      ctx.rotate((clip.transform.rotation * Math.PI) / 180);
    }

    let scale = (clip.transform.scale || 1) * animScale;

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

      // CapCut Dynamic Animations
      let textOffsetY = 0;
      let textScale = 1;
      let alphaMultiplier = 1;

      const animType = cfg.animation || clip.animation?.preset;
      const animConfig = cfg.animationConfig || clip.animation;
      const isTypewriter = animType === 'typewriter';

      if (animType === 'spring-pop' || animType === 'pop') {
        const dur = animConfig?.duration || 0.55;
        const tension = animConfig?.springTension || 1;
        if (clipAge < dur) {
          const p = Math.max(0, Math.min(1, clipAge / dur));
          // Physics-based elastic spring overshoot
          const spring = 1 - Math.exp(-6 * p * tension) * Math.cos(p * Math.PI * 4.5 * tension);
          textScale *= Math.max(0.01, spring);
        }
      } else if (animType === 'keyframe-zoom-in') {
        const zStart = animConfig?.zoomStart ?? 1.0;
        const zEnd = animConfig?.zoomEnd ?? 1.25;
        const p = Math.min(1, Math.max(0, clipProgress));
        textScale *= zStart + (zEnd - zStart) * (p * (2 - p));
      } else if (animType === 'keyframe-zoom-out') {
        const zStart = animConfig?.zoomStart ?? 1.0;
        const zEnd = animConfig?.zoomEnd ?? 1.25;
        const p = Math.min(1, Math.max(0, clipProgress));
        textScale *= zEnd - (zEnd - zStart) * (p * (2 - p));
      } else if (animType === 'slide-up') {
        const dur = animConfig?.duration || 0.45;
        if (clipAge < dur) {
          const p = clipAge / dur;
          const easeP = 1 - Math.pow(1 - p, 3);
          textOffsetY += (1 - easeP) * 45;
          alphaMultiplier *= easeP;
        }
      } else if (animType === 'slide-left') {
        const dur = animConfig?.duration || 0.45;
        if (clipAge < dur) {
          const p = clipAge / dur;
          const easeP = 1 - Math.pow(1 - p, 3);
          ctx.translate((1 - easeP) * 75, 0);
          alphaMultiplier *= easeP;
        }
      } else if (animType === 'glitch') {
        if (clipAge < 0.3) {
          textOffsetY += (Math.random() - 0.5) * 8;
          ctx.translate((Math.random() - 0.5) * 12, 0);
        }
      } else if (animType === 'bounce') {
        textOffsetY = Math.sin(clipProgress * Math.PI * 6) * 8;
        textScale = 1 + Math.sin(clipProgress * Math.PI * 6) * 0.04;
      } else if (animType === 'karaoke') {
        const wave = Math.sin(clipProgress * Math.PI * 4);
        textScale = 1 + Math.max(0, wave) * 0.06;
      } else if (animType === 'fade') {
        if (clipAge < 0.25) {
          alphaMultiplier = clipAge / 0.25;
        } else if (clipRemaining < 0.25) {
          alphaMultiplier = clipRemaining / 0.25;
        }
      }

      ctx.globalAlpha *= Math.max(0, Math.min(1, alphaMultiplier));
      ctx.scale(textScale, textScale);

      const isKhmer = /[\u1780-\u17FF]/.test(cfg.text);
      const chosenFont = cfg.fontFamily || (isKhmer ? 'Kantumruy Pro' : 'Inter');
      ctx.font = `bold ${cfg.fontSize}px "${chosenFont}", "Kantumruy Pro", "Inter", -apple-system, sans-serif`;
      ctx.textBaseline = 'middle';

      const maxLineWidth = width * 0.86;
      const lineHeight = cfg.fontSize * 1.35;

      // Check if word-level synchronization is enabled (Typewriter animation takes absolute precedence)
      const isWordMode =
        !isTypewriter &&
        (cfg.wordStyle === 'word-by-word' ||
          cfg.wordStyle === 'word-highlight' ||
          cfg.wordStyle === 'word-bounce' ||
          cfg.wordStyle === 'karaoke' ||
          animType === 'word-by-word' ||
          animType === 'word-highlight' ||
          animType === 'word-bounce');

      const effectiveWordMode =
        cfg.wordStyle ||
        (cfg.animation === 'word-by-word'
          ? 'word-by-word'
          : cfg.animation === 'word-bounce'
          ? 'word-bounce'
          : cfg.animation === 'word-highlight'
          ? 'word-highlight'
          : 'word-highlight');

      if (isWordMode) {
        // --- 1. WORD-BY-WORD & WORD-HIGHLIGHT TIMED RENDERING ---
        const allWords = tokenizeTextIntoWords(cfg.text);
        const totalWords = Math.max(1, allWords.length);
        const progress = Math.max(0, Math.min(0.999, clipAge / clip.duration));
        const activeWordIndex = Math.min(totalWords - 1, Math.floor(progress * totalWords));
        const wordProgress = progress * totalWords - activeWordIndex; // 0..1 inside this word

        interface WordItem {
          word: string;
          globalIdx: number;
          width: number;
        }

        const spaceWidth = ctx.measureText(' ').width;
        const wordLines: WordItem[][] = [];
        let curLine: WordItem[] = [];
        let curLineWidth = 0;

        allWords.forEach((word, idx) => {
          const wWidth = ctx.measureText(word).width;
          const needed = curLine.length === 0 ? wWidth : curLineWidth + spaceWidth + wWidth;
          if (needed > maxLineWidth && curLine.length > 0) {
            wordLines.push(curLine);
            curLine = [{ word, globalIdx: idx, width: wWidth }];
            curLineWidth = wWidth;
          } else {
            curLine.push({ word, globalIdx: idx, width: wWidth });
            curLineWidth = needed;
          }
        });
        if (curLine.length > 0) wordLines.push(curLine);

        const totalBlockHeight = wordLines.length * lineHeight;

        // Background box/pill behind the whole caption block if configured
        if (cfg.backgroundColor && cfg.backgroundColor !== 'transparent') {
          const maxMeasuredWidth = Math.max(
            ...wordLines.map((l) =>
              l.reduce((sum, w) => sum + w.width, 0) + Math.max(0, l.length - 1) * spaceWidth
            )
          );
          const paddingX = 20;
          const paddingY = 10;
          const pillX = -maxMeasuredWidth / 2 - paddingX;
          const pillY = textOffsetY - totalBlockHeight / 2 - paddingY / 2;
          const pillW = maxMeasuredWidth + paddingX * 2;
          const pillH = totalBlockHeight + paddingY;
          const radius = 10;

          ctx.fillStyle = cfg.backgroundColor;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, radius);
          ctx.fill();
        }

        ctx.textAlign = 'left';

        // Render each word with individual coordinate and timing style
        wordLines.forEach((wLine, lineIdx) => {
          const lineY = textOffsetY - totalBlockHeight / 2 + (lineIdx + 0.5) * lineHeight;
          const lineContentWidth =
            wLine.reduce((sum, w) => sum + w.width, 0) + Math.max(0, wLine.length - 1) * spaceWidth;

          let startX = -lineContentWidth / 2;
          if (cfg.align === 'left') startX = -maxLineWidth / 2;
          else if (cfg.align === 'right') startX = maxLineWidth / 2 - lineContentWidth;

          let curX = startX;

          wLine.forEach((item) => {
            const isCurrent = item.globalIdx === activeWordIndex;
            const isFuture = item.globalIdx > activeWordIndex;

            // In 'word-by-word' mode: words only appear as they are spoken!
            if (effectiveWordMode === 'word-by-word' && isFuture) {
              curX += item.width + spaceWidth;
              return;
            }

            ctx.save();

            let wordScale = 1;
            let wordYOffset = 0;
            let wordColor = cfg.color || '#ffffff';
            let wordStroke = cfg.strokeColor || '#000000';
            let wordShadow = cfg.shadowColor || 'rgba(0,0,0,0.85)';
            let wordShadowBlur = cfg.shadowBlur || 8;

            if (isCurrent) {
              const highlight = cfg.highlightColor || '#ffe600';
              wordColor = highlight;

              if (effectiveWordMode === 'word-bounce') {
                wordYOffset = -Math.sin(wordProgress * Math.PI) * 14;
                wordScale = 1.22;
                wordShadow = highlight;
                wordShadowBlur = 14;
              } else if (effectiveWordMode === 'word-by-word') {
                // Punch pop entrance
                const pop = Math.max(0, 1 - wordProgress * 1.5);
                wordScale = 1 + pop * 0.3;
                wordShadow = highlight;
                wordShadowBlur = 12;
              } else {
                // 'word-highlight' & 'karaoke' (CapCut / TikTok Hormozi style)
                wordScale = 1.16;
                wordYOffset = -2;
                wordShadow = highlight;
                wordShadowBlur = 12;

                if (cfg.highlightBg) {
                  ctx.fillStyle = cfg.highlightBg;
                  ctx.beginPath();
                  ctx.roundRect(curX - 4, lineY - lineHeight / 2 + 4, item.width + 8, lineHeight - 8, 6);
                  ctx.fill();
                }
              }
            } else if (isFuture && effectiveWordMode === 'word-highlight') {
              // Future words in sentence are slightly softer to make current word jump out
              ctx.globalAlpha *= 0.72;
            }

            // Word transform anchored at word center
            const wordCenterX = curX + item.width / 2;
            ctx.translate(wordCenterX, lineY + wordYOffset);
            if (wordScale !== 1) {
              ctx.scale(wordScale, wordScale);
            }
            ctx.translate(-wordCenterX, -(lineY + wordYOffset));

            ctx.shadowColor = wordShadow;
            ctx.shadowBlur = wordShadowBlur;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 2;

            if (cfg.strokeWidth > 0 && wordStroke) {
              ctx.strokeStyle = wordStroke;
              ctx.lineWidth = cfg.strokeWidth;
              ctx.lineJoin = 'round';
              ctx.strokeText(item.word, curX, lineY);
            }

            ctx.fillStyle = wordColor;
            ctx.fillText(item.word, curX, lineY);

            ctx.restore();

            curX += item.width + spaceWidth;
          });
        });
      } else {
        // --- 2. CLASSIC WHOLE-LINE & TYPEWRITER RENDERING ---
        let textToRender = cfg.text;
        let isCursorActive = false;

        if (isTypewriter) {
          const speed = animConfig?.typewriterSpeed || 18;
          const graphemes = splitIntoGraphemes(cfg.text);
          const totalUnits = Math.max(1, graphemes.length);
          // Typing duration: either explicitly configured or dynamically calculated from grapheme count and speed
          const typingDur = animConfig?.duration || Math.max(0.6, totalUnits / speed);
          const tProgress = Math.min(1, Math.max(0, clipAge / typingDur));
          const unitsToShow = Math.max(1, Math.min(totalUnits, Math.floor(tProgress * totalUnits)));
          textToRender = graphemes.slice(0, unitsToShow).join('');

          // Blinking cursor ▎ during typing, blinking at 3.5Hz
          if (tProgress < 1) {
            isCursorActive = Math.floor(clipAge * 3.5) % 2 === 0;
          }
        }

        ctx.textAlign = (cfg.align as CanvasTextAlign) || 'center';

        // Word and syllable aware line wrapping for Canvas (protects Khmer continuous text from overflowing)
        const lines = wrapCanvasText(
          textToRender,
          (str) => ctx.measureText(str).width,
          maxLineWidth
        );

        // Append blinking cursor to the end of the last line during active typing
        if (isCursorActive && lines.length > 0) {
          lines[lines.length - 1] += ' ▎';
        }

        const totalBlockHeight = lines.length * lineHeight;

        if (cfg.backgroundColor && cfg.backgroundColor !== 'transparent') {
          const maxMeasuredWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
          const paddingX = 20;
          const paddingY = 10;
          const pillX =
            cfg.align === 'left'
              ? -maxLineWidth / 2 - paddingX
              : cfg.align === 'right'
              ? maxLineWidth / 2 - maxMeasuredWidth - paddingX
              : -maxMeasuredWidth / 2 - paddingX;
          const pillY = textOffsetY - totalBlockHeight / 2 - paddingY / 2;
          const pillW = maxMeasuredWidth + paddingX * 2;
          const pillH = totalBlockHeight + paddingY;
          const radius = 10;

          ctx.fillStyle = cfg.backgroundColor;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, radius);
          ctx.fill();
        }

        lines.forEach((line, lineIdx) => {
          const lineY = textOffsetY - totalBlockHeight / 2 + (lineIdx + 0.5) * lineHeight;
          const lineX =
            cfg.align === 'left'
              ? -maxLineWidth / 2
              : cfg.align === 'right'
              ? maxLineWidth / 2
              : 0;

          if (cfg.shadowColor || cfg.shadowBlur) {
            ctx.shadowColor = cfg.shadowColor || 'rgba(0,0,0,0.85)';
            ctx.shadowBlur = cfg.shadowBlur || 8;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 2;
          } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }

          if (cfg.strokeWidth > 0 && cfg.strokeColor) {
            ctx.strokeStyle = cfg.strokeColor;
            ctx.lineWidth = cfg.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.strokeText(line, lineX, lineY);
          }

          ctx.fillStyle = cfg.color || '#ffffff';
          ctx.fillText(line, lineX, lineY);
        });
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
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
