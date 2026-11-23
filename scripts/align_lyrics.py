#!/usr/bin/env python3
"""Sincroniza letras con el audio y elige el fragmento (estribillo) de forma automática.

Uso: python3 scripts/align_lyrics.py public/songs/<slug> [--duration 30]
Entradas en la carpeta: source.mp3|wav|m4a, lyrics.pdf|lyrics.txt  (+ song.json con title/artist)
Salidas: lyrics.lrc (líneas con tiempos), lyrics.align.json (palabras + confianza), analysis.json (audioStart, bpm, beats)
Pipeline: separación vocal (UVR-MDX) -> reconocimiento con marcas de tiempo (Parakeet TDT) -> alineación
          lyrics<->transcripción (Needleman-Wunsch difuso) -> interpolación solo para palabras sin coincidencia.
Modelos (descarga única a .cache/models): github.com/k2-fsa/sherpa-onnx releases.
"""
import difflib, glob, json, os, re, subprocess, sys, tarfile
import numpy as np

D = sys.argv[1]
DUR = int(sys.argv[sys.argv.index('--duration') + 1]) if '--duration' in sys.argv else 30
CACHE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.cache', 'models')); REL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download'
SR_VOC = 44100

def sh(*a, **k): return subprocess.run(a, check=True, **k)
def fetch(url, dest):
    if not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True); print('descargando', os.path.basename(dest)); sh('curl', '-sfL', '-o', dest, url)
def first(*pats):
    for p in pats:
        g = sorted(glob.glob(os.path.join(D, p)))
        if g: return g[0]

# ---------- 1) letras ----------
def read_lyrics():
    f = first('lyrics.txt', 'lyrics.pdf')
    if not f: sys.exit('FALTA lyrics.pdf o lyrics.txt')
    txt = open(f, encoding='utf8').read() if f.endswith('.txt') else subprocess.run(['pdftotext', f, '-'], capture_output=True, text=True, check=True).stdout
    cfg = json.load(open(os.path.join(D, 'song.json'))) if os.path.exists(os.path.join(D, 'song.json')) else {}
    out = []
    for l in (x.strip() for x in txt.splitlines()):
        if not l or l.startswith('\x0c'): continue
        if re.match(r'^(escrita por|written by|compositor|letra de)', l, re.I): break
        out.append(l)
    # quita cabecera título/artista del PDF
    while out and (norm(out[0]) in (norm(cfg.get('title', '')), norm(cfg.get('artist', '')))): out.pop(0)
    # une líneas huérfanas de una palabra en minúscula (ajuste de línea del PDF)
    res = []
    for l in out:
        if res and len(l.split()) == 1 and l[0].islower(): res[-1] += ' ' + l
        else: res.append(l)
    return res
def norm(s): return re.sub(r"[^a-z0-9' ]", '', s.lower()).strip()
def words_of(s): return [w for w in re.sub(r"[^a-z0-9' ]", ' ', s.lower()).split() if w.strip("'")]

# ---------- 2) audio ----------
def load_stereo(path, sr):
    raw = sh('ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(sr), '-', capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).T.copy()
def separate_vocals(x):
    import sherpa_onnx as so
    m = f'{CACHE}/UVR-MDX-NET-Voc_FT.onnx'; fetch(f'{REL}/source-separation-models/UVR-MDX-NET-Voc_FT.onnx', m)
    cfg = so.OfflineSourceSeparationConfig(model=so.OfflineSourceSeparationModelConfig(uvr=so.OfflineSourceSeparationUvrModelConfig(model=m), num_threads=4))
    out = so.OfflineSourceSeparation(cfg).process(sample_rate=SR_VOC, samples=x)
    stems = out.stems
    # stem[0] = vocals en UVR Voc_FT
    v = np.asarray(stems[0].data, dtype=np.float32)
    return v, out.sample_rate
def to16k(v, sr):
    mono = v.mean(0) if v.ndim == 2 else v
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-f', 'f32le', '-ar', '16000', '-'], input=mono.astype(np.float32).tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)

def recognize(y):
    import sherpa_onnx as so
    d = f'{CACHE}/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8'
    if not os.path.exists(d + '/tokens.txt'):
        t = f'{CACHE}/parakeet.tar.bz2'; fetch(f'{REL}/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2', t); tarfile.open(t).extractall(CACHE, filter='data'); os.remove(t)
    rec = so.OfflineRecognizer.from_transducer(encoder=d + '/encoder.int8.onnx', decoder=d + '/decoder.int8.onnx', joiner=d + '/joiner.int8.onnx', tokens=d + '/tokens.txt', num_threads=4, model_type='nemo_transducer', decoding_method='greedy_search')
    # trozos de ~25 s cortados en el punto más silencioso
    env = np.sqrt(np.convolve(y ** 2, np.ones(1600) / 1600, 'same'))
    cuts = [0]
    while len(y) - cuts[-1] > 16000 * 32:
        a = cuts[-1] + 16000 * 20; b = cuts[-1] + 16000 * 28
        cuts.append(a + int(np.argmin(env[a:b])))
    cuts.append(len(y)); words = []
    for a, b in zip(cuts, cuts[1:]):
        s = rec.create_stream(); s.accept_waveform(16000, y[a:b]); rec.decode_stream(s); r = s.result
        cur = None
        for tok, ts in zip(r.tokens, r.timestamps):
            t = a / 16000 + ts
            if tok[:1] in ('▁', ' ') or cur is None:  # Parakeet marca inicio de palabra con espacio
                if cur: words.append(cur)
                cur = {'w': tok.lstrip('▁ '), 's': t}
            else: cur['w'] += tok
            cur['e'] = t
        if cur: words.append(cur)
    for i, w in enumerate(words):
        nxt = words[i + 1]['s'] if i + 1 < len(words) else w['e'] + .4
        w['e'] = min(max(w['e'] + .25, w['s'] + .12), nxt)
        w['n'] = norm(w['w'])
    return [w for w in words if w['n']]

# ---------- 3) alineación lyrics <-> reconocimiento ----------
def sim(a, b):
    if a == b: return 1.0
    return difflib.SequenceMatcher(None, a, b).ratio()
def align(L, A):
    n, m = len(L), len(A); GAP = -0.6
    S = np.zeros((n + 1, m + 1)); P = np.zeros((n + 1, m + 1), np.int8)
    S[:, 0] = np.arange(n + 1) * GAP; S[0, :] = 0  # el audio puede tener intro/instrumental
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            r = sim(L[i - 1], A[j - 1]['n']); sc = (2 * r - 0.9) if r >= .6 else -1.0
            c = [S[i - 1, j - 1] + sc, S[i - 1, j] + GAP, S[i, j - 1] - 0.05]
            k = int(np.argmax(c)); S[i, j] = c[k]; P[i, j] = k
    i = n; j = int(np.argmax(S[n])); m_ = {}
    while i > 0 and j > 0:
        k = P[i, j]
        if k == 0:
            if sim(L[i - 1], A[j - 1]['n']) >= .6: m_[i - 1] = j - 1
            i -= 1; j -= 1
        elif k == 1: i -= 1
        else: j -= 1
    return m_

def main():
    lines = read_lyrics(); LW = [words_of(l) for l in lines]
    flat = [(li, w) for li, ws in enumerate(LW) for w in ws]
    src = first('source.*')
    if not src: sys.exit('FALTA source.mp3')
    st = load_stereo(src, SR_VOC); total = st.shape[1] / SR_VOC
    vf = f'{D}/.vocals.npy'
    if os.path.exists(vf): voc = np.load(vf); vsr = SR_VOC
    else:
        print('separando voz…'); voc, vsr = separate_vocals(st); np.save(vf, voc.astype(np.float16))
    y = to16k(voc.astype(np.float32), vsr)
    af = f'{D}/.asr.json'
    if os.path.exists(af): A = json.load(open(af))
    else: print('reconociendo…'); A = recognize(y); json.dump(A, open(af, 'w'))
    mp = align([w for _, w in flat], A)
    # tiempos por palabra: coincidencias; el resto se interpola (marcado)
    T = [None] * len(flat); E = [None] * len(flat)
    for i, j in mp.items(): T[i], E[i] = A[j]['s'], A[j]['e']
    idx = [i for i, t in enumerate(T) if t is not None]
    if not idx: sys.exit('No hubo coincidencias entre letra y audio: no se generan tiempos.')
    for i in range(len(flat)):
        if T[i] is None:
            p = max([k for k in idx if k < i], default=None); q = min([k for k in idx if k > i], default=None)
            if p is not None and q is not None: T[i] = T[p] + (T[q] - T[p]) * (i - p) / (q - p); E[i] = T[i] + .3
            elif p is not None: T[i] = E[p] + .3 * (i - p); E[i] = T[i] + .3
            else: T[i] = T[q] - .3 * (q - i); E[i] = T[i] + .3
    out = []; k = 0
    for li, ws in enumerate(LW):
        n = len(ws); ii = range(k, k + n); k += n
        out.append({'text': lines[li], 'start': round(T[ii[0]], 2), 'end': round(max(E[i] for i in ii), 2), 'matched': sum(i in mp for i in ii), 'words': n})
    for a, b in zip(out, out[1:]): a['end'] = round(min(a['end'], b['start'] - .05), 2) if b['start'] > a['start'] else a['end']
    # verificación: actividad vocal real dentro de cada línea
    env = np.sqrt(np.convolve(y ** 2, np.ones(1600) / 1600, 'same')); thr = np.percentile(env, 60)
    for o in out:
        seg = env[int(o['start'] * 16000):max(int(o['end'] * 16000), int(o['start'] * 16000) + 1)]
        o['voice'] = round(float((seg > thr).mean()), 2) if len(seg) else 0
        o['conf'] = round(o['matched'] / o['words'], 2); o['approx'] = o['conf'] < .5 or o['voice'] < .35
    json.dump({'lines': out, 'asr_words': len(A), 'matched_words': len(mp), 'total_words': len(flat)}, open(f'{D}/lyrics.align.json', 'w'), indent=1)

    # ---------- 4) fragmento: primer estribillo ----------
    cfg = json.load(open(f'{D}/song.json')) if os.path.exists(f'{D}/song.json') else {}
    title = norm(cfg.get('title', ''))
    N = [norm(o['text']) for o in out]
    rep = [N.count(n) > 1 for n in N]
    run = None; i = 0
    while i < len(N):
        if rep[i]:
            j = i
            while j + 1 < len(N) and rep[j + 1]: j += 1
            if j - i + 1 >= 3: run = (i, j); break
            i = j + 1
        else: i += 1
    run = run or (0, min(3, len(N) - 1))
    LEAD = 8.3  # el estribillo/gancho debe caer al inicio de la escena de letras (8–17 s del plantilla)
    k30 = DUR / 30; lw0, lw1 = 8 * k30, 17 * k30
    best = None
    for c in range(run[0], run[1] + 1):
        a0 = out[c]['start'] - LEAD * k30
        if a0 < 0 or a0 + DUR > total: continue
        inw = [o for o in out if lw0 <= o['start'] - a0 <= lw1 - 1]
        sc = len(inw) + 4 * any(title and title in norm(o['text']) for o in inw) + 3 * (out[run[0]]['start'] >= a0 and out[run[1]]['end'] <= a0 + DUR) - 2 * sum(o['approx'] for o in inw)
        e = env[int(a0 * 16000):int((a0 + DUR) * 16000)].mean()
        sc += float(e / env.max())
        if best is None or sc > best[0]: best = (sc, a0, c)
    if not best: sys.exit('No se encontró un fragmento válido.')
    a0 = round(best[1], 2)

    # ---------- 5) pulso: transitorios (sin depender de un BPM) ----------
    mix = st.mean(0)[int(a0 * SR_VOC):int((a0 + DUR) * SR_VOC)]
    from scipy.signal import stft
    f, t, Z = stft(mix, SR_VOC, nperseg=2048, noverlap=2048 - 441)
    M = np.log1p(np.abs(Z)[:150]); flux = np.maximum(np.diff(M, axis=1), 0).sum(0); flux = np.r_[0, flux]; flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    fps = 100.0; ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
    lags = np.arange(int(fps * 60 / 180), int(fps * 60 / 60)); bpms = 60 * fps / lags
    prior = np.exp(-0.5 * (np.log2(bpms / 100) / .9) ** 2); lag = lags[int(np.argmax(ac[lags] * prior))]; period = lag / fps
    # seguimiento de beats (programación dinámica)
    n = len(flux); sc = flux.copy(); back = -np.ones(n, int)
    for i in range(n):
        lo, hi = int(i - 1.6 * lag), int(i - .6 * lag)
        if hi > 0:
            r = np.arange(max(lo, 0), hi); pen = -10 * np.log2((i - r) / lag) ** 2
            cand = sc[r] + pen
            if len(cand): b = int(np.argmax(cand)); sc[i] = flux[i] + cand[b]; back[i] = r[b]
    i = int(np.argmax(sc[-int(lag):]) + n - int(lag)); beats = []
    while i >= 0: beats.append(i / fps); i = back[i]
    beats = sorted(beats)
    an = {'audioStart': a0, 'bpm': round(60 / period, 1), 'beats': [round(b, 3) for b in beats], 'chorusLine': out[run[0]]['text'], 'anchorLine': out[best[2]]['text']}
    json.dump(an, open(f'{D}/analysis.json', 'w'), indent=1)
    # LRC con marcado automático: palabras del título en rosa, última palabra cursiva
    tw = {w for w in title.split() if len(w) > 2}
    def mark(txt):
        ws = txt.split(); res = []
        for k, w in enumerate(ws):
            nw = norm(w)
            if nw in tw: res.append('*' + w + '*')
            elif k == len(ws) - 1 and len(ws) > 2 and not any(norm(x) in tw for x in ws): res.append('_' + w + '_')
            else: res.append(w)
        return ' '.join(res)
    with open(f'{D}/lyrics.lrc', 'w', encoding='utf8') as fo:
        for o in out: fo.write(f"[{int(o['start'] // 60):02d}:{o['start'] % 60:05.2f}] {mark(o['text'])}\n")
    ok = sum(1 for o in out if not o['approx'])
    print(f"Palabras coincidentes con el audio: {len(mp)}/{len(flat)} | líneas fiables: {ok}/{len(out)}")
    print(f"Fragmento: {a0:.1f}s → {a0 + DUR:.1f}s | BPM por transitorios ≈ {an['bpm']} | beats: {len(beats)}")
    for o in out: print(f"  {o['start']:6.2f}-{o['end']:6.2f} conf={o['conf']:.2f} voz={o['voice']:.2f} {'~APROX' if o['approx'] else '     '} {o['text']}")
main()
