"use client"

import { useState, useRef, useEffect, useCallback } from "react"

export interface MentionableUser {
    _id: string
    name: string
    email: string
    avatar?: string
    role?: string
}

interface MentionInputProps {
    value: string
    onChange: (value: string) => void
    onSubmit?: () => void
    placeholder?: string
    mentionableUsers: MentionableUser[]
    mentionableRoles?: string[]
    disabled?: boolean
    className?: string
    multiline?: boolean
    rows?: number
}

interface MentionSuggestion {
    type: 'user' | 'role'
    id: string
    display: string
    subtext?: string
    avatar?: string
}

// Parse mentions from content - supports both @[name](id) and @name formats
export const parseMentions = (content: string): { userIds: string[], roleNames: string[] } => {
    const userIds: string[] = []
    const roleNames: string[] = []

    // Match @[display name](id) pattern (legacy format)
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
        const id = match[2]
        // Check if it's a role (role IDs start with 'role:')
        if (id.startsWith('role:')) {
            roleNames.push(id.replace('role:', ''))
        } else {
            userIds.push(id)
        }
    }

    return { userIds, roleNames }
}

// Parse @name mentions and resolve to user IDs by matching against mentionable users
export const parseMentionsByName = (
    content: string,
    mentionableUsers: MentionableUser[],
    mentionableRoles: string[] = []
): { userIds: string[], roleNames: string[] } => {
    const userIds: string[] = []
    const roleNames: string[] = []

    if (!content) return { userIds, roleNames }

    // First check for @[name](id) format (legacy)
    const legacyResult = parseMentions(content)
    if (legacyResult.userIds.length > 0 || legacyResult.roleNames.length > 0) {
        return legacyResult
    }

    // Match @name pattern (name can contain spaces until next @ or end of string)
    // Look for @followed by text that matches a known user/role name
    for (const user of mentionableUsers) {
        const escapedName = user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`@${escapedName}(?:\\s|$|,|\\.|!|\\?)`, 'gi')
        if (regex.test(content)) {
            if (!userIds.includes(user._id)) {
                userIds.push(user._id)
            }
        }
    }

    for (const role of mentionableRoles) {
        const displayRole = role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        const escapedRole = displayRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`@${escapedRole}(?:\\s|$|,|\\.|!|\\?)`, 'gi')
        if (regex.test(content)) {
            if (!roleNames.includes(role)) {
                roleNames.push(role)
            }
        }
    }

    return { userIds, roleNames }
}

// Convert mention format to plain text for display
export const mentionsToPlainText = (content: string): string => {
    return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
}

// Check if content contains mentions
export const hasMentions = (content: string): boolean => {
    return /@\[([^\]]+)\]\([^)]+\)/.test(content) || /@\w/.test(content)
}


export default function MentionInput({
    value,
    onChange,
    onSubmit,
    placeholder = "Type a message...",
    mentionableUsers,
    mentionableRoles = [],
    disabled = false,
    className = "",
    multiline = false,
    rows = 3
}: MentionInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [mentionQuery, setMentionQuery] = useState("")
    const [mentionStartIndex, setMentionStartIndex] = useState(-1)

    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)


    // Build all suggestions (users + roles + @everyone)
    const getAllSuggestions = useCallback((): MentionSuggestion[] => {
        // If no mentionable users, return empty - this disables mentions in direct chat
        if (mentionableUsers.length === 0 && mentionableRoles.length === 0) {
            return []
        }

        // Add @everyone as the first option (only when there are mentionable users)
        const everyoneSuggestion: MentionSuggestion = {
            type: 'role',
            id: 'everyone',
            display: 'everyone',
            subtext: 'Notify all members'
        }

        const userSuggestions: MentionSuggestion[] = mentionableUsers.map(user => ({
            type: 'user',
            id: user._id,
            display: user.name,
            subtext: user.email,
            avatar: user.avatar
        }))

        const roleSuggestions: MentionSuggestion[] = mentionableRoles.map(role => ({
            type: 'role',
            id: `role:${role}`,
            display: role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            subtext: 'Role'
        }))

        return [everyoneSuggestion, ...userSuggestions, ...roleSuggestions]
    }, [mentionableUsers, mentionableRoles])

    // Filter suggestions based on query
    const filterSuggestions = useCallback((query: string) => {
        const all = getAllSuggestions()
        if (!query) {
            // Show up to 30 suggestions to accommodate users + roles
            setSuggestions(all.slice(0, 30))
            return
        }

        const lowQuery = query.toLowerCase()
        const filtered = all.filter(suggestion =>
            suggestion.display.toLowerCase().includes(lowQuery) ||
            (suggestion.subtext && suggestion.subtext.toLowerCase().includes(lowQuery))
        ).slice(0, 30)

        setSuggestions(filtered)
        setSelectedIndex(0)
    }, [getAllSuggestions])

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value
        const cursorPos = e.target.selectionStart || 0

        onChange(newValue)

        // Check if we should show mention suggestions
        // Look backward from cursor to find '@'
        let mentionStart = -1
        for (let i = cursorPos - 1; i >= 0; i--) {
            const char = newValue[i]
            if (char === '@') {
                // Check if it's at start or preceded by whitespace
                if (i === 0 || /\s/.test(newValue[i - 1])) {
                    mentionStart = i
                    break
                }
            }
            // Stop if we hit whitespace (no '@' in current word)
            if (/\s/.test(char)) break
        }

        if (mentionStart >= 0) {
            const query = newValue.slice(mentionStart + 1, cursorPos)
            // Don't show if it looks like a completed mention
            if (!query.includes(']') && !query.includes('(')) {
                setMentionStartIndex(mentionStart)
                setMentionQuery(query)
                filterSuggestions(query)
                setShowSuggestions(true)
                return
            }
        }

        setShowSuggestions(false)
        setMentionStartIndex(-1)
    }

    // Insert mention at cursor position
    const insertMention = (suggestion: MentionSuggestion) => {
        if (mentionStartIndex < 0) return

        const cursorPos = inputRef.current?.selectionStart || value.length
        const before = value.slice(0, mentionStartIndex)
        const after = value.slice(cursorPos)

        // Format: @[name](id) for backend parsing
        // This allows the backend to extract user IDs from the content
        const mention = `@[${suggestion.display}](${suggestion.id}) `
        const newValue = before + mention + after

        onChange(newValue)
        setShowSuggestions(false)
        setMentionStartIndex(-1)

        // Focus and set cursor after mention
        setTimeout(() => {
            if (inputRef.current) {
                const newCursorPos = before.length + mention.length
                inputRef.current.focus()
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
            }
        }, 0)
    }

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions && suggestions.length > 0) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setSelectedIndex(prev => Math.max(prev - 1, 0))
                    break
                case 'Enter':
                    if (!e.shiftKey) {
                        e.preventDefault()
                        insertMention(suggestions[selectedIndex])
                    }
                    break
                case 'Escape':
                    e.preventDefault()
                    setShowSuggestions(false)
                    break
                case 'Tab':
                    e.preventDefault()
                    insertMention(suggestions[selectedIndex])
                    break
            }
        } else if (e.key === 'Enter' && !e.shiftKey && !multiline && onSubmit) {
            e.preventDefault()
            onSubmit()
        }
    }

    // Scroll selected suggestion into view
    useEffect(() => {
        if (showSuggestions && suggestionsRef.current) {
            const selected = suggestionsRef.current.children[selectedIndex] as HTMLElement
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' })
            }
        }
    }, [selectedIndex, showSuggestions])

    // Close suggestions on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const inputProps = {
        ref: inputRef as any,
        value,
        onChange: handleChange,
        onKeyDown: handleKeyDown,
        placeholder,
        disabled,
        className: `w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
      bg-white dark:bg-gray-800 text-gray-900 dark:text-white
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}`,
    }

    return (
        <div className="relative">
            {multiline ? (
                <textarea {...inputProps} rows={rows} />
            ) : (
                <input type="text" {...inputProps} />
            )}

            {/* Suggestions dropdown - appears ABOVE the input */}
            {showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full max-h-48 overflow-y-auto bottom-full mb-1 
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
            rounded-lg shadow-lg"
                >
                    {suggestions.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                            No users found
                        </div>
                    ) : (
                        suggestions.map((suggestion, index) => (
                            <button
                                key={suggestion.id}
                                type="button"
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                  ${index === selectedIndex
                                        ? 'bg-blue-50 dark:bg-blue-900/30'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                onClick={() => insertMention(suggestion)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                {/* Avatar or role icon */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${suggestion.type === 'role'
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    }`}
                                >
                                    {suggestion.avatar ? (
                                        <img
                                            src={suggestion.avatar}
                                            alt={suggestion.display}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        suggestion.display.charAt(0).toUpperCase()
                                    )}
                                </div>

                                {/* Name and subtext */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {suggestion.display}
                                    </div>
                                    {suggestion.subtext && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {suggestion.subtext}
                                        </div>
                                    )}
                                </div>

                                {/* Type badge */}
                                {suggestion.type === 'role' && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 
                    text-purple-600 dark:text-purple-400">
                                        Role
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
