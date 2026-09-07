import { useEffect, useRef, useState } from 'react';
import 'tui-image-editor/dist/tui-image-editor.css';
import 'tui-color-picker/dist/tui-color-picker.css';
import ImageEditor from 'tui-image-editor';
import { getToken } from '../auth.js';

const editorTheme = {
  'common.bi.image':                  'none',
  'common.bisize.width':              '0',
  'common.bisize.height':             '0',
  'common.backgroundImage':           'none',
  'common.backgroundColor':           '#1e1e1e',
  'common.border':                    '0px',
  'header.backgroundImage':           'none',
  'header.backgroundColor':           '#1e1e1e',
  'header.border':                    '0px',
  'loadButton.display':               'none',
  'downloadButton.display':           'none',
  'menu.normalIcon.color':            '#aaaaaa',
  'menu.activeIcon.color':            '#ffffff',
  'menu.disabledIcon.color':          '#434343',
  'menu.hoverIcon.color':             '#e9e9e9',
  'submenu.backgroundColor':          '#1e1e1e',
  'submenu.partition.color':          '#3c3c3c',
  'submenu.normalIcon.color':         '#8a8a8a',
  'submenu.activeIcon.color':         '#ffffff',
  'submenu.normalLabel.color':        '#8a8a8a',
  'submenu.activeLabel.color':        '#ffffff',
};

export default function ImageEditorModal({ imageUrl, onSave, onClose }) {
  const containerRef = useRef(null);
  const editorRef    = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;
    const editor = new ImageEditor(containerRef.current, {
      includeUI: {
        loadImage: { path: imageUrl, name: 'image' },
        theme: editorTheme,
        menu: ['crop', 'flip', 'rotate', 'draw', 'shape', 'icon', 'text', 'filter'],
        initMenu: 'crop',
        menuBarPosition: 'bottom',
      },
      cssMaxWidth: window.innerWidth * 0.9,
      cssMaxHeight: window.innerHeight * 0.65,
      usageStatistics: false,
    });
    editorRef.current = editor;

    return () => {
      try { editor.destroy(); } catch {}
      editorRef.current = null;
    };
  }, [imageUrl]);

  async function handleSave() {
    if (!editorRef.current) return;
    setUploading(true);
    setError('');
    try {
      // toDataURL returns the current canvas state (all edits applied)
      const dataUrl = editorRef.current.toDataURL({ format: 'png' });
      // Convert to blob and upload as new file
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      const filename = `edited-${Date.now()}.png`;
      fd.append('image', blob, filename);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onSave(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 2000, display: 'flex', flexDirection: 'column', padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 12px' }}>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Edit Image</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {error && <span style={{ color: '#fca5a5', fontSize: 12 }}>{error}</span>}
          <button onClick={onClose} disabled={uploading}
            style={{ padding: '7px 14px', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: uploading ? 'wait' : 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={uploading}
            style={{ padding: '7px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
            {uploading ? 'Saving…' : 'Save as new image'}
          </button>
        </div>
      </div>

      {/* Editor canvas */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, background: '#1e1e1e', borderRadius: 6, overflow: 'hidden' }} />
    </div>
  );
}
