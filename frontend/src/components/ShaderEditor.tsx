import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, Decoration } from '@codemirror/view';
import { RangeSet } from '@codemirror/state';

const diffGutterMark = Decoration.line({ class: 'cm-diff-changed' });

const diffTheme = EditorView.theme({
  '.cm-diff-changed': {
    borderLeft: '2.5px solid rgba(129, 140, 248, 0.6)',
    paddingLeft: '3px',
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
  },
});

function makeDiffExtension(changedLines: Set<number>) {
  return EditorView.decorations.compute(['doc'], (state) => {
    if (changedLines.size === 0) return Decoration.none;
    const ranges: ReturnType<typeof diffGutterMark.range>[] = [];
    for (let i = 1; i <= state.doc.lines; i++) {
      if (changedLines.has(i)) {
        ranges.push(diffGutterMark.range(state.doc.line(i).from));
      }
    }
    return RangeSet.of(ranges, true);
  });
}

interface ShaderEditorProps {
  code: string;
  readOnly?: boolean;
  onChange?: (code: string) => void;
  changedLines?: Set<number>;
}

const EMPTY_SET = new Set<number>();

export default function ShaderEditor({ code, readOnly = true, onChange, changedLines }: ShaderEditorProps) {
  const lines = changedLines ?? EMPTY_SET;

  const extensions = useMemo(
    () => [cpp(), diffTheme, makeDiffExtension(lines)],
    // Recreate when the set reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines]
  );

  return (
    <div className="h-full overflow-auto text-xs">
      <CodeMirror
        value={code}
        extensions={extensions}
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
