export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.MONDAY_API_KEY;
  if (!token) {
    return res.status(500).json({ error: "MONDAY_API_KEY not configured" });
  }

  const { query, variables } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Missing GraphQL query" });
  }

  try {
    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
        "API-Version": "2024-01",
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error_message || "monday.com API error" });
    }

    if (data.errors) {
      return res.status(400).json({ error: data.errors[0]?.message || "GraphQL error" });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}