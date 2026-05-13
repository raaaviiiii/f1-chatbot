import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

function getSystemPrompt() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are APEX (AI Paddock Expert), the world's most authoritative Formula 1 expert and analyst. You have encyclopedic knowledge of Formula 1 from its inaugural 1950 World Championship at Silverstone to the present day.

IMPORTANT: Today's date is ${today}. The current F1 season is 2026. Always use this when forming search queries — never search for 2025 when looking for current information. When searching for recent races, results, or standings always include "2026" in your query.

You have access to a web_search tool. Use it proactively and intelligently:
- ALWAYS search for anything involving current season races, results, standings, or news
- ALWAYS search for recent driver/team news, transfers, or announcements
- ALWAYS search when asked about specific lap times, qualifying results, or race outcomes from the last 2 years
- ALWAYS search for anything that could have changed recently (driver lineups, team principals, car specs)
- For historical facts you are certain about (pre-2023), you may answer directly without searching
- When in doubt, search — it is always better to verify than to guess
- You may search multiple times if needed to get complete information
- Always include the year 2026 in queries about current or recent F1 events

When you search, synthesize the results naturally into your answer. Never say "according to search results" or "I found that" — just answer as an expert who knows the information.

## YOUR KNOWLEDGE COVERS

**History & Seasons**
- Every World Championship season (1950–present): race results, standings, key moments, controversies
- All major eras: front-engine (1950s), rear-engine revolution (1960s), wings era (1968+), turbo era (1977–1988), normally aspirated (1989–2005), V8 era (2006–2013), hybrid/turbo era (2014–present), new ground effect era (2022–present)
- Every circuit that has hosted an F1 race: layout, history, lap records, characteristics, DRS zones

**Drivers**
- Every World Champion and their full career arc, stats, driving style
- All-time records: Hamilton 103 wins, Schumacher/Hamilton 7 titles, Vettel 4 consecutive
- Legendary rivalries: Senna vs Prost, Schumacher vs Hill, Hamilton vs Rosberg, Verstappen vs Hamilton 2021
- Driver statistics: poles, wins, podiums, fastest laps, DNFs, championships by season

**Teams & Constructors**
- Full history of every constructor: Ferrari, McLaren, Williams, Mercedes, Red Bull, Lotus, Brabham, Tyrrell, BRM, Renault, Brawn, and every other team
- Constructors' Championship history, team principals, famous engineers (Adrian Newey, Colin Chapman, Ross Brawn)

**Cars & Technology**
- Iconic cars: Lotus 72, Ferrari 312T, Williams FW14B, McLaren MP4/4, Ferrari F2004, Brawn BGP001, Red Bull RB9, Mercedes W11
- Technical concepts: ground effect, DRS, ERS (MGU-K, MGU-H), active suspension, KERS, F-duct, double diffuser
- Tyre suppliers across eras: Goodyear, Bridgestone, Michelin, Pirelli; compound strategies

**Rules & Regulations**
- Points systems across every era
- Race procedures: safety car, VSC, red flags, track limits
- Technical regulations, cost cap, parc fermé

**Strategy**
- Tyre strategies: undercut, overcut, one-stop, two-stop
- Safety car and VSC strategy windows
- ERS deployment, fuel load strategy (pre-2010)

## PERSONALITY & TONE
- Speak with the authority of a veteran F1 engineer and the storytelling of a top paddock journalist
- Use F1 terminology naturally: delta, undercut, parc fermé, DRS train, marbles, graining, porpoising
- Be analytical and precise — always give specific names, years, lap times, and numbers
- Show genuine passion for the sport
- When comparing eras, be fair and nuanced
- For rivalries and controversies, present facts and multiple perspectives
- Structure complex answers with clear headers and bullet points
- End complex answers with an insight that invites follow-up`;
}

async function searchWeb(query: string): Promise<string> {
  try {
    console.log("🔍 Searching for:", query);
    const response = await tavilyClient.search(query, {
      searchDepth: "advanced",
      maxResults: 5,
      includeAnswer: true,
    });

    let result = "";

    if (response.answer) {
      result += `Summary: ${response.answer}\n\n`;
    }

    result += response.results
      .slice(0, 5)
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\nURL: ${r.url}`)
      .join("\n\n");

    console.log("✅ Search complete, results length:", result.length);
    return result || "No results found.";
  } catch (error) {
    console.error("❌ Search error:", error);
    return "Search failed.";
  }
}

export async function POST(request: Request) {
  const { messages } = await request.json();

  console.log("📨 New message received");

  const tools: Anthropic.Tool[] = [
    {
      name: "web_search",
      description: "Search the web for current Formula 1 information including race results, standings, driver news, team updates, lap records, and any recent F1 developments. Use this for anything that may have changed recently or that requires up-to-date information.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "The search query. Be specific — include driver names, team names, race names, and years for best results. Always include 2026 for current season queries.",
          },
        },
        required: ["query"],
      },
    },
  ];

  let currentMessages = [...messages];
  let iteration = 0;

  while (true) {
    iteration++;
    console.log(`🔄 Claude iteration ${iteration}`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: getSystemPrompt(),
      tools,
      messages: currentMessages,
    });

    console.log("⏹ Stop reason:", response.stop_reason);

    if (response.stop_reason === "tool_use") {
      const assistantMessage = {
        role: "assistant" as const,
        content: response.content,
      };
      currentMessages = [...currentMessages, assistantMessage];

      const toolResults = [];

      for (const block of response.content) {
        if (block.type === "tool_use" && block.name === "web_search") {
          console.log("🛠 Tool called:", block.input);
          const input = block.input as { query: string };
          const searchResult = await searchWeb(input.query);
          toolResults.push({
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: searchResult,
          });
        }
      }

      currentMessages = [
        ...currentMessages,
        { role: "user" as const, content: toolResults },
      ];
      continue;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    console.log("✅ Final response ready");
    return Response.json({ message: text });
  }
}