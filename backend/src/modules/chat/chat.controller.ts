import type { Request, Response } from "express";
import type { ChatService } from "./chat.service.js";
import type { ChatRequestDto } from "./chat.dto.js";

export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    const { message, history } = req.body as ChatRequestDto;

    const reply = await this.chatService.reply(
      // Set by authenticate() - never trust a client-supplied id/role here.
      { id: req.user!.id, role: req.user!.role },
      message,
      history ?? [],
    );

    res.status(200).json({ reply });
  };
}
