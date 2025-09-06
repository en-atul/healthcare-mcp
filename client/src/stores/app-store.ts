import { create } from 'zustand';

export interface Appointment {
  _id: string;
  therapistId: {
    _id: string;
    firstName: string;
    lastName: string;
    specialization: string;
    photo: string;
  };
  patientId: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    photo: string;
  };
  appointmentDate: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
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
  photo: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  type?:
    | 'text'
    | 'list_therapists'
    | 'list_appointments'
    | 'book_appointment'
    | 'cancel_appointment'
    | 'get_profile';
  data?: unknown;
}

interface AppState {
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  isLoadingAppointments: boolean;

  therapists: Therapist[];
  selectedTherapist: Therapist | null;
  isLoadingTherapists: boolean;

  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  chatInput: string;
  isChatHistoryLoading: boolean;
  hasMoreChatHistory: boolean;
  chatPage: number;

  isAppointmentModalOpen: boolean;
  isProfileModalOpen: boolean;

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
  bookAppointment: (
    therapistId: string,
    date: string,
    time: string,
  ) => Promise<void>;
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
  addAppointment: (appointment) =>
    set((state) => ({
      appointments: [...state.appointments, appointment],
    })),
  updateAppointment: (id, updates) =>
    set((state) => ({
      appointments: state.appointments.map((apt) =>
        apt._id === id ? { ...apt, ...updates } : apt,
      ),
    })),
  deleteAppointment: (id) =>
    set((state) => ({
      appointments: state.appointments.filter((apt) => apt._id !== id),
    })),
  setSelectedAppointment: (appointment) =>
    set({ selectedAppointment: appointment }),
  setLoadingAppointments: (loading) => set({ isLoadingAppointments: loading }),

  // Therapist actions
  setTherapists: (therapists) => set({ therapists }),
  setSelectedTherapist: (therapist) => set({ selectedTherapist: therapist }),
  setLoadingTherapists: (loading) => set({ isLoadingTherapists: loading }),

  // Chat actions
  addChatMessage: (message) =>
    set((state) => {
      const newMessages = [...state.chatMessages, message];
      // Sort to ensure chronological order (oldest first)
      return {
        chatMessages: newMessages.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ),
      };
    }),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  setChatInput: (input) => set({ chatInput: input }),
  setChatLoading: (loading) => set({ isChatLoading: loading }),
  setChatHistoryLoading: (loading) => set({ isChatHistoryLoading: loading }),
  setHasMoreChatHistory: (hasMore) => set({ hasMoreChatHistory: hasMore }),
  setChatPage: (page) => set({ chatPage: page }),
  clearChat: () =>
    set({ chatMessages: [], chatPage: 1, hasMoreChatHistory: true }),

  // UI actions
  setAppointmentModalOpen: (open) => set({ isAppointmentModalOpen: open }),
  setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),

  // API actions
  fetchAppointments: async () => {
    const state = get();
    if (state.isLoadingAppointments) {
      console.log(
        'fetchAppointments: Already loading, skipping duplicate call',
      );
      return;
    }

    set({ isLoadingAppointments: true });
    try {
      const { apiClient } = await import('@/lib/api-client');
      const appointments = await apiClient.getAppointments();
      set({ appointments, isLoadingAppointments: false });
    } catch {
      set({ isLoadingAppointments: false });
      throw new Error('Failed to fetch appointments');
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
    const state = get();
    if (state.isChatHistoryLoading) {
      console.log('fetchChatHistory: Already loading, skipping duplicate call');
      return;
    }

    try {
      set({ isChatHistoryLoading: true });
      const { apiClient } = await import('@/lib/api-client');
      const response = await apiClient.getChatHistory(20, page);

      console.log('Chat history response received:', response);

      const historyData = response?.data || response || [];

      console.log('History data to process:', historyData);

      const newMessages: ChatMessage[] = (historyData || []).map(
        (item: unknown) => {
          const chatItem = item as {
            _id?: string;
            id?: string;
            message?: string;
            content?: string;
            text?: string;
            answer?: string;
            type?: string;
            role?: string;
            timestamp?: string;
            createdAt?: string;
            actionResult?: unknown;
            rawData?: unknown;
            action?: string;
          };

          let messageType:
            | 'text'
            | 'list_therapists'
            | 'list_appointments'
            | 'book_appointment'
            | 'cancel_appointment'
            | 'get_profile'
            | undefined;
          if (chatItem.action) {
            switch (chatItem.action) {
              case 'list_therapists':
                messageType = 'list_therapists';
                break;
              case 'list_appointments':
                messageType = 'list_appointments';
                break;
              case 'book_appointment':
                messageType = 'book_appointment';
                break;
              case 'cancel_appointment':
                messageType = 'cancel_appointment';
                break;
              case 'get_profile':
                messageType = 'get_profile';
                break;
              default:
                messageType = 'text';
            }
          } else {
            messageType = 'text';
          }

          return {
            id:
              chatItem._id ||
              chatItem.id ||
              Date.now().toString() + Math.random(),
            content:
              chatItem.answer ||
              chatItem.message ||
              chatItem.content ||
              chatItem.text ||
              '',
            role: (chatItem.type || chatItem.role || 'user') as
              | 'user'
              | 'assistant',
            timestamp: new Date(
              chatItem.timestamp || chatItem.createdAt || new Date(),
            ),
            type: messageType,
            data:
              chatItem.actionResult ||
              chatItem.rawData ||
              (item as { data?: unknown }).data,
          };
        },
      );

      if (append) {
        // Append older messages to the beginning (for infinite scroll)
        set((state) => {
          const existingIds = new Set(state.chatMessages.map((msg) => msg.id));
          const uniqueNewMessages = newMessages.filter(
            (msg) => !existingIds.has(msg.id),
          );

          const combinedMessages = [
            ...state.chatMessages,
            ...uniqueNewMessages,
          ];
          // Sort to ensure chronological order (oldest first)
          const sortedCombinedMessages = combinedMessages.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );

          return {
            chatMessages: sortedCombinedMessages,
            chatPage: page,
            hasMoreChatHistory: newMessages.length === 20,
          };
        });
      } else {
        // Replace messages (initial load) - sort to ensure chronological order (oldest first)
        const sortedMessages = newMessages.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        set({
          chatMessages: sortedMessages,
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
      const appointmentDateTime = new Date(`${date}T${time}`);
      const appointment = await apiClient.bookAppointment({
        therapistId,
        appointmentDate: appointmentDateTime.toISOString(),
        duration: 60,
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

      console.log('Chat response data:', data);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: data.type === 'assistant' ? 'assistant' : 'user',
        timestamp: new Date(), // This will be updated when the message is stored on server
        type: data.action,
        data: data.data,
      };

      get().addChatMessage(assistantMessage);

      /**
       * Check if the response contains appointment-related actions
       */
      const responseData = data as { action?: string };
      if (
        responseData.action === 'book_appointment' ||
        responseData.action === 'cancel_appointment'
      ) {
        console.log(
          'Appointment action detected:',
          responseData.action,
          '- Re-fetching appointments',
        );

        /**
         * Re-fetch appointments to update the appointments panel
         */
        get()
          .fetchAppointments()
          .catch(() => {
            console.error('Failed to re-fetch appointments after action');
          });
      }
    } catch (error) {
      console.error('Chat error:', error);
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
