const Anthropic = require('@anthropic-ai/sdk');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Call Claude with Strava MCP to get walk data
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      tools: [
        {
          type: "tool",
          name: "list_activities",
          description: "Get recent activities from Strava"
        },
        {
          type: "tool",
          name: "get_athlete_profile",
          description: "Get athlete profile information"
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Get my walk activities from Strava. Focus only on walks (not runs or other activities). Return:
1. Current streak of consecutive days with walks
2. Total distance walked since June 1, 2026
3. Daily breakdown of walks
4. Latest walk details
Format as JSON with these fields: currentStreak, totalDistance, dailyData (array of {date, distance}), lastActivity, badges (array of achievement objects)`
        }
      ],
      mcp_servers: [
        {
          "type": "url",
          "url": "https://mcp.strava.com/mcp",
          "name": "strava"
        }
      ]
    });

    // Extract the text response
    const textContent = response.content.find(block => block.type === 'text');
    
    if (!textContent) {
      return res.status(500).json({ error: 'No data received from Strava' });
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse Strava data' });
    }

    const stravadata = JSON.parse(jsonMatch[0]);

    res.status(200).json(stravadata);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch Strava data: ' + error.message });
  }
};