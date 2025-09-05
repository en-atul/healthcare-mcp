'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { Send, Bot, User, Calendar, Users, UserCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    chatMessages,
    isChatLoading,
    sendChatMessage,
    fetchChatHistory,
    loadMoreChatHistory,
    isChatHistoryLoading,
    hasMoreChatHistory,
  } = useAppStore();
  
  const { user } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    if (user && chatMessages.length === 0) {
      console.log('Loading chat history for user:', user);
      fetchChatHistory(1, false).catch((error) => {
        console.error('Failed to load chat history:', error);
      });
    }
  }, [user, chatMessages.length, fetchChatHistory]);

  // Debug chat messages
  useEffect(() => {
    console.log('Chat messages updated:', chatMessages);
  }, [chatMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;

    const message = input.trim();
    setInput('');
    
    try {
      await sendChatMessage(message);
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Chat error:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    
    if (scrollTop === 0 && hasMoreChatHistory && !isChatHistoryLoading) {
      loadMoreChatHistory();
    }
  };

  const renderMessageContent = (message: {
    type?: string;
    data?: unknown;
    content?: string;
    role?: string;
  }) => {
    if (message.type === 'therapist_list' && message.data) {
      return (
        <div className="space-y-2">
          <p>{message.content}</p>
          <div className="grid gap-2">
            {(message.data as Array<{
              _id: string;
              firstName: string;
              lastName: string;
              specialization: string;
              experience: number;
              rating: number;
            }>).map((therapist) => (
              <Card key={therapist._id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Dr. {therapist.firstName} {therapist.lastName}</h4>
                    <p className="text-sm text-muted-foreground">{therapist.specialization}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {therapist.experience} years exp
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        ⭐ {therapist.rating}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Book
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (message.type === 'appointment' && message.data) {
      const appointmentData = message.data as {
        date: string;
        time: string;
        therapistName: string;
      };
      return (
        <div className="space-y-2">
          <p>{message.content}</p>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <div>
                <p className="font-medium">Appointment Details</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(appointmentData.date), 'MMM dd, yyyy')} at {appointmentData.time}
                </p>
                <p className="text-sm text-muted-foreground">
                  with Dr. {appointmentData.therapistName}
                </p>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    if (message.role === 'assistant') {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-li:text-foreground">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 last:mb-0 pl-4">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 last:mb-0 pl-4">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm font-mono mb-2">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic mb-2">
                  {children}
                </blockquote>
              ),
            }}
          >
            {message.content || 'No content'}
          </ReactMarkdown>
        </div>
      );
    }
    
    return <p className="whitespace-pre-wrap">{message.content || 'No content'}</p>;
  };

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/50">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Health Assistant</h2>
        <Badge variant="secondary" className="ml-auto">
          AI Powered
        </Badge>
      </div>

      {/* Messages - Fixed height with scroll */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        onScroll={handleScroll}
      >
        {/* Loading indicator for infinite scroll */}
        {isChatHistoryLoading && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more messages...</span>
            </div>
          </div>
        )}

        {chatMessages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Welcome to your Health Assistant!</h3>
            <p className="text-muted-foreground mb-4">
              I can help you find therapists, book appointments, and answer health-related questions.
            </p>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('Show me available therapists')}
                className="justify-start"
              >
                <Users className="h-4 w-4 mr-2" />
                Find Therapists
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('Book an appointment')}
                className="justify-start"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('Show my profile')}
                className="justify-start"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                My Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('Cancel my appointment')}
                className="justify-start"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Cancel Appointment
              </Button>
            </div>
          </div>
        ) : (
          chatMessages.map((message, index) => (
            <div
              key={message.id || `message-${index}`}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {renderMessageContent(message)}
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp ? format(message.timestamp, 'HH:mm') : 'Now'}
                </div>
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}

        {isChatLoading && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom */}
      <div className="p-4 border-t bg-muted/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your health..."
            disabled={isChatLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isChatLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
