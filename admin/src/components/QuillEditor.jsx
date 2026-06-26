import { useRef, useMemo } from 'react';
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
            const range = quill.getSelection();
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
    <div style={{ background: '#fff', borderRadius: 'var(--radius)' }}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={FORMATS}
      />
    </div>
  );
}
