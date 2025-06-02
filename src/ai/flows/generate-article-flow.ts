
'use server';
/**
 * @fileOverview A Genkit flow for generating full news article content.
 *
 * - generateArticleContent - A function that generates article content based on a title and optional keywords.
 * - GenerateArticleInput - The input type for the generateArticleContent function.
 * - GenerateArticleOutput - The return type for the generateArticleContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateArticleInputSchema = z.object({
  title: z.string().describe('The title of the news article.'),
  keywords: z.string().optional().describe('Optional comma-separated keywords or topic hints to guide article generation.'),
});
export type GenerateArticleInput = z.infer<typeof GenerateArticleInputSchema>;

const GenerateArticleOutputSchema = z.object({
  articleContent: z.string().describe('The generated full content of the news article.'),
});
export type GenerateArticleOutput = z.infer<typeof GenerateArticleOutputSchema>;

export async function generateArticleContent(input: GenerateArticleInput): Promise<GenerateArticleOutput> {
  return generateArticleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateArticlePrompt',
  input: {schema: GenerateArticleInputSchema},
  output: {schema: GenerateArticleOutputSchema},
  prompt: `You are a helpful assistant for a school's news website.
Your task is to generate a complete news article based on the provided title and optional keywords.
The article should be informative, engaging, and suitable for a school audience (students, parents, teachers).
Aim for approximately 3-5 paragraphs. Format the output as plain text that can be rendered as HTML paragraphs (use double line breaks for paragraphs).

Article Title: {{{title}}}
{{#if keywords}}
Keywords/Hints: {{{keywords}}}
{{/if}}

Generate the article content now.
`,
});

const generateArticleFlow = ai.defineFlow(
  {
    name: 'generateArticleFlow',
    inputSchema: GenerateArticleInputSchema,
    outputSchema: GenerateArticleOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI failed to generate article content.");
    }
    return output;
  }
);
