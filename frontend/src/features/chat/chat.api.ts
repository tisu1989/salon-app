import { baseApi } from "../../app/base-api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SendChatMessageRequest {
  message: string;
  history?: ChatMessage[];
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    sendChatMessage: build.mutation<{ reply: string }, SendChatMessageRequest>({
      query: (body) => ({ url: "/chat", method: "POST", body }),
    }),
  }),
});

export const { useSendChatMessageMutation } = chatApi;
