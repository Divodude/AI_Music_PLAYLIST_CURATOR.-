"use client"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Music, Sparkles, Headphones, Heart, Share2, ExternalLink } from "lucide-react"

interface Song {
  id: string
  title: string
  artist: string
  duration: string
  videoId: string
  thumbnailUrl: string
  genre: string
}

interface PlaylistResponse {
  success: boolean
  playlist: Song[]
  title: string
  description: string
  error?: string
}

const suggestionTags = [
  "Chill vibes for Sunday morning",
  "Energetic workout music",
  "Focus music for deep work",
  "Nostalgic 2000s hits",
  "Indie folk for rainy days",
  "Electronic music for gaming",
  "Jazz for late night study",
  "Pop hits for road trip",
]

const countries = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "BR", label: "Brazil" },
  { value: "IN", label: "India" },
]

function YouTubePlayer({
  song,
  isPlaying,
  onPlayPause,
}: {
  song: Song
  isPlaying: boolean
  onPlayPause: () => void
}) {
  const [player, setPlayer] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
        initializePlayer()
      }
    } else {
      initializePlayer()
    }

    function initializePlayer() {
      if (playerRef.current && song.videoId) {
        const newPlayer = new window.YT.Player(playerRef.current, {
          height: "200",
          width: "100%",
          videoId: song.videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              setIsReady(true)
              setPlayer(newPlayer)
            },
          },
        })
      }
    }

    return () => {
      if (player) {
        player.destroy()
      }
    }
  }, [song.videoId])

  useEffect(() => {
    if (player && isReady) {
      if (isPlaying) {
        player.playVideo()
      } else {
        player.pauseVideo()
      }
    }
  }, [isPlaying, player, isReady])

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50 border-2 hover:border-purple-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <img
              src={song.thumbnailUrl || "/placeholder.svg?height=64&width=64"}
              alt={`${song.title} thumbnail`}
              className="w-16 h-16 rounded-lg object-cover shadow-md"
            />
            <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-purple-700 transition-colors">
              {song.title}
            </h3>
            <p className="text-gray-600 truncate">{song.artist}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {song.genre}
              </Badge>
              <span className="text-xs text-gray-500">{song.duration}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-500">
              <Heart className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-500 hover:text-blue-500"
              onClick={() => window.open(`https://www.youtube.com/watch?v=${song.videoId}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={onPlayPause}
              disabled={!isReady}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <span className="text-sm text-gray-600">{isReady ? "Ready to play" : "Loading..."}</span>
          </div>

          {/* YouTube Player Container */}
          <div className="rounded-lg overflow-hidden">
            <div ref={playerRef} className="w-full h-48" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AIPlaylistGenerator() {
  const [prompt, setPrompt] = useState("")
  const [country, setCountry] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [playlistTitle, setPlaylistTitle] = useState("")
  const [playlistDescription, setPlaylistDescription] = useState("")
  const [error, setError] = useState("")
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)

  const generatePlaylist = async () => {
    if (!prompt.trim()) {
      setError("Please describe the type of playlist you want!")
      return
    }

    setIsLoading(true)
    setError("")
    setPlaylist([])

    try {
      const response = await fetch("/api/generate-playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          country: country || undefined,
        }),
      })

      const data: PlaylistResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate playlist")
      }

      if (data.success && data.playlist) {
        setPlaylist(data.playlist)
        setPlaylistTitle(data.title)
        setPlaylistDescription(data.description)

        // Update SEO metadata
        updatePageMetadata(data.title, data.playlist)

        // Scroll to playlist
        setTimeout(() => {
          document.getElementById("playlist")?.scrollIntoView({ behavior: "smooth" })
        }, 100)
      } else {
        throw new Error("No playlist data received")
      }
    } catch (error) {
      console.error("Error generating playlist:", error)
      setError(error instanceof Error ? error.message : "Failed to generate playlist. Please try again!")
    } finally {
      setIsLoading(false)
    }
  }

  const updatePageMetadata = (title: string, songs: Song[]) => {
    // Update page title
    document.title = `${title} | AI Music Playlist Generator`

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      const songTitles = songs
        .slice(0, 3)
        .map((s) => s.title)
        .join(", ")
      metaDescription.setAttribute(
        "content",
        `Listen to your AI-generated playlist featuring ${songTitles} and more. Create custom playlists with AI.`,
      )
    }

    // Add structured data for the playlist
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "MusicPlaylist",
      name: title,
      description: `An AI-generated playlist`,
      numTracks: songs.length,
      track: songs.map((song) => ({
        "@type": "MusicRecording",
        name: song.title,
        byArtist: {
          "@type": "MusicGroup",
          name: song.artist,
        },
        url: `https://www.youtube.com/watch?v=${song.videoId}`,
      })),
    }

    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]')
    if (existingScript) {
      existingScript.remove()
    }

    // Add new structured data
    const script = document.createElement("script")
    script.type = "application/ld+json"
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)
  }

  const handlePlayPause = (songId: string) => {
    if (currentlyPlaying === songId) {
      setCurrentlyPlaying(null)
    } else {
      setCurrentlyPlaying(songId)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion)
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center py-16">
            <div className="flex justify-center items-center gap-3 mb-6">
              <div className="relative">
                <Music className="w-16 h-16 text-white animate-bounce" />
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-6 animate-fade-in">
              AI Music Playlist Generator
            </h1>
            <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Describe your mood, activity, or vibe - let our AI create the perfect playlist for you in seconds
            </p>
            <div className="flex justify-center items-center gap-2 text-purple-200">
              <Headphones className="w-5 h-5" />
              <span className="text-sm">Powered by Gemini AI & YouTube</span>
            </div>
          </div>

          {/* Input Section */}
          <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl mb-8">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="prompt" className="text-lg font-semibold text-gray-700 mb-3 block">
                      Describe your perfect playlist
                    </Label>
                    <Input
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., upbeat indie for a road trip, chill lo-fi for studying, 90s rock for working out"
                      className="text-lg p-4 border-2 focus:border-purple-500 transition-colors"
                      onKeyPress={(e) => e.key === "Enter" && !isLoading && generatePlaylist()}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-lg font-semibold text-gray-700 mb-3 block">
                      Region (optional)
                    </Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="text-lg p-4 border-2">
                        <SelectValue placeholder="Global" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={generatePlaylist}
                    disabled={isLoading || !prompt.trim()}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Generating with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Playlist
                      </>
                    )}
                  </Button>
                </div>

                {/* Suggestions */}
                <div className="text-center">
                  <p className="text-gray-600 mb-4 font-medium">✨ Try these popular prompts:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestionTags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-purple-100 hover:border-purple-300 transition-colors px-3 py-1"
                        onClick={() => handleSuggestionClick(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="bg-red-50 border-red-200 mb-8">
              <CardContent className="p-4">
                <p className="text-red-700 text-center font-medium">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Playlist Section */}
          {playlist.length > 0 && (
            <div id="playlist" className="animate-fade-in">
              <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{playlistTitle}</h2>
                    <p className="text-gray-600 text-lg">{playlistDescription}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {playlist.map((song) => (
                      <YouTubePlayer
                        key={song.id}
                        song={song}
                        isPlaying={currentlyPlaying === song.id}
                        onPlayPause={() => handlePlayPause(song.id)}
                      />
                    ))}
                  </div>

                  <div className="text-center mt-8">
                    <Button variant="outline" size="lg" className="mr-4">
                      <Heart className="w-5 h-5 mr-2" />
                      Save Playlist
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        const url = window.location.href
                        navigator.clipboard.writeText(url)
                        // You could add a toast notification here
                      }}
                    >
                      <Share2 className="w-5 h-5 mr-2" />
                      Share Playlist
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  )
}

// Extend Window interface for YouTube API
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}
