import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Language, t } from '../utils/i18n';
import {
  Snapshot, SnapshotUser, listSnapshots, makeSnapshot, saveSnapshot,
  exportSnapshots, importSnapshots, parseMetaExport,
} from '../utils/snapshots';

export interface ScanCapture {
  ownerId: string;
  capturedAt: number;
  followers: SnapshotUser[];
  following: SnapshotUser[];
}

export interface SnapshotPair { baseline: Snapshot; comparison: Snapshot }

interface Props {
  ownerId: string;
  currentOwner: () => string | null;
  capture: ScanCapture | null;
  pair: SnapshotPair | null;
  lang: Language;
  onClose: () => void;
  onCompare: (pair: SnapshotPair) => void;
}

function localTime(time: number): string {
  const date = new Date(time);
  return new Date(time - date.getTimezoneOffset() * 60000).toISOString().slice(0, 23);
}

export function SnapshotManager({ ownerId, currentOwner, capture, pair, lang, onClose, onCompare }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [baseline, setBaseline] = useState(pair?.baseline.key || '');
  const [comparison, setComparison] = useState(pair?.comparison.key || '');
  const [label, setLabel] = useState('');
  const [captureTime, setCaptureTime] = useState(localTime(capture?.capturedAt ?? Date.now()));
  const [metaTime, setMetaTime] = useState('');
  const [confirmedMeta, setConfirmedMeta] = useState(false);
  const [notice, setNotice] = useState('');
  const [unresolved, setUnresolved] = useState<{ followers: string[]; following: string[] } | null>(null);
  const current = useCallback((fn: () => void) => {
    try {
      if (currentOwner() !== ownerId) {
        throw new Error(t(lang, 'scanAccountChanged'));
      }
      fn();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  }, [currentOwner, ownerId, lang]);

  const reload = useCallback(() => {
    const rows = listSnapshots(ownerId);
    setSnapshots(rows);
    setBaseline(old => old || rows[Math.max(0, rows.length - 2)]?.key || '');
    setComparison(old => old || (rows.length >= 2 ? rows[rows.length - 1].key : ''));
  }, [ownerId]);
  useEffect(() => {
    const trigger = document.activeElement;
    const panel = dialog.current;
    panel?.showModal();
    current(reload);
    const sync = () => current(reload);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('storage', sync);
      panel?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) {
        trigger.focus();
      }
    };
  }, [current, reload]);

  const readFiles = async (files: File[], meta: boolean) => {
    setNotice('');
    setUnresolved(null);
    if (!files.length) {
      return;
    }
    try {
      const inputs = await Promise.all(files.map(async file => ({ name: file.name, text: await file.text() })));
      current(() => {
        if (meta) {
          if (!confirmedMeta || !metaTime) {
            throw new Error(t(lang, 'metaAttest'));
          }
          const parsed = parseMetaExport(ownerId, label.trim() || 'Meta', new Date(metaTime).getTime(),
            inputs.map(file => ({ name: file.name, data: JSON.parse(file.text) })));
          if (!parsed.snapshot) {
            setUnresolved(parsed.unresolved);
            setNotice(t(lang, 'metaUnresolved', parsed.counts.followers, parsed.counts.following));
            return;
          }
          saveSnapshot(parsed.snapshot);
          setNotice(t(lang, 'snapshotSaved'));
        } else {
          const count = importSnapshots(ownerId, inputs[0].text);
          setNotice(t(lang, 'snapshotsImported', count));
        }
        reload();
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
  };
  const select = (title: string, value: string, change: (val: string) => void) => (
    <label>{title}
      <select value={value} onChange={e => change(e.currentTarget.value)}>
        <option value=''>{t(lang, 'chooseSnapshot')}</option>
        {snapshots.map(row => <option key={row.key} value={row.key}>
          {row.label} · {new Date(row.capturedAt).toLocaleString()} · {Object.keys(row.followers).length}/{Object.keys(row.following).length}
        </option>)}
      </select>
    </label>
  );
  const first = snapshots.find(row => row.key === baseline);
  const last = snapshots.find(row => row.key === comparison);
  const ordered = first && last && first.capturedAt < last.capturedAt;
  return (
    <dialog ref={dialog} aria-labelledby='iu-snapshots-title' className='snapshot-manager' onCancel={onClose}>
      <header>
        <h2 id='iu-snapshots-title'>{t(lang, 'snapshots')}</h2>
        <button type='button' onClick={onClose}>{t(lang, 'close')}</button>
      </header>
      <section>
        <h3>{t(lang, 'saveSnapshot')}</h3>
        <label>{t(lang, 'snapshotLabel')}<input value={label} placeholder='T0' onChange={e => setLabel(e.currentTarget.value)} /></label>
        <label>{t(lang, 'captureTime')}<input type='datetime-local' step='0.001' value={captureTime} onChange={e => setCaptureTime(e.currentTarget.value)} /></label>
        <button disabled={!capture || !captureTime} onClick={() => current(() => {
          if (!capture || capture.ownerId !== ownerId) {
            throw new Error(t(lang, 'fullScanRequired'));
          }
          const stamp = new Date(captureTime).getTime();
          const row = makeSnapshot(ownerId, label.trim() || new Date(stamp).toLocaleString(), stamp, capture.followers, capture.following);
          saveSnapshot(row);
          reload();
          if (!baseline) {
            setBaseline(row.key);
          } else {
            setComparison(row.key);
          }
          setNotice(t(lang, 'snapshotSaved'));
        })}>{t(lang, 'saveSnapshot')}</button>
        {!capture && <p>{t(lang, 'fullScanRequired')}</p>}
      </section>
      <section>
        <h3>{t(lang, 'pastUnfollowers')}</h3>
        {select(t(lang, 'baseline'), baseline, setBaseline)}
        {select(t(lang, 'comparison'), comparison, setComparison)}
        <p>{t(lang, 'pairOrder')}</p>
        <button disabled={!ordered} onClick={() => current(() => {
          if (first && last && ordered) {
            onCompare({ baseline: first, comparison: last });
          }
        })}>{t(lang, 'viewDiff')}</button>
      </section>
      <section>
        <h3>{t(lang, 'snapshotBackup')}</h3>
        <button disabled={!snapshots.length} onClick={() => current(() => {
          const url = URL.createObjectURL(new Blob([exportSnapshots(ownerId)], { type: 'application/json' }));
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `iu-snapshots-${ownerId}.json`;
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        })}>{t(lang, 'exportSnapshots')}</button>
        <label>{t(lang, 'importSnapshots')}<input type='file' accept='.json,application/json' onChange={e => {
          const files = Array.from(e.currentTarget.files || []); e.currentTarget.value = ''; void readFiles(files, false);
        }} /></label>
      </section>
      <details><summary>{t(lang, 'importMeta')}</summary>
        <p>{t(lang, 'metaFiles')}</p>
        <label>{t(lang, 'metaTime')}<input type='datetime-local' step='1' value={metaTime} onChange={e => setMetaTime(e.currentTarget.value)} /></label>
        <label className='meta-consent'><input type='checkbox' checked={confirmedMeta} onChange={e => setConfirmedMeta(e.currentTarget.checked)} />{t(lang, 'metaAttest')}</label>
        <label>{t(lang, 'metaChoose')}<input type='file' multiple accept='.json,application/json' disabled={!confirmedMeta || !metaTime} onChange={e => {
          const files = Array.from(e.currentTarget.files || []); e.currentTarget.value = ''; void readFiles(files, true);
        }} /></label>
        {unresolved && <div className='unresolved-handles'>
          {[{ label: t(lang, 'followers'), users: unresolved.followers }, { label: t(lang, 'following'), users: unresolved.following }].map(group =>
            <details key={group.label}><summary>{group.label} ({group.users.length})</summary><pre>{group.users.join('\n')}</pre></details>)}
        </div>}
      </details>
      {notice && <p role='status' className='snapshot-notice'>{notice}</p>}
    </dialog>
  );
}
