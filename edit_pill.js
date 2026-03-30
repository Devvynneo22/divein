const fs = require('fs');
let code = fs.readFileSync('src/modules/tasks/components/TaskDetail.tsx', 'utf8');

const newPill = `
function TagPill({ label, color, onRemove, onChangeColor }: { label: string; color?: string; onRemove?: () => void; onChangeColor?: (c: string) => void }) {
  const bg = color ?? '#6b7280';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: bg + '33',
        color: bg,
        border: \`1px solid \${bg}55\`,
        position: 'relative'
      }}
    >
      {onChangeColor && (
        <input
          type="color"
          value={bg}
          onChange={(e) => onChangeColor(e.target.value)}
          style={{
            position: 'absolute',
            opacity: 0,
            inset: 0,
            cursor: 'pointer',
            width: '100%',
            height: '100%',
          }}
          title="Change Tag Color"
        />
      )}
      {label}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: bg + '22',
            color: bg,
            cursor: 'pointer',
            border: 'none',
            padding: 0,
            zIndex: 1
          }}
          title="Remove tag"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}`;

code = code.replace(/function TagPill\(\{ label, color, onRemove \}.*?<\/span>\n  \);\n\}/s, newPill);

// Update TagPill usages
code = code.replace(
  /<TagPill\s+key={tag}\s+label={tag}\s+color={getTagColor\(tag, tagColors\)}\s+onRemove={\(\) => handleRemoveTag\(tag\)}\s+\/>/g,
  '<TagPill\n                    key={tag}\n                    label={tag}\n                    color={getTagColor(tag, tagColors)}\n                    onRemove={() => handleRemoveTag(tag)}\n                    onChangeColor={(c) => setTagColor(tag.toLowerCase().trim(), c)}\n                  />'
);

fs.writeFileSync('src/modules/tasks/components/TaskDetail.tsx', code);
