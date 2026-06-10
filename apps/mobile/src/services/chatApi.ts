import { ChatMessage, Conversation } from '../types';
import { apiClient } from './apiClient';

export async function getOrCreateConversation(
  otherUserId: string,
  jobPostId?: string
): Promise<{ conversation: Conversation }> {
  const { data } = await apiClient.post('/chat/conversations', { otherUserId, jobPostId });
  return data;
}

export async function getMyConversations(): Promise<{ conversations: Conversation[] }> {
  const { data } = await apiClient.get('/chat/conversations');
  return data;
}

export async function getMessages(
  conversationId: string,
  page = 1
): Promise<{ messages: ChatMessage[]; page: number }> {
  const { data } = await apiClient.get(`/chat/conversations/${conversationId}/messages`, {
    params: { page },
  });
  return data;
}

export async function sendMessageRest(
  conversationId: string,
  text: string
): Promise<{ message: ChatMessage }> {
  const { data } = await apiClient.post(`/chat/conversations/${conversationId}/messages`, { text });
  return data;
}

export async function getUnreadCount(): Promise<{ unread: number }> {
  const { data } = await apiClient.get('/chat/unread');
  return data;
}
