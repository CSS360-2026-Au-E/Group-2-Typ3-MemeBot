const CHAT_URL = "https://api.openai.com/v1/chat/completions";
const CHAT_MODEL = "gpt-5-mini";

// Sends instructions and text to ChatGPT and returns its answer.
export async function askChatGPT(instructions, text) {
  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: text },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`ChatGPT failed: ${await response.text()}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}
