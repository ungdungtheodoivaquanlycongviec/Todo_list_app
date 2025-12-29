import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    isOwn?: boolean;
}

export default function VoiceMessagePlayer({ src, isOwn = false }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number): string => {
        if (isNaN(time) || !isFinite(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        audio.currentTime = percentage * duration;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`flex items-center gap-3 px-3 py-2 rounded-full min-w-[160px] ${isOwn
                ? 'bg-blue-400/30'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
            {/* Hidden audio element */}
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause button */}
            <button
                onClick={togglePlayPause}
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 ${isOwn
                        ? 'bg-white/30 hover:bg-white/40 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
            >
                {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
            </button>

            {/* Progress bar and time */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
                {/* Progress bar */}
                <div
                    className={`flex-1 h-1 rounded-full cursor-pointer ${isOwn ? 'bg-white/30' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    onClick={handleProgressClick}
                >
                    <div
                        className={`h-full rounded-full transition-all duration-100 ${isOwn ? 'bg-white' : 'bg-blue-500'
                            }`}
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                {/* Time display */}
                <span className={`text-xs font-medium whitespace-nowrap ${isOwn ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                    {formatTime(currentTime)}/{formatTime(duration)}
                </span>
            </div>
        </div>
    );
}
