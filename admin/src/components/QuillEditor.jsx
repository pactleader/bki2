import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const TOOLBAR = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link'],
  [{ indent: '-1' }, { indent: '+1' }],
  ['clean'],
];

const FORMATS = ['header','bold','italic','underline','strike','blockquote',
                 'list','bullet','link','indent'];

export default function QuillEditor({ value, onChange }) {
  return (
    <div style={{ background: '#fff', borderRadius: 'var(--radius)' }}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={{ toolbar: TOOLBAR }}
        formats={FORMATS}
      />
    </div>
  );
}
