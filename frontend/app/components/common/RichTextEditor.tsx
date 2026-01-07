"use client"

import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    className?: string;
}

export function RichTextEditor({
    content,
    onChange,
    placeholder = 'Start writing...',
    readOnly = false,
    className = '',
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight.configure({
                multicolor: true,
            }),
            Placeholder.configure({
                placeholder,
            }),
            Typography,
        ],
        content,
        editable: !readOnly,
        immediatelyRender: false, // Required for SSR/Next.js compatibility
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `rich-text-editor prose prose-lg max-w-none focus:outline-none min-h-[400px] ${className}`,
            },
        },
    });

    // Update content when it changes externally
    React.useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    // Update editable state
    React.useEffect(() => {
        if (editor) {
            editor.setEditable(!readOnly);
        }
    }, [readOnly, editor]);

    if (!editor) {
        return (
            <div className="animate-pulse bg-gray-100 rounded-lg min-h-[400px]" />
        );
    }

    return (
        <div className="rich-text-editor-container">
            <EditorContent editor={editor} />
        </div>
    );
}

// Export the editor hook for toolbar access
export function useRichTextEditor() {
    return useEditor;
}

// Export Editor type for parent components
export type { Editor };
