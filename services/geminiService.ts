
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, AttendanceStatus, Student } from "../types";

// Helper to safely get API Key without crashing in browser environments
const getApiKey = () => {
  try {
    // Check local storage first (user setting)
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey) return localKey;

    // Check Vite/Modern env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }

    // Check Legacy/Node env (careful check to avoid ReferenceError)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore errors during key retrieval
  }
  return '';
};

// Initialize default instance
const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY_FOR_INIT' });

/**
 * Helpers to get file data
 */
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  // Validate supported MIME types for Gemini
  const supportedMimeTypes = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'text/html'
  ];
  
  const isImage = file.type.startsWith('image/');
  const isAudio = file.type.startsWith('audio/');
  const isSupportedDoc = supportedMimeTypes.includes(file.type) || file.name.endsWith('.txt') || file.name.endsWith('.csv');

  if (!isImage && !isAudio && !isSupportedDoc) {
    throw new Error(`Unsupported file type: ${file.type}. Please upload an Image, Audio, PDF, or Text file.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type || 'text/plain', // Default to text for .txt files
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Generic analysis prompt builder
 */
const getAnalysisPrompt = (students: Student[], context: string) => {
    const studentContext = JSON.stringify(students.map(s => ({ rollNo: s.rollNo, name: s.name })));
    return `
    You are an attendance assistant. I am providing ${context}.
    Here is the master list of students in the class: ${studentContext}.
    
    Please analyze the input to extract:
    1. The Class Name (e.g., "Class 10", "ARE", "CSE-B").
    2. The Date (if mentioned/written). Format YYYY-MM-DD. Assume DD/MM/YY if ambiguous.
    3. The Session (if mentioned). Look for "FN", "Forenoon", "AN", "Afternoon".
    4. Attendance status of students.
    
    Rules for Status:
    - If the input lists "Absentees" or "Absent", mark those specific students as ABSENT and everyone else PRESENT.
    - If the input lists "Present" students, mark everyone else ABSENT.
    - If status is explicit next to names/rolls, use that.
    
    Return a JSON array of objects with:
    - 'rollNo': Match to the master list.
    - 'status': "PRESENT" or "ABSENT".
    - 'date': "YYYY-MM-DD" or null.
    - 'session': "FORENOON" or "AFTERNOON" or null.
    - 'className': The extracted class name or null.
  `;
}

/**
 * Analyzes an image of a handwritten list or board.
 */
export const analyzeAttendanceImage = async (
  file: File, 
  students: Student[]
): Promise<AIAnalysisResult[]> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key missing. Please check your configuration.");
  
  const client = new GoogleGenAI({ apiKey: currentKey });
  const imagePart = await fileToGenerativePart(file);
  const prompt = getAnalysisPrompt(students, "an image of an attendance sheet or whiteboard");

  const response = await client.models.generateContent({
    model: 'gemini-3-pro-preview', // Pro for image reasoning
    contents: {
      parts: [imagePart, { text: prompt }]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            rollNo: { type: Type.STRING },
            status: { type: Type.STRING, enum: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT] },
            date: { type: Type.STRING, nullable: true },
            session: { type: Type.STRING, nullable: true },
            className: { type: Type.STRING, nullable: true }
          }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as AIAnalysisResult[];
  }
  return [];
};

/**
 * Analyzes an audio file (Voice Note).
 */
export const analyzeAttendanceAudio = async (
  file: File, 
  students: Student[]
): Promise<AIAnalysisResult[]> => {
  const currentKey = getApiKey();
  if (!currentKey) throw new Error("API Key missing. Please check your configuration.");

  const client = new GoogleGenAI({ apiKey: currentKey });
  const audioPart = await fileToGenerativePart(file);
  const prompt = getAnalysisPrompt(students, "an audio recording of a teacher taking attendance");

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [audioPart, { text: prompt }]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            rollNo: { type: Type.STRING },
            status: { type: Type.STRING, enum: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT] },
            date: { type: Type.STRING, nullable: true },
            session: { type: Type.STRING, nullable: true },
            className: { type: Type.STRING, nullable: true }
          }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as AIAnalysisResult[];
  }
  return [];
};

/**
 * Analyzes a text file.
 */
export const analyzeAttendanceText = async (
    file: File,
    students: Student[]
): Promise<AIAnalysisResult[]> => {
    const currentKey = getApiKey();
    if (!currentKey) throw new Error("API Key missing. Please check your configuration.");

    const client = new GoogleGenAI({ apiKey: currentKey });
    // Read text content directly
    const textContent = await file.text();
    const prompt = getAnalysisPrompt(students, `a text document containing attendance info: "${textContent.substring(0, 5000)}..."`); // Limit context

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [{ text: prompt }]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        rollNo: { type: Type.STRING },
                        status: { type: Type.STRING, enum: [AttendanceStatus.PRESENT, AttendanceStatus.ABSENT] },
                        date: { type: Type.STRING, nullable: true },
                        session: { type: Type.STRING, nullable: true },
                        className: { type: Type.STRING, nullable: true }
                    }
                }
            }
        }
    });

    if (response.text) {
        return JSON.parse(response.text) as AIAnalysisResult[];
    }
    return [];
}

/**
 * Live Client access
 * Always creates a new instance to ensure the latest API key is used.
 */
export const getGeminiLiveClient = () => {
    const currentKey = getApiKey();
    if (!currentKey) {
        throw new Error("API Key is missing. Please check your environment settings.");
    }
    return new GoogleGenAI({ apiKey: currentKey });
}
