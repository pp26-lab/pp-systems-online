'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';

// Take a photo with the device camera: webcam on a computer, back camera on a
// phone or tablet. Live preview → shoot → keep or retake. If the browser blocks
// the camera, the person can still pick a photo from the device instead.

const COPY = {
  lo: {
    title: 'ຖ່າຍຮູບສິນຄ້າ', shoot: 'ຖ່າຍ', use: 'ໃຊ້ຮູບນີ້', retake: 'ຖ່າຍໃໝ່', switch: 'ສະຫຼັບກ້ອງ', close: 'ປິດ',
    starting: 'ກຳລັງເປີດກ້ອງ…', pick: 'ເລືອກຮູບຈາກເຄື່ອງແທນ',
    denied: 'ເບຣົາເຊີບໍ່ອະນຸຍາດໃຫ້ໃຊ້ກ້ອງ ກົດຮູບກ້ອງ ຫຼື ຮູບກະແຈຢູ່ແຖບທີ່ຢູ່ເວັບ ແລ້ວເລືອກ "ອະນຸຍາດ"',
    none: 'ບໍ່ພົບກ້ອງໃນເຄື່ອງນີ້', busy: 'ກ້ອງກຳລັງຖືກໃຊ້ຢູ່ໃນແອັບອື່ນ ປິດແອັບນັ້ນກ່ອນ', failed: 'ເປີດກ້ອງບໍ່ໄດ້',
  },
  th: {
    title: 'ถ่ายรูปสินค้า', shoot: 'ถ่าย', use: 'ใช้รูปนี้', retake: 'ถ่ายใหม่', switch: 'สลับกล้อง', close: 'ปิด',
    starting: 'กำลังเปิดกล้อง…', pick: 'เลือกรูปจากเครื่องแทน',
    denied: 'เบราว์เซอร์ไม่อนุญาตให้ใช้กล้อง กดรูปกล้องหรือรูปแม่กุญแจที่แถบที่อยู่เว็บ แล้วเลือก "อนุญาต"',
    none: 'ไม่พบกล้องในเครื่องนี้', busy: 'กล้องกำลังถูกใช้ในแอปอื่น ปิดแอปนั้นก่อน', failed: 'เปิดกล้องไม่ได้',
  },
  en: {
    title: 'Take a product photo', shoot: 'Shoot', use: 'Use this photo', retake: 'Retake', switch: 'Switch camera', close: 'Close',
    starting: 'Starting camera…', pick: 'Choose a photo from this device instead',
    denied: 'The browser blocked the camera. Tap the camera or lock icon in the address bar and choose "Allow".',
    none: 'No camera found on this device', busy: 'The camera is in use by another app. Close it first.', failed: "Couldn't start the camera",
  },
};

// Resolve once the camera has delivered a real frame (play() can resolve before that).
function firstFrame(v, timeout = 6000) {
  return new Promise(resolve => {
    const t0 = Date.now();
    (function check() {
      if (v.videoWidth > 0 && v.readyState >= 2) return resolve(true);
      if (Date.now() - t0 > timeout) return resolve(false);
      setTimeout(check, 80);
    })();
  });
}

export default function CameraCapture({ open, onClose, onCapture, lang = 'lo' }) {
  const c = COPY[lang] || COPY.en;
  const video = useRef(null);
  const stream = useRef(null);
  const fileRef = useRef(null);
  const [facing, setFacing] = useState('environment');
  const [cameras, setCameras] = useState(0);
  const [state, setState] = useState('starting'); // starting | live | shot | error
  const [error, setError] = useState('');
  const [shot, setShot] = useState(null); // { blob, url }

  function stop() {
    stream.current?.getTracks().forEach(t => t.stop());
    stream.current = null;
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function start() {
      setState('starting');
      setError('');
      stop();
      if (!navigator.mediaDevices?.getUserMedia) { setState('error'); setError(c.failed); return; }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false,
        });
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
          await firstFrame(video.current);
        }
        if (cancelled) return;
        setState('live');
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        setCameras(devices.filter(d => d.kind === 'videoinput').length);
      } catch (e) {
        if (cancelled) return;
        setState('error');
        setError(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? c.denied
          : e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError' ? c.none
          : e?.name === 'NotReadableError' ? c.busy : c.failed);
      }
    }
    if (!shot) start();
    return () => { cancelled = true; };
  }, [open, facing, shot]);

  // Always release the camera when the window closes.
  useEffect(() => {
    if (open) return;
    stop();
    setShot(s => { if (s) URL.revokeObjectURL(s.url); return null; });
    // Next time it opens, the shutter stays disabled until a fresh frame arrives.
    setState('starting');
    setError('');
  }, [open]);
  useEffect(() => () => stop(), []);

  // Escape closes only this window, not the product form underneath.
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  async function shoot() {
    const v = video.current;
    if (!v) return;
    if (!v.videoWidth && !(await firstFrame(v, 3000))) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d').drawImage(v, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      stop();
      setShot({ blob, url: URL.createObjectURL(blob) });
      setState('shot');
    }, 'image/jpeg', 0.92);
  }

  function retake() {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
  }

  function use() {
    const file = new File([shot.blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
    onClose();
  }

  function picked(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onCapture(file);
    onClose();
  }

  if (!open) return null;
  const mirrored = facing === 'user';

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center sm:p-6 no-print" role="dialog" aria-modal="true" aria-label={c.title}>
      <div className="relative w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-2xl overflow-hidden bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 text-white pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-3">
          <p className="font-bold">{c.title}</p>
          <button onClick={onClose} aria-label={c.close} className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center hover:bg-white/10">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 sm:flex-none sm:aspect-[4/3] bg-black flex items-center justify-center">
          {state !== 'shot' && (
            <video ref={video} playsInline muted autoPlay
              className={`w-full h-full object-contain ${mirrored ? '-scale-x-100' : ''} ${state === 'live' ? '' : 'opacity-0'}`} />
          )}
          {state === 'shot' && shot && <img src={shot.url} alt="" className="w-full h-full object-contain" />}
          {state === 'starting' && <p className="absolute text-slate-300 text-sm">{c.starting}</p>}
          {state === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 gap-4">
              <Icon name="camera" className="w-10 h-10 text-slate-500" />
              <p className="text-slate-200 text-sm max-w-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 bg-black">
          {state === 'shot' ? (
            <div className="flex gap-3">
              <button onClick={retake} className="flex-1 min-h-12 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10">{c.retake}</button>
              <button onClick={use} className="flex-1 min-h-12 rounded-xl bg-gold text-ink font-bold hover:bg-gold-dark hover:text-white">{c.use}</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 items-center">
              <button onClick={() => fileRef.current?.click()} aria-label={c.pick} title={c.pick}
                className="justify-self-start w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10">
                <Icon name="image" className="w-6 h-6" />
              </button>
              <button onClick={shoot} disabled={state !== 'live'} aria-label={c.shoot}
                className="justify-self-center w-[4.5rem] h-[4.5rem] rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform">
                <span className="w-14 h-14 rounded-full bg-white" />
              </button>
              {cameras > 1 ? (
                <button onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))} aria-label={c.switch} title={c.switch}
                  className="justify-self-end w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10">
                  <Icon name="refresh" className="w-6 h-6" />
                </button>
              ) : <span />}
            </div>
          )}
          {state === 'error' && (
            <button onClick={() => fileRef.current?.click()} className="mt-3 w-full min-h-12 rounded-xl bg-white text-ink font-semibold">{c.pick}</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={picked} className="hidden" />
        </div>
      </div>
    </div>
  );
}
