import React from 'react';

interface RichTextProps {
	text: string;
	className?: string;
}

// Enhanced Markdown-ish renderer supporting:
// - Headings (# .. ######)
// - Bold (**text**)
// - Paragraphs with line breaks
// - Nested unordered/ordered lists via indentation
// - Tables using | col | col |
const RichText: React.FC<RichTextProps> = ({ text, className }) => {
	const cleaned = cleanupWrapping(String(text || ''));
	const lines = cleaned.split(/\r?\n/);
	const nodes: React.ReactNode[] = [];

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (!line.trim()) { i++; continue; }

		// Table block
		if (isTableLine(line)) {
			const start = i;
			while (i < lines.length && isTableLine(lines[i])) i++;
			nodes.push(renderTable(lines.slice(start, i), nodes.length));
			continue;
		}

		// List block
		if (isListLine(line)) {
			const start = i;
			while (i < lines.length && (isListLine(lines[i]) || !lines[i].trim())) i++;
			nodes.push(renderList(lines.slice(start, i), nodes.length));
			continue;
		}

		// Heading
		const heading = line.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			const level = heading[1].length;
			const content = heading[2];
			nodes.push(renderHeading(level, content, nodes.length));
			i++;
			continue;
		}

		// Paragraph: collect until blank line or next block
		const start = i;
		i++;
		while (i < lines.length && lines[i].trim() && !isListLine(lines[i]) && !isTableLine(lines[i]) && !/^(#{1,6})\s+/.test(lines[i])) {
			i++;
		}
		nodes.push(renderParagraph(lines.slice(start, i).join('\n'), nodes.length));
	}

	return (
		<div className={className}>
			{nodes}
		</div>
	);
};

export default RichText;

function cleanupWrapping(input: string): string {
	const trimmed = input.trim();
	if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
		return trimmed.slice(1, -1).trim();
	}
	return input;
}

function isTableLine(line: string): boolean {
	const t = line.trim();
	return t.startsWith('|') && t.endsWith('|') && t.includes('|');
}

function renderTable(rows: string[], key: number): React.ReactNode {
	const cells = rows.map(r => r.trim().slice(1, -1).split('|').map(c => c.trim()));
	let header: string[] = [];
	let body: string[][] = [];
	if (cells.length >= 2 && cells[1].every(c => /^:?-{3,}:?$/.test(c))) {
		header = cells[0];
		body = cells.slice(2);
	} else {
		body = cells;
	}
	return (
		<div key={key} className="overflow-x-auto">
			<table className="w-full text-sm text-left border border-gray-200 rounded-md">
				{header.length > 0 && (
					<thead className="bg-gray-50 text-gray-700">
						<tr>{header.map((h, i) => <th key={i} className="px-3 py-2 border-b border-gray-200 font-semibold">{renderInline(h)}</th>)}</tr>
					</thead>
				)}
				<tbody>
					{body.map((row, ri) => (
						<tr key={ri} className="odd:bg-white even:bg-gray-50">
							{row.map((c, ci) => <td key={ci} className="px-3 py-2 align-top border-b border-gray-100">{renderInline(c)}</td>)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function isListLine(line: string): boolean {
	return /^\s*([*•\-]|\d+\.)\s+/.test(line);
}

function renderList(lines: string[], key: number): React.ReactNode {
	// Build a simple tree based on indentation
	interface Item { type: 'ul' | 'ol'; text: string; children: Item[]; level: number; }
	const items: Item[] = [];
	const stack: Item[] = [];
	for (const raw of lines) {
		if (!raw.trim()) continue;
		const m = raw.match(/^(\s*)([*•\-]|\d+\.)\s+(.*)$/);
		if (!m) continue;
		const indent = m[1] || '';
		const marker = m[2];
		const text = m[3];
		const level = Math.floor(indent.replace(/\t/g, '    ').length / 2);
		const type: 'ul' | 'ol' = /^\d+\.$/.test(marker) ? 'ol' : 'ul';
		const node: Item = { type, text, children: [], level };
		while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop();
		if (stack.length === 0) {
			items.push(node);
			stack.push(node);
		} else {
			const parent = stack[stack.length - 1];
			parent.children.push(node);
			stack.push(node);
		}
	}
	return (
		<div key={key} className="space-y-1">
			{renderItemList(items)}
		</div>
	);
}

function renderItemList(items: any[]): React.ReactNode {
	if (items.length === 0) return null;
	const type = items[0].type;
	const ListTag = type === 'ol' ? 'ol' : 'ul';
	return (
		<ListTag className={`${type === 'ol' ? 'list-decimal' : 'list-disc'} pl-5 space-y-1`}>
			{items.map((it, idx) => (
				<li key={idx} className="text-sm leading-6 text-gray-800">
					{renderInline(it.text)}
					{it.children && it.children.length > 0 && (
						<div className="mt-1">{renderItemList(it.children)}</div>
					)}
				</li>
			))}
		</ListTag>
	);
}

function renderHeading(level: number, content: string, key: number): React.ReactNode {
	const Tag = (`h${Math.min(Math.max(level, 1), 6)}` as any);
	const sizes: Record<number, string> = { 1: 'text-xl', 2: 'text-lg', 3: 'text-base', 4: 'text-base', 5: 'text-sm', 6: 'text-sm' };
	return (
		<Tag key={key} className={`${sizes[level]} font-semibold text-gray-900 mt-2 mb-1`}>
			{renderInline(content)}
		</Tag>
	);
}

function renderParagraph(text: string, key: number): React.ReactNode {
	return <p key={key} className="text-sm leading-6 text-gray-800 whitespace-pre-wrap">{renderInline(text)}</p>;
}

function renderInline(text: string): React.ReactNode {
	// Bold: **text**
	const parts = text.split(/(\*\*[^*]+\*\*)/g);
	return (
		<>
			{parts.map((part, idx) => {
				if (/^\*\*[^*]+\*\*$/.test(part)) {
					return <strong key={idx}>{part.slice(2, -2)}</strong>;
				}
				return <span key={idx}>{part}</span>;
			})}
		</>
	);
}



