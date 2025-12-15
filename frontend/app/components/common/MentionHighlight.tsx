"use client"

import React from "react"

interface MentionHighlightProps {
    content: string
    mentions?: string[]  // User IDs that were mentioned
    currentUserId?: string  // To highlight "you" differently
    className?: string
}

// Regex to match mention format: @[display name](id)
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

export default function MentionHighlight({
    content,
    mentions = [],
    currentUserId,
    className = ""
}: MentionHighlightProps) {
    // Parse and render content with highlighted mentions
    const renderContent = () => {
        const parts: (string | React.ReactElement)[] = []
        let lastIndex = 0
        let match

        // Reset regex lastIndex
        MENTION_REGEX.lastIndex = 0

        while ((match = MENTION_REGEX.exec(content)) !== null) {
            // Add text before mention
            if (match.index > lastIndex) {
                parts.push(content.slice(lastIndex, match.index))
            }

            const displayName = match[1]
            const id = match[2]
            const isCurrentUser = currentUserId && id === currentUserId
            const isRole = id.startsWith('role:')

            // Add highlighted mention
            parts.push(
                <span
                    key={`mention-${match.index}`}
                    className={`inline-flex items-center px-1 rounded font-medium
            ${isCurrentUser
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : isRole
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        }`}
                >
                    @{displayName}
                </span>
            )

            lastIndex = match.index + match[0].length
        }

        // Add remaining text
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

// Helper function to extract mentioned user IDs from content
export const extractMentionedUserIds = (content: string): string[] => {
    const ids: string[] = []
    let match

    MENTION_REGEX.lastIndex = 0
    while ((match = MENTION_REGEX.exec(content)) !== null) {
        const id = match[2]
        if (!id.startsWith('role:')) {
            ids.push(id)
        }
    }

    return ids
}

// Helper function to extract mentioned role names from content
export const extractMentionedRoles = (content: string): string[] => {
    const roles: string[] = []
    let match

    MENTION_REGEX.lastIndex = 0
    while ((match = MENTION_REGEX.exec(content)) !== null) {
        const id = match[2]
        if (id.startsWith('role:')) {
            roles.push(id.replace('role:', ''))
        }
    }

    return roles
}
