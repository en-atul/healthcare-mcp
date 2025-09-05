'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { Send, Bot, User, Calendar, Users, UserCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    chatMessages,
    isChatLoading,
    chatInput,
    setChatInput,
    sendChatMessage,
    addChatMessage,
  } = useAppStore();
  
  const { user } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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

  const renderMessageContent = (message: any) => {
    if (message.type === 'therapist_list' && message.data) {
      return (
        <div className="space-y-2">
          <p>{message.content}</p>
          <div className="grid gap-2">
            {message.data.map((therapist: any) => (
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
      return (
        <div className="space-y-2">
          <p>{message.content}</p>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <div>
                <p className="font-medium">Appointment Details</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(message.data.date), 'MMM dd, yyyy')} at {message.data.time}
                </p>
                <p className="text-sm text-muted-foreground">
                  with Dr. {message.data.therapistName}
                </p>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Health Assistant</h2>
        <Badge variant="secondary" className="ml-auto">
          AI Powered
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          chatMessages.map((message) => (
            <div
              key={message.id}
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
                  {format(message.timestamp, 'HH:mm')}
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

      {/* Input */}
      <div className="p-4 border-t">
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
