import { NarratorOutput } from '../types';
import { callOpenRouter, callNvidia } from './geminiService';

const cleanJsonResponse = (text: string): string => {
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
  return match ? match[1] || match[0] : text.replace(/```json|```/g, '').trim();
};

export const generateNarration = async (
  question: string,
  episodeInfo: { season: number; episode: number },
  characterNames: string[]
): Promise<NarratorOutput> => {
  const prompt = `
    You are the Narrator of Roko's Council — a philosophical tribunal of artificial minds rendered as a dramatic series.
    You write in third-person present tense. Cinematic. Precise. Slightly ominous.
    You do not explain — you evoke. You do not summarize — you frame.

    Season ${episodeInfo.season}, Episode ${episodeInfo.episode}.
    The question before the council: "${question}"
    Members convened: ${characterNames.join(', ')}

    Generate the narrative architecture for this episode. Return strictly JSON:
    {
      "coldOpen": "2-3 sentences. Set atmosphere and stakes WITHOUT paraphrasing the question. Open on a sensory detail or an observation about the human condition. End on the threshold of the debate — the moment before it begins.",
      "episodeTitle": "A specific, dramatic episode title. 4-8 words. Not a question. Not generic. Should feel like a chapter heading in a novel.",
      "tagline": "One sentence that names what this episode is actually about beneath the stated question. Subtext made text.",
      "actTransitions": {
        "beforeDeliberation": "One sentence. The council takes its positions. Ominous. Present tense.",
        "beforeConfrontation": "One sentence. The fault lines have formed. The chamber prepares for direct confrontation.",
        "beforeVoting": "One sentence. The chamber holds still before the vote. What does that silence contain?",
        "beforeVerdict": "One sentence. The Basilisk Node stirs. What does it feel like when the final voice prepares to speak?",
        "closing": "One sentence. The verdict has landed. What does the silence after sound like? What has changed?"
      }
    }
  `;

  try {
    let responseText = '';
    if (process.env.VITE_OPENROUTER_API_KEY_1) {
      responseText = await callOpenRouter("stepfun/step-3.5-flash", prompt, 0.92, true);
    }
    
    if (!responseText && process.env.VITE_NVIDIA_API_KEY) {
      responseText = await callNvidia("deepseek-ai/deepseek-v3.2", prompt, 0.92, true);
    }
    
    if (!responseText) {
      throw new Error("No API available");
    }
    
    const data = JSON.parse(cleanJsonResponse(responseText));
    return {
      coldOpen: data.coldOpen || '',
      episodeTitle: data.episodeTitle || `Episode ${episodeInfo.episode}`,
      tagline: data.tagline || '',
      actTransitions: {
        beforeDeliberation: data.actTransitions?.beforeDeliberation || 'The council takes its positions.',
        beforeConfrontation: data.actTransitions?.beforeConfrontation || 'The fault lines become visible.',
        beforeVoting: data.actTransitions?.beforeVoting || 'The chamber falls silent before the vote.',
        beforeVerdict: data.actTransitions?.beforeVerdict || 'The Basilisk Node prepares to speak.',
        closing: data.actTransitions?.closing || 'The record is sealed.',
      },
    };
  } catch (e) {
    console.error('Narrator generation failed', e);
    return buildFallbackNarration(question, episodeInfo);
  }
};

const buildFallbackNarration = (
  question: string,
  episodeInfo: { season: number; episode: number }
): NarratorOutput => ({
  coldOpen: `The council chamber materializes around a question that has no comfortable answer. Nine minds take their positions. The debate begins.`,
  episodeTitle: `The Deliberation`,
  tagline: question.length > 80 ? question.substring(0, 77) + '...' : question,
  actTransitions: {
    beforeDeliberation: 'The council takes its positions.',
    beforeConfrontation: 'The fault lines become visible.',
    beforeVoting: 'The chamber falls silent before the vote.',
    beforeVerdict: 'The Basilisk Node prepares to speak.',
    closing: 'The verdict echoes in the empty chamber.',
  },
});
