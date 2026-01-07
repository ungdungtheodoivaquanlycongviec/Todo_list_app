"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Heading6,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Code,
    Quote,
    Highlighter,
    RemoveFormatting,
    Minus,
    ChevronDown,
    Type,
    Palette,
    IndentDecrease,
    IndentIncrease,
} from 'lucide-react';

interface FormattingToolbarProps {
    editor: Editor | null;
}

interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2 rounded-lg transition-all duration-200 ${isActive
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            {children}
        </button>
    );
}

function ToolbarDivider() {
    return <div className="w-px h-6 bg-gray-300 mx-1" />;
}

// Font options
const FONTS = [
    { name: 'Default', value: '' },
    { name: 'Inter', value: 'Inter' },
    { name: 'Arial', value: 'Arial' },
    { name: 'Times New Roman', value: 'Times New Roman' },
    { name: 'Georgia', value: 'Georgia' },
    { name: 'Courier New', value: 'Courier New' },
    { name: 'Verdana', value: 'Verdana' },
    { name: 'Roboto', value: 'Roboto' },
];

// Color palette
const TEXT_COLORS = [
    { name: 'Default', value: '' },
    { name: 'Black', value: '#000000' },
    { name: 'Dark Gray', value: '#4B5563' },
    { name: 'Gray', value: '#9CA3AF' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
];

// Heading options
const HEADINGS = [
    { level: 1, label: 'Heading 1', icon: Heading1 },
    { level: 2, label: 'Heading 2', icon: Heading2 },
    { level: 3, label: 'Heading 3', icon: Heading3 },
    { level: 4, label: 'Heading 4', icon: Heading4 },
    { level: 5, label: 'Heading 5', icon: Heading5 },
    { level: 6, label: 'Heading 6', icon: Heading6 },
];

// Text size options - common font sizes in pt
const TEXT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72];

export function FormattingToolbar({ editor }: FormattingToolbarProps) {
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [showColorDropdown, setShowColorDropdown] = useState(false);
    const [showHeadingDropdown, setShowHeadingDropdown] = useState(false);
    const [showSizeDropdown, setShowSizeDropdown] = useState(false);

    if (!editor) {
        return null;
    }

    const closeAllDropdowns = () => {
        setShowFontDropdown(false);
        setShowColorDropdown(false);
        setShowHeadingDropdown(false);
        setShowSizeDropdown(false);
    };

    const getCurrentFont = () => {
        const font = editor.getAttributes('textStyle').fontFamily;
        return font || 'Default';
    };

    const getCurrentSize = (): number => {
        const size = editor.getAttributes('textStyle').fontSize;
        if (!size) return 16; // Default size
        // Parse px value to number
        const num = parseInt(size.replace('px', ''), 10);
        return isNaN(num) ? 16 : num;
    };

    const getCurrentHeadingLevel = () => {
        for (let i = 1; i <= 6; i++) {
            if (editor.isActive('heading', { level: i })) {
                return i;
            }
        }
        return null;
    };

    return (
        <div className="flex flex-wrap items-center gap-0.5 p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Font Family Dropdown */}
            <div className="relative">
                <button
                    onClick={() => {
                        closeAllDropdowns();
                        setShowFontDropdown(!showFontDropdown);
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-w-[100px]"
                    title="Font Family"
                >
                    <Type className="w-4 h-4" />
                    <span className="truncate max-w-[70px]">{getCurrentFont()}</span>
                    <ChevronDown className="w-3 h-3" />
                </button>
                {showFontDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px] py-1">
                        {FONTS.map((font) => (
                            <button
                                key={font.name}
                                onClick={() => {
                                    if (font.value) {
                                        editor.chain().focus().setFontFamily(font.value).run();
                                    } else {
                                        editor.chain().focus().unsetFontFamily().run();
                                    }
                                    setShowFontDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${getCurrentFont() === font.name ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                                style={{ fontFamily: font.value || 'inherit' }}
                            >
                                {font.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Text Size Dropdown */}
            <div className="relative">
                <button
                    onClick={() => {
                        closeAllDropdowns();
                        setShowSizeDropdown(!showSizeDropdown);
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-w-[50px]"
                    title="Text Size"
                >
                    <span>{getCurrentSize()}</span>
                    <ChevronDown className="w-3 h-3" />
                </button>
                {showSizeDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[60px] py-1 max-h-64 overflow-y-auto">
                        {TEXT_SIZES.map((size) => (
                            <button
                                key={size}
                                onClick={() => {
                                    editor.chain().focus().setFontSize(`${size}px`).run();
                                    setShowSizeDropdown(false);
                                }}
                                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 ${getCurrentSize() === size ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                                    }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <ToolbarDivider />

            {/* Heading Dropdown */}
            <div className="relative">
                <button
                    onClick={() => {
                        closeAllDropdowns();
                        setShowHeadingDropdown(!showHeadingDropdown);
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Headings"
                >
                    <Heading1 className="w-4 h-4" />
                    <span>{getCurrentHeadingLevel() ? `H${getCurrentHeadingLevel()}` : 'Normal'}</span>
                    <ChevronDown className="w-3 h-3" />
                </button>
                {showHeadingDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px] py-1">
                        <button
                            onClick={() => {
                                editor.chain().focus().setParagraph().run();
                                setShowHeadingDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${!getCurrentHeadingLevel() ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                        >
                            Normal Text
                        </button>
                        {HEADINGS.map(({ level, label, icon: Icon }) => (
                            <button
                                key={level}
                                onClick={() => {
                                    editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
                                    setShowHeadingDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${editor.isActive('heading', { level }) ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <ToolbarDivider />

            {/* Text Style */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold (Ctrl+B)"
            >
                <Bold className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic (Ctrl+I)"
            >
                <Italic className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline (Ctrl+U)"
            >
                <Underline className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
            >
                <Strikethrough className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Text Color Dropdown */}
            <div className="relative">
                <button
                    onClick={() => {
                        closeAllDropdowns();
                        setShowColorDropdown(!showColorDropdown);
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Text Color"
                >
                    <Palette className="w-4 h-4" />
                    <div
                        className="w-3 h-3 rounded border border-gray-300"
                        style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                    />
                    <ChevronDown className="w-3 h-3" />
                </button>
                {showColorDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                        <div className="grid grid-cols-4 gap-1">
                            {TEXT_COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => {
                                        if (color.value) {
                                            editor.chain().focus().setColor(color.value).run();
                                        } else {
                                            editor.chain().focus().unsetColor().run();
                                        }
                                        setShowColorDropdown(false);
                                    }}
                                    className={`w-7 h-7 rounded border-2 transition-all hover:scale-110 ${editor.getAttributes('textStyle').color === color.value
                                        ? 'border-blue-500'
                                        : 'border-gray-200'
                                        }`}
                                    style={{ backgroundColor: color.value || '#ffffff' }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                isActive={editor.isActive('highlight')}
                title="Highlight"
            >
                <Highlighter className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Indent buttons */}
            <ToolbarButton
                onClick={() => editor.commands.decreaseIndent()}
                title="Decrease Indent (Shift+Tab)"
            >
                <IndentDecrease className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.commands.increaseIndent()}
                title="Increase Indent (Tab)"
            >
                <IndentIncrease className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <List className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
            >
                <ListOrdered className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Alignment */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
            >
                <AlignLeft className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
            >
                <AlignCenter className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
            >
                <AlignRight className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                isActive={editor.isActive({ textAlign: 'justify' })}
                title="Justify"
            >
                <AlignJustify className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Extras */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                title="Inline Code"
            >
                <Code className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Blockquote"
            >
                <Quote className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
            >
                <Minus className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Clear Formatting */}
            <ToolbarButton
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                title="Clear Formatting"
            >
                <RemoveFormatting className="w-4 h-4" />
            </ToolbarButton>
        </div>
    );
}

// Google Docs-style Editor Ruler with blue vertical bar markers
interface EditorRulerProps {
    editor: Editor | null;
    containerWidth: number;
}

export function EditorRuler({ editor, containerWidth }: EditorRulerProps) {
    const rulerRef = useRef<HTMLDivElement>(null);
    const [isDraggingLeft, setIsDraggingLeft] = useState(false);
    const [isDraggingRight, setIsDraggingRight] = useState(false);
    const [leftIndent, setLeftIndent] = useState(0);
    const [rightIndent, setRightIndent] = useState(0);

    // Get current paragraph's indent values from editor
    useEffect(() => {
        if (!editor) return;

        const updateIndents = () => {
            const { selection } = editor.state;
            const { $from } = selection;
            const node = $from.node($from.depth);
            if (node) {
                setLeftIndent(node.attrs.leftIndent || 0);
                setRightIndent(node.attrs.rightIndent || 0);
            }
        };

        updateIndents();
        editor.on('selectionUpdate', updateIndents);
        editor.on('transaction', updateIndents);

        return () => {
            editor.off('selectionUpdate', updateIndents);
            editor.off('transaction', updateIndents);
        };
    }, [editor]);

    // Use full ruler width minus small padding
    const rulerWidth = containerWidth > 0 ? containerWidth - 64 : 600; // Account for px-8 padding
    const maxIndent = rulerWidth - 50; // Allow markers to go almost to the edge

    const handleMouseDown = (side: 'left' | 'right') => (e: React.MouseEvent) => {
        e.preventDefault();
        if (side === 'left') {
            setIsDraggingLeft(true);
        } else {
            setIsDraggingRight(true);
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!rulerRef.current || !editor) return;

        const rect = rulerRef.current.getBoundingClientRect();

        if (isDraggingLeft) {
            const x = e.clientX - rect.left;
            // Allow full range, just stay within bounds
            const pixelValue = Math.max(0, Math.min(maxIndent - rightIndent - 20, x));
            setLeftIndent(Math.round(pixelValue));
            editor.commands.setLeftIndent(Math.round(pixelValue));
        } else if (isDraggingRight) {
            const x = rect.right - e.clientX;
            // Allow full range, just stay within bounds
            const pixelValue = Math.max(0, Math.min(maxIndent - leftIndent - 20, x));
            setRightIndent(Math.round(pixelValue));
            editor.commands.setRightIndent(Math.round(pixelValue));
        }
    }, [isDraggingLeft, isDraggingRight, editor, leftIndent, rightIndent, maxIndent]);

    const handleMouseUp = useCallback(() => {
        setIsDraggingLeft(false);
        setIsDraggingRight(false);
    }, []);

    useEffect(() => {
        if (isDraggingLeft || isDraggingRight) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDraggingLeft, isDraggingRight, handleMouseMove, handleMouseUp]);

    if (!editor) return null;

    // Generate tick marks - one per cm (approx 37.8px per cm, but we'll use nice spacing)
    const tickSpacing = 50; // pixels between major ticks
    const tickCount = Math.floor(rulerWidth / tickSpacing);

    return (
        <div
            ref={rulerRef}
            className="relative h-7 bg-white border-b border-gray-200 select-none"
            style={{ width: '100%' }}
        >
            {/* Tick marks and numbers */}
            {Array.from({ length: tickCount + 1 }).map((_, i) => {
                const x = i * tickSpacing;
                const isMajor = i % 2 === 0;
                return (
                    <React.Fragment key={i}>
                        {/* Tick mark */}
                        <div
                            className={`absolute bottom-0 ${isMajor ? 'h-2.5 bg-gray-500' : 'h-1.5 bg-gray-300'}`}
                            style={{ left: `${x}px`, width: '1px' }}
                        />
                        {/* Number label for major ticks */}
                        {isMajor && (
                            <span
                                className="absolute text-[10px] text-gray-400 font-light"
                                style={{
                                    left: `${x}px`,
                                    top: '1px',
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                {i / 2}
                            </span>
                        )}
                    </React.Fragment>
                );
            })}

            {/* Left indent marker - Blue vertical bar */}
            <div
                className={`absolute top-0 bottom-0 z-20 cursor-ew-resize group ${isDraggingLeft ? 'z-30' : ''
                    }`}
                style={{ left: `${leftIndent}px` }}
                onMouseDown={handleMouseDown('left')}
                title={`Left indent: ${leftIndent}px`}
            >
                <div className={`w-1 h-full bg-blue-600 transition-all ${isDraggingLeft ? 'bg-blue-700 w-1.5' : 'group-hover:bg-blue-700'
                    }`} />
            </div>

            {/* Right indent marker - Blue vertical bar */}
            <div
                className={`absolute top-0 bottom-0 z-20 cursor-ew-resize group ${isDraggingRight ? 'z-30' : ''
                    }`}
                style={{ right: `${rightIndent}px` }}
                onMouseDown={handleMouseDown('right')}
                title={`Right indent: ${rightIndent}px`}
            >
                <div className={`w-1 h-full bg-blue-600 transition-all ${isDraggingRight ? 'bg-blue-700 w-1.5' : 'group-hover:bg-blue-700'
                    }`} />
            </div>
        </div>
    );
}
