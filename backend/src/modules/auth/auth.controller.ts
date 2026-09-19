import type { Request, Response } from "express";
import type { AuthService } from "./auth.service.js";
import type { ChangePasswordDto, LoginDto, RefreshDto } from "./auth.dto.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  me = async (req: Request, res: Response): Promise<void> => {
    // authenticate() has already verified the access token by this point.
    const staff = await this.authService.me(req.user!.id);
    res.status(200).json({ staff });
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body as ChangePasswordDto;
    await this.authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.status(204).send();
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { identifier, password } = req.body as LoginDto;
    const { staff, tokens } = await this.authService.login(
      identifier,
      password,
      req.ip ?? "unknown",
    );
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
