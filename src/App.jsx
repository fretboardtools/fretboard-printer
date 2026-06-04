import { useState, useRef, useCallback, useEffect } from "react";

// ─── Music Theory ─────────────────────────────────────────────────────────────

const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_NAMES = {"C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb"};
const noteDisp = n => FLAT_NAMES[n] ? `${n}/${FLAT_NAMES[n]}` : n;
const addSemi = (note, n) => NOTES[(NOTES.indexOf(note) + n + 120) % 12];
const semiDiff = (a, b) => (NOTES.indexOf(b) - NOTES.indexOf(a) + 12) % 12;

const INTERVAL_NAMES = {
  0:"R",1:"b2",2:"2",3:"b3",4:"3",5:"4",
  6:"b5",7:"5",8:"b6",9:"6",10:"b7",11:"maj7"
};

const SCALES = {
  "Major":                [0,2,4,5,7,9,11],
  "Natural Minor":        [0,2,3,5,7,8,10],
  "Minor Pentatonic":     [0,3,5,7,10],
  "Major Pentatonic":     [0,2,4,7,9],
  "Blues":                [0,3,5,6,7,10],
  "Major Blues":          [0,2,3,4,7,9],
  "Dorian":               [0,2,3,5,7,9,10],
  "Phrygian":             [0,1,3,5,7,8,10],
  "Lydian":               [0,2,4,6,7,9,11],
  "Mixolydian":           [0,2,4,5,7,9,10],
  "Aeolian":              [0,2,3,5,7,8,10],
  "Locrian":              [0,1,3,5,6,8,10],
  "Harmonic Minor":       [0,2,3,5,7,8,11],
  "Melodic Minor":        [0,2,3,5,7,9,11],
  "Phrygian Dominant":    [0,1,4,5,7,8,10],
  "Hungarian Minor":      [0,2,3,6,7,8,11],
  "Byzantine":            [0,1,4,5,7,8,11],
  "Whole Tone":           [0,2,4,6,8,10],
  "Diminished (HW)":      [0,1,3,4,6,7,9,10],
  "Lydian b7":            [0,2,4,6,7,9,10],
  "Prometheus":           [0,2,4,6,9,10],
  "Hirajoshi":            [0,2,3,7,8],
};

const CHORDS = {
  "Major (triad)":        [0,4,7],
  "Minor (triad)":        [0,3,7],
  "Diminished":           [0,3,6],
  "Augmented":            [0,4,8],
  "Sus2":                 [0,2,7],
  "Sus4":                 [0,5,7],
  "Dominant 7":           [0,4,7,10],
  "Major 7":              [0,4,7,11],
  "Minor 7":              [0,3,7,10],
  "Minor maj7":           [0,3,7,11],
  "Dominant 9":           [0,4,7,10,2],
  "Major 9":              [0,4,7,11,2],
  "Minor 9":              [0,3,7,10,2],
  "Dominant 11":          [0,4,7,10,2,5],
  "Dominant 13":          [0,4,7,10,2,5,9],
  "7sus4":                [0,5,7,10],
  "Half-dim (m7b5)":      [0,3,6,10],
  "Diminished 7":         [0,3,6,9],
  "Dominant 7#9":         [0,4,7,10,3],
  "Dominant 7b9":         [0,4,7,10,1],
};

const ARPEGGIOS = {
  "Major":      [0,4,7],
  "Minor":      [0,3,7],
  "Diminished": [0,3,6],
  "Augmented":  [0,4,8],
  "Dom7":       [0,4,7,10],
  "Maj7":       [0,4,7,11],
  "Min7":       [0,3,7,10],
  "Dim7":       [0,3,6,9],
};

const TYPE_DATA = { Scale: SCALES, Chord: CHORDS, Arpeggio: ARPEGGIOS };

const DOT_SHAPES = ["circle","square","diamond"];
const DOT_SIZES  = { small:10, medium:13, large:16 };

const LAYER_COLORS = ["#E85D3A","#3A8FE8","#2ECC71","#F0A500","#9B59B6","#1ABC9C","#E91E8C"];

// ─── Tuning presets ───────────────────────────────────────────────────────────

const TUNING_PRESETS = {
  "6-string": {
    "Standard (EADGBe)":   ["E","A","D","G","B","E"],
    "Drop D":              ["D","A","D","G","B","E"],
    "Open G":              ["D","G","D","G","B","D"],
    "Open D":              ["D","A","D","F#","A","D"],
    "DADGAD":              ["D","A","D","G","A","D"],
    "Half step down":      ["D#","G#","C#","F#","A#","D#"],
    "Full step down":      ["D","G","C","F","A","D"],
  },
  "7-string": {
    "Standard 7 (BEADGBe)":["B","E","A","D","G","B","E"],
    "Drop A":               ["A","E","A","D","G","B","E"],
  },
  "8-string": {
    "Standard 8":           ["F#","B","E","A","D","G","B","E"],
    "Drop E":               ["E","B","E","A","D","G","B","E"],
  },
};

const DEFAULT_TUNING = ["E","A","D","G","B","E"];

// ─── Generate fretboard note data ─────────────────────────────────────────────

function buildFretboardDots(layers, tuning, fretStart, fretEnd) {
  // Returns array of { string, fret, note, label, color, shape, size, isRoot, layerId }
  const dots = [];
  layers.forEach(layer => {
    if (!layer.visible) return;
    const intervals = layer.intervals; // semitones relative to root
    const root = layer.root;
    const noteSet = new Set(intervals.map(i => addSemi(root, i)));
    const rootNote = root;

    tuning.forEach((openNote, si) => {
      for (let fret = fretStart; fret <= fretEnd; fret++) {
        const note = addSemi(openNote, fret);
        if (noteSet.has(note)) {
          const semi = semiDiff(root, note);
          let label = "";
          if (layer.labelMode === "note")     label = note;
          if (layer.labelMode === "interval") label = INTERVAL_NAMES[semi] || "";
          if (layer.labelMode === "finger")   label = layer.fingerLabels?.[`${si}-${fret}`] || "";
          if (layer.labelMode === "blank")    label = "";
          dots.push({
            string: si,
            fret,
            note,
            label,
            color: layer.color,
            shape: layer.shape,
            size: layer.size,
            isRoot: note === rootNote,
            layerId: layer.id,
          });
        }
      }
    });
  });
  return dots;
}

// For custom layers (manual dot placement)
function buildCustomDots(layer, fretStart, fretEnd, tuning) {
  if (!layer.visible) return [];
  return (layer.customDots || []).filter(d => d.fret >= fretStart && d.fret <= fretEnd);
}

// ─── SVG Fretboard ────────────────────────────────────────────────────────────

const FRET_W   = 52;  // px per fret
const STRING_H = 28;  // px per string
const MARGIN_L = 48;  // left margin for string labels
const MARGIN_T = 28;  // top for fret numbers
const MARGIN_B = 20;
const MARGIN_R = 16;

function FretboardSVG({
  tuning, fretStart, fretEnd, dots,
  bwMode, showFretNums, showStringNames, isDark=true,
}) {
  const strings = tuning.length;
  const fretCount = fretEnd - fretStart + 1;

  const svgW = MARGIN_L + fretCount * FRET_W + MARGIN_R;
  const svgH = MARGIN_T + (strings - 1) * STRING_H + MARGIN_B;

  // Dot colour in B&W mode
  const dotFill = (color, isRoot, dotIndex) => {
    if (!bwMode) return color;
    const patterns = ["filled","hollow","hatched","dotted","ring"];
    return "#000"; // B&W handled via SVG patterns
  };

  const getBWPattern = (layerIdx, isRoot) => {
    if (!bwMode) return null;
    const p = ["url(#bw0)","url(#bw1)","url(#bw2)","url(#bw3)","url(#bw4)"];
    return isRoot ? "url(#bwRoot)" : p[layerIdx % p.length];
  };

  const renderDot = (d, layerIndex) => {
    const x = MARGIN_L + (d.fret - fretStart) * FRET_W + FRET_W / 2;
    const y = MARGIN_T + (strings - 1 - d.string) * STRING_H;
    const r = DOT_SIZES[d.size] || 13;
    const fill = bwMode ? getBWPattern(layerIndex, d.isRoot) : d.color;
    const stroke = d.isRoot ? (bwMode ? "#000" : "#fff") : "none";
    const strokeW = d.isRoot ? 2 : 0;

    let shape;
    if (d.shape === "circle") {
      shape = <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={strokeW}/>;
    } else if (d.shape === "square") {
      shape = <rect x={x-r} y={y-r} width={r*2} height={r*2} fill={fill} stroke={stroke} strokeWidth={strokeW} rx={2}/>;
    } else if (d.shape === "diamond") {
      const pts = `${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}`;
      shape = <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeW}/>;
    }

    const fontSize = r < 11 ? 7 : r < 14 ? 9 : 10;
    return (
      <g key={`${d.layerId}-${d.string}-${d.fret}`}>
        {shape}
        {d.label && (
          <text x={x} y={y+fontSize/3} textAnchor="middle" fontSize={fontSize}
            fontFamily="'JetBrains Mono',monospace" fontWeight="700"
            fill={bwMode ? (d.shape==="hollow" ? "#000" : "#fff") : "#fff"}>
            {d.label}
          </text>
        )}
      </g>
    );
  };

  // Group dots by layerId for B&W pattern assignment
  const layerIds = [...new Set(dots.map(d => d.layerId))];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ display:"block", maxWidth:"100%" }}
    >
      <defs>
        {/* B&W patterns */}
        <pattern id="bw0" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#000"/>
        </pattern>
        <pattern id="bw1" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#fff" stroke="#000" strokeWidth="1"/>
        </pattern>
        <pattern id="bw2" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#fff"/>
          <line x1="0" y1="0" x2="4" y2="4" stroke="#000" strokeWidth="1"/>
          <line x1="0" y1="4" x2="4" y2="0" stroke="#000" strokeWidth="1"/>
        </pattern>
        <pattern id="bw3" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="#fff"/>
          <line x1="0" y1="3" x2="6" y2="3" stroke="#000" strokeWidth="1"/>
          <line x1="3" y1="0" x2="3" y2="6" stroke="#000" strokeWidth="1"/>
        </pattern>
        <pattern id="bw4" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#666"/>
        </pattern>
        <pattern id="bwRoot" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#000"/>
          <circle cx="2" cy="2" r="1" fill="#fff"/>
        </pattern>
      </defs>

      {/* Background */}
      <rect width={svgW} height={svgH} fill={bwMode ? "#fff" : isDark ? "#1a1f2e" : "#f8f9fc"}/>

      {/* Nut — shown when starting at fret 1 */}
      {fretStart === 1 && (
        <rect x={MARGIN_L-2} y={MARGIN_T} width={4}
          height={(strings-1)*STRING_H} fill={bwMode?"#000":isDark?"#8899aa":"#5a6880"}/>
      )}

      {/* Fret lines */}
      {Array.from({length: fretCount}, (_, i) => {
        const x = MARGIN_L + i * FRET_W;
        return (
          <line key={i} x1={x} y1={MARGIN_T} x2={x}
            y2={MARGIN_T+(strings-1)*STRING_H}
            stroke={bwMode?"#000":isDark?"#2d3a50":"#c8d0e0"} strokeWidth={i===fretCount-1?1.5:1}/>
        );
      })}
      {/* Last fret line */}
      <line x1={MARGIN_L+fretCount*FRET_W} y1={MARGIN_T}
        x2={MARGIN_L+fretCount*FRET_W} y2={MARGIN_T+(strings-1)*STRING_H}
        stroke={bwMode?"#000":isDark?"#2d3a50":"#c8d0e0"} strokeWidth={1}/>

      {/* String lines */}
      {Array.from({length: strings}, (_, si) => {
        const y = MARGIN_T + si * STRING_H;
        const thickness = si === 0 || si === strings-1 ? 1 : 1.5 + si * 0.15;
        return (
          <line key={si} x1={MARGIN_L} y1={y} x2={MARGIN_L+fretCount*FRET_W} y2={y}
            stroke={bwMode?"#555":isDark?"#3d4e68":"#a0aab8"} strokeWidth={thickness}/>
        );
      })}

      {/* Fret position markers */}
      {Array.from({length: fretCount}, (_, i) => {
        const fret = fretStart + i;
        const cx = MARGIN_L + i * FRET_W + FRET_W / 2;
        const midY = MARGIN_T + ((strings-1)/2) * STRING_H;
        if ([3,5,7,9].includes(fret)) {
          return <circle key={fret} cx={cx} cy={midY} r={4}
            fill={bwMode?"#ccc":isDark?"#1a2535":"#d0d8e8"}/>;
        }
        if (fret === 12) {
          return (
            <g key={fret}>
              <circle cx={cx} cy={midY - STRING_H} r={4} fill={bwMode?"#ccc":isDark?"#1a2535":"#d0d8e8"}/>
              <circle cx={cx} cy={midY + STRING_H} r={4} fill={bwMode?"#ccc":isDark?"#1a2535":"#d0d8e8"}/>
            </g>
          );
        }
        return null;
      })}

      {/* Fret numbers */}
      {showFretNums && Array.from({length: fretCount}, (_, i) => {
        const fret = fretStart + i;
        const x = MARGIN_L + i * FRET_W + FRET_W / 2;
        return (
          <text key={fret} x={x} y={MARGIN_T - 8}
            textAnchor="middle" fontSize={10}
            fontFamily="'JetBrains Mono',monospace"
            fill={bwMode?"#000":isDark?"#5a7090":"#8899aa"}
            fontWeight={[3,5,7,9,12].includes(fret)?"700":"400"}>
            {fret}
          </text>
        );
      })}

      {/* String name labels */}
      {showStringNames && tuning.slice().reverse().map((note, di) => (
        <text key={di} x={MARGIN_L-8} y={MARGIN_T + di * STRING_H + 4}
          textAnchor="end" fontSize={10}
          fontFamily="'JetBrains Mono',monospace"
          fill={bwMode?"#000":isDark?"#5a7090":"#8899aa"}
          fontWeight="600">
          {note}
        </text>
      ))}

      {/* Dots */}
      {dots.map(d => {
        const layerIdx = layerIds.indexOf(d.layerId);
        return renderDot(d, layerIdx);
      })}
    </svg>
  );
}

// ─── Print Page SVG ───────────────────────────────────────────────────────────

function PrintPageSVG({
  tuning, fretStart, fretEnd, dots,
  bwMode, showFretNums, showStringNames,
  title, subtitle, showNotesArea,
  orientation, logoText,
}) {
  const pageW = orientation === "landscape" ? 1050 : 740;
  const pageH = orientation === "landscape" ? 740 : 1050;
  const pad = 48;

  const strings = tuning.length;
  const fretCount = fretEnd - fretStart + 1;

  // Scale fretboard to fit page width
  const availW = pageW - pad * 2;
  const availH = pageH - pad * 2 - (title ? 60 : 0) - (subtitle ? 30 : 0) - (showNotesArea ? 200 : 0);
  const fretW = Math.min(58, Math.floor(availW / fretCount));
  const stringH = Math.min(36, Math.floor(availH / (strings + 1)));

  const fbW = MARGIN_L + fretCount * fretW + MARGIN_R;
  const fbH = MARGIN_T + (strings - 1) * stringH + MARGIN_B;

  const fbX = pad + (availW - fbW) / 2;
  const fbY = pad + (title ? 56 : 16) + (subtitle ? 28 : 0);

  const layerIds = [...new Set(dots.map(d => d.layerId))];

  const renderPageDot = (d, layerIndex) => {
    const x = fbX + MARGIN_L + (d.fret - fretStart) * fretW + fretW / 2;
    const y = fbY + MARGIN_T + (strings - 1 - d.string) * stringH;
    const r = DOT_SIZES[d.size] || 13;
    const bwPatterns = ["url(#pbw0)","url(#pbw1)","url(#pbw2)","url(#pbw3)","url(#pbw4)"];
    const fill = bwMode
      ? (d.isRoot ? "url(#pbwRoot)" : bwPatterns[layerIndex % bwPatterns.length])
      : d.color;
    const stroke = d.isRoot ? (bwMode?"#000":"#fff") : "none";

    let shape;
    const fontSize = r < 11 ? 7 : r < 14 ? 9 : 10;
    if (d.shape === "circle") {
      shape = <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={d.isRoot?2:0}/>;
    } else if (d.shape === "square") {
      shape = <rect x={x-r} y={y-r} width={r*2} height={r*2} fill={fill} stroke={stroke} strokeWidth={d.isRoot?2:0} rx={2}/>;
    } else {
      const pts = `${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}`;
      shape = <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={d.isRoot?2:0}/>;
    }

    return (
      <g key={`p-${d.layerId}-${d.string}-${d.fret}`}>
        {shape}
        {d.label && (
          <text x={x} y={y+fontSize/3} textAnchor="middle" fontSize={fontSize}
            fontFamily="'JetBrains Mono',monospace" fontWeight="700"
            fill={bwMode ? (layerIndex===1?"#000":"#fff") : "#fff"}>
            {d.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={pageW} height={pageH}
      viewBox={`0 0 ${pageW} ${pageH}`} style={{ display:"block" }}>
      <defs>
        <pattern id="pbw0" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#000"/>
        </pattern>
        <pattern id="pbw1" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#fff" stroke="#000" strokeWidth="1.5"/>
        </pattern>
        <pattern id="pbw2" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#fff"/>
          <line x1="0" y1="0" x2="4" y2="4" stroke="#000" strokeWidth="1"/>
          <line x1="0" y1="4" x2="4" y2="0" stroke="#000" strokeWidth="1"/>
        </pattern>
        <pattern id="pbw3" patternUnits="userSpaceOnUse" width="6" height="6">
          <rect width="6" height="6" fill="#fff"/>
          <line x1="0" y1="3" x2="6" y2="3" stroke="#000" strokeWidth="1"/>
          <line x1="3" y1="0" x2="3" y2="6" stroke="#000" strokeWidth="1"/>
        </pattern>
        <pattern id="pbw4" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#888"/>
        </pattern>
        <pattern id="pbwRoot" patternUnits="userSpaceOnUse" width="4" height="4">
          <rect width="4" height="4" fill="#000"/>
          <circle cx="2" cy="2" r="1" fill="#fff"/>
        </pattern>
      </defs>

      {/* Page background */}
      <rect width={pageW} height={pageH} fill="#fff"/>

      {/* Title */}
      {title && (
        <text x={pad} y={pad+32} fontSize={26} fontFamily="Georgia,serif"
          fontStyle="italic" fontWeight="400" fill="#111">{title}</text>
      )}
      {subtitle && (
        <text x={pad} y={pad + (title?60:32)} fontSize={13}
          fontFamily="'JetBrains Mono',monospace" fill="#555">{subtitle}</text>
      )}

      {/* Nut */}
      {fretStart === 1 && (
        <rect x={fbX+MARGIN_L-2} y={fbY+MARGIN_T} width={4}
          height={(strings-1)*stringH} fill="#333"/>
      )}

      {/* Fret lines */}
      {Array.from({length: fretCount}, (_, i) => {
        const x = fbX + MARGIN_L + i * fretW;
        return <line key={i} x1={x} y1={fbY+MARGIN_T}
          x2={x} y2={fbY+MARGIN_T+(strings-1)*stringH}
          stroke="#bbb" strokeWidth={1}/>;
      })}
      <line x1={fbX+MARGIN_L+fretCount*fretW} y1={fbY+MARGIN_T}
        x2={fbX+MARGIN_L+fretCount*fretW} y2={fbY+MARGIN_T+(strings-1)*stringH}
        stroke="#bbb" strokeWidth={1}/>

      {/* String lines */}
      {Array.from({length: strings}, (_, si) => {
        const y = fbY + MARGIN_T + si * stringH;
        const thickness = 0.8 + ((strings-1-si) * 0.15);
        return <line key={si} x1={fbX+MARGIN_L} y1={y}
          x2={fbX+MARGIN_L+fretCount*fretW} y2={y}
          stroke="#999" strokeWidth={thickness}/>;
      })}

      {/* Position markers */}
      {Array.from({length: fretCount}, (_, i) => {
        const fret = fretStart + i;
        const cx = fbX + MARGIN_L + i * fretW + fretW / 2;
        const midY = fbY + MARGIN_T + ((strings-1)/2) * stringH;
        if ([3,5,7,9].includes(fret)) {
          return <circle key={fret} cx={cx} cy={midY} r={4} fill="#ddd"/>;
        }
        if (fret === 12) return (
          <g key={fret}>
            <circle cx={cx} cy={midY - stringH} r={4} fill="#ddd"/>
            <circle cx={cx} cy={midY + stringH} r={4} fill="#ddd"/>
          </g>
        );
        return null;
      })}

      {/* Fret numbers */}
      {showFretNums && Array.from({length: fretCount}, (_, i) => {
        const fret = fretStart + i;
        const x = fbX + MARGIN_L + i * fretW + fretW / 2;
        return <text key={fret} x={x} y={fbY+MARGIN_T-8}
          textAnchor="middle" fontSize={10}
          fontFamily="'JetBrains Mono',monospace"
          fill="#888" fontWeight={[3,5,7,9,12].includes(fret)?"700":"400"}>
          {fret}
        </text>;
      })}

      {/* String labels */}
      {showStringNames && tuning.slice().reverse().map((note, di) => (
        <text key={di} x={fbX+MARGIN_L-8} y={fbY+MARGIN_T+di*stringH+4}
          textAnchor="end" fontSize={10}
          fontFamily="'JetBrains Mono',monospace" fill="#666" fontWeight="600">
          {note}
        </text>
      ))}

      {/* Dots */}
      {dots.map(d => renderPageDot(d, layerIds.indexOf(d.layerId)))}

      {/* Notes area */}
      {showNotesArea && (() => {
        const notesY = fbY + fbH + 24;
        const lineCount = 7;
        const lineSpacing = (pageH - notesY - pad - 24) / lineCount;
        return (
          <g>
            <text x={pad} y={notesY} fontSize={11}
              fontFamily="'JetBrains Mono',monospace" fill="#999"
              letterSpacing="2">PRACTICE NOTES</text>
            {Array.from({length: lineCount}, (_, i) => (
              <line key={i}
                x1={pad} y1={notesY + 20 + i * lineSpacing}
                x2={pageW - pad} y2={notesY + 20 + i * lineSpacing}
                stroke="#ddd" strokeWidth={1}/>
            ))}
          </g>
        );
      })()}

      {/* Branding footer */}
      {logoText && (
        <text x={pageW - pad} y={pageH - 16}
          textAnchor="end" fontSize={9}
          fontFamily="'JetBrains Mono',monospace" fill="#ccc" letterSpacing="1">
          {logoText}
        </text>
      )}
    </svg>
  );
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const THEMES = {
  dark: {
    bg:        "#080b10",
    surface:   "#0d1017",
    surface2:  "#141820",
    surface3:  "#1a2030",
    border:    "#1a2030",
    border2:   "#252f40",
    text:      "#c0cce0",
    textHi:    "#e8f0ff",
    textMid:   "#8899b0",
    textLo:    "#4a5568",
    textMute:  "#2d3a50",
    accent:    "#e0c080",
    fbBg:      "#1a1f2e",
    fbBorder:  "#1e2535",
    inputBg:   "#141820",
    selBg:     "#141820",
    scrollBg:  "#0d1017",
    scrollTh:  "#1e2535",
    selOptBg:  "#141820",
    badge:     "#451a03",
  },
  light: {
    bg:        "#f0f2f6",
    surface:   "#ffffff",
    surface2:  "#f7f8fa",
    surface3:  "#edf0f5",
    border:    "#dde3ee",
    border2:   "#c8d0e0",
    text:      "#1a2030",
    textHi:    "#0a0c14",
    textMid:   "#3d4e68",
    textLo:    "#6b7a90",
    textMute:  "#99aabb",
    accent:    "#b8930a",
    fbBg:      "#ffffff",
    fbBorder:  "#dde3ee",
    inputBg:   "#f7f8fa",
    selBg:     "#f7f8fa",
    scrollBg:  "#f0f2f6",
    scrollTh:  "#c8d0e0",
    selOptBg:  "#ffffff",
    badge:     "#fef3c7",
  },
};

// ─── Custom Intervals Editor ──────────────────────────────────────────────────
// Lets the user enter a root note + intervals (by semitone or note name)
// e.g. "0,2,4,5,7,9,11" or "C,D,E,F,G,A,B"

function CustomIntervalsEditor({ layer, onChange, T, ic }) {
  const [inputVal, setInputVal] = useState(
    layer.customInput || ""
  );
  const [error, setError] = useState("");

  // Parse the input — accepts semitone numbers OR note names
  const parseInput = (raw) => {
    const parts = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return null;

    // Try semitone numbers first: 0,2,4,5,7,9,11
    if (parts.every(p => /^\d+$/.test(p))) {
      const semis = parts.map(Number).filter(n => n >= 0 && n <= 11);
      return [...new Set(semis)].sort((a,b) => a-b);
    }

    // Try note names: C,D,Eb,F#,G,A,Bb
    const noteMap = {"C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,
                     "F#":6,"Gb":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11};
    if (parts.every(p => noteMap[p] !== undefined)) {
      // Convert to intervals relative to first note (root)
      const root = noteMap[parts[0]];
      const semis = parts.map(p => (noteMap[p] - root + 12) % 12);
      return [...new Set(semis)].sort((a,b) => a-b);
    }

    return null;
  };

  const handleApply = (raw) => {
    const semis = parseInput(raw);
    if (semis === null || semis.length < 2) {
      setError("Enter 2+ semitone numbers (0–11) or note names separated by commas");
      return;
    }
    setError("");
    onChange({ ...layer, intervals: semis, customInput: raw });
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

      {/* Root */}
      <TRow label="ROOT NOTE" T={T}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"3px" }}>
          {NOTES.map(n => (
            <TPill key={n} active={layer.root===n} color={ic} T={T} mono
              onClick={() => onChange({ ...layer, root:n })}>{n}</TPill>
          ))}
        </div>
      </TRow>

      {/* Interval input */}
      <TRow label="INTERVALS OR NOTES" T={T}>
        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleApply(inputVal)}
            placeholder="e.g. 0,2,4,5,7,9,11  or  C,D,E,F,G,A,B"
            style={{
              background:T.inputBg, border:`1px solid ${error ? "#ef4444" : T.border}`,
              borderRadius:"6px", color:T.textHi, padding:"7px 10px",
              fontSize:"12px", width:"100%", outline:"none",
              fontFamily:"'JetBrains Mono',monospace",
            }}
          />
          {error && <div style={{ fontSize:"10px", color:"#ef4444" }}>{error}</div>}
          <div style={{ fontSize:"10px", color:T.textMute, lineHeight:"1.6" }}>
            Semitones: <span style={{ color:ic }}>0=R, 1=b2, 2=2, 3=b3, 4=3, 5=4, 6=b5, 7=5, 8=b6, 9=6, 10=b7, 11=maj7</span>
          </div>
          <button onClick={() => handleApply(inputVal)} style={{
            padding:"6px 14px", borderRadius:"7px", fontSize:"12px", fontWeight:"700",
            border:`1.5px solid ${ic}`, background:`${ic}20`,
            color:ic, cursor:"pointer", alignSelf:"flex-start",
          }}>Apply →</button>
        </div>
      </TRow>

      {/* Show current intervals if set */}
      {layer.intervals && layer.intervals.length > 0 && (
        <TRow label="CURRENT INTERVALS" T={T}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
            {layer.intervals.map(s => (
              <span key={s} style={{
                padding:"3px 8px", borderRadius:"5px", fontSize:"11px",
                background:`${ic}15`, color:ic, border:`1px solid ${ic}44`,
                fontFamily:"'JetBrains Mono',monospace", fontWeight:"700",
              }}>{INTERVAL_NAMES[s] || s}</span>
            ))}
          </div>
        </TRow>
      )}

      {/* Quick interval presets */}
      <TRow label="QUICK LOAD" T={T}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
          {[
            ["Major", "0,2,4,5,7,9,11"],
            ["Minor", "0,2,3,5,7,8,10"],
            ["Penta", "0,3,5,7,10"],
            ["Blues", "0,3,5,6,7,10"],
            ["Dom7", "0,4,7,10"],
            ["Maj7", "0,4,7,11"],
          ].map(([label, val]) => (
            <button key={label} onClick={() => { setInputVal(val); handleApply(val); }} style={{
              padding:"4px 9px", borderRadius:"5px", fontSize:"11px",
              border:`1px solid ${T.border}`, background:T.surface2,
              color:T.textLo, cursor:"pointer",
            }}>{label}</button>
          ))}
        </div>
      </TRow>
    </div>
  );
}

// ─── Layer Editor ─────────────────────────────────────────────────────────────

function LayerEditor({ layer, onChange, onRemove, isOnly, T }) {
  const [expanded, setExpanded] = useState(true);
  const update = (key, val) => onChange({ ...layer, [key]: val });
  const typeOptions = Object.keys(TYPE_DATA);
  const nameOptions = layer.type ? Object.keys(TYPE_DATA[layer.type]) : [];
  const ic = layer.color;

  const handleTypeChange = (t) => {
    const names = Object.keys(TYPE_DATA[t]);
    onChange({ ...layer, type:t, name:names[0], intervals:TYPE_DATA[t][names[0]] });
  };
  const handleNameChange = (n) => {
    onChange({ ...layer, name:n, intervals:TYPE_DATA[layer.type][n] });
  };

  return (
    <div style={{
      background: T.surface2,
      borderRadius:"10px",
      border:`1.5px solid ${expanded ? ic+"66" : T.border}`,
      marginBottom:"8px", overflow:"hidden",
      transition:"border-color 0.2s",
    }}>
      <div style={{
        display:"flex", alignItems:"center", gap:"8px",
        padding:"10px 12px", cursor:"pointer",
        background: expanded ? `${ic}10` : "transparent",
      }} onClick={() => setExpanded(e=>!e)}>
        <div style={{ width:"13px", height:"13px", borderRadius:"50%", background:ic, flexShrink:0, boxShadow:`0 0 5px ${ic}88` }}/>
        <span style={{ flex:1, fontSize:"12px", fontWeight:"600", color:T.textHi, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {layer.type==="Custom" ? "Custom dots" : `${layer.root} ${layer.name}`}
        </span>
        <button onClick={e=>{e.stopPropagation();update("visible",!layer.visible)}} style={{
          background:"none",border:"none",cursor:"pointer",fontSize:"13px",
          opacity:layer.visible?1:0.3,color:ic,padding:"0 2px",
        }}>👁</button>
        {!isOnly && (
          <button onClick={e=>{e.stopPropagation();onRemove()}} style={{
            background:"none",border:"none",cursor:"pointer",fontSize:"12px",color:"#ef4444",padding:"0 2px",
          }}>✕</button>
        )}
        <span style={{ color:T.textLo, fontSize:"11px" }}>{expanded?"▾":"▸"}</span>
      </div>

      {expanded && (
        <div style={{ padding:"12px", display:"flex", flexDirection:"column", gap:"10px", borderTop:`1px solid ${T.border}` }}>
          <TRow label="TYPE" T={T}>
            <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
              {["Scale","Chord","Arpeggio","Custom"].map(t => (
                <TPill key={t} active={layer.type===t} color={ic} T={T}
                  onClick={() => t==="Custom"
                    ? onChange({...layer,type:"Custom",intervals:[],customDots:layer.customDots||[]})
                    : handleTypeChange(t)
                  }>{t}</TPill>
              ))}
            </div>
          </TRow>

          {layer.type !== "Custom" && <>
            <TRow label="ROOT" T={T}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"3px" }}>
                {NOTES.map(n => (
                  <TPill key={n} active={layer.root===n} color={ic} T={T} mono
                    onClick={() => update("root",n)}>{n}</TPill>
                ))}
              </div>
            </TRow>
            <TRow label={layer.type.toUpperCase()} T={T}>
              <select value={layer.name} onChange={e=>handleNameChange(e.target.value)} style={{
                background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:"6px",
                color:T.textHi, padding:"5px 8px", fontSize:"12px",
                width:"100%", cursor:"pointer",
              }}>
                {nameOptions.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </TRow>
          </>}

          {layer.type === "Custom" && (
            <CustomIntervalsEditor layer={layer} onChange={onChange} T={T} ic={ic}/>
          )}

          <TRow label="LABELS" T={T}>
            <div style={{ display:"flex", gap:"4px", flexWrap:"wrap" }}>
              {["note","interval","blank"].map(m=>(
                <TPill key={m} active={layer.labelMode===m} color={ic} T={T} onClick={()=>update("labelMode",m)}>{m}</TPill>
              ))}
            </div>
          </TRow>
          <TRow label="SHAPE" T={T}>
            <div style={{ display:"flex", gap:"4px" }}>
              {DOT_SHAPES.map(s=>(
                <TPill key={s} active={layer.shape===s} color={ic} T={T} onClick={()=>update("shape",s)}>{s}</TPill>
              ))}
            </div>
          </TRow>
          <TRow label="SIZE" T={T}>
            <div style={{ display:"flex", gap:"4px" }}>
              {["small","medium","large"].map(s=>(
                <TPill key={s} active={layer.size===s} color={ic} T={T} onClick={()=>update("size",s)}>{s}</TPill>
              ))}
            </div>
          </TRow>
          <TRow label="COLOUR" T={T}>
            <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", alignItems:"center" }}>
              {LAYER_COLORS.map(c=>(
                <button key={c} onClick={()=>update("color",c)} style={{
                  width:"20px",height:"20px",borderRadius:"50%",background:c,
                  border:layer.color===c?"2.5px solid #fff":"2px solid transparent",cursor:"pointer",
                }}/>
              ))}
              <input type="color" value={layer.color} onChange={e=>update("color",e.target.value)}
                style={{ width:"24px",height:"24px",borderRadius:"4px",border:"none",cursor:"pointer",padding:0 }}/>
            </div>
          </TRow>
        </div>
      )}
    </div>
  );
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function TRow({ label, children, T }) {
  return (
    <div>
      <div style={{ fontSize:"9px", color:T.textLo, letterSpacing:"1.5px", marginBottom:"5px", fontFamily:"'JetBrains Mono',monospace", fontWeight:"600" }}>{label}</div>
      {children}
    </div>
  );
}

function TPill({ active, color, onClick, children, mono, T }) {
  return (
    <button onClick={onClick} style={{
      padding:"4px 9px", borderRadius:"5px", fontSize:"11px",
      border: active ? `1.5px solid ${color}` : `1.5px solid ${T.border}`,
      background: active ? `${color}20` : T.surface3,
      color: active ? color : T.textLo,
      cursor:"pointer",
      fontFamily: mono ? "'JetBrains Mono',monospace" : "'DM Sans',sans-serif",
      transition:"all 0.1s", fontWeight: active?"700":"400",
    }}>{children}</button>
  );
}

function SL({ children, style, T }) {
  return (
    <div style={{ fontSize:"9px", color:T.textLo, letterSpacing:"1.5px", marginBottom:"6px", fontFamily:"'JetBrains Mono',monospace", fontWeight:"600", ...style }}>
      {children}
    </div>
  );
}

function MiniBtn({ children, onClick, active, T }) {
  return (
    <button onClick={onClick} style={{
      padding:"5px 12px", borderRadius:"6px", fontSize:"11px",
      border: active ? "1.5px solid #F59E0B" : `1.5px solid ${T.border}`,
      background: active ? "#451a03" : "transparent",
      color: active ? "#F59E0B" : T.textMid,
      cursor:"pointer",
    }}>{children}</button>
  );
}

// ─── Print modal ──────────────────────────────────────────────────────────────

function PrintModalInner({ settings, tuning, fretStart, fretEnd, dots, onClose, T }) {
  const [bw, setBw] = useState(false);
  const [orient, setOrient] = useState("landscape");
  const [notesArea, setNotesArea] = useState(true);
  const svgRef = useRef(null);

  const handlePrint = () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    const win = window.open("","_blank","width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <style>
        @page{size:${orient==="landscape"?"A4 landscape":"A4 portrait"};margin:0}
        body{margin:0;background:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh}
        img{max-width:100%;max-height:100vh;display:block}
      </style></head><body>
      <img src="${url}" onload="setTimeout(()=>{window.print();},300)"/>
      </body></html>`);
    win.document.close();
  };

  const handleSVG = () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgStr],{type:"image/svg+xml"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${settings.title||"fretboard"}.svg`;
    a.click();
  };

  return (
    <div style={{
      background: T.surface, borderRadius:"16px",
      border:`1px solid ${T.border}`, width:"100%", maxWidth:"1100px",
      maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden",
    }}>
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 20px", borderBottom:`1px solid ${T.border}`, flexWrap:"wrap", gap:"8px",
      }}>
        <span style={{ fontSize:"13px", fontWeight:"700", color:T.textHi }}>Print Preview</span>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          <MiniBtn onClick={()=>setBw(b=>!b)} active={bw} T={T}>B&W mode</MiniBtn>
          <MiniBtn onClick={()=>setOrient(o=>o==="landscape"?"portrait":"landscape")} active={false} T={T}>
            {orient==="landscape"?"⟺ Landscape":"⟳ Portrait"}
          </MiniBtn>
          <MiniBtn onClick={()=>setNotesArea(n=>!n)} active={notesArea} T={T}>Notes area</MiniBtn>
          <button onClick={handleSVG} style={{ padding:"5px 12px", borderRadius:"6px", fontSize:"11px", border:"1.5px solid #06B6D4", background:"#082f49", color:"#22d3ee", cursor:"pointer" }}>Save SVG</button>
          <button onClick={handlePrint} style={{ padding:"5px 12px", borderRadius:"6px", fontSize:"11px", border:"1.5px solid #22C55E", background:"#052e16", color:"#4ade80", cursor:"pointer", fontWeight:"600" }}>🖨 Print</button>
          <button onClick={onClose} style={{ padding:"5px 12px", borderRadius:"6px", fontSize:"11px", border:`1.5px solid ${T.border}`, background:"transparent", color:T.textMid, cursor:"pointer" }}>Close</button>
        </div>
      </div>
      <div style={{ flex:1, overflow:"auto", padding:"24px", background:T.bg, display:"flex", justifyContent:"center" }}>
        <div ref={svgRef} style={{ background:"#fff", boxShadow:"0 8px 40px rgba(0,0,0,0.4)", borderRadius:"3px" }}>
          <PrintPageSVG
            tuning={tuning} fretStart={fretStart} fretEnd={fretEnd} dots={dots}
            bwMode={bw} showFretNums={settings.showFretNums}
            showStringNames={settings.showStringNames}
            title={settings.title} subtitle={settings.subtitle}
            showNotesArea={notesArea} orientation={orient}
            logoText={settings.logoText}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

// ─── Built-in presets ─────────────────────────────────────────────────────────

const BUILT_IN_PRESETS = [
  { name:"A Minor Pentatonic — Full Neck",   guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"A Minor Pentatonic", subtitle:"Full neck overview", layers:[{ type:"Scale", root:"A", name:"Minor Pentatonic", labelMode:"interval", shape:"circle", size:"medium", color:"#E85D3A" }] },
  { name:"A Blues Scale — Full Neck",        guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"A Blues Scale",       subtitle:"", layers:[{ type:"Scale", root:"A", name:"Blues", labelMode:"interval", shape:"circle", size:"medium", color:"#3A8FE8" }] },
  { name:"A Minor Penta — Frets 1–4",   guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:4,  title:"A Minor Pentatonic — Position 1", subtitle:"1st position box", layers:[{ type:"Scale", root:"A", name:"Minor Pentatonic", labelMode:"interval", shape:"circle", size:"medium", color:"#E85D3A" }] },
  { name:"A Minor Penta — Box 2 (5–9)",      guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:5, fretEnd:9,  title:"A Minor Pentatonic — Position 2", subtitle:"5th position box", layers:[{ type:"Scale", root:"A", name:"Minor Pentatonic", labelMode:"interval", shape:"circle", size:"medium", color:"#E85D3A" }] },
  { name:"A Minor Penta — Box 3 (7–11)",     guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:7, fretEnd:11, title:"A Minor Pentatonic — Position 3", subtitle:"7th position box", layers:[{ type:"Scale", root:"A", name:"Minor Pentatonic", labelMode:"interval", shape:"circle", size:"medium", color:"#E85D3A" }] },
  { name:"A Natural Minor — Full Neck",      guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"A Natural Minor",    subtitle:"Aeolian mode", layers:[{ type:"Scale", root:"A", name:"Natural Minor", labelMode:"note", shape:"circle", size:"medium", color:"#9B59B6" }] },
  { name:"A Major Scale — Full Neck",        guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"A Major Scale",      subtitle:"", layers:[{ type:"Scale", root:"A", name:"Major", labelMode:"note", shape:"circle", size:"medium", color:"#2ECC71" }] },
  { name:"A Dorian — Full Neck",             guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"A Dorian",           subtitle:"Mode II — minor with natural 6th", layers:[{ type:"Scale", root:"A", name:"Dorian", labelMode:"interval", shape:"circle", size:"medium", color:"#1ABC9C" }] },
  { name:"A Mixolydian — Full Neck",         guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"A Mixolydian",       subtitle:"Mode V — major with b7", layers:[{ type:"Scale", root:"A", name:"Mixolydian", labelMode:"interval", shape:"circle", size:"medium", color:"#F0A500" }] },
  { name:"Am7 Arpeggio — Full Neck",         guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"Am7 Arpeggio",       subtitle:"R · b3 · 5 · b7", layers:[{ type:"Arpeggio", root:"A", name:"Min7", labelMode:"interval", shape:"diamond", size:"medium", color:"#6366F1" }] },
  { name:"A7 Arpeggio — Full Neck",          guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"A7 Arpeggio",        subtitle:"R · 3 · 5 · b7", layers:[{ type:"Arpeggio", root:"A", name:"Dom7", labelMode:"interval", shape:"diamond", size:"medium", color:"#EF4444" }] },
  { name:"Penta + Blues Note overlay",       guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"Pentatonic + Blue Note", subtitle:"Pentatonic shell with added b5", layers:[{ type:"Scale", root:"A", name:"Minor Pentatonic", labelMode:"interval", shape:"circle", size:"medium", color:"#E85D3A" },{ type:"Scale", root:"A", name:"Blues", labelMode:"interval", shape:"circle", size:"small", color:"#2ECC71" }] },
  { name:"Am Chord — Full Neck",             guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"Am Chord Tones",     subtitle:"R · b3 · 5 — all positions", layers:[{ type:"Chord", root:"A", name:"Minor (triad)", labelMode:"interval", shape:"square", size:"medium", color:"#6366F1" }] },
  { name:"A Dom7 Chord — Full Neck",         guitarType:"6-string", tuningPreset:"Standard (EADGBe)", fretStart:1, fretEnd:12, title:"A7 Chord Tones",     subtitle:"R · 3 · 5 · b7 — all positions", layers:[{ type:"Chord", root:"A", name:"Dominant 7", labelMode:"interval", shape:"square", size:"medium", color:"#EF4444" }] },
];

let layerIdCounter = 1;
const newLayer = (overrides={}) => ({
  id: `layer-${layerIdCounter++}`,
  type: "Scale",
  root: "A",
  name: "Minor Pentatonic",
  intervals: SCALES["Minor Pentatonic"],
  labelMode: "interval",
  shape: "circle",
  size: "medium",
  color: LAYER_COLORS[0],
  visible: true,
  customDots: [],
  ...overrides,
});

// Attach intervals to a layer spec (presets store minimal data)
function hydrateLayer(spec) {
  const intervals = spec.type === "Custom" ? [] :
    (TYPE_DATA[spec.type]?.[spec.name] || []);
  return { ...newLayer(), ...spec, intervals, id:`layer-${layerIdCounter++}` };
}

const CTRL_TABS = ["Guitar & Tuning","Fret Range","Layers","Presets","Multi-Board","Text & Print"];

export default function FretboardPrinter() {
  const [layers,          setLayers]          = useState([newLayer()]);
  const [tuningPreset,    setTuningPreset]     = useState("Standard (EADGBe)");
  const [guitarType,      setGuitarType]       = useState("6-string");
  const [customTuning,    setCustomTuning]     = useState([...DEFAULT_TUNING]);
  const [useCustomTuning, setUseCustomTuning]  = useState(false);
  const [fretStart,       setFretStart]        = useState(1);
  const [fretEnd,         setFretEnd]          = useState(12);
  const [showFretNums,    setShowFretNums]      = useState(true);
  const [showStringNames, setShowStringNames]   = useState(true);
  const [title,           setTitle]            = useState("");
  const [subtitle,        setSubtitle]         = useState("");
  const [logoText,        setLogoText]         = useState("unlocktheguitar.net");
  const [showPrint,       setShowPrint]        = useState(false);
  const [activeTab,       setActiveTab]        = useState(0);
  const [isDark,          setIsDark]           = useState(false);
  // Presets
  const [savedPresets,    setSavedPresets]     = useState([]);
  const [savePresetName,  setSavePresetName]   = useState("");
  // Multi-board
  const [multiBoards,     setMultiBoards]      = useState([]);
  const [showMultiPrint,  setShowMultiPrint]   = useState(false);
  // Blank sheet
  const [showBlankSheet,  setShowBlankSheet]   = useState(false);

  const T = isDark ? THEMES.dark : THEMES.light;

  const tuning = useCustomTuning
    ? customTuning
    : (TUNING_PRESETS[guitarType][tuningPreset] || DEFAULT_TUNING);

  const settings = { showFretNums, showStringNames, title, subtitle, logoText };

  const dots = layers.flatMap(layer => {
    if (layer.type==="Custom") return buildCustomDots(layer, fretStart, fretEnd, tuning);
    return buildFretboardDots([layer], tuning, fretStart, fretEnd);
  });

  const addLayer = () => {
    const idx = layers.length % LAYER_COLORS.length;
    setLayers(prev => [...prev, newLayer({ color:LAYER_COLORS[idx] })]);
  };
  const updateLayer = (id, updated) => setLayers(prev => prev.map(l => l.id===id ? updated : l));
  const removeLayer = (id) => setLayers(prev => prev.filter(l => l.id!==id));

  const handleGuitarType = (type) => {
    setGuitarType(type);
    const first = Object.keys(TUNING_PRESETS[type])[0];
    setTuningPreset(first);
    setUseCustomTuning(false);
  };

  // Load a preset (built-in or saved)
  const loadPreset = (p) => {
    setGuitarType(p.guitarType || "6-string");
    setTuningPreset(p.tuningPreset || "Standard (EADGBe)");
    setUseCustomTuning(false);
    setFretStart(p.fretStart ?? 0);
    setFretEnd(p.fretEnd ?? 12);
    setTitle(p.title || "");
    setSubtitle(p.subtitle || "");
    setLayers((p.layers || []).map(hydrateLayer));
  };

  // Save current state as a named preset
  const savePreset = () => {
    if (!savePresetName.trim()) return;
    const p = {
      name: savePresetName.trim(),
      guitarType, tuningPreset, fretStart, fretEnd, title, subtitle,
      layers: layers.map(l => ({ type:l.type, root:l.root, name:l.name, labelMode:l.labelMode, shape:l.shape, size:l.size, color:l.color })),
    };
    setSavedPresets(prev => [...prev, p]);
    setSavePresetName("");
  };

  // Add current diagram to multi-board
  const addToMultiBoard = () => {
    setMultiBoards(prev => [...prev, {
      id: `mb-${Date.now()}`,
      title, subtitle, fretStart, fretEnd,
      layers: layers.map(l=>({...l})),
      tuning: [...tuning],
      showFretNums, showStringNames,
      dots: [...dots],
    }]);
  };
  const removeMBSlot = (id) => setMultiBoards(prev => prev.filter(b=>b.id!==id));
  const clearMultiBoard = () => setMultiBoards([]);

  return (
    <div style={{
      minHeight:"100vh", background:T.bg, color:T.text,
      fontFamily:"'DM Sans',sans-serif",
      display:"flex", flexDirection:"column",
      transition:"background 0.2s, color 0.2s",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Playfair+Display:ital,wght@1,400;1,600&display=swap');
        * { box-sizing:border-box; }
        button,select,input { font-family:inherit; }
        ::-webkit-scrollbar { width:5px; height:5px; background:${T.scrollBg}; }
        ::-webkit-scrollbar-thumb { background:${T.scrollTh}; border-radius:3px; }
        select option { background:${T.selOptBg}; color:${T.textHi}; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .topbar-badge { display:none !important; }
          .topbar-title { font-size:17px !important; }
          .topbar-print span:last-child { display:none !important; }
          .topbar-print { padding:7px 10px !important; }
          .tab-label { font-size:10px !important; padding:8px 10px !important; }
          .diagram-area { padding:12px 10px 10px !important; }
          .controls-area { padding:14px 14px !important; }
          .layer-grid { grid-template-columns:1fr !important; }
        }
        @media (max-width: 400px) {
          .tab-label { font-size:9px !important; padding:7px 7px !important; }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        background:T.surface, borderBottom:`1px solid ${T.border}`,
        padding:"0 16px", display:"flex", alignItems:"center",
        gap:"10px", minHeight:"52px", flexShrink:0, flexWrap:"wrap",
      }}>
        <span className="topbar-title" style={{
          fontFamily:"'Playfair Display',serif", fontStyle:"italic",
          fontSize:"20px", color:T.accent, letterSpacing:"-0.3px", whiteSpace:"nowrap",
        }}>Fretboard Printer</span>
        <span className="topbar-badge" style={{
          fontFamily:"'JetBrains Mono',monospace", fontSize:"9px",
          color:"#F59E0B", background:T.badge,
          padding:"2px 6px", borderRadius:"4px", letterSpacing:"1px",
        }}>UNLOCK THE GUITAR</span>
        <div style={{ flex:1 }}/>
        {/* Dark/light toggle */}
        <button onClick={()=>setIsDark(d=>!d)} style={{
          padding:"6px 12px", borderRadius:"20px",
          border:`1.5px solid ${T.border}`, background:T.surface2, color:T.textMid,
          fontSize:"12px", display:"flex", alignItems:"center", gap:"5px",
          cursor:"pointer", whiteSpace:"nowrap",
        }}>
          <span style={{ fontSize:"14px" }}>{isDark?"☀️":"🌙"}</span>
          <span style={{ fontSize:"10px", fontFamily:"'JetBrains Mono',monospace" }}>{isDark?"Light":"Dark"}</span>
        </button>
        <button className="topbar-print" onClick={()=>setShowPrint(true)} style={{
          padding:"7px 18px", borderRadius:"8px", fontSize:"13px", fontWeight:"700",
          border:"1.5px solid #22C55E", background:"#052e16",
          color:"#4ade80", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", whiteSpace:"nowrap",
        }}>🖨 <span>Print / Export</span></button>
      </div>

      {/* ── Diagram area ── */}
      <div className="diagram-area" style={{
        background:T.fbBg,
        borderBottom:`1px solid ${T.border}`,
        padding:"24px 24px 16px",
        display:"flex", flexDirection:"column", alignItems:"center",
      }}>
        {/* Title + subtitle */}
        <div style={{ width:"100%", maxWidth:"960px", marginBottom:"12px" }}>
          {title && (
            <div style={{
              fontFamily:"'Playfair Display',serif", fontStyle:"italic",
              fontSize:"clamp(18px,2.5vw,28px)", color:T.accent,
              letterSpacing:"-0.3px", marginBottom:"3px",
            }}>{title}</div>
          )}
          {subtitle && (
            <div style={{
              fontFamily:"'JetBrains Mono',monospace", fontSize:"11px",
              color:T.textLo, letterSpacing:"0.5px",
            }}>{subtitle}</div>
          )}
        </div>

        {/* SVG fretboard */}
        <div style={{
          width:"100%", maxWidth:"960px",
          background: isDark ? "#1a1f2e" : "#f8f9fc",
          borderRadius:"10px", padding:"16px 12px 10px",
          border:`1px solid ${T.fbBorder}`,
          overflowX:"auto",
        }}>
          <FretboardSVG
            tuning={tuning} fretStart={fretStart} fretEnd={fretEnd}
            dots={dots} bwMode={false} isDark={isDark}
            showFretNums={showFretNums} showStringNames={showStringNames}
          />
        </div>

        {/* Legend + info strip */}
        <div style={{
          width:"100%", maxWidth:"960px",
          display:"flex", alignItems:"center", gap:"20px",
          marginTop:"10px", flexWrap:"wrap",
        }}>
          {layers.filter(l=>l.visible&&l.type!=="Custom").map(l=>(
            <div key={l.id} style={{ display:"flex", alignItems:"center", gap:"5px" }}>
              <div style={{ width:"9px",height:"9px",borderRadius:"50%",background:l.color,boxShadow:`0 0 5px ${l.color}88` }}/>
              <span style={{ fontSize:"11px", color:T.textLo, fontFamily:"'JetBrains Mono',monospace" }}>
                {l.root} {l.name}
              </span>
            </div>
          ))}
          <span style={{ marginLeft:"auto", fontSize:"10px", color:T.textMute, fontFamily:"'JetBrains Mono',monospace" }}>
            {dots.length} dot{dots.length!==1?"s":""} · frets {fretStart}–{fretEnd} · {tuning.length} strings
          </span>
        </div>
      </div>

      {/* ── Control panel (tabbed) ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Tab bar */}
        <div style={{
          background:T.surface, borderBottom:`1px solid ${T.border}`,
          display:"flex", gap:0, padding:"0 8px", flexShrink:0,
          overflowX:"auto",
        }}>
          {CTRL_TABS.map((tab, i) => (
            <button key={tab} className="tab-label" onClick={()=>setActiveTab(i)} style={{
              padding:"10px 14px", background:"none", border:"none",
              borderBottom: activeTab===i ? "2px solid #F59E0B" : "2px solid transparent",
              color: activeTab===i ? "#F59E0B" : T.textLo,
              fontSize:"12px", fontWeight: activeTab===i?"700":"500",
              cursor:"pointer", transition:"all 0.1s", whiteSpace:"nowrap", flexShrink:0,
            }}>{tab}</button>
          ))}
        </div>

        {/* Tab content */}
        <div className="controls-area" style={{ flex:1, overflowY:"auto", padding:"20px 24px", background:T.bg }}>

          {/* ── Tab 0: Guitar & Tuning ── */}
          {activeTab===0 && (
            <div style={{ maxWidth:"800px", display:"flex", flexWrap:"wrap", gap:"32px", animation:"fadeIn 0.2s ease" }}>
              <div style={{ minWidth:"220px" }}>
                <SL T={T}>GUITAR TYPE</SL>
                <div style={{ display:"flex", gap:"6px", marginBottom:"16px" }}>
                  {["6-string","7-string","8-string"].map(t=>(
                    <TPill key={t} active={guitarType===t} color="#22C55E" T={T} onClick={()=>handleGuitarType(t)}>{t}</TPill>
                  ))}
                </div>
                <SL T={T}>TUNING PRESET</SL>
                <select value={useCustomTuning?"__custom__":tuningPreset}
                  onChange={e=>{ if(e.target.value==="__custom__"){setUseCustomTuning(true);}else{setTuningPreset(e.target.value);setUseCustomTuning(false);} }}
                  style={{ background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:"7px", color:T.textHi, padding:"6px 8px", fontSize:"12px", width:"100%", marginBottom:"10px", cursor:"pointer" }}>
                  {Object.keys(TUNING_PRESETS[guitarType]).map(p=>(
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value="__custom__">Custom…</option>
                </select>
                {useCustomTuning && (
                  <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"10px" }}>
                    {customTuning.slice(0,tuning.length).map((note,i)=>(
                      <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"2px" }}>
                        <span style={{ fontSize:"8px",color:T.textLo,fontFamily:"'JetBrains Mono',monospace" }}>{i+1}</span>
                        <select value={note} onChange={e=>{const n=[...customTuning];n[i]=e.target.value;setCustomTuning(n);}}
                          style={{ background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:"5px",color:T.textHi,padding:"4px 3px",fontSize:"11px",width:"46px",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer" }}>
                          {NOTES.map(n=><option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize:"11px", color:T.textLo, fontFamily:"'JetBrains Mono',monospace" }}>{tuning.join(" · ")}</div>
              </div>
              <div style={{ minWidth:"220px" }}>
                <SL T={T}>DISPLAY OPTIONS</SL>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  <TPill active={showFretNums} color="#06B6D4" T={T} onClick={()=>setShowFretNums(f=>!f)}>Fret numbers</TPill>
                  <TPill active={showStringNames} color="#06B6D4" T={T} onClick={()=>setShowStringNames(f=>!f)}>String names</TPill>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 1: Fret Range ── */}
          {activeTab===1 && (
            <div style={{ maxWidth:"600px", animation:"fadeIn 0.2s ease" }}>
              <SL T={T}>QUICK SELECT</SL>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"20px" }}>
                {[[1,12,"Full neck (1–12)"],[1,4,"Frets 1–4"],[1,5,"Frets 1–5"],[3,7,"Frets 3–7"],[4,8,"Frets 4–8"],[5,9,"Frets 5–9"],[7,12,"Frets 7–12"],[2,6,"Frets 2–6"]].map(([s,e,lbl])=>(
                  <button key={lbl} onClick={()=>{setFretStart(s);setFretEnd(e);}} style={{
                    padding:"7px 14px", borderRadius:"8px", fontSize:"12px",
                    border: fretStart===s&&fretEnd===e ? "1.5px solid #F59E0B" : `1.5px solid ${T.border}`,
                    background: fretStart===s&&fretEnd===e ? "#451a03" : T.surface2,
                    color: fretStart===s&&fretEnd===e ? "#F59E0B" : T.textMid,
                    cursor:"pointer", fontWeight:fretStart===s&&fretEnd===e?"700":"400",
                  }}>{lbl}</button>
                ))}
              </div>
              <SL T={T}>CUSTOM RANGE</SL>
              <div style={{ display:"flex", gap:"16px", alignItems:"flex-end" }}>
                <div style={{ display:"flex",flexDirection:"column",gap:"5px" }}>
                  <span style={{ fontSize:"10px",color:T.textLo,fontFamily:"'JetBrains Mono',monospace" }}>FROM FRET</span>
                  <select value={fretStart} onChange={e=>setFretStart(Number(e.target.value))}
                    style={{ background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:"7px",color:T.textHi,padding:"7px 10px",fontSize:"13px",cursor:"pointer",width:"120px" }}>
                    {Array.from({length:12},(_,i)=>i+1).filter(f=>f<fretEnd).map(f=>(
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize:"16px",color:T.textLo,paddingBottom:"8px" }}>→</div>
                <div style={{ display:"flex",flexDirection:"column",gap:"5px" }}>
                  <span style={{ fontSize:"10px",color:T.textLo,fontFamily:"'JetBrains Mono',monospace" }}>TO FRET</span>
                  <select value={fretEnd} onChange={e=>setFretEnd(Number(e.target.value))}
                    style={{ background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:"7px",color:T.textHi,padding:"7px 10px",fontSize:"13px",cursor:"pointer",width:"120px" }}>
                    {Array.from({length:13},(_,i)=>i+1).filter(f=>f>fretStart).map(f=>(
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div style={{ paddingBottom:"6px",fontSize:"12px",color:T.textLo,fontFamily:"'JetBrains Mono',monospace" }}>
                  {fretEnd-fretStart} fret{fretEnd-fretStart!==1?"s":""}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 2: Layers ── */}
          {activeTab===2 && (
            <div style={{ maxWidth:"720px", animation:"fadeIn 0.2s ease" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px" }}>
                <span style={{ fontSize:"13px",fontWeight:"600",color:T.textHi }}>{layers.length} layer{layers.length!==1?"s":""}</span>
                <button onClick={addLayer} style={{ padding:"7px 16px",borderRadius:"8px",fontSize:"12px",fontWeight:"700",border:"1.5px solid #22C55E",background:"#052e16",color:"#4ade80",cursor:"pointer" }}>+ Add layer</button>
              </div>
              <div className="layer-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"8px" }}>
                {layers.map(layer=>(
                  <LayerEditor key={layer.id} layer={layer} T={T}
                    onChange={updated=>updateLayer(layer.id,updated)}
                    onRemove={()=>removeLayer(layer.id)}
                    isOnly={layers.length===1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Tab 3: Presets ── */}
          {activeTab===3 && (
            <div style={{ maxWidth:"800px", animation:"fadeIn 0.2s ease" }}>

              {/* Save current as preset */}
              <SL T={T}>SAVE CURRENT DIAGRAM AS PRESET</SL>
              <div style={{ display:"flex", gap:"8px", marginBottom:"24px", alignItems:"center" }}>
                <input value={savePresetName} onChange={e=>setSavePresetName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&savePreset()}
                  placeholder="Preset name e.g. 'A Dorian — 5th position'"
                  style={{ flex:1,background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:"7px",color:T.textHi,padding:"8px 12px",fontSize:"12px",outline:"none" }}/>
                <button onClick={savePreset} disabled={!savePresetName.trim()} style={{
                  padding:"8px 18px",borderRadius:"7px",fontSize:"12px",fontWeight:"700",
                  border:"1.5px solid #22C55E",background:savePresetName.trim()?"#052e16":"transparent",
                  color:savePresetName.trim()?"#4ade80":T.textLo,cursor:savePresetName.trim()?"pointer":"not-allowed",
                }}>Save</button>
              </div>

              {/* Saved presets */}
              {savedPresets.length > 0 && (
                <>
                  <SL T={T}>MY PRESETS ({savedPresets.length})</SL>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"6px", marginBottom:"24px" }}>
                    {savedPresets.map((p,i) => (
                      <div key={i} style={{
                        background:T.surface2, borderRadius:"9px",
                        border:`1px solid ${T.border}`, padding:"11px 14px",
                        display:"flex", alignItems:"center", gap:"8px",
                      }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"12px",fontWeight:"600",color:T.textHi,marginBottom:"2px" }}>{p.name}</div>
                          <div style={{ fontSize:"10px",color:T.textLo,fontFamily:"'JetBrains Mono',monospace" }}>
                            {p.layers.map(l=>`${l.root} ${l.name}`).join(" + ")} · frets {p.fretStart}–{p.fretEnd}
                          </div>
                        </div>
                        <button onClick={()=>loadPreset(p)} style={{ padding:"5px 10px",borderRadius:"6px",fontSize:"11px",border:`1.5px solid ${T.border}`,background:T.surface,color:T.textMid,cursor:"pointer" }}>Load</button>
                        <button onClick={()=>setSavedPresets(prev=>prev.filter((_,j)=>j!==i))} style={{ padding:"5px 8px",borderRadius:"6px",fontSize:"11px",border:"none",background:"transparent",color:"#ef4444",cursor:"pointer" }}>✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Built-in library */}
              <SL T={T}>BUILT-IN LIBRARY ({BUILT_IN_PRESETS.length})</SL>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:"6px" }}>
                {BUILT_IN_PRESETS.map((p,i) => (
                  <div key={i} style={{
                    background:T.surface2, borderRadius:"9px",
                    border:`1px solid ${T.border}`, padding:"11px 14px",
                    display:"flex", alignItems:"center", gap:"8px",
                  }}>
                    <div style={{ display:"flex", gap:"4px", flexShrink:0 }}>
                      {p.layers.map((l,li)=>(
                        <div key={li} style={{ width:"8px",height:"8px",borderRadius:"50%",background:l.color }}/>
                      ))}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"12px",fontWeight:"600",color:T.textHi,marginBottom:"2px" }}>{p.name}</div>
                      <div style={{ fontSize:"10px",color:T.textLo,fontFamily:"'JetBrains Mono',monospace" }}>
                        frets {p.fretStart}–{p.fretEnd} · {p.guitarType}
                      </div>
                    </div>
                    <button onClick={()=>loadPreset(p)} style={{ padding:"5px 10px",borderRadius:"6px",fontSize:"11px",border:`1.5px solid ${T.border}`,background:T.surface,color:T.textMid,cursor:"pointer",whiteSpace:"nowrap" }}>Load</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab 4: Multi-Board ── */}
          {activeTab===4 && (
            <div style={{ maxWidth:"860px", animation:"fadeIn 0.2s ease" }}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px",marginBottom:"16px",flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:"14px",fontWeight:"600",color:T.textHi,marginBottom:"4px" }}>Print multiple diagrams on one page</div>
                  <div style={{ fontSize:"12px",color:T.textLo,lineHeight:"1.6" }}>
                    Build each diagram using the Layers / Fret Range tabs, then add it to your sheet. Up to 6 diagrams per page. Great for printing all 5 pentatonic positions on a single A4.
                  </div>
                </div>
                <div style={{ display:"flex",gap:"8px",flexShrink:0 }}>
                  <button onClick={addToMultiBoard} style={{
                    padding:"8px 16px",borderRadius:"8px",fontSize:"12px",fontWeight:"700",
                    border:"1.5px solid #F59E0B",background:"#451a03",color:"#F59E0B",cursor:"pointer",whiteSpace:"nowrap",
                  }}>+ Add current diagram</button>
                  {multiBoards.length > 0 && <>
                    <button onClick={()=>setShowMultiPrint(true)} style={{
                      padding:"8px 16px",borderRadius:"8px",fontSize:"12px",fontWeight:"700",
                      border:"1.5px solid #22C55E",background:"#052e16",color:"#4ade80",cursor:"pointer",whiteSpace:"nowrap",
                    }}>🖨 Print sheet ({multiBoards.length})</button>
                    <button onClick={clearMultiBoard} style={{ padding:"8px 12px",borderRadius:"8px",fontSize:"11px",border:`1px solid ${T.border}`,background:"transparent",color:"#ef4444",cursor:"pointer" }}>Clear</button>
                  </>}
                </div>
              </div>

              {multiBoards.length === 0 ? (
                <div style={{ padding:"40px 24px",textAlign:"center",color:T.textLo,fontSize:"13px",fontStyle:"italic",border:`1px dashed ${T.border}`,borderRadius:"10px" }}>
                  No diagrams added yet. Set up a diagram using the other tabs, then click "+ Add current diagram".
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"10px" }}>
                  {multiBoards.map((b,i)=>(
                    <div key={b.id} style={{ background:T.surface2,borderRadius:"10px",border:`1px solid ${T.border}`,overflow:"hidden" }}>
                      {/* Mini fretboard preview */}
                      <div style={{ background:isDark?"#1a1f2e":"#f8f9fc",padding:"8px 6px 4px",overflowX:"auto" }}>
                        <FretboardSVG tuning={b.tuning} fretStart={b.fretStart} fretEnd={b.fretEnd}
                          dots={b.dots} bwMode={false} isDark={isDark}
                          showFretNums={b.showFretNums} showStringNames={false}/>
                      </div>
                      <div style={{ padding:"10px 12px",display:"flex",alignItems:"center",gap:"8px" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"12px",fontWeight:"600",color:T.textHi,marginBottom:"1px" }}>
                            {b.title || `Diagram ${i+1}`}
                          </div>
                          <div style={{ fontSize:"10px",color:T.textLo,fontFamily:"'JetBrains Mono',monospace" }}>
                            frets {b.fretStart}–{b.fretEnd} · {b.dots.length} dots
                          </div>
                        </div>
                        <button onClick={()=>removeMBSlot(b.id)} style={{ padding:"4px 8px",borderRadius:"5px",fontSize:"11px",border:"none",background:"transparent",color:"#ef4444",cursor:"pointer" }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 5: Text & Print ── */}
          {activeTab===5 && (
            <div style={{ maxWidth:"600px", animation:"fadeIn 0.2s ease" }}>
              <SL T={T}>DIAGRAM TEXT</SL>
              <div style={{ display:"flex",flexDirection:"column",gap:"10px",marginBottom:"20px" }}>
                <div>
                  <div style={{ fontSize:"11px",color:T.textLo,marginBottom:"4px" }}>Title</div>
                  <input value={title} onChange={e=>setTitle(e.target.value)}
                    placeholder="e.g. A Minor Pentatonic — Position 1"
                    style={{ background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:"7px",color:T.textHi,padding:"8px 12px",fontSize:"13px",width:"100%",outline:"none" }}/>
                </div>
                <div>
                  <div style={{ fontSize:"11px",color:T.textLo,marginBottom:"4px" }}>Subtitle</div>
                  <input value={subtitle} onChange={e=>setSubtitle(e.target.value)}
                    placeholder="e.g. Use over bars 1–8 of a 12-bar blues in A"
                    style={{ background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:"7px",color:T.textHi,padding:"8px 12px",fontSize:"12px",width:"100%",outline:"none" }}/>
                </div>
                <div>
                  <div style={{ fontSize:"11px",color:T.textLo,marginBottom:"4px" }}>Footer / branding</div>
                  <input value={logoText} onChange={e=>setLogoText(e.target.value)}
                    placeholder="unlocktheguitar.net"
                    style={{ background:T.inputBg,border:`1px solid ${T.border}`,borderRadius:"7px",color:T.textHi,padding:"8px 12px",fontSize:"12px",width:"100%",outline:"none",fontFamily:"'JetBrains Mono',monospace" }}/>
                </div>
              </div>
              <div style={{ height:"1px",background:T.border,marginBottom:"20px" }}/>
              <SL T={T}>EXPORT SINGLE DIAGRAM</SL>
              <button onClick={()=>setShowPrint(true)} style={{
                padding:"12px 28px",borderRadius:"10px",fontSize:"14px",fontWeight:"700",
                border:"1.5px solid #22C55E",background:"#052e16",color:"#4ade80",
                cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px",
              }}>🖨 Open Print / Export Preview</button>
              <p style={{ fontSize:"12px",color:T.textLo,lineHeight:"1.6" }}>
                B&W mode, portrait/landscape, practice notes area — then print or save as SVG.
              </p>
              <div style={{ height:"1px",background:T.border,marginBottom:"20px",marginTop:"10px" }}/>
              <SL T={T}>BLANK FRETBOARD SHEET</SL>
              <button onClick={()=>setShowBlankSheet(true)} style={{
                padding:"12px 28px",borderRadius:"10px",fontSize:"14px",fontWeight:"700",
                border:"1.5px solid #06B6D4",background:"#082f49",color:"#22d3ee",
                cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px",
              }}>📄 Print Blank Fretboard Sheet</button>
              <p style={{ fontSize:"12px",color:T.textLo,lineHeight:"1.6" }}>
                Prints 5 blank fretboard diagrams per page — ready to fill in by hand. Includes fret markers and unlocktheguitar.net branding.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Single print modal ── */}
      {showPrint && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
          <PrintModalInner settings={settings} tuning={tuning} fretStart={fretStart} fretEnd={fretEnd} dots={dots} onClose={()=>setShowPrint(false)} T={T}/>
        </div>
      )}

      {/* ── Multi-board print modal ── */}
      {showMultiPrint && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
          <MultiBoardModal boards={multiBoards} logoText={logoText} onClose={()=>setShowMultiPrint(false)} T={T}/>
        </div>
      )}

      {/* ── Blank sheet modal ── */}
      {showBlankSheet && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}>
          <BlankSheetModal tuning={tuning} logoText={logoText} onClose={()=>setShowBlankSheet(false)} T={T}/>
        </div>
      )}
    </div>
  );
}

// ─── Multi-board print modal ──────────────────────────────────────────────────

function MultiBoardModal({ boards, logoText, onClose, T }) {
  const [bw, setBw] = useState(false);
  const [cols, setCols] = useState(2);
  const [notesArea, setNotesArea] = useState(false);
  const svgRef = useRef(null);

  const rows = Math.ceil(boards.length / cols);
  const pageW = 1050; const pageH = 740;
  const pad = 36;
  const cellW = (pageW - pad*2) / cols;
  const cellH = (pageH - pad*2 - 32) / rows;

  const handlePrint = () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    const win = window.open("","_blank","width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <style>@page{size:A4 landscape;margin:0}body{margin:0;background:#fff}img{max-width:100%;display:block}</style>
      </head><body><img src="${url}" onload="setTimeout(()=>{window.print();},300)"/></body></html>`);
    win.document.close();
  };

  const handleSVG = () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgStr],{type:"image/svg+xml"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="multi-board.svg"; a.click();
  };

  return (
    <div style={{ background:T.surface,borderRadius:"16px",border:`1px solid ${T.border}`,width:"100%",maxWidth:"1100px",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${T.border}`,flexWrap:"wrap",gap:"8px" }}>
        <span style={{ fontSize:"13px",fontWeight:"700",color:T.textHi }}>Multi-Board — {boards.length} diagram{boards.length!==1?"s":""}</span>
        <div style={{ display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center" }}>
          <span style={{ fontSize:"11px",color:T.textLo,fontFamily:"'JetBrains Mono',monospace" }}>Columns:</span>
          {[1,2,3].map(c=>(
            <MiniBtn key={c} onClick={()=>setCols(c)} active={cols===c} T={T}>{c}</MiniBtn>
          ))}
          <MiniBtn onClick={()=>setBw(b=>!b)} active={bw} T={T}>B&W</MiniBtn>
          <MiniBtn onClick={()=>setNotesArea(n=>!n)} active={notesArea} T={T}>Notes lines</MiniBtn>
          <button onClick={handleSVG} style={{ padding:"5px 12px",borderRadius:"6px",fontSize:"11px",border:"1.5px solid #06B6D4",background:"#082f49",color:"#22d3ee",cursor:"pointer" }}>Save SVG</button>
          <button onClick={handlePrint} style={{ padding:"5px 12px",borderRadius:"6px",fontSize:"11px",border:"1.5px solid #22C55E",background:"#052e16",color:"#4ade80",cursor:"pointer",fontWeight:"600" }}>🖨 Print</button>
          <button onClick={onClose} style={{ padding:"5px 12px",borderRadius:"6px",fontSize:"11px",border:`1.5px solid ${T.border}`,background:"transparent",color:T.textMid,cursor:"pointer" }}>Close</button>
        </div>
      </div>
      <div style={{ flex:1,overflow:"auto",padding:"24px",background:T.bg,display:"flex",justifyContent:"center" }}>
        <div ref={svgRef} style={{ background:"#fff",boxShadow:"0 8px 40px rgba(0,0,0,0.4)",borderRadius:"3px",flexShrink:0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width={pageW} height={pageH} viewBox={`0 0 ${pageW} ${pageH}`}>
            <defs>
              {[0,1,2,3,4].map(i=>(
                <pattern key={i} id={`mbw${i}`} patternUnits="userSpaceOnUse" width="4" height="4">
                  {i===0&&<rect width="4" height="4" fill="#000"/>}
                  {i===1&&<><rect width="4" height="4" fill="#fff" stroke="#000" strokeWidth="1.5"/></>}
                  {i===2&&<><rect width="4" height="4" fill="#fff"/><line x1="0" y1="0" x2="4" y2="4" stroke="#000" strokeWidth="1"/><line x1="0" y1="4" x2="4" y2="0" stroke="#000" strokeWidth="1"/></>}
                  {i===3&&<><rect width="4" height="4" fill="#fff"/><line x1="0" y1="2" x2="4" y2="2" stroke="#000" strokeWidth="1"/></>}
                  {i===4&&<rect width="4" height="4" fill="#888"/>}
                </pattern>
              ))}
            </defs>
            <rect width={pageW} height={pageH} fill="#fff"/>
            {boards.map((b,i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const cx = pad + col * cellW;
              const cy = pad + row * cellH;
              const ip = 14;
              const titleH = b.title ? 22 : 0;
              const notesH = notesArea ? 40 : 0;
              const fbAvailH = cellH - ip*2 - titleH - notesH - 8;
              const fbAvailW = cellW - ip*2;
              const fretCount = b.fretEnd - b.fretStart + 1;
              const strings = b.tuning.length;
              const fretW = Math.max(20, Math.min(46, Math.floor(fbAvailW / fretCount)));
              const strH  = Math.max(14, Math.min(26, Math.floor(fbAvailH / Math.max(strings,1))));
              const fbX = cx + ip + Math.max(0,(fbAvailW - (MARGIN_L + fretCount*fretW + MARGIN_R))/2);
              const fbY = cy + ip + titleH;
              const fbBtm = fbY + MARGIN_T + (strings-1)*strH;
              const layerIds = [...new Set(b.dots.map(d=>d.layerId))];
              const bwPats = ["url(#mbw0)","url(#mbw1)","url(#mbw2)","url(#mbw3)","url(#mbw4)"];

              return (
                <g key={b.id}>
                  <rect x={cx+2} y={cy+2} width={cellW-4} height={cellH-4} fill="none" stroke="#e8edf4" strokeWidth={0.6} rx={3}/>
                  {b.title&&<text x={cx+ip} y={cy+ip+14} fontSize={12} fontFamily="Georgia,serif" fontStyle="italic" fill="#222">{b.title}</text>}
                  {b.fretStart===1&&<rect x={fbX+MARGIN_L-2} y={fbY+MARGIN_T} width={3} height={(strings-1)*strH} fill="#555"/>}
                  {Array.from({length:fretCount+1},(_,fi)=>(
                    <line key={fi} x1={fbX+MARGIN_L+fi*fretW} y1={fbY+MARGIN_T} x2={fbX+MARGIN_L+fi*fretW} y2={fbBtm} stroke="#ccc" strokeWidth={0.7}/>
                  ))}
                  {Array.from({length:strings},(_,si)=>(
                    <line key={si} x1={fbX+MARGIN_L} y1={fbY+MARGIN_T+si*strH} x2={fbX+MARGIN_L+fretCount*fretW} y2={fbY+MARGIN_T+si*strH} stroke="#bbb" strokeWidth={0.6+si*0.1}/>
                  ))}
                  {Array.from({length:fretCount},(_,fi)=>{
                    const fret=b.fretStart+fi;
                    const mcx=fbX+MARGIN_L+fi*fretW+fretW/2;
                    const mcy=fbY+MARGIN_T+((strings-1)/2)*strH;
                    if([3,5,7,9].includes(fret))return<circle key={fret} cx={mcx} cy={mcy} r={3} fill="#ddd"/>;
                    if(fret===12)return<g key={fret}><circle cx={mcx} cy={mcy-strH} r={2.5} fill="#ddd"/><circle cx={mcx} cy={mcy+strH} r={2.5} fill="#ddd"/></g>;
                    return null;
                  })}
                  {b.showFretNums&&Array.from({length:fretCount},(_,fi)=>{
                    const fret=b.fretStart+fi;
                    return<text key={fret} x={fbX+MARGIN_L+fi*fretW+fretW/2} y={fbY+MARGIN_T-5} textAnchor="middle" fontSize={7} fontFamily="'JetBrains Mono',monospace" fill="#aaa">{fret}</text>;
                  })}
                  {b.tuning.slice().reverse().map((note,di)=>(
                    <text key={di} x={fbX+MARGIN_L-5} y={fbY+MARGIN_T+di*strH+3} textAnchor="end" fontSize={7} fontFamily="'JetBrains Mono',monospace" fill="#aaa">{note}</text>
                  ))}
                  {b.dots.filter(d=>d.fret>=b.fretStart&&d.fret<=b.fretEnd).map(d=>{
                    const dx=fbX+MARGIN_L+(d.fret-b.fretStart)*fretW+fretW/2;
                    const dy=fbY+MARGIN_T+(strings-1-d.string)*strH;
                    const r=Math.min(DOT_SIZES[d.size]||11, strH*0.42, fretW*0.42);
                    const li=layerIds.indexOf(d.layerId);
                    const fill=bw?bwPats[li%bwPats.length]:d.color;
                    const fs=Math.max(5,Math.min(r-2,8));
                    return(
                      <g key={`${d.layerId}-${d.string}-${d.fret}`}>
                        {d.shape==="circle"&&<circle cx={dx} cy={dy} r={r} fill={fill} stroke={d.isRoot?(bw?"#000":"#fff"):"none"} strokeWidth={d.isRoot?1.5:0}/>}
                        {d.shape==="square"&&<rect x={dx-r} y={dy-r} width={r*2} height={r*2} fill={fill} rx={1} stroke={d.isRoot?"#fff":"none"} strokeWidth={d.isRoot?1.5:0}/>}
                        {d.shape==="diamond"&&<polygon points={`${dx},${dy-r} ${dx+r},${dy} ${dx},${dy+r} ${dx-r},${dy}`} fill={fill} stroke={d.isRoot?"#fff":"none"} strokeWidth={d.isRoot?1.5:0}/>}
                        {d.label&&<text x={dx} y={dy+fs/3} textAnchor="middle" fontSize={fs} fontFamily="'JetBrains Mono',monospace" fontWeight="700" fill={bw&&li===1?"#000":"#fff"}>{d.label}</text>}
                      </g>
                    );
                  })}
                  {notesArea&&Array.from({length:4},(_,li)=>{
                    const ly=fbBtm+MARGIN_B+4+li*((notesH-8)/4);
                    return<line key={li} x1={cx+ip} y1={ly} x2={cx+cellW-ip} y2={ly} stroke="#eee" strokeWidth={0.7}/>;
                  })}
                </g>
              );
            })}
            {logoText&&<text x={pageW-pad} y={pageH-10} textAnchor="end" fontSize={8} fontFamily="'JetBrains Mono',monospace" fill="#ccc" letterSpacing="1">{logoText}</text>}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Blank Sheet Modal ────────────────────────────────────────────────────────

function BlankSheetModal({ tuning, logoText, onClose, T }) {
  const svgRef = useRef(null);
  const [numDiagrams, setNumDiagrams] = useState(5);
  const [showStringNames, setShowStringNames] = useState(true);
  const [showFretNums, setShowFretNums] = useState(true);
  const [fretCount, setFretCount] = useState(12);
  const [sheetTitle, setSheetTitle] = useState("Blank Fretboard Diagrams");

  // Page dimensions (A4 portrait)
  const pageW = 595;
  const pageH = 842;
  const pad = 30;
  const titleH = 36;
  const footerH = 20;
  const availH = pageH - pad*2 - titleH - footerH;
  const diagGap = 12;
  const diagH = Math.floor((availH - diagGap * (numDiagrams - 1)) / numDiagrams);

  // Fretboard dimensions within each diagram
  const marginL = showStringNames ? 22 : 10;
  const marginT = showFretNums ? 18 : 8;
  const marginR = 10;
  const marginB = 8;
  const fbW = pageW - pad*2 - marginL - marginR;
  const fretW = Math.floor(fbW / fretCount);
  const strings = tuning.length;
  const strH = Math.floor((diagH - marginT - marginB) / (strings - 1));

  const handlePrint = () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    const win = window.open("","_blank","width=700,height=900");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <style>@page{size:A4 portrait;margin:0}body{margin:0;background:#fff}img{width:100%;display:block}</style>
      </head><body><img src="${url}" onload="setTimeout(()=>{window.print();},300)"/></body></html>`);
    win.document.close();
  };

  const handleSVG = () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgStr],{type:"image/svg+xml"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "blank-fretboard-diagrams.svg";
    a.click();
  };

  // Render a single blank fretboard at position (x, y)
  const renderBlankFretboard = (x, y, idx) => {
    const fbX = x + marginL;
    const fbY = y + marginT;
    const fbBtm = fbY + (strings - 1) * strH;
    const fbRight = fbX + fretCount * fretW;

    return (
      <g key={idx}>
        {/* Nut */}
        <rect x={fbX - 2} y={fbY} width={4} height={(strings-1)*strH} fill="#555"/>

        {/* Fret lines */}
        {Array.from({length: fretCount + 1}, (_, fi) => (
          <line key={fi}
            x1={fbX + fi*fretW} y1={fbY}
            x2={fbX + fi*fretW} y2={fbBtm}
            stroke="#bbb" strokeWidth={0.7}/>
        ))}

        {/* String lines */}
        {Array.from({length: strings}, (_, si) => (
          <line key={si}
            x1={fbX} y1={fbY + si*strH}
            x2={fbRight} y2={fbY + si*strH}
            stroke="#999" strokeWidth={0.6 + si * 0.12}/>
        ))}

        {/* Fret position markers (3,5,7,9,12) */}
        {Array.from({length: fretCount}, (_, fi) => {
          const fret = fi + 1;
          const cx = fbX + fi*fretW + fretW/2;
          const midY = fbY + ((strings-1)/2) * strH;
          if ([3,5,7,9].includes(fret)) {
            return <circle key={fret} cx={cx} cy={midY} r={3} fill="#ddd"/>;
          }
          if (fret === 12) {
            return (
              <g key={fret}>
                <circle cx={cx} cy={midY - strH} r={2.5} fill="#ddd"/>
                <circle cx={cx} cy={midY + strH} r={2.5} fill="#ddd"/>
              </g>
            );
          }
          return null;
        })}

        {/* Fret numbers */}
        {showFretNums && Array.from({length: fretCount}, (_, fi) => (
          <text key={fi}
            x={fbX + fi*fretW + fretW/2} y={fbY - 5}
            textAnchor="middle" fontSize={7}
            fontFamily="'JetBrains Mono',monospace" fill="#aaa">
            {fi + 1}
          </text>
        ))}

        {/* String names */}
        {showStringNames && tuning.slice().reverse().map((note, si) => (
          <text key={si}
            x={fbX - 5} y={fbY + si*strH + 3}
            textAnchor="end" fontSize={7}
            fontFamily="'JetBrains Mono',monospace" fill="#aaa">
            {note}
          </text>
        ))}
      </g>
    );
  };

  return (
    <div style={{ background:T.surface, borderRadius:"16px", border:`1px solid ${T.border}`, width:"100%", maxWidth:"700px", maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:`1px solid ${T.border}`, flexWrap:"wrap", gap:"8px" }}>
        <span style={{ fontSize:"13px", fontWeight:"700", color:T.textHi }}>Blank Fretboard Sheet</span>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center" }}>
          <input
            value={sheetTitle}
            onChange={e => setSheetTitle(e.target.value)}
            placeholder="Sheet title"
            style={{ background:T.inputBg, border:`1px solid ${T.border}`, borderRadius:"6px", color:T.textHi, padding:"4px 8px", fontSize:"11px", width:"180px", outline:"none", fontFamily:"Georgia,serif", fontStyle:"italic" }}
          />
          <span style={{ fontSize:"11px", color:T.textLo, fontFamily:"'JetBrains Mono',monospace" }}>Diagrams:</span>
          {[3,4,5,6].map(n => (
            <MiniBtn key={n} onClick={() => setNumDiagrams(n)} active={numDiagrams===n} T={T}>{n}</MiniBtn>
          ))}
          <span style={{ fontSize:"11px", color:T.textLo, fontFamily:"'JetBrains Mono',monospace", marginLeft:"4px" }}>Frets:</span>
          {[12,15,17].map(n => (
            <MiniBtn key={n} onClick={() => setFretCount(n)} active={fretCount===n} T={T}>{n}</MiniBtn>
          ))}
          <MiniBtn onClick={() => setShowStringNames(s => !s)} active={showStringNames} T={T}>String names</MiniBtn>
          <MiniBtn onClick={() => setShowFretNums(s => !s)} active={showFretNums} T={T}>Fret nos.</MiniBtn>
          <button onClick={handleSVG} style={{ padding:"5px 12px", borderRadius:"6px", fontSize:"11px", border:"1.5px solid #06B6D4", background:"#082f49", color:"#22d3ee", cursor:"pointer" }}>Save SVG</button>
          <button onClick={handlePrint} style={{ padding:"5px 12px", borderRadius:"6px", fontSize:"11px", border:"1.5px solid #22C55E", background:"#052e16", color:"#4ade80", cursor:"pointer", fontWeight:"600" }}>🖨 Print</button>
          <button onClick={onClose} style={{ padding:"5px 12px", borderRadius:"6px", fontSize:"11px", border:`1.5px solid ${T.border}`, background:"transparent", color:T.textMid, cursor:"pointer" }}>Close</button>
        </div>
      </div>

      {/* Preview */}
      <div style={{ flex:1, overflow:"auto", padding:"24px", background:T.bg, display:"flex", justifyContent:"center" }}>
        <div ref={svgRef} style={{ background:"#fff", boxShadow:"0 8px 40px rgba(0,0,0,0.4)", borderRadius:"3px", flexShrink:0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width={pageW} height={pageH} viewBox={`0 0 ${pageW} ${pageH}`}>
            <rect width={pageW} height={pageH} fill="#fff"/>

            {/* Title */}
            <text x={pageW/2} y={pad + 22} textAnchor="middle" fontSize={14}
              fontFamily="Georgia,serif" fontStyle="italic" fill="#333">
              {sheetTitle || "Blank Fretboard Diagrams"}
            </text>

            {/* Diagrams */}
            {Array.from({length: numDiagrams}, (_, i) => {
              const y = pad + titleH + i * (diagH + diagGap);
              return renderBlankFretboard(pad, y, i);
            })}

            {/* Footer */}
            <text x={pageW/2} y={pageH - 10} textAnchor="middle" fontSize={8}
              fontFamily="'JetBrains Mono',monospace" fill="#bbb" letterSpacing="1">
              {logoText || "unlocktheguitar.net"}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
