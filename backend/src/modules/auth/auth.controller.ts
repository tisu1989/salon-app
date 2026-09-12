import type { Request, Response } from "express";
import type { AuthService } from "./auth.service.js";
import type { LoginDto, RefreshDto } from "./auth.dto.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const { identifier, password } = req.body as LoginDto;
    const { staff, tokens } = await this.authService.login(identifier, password);
    res.status(200).json({ staff, ...tokens });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as RefreshDto;
    const tokens = await this.authService.refresh(refreshToken);
    res.status(200).json(tokens);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    // authenticate() has already verified the access token by this point.
    await this.authService.revokeAllSessions(req.user!.id);
    res.status(204).send();
  };
}
