import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { google } from "googleapis"

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Initialize YouTube API
const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
})

interface Song {
  title: string
  artist: string
  videoId?: string
  thumbnailUrl?: string
  duration?: string
}

// Regional music preferences and popular artists by country
const REGIONAL_CONTEXT = {
  US: "hip-hop, pop, country, R&B, Taylor Swift, Drake, Bad Bunny, SZA, Doja Cat",
  UK: "grime, brit-pop, garage, Central Cee, Harry Styles, Ed Sheeran, Dua Lipa, Stormzy",
  CA: "indie, alternative, The Weeknd, Drake, Tate McRae, Justin Bieber, Shawn Mendes",
  AU: "indie rock, electronic, Tame Impala, Flume, Sia, Vance Joy, Troye Sivan",
  IN: "Bollywood, indie pop, Divine, NUCLEYA, Prateek Kuhad, Anuv Jain, Armaan Malik",
  BR: "funk, sertanejo, MPB, Anitta, Luisa Sonza, Pabllo Vittar, Marília Mendonça",
  MX: "reggaeton, pop latino, Bad Bunny, Peso Pluma, Karol G, Natanael Cano",
  JP: "J-pop, city pop, Kenshi Yonezu, YOASOBI, King Gnu, Ado, Official HIGE DANDism",
  KR: "K-pop, indie, BTS, BLACKPINK, NewJeans, IVE, (G)I-DLE, IU",
  DE: "techno, rap, Capital Bra, Apache 207, Bonez MC, Peter Fox, AnnenMayKantereit",
  FR: "chanson, rap français, Stromae, Angèle, PNL, Orelsan, Dadju",
  ES: "reggaeton, pop español, Bad Gyal, C. Tangana, Rosalía, Lola Índigo",
  IT: "indie italiano, rap, Måneskin, Blanco, Pinguini Tattici Nucleari, Ghali",
  NL: "Dutch hip-hop, techno, Snelle, Davina Michelle, Kris Kross Amsterdam",
  SE: "pop, electronic, ABBA revival, Robyn, The Cardigans, Swedish House Mafia",
  NO: "indie pop, electronic, Aurora, Sigrid, Kygo, Alan Walker",
  PL: "disco polo, rap, Sanah, Daria Zawiałow, Taco Hemingway",
  RU: "pop, rap, Morgenshtern, Artik & Asti, Zivert, Monetochka",
  CN: "C-pop, indie, Joker Xue, G.E.M., Lexie Liu, Higher Brothers",
  TH: "T-pop, indie, BNK48, The Toys, Palmy, Slot Machine",
  PH: "OPM, pop, Ben&Ben, Moira Dela Torre, SB19, IV of Spades",
  ID: "dangdut, pop Indonesia, Raisa, Isyana Sarasvati, Noah, Weird Genius",
  MY: "Malaysian pop, indie, Yuna, SonaOne, Airliftz",
  SG: "Singaporean indie, pop, The Sam Willows, Gentle Bones",
  VN: "V-pop, indie, Sơn Tùng M-TP, Hoàng Thùy Linh, AMEE",
  AR: "rock nacional, cumbia, tango moderno, Chano, Tini, Paulo Londra",
  CL: "rock chileno, reggaeton, Mon Laferte, Camila Moreno",
  CO: "vallenato, reggaeton, Maluma, Karol G, Morat",
  PE: "cumbia, rock peruano, Eva Ayllón, Libido",
  ZA: "amapiano, kwaito, Burna Boy collaborations, Master KG, Kabza De Small",
  NG: "afrobeats, Burna Boy, Wizkid, Davido, Tems, Rema",
  EG: "shaabi, pop, Mohamed Ramadan, Sherine, Amr Diab",
  TR: "pop türk, rap, Hadise, Ezhel, Ceza, Sıla",
  IL: "mizrahi, pop, Netta, Static & Ben El Tavori, Omer Adam"
}

async function generateSongQueries(prompt: string, country?: string): Promise<Song[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Get regional context
    const regionalContext = country && REGIONAL_CONTEXT[country as keyof typeof REGIONAL_CONTEXT] 
      ? REGIONAL_CONTEXT[country as keyof typeof REGIONAL_CONTEXT]
      : "international popular music"

    // Much more specific and diverse prompt
    let userInput = `You are a music curator creating a diverse, current playlist. Generate exactly 8 songs for: "${prompt}"

CRITICAL REQUIREMENTS:
${country ? `- REGION: ${country} - Focus heavily on ${regionalContext}` : ''}
- TIME PERIOD: Prioritize 2022-2024 releases (60%), then 2020-2021 (30%), older hits only if iconic (10%)
- DIVERSITY: Different artists for each song - NO REPEATS
- GENRES: Mix at least 3-4 different genres/subgenres
- POPULARITY: Balance mainstream hits (50%) with quality deep cuts (50%)
- AVOID these overused songs: "Heat Waves", "Blinding Lights", "As It Was", "Stay", "Levitating", "Good 4 U"

SPECIFIC INSTRUCTIONS:
- Include trending TikTok songs and viral hits
- Add breakthrough artists and rising stars
- Consider regional charts and local favorites
${country ? `- Include artists singing in local languages when relevant` : ''}
- Mix tempos: uptempo bangers, mid-tempo vibes, some chill tracks
- Ensure songs are easily findable on YouTube

Return ONLY this exact JSON format with NO additional text:
[
  {"title": "Exact Song Title", "artist": "Exact Artist Name"},
  {"title": "Exact Song Title", "artist": "Exact Artist Name"},
  {"title": "Exact Song Title", "artist": "Exact Artist Name"},
  {"title": "Exact Song Title", "artist": "Exact Artist Name"},
  {"title": "Exact Song Title", "artist": "Exact Artist Name"},
  {"title": "Exact Song Title", "artist": "Exact Artist Name"},
  {"title": "Exact Song Title", "artist": "Exact Artist Name"},
  {"title": "Exact Song Title", "artist": "Exact Artist Name"}
]`

    console.log("Generating songs with prompt:", userInput.substring(0, 200) + "...")

    const result = await model.generateContent(userInput)
    const response = await result.response
    const text = response.text()
    
    console.log("Gemini response:", text.substring(0, 500) + "...")

    // More robust JSON parsing
    let cleanedText = text.trim()
    
    // Remove various markdown formats
    cleanedText = cleanedText.replace(/```json\n?/gi, "").replace(/```\n?/g, "")
    cleanedText = cleanedText.replace(/^json\n/gi, "")
    
    // Extract JSON array more reliably
    const jsonStart = cleanedText.indexOf('[')
    const jsonEnd = cleanedText.lastIndexOf(']')
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      throw new Error("No valid JSON array found")
    }
    
    const jsonString = cleanedText.substring(jsonStart, jsonEnd + 1)
    console.log("Extracted JSON:", jsonString)
    
    let songs: Song[]
    try {
      songs = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      // Try to fix common JSON issues
      const fixedJson = jsonString
        .replace(/'/g, '"')  // Replace single quotes
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      
      songs = JSON.parse(fixedJson)
    }

    // Validate and filter songs
    const validSongs = songs
      .filter((song) => song && song.title && song.artist)
      .filter((song) => typeof song.title === 'string' && typeof song.artist === 'string')
      .slice(0, 8) // Ensure max 8 songs

    if (validSongs.length === 0) {
      throw new Error("No valid songs found in response")
    }

    console.log("Generated songs:", validSongs.map(s => `${s.title} - ${s.artist}`))
    return validSongs

  } catch (error) {
    console.error("Error generating songs with Gemini:", error)
    
    // MUCH MORE DIVERSE fallback based on region and prompt
    const fallbackSongs = generateFallbackSongs(prompt, country)
    console.log("Using fallback songs:", fallbackSongs.map(s => `${s.title} - ${s.artist}`))
    return fallbackSongs
  }
}

function generateFallbackSongs(prompt: string, country?: string): Song[] {
  // Create diverse fallbacks based on prompt keywords and region
  const promptLower = prompt.toLowerCase()
  
  let fallbacks: Song[] = []
  
  // Regional fallbacks
  if (country === 'KR') {
    fallbacks = [
      { title: "Cupid", artist: "FIFTY FIFTY" },
      { title: "Flowers", artist: "Jessica" },
      { title: "Super Shy", artist: "NewJeans" },
      { title: "Get Up", artist: "NewJeans" },
      { title: "UNFORGIVEN", artist: "LE SSERAFIM" },
      { title: "God of Music", artist: "SEVENTEEN" },
    ]
  } else if (country === 'JP') {
    fallbacks = [
      { title: "アイドル", artist: "YOASOBI" },
      { title: "Kick Back", artist: "Kenshi Yonezu" },
      { title: "祝福", artist: "YOASOBI" },
      { title: "ミックスナッツ", artist: "Official髭男dism" },
      { title: "怪物", artist: "YOASOBI" },
      { title: "炎", artist: "LiSA" },
    ]
  } else if (country === 'IN') {
    fallbacks = [
      { title: "Kesariya", artist: "Arijit Singh" },
      { title: "Apna Bana Le", artist: "Arijit Singh" },
      { title: "Raataan Lambiyan", artist: "Tanishk Bagchi" },
      { title: "Excuses", artist: "AP Dhillon" },
      { title: "Brown Munde", artist: "AP Dhillon" },
      { title: "Insane", artist: "AP Dhillon" },
    ]
  } else if (country === 'BR') {
    fallbacks = [
      { title: "Envolver", artist: "Anitta" },
      { title: "Faking Love", artist: "Pabllo Vittar" },
      { title: "Girl From Rio", artist: "Anitta" },
      { title: "Todo Mundo Vai Sofrer", artist: "Marília Mendonça" },
      { title: "Batom de Cereja", artist: "Israel & Rodolffo" },
      { title: "Malvadão 3", artist: "Xamã" },
    ]
  } else {
    // Prompt-based fallbacks for other regions
    if (promptLower.includes('workout') || promptLower.includes('gym') || promptLower.includes('energy')) {
      fallbacks = [
        { title: "Industry Baby", artist: "Lil Nas X" },
        { title: "Physical", artist: "Dua Lipa" },
        { title: "Shut Up and Dance", artist: "Walk the Moon" },
        { title: "Thunder", artist: "Imagine Dragons" },
        { title: "Can't Stop", artist: "Red Hot Chili Peppers" },
        { title: "Pump It", artist: "Black Eyed Peas" },
      ]
    } else if (promptLower.includes('chill') || promptLower.includes('relax') || promptLower.includes('study')) {
      fallbacks = [
        { title: "Golden", artist: "Jill Scott" },
        { title: "Best Part", artist: "Daniel Caesar" },
        { title: "Come Through and Chill", artist: "Miguel" },
        { title: "Adorn", artist: "Miguel" },
        { title: "Stay Ready", artist: "Jhené Aiko" },
        { title: "Location", artist: "Khalid" },
      ]
    } else if (promptLower.includes('party') || promptLower.includes('dance') || promptLower.includes('club')) {
      fallbacks = [
        { title: "About Damn Time", artist: "Lizzo" },
        { title: "Break My Soul", artist: "Beyoncé" },
        { title: "I'm Good", artist: "David Guetta & Bebe Rexha" },
        { title: "Crazy What Love Can Do", artist: "David Guetta" },
        { title: "Friday", artist: "Riton x Nightcrawlers" },
        { title: "Pepas", artist: "Farruko" },
      ]
    } else {
      // Generic diverse fallbacks
      fallbacks = [
        { title: "vampire", artist: "Olivia Rodrigo" },
        { title: "Flowers", artist: "Miley Cyrus" },
        { title: "Creepin'", artist: "Metro Boomin" },
        { title: "Made You Look", artist: "Meghan Trainor" },
        { title: "Snap", artist: "Rosa Linn" },
        { title: "Running Up That Hill", artist: "Kate Bush" },
      ]
    }
  }
  
  // Ensure we have at least 6 songs
  while (fallbacks.length < 6) {
    fallbacks.push({ title: "Watermelon Sugar", artist: "Harry Styles" })
  }
  
  return fallbacks.slice(0, 8)
}

async function searchYouTubeVideo(query: string, country?: string): Promise<Partial<Song>> {
  try {
    // Multiple search strategies for better results
    const searchQueries = [
      `${query} official music video`,
      `${query} official video`,
      `${query} music video`,
      query // Fallback to original query
    ]

    for (const searchQuery of searchQueries) {
      try {
        const searchResponse = await youtube.search.list({
          q: searchQuery,
          part: ["id", "snippet"],
          maxResults: 5,
          type: ["video"],
          regionCode: country || "US",
          videoCategoryId: "10", // Music category
          safeSearch: "moderate",
          order: "relevance",
        })

        if (searchResponse.data.items && searchResponse.data.items.length > 0) {
          // Better filtering for music videos
          const items = searchResponse.data.items
          let bestMatch = items[0]
          
          // Scoring system for best match
          for (const item of items) {
            const title = item.snippet?.title?.toLowerCase() || ""
            const channelTitle = item.snippet?.channelTitle?.toLowerCase() || ""
            const description = item.snippet?.description?.toLowerCase() || ""
            
            let score = 0
            
            // Prefer official content
            if (channelTitle.includes("official") || channelTitle.includes("records") || 
                channelTitle.includes("music") || title.includes("official")) {
              score += 10
            }
            
            // Prefer music videos
            if (title.includes("music video") || title.includes("mv") || 
                title.includes("official video")) {
              score += 5
            }
            
            // Avoid live performances, covers, reactions
            if (title.includes("live") || title.includes("cover") || 
                title.includes("reaction") || title.includes("karaoke")) {
              score -= 5
            }
            
            // Prefer higher quality thumbnails (indicates official content)
            if (item.snippet?.thumbnails?.high?.url) {
              score += 2
            }
            
            if (score > 10) {
              bestMatch = item
              break
            }
          }

          const videoId = bestMatch.id?.videoId
          const thumbnailUrl = bestMatch.snippet?.thumbnails?.high?.url || 
                             bestMatch.snippet?.thumbnails?.default?.url

          // Get video duration
          let duration = "3:30"
          if (videoId) {
            try {
              const videoResponse = await youtube.videos.list({
                id: [videoId],
                part: ["contentDetails", "statistics"],
              })

              if (videoResponse.data.items && videoResponse.data.items.length > 0) {
                const videoData = videoResponse.data.items[0]
                const isoDuration = videoData.contentDetails?.duration
                if (isoDuration) {
                  const parsedDuration = parseISO8601Duration(isoDuration)
                  // Filter out very long videos (likely not music)
                  const [minutes] = parsedDuration.split(':').map(Number)
                  if (minutes <= 10) { // Most songs are under 10 minutes
                    duration = parsedDuration
                  }
                }
              }
            } catch (durationError) {
              console.error("Error fetching video duration:", durationError)
            }
          }

          if (videoId) {
            return {
              videoId,
              thumbnailUrl,
              duration,
            }
          }
        }
      } catch (searchError) {
        console.error(`Search error for query "${searchQuery}":`, searchError)
        continue // Try next search query
      }
    }

    return {}
  } catch (error) {
    console.error("Error searching YouTube:", error)
    return {}
  }
}

function parseISO8601Duration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return "3:30"

  const hours = Number.parseInt(match[1] || "0")
  const minutes = Number.parseInt(match[2] || "0")
  const seconds = Number.parseInt(match[3] || "0")

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for required API keys
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
    }

    const body = await request.json()
    const { prompt, country } = body

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Please provide a valid prompt" }, { status: 400 })
    }

    console.log(`Generating playlist for prompt: "${prompt}", country: ${country || 'none'}`)

    // Generate song queries using Gemini AI
    const songs = await generateSongQueries(prompt.trim(), country)

    if (songs.length === 0) {
      return NextResponse.json(
        { error: "Could not generate any songs. Please try a different prompt." },
        { status: 404 }
      )
    }

    // Search YouTube for each song with better error handling
    const playlistPromises = songs.map(async (song, index) => {
      try {
        const searchQuery = `${song.title} ${song.artist}`
        const youtubeData = await searchYouTubeVideo(searchQuery, country)

        return {
          id: `${Date.now()}-${index}`, // More unique ID
          title: song.title,
          artist: song.artist,
          videoId: youtubeData.videoId || null,
          thumbnailUrl: youtubeData.thumbnailUrl || "/placeholder.svg?height=200&width=200",
          duration: youtubeData.duration || "3:30",
          genre: "Music",
        }
      } catch (error) {
        console.error(`Error processing song ${song.title}:`, error)
        return null
      }
    })

    const playlistResults = await Promise.all(playlistPromises)
    
    // Filter out failed searches but keep songs without videoId for retry
    const playlist = playlistResults
      .filter(song => song !== null)
      .map(song => {
        // If no videoId found, we'll still return the song info
        if (!song.videoId) {
          song.videoId = "dQw4w9WgXcQ" // Fallback, but frontend should handle this
        }
        return song
      })

    if (playlist.length === 0) {
      return NextResponse.json(
        { error: "Could not find any matching songs on YouTube. Please try a different prompt." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      playlist: playlist,
      title: `Your "${prompt}" Playlist`,
      description: `${playlist.length} songs curated by AI${country ? ` for ${country}` : ''}`,
      generatedSongs: songs.length,
      foundVideos: playlist.filter(s => s.videoId && s.videoId !== "dQw4w9WgXcQ").length
    })
  } catch (error) {
    console.error("Error in generate-playlist API:", error)
    return NextResponse.json({ 
      error: "Failed to generate playlist. Please try again.",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
