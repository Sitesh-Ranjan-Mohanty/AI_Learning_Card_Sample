const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const getGeminiEndpoint = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const buildPrompt = (topic, cardNumber) => `
Create learning card ${cardNumber} of 3 for the topic "${topic}".

Return only valid JSON using this exact shape:
{
  "title": "short card title",
  "keyConcept": "one or two clear sentences explaining the main concept",
  "funFact": "one concise interesting fact or memory hook"
}

Make card ${cardNumber} distinct from the other cards a learner would receive.
`;

const extractJson = (text) => {
  const trimmedText = text.trim();
  const fencedMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch ? fencedMatch[1].trim() : trimmedText;
  return JSON.parse(jsonText);
};

const validateGeneratedCard = (card) => {
  if (
    !card ||
    typeof card.title !== 'string' ||
    typeof card.keyConcept !== 'string' ||
    typeof card.funFact !== 'string'
  ) {
    throw new Error('Gemini returned an unexpected card format.');
  }
};

export async function generateCard(topic, cardNumber) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Missing Gemini API key. Set GEMINI_API_KEY before generating cards.',
    );
  }

  const normalizedTopic = topic.trim();
  const response = await fetch(getGeminiEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildPrompt(normalizedTopic, cardNumber),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || 'Gemini card generation failed.';
    throw new Error(message);
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  const card = extractJson(text);
  validateGeneratedCard(card);

  return {
    cardNumber,
    title: card.title.trim(),
    keyConcept: card.keyConcept.trim(),
    funFact: card.funFact.trim(),
  };
}
