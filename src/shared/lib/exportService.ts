import type { Note } from '@/shared/types/note';

// ─── HTML → Markdown conversion ──────────────────────────────────────────────

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return nodeToMd(doc.body).trim();
}

function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = () => Array.from(el.childNodes).map(nodeToMd).join('');

  switch (tag) {
    case 'h1':
      return `# ${children().trim()}\n\n`;
    case 'h2':
      return `## ${children().trim()}\n\n`;
    case 'h3':
      return `### ${children().trim()}\n\n`;
    case 'h4':
      return `#### ${children().trim()}\n\n`;
    case 'h5':
      return `##### ${children().trim()}\n\n`;
    case 'h6':
      return `###### ${children().trim()}\n\n`;
    case 'p':
      return `${children()}\n\n`;
    case 'br':
      return '\n';
    case 'strong':
    case 'b':
      return `**${children()}**`;
    case 'em':
    case 'i':
      return `*${children()}*`;
    case 'u':
      return children(); // Markdown has no native underline
    case 's':
    case 'del':
    case 'strike':
      return `~~${children()}~~`;
    case 'code':
      // Inline code (not inside pre)
      if (el.parentElement?.tagName.toLowerCase() !== 'pre') {
        return `\`${el.textContent ?? ''}\``;
      }
      return el.textContent ?? '';
    case 'pre': {
      const codeEl = el.querySelector('code');
      const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] ?? '';
      const code = codeEl?.textContent ?? el.textContent ?? '';
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    }
    case 'blockquote':
      return (
        children()
          .trim()
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n') + '\n\n'
      );
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      return `[${children()}](${href})`;
    }
    case 'img': {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      return `![${alt}](${src})\n\n`;
    }
    case 'hr':
      return '---\n\n';
    case 'ul':
    case 'ol':
      return listToMd(el) + '\n';
    case 'li':
      return liToMd(el);
    case 'mark':
      return `==${children()}==`;
    default:
      return children();
  }
}

function listToMd(el: HTMLElement, indent = 0): string {
  const isOrdered = el.tagName.toLowerCase() === 'ol';
  const items = Array.from(el.children);
  const prefix = '  '.repeat(indent);
  let counter = 1;
  let result = '';

  for (const item of items) {
    if (item.tagName.toLowerCase() !== 'li') continue;

    const isTaskItem =
      item.hasAttribute('data-checked') || item.getAttribute('data-type') === 'taskItem';
    const checked = item.getAttribute('data-checked') === 'true';

    // Build content from direct child nodes (non-list)
    const inlineContent = Array.from(item.childNodes)
      .filter(
        (n) =>
          !(
            n.nodeType === Node.ELEMENT_NODE &&
            ['ul', 'ol'].includes((n as HTMLElement).tagName.toLowerCase())
          ),
      )
      .map(nodeToMd)
      .join('')
      .replace(/\n+$/, '');

    const bullet = isTaskItem
      ? checked
        ? '- [x]'
        : '- [ ]'
      : isOrdered
        ? `${counter}.`
        : '-';
    result += `${prefix}${bullet} ${inlineContent.trim()}\n`;
    counter++;

    // Nested lists
    const nestedList = item.querySelector(':scope > ul, :scope > ol');
    if (nestedList) {
      result += listToMd(nestedList as HTMLElement, indent + 1);
    }
  }

  return result;
}

function liToMd(_el: HTMLElement): string {
  // Handled by listToMd; this prevents double processing
  return '';
}

// ─── TipTap JSON → HTML ─────────────────────────────────────────────────────

function tiptapJsonToHtml(json: string): string {
  try {
    const parsed = JSON.parse(json) as { type: string; content?: TipTapNode[] };
    if (parsed.type === 'doc' && parsed.content) {
      return parsed.content.map(renderTipTapNode).join('');
    }
  } catch {
    // If it's already HTML or invalid JSON, return as-is
  }
  return json;
}

interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  attrs?: Record<string, unknown>;
}

function renderTipTapNode(node: TipTapNode): string {
  switch (node.type) {
    case 'text': {
      let text = escapeHtml(node.text ?? '');
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              text = `<strong>${text}</strong>`;
              break;
            case 'italic':
              text = `<em>${text}</em>`;
              break;
            case 'underline':
              text = `<u>${text}</u>`;
              break;
            case 'strike':
              text = `<s>${text}</s>`;
              break;
            case 'code':
              text = `<code>${text}</code>`;
              break;
            case 'link':
              text = `<a href="${(mark.attrs?.href as string) ?? ''}">${text}</a>`;
              break;
            case 'highlight':
              text = `<mark>${text}</mark>`;
              break;
            case 'textStyle':
              // Color etc. — just pass through
              break;
          }
        }
      }
      return text;
    }
    case 'paragraph':
      return `<p>${renderChildren(node)}</p>`;
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      return `<h${level}>${renderChildren(node)}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${renderChildren(node)}</ul>`;
    case 'orderedList':
      return `<ol>${renderChildren(node)}</ol>`;
    case 'listItem':
      return `<li>${renderChildren(node)}</li>`;
    case 'taskList':
      return `<ul>${renderChildren(node)}</ul>`;
    case 'taskItem': {
      const checked = (node.attrs?.checked as boolean) ?? false;
      return `<li data-type="taskItem" data-checked="${checked}">${renderChildren(node)}</li>`;
    }
    case 'blockquote':
      return `<blockquote>${renderChildren(node)}</blockquote>`;
    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? '';
      return `<pre><code class="language-${lang}">${renderChildren(node)}</code></pre>`;
    }
    case 'horizontalRule':
      return '<hr>';
    case 'image': {
      const src = (node.attrs?.src as string) ?? '';
      const alt = (node.attrs?.alt as string) ?? '';
      return `<img src="${src}" alt="${alt}">`;
    }
    case 'hardBreak':
      return '<br>';
    default:
      return renderChildren(node);
  }
}

function renderChildren(node: TipTapNode): string {
  return (node.content ?? []).map(renderTipTapNode).join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Download helper ─────────────────────────────────────────────────────────

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(title: string): string {
  return (title || 'Untitled')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function exportNoteToMarkdown(note: Note): void {
  const html = note.content ? tiptapJsonToHtml(note.content) : '';
  const markdown = `# ${note.title}\n\n${htmlToMarkdown(html)}`;
  const filename = `${sanitizeFilename(note.title)}.md`;
  downloadFile(filename, markdown, 'text/markdown;charset=utf-8');
}

export function exportNoteToPDF(note: Note): void {
  const html = note.content ? tiptapJsonToHtml(note.content) : '';

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(note.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1.5rem;
      color: #1a1a1a;
      line-height: 1.7;
      font-size: 14px;
    }
    h1 { font-size: 1.8rem; margin-bottom: 0.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
    h2 { font-size: 1.4rem; margin-top: 1.5rem; }
    h3 { font-size: 1.15rem; margin-top: 1.25rem; }
    pre { background: #f4f4f5; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; }
    code { background: #f4f4f5; padding: 0.15rem 0.3rem; border-radius: 3px; font-size: 0.9em; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid #d4d4d8; margin-left: 0; padding-left: 1rem; color: #52525b; }
    img { max-width: 100%; height: auto; }
    a { color: #3b82f6; }
    ul, ol { padding-left: 1.5rem; }
    li[data-checked="true"] { text-decoration: line-through; color: #71717a; }
    li[data-type="taskItem"] { list-style: none; }
    li[data-type="taskItem"]::before { content: "☐ "; }
    li[data-type="taskItem"][data-checked="true"]::before { content: "☑ "; }
    .meta { color: #71717a; font-size: 0.8rem; margin-bottom: 1.5rem; }
    @media print {
      body { margin: 0; padding: 1rem; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(note.title)}</h1>
  <div class="meta">Exported from Nexus · ${new Date().toLocaleDateString()}</div>
  <div>${html}</div>
</body>
</html>`);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow!.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}
