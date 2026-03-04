import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

interface ShaderEditorProps {
  code: string;
  readOnly?: boolean;
  onChange?: (code: string) => void;
}

export default function ShaderEditor({ code, readOnly = true, onChange }: ShaderEditorProps) {
  return (
    <div className="h-full overflow-auto text-xs">
      <CodeMirror
        value={code}
        extensions={[cpp()]}
        theme={oneDark}
        readOnly={readOnly}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: !readOnly,
        }}
        style={{ height: '100%' }}
      />
    </div>
  );
}
