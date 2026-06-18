const delay = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const templates = [
  {
    title: (topic) => `${topic}: The Big Idea`,
    concept: (topic) =>
      `${topic} starts with a core principle that explains why the topic matters. Once learners understand that central idea, the smaller details become easier to connect and remember.`,
    fact: (topic) =>
      `A useful way to study ${topic} is to explain it aloud in one minute, then notice which parts feel unclear.`,
  },
  {
    title: (topic) => `${topic}: How It Works`,
    concept: (topic) =>
      `Most parts of ${topic} follow a cause-and-effect pattern. Looking for what changes, what stays the same, and what triggers the next step makes the topic feel more practical.`,
    fact: (topic) =>
      `Drawing a quick flow chart can make ${topic} much easier to recall later.`,
  },
  {
    title: (topic) => `${topic}: Why It Matters`,
    concept: (topic) =>
      `${topic} becomes memorable when it is tied to real examples. Connecting the idea to everyday decisions, experiments, or technology helps turn abstract facts into usable knowledge.`,
    fact: (topic) =>
      `Teachers often use analogies for ${topic} because familiar comparisons speed up understanding.`,
  },
];

export async function generateCard(topic, cardNumber) {
  await delay(850);

  const normalizedTopic = topic.trim();
  const template = templates[cardNumber - 1];

  return {
    cardNumber,
    title: template.title(normalizedTopic),
    keyConcept: template.concept(normalizedTopic),
    funFact: template.fact(normalizedTopic),
  };
}
