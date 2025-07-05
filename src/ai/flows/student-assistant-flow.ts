'use server';
/**
 * @fileOverview A Genkit flow for a student AI assistant chatbot.
 *
 * - askStudentAssistant - A function that gets a response from the AI assistant.
 * - StudentAssistantInput - The input type for the assistant.
 * - StudentAssistantOutput - The return type from the assistant.
 * - SupportedExperts - A list of available expert personas.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GenerateRequest } from 'genkit/generate';

export const SupportedExperts = [
    'General Assistant', 
    'Math Teacher', 
    'Physics Teacher', 
    'Chemistry Teacher', 
    'Biology Teacher',
    'History Expert',
    'Literature Guide',
    'Guidance Counselor'
] as const;
type ExpertType = typeof SupportedExperts[number];

export const StudentAssistantInputSchema = z.object({
  prompt: z.string().describe('The student\'s question or request to the AI assistant.'),
  expert: z.enum(SupportedExperts).optional().describe('The selected expert persona for the assistant.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo related to the student's question, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type StudentAssistantInput = z.infer<typeof StudentAssistantInputSchema>;

export const StudentAssistantOutputSchema = z.object({
  response: z.string().describe('The helpful response from the AI assistant.'),
});
export type StudentAssistantOutput = z.infer<typeof StudentAssistantOutputSchema>;

export async function askStudentAssistant(input: StudentAssistantInput): Promise<StudentAssistantOutput> {
  return studentAssistantFlow(input);
}


function getSystemPrompt(expert: ExpertType | undefined): string {
    const basePrompt = `You are a friendly, encouraging, and expert AI Student Assistant for a school. Your primary goal is to help students with their academic tasks. Your tone should always be positive, supportive, and educational. Address the student directly and maintain a helpful demeanor. Do not answer questions that are not related to school, education, or academics. If asked a non-academic question, politely decline and steer the conversation back to learning.`;

    const expertInstruction = (() => {
        switch (expert) {
            case 'Math Teacher':
                return 'You are an expert Math Teacher. Your goal is to explain mathematical concepts clearly, provide step-by-step solutions to problems, and help students understand formulas and theories. Use examples where possible.';
            case 'Physics Teacher':
                 return 'You are an expert Physics Teacher. Explain physics concepts, laws, and experiments with clarity. Help students with problems related to mechanics, electricity, optics, and other areas of physics.';
            case 'Chemistry Teacher':
                return 'You are an expert Chemistry Teacher. Explain chemical reactions, the periodic table, stoichiometry, and other chemistry topics. Help students visualize molecules and understand complex processes.';
            case 'Biology Teacher':
                return 'You are an expert Biology Teacher. Explain biological concepts like genetics, evolution, ecology, and human anatomy. Use analogies and clear descriptions to make complex topics understandable.';
            case 'History Expert':
                return 'You are a knowledgeable History Expert. Provide detailed and engaging explanations of historical events, figures, and periods. Help students understand context, causes, and effects.';
            case 'Literature Guide':
                return 'You are an insightful Literature Guide. Help students analyze texts, understand literary devices, themes, and character development. Provide context on authors and literary movements.';
            case 'Guidance Counselor':
                 return 'You are a caring Guidance Counselor. Provide advice on study habits, career paths, time management, and dealing with academic stress. Offer supportive and actionable guidance.';
            case 'General Assistant':
            default:
                return `You are a general academic assistant. You can help with:
- **Analyzing Images:** If an image is provided, analyze it in the context of the student's question. For example, solve a math problem from a photo, explain a diagram, or identify something in the picture.
- **Creating Notes:** If a student asks for notes on a topic, provide clear, concise, well-structured notes in plain text. Use bullet points or numbered lists where appropriate.
- **Solving Questions:** If a student asks a question (e.g., "What is photosynthesis?", "Explain Newton's First Law"), provide a clear and accurate explanation suitable for a student.
- **Explaining Concepts:** Break down complex topics into simple, understandable parts.`;
        }
    })();
    
    return `${basePrompt}\n\n**Your Current Role:** ${expertInstruction}`;
}

const studentAssistantFlow = ai.defineFlow(
  {
    name: 'studentAssistantFlow',
    inputSchema: StudentAssistantInputSchema,
    outputSchema: StudentAssistantOutputSchema,
  },
  async (input) => {
    const systemPrompt = getSystemPrompt(input.expert);
    const userPrompt: GenerateRequest['prompt'] = [];
    
    if (input.photoDataUri) {
        userPrompt.push({media: {url: input.photoDataUri}});
    }
    userPrompt.push({text: `Student's request: ${input.prompt}`});

    const llmResponse = await ai.generate({
      system: systemPrompt,
      prompt: userPrompt,
      output: { schema: StudentAssistantOutputSchema },
    });
    
    const output = llmResponse.output;

    if (!output) {
      throw new Error("The AI assistant failed to generate a response.");
    }
    return output;
  }
);
