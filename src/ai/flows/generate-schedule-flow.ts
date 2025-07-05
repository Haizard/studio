
'use server';
/**
 * @fileOverview A Genkit flow for generating a weekly class schedule.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getTenantConnection } from '@/lib/db';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import mongoose from 'mongoose';


// Define input and output schemas
export const GenerateScheduleInputSchema = z.object({
  schoolCode: z.string().describe("The code of the school for which to generate the schedule."),
  academicYearId: z.string().describe("The ID of the academic year."),
  classId: z.string().describe("The ID of the class."),
  instructions: z.string().optional().describe("Optional special instructions for the AI scheduler."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const PeriodSchema = z.object({
  dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be in HH:mm format."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be in HH:mm format."),
  subjectId: z.string().describe("The ID of the subject."),
  teacherId: z.string().describe("The ID of the assigned teacher."),
  location: z.string().optional().describe("The location/room for the period."),
});

export const GenerateScheduleOutputSchema = z.object({
  periods: z.array(PeriodSchema).describe("The generated list of timetable periods."),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;


// The exported function that will be called from the UI
export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}


async function getScheduleContext(schoolCode: string, classId: string, academicYearId: string) {
    const tenantDb = await getTenantConnection(schoolCode);
    if (!tenantDb.models.Class) tenantDb.model('Class', ClassModel.schema);
    if (!tenantDb.models.Teacher) tenantDb.model('Teacher', TeacherModel.schema);
    if (!tenantDb.models.Subject) tenantDb.model('Subject', SubjectModel.schema);
    if (!tenantDb.models.User) tenantDb.model('User', TenantUserSchemaDefinition);
    
    const Class = tenantDb.models.Class as mongoose.Model<IClass>;
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;

    // 1. Get Class details and its offered subjects
    const classInfo = await Class.findById(classId)
        .populate<{ subjectsOffered: ISubject[] }>('subjectsOffered')
        .lean();
    if (!classInfo || !classInfo.subjectsOffered || classInfo.subjectsOffered.length === 0) {
        throw new Error("Class not found or has no subjects offered. Please assign subjects to the class first.");
    }
    const subjects = classInfo.subjectsOffered;

    // 2. Get all teacher assignments for this class in the given academic year
    const teachersWithAssignments = await Teacher.find({ 
        'assignedClassesAndSubjects.classId': new mongoose.Types.ObjectId(classId),
        'assignedClassesAndSubjects.academicYearId': new mongoose.Types.ObjectId(academicYearId)
    }).populate<{ userId: ITenantUser }>('userId', 'firstName lastName').lean();
    
    // 3. Build the mapping of subjects to teachers for the prompt
    const subjectTeacherMap = new Map<string, { teacherId: string, teacherName: string }>();
    teachersWithAssignments.forEach(teacher => {
        teacher.assignedClassesAndSubjects.forEach(assignment => {
            if (assignment.classId.toString() === classId && assignment.academicYearId.toString() === academicYearId) {
                const userId = teacher.userId;
                if(userId) {
                    subjectTeacherMap.set(assignment.subjectId.toString(), {
                        teacherId: userId._id.toString(),
                        teacherName: `${userId.firstName} ${userId.lastName}`
                    });
                }
            }
        });
    });

    const subjectsForPrompt = subjects.map(s => ({
        id: s._id.toString(),
        name: s.name,
        teacher: subjectTeacherMap.get(s._id.toString()) || { teacherId: 'N/A', teacherName: 'Unassigned' }
    }));
    
    return {
        className: classInfo.name,
        subjects: subjectsForPrompt,
    };
}


const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async (input) => {
    
    const context = await getScheduleContext(input.schoolCode, input.classId, input.academicYearId);

    const prompt = `
      You are an expert school administrator tasked with creating a weekly class timetable.

      **Objective:** Generate a full 5-day (Monday-Friday) timetable for the class "${context.className}".
      
      **Input Data:**
      1.  **Subjects & Assigned Teachers:**
          \`\`\`json
          ${JSON.stringify(context.subjects, null, 2)}
          \`\`\`
      
      2.  **Scheduling Constraints & Rules:**
          - The school day runs from 08:00 to 15:00.
          - Each teaching period is exactly one hour long.
          - There is a mandatory lunch break from 12:00 to 13:00. No classes should be scheduled during this time.
          - The available time slots are: 08:00-09:00, 09:00-10:00, 10:00-11:00, 11:00-12:00, 13:00-14:00, 14:00-15:00.
          - Distribute the subjects as evenly as possible throughout the week. Try to avoid scheduling the same subject back-to-back on the same day if possible, unless there are too many subjects to fit otherwise.
          - A teacher can only teach one subject at a time. Do not schedule the same teacher for different subjects in the same time slot (this is implicitly handled by scheduling for one class, but be mindful).
          - Every time slot must be filled with a period.
          
      3.  **Special Instructions from the Administrator:**
          - ${input.instructions || "No special instructions provided."}

      **Your Task:**
      Based on all the information above, generate the complete weekly schedule. Your final output MUST be a JSON object that strictly adheres to the following structure: { "periods": [...] }.
      Each object inside the "periods" array must contain the following fields: "dayOfWeek", "startTime", "endTime", "subjectId", "teacherId".
      The "subjectId" and "teacherId" MUST correspond to the IDs provided in the input data.
    `;
    
    const { output } = await ai.generate({
        prompt,
        model: 'googleai/gemini-2.0-flash',
        output: { schema: GenerateScheduleOutputSchema },
        config: { temperature: 0.3 }
    });

    if (!output || !output.periods) {
      throw new Error("The AI failed to generate a schedule. It may have been unable to meet all constraints. Try simplifying your instructions.");
    }
    
    return output;
  }
);
