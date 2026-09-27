import type { Request, Response } from "express";
import { AppError } from "../../middleware/error-handler.js";
import { getValidatedQuery } from "../../middleware/validate.js";
import type { AppointmentService } from "./appointment.service.js";
import type {
  AvailabilityQueryDto,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  RescheduleAppointmentDto,
} from "./appointment.dto.js";

function parseAppointmentId(req: Request): number {
  const appointmentId = Number(req.params.id);
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    throw new AppError("VALIDATION_ERROR", "id must be a positive integer", 400);
  }
  return appointmentId;
}

export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  getAvailability = async (req: Request, res: Response): Promise<void> => {
    const { staffId, serviceId, date, excludeAppointmentId } =
      getValidatedQuery<AvailabilityQueryDto>(req);
    const slots = await this.appointmentService.getAvailability(
      staffId,
      serviceId,
      date,
      excludeAppointmentId,
    );
    res.status(200).json({ slots });
  };

  book = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateAppointmentDto;

    const appointment = await this.appointmentService.book({
      ...dto,
      source: "STAFF",
      // Set by authenticate() from the caller's access token - never trust a client-supplied value here.
      createdById: req.user!.id,
    });

    res.status(201).json({ appointment });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { staffId, date, customerId } = getValidatedQuery<ListAppointmentsQueryDto>(req);

    // The DTO's refine() already guarantees customerId or date is present.
    const appointments =
      customerId !== undefined
        ? await this.appointmentService.listForCustomer(customerId)
        : await this.appointmentService.listForDay(date!, staffId);

    res.status(200).json({ appointments });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const appointment = await this.appointmentService.getById(parseAppointmentId(req));
    res.status(200).json({ appointment });
  };

  reschedule = async (req: Request, res: Response): Promise<void> => {
    const { startTime, endTime } = req.body as RescheduleAppointmentDto;
    const appointment = await this.appointmentService.reschedule(
      parseAppointmentId(req),
      startTime,
      endTime,
    );
    res.status(200).json({ appointment });
  };

  confirm = async (req: Request, res: Response): Promise<void> => {
    const appointment = await this.appointmentService.confirm(parseAppointmentId(req));
    res.status(200).json({ appointment });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const appointment = await this.appointmentService.cancel(parseAppointmentId(req));
    res.status(200).json({ appointment });
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    const appointment = await this.appointmentService.markCompleted(parseAppointmentId(req));
    res.status(200).json({ appointment });
  };

  noShow = async (req: Request, res: Response): Promise<void> => {
    const appointment = await this.appointmentService.markNoShow(parseAppointmentId(req));
    res.status(200).json({ appointment });
  };
}
