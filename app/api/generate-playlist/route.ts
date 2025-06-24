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

// Current trending music context (updated regularly)
const TRENDING_CONTEXT_2024 = {
  global: {
    viral: "Sabrina Carpenter - Espresso, Chappell Roan - Good Luck Babe, Billie Eilish - Birds of a Feather, Shaboozey - A Bar Song, Benson Boone - Beautiful Things",
    tiktok: "APT by Bruno Mars & ROSÉ, Die With A Smile by Lady Gaga & Bruno Mars, I Am Music by Alicia Keys, Austin by Dasha",
    albums: "The Tortured Poets Department - Taylor Swift, Hit Me Hard and Soft - Billie Eilish, Short n Sweet - Sabrina Carpenter"
  },
  regional: {
    US: "Shaboozey, Zach Bryan, Morgan Wallen, Chappell Roan, Sabrina Carpenter, Post Malone",
    UK: "Central Cee, Dave, ArrDee, Cat Burns, PinkPantheress, Fred again..",
    KR: "aespa - Supernova, (G)I-DLE - Klaxon, SEVENTEEN - God of Music, NewJeans - Get Up",
    JP: "YOASOBI - アイドル, Mrs.GREEN APPLE, King Gnu, Ado - 唱, Official髭男dism",
    IN: "AP Dhillon, Divine, Diljit Dosanjh, Arijit Singh, Raftaar, Badshah",
    BR: "Anitta, Luísa Sonza, Pabllo Vittar, Ludmilla, Kevinho, MC Ryan SP",
    ES: "Bad Gyal, C.Tangana, Rosalía, Quevedo, Bizarrap, Rauw Alejandro"
  }
}

async function generateOptimizedSearchQueries(prompt: string, country?: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Get current date context
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    // Regional trending context
    const regionalTrending = country && TRENDING_CONTEXT_2024.regional[country as keyof typeof TRENDING_CONTEXT_2024.regional]
      ? TRENDING_CONTEXT_2024.regional[country as keyof typeof TRENDING_CONTEXT_2024.regional]
      : TRENDING_CONTEXT_2024.global.viral

    const systemPrompt = `You are a music expert with knowledge of current trends as of ${currentDate}. 

CURRENT TRENDING CONTEXT (June 2024):
- Global Viral: ${TRENDING_CONTEXT_2024.global.viral}
- TikTok Popular: ${TRENDING_CONTEXT_2024.global.tiktok}
- Major Albums: ${TRENDING_CONTEXT_2024.global.albums}
${country ? `- ${country} Regional: ${regionalTrending}` : ''}

User wants: "${prompt}"

Generate 10-12 YouTube search queries that will find diverse, current music matching their request. 
Each query should be optimized for YouTube search to find official music videos.

IMPORTANT RULES:
1. Use trending artists from the context above when relevant
2. Mix 70% recent hits (2023-2024) with 30% classics that fit the vibe
3. Each query should be different artist - NO REPEATS
4. Format: "Artist Name Song Title official music video" or "Artist Name Song Title"
5. Consider the user's prompt mood/genre but include trending context

Return ONLY a JSON array of search query strings:
["query1", "query2", "query3", ...]`

    const result = await model.generateContent(systemPrompt)
    const response = await result.response
    const text = response.text()
    
    console.log("Generated search queries response:", text.substring(0, 300))

    // Clean and parse the response
    let cleanedText = text.trim()
    cleanedText = cleanedText.replace(/```json\n?/gi, "").replace(/```\n?/g, "")
    
    const jsonStart = cleanedText.indexOf('[')
    const jsonEnd = cleanedText.lastIndexOf(']')
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON array found in response")
    }
    
    const jsonString = cleanedText.substring(jsonStart, jsonEnd + 1)
    const queries: string[] = JSON.parse(jsonString)
    
    // Validate and clean queries
    const validQueries = queries
      .filter(q => typeof q === 'string' && q.trim().length > 0)
      .map(q => q.trim())
      .slice(0, 12) // Limit to 12 queries max
    
    console.log("Generated queries:", validQueries)
    return validQueries

  } catch (error) {
    console.error("Error generating search queries:", error)
    
    // Simple fallback queries based on prompt
    const promptLower = prompt.toLowerCase()
    let fallbackQueries: string[] = []
    
    if (promptLower.includes('workout') || promptLower.includes('gym')) {
      fallbackQueries = [
        "Sabrina Carpenter Espresso official music video",
        "Dua Lipa Physical official video",
        "The Weeknd Blinding Lights",
        "Doja Cat Paint The Town Red",
        "Post Malone rockstar",
        "Travis Scott SICKO MODE"
      ]
    } else if (promptLower.includes('chill') || promptLower.includes('relax')) {
      fallbackQueries = [
        "Billie Eilish Birds of a Feather official",
        "SZA Good Days official music video",
        "Daniel Caesar Best Part",
        "Kali Uchis telepatía official video",
        "Rex Orange County Sunflower",
        "Clairo Sofia official video"
      ]
    } else {
      // General trending fallback
      fallbackQueries = [
        "Sabrina Carpenter Espresso official music video",
        "Chappell Roan Good Luck Babe official",
        "Billie Eilish Birds of a Feather",
        "Bruno Mars Lady Gaga Die With A Smile",
        "Shaboozey A Bar Song official",
        "Benson Boone Beautiful Things official"
      ]
    }
    
    return fallbackQueries
  }
}

async function batchSearchYouTube(queries: string[], country?: string): Promise<Song[]> {
  try {
    console.log(`Executing single batch YouTube search for ${queries.length} queries`)
    
    // Single API call with multiple queries combined
    const combinedQuery = queries.slice(0, 10).join(' | ') // Combine first 10 queries
    
    const searchResponse = await youtube.search.list({
      q: combinedQuery,
      part: ["id", "snippet"],
      maxResults: 15, // Get more results to have options
      type: ["video"],
      regionCode: country || "US",
      videoCategoryId: "10", // Music category
      safeSearch: "moderate",
      order: "relevance",
    })

    const results: Song[] = []
    
    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      // Process results and extract song info
      for (const item of searchResponse.data.items) {
        if (results.length >= 12) break // Limit results
        
        const title = item.snippet?.title || "Unknown Title"
        const channelTitle = item.snippet?.channelTitle || "Unknown Artist"
        const videoId = item.id?.videoId
        const thumbnailUrl = item.snippet?.thumbnails?.high?.url || 
                           item.snippet?.thumbnails?.default?.url
        
        // Filter out non-music content
        const titleLower = title.toLowerCase()
        if (titleLower.includes('reaction') || 
            titleLower.includes('tutorial') ||
            titleLower.includes('gameplay') ||
            titleLower.includes('review')) {
          continue
        }
        
        // Extract artist and song from title
        const { artist, songTitle } = extractArtistAndTitle(title, channelTitle)
        
        if (videoId && artist && songTitle) {
          results.push({
            title: songTitle,
            artist: artist,
            videoId: videoId,
            thumbnailUrl: thumbnailUrl || "/placeholder.svg?height=200&width=200",
            duration: "3:30" // Default duration to avoid extra API calls
          })
        }
      }
    }
    
    console.log(`Found ${results.length} songs from single API call`)
    return results
    
  } catch (error) {
    console.error("Error in batch YouTube search:", error)
    return []
  }
}

function extractArtistAndTitle(videoTitle: string, channelTitle: string): { artist: string, songTitle: string } {
  // Clean the video title
  let cleanTitle = videoTitle
    .replace(/\(Official Music Video\)/gi, '')
    .replace(/\(Official Video\)/gi, '')
    .replace(/\(Music Video\)/gi, '')
    .replace(/\[Official.*?\]/gi, '')
    .replace(/official/gi, '')
    .replace(/music video/gi, '')
    .trim()
  
  // Common patterns for artist - title separation
  let artist = channelTitle
  let songTitle = cleanTitle
  
  // Pattern: Artist - Song
  if (cleanTitle.includes(' - ')) {
    const parts = cleanTitle.split(' - ')
    if (parts.length >= 2) {
      artist = parts[0].trim()
      songTitle = parts.slice(1).join(' - ').trim()
    }
  }
  // Pattern: Artist: Song
  else if (cleanTitle.includes(': ')) {
    const parts = cleanTitle.split(': ')
    if (parts.length >= 2) {
      artist = parts[0].trim()
      songTitle = parts.slice(1).join(': ').trim()
    }
  }
  // Pattern: "Song" by Artist
  else if (cleanTitle.toLowerCase().includes(' by ')) {
    const parts = cleanTitle.split(/ by /i)
    if (parts.length >= 2) {
      songTitle = parts[0].trim().replace(/"/g, '')
      artist = parts[1].trim()
    }
  }
  
  // Clean up extracted data
  artist = artist.replace(/VEVO$|Records$|Music$|Official$/gi, '').trim()
  songTitle = songTitle.replace(/^"|"$/g, '').trim() // Remove quotes
  
  return {
    artist: artist || "Unknown Artist",
    songTitle: songTitle || cleanTitle
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

    console.log(`Generating playlist for: "${prompt}", country: ${country || 'global'}`)

    // Step 1: AI generates optimized search queries (1 Gemini API call)
    const searchQueries = await generateOptimizedSearchQueries(prompt.trim(), country)
    
    if (searchQueries.length === 0) {
      return NextResponse.json({ error: "Could not generate search queries" }, { status: 500 })
    }

    // Step 2: Single batch YouTube search (1 YouTube API call)
    const songs = await batchSearchYouTube(searchQueries, country)
    
    if (songs.length === 0) {
      return NextResponse.json({ 
        error: "No songs found. Please try a different prompt." 
      }, { status: 404 })
    }

    // Step 3: Format response
    const playlist = songs.map((song, index) => ({
      id: `${Date.now()}-${index}`,
      title: song.title,
      artist: song.artist,
      videoId: song.videoId,
      thumbnailUrl: song.thumbnailUrl,
      duration: song.duration,
      genre: "Music"
    }))

    console.log(`Generated playlist with ${playlist.length} songs using minimal API calls`)

    return NextResponse.json({
      success: true,
      playlist: playlist,
      title: `Your "${prompt}" Playlist`,
      description: `${playlist.length} AI-curated songs with trending context`,
      apiCallsUsed: {
        gemini: 1,
        youtube: 1
      }
    })

  } catch (error) {
    console.error("Error in optimized playlist API:", error)
    return NextResponse.json({ 
      error: "Failed to generate playlist. Please try again.",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
