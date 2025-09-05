import { create } from 'zustand';

export interface Appointment {
  _id: string;
  therapistId: string;
  therapistName?: string;
  patientId: string;
  patientName?: string;
  appointmentDate: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  cancellationReason?: string;
}

export interface Therapist {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialization: string;
  experience: number;
  rating: number;
  availableSlots?: string[];
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'appointment' | 'therapist_list' | 'profile';
  data?: any;
}

interface AppState {
  // Appointments
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  isLoadingAppointments: boolean;

  // Therapists
  therapists: Therapist[];
  selectedTherapist: Therapist | null;
  isLoadingTherapists: boolean;

  // Chat
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  chatInput: string;
  isChatHistoryLoading: boolean;
  hasMoreChatHistory: boolean;
  chatPage: number;

  // UI State
  isAppointmentModalOpen: boolean;
  isProfileModalOpen: boolean;

  // Actions
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  setSelectedAppointment: (appointment: Appointment | null) => void;
  setLoadingAppointments: (loading: boolean) => void;

  setTherapists: (therapists: Therapist[]) => void;
  setSelectedTherapist: (therapist: Therapist | null) => void;
  setLoadingTherapists: (loading: boolean) => void;

  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  setChatInput: (input: string) => void;
  setChatLoading: (loading: boolean) => void;
  setChatHistoryLoading: (loading: boolean) => void;
  setHasMoreChatHistory: (hasMore: boolean) => void;
  setChatPage: (page: number) => void;
  clearChat: () => void;

  setAppointmentModalOpen: (open: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;

  // API Actions
  fetchAppointments: () => Promise<void>;
  fetchTherapists: () => Promise<void>;
  fetchChatHistory: (page?: number, append?: boolean) => Promise<void>;
  loadMoreChatHistory: () => Promise<void>;
  bookAppointment: (therapistId: string, date: string, time: string) => Promise<void>;
  cancelAppointment: (appointmentId: string) => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  appointments: [],
  selectedAppointment: null,
  isLoadingAppointments: false,

  therapists: [],
  selectedTherapist: null,
  isLoadingTherapists: false,

  chatMessages: [],
  isChatLoading: false,
  chatInput: '',
  isChatHistoryLoading: false,
  hasMoreChatHistory: true,
  chatPage: 1,

  isAppointmentModalOpen: false,
  isProfileModalOpen: false,

  // Appointment actions
  setAppointments: (appointments) => set({ appointments }),
  addAppointment: (appointment) => set((state) => ({ 
    appointments: [...state.appointments, appointment] 
  })),
  updateAppointment: (id, updates) => set((state) => ({
    appointments: state.appointments.map(apt => 
      apt._id === id ? { ...apt, ...updates } : apt
    )
  })),
  deleteAppointment: (id) => set((state) => ({
    appointments: state.appointments.filter(apt => apt._id !== id)
  })),
  setSelectedAppointment: (appointment) => set({ selectedAppointment: appointment }),
  setLoadingAppointments: (loading) => set({ isLoadingAppointments: loading }),

  // Therapist actions
  setTherapists: (therapists) => set({ therapists }),
  setSelectedTherapist: (therapist) => set({ selectedTherapist: therapist }),
  setLoadingTherapists: (loading) => set({ isLoadingTherapists: loading }),

  // Chat actions
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  setChatInput: (input) => set({ chatInput: input }),
  setChatLoading: (loading) => set({ isChatLoading: loading }),
  setChatHistoryLoading: (loading) => set({ isChatHistoryLoading: loading }),
  setHasMoreChatHistory: (hasMore) => set({ hasMoreChatHistory: hasMore }),
  setChatPage: (page) => set({ chatPage: page }),
  clearChat: () => set({ chatMessages: [], chatPage: 1, hasMoreChatHistory: true }),

  // UI actions
  setAppointmentModalOpen: (open) => set({ isAppointmentModalOpen: open }),
  setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),

  // API actions
  fetchAppointments: async () => {
    set({ isLoadingAppointments: true });
    try {
      const { apiClient } = await import('@/lib/api-client');
      const appointments = await apiClient.getAppointments();
      set({ appointments, isLoadingAppointments: false });
    } catch (error) {
      set({ isLoadingAppointments: false });
      throw error;
    }
  },

  fetchTherapists: async () => {
    set({ isLoadingTherapists: true });
    try {
      const { apiClient } = await import('@/lib/api-client');
      const therapists = await apiClient.getTherapists();
      set({ therapists, isLoadingTherapists: false });
    } catch (error) {
      set({ isLoadingTherapists: false });
      throw error;
    }
  },

  fetchChatHistory: async (page = 1, append = false) => {
    try {
      set({ isChatHistoryLoading: true });
      const { apiClient } = await import('@/lib/api-client');
      const response = await apiClient.getChatHistory(20, page); // 20 messages per page
      
      console.log('Chat history response received:', response);
      
      // Extract the data array from the response
      const historyData = response?.data || response || [];
      
      console.log('History data to process:', historyData);
      
      // Convert history to ChatMessage format
      const newMessages: ChatMessage[] = (historyData || []).map((item: any) => ({
        id: item._id || item.id || Date.now().toString() + Math.random(),
        content: item.message || item.content || item.text || '',
        role: item.type || item.role || 'user', // Use 'type' field from API response
        timestamp: new Date(item.timestamp || item.createdAt || new Date()),
        type: item.type,
        data: item.data,
      }));
      
      console.log('Converted chat messages:', newMessages);
      
      if (append) {
        // Append older messages to the beginning (for infinite scroll)
        set((state) => ({
          chatMessages: [...newMessages, ...state.chatMessages],
          chatPage: page,
          hasMoreChatHistory: newMessages.length === 20, // If we got less than 20, no more pages
        }));
      } else {
        // Replace messages (initial load) - reverse order so newest are at bottom
        set({
          chatMessages: newMessages.reverse(),
          chatPage: page,
          hasMoreChatHistory: newMessages.length === 20,
        });
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      set({ hasMoreChatHistory: false });
    } finally {
      set({ isChatHistoryLoading: false });
    }
  },

  loadMoreChatHistory: async () => {
    const { chatPage, hasMoreChatHistory, isChatHistoryLoading } = get();
    if (!hasMoreChatHistory || isChatHistoryLoading) return;
    
    await get().fetchChatHistory(chatPage + 1, true);
  },

  bookAppointment: async (therapistId: string, date: string, time: string) => {
    try {
      const { apiClient } = await import('@/lib/api-client');
      // Convert time to appointment date with time
      const appointmentDateTime = new Date(`${date}T${time}`);
      const appointment = await apiClient.bookAppointment({ 
        therapistId, 
        appointmentDate: appointmentDateTime.toISOString(),
        duration: 60 // Default 60 minutes
      });
      get().addAppointment(appointment);
    } catch (error) {
      throw error;
    }
  },

  cancelAppointment: async (appointmentId: string) => {
    try {
      const { apiClient } = await import('@/lib/api-client');
      await apiClient.cancelAppointment(appointmentId);
      get().deleteAppointment(appointmentId);
    } catch (error) {
      throw error;
    }
  },

  sendChatMessage: async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date(),
    };

    get().addChatMessage(userMessage);
    set({ isChatLoading: true, chatInput: '' });

    try {
      const { apiClient } = await import('@/lib/api-client');
      const data = await apiClient.sendChatMessage(message);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
        type: data.type,
        data: data.data,
      };
      
      get().addChatMessage(assistantMessage);

      // Check if the response contains appointment-related actions
      if ((data as any).action === 'book_appointment' || (data as any).action === 'cancel_appointment') {
        console.log('Appointment action detected:', (data as any).action, '- Re-fetching appointments');
        // Re-fetch appointments to update the appointments panel
        get().fetchAppointments().catch((error) => {
          console.error('Failed to re-fetch appointments after action:', error);
        });
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
      get().addChatMessage(errorMessage);
    } finally {
      set({ isChatLoading: false });
    }
  },
}));
