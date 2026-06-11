export const createDemoShell = (title: string): HTMLDivElement => {
  const shell = document.createElement("div");

  shell.className = "ae-shell";
  shell.innerHTML = `
    <header class="ae-header">
      <div class="ae-brand">
        <img src="arcade-engine-mark.svg" alt="" />
        <h1>${title}</h1>
      </div>
    </header>
  `;

  return shell;
};

export const createPanel = (title: string): HTMLElement => {
  const panel = document.createElement("section");

  panel.className = "ae-panel";
  panel.innerHTML = `<h2>${title}</h2>`;

  return panel;
};

export const createButton = (
  label: string,
  onClick: (event: MouseEvent) => void
): HTMLButtonElement => {
  const button = document.createElement("button");

  button.className = "ae-button";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);

  return button;
};

export const createValue = (label: string, value: string | number = ""): HTMLDivElement => {
  const item = document.createElement("div");

  item.className = "ae-value";
  item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;

  return item;
};

export const setValue = (item: HTMLElement, value: string | number): void => {
  const target = item.querySelector("strong");

  if (target) {
    target.textContent = String(value);
  }
};

export const createNumberInput = (
  label: string,
  value: number,
  min: number,
  max: number,
  step = 1
): HTMLLabelElement => {
  const wrapper = document.createElement("label");

  wrapper.className = "ae-field";
  wrapper.innerHTML = `<span>${label}</span>`;

  const input = document.createElement("input");

  input.type = "number";
  input.value = String(value);
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  wrapper.appendChild(input);

  return wrapper;
};

export const getNumberInputValue = (field: HTMLElement): number => {
  const input = field.querySelector("input");

  return Number(input?.value ?? 0);
};

export const createDemoSprite = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 64;
  canvas.height = 32;

  if (!context) {
    return canvas;
  }

  const colors = ["#4fd1c5", "#f6e05e", "#fc8181", "#90cdf4"];

  colors.forEach((color, index) => {
    const x = index * 16;

    context.fillStyle = "rgba(245, 247, 251, 0.9)";
    context.fillRect(x + 7, 1, 2, 2);
    context.fillRect(x + 6, 3, 4, 2);
    context.fillStyle = color;
    context.fillRect(x + 5, 5, 6, 7);
    context.fillRect(x + 3, 12, 10, 3);
    context.fillStyle = "#90cdf4";
    context.fillRect(x + 7, 6, 2, 3);
    context.fillStyle = "#f6e05e";
    context.fillRect(x + 2, 16, 3, 4);
    context.fillRect(x + 11, 16, 3, 4);
    context.fillStyle = index % 2 === 0 ? "#fc8181" : "#4fd1c5";
    context.fillRect(x + 6, 15, 4, 5);
  });

  return canvas;
};

export const drawTopDownShip = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: {
    accent?: string;
    heading?: number;
    label?: string;
    scale?: number;
    thrust?: number;
  } = {}
): void => {
  const accent = options.accent ?? "#4fd1c5";
  const heading = options.heading ?? 0;
  const scale = options.scale ?? 1;
  const thrust = options.thrust ?? 0;

  context.save();
  context.translate(x, y);
  context.rotate(heading * (Math.PI / 180));
  context.scale(scale, scale);

  if (thrust > 0) {
    context.fillStyle = `rgba(246, 224, 94, ${Math.min(0.85, 0.2 + thrust * 0.45)})`;
    context.beginPath();
    context.moveTo(-8, 18);
    context.lineTo(0, 30 + thrust * 18);
    context.lineTo(8, 18);
    context.closePath();
    context.fill();
  }

  context.fillStyle = "#f5f7fb";
  context.beginPath();
  context.moveTo(0, -26);
  context.lineTo(15, 16);
  context.lineTo(5, 11);
  context.lineTo(0, 24);
  context.lineTo(-5, 11);
  context.lineTo(-15, 16);
  context.closePath();
  context.fill();

  context.fillStyle = accent;
  context.beginPath();
  context.moveTo(0, -17);
  context.lineTo(7, 7);
  context.lineTo(0, 13);
  context.lineTo(-7, 7);
  context.closePath();
  context.fill();

  context.fillStyle = "#05070a";
  context.beginPath();
  context.arc(0, -7, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();

  if (options.label) {
    context.fillStyle = "#cbd5e1";
    context.font = "13px monospace";
    context.textAlign = "center";
    context.fillText(options.label, x, y + 42 * scale);
    context.textAlign = "start";
  }
};

export const drawTargetMarker = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: {
    color?: string;
    label?: string;
    radius?: number;
  } = {}
): void => {
  const color = options.color ?? "#f6e05e";
  const radius = options.radius ?? 18;

  context.save();
  context.translate(x, y);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.moveTo(-radius - 8, 0);
  context.lineTo(-radius / 2, 0);
  context.moveTo(radius / 2, 0);
  context.lineTo(radius + 8, 0);
  context.moveTo(0, -radius - 8);
  context.lineTo(0, -radius / 2);
  context.moveTo(0, radius / 2);
  context.lineTo(0, radius + 8);
  context.stroke();
  context.restore();

  if (options.label) {
    context.fillStyle = color;
    context.font = "13px monospace";
    context.textAlign = "center";
    context.fillText(options.label, x, y + radius + 22);
    context.textAlign = "start";
  }
};

export const createToneUrl = (
  options: {
    durationSeconds?: number;
    frequency?: number;
    gain?: number;
    modulationFrequency?: number;
    release?: number;
    waveform?: "sine" | "soft-square" | "triangle";
  } = {}
): string => {
  const sampleRate = 22050;
  const durationSeconds = options.durationSeconds ?? 0.35;
  const frequency = options.frequency ?? 440;
  const gain = options.gain ?? 0.28;
  const modulationFrequency = options.modulationFrequency ?? 0;
  const release = options.release ?? 0.18;
  const waveform = options.waveform ?? "sine";
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (value: string): void => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset++, value.charCodeAt(i));
    }
  };
  const writeUint32 = (value: number): void => {
    view.setUint32(offset, value, true);
    offset += 4;
  };
  const writeUint16 = (value: number): void => {
    view.setUint16(offset, value, true);
    offset += 2;
  };

  writeString("RIFF");
  writeUint32(36 + dataSize);
  writeString("WAVE");
  writeString("fmt ");
  writeUint32(16);
  writeUint16(1);
  writeUint16(1);
  writeUint32(sampleRate);
  writeUint32(sampleRate * 2);
  writeUint16(2);
  writeUint16(16);
  writeString("data");
  writeUint32(dataSize);

  for (let i = 0; i < sampleCount; i++) {
    const seconds = i / sampleRate;
    const progress = i / sampleCount;
    const attack = Math.min(1, seconds / 0.045);
    const decay = Math.min(1, (durationSeconds - seconds) / release);
    const envelope = Math.sin(Math.min(1, progress) * Math.PI) * attack * decay;
    const modulatedFrequency =
      modulationFrequency > 0
        ? frequency + Math.sin(seconds * Math.PI * 2 * modulationFrequency) * frequency * 0.045
        : frequency;
    const phase = seconds * Math.PI * 2 * modulatedFrequency;
    const wave =
      waveform === "soft-square"
        ? Math.tanh(Math.sin(phase) * 2.2)
        : waveform === "triangle"
          ? (2 / Math.PI) * Math.asin(Math.sin(phase))
          : Math.sin(phase);
    const overtone = Math.sin(phase * 2) * 0.12 + Math.sin(phase * 3) * 0.05;
    const sample = (wave + overtone) * envelope * gain;

    view.setInt16(offset, sample * 32767, true);
    offset += 2;
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
};

export const appendStyles = (root: HTMLElement): void => {
  const styles = document.createElement("style");

  styles.textContent = `
    .ae-shell {
      min-height: 100%;
      padding: 24px;
      background:
        linear-gradient(135deg, rgba(79, 209, 197, 0.13), transparent 28%),
        linear-gradient(215deg, rgba(246, 224, 94, 0.1), transparent 34%),
        #111318;
    }

    .ae-header {
      max-width: 1180px;
      margin: 0 auto 18px;
    }

    .ae-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .ae-brand img {
      width: 44px;
      height: 44px;
      flex: 0 0 auto;
    }

    .ae-header h1 {
      margin: 0;
      color: #f5f7fb;
      font-size: 32px;
      letter-spacing: 0;
    }

    .ae-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      max-width: 1180px;
      margin: 0 auto;
    }

    .ae-panel {
      min-width: 0;
      padding: 16px;
      border: 1px solid rgba(245, 247, 251, 0.14);
      border-radius: 8px;
      background: rgba(19, 24, 31, 0.92);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
    }

    .ae-panel h2 {
      margin: 0 0 12px;
      font-size: 15px;
      color: #cbd5e1;
      letter-spacing: 0;
    }

    .ae-stage {
      width: 100%;
      overflow: hidden;
      border: 1px solid rgba(245, 247, 251, 0.16);
      background: #05070a;
    }

    .ae-stage canvas {
      display: block;
      width: 100%;
      height: auto;
      image-rendering: pixelated;
    }

    .ae-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .ae-button {
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid rgba(245, 247, 251, 0.18);
      border-radius: 6px;
      background: #243241;
      color: #f5f7fb;
      cursor: pointer;
    }

    .ae-button:hover {
      background: #314255;
    }

    .ae-values {
      display: grid;
      gap: 8px;
    }

    .ae-value,
    .ae-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 34px;
      color: #cbd5e1;
    }

    .ae-value strong {
      color: #f6e05e;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .ae-field input {
      width: 96px;
      padding: 6px 8px;
      border: 1px solid rgba(245, 247, 251, 0.18);
      border-radius: 6px;
      background: #0f1720;
      color: #f5f7fb;
    }

    .ae-log {
      min-height: 120px;
      max-height: 220px;
      overflow: auto;
      margin: 12px 0 0;
      padding: 12px;
      border-radius: 6px;
      background: #080b10;
      color: #90cdf4;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: pre-wrap;
    }

    @media (max-width: 640px) {
      .ae-shell {
        padding: 14px;
      }

      .ae-header h1 {
        font-size: 24px;
      }
    }
  `;
  root.appendChild(styles);
};

export const onRemove = (element: HTMLElement, cleanup: () => void): void => {
  const observer = new MutationObserver(() => {
    if (!document.body.contains(element)) {
      cleanup();
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
};
