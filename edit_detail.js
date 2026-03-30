const fs = require('fs');
let code = fs.readFileSync('src/modules/tasks/components/TaskDetail.tsx', 'utf8');

const coverStr = `
            {/* Cover Image */}
            <PropertyRow label="Cover Image" icon={<span style={{ fontSize: 11 }}>🖼️</span>}>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={task.coverImage || ''}
                onChange={(e) => onUpdate({ coverImage: e.target.value || undefined })}
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid transparent',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-primary)',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              />
            </PropertyRow>`;

code = code.replace('{/* Recurrence */}', coverStr + '\n            {/* Recurrence */}');
fs.writeFileSync('src/modules/tasks/components/TaskDetail.tsx', code);
