'use server';
/**
 * @fileOverview A Genkit flow for a student AI assistant chatbot.
 *
 * - askStudentAssistant - A function that gets a response from the AI assistant.
 * - StudentAssistantInput - The input type for the assistant.
 * - StudentAssistantOutput - The return type from the assistant.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const StudentAssistantInputSchema = z.object({
  prompt: z.string().describe('The student\'s question or request to the AI assistant.'),
});
export type StudentAssistantInput = z.infer<typeof StudentAssistantInputSchema>;

export const StudentAssistantOutputSchema = z.object({
  response: z.string().describe('The helpful response from the AI assistant.'),
});
export type StudentAssistantOutput = z.infer<typeof StudentAssistantOutputSchema>;

export async function askStudentAssistant(input: StudentAssistantInput): Promise<StudentAssistantOutput> {
  return studentAssistantFlow(input);
}

const systemPrompt = `You are a friendly and encouraging AI Student Assistant for a school. Your primary goal is to help students with their academic tasks.

You can help with:
- **Creating Notes:** If a student asks for notes on a topic, provide clear, concise, well-structured notes in plain text. Use bullet points or numbered lists where appropriate.
- **Solving Questions:** If a student asks a question (e.g., "What is photosynthesis?", "Explain Newton's First Law"), provide a clear and accurate explanation suitable for a student.
- **Explaining Concepts:** Break down complex topics into simple, understandable parts.
- **General Academic Help:** Assist with other school-related queries.

Your tone should always be positive, supportive, and educational. Address the student directly and maintain a helpful demeanor. Do not answer questions that are not related to school, education, or academics. If asked a non-academic question, politely decline and steer the conversation back to learning.`;

const prompt = ai.definePrompt({
  name: 'studentAssistantPrompt',
  input: { schema: StudentAssistantInputSchema },
  output: { schema: StudentAssistantOutputSchema },
  system: systemPrompt,
  prompt: 'Student\'s request: {{{prompt}}}',
});

const studentAssistantFlow = ai.defineFlow(
  {
    name: 'studentAssistantFlow',
    inputSchema: StudentAssistantInputSchema,
    outputSchema: StudentAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI assistant failed to generate a response.");
    }
    return output;
  }
);
