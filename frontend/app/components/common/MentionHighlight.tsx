"use client"

import React from "react"

interface MentionHighlightProps {
    content: string
    mentions?: string[]  // User IDs that were mentioned
    currentUserId?: string  // To highlight "you" differently
    mentionedNames?: string[] // Display names that were mentioned (for @name matching)
    isOwnMessage?: boolean // True if this is the current user's message (for styling in blue bubbles)
    className?: string
}

// Regex to match mention formats: @[display name](id)
const LEGACY_MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

export default function MentionHighlight({
    content,
    mentions = [],
    currentUserId,
    mentionedNames = [],
    isOwnMessage = false,
    className = ""
}: MentionHighlightProps) {
    // Parse and render content with highlighted mentions
    const renderContent = () => {
        if (!content) return null

        // First check for legacy @[name](id) format
        LEGACY_MENTION_REGEX.lastIndex = 0
        if (LEGACY_MENTION_REGEX.test(content)) {
            return renderLegacyFormat()
        }

        // For plain @name format, highlight mentions including @everyone
        return renderSimpleFormat()
    }

    // Render legacy @[name](id) format
    const renderLegacyFormat = () => {
        const parts: (string | React.ReactElement)[] = []
        let lastIndex = 0
        let match

        LEGACY_MENTION_REGEX.lastIndex = 0
        while ((match = LEGACY_MENTION_REGEX.exec(content)) !== null) {
            if (match.index > lastIndex) {
                parts.push(content.slice(lastIndex, match.index))
            }

            const displayName = match[1]
            const id = match[2]
            const isCurrentUser = currentUserId && id === currentUserId
            const isRole = id.startsWith('role:')
            const isEveryone = displayName.toLowerCase() === 'everyone'

            // Use different colors for own messages (white/light on blue) vs received
            const highlightClass = isOwnMessage
                ? 'bg-white/20 text-white font-semibold'  // On blue bubble
                : isEveryone
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : isCurrentUser
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : isRole
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'

            parts.push(
                <span
                    key={`mention-${match.index}`}
                    className={`inline-flex items-center px-1 rounded font-medium ${highlightClass}`}
                >
                    @{displayName}
                </span>
            )

            lastIndex = match.index + match[0].length
        }

        if (lastIndex < content.length) {
            parts.push(content.slice(lastIndex))
        }

        return parts.length > 0 ? parts : content
    }

    // Render simple @name format - find and highlight @mentions including multi-word names
    const renderSimpleFormat = () => {
        // If no specific mentioned names provided, use fallback that highlights all @ mentions
        if (mentionedNames.length === 0) {
            return highlightSimpleAtMentions()
        }

        // Build a list of known mentions to look for (including @everyone)
        const knownMentions = [...mentionedNames, 'everyone']

        // Sort by length descending so longer names are matched first
        knownMentions.sort((a, b) => b.length - a.length)

        // Create pattern that matches @ followed by any of the known names
        const escapedNames = knownMentions.map(name =>
            name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        )
        const pattern = new RegExp(`@(${escapedNames.join('|')})(?=\\s|$|[,\\.!?])`, 'gi')

        const parts: (string | React.ReactElement)[] = []
        let lastIndex = 0
        let match

        while ((match = pattern.exec(content)) !== null) {
            if (match.index > lastIndex) {
                parts.push(content.slice(lastIndex, match.index))
            }

            const mentionText = match[1]
            const isEveryone = mentionText.toLowerCase() === 'everyone'

            // Use different colors for own messages (white/light on blue) vs received
            const highlightClass = isOwnMessage
                ? isEveryone
                    ? 'bg-white/30 text-white font-semibold'  // @everyone on blue
                    : 'bg-white/20 text-white font-semibold'  // @mention on blue
                : isEveryone
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'

            parts.push(
                <span
                    key={`mention-${match.index}`}
                    className={`inline-flex items-center px-1 rounded font-medium ${highlightClass}`}
                >
                    @{mentionText}
                </span>
            )

            lastIndex = match.index + match[0].length
        }

        if (lastIndex < content.length) {
            parts.push(content.slice(lastIndex))
        }

        return parts.length > 0 ? parts : content
    }

    // Fallback for when no mentionedNames are provided - highlight all @ mentions
    const highlightSimpleAtMentions = () => {
        // Match @ followed by text (until next @ or end of string)
        const pattern = /@([^@\n]+)/g
        const parts: (string | React.ReactElement)[] = []
        let lastIndex = 0
        let match

        while ((match = pattern.exec(content)) !== null) {
            if (match.index > lastIndex) {
                parts.push(content.slice(lastIndex, match.index))
            }

            let mentionText = match[1].trim()
            // Remove trailing punctuation
            mentionText = mentionText.replace(/[,\.\!\?]+$/, '')

            const isEveryone = mentionText.toLowerCase() === 'everyone'
            const isMention = mentionText.length > 0 && !/^[0-9]+$/.test(mentionText)

            if (isMention) {
                // Use different colors for own messages (white/light on blue) vs received (standard colors)
                const highlightClass = isOwnMessage
                    ? isEveryone
                        ? 'bg-white/30 text-white font-semibold'  // @everyone on blue bubble
                        : 'bg-white/20 text-white font-semibold'  // @mention on blue bubble
                    : isEveryone
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'  // @everyone on gray
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'  // @mention on gray

                parts.push(
                    <span
                        key={`mention-${match.index}`}
                        className={`inline-flex items-center px-1 rounded font-medium ${highlightClass}`}
                    >
                        @{mentionText}
                    </span>
                )
                // Add back any trailing text we didn't include
                const fullMatch = match[1]
                const remaining = fullMatch.slice(mentionText.length)
                if (remaining.trim()) {
                    parts.push(remaining)
                }
            } else {
                parts.push(match[0])
            }

            lastIndex = match.index + match[0].length
        }

        if (lastIndex < content.length) {
            parts.push(content.slice(lastIndex))
        }

        return parts.length > 0 ? parts : content
    }

    return (
        <span className={`whitespace-pre-wrap break-words ${className}`}>
            {renderContent()}
        </span>
    )
}

// Helper function to convert mention format to display text
export const getMentionDisplayText = (content: string): string => {
    return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
}

// Helper function to extract mentioned user IDs from content (legacy @[name](id) format)
export const extractMentionedUserIds = (content: string): string[] => {
    const ids: string[] = []
    let match

    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g
    while ((match = regex.exec(content)) !== null) {
        const id = match[2]
        if (!id.startsWith('role:')) {
            ids.push(id)
        }
    }

    return ids
}

// Helper function to extract mentioned role names from content (legacy @[name](id) format)
export const extractMentionedRoles = (content: string): string[] => {
    const roles: string[] = []
    let match

    const regex = /@\[([^\]]+)\]\(([^)]+)\)/g
    while ((match = regex.exec(content)) !== null) {
        const id = match[2]
        if (id.startsWith('role:')) {
            roles.push(id.replace('role:', ''))
        }
    }

    return roles
}

