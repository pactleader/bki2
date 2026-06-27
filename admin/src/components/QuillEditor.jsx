import { useRef, useMemo, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const FORMATS = ['header','bold','italic','underline','strike','blockquote',
                 'list','bullet','link','indent'];

function ensureAbsolute(url) {
  if (!url) return url;
  if (/^(https?:|mailto:|tel:|\/)/i.test(url)) return url;
  return 'https://' + url;
}

export default function QuillEditor({ value, onChange }) {
  const quillRef = useRef(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState('');

  function toggleSource() {
    if (!sourceMode) {
      // Entering source mode — capture current HTML
      setSourceHtml(value || '');
      setSourceMode(true);
    } else {
      // Leaving source mode — push HTML back to editor
      onChange(sourceHtml);
      setSourceMode(false);
    }
  }

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        [{ indent: '-1' }, { indent: '+1' }],
        ['clean'],
      ],
      handlers: {
        link(value) {
          const quill = quillRef.current?.getEditor();
          if (!quill) return;
          if (value) {
            const url = prompt('Enter link URL:');
            if (url) quill.format('link', ensureAbsolute(url.trim()));
          } else {
            quill.format('link', false);
          }
        },
      },
    },
  }), []);

  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      {/* Source toggle button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 8px', borderBottom: '1px solid var(--border)', background: '#f9f9f9' }}>
        <button
          type="button"
          onClick={toggleSource}
          style={{
            padding: '3px 10px', fontSize: 11, fontFamily: 'monospace',
            background: sourceMode ? 'var(--primary)' : '#fff',
            color: sourceMode ? '#fff' : 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer',
          }}
        >
          {sourceMode ? 'Visual Editor' : '</> Source'}
        </button>
      </div>

      {sourceMode ? (
        <textarea
          value={sourceHtml}
          onChange={e => setSourceHtml(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%', minHeight: 400, padding: 12,
            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6,
            border: 'none', outline: 'none', resize: 'vertical',
            boxSizing: 'border-box', background: '#1e1e1e', color: '#d4d4d4',
          }}
        />
      ) : (
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value || ''}
          onChange={onChange}
          modules={modules}
          formats={FORMATS}
        />
      )}
    </div>
  );
}
