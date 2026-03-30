const fs = require('fs');
let code = fs.readFileSync('src/modules/tasks/components/TaskCard.tsx', 'utf8');

const replacement = `
            {/* Priority explicit pill */}
            {task.priority > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  fontSize: '9px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  backgroundColor: \`color-mix(in srgb, \${priorityBorderColor} 15%, transparent)\`,
                  color: priorityBorderColor,
                  border: \`1px solid color-mix(in srgb, \${priorityBorderColor} 30%, transparent)\`,
                }}
              >
                <PriorityIcon priority={task.priority} />
                {PRIORITY_LABELS[task.priority]}
              </span>
            )}

            {/* Tags - solid vibrant pills */}`;

code = code.replace('{/* Tags - solid vibrant pills */}', replacement);
fs.writeFileSync('src/modules/tasks/components/TaskCard.tsx', code);
