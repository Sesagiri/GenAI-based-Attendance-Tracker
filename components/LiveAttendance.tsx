
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Video, VideoOff, Activity, XCircle, Send, ChevronDown, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { getGeminiLiveClient } from '../services/geminiService';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../services/audioUtils';
import { Student, AttendanceStatus, UploadedFile, ClassInfo } from '../types';
import { LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';

interface LiveAttendanceProps {
  students: Student[];
  files: UploadedFile[];
  classes: ClassInfo[];
  onLiveUpdate: (identifier: string, status: AttendanceStatus, targetName?: string) => { success: boolean; message: string };
  onBulkUpdate: (status: AttendanceStatus, targetName?: string) => { success: boolean; message: string };
  onUpdateFile: (file: UploadedFile) => void;
  onDeleteFile: (fileId: string) => void;
  onAddStudent: (name: string, rollNo: string, target?: string) => { success: boolean; message: string };
  onRemoveStudent: (identifier: string, target?: string) => { success: boolean; message: string };
  onClose: () => void;
}

// Convert "one", "two" -> "1", "2"
const wordToNumber = (text: string): string => {
    const map: {[key: string]: string} = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
        'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20'
    };
    return text.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi, matched => map[matched.toLowerCase()] || matched);
};

const LiveAttendance: React.FC<LiveAttendanceProps> = ({ 
    students, files, classes, onLiveUpdate, onBulkUpdate, onUpdateFile, onDeleteFile, onAddStudent, onRemoveStudent, onClose 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false); 
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [textInput, setTextInput] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  
  // Refs for Audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSessionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Refs for Callbacks
  const onLiveUpdateRef = useRef(onLiveUpdate);
  const onBulkUpdateRef = useRef(onBulkUpdate);
  const onUpdateFileRef = useRef(onUpdateFile);
  const onDeleteFileRef = useRef(onDeleteFile);
  const onAddStudentRef = useRef(onAddStudent);
  const onRemoveStudentRef = useRef(onRemoveStudent);
  
  const filesRef = useRef(files);
  const classesRef = useRef(classes);
  const studentsRef = useRef(students);

  // Keep refs updated with latest props
  useEffect(() => {
      onLiveUpdateRef.current = onLiveUpdate;
      onBulkUpdateRef.current = onBulkUpdate;
      onUpdateFileRef.current = onUpdateFile;
      onDeleteFileRef.current = onDeleteFile;
      onAddStudentRef.current = onAddStudent;
      onRemoveStudentRef.current = onRemoveStudent;
      filesRef.current = files;
      classesRef.current = classes;
      studentsRef.current = students;
  }, [onLiveUpdate, onBulkUpdate, onUpdateFile, onDeleteFile, onAddStudent, onRemoveStudent, files, classes, students]);

  // --- Tool Definitions ---

  const markAttendanceTool: FunctionDeclaration = {
    name: 'markAttendance',
    description: 'Marks a student as present or absent based on their Name OR Roll Number.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        identifier: { type: Type.STRING, description: 'The Name OR Roll Number of the student (or multiple separated by comma)' },
        status: { type: Type.STRING, enum: ['PRESENT', 'ABSENT', 'LATE'] },
        target: { type: Type.STRING, description: 'The name of the class, sheet, or file. Optional.' }
      },
      required: ['identifier', 'status']
    }
  };

  const markAllTool: FunctionDeclaration = {
      name: 'markAllAttendance',
      description: 'Marks all students in the class with a specific status.',
      parameters: {
          type: Type.OBJECT,
          properties: {
              status: { type: Type.STRING, enum: ['PRESENT', 'ABSENT', 'LATE'] },
              target: { type: Type.STRING, description: 'The name of the class, sheet, or file.' }
          },
          required: ['status']
      }
  };

  const updateFileTool: FunctionDeclaration = {
      name: 'updateFileDetails',
      description: 'Renames an uploaded file or updates the text content of a note/document.',
      parameters: {
          type: Type.OBJECT,
          properties: {
              fileId: { type: Type.STRING, description: 'The ID of the file to update' },
              newName: { type: Type.STRING, description: 'The new name for the file' },
              newContent: { type: Type.STRING, description: 'The new text content' }
          },
          required: ['fileId']
      }
  };

  const deleteFileTool: FunctionDeclaration = {
      name: 'deleteFile',
      description: 'Permanently deletes an uploaded file.',
      parameters: {
          type: Type.OBJECT,
          properties: {
              fileId: { type: Type.STRING, description: 'The ID of the file to delete' }
          },
          required: ['fileId']
      }
  };

  const addStudentTool: FunctionDeclaration = {
      name: 'addStudent',
      description: 'Adds a new student to the class list.',
      parameters: {
          type: Type.OBJECT,
          properties: {
              name: { type: Type.STRING, description: 'Name of the student' },
              rollNo: { type: Type.STRING, description: 'Roll number of the student (optional)' },
              target: { type: Type.STRING, description: 'Target class name (optional)' }
          },
          required: ['name']
      }
  };

  const removeStudentTool: FunctionDeclaration = {
      name: 'removeStudent',
      description: 'Removes a student from the class list by name or roll number.',
      parameters: {
          type: Type.OBJECT,
          properties: {
              identifier: { type: Type.STRING, description: 'The name or roll number of the student to remove' },
              target: { type: Type.STRING, description: 'Target class name (optional)' }
          },
          required: ['identifier']
      }
  };

  const toolsConfig = [{ functionDeclarations: [markAttendanceTool, markAllTool, updateFileTool, deleteFileTool, addStudentTool, removeStudentTool] }];
  
  // Construct dynamic context
  const getSystemInstruction = () => {
    // Group students by class to provide clear context
    const studentsByClass = classesRef.current.map(cls => {
        const classStudents = studentsRef.current.filter(s => s.classId === cls.id);
        if (classStudents.length === 0) return null;
        const list = classStudents.map(s => `${s.name} (Roll ${s.rollNo})`).join(', ');
        return `CLASS '${cls.name}': [${list}]`;
    }).filter(Boolean).join('\n');

    const fileContextList = filesRef.current.map(f => `[ID: ${f.id}, Name: '${f.name}', Type: ${f.type}]`).join(', ');

    return `You are an attendance assistant and file manager.
      
      Here is the database of ALL students grouped by Class:
      ${studentsByClass || "No students found."}
      
      ALL UPLOADED FILES: ${fileContextList || "None"}.
      
      RULES:
      1. Attendance: Mark students using 'markAttendance'.
         - You accept Name OR Roll Number as 'identifier'.
         - If user says "Mark John present", identifier is "John".
         - If user says "Mark Roll 5 in Class A", identifier is "5", target is "Class A".
         - If user says "Mark 1, 11 and 21", please call the function with identifier "1, 11, 21" OR call it three times. The system handles comma-separated lists.
         - ALWAYS try to mark attendance even if the student is not explicitly listed in the system instruction above, as the database might have been updated.
      
      2. Student Management: 
         - Use 'addStudent' to add a student to the list.
         - Use 'removeStudent' to remove a student from the list.
      
      3. File Management: Rename or delete files using 'updateFileDetails' or 'deleteFile'.
      
      4. Confirm actions concisely. If a student is not found, report it clearly.
    `;
  };

  // FORCE RESET FUNCTION
  const resetConnection = () => {
      console.log("Resetting connection state...");
      isConnectedRef.current = false;
      setIsConnected(false);
      setIsConnecting(false);

      if (activeSessionRef.current) {
          try { activeSessionRef.current.close(); } catch(e) { console.error(e); }
          activeSessionRef.current = null;
      }
      
      if (streamRef.current) {
          try { streamRef.current.getTracks().forEach(track => track.stop()); } catch(e) {}
          streamRef.current = null;
      }
      
      if (audioContextRef.current) {
          try { 
              if (audioContextRef.current.state !== 'closed') {
                  audioContextRef.current.close();
              }
          } catch(e) {}
          audioContextRef.current = null;
      }
      
      if (inputContextRef.current) {
          try { 
              if (inputContextRef.current.state !== 'closed') {
                  inputContextRef.current.close();
              }
          } catch(e) {}
          inputContextRef.current = null;
      }
  };

  const startSession = async () => {
    // If stuck in connecting state, force reset first
    if (isConnecting) {
        resetConnection();
        return;
    }
    if (isConnected) return;
    
    if (!navigator.onLine) {
        alert("No internet connection. Please check your network.");
        return;
    }

    try {
        const aiClient = getGeminiLiveClient();
        setIsConnecting(true);
        
        // Safety timeout
        const connectionTimeout = setTimeout(() => {
            if (!isConnectedRef.current && isConnecting) {
                console.warn("Connection timeout triggered");
                resetConnection();
                alert("Connection timed out. Please check your network and try again.");
            }
        }, 12000);

        // 1. Get Media Stream (with race timeout)
        const streamPromise = navigator.mediaDevices.getUserMedia({ audio: true });
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Mic permission timeout")), 8000));
        const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;
        
        if (!mountedRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return; 
        }

        streamRef.current = stream;

        // 2. Setup Audio Contexts
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const outputCtx = new AudioContextClass({ sampleRate: 24000 });
        const inputCtx = new AudioContextClass({ sampleRate: 16000 });
        
        // CRITICAL: Resume audio context if suspended (browser autoplay policy)
        if (outputCtx.state === 'suspended') {
            await outputCtx.resume();
        }
        
        audioContextRef.current = outputCtx;
        inputContextRef.current = inputCtx;

        // 3. Connect to Gemini
        const session = await aiClient.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
            onopen: () => {
                if (!mountedRef.current) {
                    resetConnection();
                    return;
                }
                console.log("Live Session Opened");
                clearTimeout(connectionTimeout);
                isConnectedRef.current = true;
                setIsConnected(true);
                setIsConnecting(false);
            },
            onmessage: async (msg: LiveServerMessage) => {
                if (!mountedRef.current) return;

                if (msg.serverContent?.inputTranscription) {
                    const transcript = msg.serverContent.inputTranscription.text;
                    if (transcript) {
                        setMessages(prev => {
                            const last = prev[prev.length - 1];
                            if (last && last.role === 'user' && !last.text.endsWith('.')) {
                                return [...prev.slice(0, -1), { role: 'user', text: transcript }];
                            }
                            return [...prev, { role: 'user', text: transcript }];
                        });
                        // Execute local command immediately for responsiveness
                        executeLocalCommand(transcript);
                    }
                }

                if (msg.toolCall) {
                    const responses = [];
                    for (const fc of msg.toolCall.functionCalls) {
                        try {
                            if (fc.name === 'markAttendance') {
                                const { identifier, status, target } = fc.args as any;
                                const normalizedStatus = status.toUpperCase() as AttendanceStatus;
                                const result = onLiveUpdateRef.current(identifier, normalizedStatus, target);
                                
                                setLastAction(result.message);
                                responses.push({ id: fc.id, name: fc.name, response: { result: result.message } });
                                setMessages(prev => [...prev, { role: 'ai', text: result.message }]);
                            
                            } else if (fc.name === 'markAllAttendance') {
                                const { status, target } = fc.args as any;
                                const normalizedStatus = status.toUpperCase() as AttendanceStatus;
                                const result = onBulkUpdateRef.current(normalizedStatus, target);
                                
                                setLastAction(result.message);
                                responses.push({ id: fc.id, name: fc.name, response: { result: result.message } });
                                setMessages(prev => [...prev, { role: 'ai', text: result.message }]);

                            } else if (fc.name === 'addStudent') {
                                const { name, rollNo, target } = fc.args as any;
                                const result = onAddStudentRef.current(name, rollNo, target);
                                
                                setLastAction(result.message);
                                responses.push({ id: fc.id, name: fc.name, response: { result: result.message } });
                                setMessages(prev => [...prev, { role: 'ai', text: result.message }]);

                            } else if (fc.name === 'removeStudent') {
                                const { identifier, target } = fc.args as any;
                                const result = onRemoveStudentRef.current(identifier, target);
                                
                                setLastAction(result.message);
                                responses.push({ id: fc.id, name: fc.name, response: { result: result.message } });
                                setMessages(prev => [...prev, { role: 'ai', text: result.message }]);

                            } else if (fc.name === 'updateFileDetails') {
                                const { fileId, newName, newContent } = fc.args as any;
                                const file = filesRef.current.find(f => f.id === fileId);
                                if (file) {
                                    const updatedFile = { ...file };
                                    if (newName) updatedFile.name = newName;
                                    if (newContent) updatedFile.content = newContent;
                                    onUpdateFileRef.current(updatedFile);
                                    setLastAction(`Updated File: ${newName || file.name}`);
                                    responses.push({ id: fc.id, name: fc.name, response: { result: "File updated" } });
                                } else {
                                    responses.push({ id: fc.id, name: fc.name, response: { result: "File not found" } });
                                }
                            } else if (fc.name === 'deleteFile') {
                                const { fileId } = fc.args as any;
                                const file = filesRef.current.find(f => f.id === fileId);
                                if (file) {
                                    onDeleteFileRef.current(fileId);
                                    setLastAction(`Deleted File: ${file.name}`);
                                    responses.push({ id: fc.id, name: fc.name, response: { result: "File deleted" } });
                                } else {
                                    responses.push({ id: fc.id, name: fc.name, response: { result: "File not found" } });
                                }
                            }
                        } catch(e) {
                            console.error("Tool execution error", e);
                            responses.push({ id: fc.id, name: fc.name, response: { result: "Error executing tool" } });
                        }
                    }
                    if (activeSessionRef.current && responses.length > 0) {
                        activeSessionRef.current.sendToolResponse({ functionResponses: responses });
                    }
                }

                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData) {
                const ctx = audioContextRef.current;
                if (ctx && ctx.state === 'running') {
                    try {
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                        const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx);
                        const source = ctx.createBufferSource();
                        source.buffer = buffer;
                        source.connect(ctx.destination);
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += buffer.duration;
                    } catch (e) { console.error(e); }
                }
                }
            },
            onclose: () => {
                console.log("Live Session Closed");
                resetConnection();
            },
            onerror: (err) => {
                console.error("Live Session Error", err);
                resetConnection();
                alert("Connection Error. Please check your network or API Key.");
            }
            },
            config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {}, 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            systemInstruction: getSystemInstruction(),
            tools: toolsConfig
            }
        });
        activeSessionRef.current = session;

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
            if (!isConnectedRef.current || !activeSessionRef.current) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            try { activeSessionRef.current.sendRealtimeInput({ media: pcmBlob }); } catch (err) {}
        };
        source.connect(processor);
        processor.connect(inputCtx.destination);

    } catch (e: any) {
      console.error(e);
      // Ensure state is reset on error
      resetConnection();
      alert("Failed to start session: " + (e.message || "Unknown error"));
    }
  };

  const executeLocalCommand = (text: string): boolean => {
      const normalizedText = wordToNumber(text).toLowerCase();
      
      // If the command is complex or involves adding/removing, delegate to AI
      if (normalizedText.includes('add') || normalizedText.includes('remove') || normalizedText.includes('delete') || normalizedText.includes('create')) {
          return false;
      }

      const hasPresent = normalizedText.includes('present') || normalizedText.includes('pres') || normalizedText.includes(' p ');
      const hasAbsent = normalizedText.includes('absent') || normalizedText.includes('abs') || normalizedText.includes(' a ');
      
      let status: AttendanceStatus | null = null;
      if (hasPresent) status = AttendanceStatus.PRESENT;
      else if (hasAbsent) status = AttendanceStatus.ABSENT;
      
      if (!status) return false;

      // Bulk All
      if (normalizedText.includes('all') || normalizedText.includes('everyone')) {
          const result = onBulkUpdateRef.current(status);
          setMessages(prev => [...prev, { role: 'ai', text: `(Local) ${result.message}` }]);
          setLastAction(result.message);
          return true;
      }

      // Numbers (Roll numbers) - Matches "3, 4", "3 and 4", "3 4"
      const numbers = normalizedText.match(/\d+/g);
      if (numbers && numbers.length > 0) {
          let successCount = 0;
          numbers.forEach(num => {
              const res = onLiveUpdateRef.current(num, status!);
              if (res.success) successCount++;
          });
          setMessages(prev => [...prev, { role: 'ai', text: `(Local) Marked ${successCount} student(s) as ${status}.` }]);
          setLastAction(`Updated ${successCount} student(s)`);
          return true;
      }
      return false;
  };

  const sendText = async () => {
      if (!textInput.trim()) return;
      const textToSend = textInput;
      setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
      setTextInput('');

      // Try local parsing first for instant response
      if (executeLocalCommand(textToSend)) return;

      if (isConnected && activeSessionRef.current) {
          try {
             await activeSessionRef.current.sendRealtimeInput({ content: [{ text: textToSend }] });
          } catch (e) { }
      } else {
          // Fallback to text-only model if not connected to live voice
          try {
              const aiClient = getGeminiLiveClient();
              const chat = aiClient.chats.create({
                  model: 'gemini-2.5-flash',
                  config: { systemInstruction: getSystemInstruction(), tools: toolsConfig }
              });
              const result = await chat.sendMessage({ message: textToSend });
              const calls = result.functionCalls;
              
              if (calls && calls.length > 0) {
                  let responseText = "";
                  for (const fc of calls) {
                      if (fc.name === 'markAttendance') {
                           const { identifier, status, target } = fc.args as any;
                           const r = onLiveUpdateRef.current(identifier, status.toUpperCase(), target);
                           responseText += `${r.message} `;
                      } else if (fc.name === 'markAllAttendance') {
                           const { status, target } = fc.args as any;
                           const r = onBulkUpdateRef.current(status.toUpperCase(), target);
                           responseText += `${r.message} `;
                      } else if (fc.name === 'addStudent') {
                           const { name, rollNo, target } = fc.args as any;
                           const r = onAddStudentRef.current(name, rollNo, target);
                           responseText += `${r.message} `;
                      } else if (fc.name === 'removeStudent') {
                           const { identifier, target } = fc.args as any;
                           const r = onRemoveStudentRef.current(identifier, target);
                           responseText += `${r.message} `;
                      } else if (fc.name === 'deleteFile') {
                          const { fileId } = fc.args as any;
                          onDeleteFileRef.current(fileId);
                          responseText += `Deleted file. `;
                      }
                  }
                  setMessages(prev => [...prev, { role: 'ai', text: responseText || "Done." }]);
                  setLastAction("AI Update Complete");
              } else if (result.text) {
                  setMessages(prev => [...prev, { role: 'ai', text: result.text }]);
              }
          } catch (e: any) {
              setMessages(prev => [...prev, { role: 'ai', text: `Error: ${e.message}` }]);
          }
      }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { 
        mountedRef.current = false;
        resetConnection(); 
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-900/95 backdrop-blur-md animate-fade-in">
        <div className="p-4 flex justify-between items-center text-white bg-slate-900/50">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="font-bold">Live Attendance Agent</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full"><ChevronDown size={24} /></button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {lastAction && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-bounce">
                    <Activity size={12} /> {lastAction}
                </div>
            )}

            <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                {isConnected && (
                    <>
                    <div className="absolute w-full h-full bg-indigo-500 opacity-20 rounded-full animate-ping"></div>
                    <div className="absolute w-48 h-48 bg-indigo-500 opacity-30 rounded-full animate-pulse"></div>
                    </>
                )}
                <div className="z-10 bg-slate-800 border-4 border-indigo-500 p-8 rounded-full shadow-lg shadow-indigo-500/50 transition-all duration-500">
                    <Activity size={64} className={`text-indigo-400 ${isConnecting ? 'animate-spin' : ''}`} />
                </div>
            </div>

            <div className="flex items-center gap-4 z-20">
                {!isConnected ? (
                    <button 
                        onClick={startSession}
                        disabled={isConnecting}
                        className={`px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-3 ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isConnecting ? <Loader2 className="animate-spin" /> : <Mic size={24} />}
                        {isConnecting ? 'Connecting...' : 'Start Voice Attendance'}
                    </button>
                ) : (
                    <button 
                        onClick={resetConnection}
                        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-3"
                    >
                        <XCircle size={24} />
                        End Session
                    </button>
                )}
                <button onClick={resetConnection} className="p-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full" title="Force Reset">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="mt-8 w-full max-w-md bg-slate-800/50 p-4 rounded-xl border border-slate-700 h-40 overflow-y-auto backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2 sticky top-0 bg-slate-800/90 p-1">Transcript</h4>
                {messages.length === 0 && <p className="text-slate-500 text-sm italic">Conversation will appear here...</p>}
                {messages.map((m, i) => (
                    <div key={i} className={`mb-2 text-sm ${m.role === 'ai' ? 'text-indigo-300' : 'text-slate-200'}`}>
                        <span className="font-bold opacity-50 text-xs mr-2">{m.role.toUpperCase()}:</span>
                        {m.text}
                    </div>
                ))}
            </div>
        </div>

        <div className="p-4 bg-slate-800 border-t border-slate-700 safe-pb">
            <div className="flex gap-2 max-w-2xl mx-auto">
                <input 
                    type="text" 
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendText()}
                    placeholder="Type or speak (e.g. 'Mark John present')"
                    className="flex-1 bg-slate-700 border-none rounded-full px-5 py-3 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button onClick={sendText} className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-500 transition-colors">
                    <Send size={20} />
                </button>
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">Text mode active. Start Voice for real-time conversation.</p>
        </div>
    </div>
  );
};
export default LiveAttendance;
