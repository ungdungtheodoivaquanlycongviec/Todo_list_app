import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        indent: {
            /**
             * Set the left indent for the current selection
             */
            setLeftIndent: (indent: number) => ReturnType;
            /**
             * Set the right indent for the current selection
             */
            setRightIndent: (indent: number) => ReturnType;
            /**
             * Increase the left indent
             */
            increaseIndent: () => ReturnType;
            /**
             * Decrease the left indent
             */
            decreaseIndent: () => ReturnType;
        };
    }
}

export interface IndentOptions {
    types: string[];
    minIndent: number;
    maxIndent: number;
    step: number;
}

export const Indent = Extension.create<IndentOptions>({
    name: 'indent',

    addOptions() {
        return {
            types: ['paragraph', 'heading', 'listItem'],
            minIndent: 0,
            maxIndent: 600, // pixels - allow almost full editor width
            step: 24, // pixels per indent level
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    leftIndent: {
                        default: 0,
                        parseHTML: (element) => {
                            const style = element.style.marginLeft || element.style.paddingLeft;
                            return style ? parseInt(style, 10) : 0;
                        },
                        renderHTML: (attributes) => {
                            if (!attributes.leftIndent || attributes.leftIndent === 0) {
                                return {};
                            }
                            return {
                                style: `margin-left: ${attributes.leftIndent}px`,
                            };
                        },
                    },
                    rightIndent: {
                        default: 0,
                        parseHTML: (element) => {
                            const style = element.style.marginRight || element.style.paddingRight;
                            return style ? parseInt(style, 10) : 0;
                        },
                        renderHTML: (attributes) => {
                            if (!attributes.rightIndent || attributes.rightIndent === 0) {
                                return {};
                            }
                            return {
                                style: `margin-right: ${attributes.rightIndent}px`,
                            };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            setLeftIndent:
                (indent: number) =>
                    ({ commands, editor }) => {
                        const { types, minIndent, maxIndent } = this.options;
                        const clampedIndent = Math.max(minIndent, Math.min(maxIndent, indent));

                        return types.every((type) =>
                            commands.updateAttributes(type, { leftIndent: clampedIndent })
                        );
                    },

            setRightIndent:
                (indent: number) =>
                    ({ commands }) => {
                        const { types, minIndent, maxIndent } = this.options;
                        const clampedIndent = Math.max(minIndent, Math.min(maxIndent, indent));

                        return types.every((type) =>
                            commands.updateAttributes(type, { rightIndent: clampedIndent })
                        );
                    },

            increaseIndent:
                () =>
                    ({ commands, editor }) => {
                        const { state } = editor;
                        const { selection } = state;
                        const { $from } = selection;
                        const node = $from.node($from.depth);
                        const currentIndent = node.attrs.leftIndent || 0;
                        const newIndent = Math.min(
                            currentIndent + this.options.step,
                            this.options.maxIndent
                        );

                        return commands.setLeftIndent(newIndent);
                    },

            decreaseIndent:
                () =>
                    ({ commands, editor }) => {
                        const { state } = editor;
                        const { selection } = state;
                        const { $from } = selection;
                        const node = $from.node($from.depth);
                        const currentIndent = node.attrs.leftIndent || 0;
                        const newIndent = Math.max(
                            currentIndent - this.options.step,
                            this.options.minIndent
                        );

                        return commands.setLeftIndent(newIndent);
                    },
        };
    },

    addKeyboardShortcuts() {
        return {
            Tab: () => {
                // If in a list, use native list indentation (creates nested lists)
                if (this.editor.isActive('listItem')) {
                    return this.editor.commands.sinkListItem('listItem');
                }
                // Otherwise use custom indent for paragraphs/headings
                this.editor.commands.increaseIndent();
                return true;
            },
            'Shift-Tab': () => {
                // If in a list, use native list outdentation
                if (this.editor.isActive('listItem')) {
                    return this.editor.commands.liftListItem('listItem');
                }
                // Otherwise use custom indent for paragraphs/headings
                this.editor.commands.decreaseIndent();
                return true;
            },
        };
    },
});

export default Indent;
